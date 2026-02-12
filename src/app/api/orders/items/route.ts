/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasPermission, getAllowedTransitions } from "@/lib/rbac";

/**
 * GET /api/orders/items — Order Item Master List
 *
 * Query params:
 *   page, limit, search, workflow_status, tracking_number,
 *   order_id, group_by_order (1|0), sort_by, sort_dir
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!hasPermission(session.permissions, "page.orders.item_master_list")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 50));
    const skip = (page - 1) * limit;

    const search = sp.get("search")?.trim() || "";
    const workflowStatus = sp.get("workflow_status");
    const trackingFilter = sp.get("tracking_number");
    const orderIdFilter = sp.get("order_id");
    const sortBy = sp.get("sort_by") || "order_created_at";
    const sortDir = sp.get("sort_dir") === "asc" ? "asc" : "desc";

    // ── Build WHERE ─────────────────────────────────────────────
    const where: any = {};

    if (search) {
      const num = Number(search);
      if (Number.isFinite(num) && num > 0) {
        where.OR = [
          { id: num },
          { r_order_id: num },
          { r_product_id: num },
        ];
      } else {
        where.OR = [
          { product_name: { contains: search } },
          { tracking_number: { contains: search } },
        ];
      }
    }

    if (workflowStatus) {
      // Look up status id from key
      const ws = await prisma.cms_order_item_statuses.findFirst({
        where: { status_key: workflowStatus },
      });
      if (ws) {
        where.workflow_status_id = ws.id;
      }
    }

    if (trackingFilter === "has") {
      where.tracking_number = { not: null };
    } else if (trackingFilter === "missing") {
      where.tracking_number = null;
    }

    if (orderIdFilter) {
      where.r_order_id = Number(orderIdFilter);
    }

    // ── Sorting ─────────────────────────────────────────────────
    const validSorts: Record<string, any> = {
      order_created_at: { r_order_id: sortDir }, // approximate since we can't sort by join field
      product_name: { product_name: sortDir },
      id: { id: sortDir },
    };
    const orderBy = validSorts[sortBy] || { id: sortDir };

    // ── Query ───────────────────────────────────────────────────
    const [items, totalCount] = await Promise.all([
      prisma.order_products.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          r_order_id: true,
          r_product_id: true,
          product_name: true,
          main_image: true,
          variation_image: true,
          variation_name: true,
          quantity: true,
          tracking_number: true,
          shipping_method: true,
          status: true,
          workflow_status_id: true,
          workflow_status_updated_at: true,
          workflow_status_updated_by: true,
          provider_price: true,
          product_price: true,
          shipping: true,
        },
      }),
      prisma.order_products.count({ where }),
    ]);

    // ── Enrich with workflow status labels + order info ──────────
    const orderIds = [...new Set(items.map((i) => i.r_order_id))];
    const productIds = [...new Set(items.map((i) => i.r_product_id))];

    const [orders, statusRows, supplierInfo] = await Promise.all([
      prisma.orders.findMany({
        where: { id: { in: orderIds } },
        select: {
          id: true,
          status: true,
          created_at: true,
          address_first_name: true,
          address_last_name: true,
        },
      }),
      prisma.cms_order_item_statuses.findMany({
        where: { is_active: 1 },
      }),
      productIds.length
        ? prisma.product_1688_info.findMany({
            where: { product_id: { in: productIds } },
            select: { product_id: true, shop_url: true },
          })
        : [],
    ]);

    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const statusMap = new Map(statusRows.map((s) => [s.id, s]));
    const supplierMap = new Map(supplierInfo.map((s) => [s.product_id, s.shop_url]));

    const enriched = items.map((item) => {
      const order = orderMap.get(item.r_order_id);
      const ws = item.workflow_status_id ? statusMap.get(item.workflow_status_id) : null;
      return {
        id: item.id,
        order_id: item.r_order_id,
        product_id: item.r_product_id,
        product_name: item.product_name,
        image_url: item.variation_image || item.main_image,
        variation_name: item.variation_name,
        quantity: item.quantity,
        tracking_number: item.tracking_number,
        shipping_method: item.shipping_method,
        provider_price: item.provider_price,
        product_price: item.product_price,
        shipping: item.shipping,
        workflow_status_key: ws?.status_key || null,
        workflow_status_label: ws?.status_label || null,
        workflow_status_order: ws?.status_order || null,
        is_terminal: ws?.is_terminal === 1,
        order_status: order?.status,
        order_created_at: order?.created_at,
        customer_name: order
          ? `${order.address_first_name} ${order.address_last_name}`.trim()
          : null,
        supplier_link: supplierMap.get(item.r_product_id) || null,
      };
    });

    // ── Workflow status counts for filter bar ────────────────────
    const statusCounts = await prisma.order_products.groupBy({
      by: ["workflow_status_id"],
      _count: { id: true },
    });

    const statusSummary = statusCounts.map((sc) => {
      const ws = sc.workflow_status_id ? statusMap.get(sc.workflow_status_id) : null;
      return {
        status_key: ws?.status_key || "unset",
        status_label: ws?.status_label || "Unset",
        status_order: ws?.status_order ?? 999,
        is_terminal: ws?.is_terminal === 1,
        count: sc._count.id,
      };
    }).sort((a, b) => a.status_order - b.status_order);

    return NextResponse.json({
      items: enriched,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      statusSummary,
    });
  } catch (err) {
    console.error("GET /api/orders/items error:", err);
    return NextResponse.json(
      { error: "Failed to fetch item list" },
      { status: 500 }
    );
  }
}
