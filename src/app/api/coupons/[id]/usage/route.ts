/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/coupons/[id]/usage — Get all usage records for a coupon
 * Returns user info, order info, status, timestamps
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const usages = await prisma.coupon_usage.findMany({
      where: { coupon_id: Number(id) },
      orderBy: { created_at: "desc" },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          },
        },
        orders: {
          select: {
            id: true,
            total: true,
            discount_amount: true,
            status: true,
            created_at: true,
          },
        },
      },
    });

    const result = usages.map((u: any) => ({
      id: u.id,
      user_id: u.user_id,
      user_name: u.users
        ? `${u.users.first_name || ""} ${u.users.last_name || ""}`.trim() ||
          u.users.email ||
          `User #${u.user_id}`
        : `User #${u.user_id}`,
      user_email: u.users?.email || null,
      user_phone: u.users?.phone_number || null,
      order_id: u.order_id,
      order_total: u.orders?.total ?? null,
      order_discount: u.orders?.discount_amount ?? null,
      order_status: u.orders?.status ?? null,
      status: u.status,
      claimed_at: u.created_at,
      used_at: u.used_at,
    }));

    return NextResponse.json({ usages: result });
  } catch (err: any) {
    console.error("GET /api/coupons/[id]/usage error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
