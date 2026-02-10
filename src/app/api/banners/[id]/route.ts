/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/banners/[id] — Update a slider
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sliderId = parseInt(id, 10);
    const body = await request.json();

    const updateData: any = { updated_at: new Date() };
    const allowedFields = [
      "text",
      "btn_text",
      "btn_url",
      "main_image",
      "order_number",
      "r_store_id",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    await prisma.sliders.update({
      where: { id: sliderId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating banner:", error);
    return NextResponse.json(
      { error: "Failed to update banner" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/banners/[id] — Delete a slider
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sliderId = parseInt(id, 10);

    await prisma.sliders.delete({ where: { id: sliderId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting banner:", error);
    return NextResponse.json(
      { error: "Failed to delete banner" },
      { status: 500 }
    );
  }
}
