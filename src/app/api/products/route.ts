/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Check if search looks like a product code (CN-XXX or pure digits) */
function isProductCodeSearch(s: string): boolean {
  return /^CN-/i.test(s) || /^\d{5,}$/.test(s);
}

// ── In-memory cache for total product count (unfiltered) ──
let cachedTotalCount: number | null = null;
let cachedTotalCountTime = 0;
const COUNT_CACHE_TTL = 120_000; // 2 minutes

const PRODUCT_SELECT = {
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
} as const;

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
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId");
    const stockFilter = searchParams.get("stock");
    const excluded = searchParams.get("excluded");
    const language = searchParams.get("language");

    // ── Search strategy ──
    // product_code has BTREE index → equals/startsWith is ~100ms
    // product_name has FULLTEXT index → MATCH AGAINST is ~100ms
    // display_name has BTREE index → startsWith is ~100ms
    // LIKE '%...%' on any column → full scan ~9000ms on 919K rows
    //
    // When search looks like a product code (CN-XXX or digits),
    // use exact/prefix match on product_code only (indexed).
    // Otherwise, find matching IDs via raw SQL with FULLTEXT + index,
    // then feed those IDs into the Prisma query.

    let searchIdFilter: number[] | null = null; // if set, WHERE id IN (...)
    let searchWhere: any = {}; // fallback Prisma where for search

    if (search) {
      if (isProductCodeSearch(search)) {
        // Product code search → use indexed product_code column
        const codeTerm = /^\d+$/.test(search) ? `CN-${search}` : search;
        searchWhere = { product_code: { startsWith: codeTerm } };
      } else {
        // Text search → use UNION of indexed queries (each uses its own index)
        // FULLTEXT on product_name + BTREE on display_name + BTREE on product_code
        const ftTerm = search
          .replaceAll(/[+\-><()~*"@]/g, " ") // strip FULLTEXT operators
          .trim();

        const cursorVal = cursor ? Number.parseInt(cursor, 10) : 0;

        const matchIds = cursor
          ? await prisma.$queryRaw<{ id: number }[]>`
              SELECT id FROM (
                (SELECT id FROM product WHERE MATCH(product_name) AGAINST(${ftTerm + "*"} IN BOOLEAN MODE) AND id < ${cursorVal} ORDER BY id DESC LIMIT ${pageSize + 1})
                UNION
                (SELECT id FROM product WHERE display_name LIKE ${search + "%"} AND id < ${cursorVal} ORDER BY id DESC LIMIT ${pageSize + 1})
                UNION
                (SELECT id FROM product WHERE product_code LIKE ${search + "%"} AND id < ${cursorVal} ORDER BY id DESC LIMIT ${pageSize + 1})
              ) AS t ORDER BY id DESC LIMIT ${pageSize + 1}
            `
          : await prisma.$queryRaw<{ id: number }[]>`
              SELECT id FROM (
                (SELECT id FROM product WHERE MATCH(product_name) AGAINST(${ftTerm + "*"} IN BOOLEAN MODE) ORDER BY id DESC LIMIT ${pageSize + 1})
                UNION
                (SELECT id FROM product WHERE display_name LIKE ${search + "%"} ORDER BY id DESC LIMIT ${pageSize + 1})
                UNION
                (SELECT id FROM product WHERE product_code LIKE ${search + "%"} ORDER BY id DESC LIMIT ${pageSize + 1})
              ) AS t ORDER BY id DESC LIMIT ${pageSize + 1}
            `;

        searchIdFilter = matchIds.map((r) => r.id);

        if (searchIdFilter.length === 0) {
          // No matches at all → return early
          return NextResponse.json({
            products: [],
            nextCursor: null,
            hasMore: false,
            total: 0,
            ...((!cursor) ? { pricing: await getPricing() } : {}),
          });
        }
      }
    }

    // Build where clause
    const where: any = { ...searchWhere };

    // If we resolved search via raw SQL IDs, constrain by those IDs
    if (searchIdFilter) {
      where.id = { in: searchIdFilter };
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

    // Language / translation filter
    // translated   = has display_name (English translation cached by backend)
    // not_translated = display_name is null/empty (still Chinese only)
    if (language === "translated") {
      where.AND = [
        ...(where.AND || []),
        { display_name: { not: null } },
        { display_name: { not: "" } },
      ];
    } else if (language === "not_translated") {
      where.OR = [
        ...(where.OR || []),
        { display_name: null },
        { display_name: "" },
      ];
    }

    // Merge category filter with excluded categories filter
    if (excluded === "excluded" || excluded === "not_excluded") {
      const excludedCategoryIds = await getExcludedCategoryIds();
      if (excludedCategoryIds.length > 0) {
        const excludedSet = new Set(excludedCategoryIds);
        if (excluded === "excluded") {
          if (filterCategoryIds) {
            const intersection = filterCategoryIds.filter((id) => excludedSet.has(id));
            where.category_id = intersection.length > 0
              ? { in: intersection }
              : { equals: -1 };
          } else {
            where.category_id = { in: excludedCategoryIds };
          }
        } else {
          if (filterCategoryIds) {
            const filtered = filterCategoryIds.filter((id) => !excludedSet.has(id));
            where.category_id = filtered.length > 0
              ? { in: filtered }
              : { equals: -1 };
          } else {
            where.category_id = { notIn: excludedCategoryIds };
          }
        }
      } else if (excluded === "excluded") {
        where.id = -1;
      } else if (filterCategoryIds) {
        where.category_id = { in: filterCategoryIds };
      }
    } else if (filterCategoryIds) {
      where.category_id = { in: filterCategoryIds };
    }

    // Cursor condition (order by id DESC → cursor means id < cursor)
    // Skip cursor in Prisma when we already applied it in raw SQL
    if (cursor && !searchIdFilter) {
      const cursorId = Number.parseInt(cursor, 10);
      if (!Number.isNaN(cursorId)) {
        where.id = { ...(where.id || {}), lt: cursorId };
      }
    }

    // ── Run independent queries in parallel ──
    const isFirstLoad = !cursor;
    const isUnfilteredLoad = !search && !categoryId && !stockFilter && !excluded && !language;

    // Build count promise based on the request type
    const countPromise = buildCountPromise(
      isFirstLoad, search, isUnfilteredLoad,
      where, searchWhere, searchIdFilter, pageSize
    );

    // Fire product fetch + count + pricing in parallel
    const [products, total, pricing] = await Promise.all([
      prisma.product.findMany({
        where,
        take: pageSize + 1,
        orderBy: { id: "desc" },
        select: PRODUCT_SELECT,
      }),
      countPromise,
      isFirstLoad ? getPricing() : Promise.resolve(null),
    ]);

    const hasMore = products.length > pageSize;
    const pageProducts = hasMore ? products.slice(0, pageSize) : products;
    const nextCursor = pageProducts.length > 0
      ? pageProducts[pageProducts.length - 1].id
      : null;

    // Get category names (depends on product results)
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
 * Build the count promise based on load context.
 * Returns null if count isn't needed, uses cache for unfiltered loads.
 */
async function buildCountPromise(
  isFirstLoad: boolean,
  search: string,
  isUnfilteredLoad: boolean,
  where: any,
  searchWhere: any,
  searchIdFilter: number[] | null,
  pageSize: number
): Promise<number | null> {
  if (!isFirstLoad) return null;

  if (search) {
    if (isProductCodeSearch(search)) {
      return prisma.product.count({ where: searchWhere });
    }
    // For text search, we already know count from the raw query
    if (searchIdFilter) {
      return searchIdFilter.length > pageSize ? null : searchIdFilter.length;
    }
    return null;
  }

  // Unfiltered: use cached count if available
  if (isUnfilteredLoad && cachedTotalCount !== null && Date.now() - cachedTotalCountTime < COUNT_CACHE_TTL) {
    return cachedTotalCount;
  }

  const count = await prisma.product.count({ where });
  if (isUnfilteredLoad) {
    cachedTotalCount = count;
    cachedTotalCountTime = Date.now();
  }
  return count;
}

/**
 * Get pricing settings (markup + exchange rate).
 */
async function getPricing() {
  const [settings, exchangeRateRow] = await Promise.all([
    prisma.general_settings.findFirst({
      select: { price_markup_percentage: true },
    }),
    prisma.ex_currency.findFirst({
      where: { from_currency: 9, to_currency: 6 },
      select: { rate: true },
    }),
  ]);
  return {
    markupPercent: settings?.price_markup_percentage
      ? Number(settings.price_markup_percentage)
      : 15,
    exchangeRate: exchangeRateRow?.rate ?? 0.14,
  };
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
