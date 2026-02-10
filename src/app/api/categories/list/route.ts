/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// In-memory cache for excluded category IDs (rebuild every 60s)
let excludedCache: { ids: Set<number>; ts: number } | null = null;
const EXCLUDED_TTL = 60_000; // 60 seconds

async function getExcludedCategoryIds(): Promise<Set<number>> {
  if (excludedCache && Date.now() - excludedCache.ts < EXCLUDED_TTL) {
    return excludedCache.ids;
  }

  // Fetch all categories + excluded rows in parallel (single query each)
  const [allCats, excludedRows] = await Promise.all([
    prisma.category.findMany({ select: { id: true, parent: true } }),
    prisma.excluded_categories.findMany({ select: { category_id: true } }),
  ]);

  // Build parent → children map in memory
  const childrenMap = new Map<number, number[]>();
  for (const c of allCats) {
    if (c.parent != null) {
      const siblings = childrenMap.get(c.parent) || [];
      siblings.push(c.id);
      childrenMap.set(c.parent, siblings);
    }
  }

  // Expand excluded set recursively (in-memory, no more DB queries)
  const excludedIds = new Set(excludedRows.map((e) => e.category_id));
  const frontier = [...excludedIds];
  while (frontier.length > 0) {
    const parentId = frontier.pop()!;
    for (const childId of childrenMap.get(parentId) || []) {
      if (!excludedIds.has(childId)) {
        excludedIds.add(childId);
        frontier.push(childId);
      }
    }
  }

  excludedCache = { ids: excludedIds, ts: Date.now() };
  return excludedIds;
}

/**
 * Cursor-based pagination for categories.
 * Query params:
 *   cursor     - last category ID from previous page (omit for first page)
 *   pageSize   - items per batch (default 50, max 100)
 *   search     - full-text search on name
 *   level      - filter by hierarchy level (0=root, 1, 2, ...)
 *   display    - "visible" | "hidden"
 *   excluded   - "excluded" | "not_excluded"
 *   parentId   - filter by direct parent
 *   hasImage   - "yes" | "no"
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const cursor = sp.get("cursor");
    const pageSize = Math.min(
      Number.parseInt(sp.get("pageSize") || "50", 10),
      100
    );
    const search = sp.get("search") || "";
    const level = sp.get("level");
    const display = sp.get("display");
    const excluded = sp.get("excluded");
    const parentId = sp.get("parentId");
    const hasImage = sp.get("hasImage");

    const where: any = {};

    // Search — use AND-safe sub-conditions
    if (search) {
      where.OR = [
        { category_name: { contains: search } },
        { category_name_en: { contains: search } },
        { category_name_zh: { contains: search } },
        { slug: { contains: search } },
      ];
    }

    // Level
    if (level !== null && level !== "") {
      where.level = Number.parseInt(level, 10);
    }

    // Display
    if (display === "visible") {
      where.display = true;
    } else if (display === "hidden") {
      where.display = false;
    }

    // Parent
    if (parentId) {
      where.parent = Number.parseInt(parentId, 10);
    }

    // Has image — kept separate from search OR to avoid corrupting it
    if (hasImage === "yes") {
      where.AND = [
        ...(where.AND || []),
        { main_image: { not: null } },
        { main_image: { not: "" } },
      ];
    } else if (hasImage === "no") {
      where.AND = [
        ...(where.AND || []),
        { OR: [{ main_image: null }, { main_image: "" }] },
      ];
    }

    // Excluded categories — uses cached in-memory set (no recursive DB queries)
    if (excluded === "excluded" || excluded === "not_excluded") {
      const allExcluded = await getExcludedCategoryIds();
      if (excluded === "excluded") {
        where.id = { ...(where.id || {}), in: [...allExcluded] };
      } else {
        where.id = { ...(where.id || {}), notIn: [...allExcluded] };
      }
    }

    // Cursor
    if (cursor) {
      const cursorId = Number.parseInt(cursor, 10);
      if (!Number.isNaN(cursorId)) {
        where.id = { ...(where.id || {}), lt: cursorId };
      }
    }

    // Main query + count in parallel
    const countNeeded = !cursor;
    const countWhere: any = { ...where };
    // Strip cursor from count query
    if (countWhere.id?.lt) {
      const { lt: _lt, ...rest } = countWhere.id;
      countWhere.id = Object.keys(rest).length > 0 ? rest : undefined;
      if (!countWhere.id) delete countWhere.id;
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        take: pageSize + 1,
        orderBy: { id: "desc" },
        select: {
          id: true,
          category_name: true,
          category_name_en: true,
          category_name_zh: true,
          slug: true,
          parent: true,
          level: true,
          has_children: true,
          main_image: true,
          product_count: true,
          products_in_db: true,
          display: true,
          fully_synced: true,
          sync_enabled: true,
          source: true,
          order_number: true,
          tax_air: true,
          tax_sea: true,
          cbm_rate: true,
          shipping_surcharge_percent: true,
          air_shipping_rate: true,
          created_at: true,
          updated_at: true,
        },
      }),
      countNeeded
        ? prisma.category.count({ where: countWhere })
        : Promise.resolve(null),
    ]);

    const hasMore = categories.length > pageSize;
    const pageCategories = hasMore
      ? categories.slice(0, pageSize)
      : categories;
    const nextCursor =
      pageCategories.length > 0
        ? pageCategories[pageCategories.length - 1].id
        : null;

    // Resolve parent names + excluded status in parallel (batch queries)
    const parentIds = [
      ...new Set(
        pageCategories.map((c: any) => c.parent).filter((p: any) => p != null)
      ),
    ] as number[];

    const [parents, excludedRows] = await Promise.all([
      parentIds.length > 0
        ? prisma.category.findMany({
            where: { id: { in: parentIds } },
            select: { id: true, category_name: true, category_name_en: true },
          })
        : Promise.resolve([]),
      prisma.excluded_categories.findMany({
        where: { category_id: { in: pageCategories.map((c: any) => c.id) } },
        select: { category_id: true },
      }),
    ]);

    const parentMap = new Map(
      parents.map((p: any) => [p.id, p.category_name_en || p.category_name])
    );
    const excludedSet = new Set(excludedRows.map((e: any) => e.category_id));

    const formatted = pageCategories.map((c: any) => ({
      ...c,
      tax_air: c.tax_air ? Number(c.tax_air) : null,
      tax_sea: c.tax_sea ? Number(c.tax_sea) : null,
      cbm_rate: c.cbm_rate ? Number(c.cbm_rate) : null,
      shipping_surcharge_percent: c.shipping_surcharge_percent
        ? Number(c.shipping_surcharge_percent)
        : null,
      air_shipping_rate: c.air_shipping_rate
        ? Number(c.air_shipping_rate)
        : null,
      parent_name: c.parent ? parentMap.get(c.parent) || null : null,
      is_excluded: excludedSet.has(c.id),
    }));

    return NextResponse.json({
      categories: formatted,
      nextCursor,
      hasMore,
      ...(total !== null && { total }),
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
