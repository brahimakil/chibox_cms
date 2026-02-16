/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tryon-prompts/search-categories?q=shoes
 * Fast category search for the add-prompt form.
 * Returns categories with whether they already have a prompt.
 */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q") || "";
    if (q.length < 1) {
      return NextResponse.json({ categories: [] });
    }

    const isNumeric = !isNaN(Number(q));

    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { category_name: { contains: q } },
          { category_name_en: { contains: q } },
          { slug: { contains: q } },
          ...(isNumeric ? [{ id: Number(q) }] : []),
        ],
      },
      select: {
        id: true,
        category_name: true,
        category_name_en: true,
        slug: true,
        level: true,
        parent: true,
        product_count: true,
        main_image: true,
      },
      orderBy: [{ level: "asc" }, { product_count: "desc" }],
      take: 20,
    });

    // Check which ones already have prompts
    const categoryIds = categories.map((c) => c.id);
    const existingPrompts = await prisma.ai_tryon_prompts.findMany({
      where: { category_id: { in: categoryIds } },
      select: { category_id: true, id: true },
    });
    const promptMap = new Map(
      existingPrompts.map((p) => [p.category_id, p.id])
    );

    // Resolve parent names
    const parentIds = [
      ...new Set(
        categories.map((c) => c.parent).filter((p): p is number => p != null)
      ),
    ];
    const parents =
      parentIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: parentIds } },
            select: { id: true, category_name: true, category_name_en: true },
          })
        : [];
    const parentMap = new Map(
      parents.map((p) => [p.id, p.category_name_en || p.category_name])
    );

    const formatted = categories.map((c) => ({
      id: c.id,
      category_name: c.category_name_en || c.category_name,
      category_name_original: c.category_name,
      slug: c.slug,
      level: c.level,
      parent_name: c.parent ? parentMap.get(c.parent) || null : null,
      product_count: c.product_count,
      has_prompt: promptMap.has(c.id),
      prompt_id: promptMap.get(c.id) || null,
    }));

    return NextResponse.json({ categories: formatted });
  } catch (error) {
    console.error("Error searching categories for tryon:", error);
    return NextResponse.json(
      { error: "Failed to search categories" },
      { status: 500 }
    );
  }
}
