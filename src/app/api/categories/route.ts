import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── In-memory cache for categories (rarely change) ──
let cachedResponse: { categories: any[]; excludedCategoryIds: number[] } | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 300_000; // 5 minutes

export async function GET() {
  try {
    // Return cached response if fresh
    if (cachedResponse && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json(cachedResponse);
    }

    const [categories, excludedRows] = await Promise.all([
      prisma.category.findMany({
        where: { display: true },
        select: {
          id: true,
          category_name: true,
          category_name_en: true,
          parent: true,
          level: true,
        },
        orderBy: [{ level: "asc" }, { category_name: "asc" }],
      }),
      // Get directly excluded category IDs
      prisma.excluded_categories.findMany({
        select: { category_id: true },
      }),
    ]);

    // Resolve full excluded set (including children)
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const childrenMap = new Map<number, number[]>();
    for (const c of categories) {
      if (c.parent != null) {
        const siblings = childrenMap.get(c.parent) || [];
        siblings.push(c.id);
        childrenMap.set(c.parent, siblings);
      }
    }

    const excludedIds = new Set(excludedRows.map((e) => e.category_id));
    // Recursively add children of excluded categories
    const frontier = [...excludedIds];
    while (frontier.length > 0) {
      const parentId = frontier.pop()!;
      const children = childrenMap.get(parentId) || [];
      for (const childId of children) {
        if (!excludedIds.has(childId)) {
          excludedIds.add(childId);
          frontier.push(childId);
        }
      }
    }

    const result = {
      categories,
      excludedCategoryIds: [...excludedIds],
    };

    // Cache the result
    cachedResponse = result;
    cacheTimestamp = Date.now();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
