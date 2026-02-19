/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateHomeCache } from "@/lib/cache-invalidation";

/**
 * GET /api/flash-sales/[id] — Get detail for a single flash sale with its products
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [sales, products] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT * FROM flash_sales WHERE id = ?`,
        Number(id)
      ) as Promise<any[]>,
      prisma.$queryRawUnsafe(
        `SELECT p.id, p.product_name, p.display_name, p.product_price, p.sale_price, p.main_image, p.product_qty_left, p.product_status
         FROM flash_sales_products fp
         JOIN product p ON p.id = fp.r_product_id
         WHERE fp.r_flash_id = ?`,
        Number(id)
      ) as Promise<any[]>,
    ]);

    if (!sales.length) {
      return NextResponse.json(
        { error: "Flash sale not found" },
        { status: 404 }
      );
    }

    const s = sales[0];

    return NextResponse.json({
      sale: {
        id: Number(s.id),
        title: s.title,
        slug: s.slug,
        color_1: s.color_1,
        color_2: s.color_2,
        color_3: s.color_3,
        slider_type: Number(s.slider_type),
        start_time: s.start_time,
        end_time: s.end_time,
        display: Boolean(s.display),
        r_store_id: Number(s.r_store_id),
        discount: Number(s.discount),
        order_number: Number(s.order_number),
        created_at: s.created_at,
        updated_at: s.updated_at,
      },
      products: products.map((p: any) => ({
        id: Number(p.id),
        title: p.display_name || p.product_name || `#${p.id}`,
        price: Number(p.product_price),
        discount_price: p.sale_price ? Number(p.sale_price) : null,
        main_image: p.main_image,
        quantity: Number(p.product_qty_left),
        status: Number(p.product_status),
      })),
    });
  } catch (error) {
    console.error("Error fetching flash sale:", error);
    return NextResponse.json(
      { error: "Failed to fetch flash sale" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/flash-sales/[id] — Update a flash sale
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, any> = { updated_at: new Date() };

    if (body.title !== undefined) {
      updateData.title = body.title;
      updateData.slug = body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
    if (body.color_1 !== undefined) updateData.color_1 = body.color_1;
    if (body.color_2 !== undefined) updateData.color_2 = body.color_2;
    if (body.color_3 !== undefined) updateData.color_3 = body.color_3;
    if (body.slider_type !== undefined)
      updateData.slider_type = body.slider_type;
    if (body.start_time !== undefined)
      updateData.start_time = body.start_time ? new Date(body.start_time) : null;
    if (body.end_time !== undefined)
      updateData.end_time = body.end_time
        ? new Date(body.end_time)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // default 1 year
    if (body.display !== undefined) updateData.display = body.display ? 1 : 0;
    if (body.discount !== undefined) updateData.discount = body.discount;
    if (body.r_store_id !== undefined)
      updateData.r_store_id = body.r_store_id;
    if (body.order_number !== undefined)
      updateData.order_number = body.order_number;

    const sale = await prisma.flash_sales.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Invalidate backend home cache so the change is instant
    invalidateHomeCache();

    return NextResponse.json({ success: true, sale });
  } catch (error) {
    console.error("Error updating flash sale:", error);
    return NextResponse.json(
      { error: "Failed to update flash sale" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/flash-sales/[id] — Delete a flash sale and its product associations
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);

    // Delete product associations first
    await prisma.$executeRawUnsafe(
      `DELETE FROM flash_sales_products WHERE r_flash_id = ?`,
      numId
    );

    // Also clear r_flash_id from any Product that references this flash sale
    await prisma.$executeRawUnsafe(
      `UPDATE product SET r_flash_id = NULL WHERE r_flash_id = ?`,
      numId
    );

    // Delete the flash sale
    await prisma.flash_sales.delete({ where: { id: numId } });

    // Invalidate backend home cache so the change is instant
    invalidateHomeCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting flash sale:", error);
    return NextResponse.json(
      { error: "Failed to delete flash sale" },
      { status: 500 }
    );
  }
}
