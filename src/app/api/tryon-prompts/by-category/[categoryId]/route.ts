import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tryon-prompts/by-category/[categoryId]
 * Check if a specific category has a try-on prompt.
 * Also walks up the parent chain (like the mobile app does).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params;
    const catId = Number.parseInt(categoryId, 10);
    if (Number.isNaN(catId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Direct prompt for this category
    const directPrompt = await prisma.ai_tryon_prompts.findUnique({
      where: { category_id: catId },
    });

    if (directPrompt) {
      const category = await prisma.category.findUnique({
        where: { id: catId },
        select: { category_name: true, category_name_en: true },
      });
      return NextResponse.json({
        has_prompt: true,
        prompt: {
          ...directPrompt,
          category_name: category
            ? category.category_name_en || category.category_name
            : "Unknown",
        },
        inherited: false,
      });
    }

    // Walk up parent chain to find inherited prompt
    let currentId: number | null = catId;
    let depth = 0;
    while (currentId && depth < 10) {
      const cat = await prisma.category.findUnique({
        where: { id: currentId },
        select: { parent: true, category_name: true, category_name_en: true },
      });
      if (!cat || !cat.parent || cat.parent === 0) break;
      currentId = cat.parent;
      depth++;

      const inheritedPrompt = await prisma.ai_tryon_prompts.findUnique({
        where: { category_id: currentId },
      });
      if (inheritedPrompt) {
        const inheritedCat = await prisma.category.findUnique({
          where: { id: currentId },
          select: { category_name: true, category_name_en: true },
        });
        return NextResponse.json({
          has_prompt: true,
          prompt: {
            ...inheritedPrompt,
            category_name: inheritedCat
              ? inheritedCat.category_name_en || inheritedCat.category_name
              : "Unknown",
          },
          inherited: true,
          inherited_from_category_id: currentId,
          inherited_from_category_name: inheritedCat
            ? inheritedCat.category_name_en || inheritedCat.category_name
            : "Unknown",
        });
      }
    }

    return NextResponse.json({
      has_prompt: false,
      prompt: null,
      inherited: false,
    });
  } catch (error) {
    console.error("Error checking category prompt:", error);
    return NextResponse.json(
      { error: "Failed to check prompt" },
      { status: 500 }
    );
  }
}
