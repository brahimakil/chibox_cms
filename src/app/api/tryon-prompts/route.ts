/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tryon-prompts — List all prompts with category info
 * Query params: search, is_active, page, pageSize
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const search = sp.get("search") || "";
    const isActive = sp.get("is_active");
    const page = Math.max(1, Number.parseInt(sp.get("page") || "1", 10));
    const pageSize = Math.min(
      Number.parseInt(sp.get("pageSize") || "50", 10),
      100
    );

    // Get all prompts
    const where: any = {};
    if (isActive === "true") where.is_active = true;
    else if (isActive === "false") where.is_active = false;

    // If searching, first find matching category IDs
    let categoryFilter: number[] | null = null;
    if (search) {
      const matchingCategories = await prisma.category.findMany({
        where: {
          OR: [
            { category_name: { contains: search } },
            { category_name_en: { contains: search } },
            { slug: { contains: search } },
            ...(isNaN(Number(search)) ? [] : [{ id: Number(search) }]),
          ],
        },
        select: { id: true },
        take: 500,
      });
      categoryFilter = matchingCategories.map((c) => c.id);
      if (categoryFilter.length === 0) {
        return NextResponse.json({
          prompts: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        });
      }
      where.category_id = { in: categoryFilter };
    }

    const [prompts, total] = await Promise.all([
      prisma.ai_tryon_prompts.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ai_tryon_prompts.count({ where }),
    ]);

    // Fetch category details for all prompts
    const categoryIds = prompts.map((p) => p.category_id);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: {
        id: true,
        category_name: true,
        category_name_en: true,
        slug: true,
        level: true,
        parent: true,
      },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

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

    const formatted = prompts.map((p) => {
      const cat = categoryMap.get(p.category_id);
      return {
        id: p.id,
        category_id: p.category_id,
        category_name: cat
          ? cat.category_name_en || cat.category_name
          : "Unknown",
        category_slug: cat?.slug || null,
        category_level: cat?.level ?? null,
        parent_name: cat?.parent ? parentMap.get(cat.parent) || null : null,
        prompt_template: p.prompt_template,
        is_active: p.is_active,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });

    return NextResponse.json({
      prompts: formatted,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching tryon prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tryon-prompts — Create a new prompt
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category_id, prompt_template, is_active } = body;

    if (!category_id || !prompt_template) {
      return NextResponse.json(
        { error: "category_id and prompt_template are required" },
        { status: 400 }
      );
    }

    // Check category exists
    const category = await prisma.category.findUnique({
      where: { id: Number(category_id) },
      select: { id: true, category_name: true, category_name_en: true },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check for duplicate
    const existing = await prisma.ai_tryon_prompts.findUnique({
      where: { category_id: Number(category_id) },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A prompt already exists for this category. Use edit instead." },
        { status: 409 }
      );
    }

    const prompt = await prisma.ai_tryon_prompts.create({
      data: {
        category_id: Number(category_id),
        prompt_template: prompt_template.trim(),
        is_active: is_active !== false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    console.error("Error creating tryon prompt:", error);
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}
