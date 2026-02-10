/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/coupons — List all coupons with usage stats
 */
export async function GET() {
  try {
    const coupons = await prisma.coupon_code.findMany({
      orderBy: { created_at: "desc" },
      include: {
        _count: { select: { coupon_usage: true } },
        coupon_usage: {
          select: { status: true },
        },
      },
    });

    const result = coupons.map((c: any) => {
      const usages = c.coupon_usage || [];
      return {
        id: c.id,
        code: c.code,
        discount: c.discount,
        percentage: c.percentage ? Number(c.percentage) : 0,
        type: c.type,
        start_date: c.start_date,
        end_date: c.end_date,
        is_forever: c.is_forever ?? false,
        is_active: c.is_active ?? true,
        is_public: c.is_public ?? false,
        can_take_again: c.can_take_again ?? false,
        r_user_id: c.r_user_id,
        created_at: c.created_at,
        updated_at: c.updated_at,
        total_usage: c._count.coupon_usage,
        claimed_count: usages.filter((u: any) => u.status === "claimed").length,
        locked_count: usages.filter((u: any) => u.status === "locked").length,
        redeemed_count: usages.filter((u: any) => u.status === "redeemed").length,
      };
    });

    return NextResponse.json({ coupons: result });
  } catch (err: any) {
    console.error("GET /api/coupons error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/coupons — Create a new coupon
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const coupon = await prisma.coupon_code.create({
      data: {
        code: body.code,
        discount: body.discount ?? 0,
        percentage: body.percentage ?? 0,
        type: body.type ?? "Both",
        start_date: body.start_date ? new Date(body.start_date) : null,
        end_date: body.end_date ? new Date(body.end_date) : null,
        is_forever: body.is_forever ?? false,
        is_active: body.is_active ?? true,
        is_public: body.is_public ?? false,
        can_take_again: body.can_take_again ?? false,
        r_user_id: body.r_user_id ?? null,
        created_by: 1,
      },
    });

    return NextResponse.json({ coupon, success: true }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/coupons error:", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
