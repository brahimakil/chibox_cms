/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/coupons — List all coupons with usage stats
 */
export async function GET() {
  try {
    // Fetch coupons and usage stats in parallel (avoid loading all usage records)
    const [coupons, usageStats] = await Promise.all([
      prisma.coupon_code.findMany({
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          code: true,
          discount: true,
          percentage: true,
          type: true,
          start_date: true,
          end_date: true,
          is_forever: true,
          is_active: true,
          is_public: true,
          can_take_again: true,
          r_user_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
      // Single groupBy query replaces loading ALL usage rows
      prisma.coupon_usage.groupBy({
        by: ["coupon_id", "status"],
        _count: true,
      }),
    ]);

    // Build lookup: couponId → { total, claimed, locked, redeemed }
    const statsMap = new Map<number, { total: number; claimed: number; locked: number; redeemed: number }>();
    for (const row of usageStats) {
      const cid = row.coupon_id;
      if (!statsMap.has(cid)) statsMap.set(cid, { total: 0, claimed: 0, locked: 0, redeemed: 0 });
      const entry = statsMap.get(cid)!;
      const cnt = row._count;
      entry.total += cnt;
      if (row.status === "claimed") entry.claimed += cnt;
      else if (row.status === "locked") entry.locked += cnt;
      else if (row.status === "redeemed") entry.redeemed += cnt;
    }

    const result = coupons.map((c: any) => {
      const stats = statsMap.get(c.id) || { total: 0, claimed: 0, locked: 0, redeemed: 0 };
      return {
        ...c,
        percentage: c.percentage ? Number(c.percentage) : 0,
        is_forever: c.is_forever ?? false,
        is_active: c.is_active ?? true,
        is_public: c.is_public ?? false,
        can_take_again: c.can_take_again ?? false,
        total_usage: stats.total,
        claimed_count: stats.claimed,
        locked_count: stats.locked,
        redeemed_count: stats.redeemed,
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
