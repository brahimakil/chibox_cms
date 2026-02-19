/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateHomeCache } from "@/lib/cache-invalidation";

/**
 * PUT /api/grid-elements/[id] — Update a grid element
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const body = await request.json();

    const updateData: Record<string, any> = { updated_at: new Date() };

    if (body.main_image !== undefined) updateData.main_image = body.main_image;
    if (body.actions !== undefined)
      updateData.actions =
        typeof body.actions === "string"
          ? body.actions
          : JSON.stringify(body.actions);
    if (body.position_x !== undefined)
      updateData.position_x = String(body.position_x);
    if (body.position_y !== undefined)
      updateData.position_y = String(body.position_y);
    if (body.width !== undefined) updateData.width = String(body.width);
    if (body.height !== undefined) updateData.height = String(body.height);

    await prisma.grid_elements.update({
      where: { id: numId },
      data: updateData,
    });

    // Invalidate backend home cache so the change is instant
    invalidateHomeCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating grid element:", error);
    return NextResponse.json(
      { error: "Failed to update grid element" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/grid-elements/[id] — Delete a grid element
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.grid_elements.delete({ where: { id: Number(id) } });

    // Invalidate backend home cache so the change is instant
    invalidateHomeCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting grid element:", error);
    return NextResponse.json(
      { error: "Failed to delete grid element" },
      { status: 500 }
    );
  }
}
