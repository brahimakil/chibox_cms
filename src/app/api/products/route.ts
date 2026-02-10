/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cursor-based pagination for products.
 * Query params:
 *   cursor   - last product ID from previous page (omit for first page)
 *   pageSize - items per batch (default 50)
 *   search   - full text search on name/code
 *   categoryId - filter by category
 *   stock    - "in_stock" | "out_of_stock"
 *   excluded - "excluded" | "not_excluded"
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get("cursor");
    const pageSize = Math.min(
      Number.parseInt(searchParams.get("pageSize") || "50", 10),
      100
    );
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const stockFilter = searchParams.get("stock");
    const excluded = searchParams.get("excluded");

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { product_name: { contains: search } },
        { display_name: { contains: search } },
        { product_code: { contains: search } },
      ];
    }

    // Resolve category filter: include the selected category AND all its descendants
    let filterCategoryIds: number[] | null = null;
    if (categoryId) {
      const parsedId = Number.parseInt(categoryId, 10);
      filterCategoryIds = await getCategoryDescendantIds(parsedId);
    }

    if (stockFilter === "in_stock") {
      where.out_of_stock = 0;
    } else if (stockFilter === "out_of_stock") {
      where.out_of_stock = 1;
    }

    // Merge category filter with excluded categories filter
    if (excluded === "excluded" || excluded === "not_excluded") {
      const excludedCategoryIds = await getExcludedCategoryIds();
      if (excludedCategoryIds.length > 0) {
        const excludedSet = new Set(excludedCategoryIds);
        if (excluded === "excluded") {
          if (filterCategoryIds) {
            // Intersection: only categories that are both descendants AND excluded
            const intersection = filterCategoryIds.filter((id) => excludedSet.has(id));
            where.category_id = intersection.length > 0
              ? { in: intersection }
              : { equals: -1 }; // No overlap → no results
          } else {
            where.category_id = { in: excludedCategoryIds };
          }
        } else {
          // not_excluded
          if (filterCategoryIds) {
            // Descendants minus excluded
            const filtered = filterCategoryIds.filter((id) => !excludedSet.has(id));
            where.category_id = filtered.length > 0
              ? { in: filtered }
              : { equals: -1 };
          } else {
            where.category_id = { notIn: excludedCategoryIds };
          }
        }
      } else if (excluded === "excluded") {
        where.id = -1; // No excluded categories → no products match
      } else if (filterCategoryIds) {
        // not_excluded but no excluded categories exist → just use category filter
        where.category_id = { in: filterCategoryIds };
      }
    } else if (filterCategoryIds) {
      // No excluded filter → just category filter with descendants
      where.category_id = { in: filterCategoryIds };
    }

    // Cursor condition (we order by id DESC, so cursor means "id < cursor")
    if (cursor) {
      const cursorId = Number.parseInt(cursor, 10);
      if (!Number.isNaN(cursorId)) {
        where.id = { ...(where.id || {}), lt: cursorId };
      }
    }

    // Fetch one extra to determine hasMore
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
        currency_id: true,
        category_id: true,
        out_of_stock: true,
        source: true,
        product_status: true,
        show_on_website: true,
        created_at: true,
      },
    });

    const hasMore = products.length > pageSize;
    const pageProducts = hasMore ? products.slice(0, pageSize) : products;
    const nextCursor = pageProducts.length > 0
      ? pageProducts[pageProducts.length - 1].id
      : null;

    // Count only on first load (no cursor) to avoid expensive count on every scroll
    let total: number | null = null;
    if (!cursor) {
      total = await prisma.product.count({ where: (() => {
        // Rebuild where without cursor for accurate total
        const countWhere: any = { ...where };
        if (countWhere.id?.lt) {
          delete countWhere.id.lt;
          if (Object.keys(countWhere.id).length === 0) delete countWhere.id;
        }
        return countWhere;
      })() });
    }

    // Get category names
    const categoryIds = [
      ...new Set(pageProducts.map((p: any) => p.category_id).filter(Boolean)),
    ] as number[];
    const categories =
      categoryIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, category_name: true },
          })
        : [];
    const categoryMap = new Map(categories.map((c: any) => [c.id, c.category_name]));

    // Get pricing settings (only on first load)
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
        exchangeRate: exchangeRateRow?.rate ?? 0.14,
      };
    }

    // Format response
    const formattedProducts = pageProducts.map((p: any) => {
      const originPrice = p.origin_price ? Number(p.origin_price) : null;
      return {
        id: p.id,
        product_code: p.product_code,
        product_name: p.product_name,
        display_name: p.display_name,
        original_name: p.original_name,
        main_image: p.main_image,
        origin_price: originPrice,
        category_name: p.category_id
          ? categoryMap.get(p.category_id) || null
          : null,
        category_id: p.category_id,
        out_of_stock: p.out_of_stock,
        source: p.source,
        product_status: p.product_status,
      };
    });

    return NextResponse.json({
      products: formattedProducts,
      nextCursor,
      hasMore,
      ...(total !== null && { total }),
      ...(pricing && { pricing }),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

/**
 * Get a category ID and all its descendant category IDs (recursive).
 */
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

/**
 * Get all excluded category IDs, including recursive children.
 */
async function getExcludedCategoryIds(): Promise<number[]> {
  const directlyExcluded = await prisma.excluded_categories.findMany({
    select: { category_id: true },
  });
  const allExcluded = new Set(directlyExcluded.map((e: any) => e.category_id));

  // Recursively find children of excluded categories
  let frontier = [...allExcluded];
  while (frontier.length > 0) {
    const children = await prisma.category.findMany({
      where: {
        parent: { in: frontier },
        id: { notIn: [...allExcluded] },
      },
      select: { id: true },
    });
    frontier = children.map((c: any) => c.id);
    for (const id of frontier) {
      allExcluded.add(id);
    }
  }

  return [...allExcluded];
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No product IDs provided" },
        { status: 400 }
      );
    }

    // Delete related records first (those without cascade), then products
    // Get option IDs first
    const optionIds = (
      await prisma.product_options.findMany({
        where: { product_id: { in: ids } },
        select: { id: true },
      })
    ).map((o: any) => o.id);

    await prisma.$transaction([
      ...(optionIds.length > 0
        ? [
            prisma.product_options_values.deleteMany({
              where: { r_product_option_id: { in: optionIds } },
            }),
          ]
        : []),
      prisma.product_options.deleteMany({
        where: { product_id: { in: ids } },
      }),
      prisma.product_variation.deleteMany({
        where: { product_id: { in: ids } },
      }),
      prisma.product_categories.deleteMany({
        where: { product_id: { in: ids } },
      }),
      prisma.productpayload.deleteMany({
        where: { product_id: { in: ids } },
      }),
      prisma.products_view.deleteMany({
        where: { product_id: { in: ids } },
      }),
      // product_1688_info and product_variant have CASCADE on delete
      prisma.product.deleteMany({
        where: { id: { in: ids } },
      }),
    ]);

    return NextResponse.json({ success: true, deletedCount: ids.length });
  } catch (error) {
    console.error("Error deleting products:", error);
    return NextResponse.json(
      { error: "Failed to delete products" },
      { status: 500 }
    );
  }
}
