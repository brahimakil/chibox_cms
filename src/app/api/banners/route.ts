/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/banners — Returns all sliders + grid elements (mobile banners)
 */
export async function GET() {
  try {
    const [sliders, grids] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT s.*, 
          (SELECT COUNT(*) FROM ag_attachment WHERE table_name='sliders' AND row_id=s.id) as attachment_count,
          (SELECT file_path FROM ag_attachment WHERE table_name='sliders' AND row_id=s.id ORDER BY id DESC LIMIT 1) as attachment_image
        FROM sliders s 
        ORDER BY s.order_number ASC
      `) as Promise<any[]>,
      prisma.$queryRawUnsafe(`
        SELECT g.id, g.r_store_id, g.is_main, g.type, g.category_id, g.brand_id,
               g.created_at, g.updated_at
        FROM grids g 
        WHERE g.type = 'Mobile'
        ORDER BY g.id ASC
      `) as Promise<any[]>,
    ]);

    // Fetch grid elements for all mobile grids
    const gridIds = grids.map((g: any) => Number(g.id));
    let gridElements: any[] = [];
    if (gridIds.length > 0) {
      gridElements = await prisma.$queryRawUnsafe(`
        SELECT * FROM grid_elements 
        WHERE r_grid_id IN (${gridIds.join(",")})
        ORDER BY r_grid_id ASC, id ASC
      `) as any[];
    }

    // Group elements by grid
    const elementsByGrid = new Map<number, any[]>();
    for (const el of gridElements) {
      const gid = Number(el.r_grid_id);
      const arr = elementsByGrid.get(gid) || [];
      arr.push({
        id: Number(el.id),
        r_grid_id: gid,
        position_x: el.position_x,
        position_y: el.position_y,
        width: el.width,
        height: el.height,
        main_image: el.main_image,
        actions: el.actions ? JSON.parse(el.actions) : [],
        created_at: el.created_at,
        updated_at: el.updated_at,
      });
      elementsByGrid.set(gid, arr);
    }

    const formattedGrids = grids.map((g: any) => ({
      id: Number(g.id),
      r_store_id: Number(g.r_store_id),
      is_main: Boolean(g.is_main),
      type: g.type,
      category_id: g.category_id ? Number(g.category_id) : null,
      brand_id: g.brand_id ? Number(g.brand_id) : null,
      elements: elementsByGrid.get(Number(g.id)) || [],
      created_at: g.created_at,
      updated_at: g.updated_at,
    }));

    const formattedSliders = sliders.map((s: any) => ({
      id: Number(s.id),
      r_store_id: Number(s.r_store_id),
      text: s.text,
      btn_text: s.btn_text,
      btn_url: s.btn_url,
      order_number: Number(s.order_number),
      main_image: s.main_image || s.attachment_image || null,
      attachment_count: Number(s.attachment_count),
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    return NextResponse.json({
      sliders: formattedSliders,
      grids: formattedGrids,
    });
  } catch (error) {
    console.error("Error fetching banners:", error);
    return NextResponse.json(
      { error: "Failed to fetch banners" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/banners — Create a new slider
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, btn_text, btn_url, main_image, r_store_id } = body;

    // Get max order_number
    const maxOrder = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(MAX(order_number), 0) as max_order FROM sliders WHERE r_store_id = ?`,
      r_store_id || 1
    ) as any[];

    const slider = await prisma.sliders.create({
      data: {
        r_store_id: r_store_id || 1,
        text: text || "",
        btn_text: btn_text || "",
        btn_url: btn_url || "",
        main_image: main_image || null,
        order_number: Number(maxOrder[0].max_order) + 1,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, slider });
  } catch (error) {
    console.error("Error creating banner:", error);
    return NextResponse.json(
      { error: "Failed to create banner" },
      { status: 500 }
    );
  }
}
