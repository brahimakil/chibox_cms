/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cursor-based pagination for products within a category (+ its descendants).
 * GET /api/categories/[id]/products?cursor=...&pageSize=50
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = Number.parseInt(id, 10);
    if (Number.isNaN(categoryId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const sp = request.nextUrl.searchParams;
    const cursor = sp.get("cursor");
    const pageSize = Math.min(
      Number.parseInt(sp.get("pageSize") || "50", 10),
      100
    );
    const search = sp.get("search") || "";

    // Get all descendant category IDs
    const allCategoryIds = await getCategoryDescendantIds(categoryId);

    const where: any = {
      category_id: { in: allCategoryIds },
    };

    if (search) {
      where.OR = [
        { product_name: { contains: search } },
        { display_name: { contains: search } },
        { product_code: { contains: search } },
      ];
    }

    if (cursor) {
      const cursorId = Number.parseInt(cursor, 10);
      if (!Number.isNaN(cursorId)) {
        where.id = { lt: cursorId };
      }
    }

    const products = await prisma.product.findMany({
      where,
      take: pageSize + 1,
      orderBy: { id: "desc" },
      select: {
        id: true,
        product_code: true,
        product_name: true,
        display_name: true,
        original_name: true,
        main_image: true,
        origin_price: true,
        product_price: true,
        category_id: true,
        out_of_stock: true,
        source: true,
        product_status: true,
      },
    });

    const hasMore = products.length > pageSize;
    const pageProducts = hasMore ? products.slice(0, pageSize) : products;
    const nextCursor =
      pageProducts.length > 0
        ? pageProducts[pageProducts.length - 1].id
        : null;

    let total: number | null = null;
    if (!cursor) {
      const countWhere = { ...where };
      delete countWhere.id;
      total = await prisma.product.count({ where: countWhere });
    }

    // Pricing (only on first load)
    let pricing = null;
    if (!cursor) {
      const [settings, exchangeRateRow] = await Promise.all([
        prisma.general_settings.findFirst({
          select: { price_markup_percentage: true },
        }),
        prisma.ex_currency.findFirst({
          where: { from_currency: 9, to_currency: 6 },
          select: { rate: true },
        }),
      ]);
      pricing = {
        markupPercent: settings?.price_markup_percentage
          ? Number(settings.price_markup_percentage)
          : 15,
        exchangeRate: exchangeRateRow?.rate
          ? Number(exchangeRateRow.rate)
          : 0.14,
      };
    }

    // Category names for products
    const categoryIds = [
      ...new Set(
        pageProducts.map((p: any) => p.category_id).filter(Boolean)
      ),
    ] as number[];
    const categories =
      categoryIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, category_name: true, category_name_en: true },
          })
        : [];
    const categoryMap = new Map(
      categories.map((c: any) => [
        c.id,
        c.category_name_en || c.category_name,
      ])
    );

    const formatted = pageProducts.map((p: any) => ({
      id: p.id,
      product_code: p.product_code,
      product_name: p.product_name,
      display_name: p.display_name,
      original_name: p.original_name,
      main_image: p.main_image,
      origin_price: p.origin_price ? Number(p.origin_price) : null,
      category_name: p.category_id
        ? categoryMap.get(p.category_id) || null
        : null,
      category_id: p.category_id,
      out_of_stock: p.out_of_stock,
      source: p.source,
      product_status: p.product_status,
    }));

    return NextResponse.json({
      products: formatted,
      nextCursor,
      hasMore,
      ...(total !== null && { total }),
      ...(pricing && { pricing }),
    });
  } catch (error) {
    console.error("Error fetching category products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

async function getCategoryDescendantIds(categoryId: number): Promise<number[]> {
  const result = [categoryId];
  let frontier = [categoryId];
  while (frontier.length > 0) {
    const children = await prisma.category.findMany({
      where: { parent: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((c: any) => c.id);
    result.push(...frontier);
  }
  return result;
}
