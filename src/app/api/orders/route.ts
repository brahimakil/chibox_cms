/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS, SHIPPING_STATUS, PAYMENT_TYPES } from "@/lib/order-constants";

/**
 * GET /api/orders — List orders with filters, pagination, sorting.
 *
 * Query params:
 *   page, limit, search, status, is_paid, shipping_status,
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
      where.status = Number(status);
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

    // ── Count order_products per order ─────────────────────────────
    const orderIds = orders.map((o) => o.id);
    const itemCounts = orderIds.length
      ? await prisma.order_products.groupBy({
          by: ["r_order_id"],
          where: { r_order_id: { in: orderIds } },
          _count: { id: true },
        })
      : [];
    const itemCountMap = new Map(
      itemCounts.map((ic) => [ic.r_order_id, ic._count.id])
    );

    // ── Enrich with labels ─────────────────────────────────────────
    const enriched = orders.map((o) => ({
      ...o,
      item_count: itemCountMap.get(o.id) || 0,
      status_label: ORDER_STATUS[o.status]?.label || `Status ${o.status}`,
      status_color: ORDER_STATUS[o.status]?.color || "gray",
      shipping_status_label: SHIPPING_STATUS[o.shipping_status]?.label || "Unknown",
      shipping_status_color: SHIPPING_STATUS[o.shipping_status]?.color || "gray",
      payment_type_label: PAYMENT_TYPES[o.payment_type] || `Type ${o.payment_type}`,
      customer_name: `${o.address_first_name} ${o.address_last_name}`.trim(),
    }));

    // ── Quick stats ────────────────────────────────────────────────
    const [totalOrders, pendingReview, readyToShip, todayRevenue] = await Promise.all([
      prisma.orders.count(),
      prisma.orders.count({ where: { shipping_status: 0, is_paid: 1, status: { in: [9, 1, 2] } } }),
      prisma.orders.count({ where: { is_paid: 1, shipping_status: 2, status: { in: [1, 2] } } }),
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
        pendingReview,
        readyToShip,
        todayRevenue: todayRevenue._sum.total || 0,
      },
    });
  } catch (err) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
