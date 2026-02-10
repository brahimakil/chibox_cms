/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/categories/[id] - Get full category detail with children, parent chain, product count
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = Number.parseInt(id, 10);
    if (Number.isNaN(categoryId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Resolve parent chain (breadcrumb)
    const breadcrumb: { id: number; name: string }[] = [];
    let currentParentId = category.parent;
    while (currentParentId != null) {
      const p = await prisma.category.findUnique({
        where: { id: currentParentId },
        select: { id: true, category_name: true, category_name_en: true, parent: true },
      });
      if (!p) break;
      breadcrumb.unshift({ id: p.id, name: p.category_name_en || p.category_name });
      currentParentId = p.parent;
    }

    // Direct children
    const children = await prisma.category.findMany({
      where: { parent: categoryId },
      select: {
        id: true,
        category_name: true,
        category_name_en: true,
        level: true,
        product_count: true,
        display: true,
        main_image: true,
        order_number: true,
      },
      orderBy: [{ order_number: "asc" }, { category_name: "asc" }],
    });

    // Excluded status
    const excludedRow = await prisma.excluded_categories.findFirst({
      where: { category_id: categoryId },
    });

    // Total products including children (recursive)
    // For parent categories (L0/L1), direct product_count is typically 0
    // since products are assigned to leaf categories
    const allDescendantIds = await getCategoryDescendantIds(categoryId);

    const [realProductCount, totalProductsInTree] = await Promise.all([
      prisma.product.count({ where: { category_id: categoryId } }),
      prisma.product.count({ where: { category_id: { in: allDescendantIds } } }),
    ]);

    const formatted: any = { ...category };
    // Convert Decimals
    for (const key of [
      "tax_air",
      "tax_sea",
      "cbm_rate",
      "shipping_surcharge_percent",
      "air_shipping_rate",
    ]) {
      formatted[key] = formatted[key] ? Number(formatted[key]) : null;
    }

    return NextResponse.json({
      category: formatted,
      breadcrumb,
      children,
      is_excluded: !!excludedRow,
      excluded_reason: excludedRow?.reason || null,
      real_product_count: realProductCount,
      total_products_in_tree: totalProductsInTree,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/categories/[id] - Update category fields
 * Supports: category_name, category_name_en, main_image, display,
 *           tax_air, tax_sea, cbm_rate, shipping_surcharge_percent,
 *           air_shipping_rate, tax_min_qty_air, tax_min_qty_sea,
 *           show_in_navbar, order_number, parent
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = Number.parseInt(id, 10);
    if (Number.isNaN(categoryId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const allowedFields = [
      "category_name",
      "category_name_en",
      "category_name_zh",
      "main_image",
      "display",
      "show_in_navbar",
      "order_number",
      "parent",
      "tax_air",
      "tax_sea",
      "tax_min_qty_air",
      "tax_min_qty_sea",
      "cbm_rate",
      "shipping_surcharge_percent",
      "air_shipping_rate",
      "sync_enabled",
      "sync_priority",
    ];

    const data: any = {};
    for (const field of allowedFields) {
      if (field in body) {
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    data.updated_at = new Date();

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data,
    });

    // Convert decimals for response
    const formatted: any = { ...updated };
    for (const key of [
      "tax_air",
      "tax_sea",
      "cbm_rate",
      "shipping_surcharge_percent",
      "air_shipping_rate",
    ]) {
      formatted[key] = formatted[key] ? Number(formatted[key]) : null;
    }

    return NextResponse.json({ category: formatted });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

async function getCategoryDescendantIds(categoryId: number): Promise<number[]> {
  // Fetch entire parent→child tree in ONE query, then traverse in-memory
  const allCats = await prisma.category.findMany({
    select: { id: true, parent: true },
  });

  const childrenMap = new Map<number, number[]>();
  for (const c of allCats) {
    if (c.parent != null) {
      const siblings = childrenMap.get(c.parent) || [];
      siblings.push(c.id);
      childrenMap.set(c.parent, siblings);
    }
  }

  const result = [categoryId];
  const frontier = [categoryId];
  while (frontier.length > 0) {
    const pid = frontier.pop()!;
    for (const childId of childrenMap.get(pid) || []) {
      result.push(childId);
      frontier.push(childId);
    }
  }
  return result;
}
