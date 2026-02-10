/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/customers — List all customers with stats
 * Query params: page, limit, search, sort, order, status, device
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 25)));
  const search = sp.get("search")?.trim() || "";
  const sortField = sp.get("sort") || "created_at";
  const sortOrder = sp.get("order") === "asc" ? "asc" : "desc";
  const statusFilter = sp.get("status"); // "active" | "inactive" | "all"
  const deviceFilter = sp.get("device"); // "ios" | "android" | "web"
  const typeFilter = sp.get("type"); // "3"=normal "4"=google "5"=apple "6"=facebook

  try {
    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { first_name: { contains: search } },
        { last_name: { contains: search } },
        { email: { contains: search } },
        { phone_number: { contains: search } },
        { id: isNaN(Number(search)) ? undefined : Number(search) },
      ].filter((x: any) => {
        // Remove undefined id searches
        const vals = Object.values(x);
        return vals[0] !== undefined;
      });
    }

    if (statusFilter === "active") where.is_active = 1;
    else if (statusFilter === "inactive") where.is_active = 0;

    if (deviceFilter) where.device_type = deviceFilter;
    if (typeFilter) where.type = Number(typeFilter);

    // Allowed sort fields
    const allowedSorts: Record<string, string> = {
      created_at: "created_at",
      last_login: "last_login",
      first_name: "first_name",
      email: "email",
      id: "id",
    };
    const orderByField = allowedSorts[sortField] || "created_at";

    const [customers, total] = await Promise.all([
      prisma.users.findMany({
        where,
        orderBy: { [orderByField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          country_code: true,
          phone_number: true,
          gender: true,
          is_active: true,
          is_activated: true,
          type: true,
          device_type: true,
          device_id: true,
          main_image: true,
          last_login: true,
          is_provider: true,
          r_store_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.users.count({ where }),
    ]);

    // Fetch order stats + review stats + coupon stats for these customers
    const userIds = customers.map((c) => c.id);

    const [orderStats, reviewStats, couponStats, favoriteStats] =
      await Promise.all([
        // Order stats: count + total spent per user
        prisma.orders.groupBy({
          by: ["r_user_id"],
          where: { r_user_id: { in: userIds } },
          _count: { id: true },
          _sum: { total: true },
        }),
        // Review count per user
        prisma.users_reviews.groupBy({
          by: ["r_user_id"],
          where: { r_user_id: { in: userIds } },
          _count: { id: true },
        }),
        // Coupon usage count per user
        prisma.coupon_usage.groupBy({
          by: ["user_id"],
          where: { user_id: { in: userIds } },
          _count: { id: true },
        }),
        // Favorites count per user
        prisma.favorite.groupBy({
          by: ["user_id"],
          where: { user_id: { in: userIds } },
          _count: { id: true },
        }),
      ]);

    // Build lookup maps
    const orderMap = new Map(
      orderStats.map((o: any) => [
        o.r_user_id,
        { count: o._count.id, total_spent: o._sum.total || 0 },
      ])
    );
    const reviewMap = new Map(
      reviewStats.map((r: any) => [r.r_user_id, r._count.id])
    );
    const couponMap = new Map(
      couponStats.map((c: any) => [c.user_id, c._count.id])
    );
    const favMap = new Map(
      favoriteStats.map((f: any) => [f.user_id, f._count.id])
    );

    const result = customers.map((c) => ({
      ...c,
      orders_count: orderMap.get(c.id)?.count || 0,
      total_spent: orderMap.get(c.id)?.total_spent || 0,
      reviews_count: reviewMap.get(c.id) || 0,
      coupons_used: couponMap.get(c.id) || 0,
      favorites_count: favMap.get(c.id) || 0,
    }));

    return NextResponse.json({
      customers: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("GET /api/customers error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
