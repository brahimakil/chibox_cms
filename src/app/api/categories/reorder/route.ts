/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateTreeCache } from "@/app/api/categories/tree/route";

/**
 * POST /api/categories/reorder
 * Body: { categoryId: number, newParentId: number | null, newOrder: number }
 *
 * Two modes:
 *  1. Same-parent reorder — fast path: just shift siblings + update order_number
 *  2. Reparent — full path: circular-ref check, level updates, has_children updates
 */
export async function POST(request: NextRequest) {
  try {
    const { categoryId, newParentId, newOrder } = await request.json();

    if (!categoryId) {
      return NextResponse.json(
        { error: "categoryId is required" },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { parent: true, level: true },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const normParent = (p: number | null | undefined) =>
      p === 0 || p == null ? null : p;

    const oldParent = normParent(category.parent);
    const newParent = normParent(newParentId);
    const order = newOrder ?? 0;

    if (oldParent === newParent) {
      // ── FAST PATH: same-parent sibling reorder ──
      // No circular-ref, level, or has_children changes needed.
      // 1. Shift siblings to make room
      if (oldParent == null) {
        // Root categories (parent IS NULL or 0)
        await prisma.$executeRawUnsafe(
          `UPDATE category
           SET order_number = order_number + 1
           WHERE (parent IS NULL OR parent = 0)
             AND id != ?
             AND order_number >= ?`,
          categoryId,
          order
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE category
           SET order_number = order_number + 1
           WHERE parent = ?
             AND id != ?
             AND order_number >= ?`,
          oldParent,
          categoryId,
          order
        );
      }
      // 2. Set the moved category's order
      await prisma.$executeRawUnsafe(
        `UPDATE category SET order_number = ?, updated_at = NOW() WHERE id = ?`,
        order,
        categoryId
      );
    } else {
      // ── FULL PATH: reparent ──
      // Circular reference check
      if (newParent != null) {
        const descendants = await getDescendantIds(categoryId);
        if (descendants.includes(newParent)) {
          return NextResponse.json(
            { error: "Cannot move a category under its own descendant" },
            { status: 400 }
          );
        }
      }

      const newLevel =
        newParent == null ? 0 : (await getParentLevel(newParent)) + 1;

      // Shift siblings at destination
      if (newParent == null) {
        await prisma.$executeRawUnsafe(
          `UPDATE category
           SET order_number = order_number + 1
           WHERE (parent IS NULL OR parent = 0)
             AND id != ?
             AND order_number >= ?`,
          categoryId,
          order
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE category
           SET order_number = order_number + 1
           WHERE parent = ?
             AND id != ?
             AND order_number >= ?`,
          newParent,
          categoryId,
          order
        );
      }

      // Move the category
      await prisma.category.update({
        where: { id: categoryId },
        data: {
          parent: newParentId,
          level: newLevel,
          order_number: order,
          updated_at: new Date(),
        },
      });

      // Update descendant levels
      await updateDescendantLevels(categoryId, newLevel);

      // Update has_children flags
      if (oldParent != null) {
        const oldCount = await prisma.category.count({
          where: { parent: oldParent },
        });
        await prisma.category.update({
          where: { id: oldParent },
          data: { has_children: oldCount > 0 },
        });
      }
      if (newParent != null) {
        await prisma.category.update({
          where: { id: newParent },
          data: { has_children: true },
        });
      }
    }

    // Invalidate in-memory tree cache so next GET returns fresh data
    invalidateTreeCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering category:", error);
    return NextResponse.json(
      { error: "Failed to reorder category" },
      { status: 500 }
    );
  }
}

async function getParentLevel(parentId: number): Promise<number> {
  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { level: true },
  });
  return parent?.level ?? 0;
}

async function getDescendantIds(categoryId: number): Promise<number[]> {
  const result: number[] = [];
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

async function updateDescendantLevels(
  parentId: number,
  parentLevel: number
): Promise<void> {
  // Batch update: find all direct children and update in one go
  const children = await prisma.category.findMany({
    where: { parent: parentId },
    select: { id: true },
  });
  if (children.length === 0) return;

  const childLevel = parentLevel + 1;
  const childIds = children.map((c: any) => c.id);

  await prisma.category.updateMany({
    where: { id: { in: childIds } },
    data: { level: childLevel },
  });

  // Recurse for each child's subtree
  for (const childId of childIds) {
    await updateDescendantLevels(childId, childLevel);
  }
}
