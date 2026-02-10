/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/coupons/[id] — Get single coupon
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const coupon = await prisma.coupon_code.findUnique({
      where: { id: Number(id) },
      include: {
        _count: { select: { coupon_usage: true } },
      },
    });
    if (!coupon) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ coupon });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/coupons/[id] — Update coupon
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    const data: any = {};
    if (body.code !== undefined) data.code = body.code;
    if (body.discount !== undefined) data.discount = body.discount;
    if (body.percentage !== undefined) data.percentage = body.percentage;
    if (body.type !== undefined) data.type = body.type;
    if (body.is_forever !== undefined) data.is_forever = body.is_forever;
    if (body.is_active !== undefined) data.is_active = body.is_active;
    if (body.is_public !== undefined) data.is_public = body.is_public;
    if (body.can_take_again !== undefined) data.can_take_again = body.can_take_again;
    if (body.r_user_id !== undefined) data.r_user_id = body.r_user_id || null;
    if (body.start_date !== undefined)
      data.start_date = body.start_date ? new Date(body.start_date) : null;
    if (body.end_date !== undefined)
      data.end_date = body.end_date ? new Date(body.end_date) : null;

    const coupon = await prisma.coupon_code.update({
      where: { id: Number(id) },
      data,
    });

    return NextResponse.json({ coupon, success: true });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/coupons/[id] — Delete coupon (cascades to usage records)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.coupon_code.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
