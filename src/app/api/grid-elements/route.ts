/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateHomeCache } from "@/lib/cache-invalidation";

/**
 * POST /api/grid-elements — Create a new grid element in the mobile grid
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Find the Mobile grid (or create one)
    let grid = (await prisma.$queryRawUnsafe(
      `SELECT id FROM grids WHERE type = 'Mobile' LIMIT 1`
    )) as any[];

    let gridId: number;
    if (grid.length === 0) {
      const newGrid = await prisma.grids.create({
        data: {
          r_store_id: 1,
          is_main: 1,
          type: "Mobile",
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      gridId = newGrid.id;
    } else {
      gridId = Number(grid[0].id);
    }

    // Get max position_y to place the new element below existing ones
    const maxPos = (await prisma.$queryRawUnsafe(
      `SELECT COALESCE(MAX(CAST(position_y AS UNSIGNED)), 0) as max_y FROM grid_elements WHERE r_grid_id = ?`,
      gridId
    )) as any[];

    const el = await prisma.grid_elements.create({
      data: {
        r_grid_id: gridId,
        position_x: "0",
        position_y: String(Number(maxPos[0].max_y) + 1),
        width: body.width || "1",
        height: body.height || "1",
        main_image: body.main_image || null,
        actions: body.actions
          ? typeof body.actions === "string"
            ? body.actions
            : JSON.stringify(body.actions)
          : null,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Invalidate backend home cache so the change is instant
    invalidateHomeCache();

    return NextResponse.json({ success: true, element: el });
  } catch (error) {
    console.error("Error creating grid element:", error);
    return NextResponse.json(
      { error: "Failed to create grid element" },
      { status: 500 }
    );
  }
}
