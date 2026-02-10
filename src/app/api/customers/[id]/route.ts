/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/customers/[id] — Full customer profile with all related data
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = Number(id);

  try {
    const customer = await prisma.users.findUnique({
      where: { id: userId },
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
        language_id: true,
        device_type: true,
        device_id: true,
        main_image: true,
        last_login: true,
        is_provider: true,
        r_store_id: true,
        apple_identifier: true,
        show_prices: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Fetch all related data in parallel
    const [
      orders,
      orderStats,
      reviews,
      couponUsages,
      addresses,
      favorites,
      loginData,
      account,
    ] = await Promise.all([
      // Recent orders (last 20)
      prisma.orders.findMany({
        where: { r_user_id: userId },
        orderBy: { created_at: "desc" },
        take: 20,
        select: {
          id: true,
          total: true,
          subtotal: true,
          discount_amount: true,
          tax_amount: true,
          shipping_amount: true,
          quantity: true,
          status: true,
          is_paid: true,
          payment_type: true,
          shipping_method: true,
          country: true,
          city: true,
          coupon_code: true,
          created_at: true,
        },
      }),
      // Aggregated order stats
      prisma.orders.aggregate({
        where: { r_user_id: userId },
        _count: { id: true },
        _sum: { total: true, discount_amount: true },
        _avg: { total: true },
        _max: { created_at: true },
      }),
      // Reviews
      prisma.users_reviews.findMany({
        where: { r_user_id: userId },
        orderBy: { created_at: "desc" },
        take: 10,
      }),
      // Coupon usage
      prisma.coupon_usage.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: 10,
        include: {
          coupon_code: {
            select: { id: true, code: true, discount: true, percentage: true },
          },
        },
      }),
      // Addresses
      prisma.addresses.findMany({
        where: { user_id: userId },
        orderBy: { is_default: "desc" },
      }),
      // Favorites count
      prisma.favorite.count({
        where: { user_id: userId },
      }),
      // Last login device
      prisma.login_data.findFirst({
        where: { r_user_id: userId },
        orderBy: { created_at: "desc" },
      }),
      // Account balance
      prisma.account.findFirst({
        where: { r_user_id: userId },
        select: { credit: true, debit: true },
      }),
    ]);

    // Count reviews by status
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : null;

    return NextResponse.json({
      customer,
      stats: {
        orders_count: orderStats._count.id,
        total_spent: orderStats._sum.total || 0,
        total_discount: orderStats._sum.discount_amount || 0,
        avg_order_value: orderStats._avg.total || 0,
        last_order_date: orderStats._max.created_at,
        reviews_count: reviews.length,
        avg_rating: avgRating,
        favorites_count: favorites,
        balance_credit: account?.credit ?? 0,
        balance_debit: account?.debit ?? 0,
      },
      orders: orders.map((o) => ({
        ...o,
        status_label: ORDER_STATUS_LABELS[o.status] || "Unknown",
      })),
      reviews,
      coupon_usages: couponUsages.map((cu: any) => ({
        id: cu.id,
        status: cu.status,
        coupon_code: cu.coupon_code?.code || "—",
        coupon_discount: cu.coupon_code?.percentage
          ? `${cu.coupon_code.percentage}%`
          : cu.coupon_code?.discount
            ? `$${cu.coupon_code.discount}`
            : "—",
        order_id: cu.order_id,
        claimed_at: cu.created_at,
        used_at: cu.used_at,
      })),
      addresses,
      last_device: loginData
        ? {
            os: loginData.os,
            brand: loginData.brand,
            model: loginData.model,
            manufacturer: loginData.manufacturer,
            device_id: loginData.device_id,
            screen: `${loginData.width_px}×${loginData.height_px}`,
            logged_at: loginData.created_at,
          }
        : null,
    });
  } catch (err: any) {
    console.error(`GET /api/customers/${id} error:`, err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/customers/[id] — Update customer (toggle active, etc)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  try {
    const data: any = {};
    if (body.is_active !== undefined) data.is_active = body.is_active;
    if (body.first_name !== undefined) data.first_name = body.first_name;
    if (body.last_name !== undefined) data.last_name = body.last_name;
    if (body.email !== undefined) data.email = body.email;
    if (body.gender !== undefined) data.gender = body.gender;
    if (body.is_provider !== undefined) data.is_provider = body.is_provider;

    const updated = await prisma.users.update({
      where: { id: Number(id) },
      data,
    });

    return NextResponse.json({ customer: updated });
  } catch (err: any) {
    console.error(`PUT /api/customers/${id} error:`, err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/* ─── Order status labels ─── */
const ORDER_STATUS_LABELS: Record<number, string> = {
  1: "Confirmed",
  2: "Processing",
  3: "Shipped",
  4: "Delivered",
  5: "Cancelled",
  6: "Refunded",
  7: "Failed",
  8: "On Hold",
  9: "Pending",
};
