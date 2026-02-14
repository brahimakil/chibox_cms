/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/flash-sales — List all flash sales with their product counts
 */
export async function GET() {
  try {
    const [sales, productCounts] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT id, title, slug, color_1, color_2, color_3, slider_type, 
               end_time, display, r_store_id, discount, order_number,
               created_at, updated_at
        FROM flash_sales ORDER BY order_number ASC
      `) as Promise<any[]>,
      prisma.$queryRawUnsafe(`
        SELECT r_flash_id, COUNT(*) as cnt 
        FROM flash_sales_products 
        GROUP BY r_flash_id
      `) as Promise<any[]>,
    ]);

    const countMap = new Map(
      productCounts.map((pc: any) => [Number(pc.r_flash_id), Number(pc.cnt)])
    );

    const formatted = sales.map((s: any) => ({
      id: Number(s.id),
      title: s.title,
      slug: s.slug,
      color_1: s.color_1,
      color_2: s.color_2,
      color_3: s.color_3,
      slider_type: Number(s.slider_type),
      end_time: s.end_time,
      display: Boolean(s.display),
      r_store_id: Number(s.r_store_id),
      discount: Number(s.discount),
      order_number: Number(s.order_number),
      product_count: countMap.get(Number(s.id)) || 0,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    return NextResponse.json({ sales: formatted, total: formatted.length });
  } catch (error) {
    console.error("Error fetching flash sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch flash sales" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flash-sales — Create a new flash sale
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get max order_number
    const maxOrder = (await prisma.$queryRawUnsafe(
      `SELECT COALESCE(MAX(order_number), 0) as max_order FROM flash_sales`
    )) as any[];

    const sale = await prisma.flash_sales.create({
      data: {
        title: body.title || "",
        slug: (body.title || "flash-sale")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        color_1: body.color_1 || "#e24040",
        color_2: body.color_2 || "#3c5d9f",
        color_3: body.color_3 || "#208d4f",
        slider_type: body.slider_type ?? 1,
        end_time: body.end_time
          ? new Date(body.end_time)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // default 1 year if not set
        display: body.display ? 1 : 0,
        r_store_id: body.r_store_id || 1,
        discount: body.discount || 0,
        order_number: Number(maxOrder[0].max_order) + 1,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Add products if provided (parameterized to prevent SQL injection)
    if (body.product_ids?.length) {
      const values = body.product_ids.map((pid: number) => [sale.id, Number(pid)]);
      for (const [flashId, productId] of values) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO flash_sales_products (r_flash_id, r_product_id) VALUES (?, ?)`,
          flashId,
          productId
        );
      }
    }

    return NextResponse.json({ success: true, sale });
  } catch (error) {
    console.error("Error creating flash sale:", error);
    return NextResponse.json(
      { error: "Failed to create flash sale" },
      { status: 500 }
    );
  }
}
