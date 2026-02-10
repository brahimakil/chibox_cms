/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * In-memory cache for the tree endpoint.
 * The remote DB has ~2-3s latency per simple query and ~20-30s for the full
 * tree (9,700+ rows). We cache the formatted result with a 5-minute TTL
 * and expose an invalidation hook for the reorder endpoint.
 */
let cachedResult: { categories: any[]; total: number } | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let buildingPromise: Promise<{ categories: any[]; total: number }> | null =
  null;

/** Called by the reorder route to invalidate the cache after a mutation. */
export function invalidateTreeCache() {
  cachedResult = null;
  cacheTimestamp = 0;
}

/**
 * GET /api/categories/tree
 * Returns ALL categories with only the fields the tree + filter dropdown need.
 * Uses server-side in-memory cache to avoid the ~20-30s remote-DB round-trip.
 */
export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if fresh
    if (cachedResult && now - cacheTimestamp < CACHE_TTL_MS) {
      return NextResponse.json(cachedResult);
    }

    // Deduplicate concurrent requests — only one build at a time
    buildingPromise ??= buildTreeData().finally(() => {
      buildingPromise = null;
    });
    const result = await buildingPromise;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching category tree:", error);
    return NextResponse.json(
      { error: "Failed to fetch category tree" },
      { status: 500 }
    );
  }
}

async function buildTreeData() {
  // Use raw SQL — Prisma ORM adds ~8-10s overhead on 9,700 rows over a remote DB
  const [categories, excludedRows] = await Promise.all([
    prisma.$queryRawUnsafe(`
      SELECT id, category_name, category_name_en, parent, level,
             has_children, main_image, product_count, display, order_number
      FROM category
      ORDER BY order_number ASC
    `) as Promise<any[]>,
    prisma.$queryRawUnsafe(
      `SELECT category_id FROM excluded_categories`
    ) as Promise<any[]>,
  ]);

  // Normalize raw BigInt/Buffer values from mysql2
  const cats = categories.map((c: any) => ({
    id: Number(c.id),
    category_name: c.category_name,
    category_name_en: c.category_name_en || null,
    parent: c.parent == null ? null : Number(c.parent),
    level: c.level == null ? null : Number(c.level),
    has_children: c.has_children == null ? null : Boolean(c.has_children),
    main_image: c.main_image || null,
    product_count: Number(c.product_count ?? 0),
    display: Boolean(c.display),
    order_number: c.order_number == null ? null : Number(c.order_number),
  }));

  // Build parent→children map for excluded expansion (all in-memory)
  const childrenMap = new Map<number, number[]>();
  for (const c of cats) {
    if (c.parent != null) {
      const siblings = childrenMap.get(c.parent) || [];
      siblings.push(c.id);
      childrenMap.set(c.parent, siblings);
    }
  }

  const excludedIds = new Set(
    excludedRows.map((e: any) => Number(e.category_id))
  );
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

  const formatted = cats.map((c: any) => ({
    ...c,
    is_excluded: excludedIds.has(c.id),
  }));

  const result = { categories: formatted, total: formatted.length };

  // Store in cache
  cachedResult = result;
  cacheTimestamp = Date.now();

  return result;
}
