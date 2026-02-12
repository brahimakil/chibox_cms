/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SHIPPING_STATUS, PAYMENT_TYPES } from "@/lib/order-constants";

/**
 * GET /api/orders — List orders with filters, pagination, sorting.
 *
 * Query params:
 *   page, limit, search, status (workflow_status_key), is_paid, shipping_status,
 *   shipping_method, payment_type, date_from, date_to,
 *   sort_by (created_at|total|status), sort_dir (asc|desc),
 *   fully_paid_first (1|0), customer_id
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 25));
    const skip = (page - 1) * limit;

    const search = sp.get("search")?.trim() || "";
    const status = sp.get("status");
    const isPaid = sp.get("is_paid");
    const shippingStatus = sp.get("shipping_status");
    const shippingMethod = sp.get("shipping_method");
    const paymentType = sp.get("payment_type");
    const dateFrom = sp.get("date_from");
    const dateTo = sp.get("date_to");
    const customerId = sp.get("customer_id");
    const sortBy = sp.get("sort_by") || "created_at";
    const sortDir = sp.get("sort_dir") === "asc" ? "asc" : "desc";
    const fullyPaidFirst = sp.get("fully_paid_first") === "1";

    // ── Build WHERE ────────────────────────────────────────────────
    const where: any = {};

    if (search) {
      const num = Number(search);
      if (Number.isFinite(num) && num > 0) {
        where.id = num;
      } else {
        where.OR = [
          { address_first_name: { contains: search } },
          { address_last_name: { contains: search } },
          { payment_id: { contains: search } },
        ];
      }
    }

    if (status !== null && status !== "" && status !== undefined) {
      // Status is now a workflow status key (e.g. "processing", "ordered")
      // Filter orders that have at least one item with this workflow status
      const ws = await prisma.cms_order_item_statuses.findFirst({
        where: { status_key: status },
      });
      if (ws) {
        where.order_products = {
          some: { workflow_status_id: ws.id },
        };
      }
    }

    if (isPaid !== null && isPaid !== "" && isPaid !== undefined) {
      where.is_paid = Number(isPaid);
    }

    if (shippingStatus !== null && shippingStatus !== "" && shippingStatus !== undefined) {
      where.shipping_status = Number(shippingStatus);
    }

    if (shippingMethod === "air" || shippingMethod === "sea") {
      where.shipping_method = shippingMethod;
    }

    if (paymentType !== null && paymentType !== "" && paymentType !== undefined) {
      where.payment_type = Number(paymentType);
    }

    if (customerId) {
      where.r_user_id = Number(customerId);
    }

    if (dateFrom) {
      where.created_at = { ...(where.created_at || {}), gte: new Date(dateFrom) };
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.created_at = { ...(where.created_at || {}), lte: end };
    }

    // ── Sorting ────────────────────────────────────────────────────
    const validSorts = ["created_at", "total", "status", "id"];
    const orderByField = validSorts.includes(sortBy) ? sortBy : "created_at";

    let orderBy: any;
    if (fullyPaidFirst) {
      // Put fully-paid (is_paid=1 AND shipping_status=2) first, then sort
      orderBy = [
        { is_paid: "desc" },
        { shipping_status: "desc" },
        { [orderByField]: sortDir },
      ];
    } else {
      orderBy = { [orderByField]: sortDir };
    }

    // ── Query ──────────────────────────────────────────────────────
    const [orders, totalCount] = await Promise.all([
      prisma.orders.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          r_user_id: true,
          total: true,
          subtotal: true,
          tax_amount: true,
          discount_amount: true,
          shipping_amount: true,
          quantity: true,
          status: true,
          is_paid: true,
          shipping_status: true,
          shipping_method: true,
          payment_type: true,
          payment_id: true,
          address_first_name: true,
          address_last_name: true,
          country: true,
          city: true,
          created_at: true,
          updated_at: true,
          refund_type: true,
          coupon_code: true,
        },
      }),
      prisma.orders.count({ where }),
    ]);

    // ── Count order_products per order + get workflow statuses ────
    const orderIds = orders.map((o) => o.id);
    const [itemCounts, orderItems] = await Promise.all([
      orderIds.length
        ? prisma.order_products.groupBy({
            by: ["r_order_id"],
            where: { r_order_id: { in: orderIds } },
            _count: { id: true },
          })
        : [],
      orderIds.length
        ? prisma.order_products.findMany({
            where: { r_order_id: { in: orderIds } },
            select: { r_order_id: true, workflow_status_id: true },
          })
        : [],
    ]);
    const itemCountMap = new Map(
      itemCounts.map((ic) => [ic.r_order_id, ic._count.id])
    );

    // Fetch all workflow statuses for lookup
    const allStatuses = await prisma.cms_order_item_statuses.findMany({
      where: { is_active: 1 },
    });
    const statusMap = new Map(allStatuses.map((s) => [s.id, s]));

    // Derive order-level workflow status: lowest status_order among non-terminal items
    // If all items are terminal, use the terminal status
    const orderWorkflowMap = new Map<number, { key: string; label: string; color: string }>();

    const STATUS_COLORS: Record<string, string> = {
      processing: "yellow",
      ordered: "blue",
      shipped_to_wh: "indigo",
      received_to_wh: "cyan",
      shipped_to_leb: "purple",
      received_to_leb: "violet",
      delivered_to_customer: "green",
      cancelled: "red",
      refunded: "orange",
    };

    for (const orderId of orderIds) {
      const items = orderItems.filter((i) => i.r_order_id === orderId);
      if (items.length === 0) {
        orderWorkflowMap.set(orderId, { key: "processing", label: "Processing", color: "yellow" });
        continue;
      }

      // Find the lowest-order (least advanced) non-terminal status
      let lowestOrder = Infinity;
      let lowestStatus: { key: string; label: string } | null = null;

      for (const item of items) {
        const ws = item.workflow_status_id ? statusMap.get(item.workflow_status_id) : null;
        if (!ws) {
          // No workflow status = treat as processing (order 1)
          if (1 < lowestOrder) {
            lowestOrder = 1;
            lowestStatus = { key: "processing", label: "Processing" };
          }
          continue;
        }
        if (ws.is_terminal === 1) continue; // Skip terminal items for order-level
        if (ws.status_order < lowestOrder) {
          lowestOrder = ws.status_order;
          lowestStatus = { key: ws.status_key, label: ws.status_label };
        }
      }

      // If all items are terminal (cancelled/refunded)
      if (!lowestStatus) {
        const firstItem = items[0];
        const ws = firstItem.workflow_status_id ? statusMap.get(firstItem.workflow_status_id) : null;
        lowestStatus = ws
          ? { key: ws.status_key, label: ws.status_label }
          : { key: "processing", label: "Processing" };
      }

      orderWorkflowMap.set(orderId, {
        key: lowestStatus.key,
        label: lowestStatus.label,
        color: STATUS_COLORS[lowestStatus.key] || "gray",
      });
    }

    // ── Enrich with labels ─────────────────────────────────────────
    const enriched = orders.map((o) => {
      const wf = orderWorkflowMap.get(o.id) || { key: "processing", label: "Processing", color: "yellow" };
      return {
        ...o,
        item_count: itemCountMap.get(o.id) || 0,
        status_label: wf.label,
        status_color: wf.color,
        status_key: wf.key,
        shipping_status_label: SHIPPING_STATUS[o.shipping_status]?.label || "Unknown",
        shipping_status_color: SHIPPING_STATUS[o.shipping_status]?.color || "gray",
        payment_type_label: PAYMENT_TYPES[o.payment_type] || `Type ${o.payment_type}`,
        customer_name: `${o.address_first_name} ${o.address_last_name}`.trim(),
      };
    });

    // ── Quick stats (workflow-based) ─────────────────────────────
    // Get workflow status IDs for stat counts
    const processingStatus = allStatuses.find((s) => s.status_key === "processing");
    const orderedStatus = allStatuses.find((s) => s.status_key === "ordered");
    const shippedToLebStatus = allStatuses.find((s) => s.status_key === "shipped_to_leb");

    const [totalOrders, processingCount, inTransitCount, todayRevenue] = await Promise.all([
      prisma.orders.count(),
      processingStatus
        ? prisma.order_products.count({ where: { workflow_status_id: processingStatus.id } })
        : 0,
      shippedToLebStatus
        ? prisma.order_products.count({ where: { workflow_status_id: shippedToLebStatus.id } })
        : 0,
      prisma.orders.aggregate({
        where: {
          is_paid: 1,
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: { total: true },
      }),
    ]);

    // ── Workflow status summary for filter bar ───────────────────
    const workflowCounts = await prisma.order_products.groupBy({
      by: ["workflow_status_id"],
      _count: { id: true },
    });
    const workflowSummary = workflowCounts.map((wc) => {
      const ws = wc.workflow_status_id ? statusMap.get(wc.workflow_status_id) : null;
      return {
        status_key: ws?.status_key || "unset",
        status_label: ws?.status_label || "Unset",
        status_order: ws?.status_order ?? 999,
        is_terminal: ws?.is_terminal === 1,
        count: wc._count.id,
        color: STATUS_COLORS[ws?.status_key || ""] || "gray",
      };
    }).sort((a, b) => a.status_order - b.status_order);

    return NextResponse.json({
      orders: enriched,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        totalOrders,
        processingCount,
        inTransitCount,
        todayRevenue: todayRevenue._sum.total || 0,
      },
      workflowSummary,
    });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
