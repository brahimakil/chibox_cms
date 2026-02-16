/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tryon-prompts/[id] — Get a single prompt with category details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const promptId = Number.parseInt(id, 10);
    if (Number.isNaN(promptId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const prompt = await prisma.ai_tryon_prompts.findUnique({
      where: { id: promptId },
    });
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt not found" },
        { status: 404 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: prompt.category_id },
      select: {
        id: true,
        category_name: true,
        category_name_en: true,
        slug: true,
        level: true,
        parent: true,
      },
    });

    return NextResponse.json({
      prompt: {
        ...prompt,
        category_name: category
          ? category.category_name_en || category.category_name
          : "Unknown",
        category_slug: category?.slug || null,
        category_level: category?.level ?? null,
      },
    });
  } catch (error) {
    console.error("Error fetching tryon prompt:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompt" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tryon-prompts/[id] — Update a prompt
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const promptId = Number.parseInt(id, 10);
    if (Number.isNaN(promptId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const data: any = {};

    if ("prompt_template" in body) {
      data.prompt_template = body.prompt_template.trim();
    }
    if ("is_active" in body) {
      data.is_active = Boolean(body.is_active);
    }
    if ("category_id" in body) {
      // Verify new category exists
      const cat = await prisma.category.findUnique({
        where: { id: Number(body.category_id) },
      });
      if (!cat) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }
      // Check no duplicate
      const existing = await prisma.ai_tryon_prompts.findFirst({
        where: {
          category_id: Number(body.category_id),
          id: { not: promptId },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Another prompt already exists for this category" },
          { status: 409 }
        );
      }
      data.category_id = Number(body.category_id);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    data.updated_at = new Date();

    const updated = await prisma.ai_tryon_prompts.update({
      where: { id: promptId },
      data,
    });

    return NextResponse.json({ prompt: updated });
  } catch (error) {
    console.error("Error updating tryon prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tryon-prompts/[id] — Delete a prompt
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const promptId = Number.parseInt(id, 10);
    if (Number.isNaN(promptId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await prisma.ai_tryon_prompts.delete({ where: { id: promptId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tryon prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}
