/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasPermission, getAllowedTransitions, deriveOrderStatusFromItems } from "@/lib/rbac";

/**
 * PUT /api/orders/items/bulk-workflow — Bulk-update workflow status for multiple items
 *
 * Body: {
 *   item_ids: number[],           // up to 200 items per request
 *   to_status_key: string,        // target workflow status key
 * }
 *
 * Production considerations:
 *  - Max 200 items per batch (client should chunk larger sets)
 *  - Uses a single transaction for atomicity
 *  - Validates transitions per-item to avoid partial invalid updates
 *  - Batches audit-trail inserts
 *  - Derives order status once per affected order (deduped)
 */

const MAX_BATCH_SIZE = 200;

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!hasPermission(session.permissions, "action.orders.item.status.change")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { item_ids, to_status_key } = body;

    // ── Validation ─────────────────────────────────────────────
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return NextResponse.json({ error: "item_ids must be a non-empty array" }, { status: 400 });
    }
    if (item_ids.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} items per batch` },
        { status: 400 }
      );
    }
    if (!to_status_key) {
      return NextResponse.json({ error: "to_status_key is required" }, { status: 400 });
    }

    // Check terminal-specific permissions
    if (to_status_key === "cancelled" && !hasPermission(session.permissions, "action.orders.item.cancel")) {
      return NextResponse.json({ error: "You do not have permission to cancel items" }, { status: 403 });
    }
    if (to_status_key === "refunded" && !hasPermission(session.permissions, "action.orders.item.refund")) {
      return NextResponse.json({ error: "You do not have permission to refund items" }, { status: 403 });
    }

    // ── Fetch target status ────────────────────────────────────
    const targetStatus = await prisma.cms_order_item_statuses.findFirst({
      where: { status_key: to_status_key, is_active: 1 },
    });
    if (!targetStatus) {
      return NextResponse.json({ error: `Unknown status: ${to_status_key}` }, { status: 400 });
    }

    // ── Fetch all items ────────────────────────────────────────
    const uniqueIds = [...new Set(item_ids.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
    const items = await prisma.order_products.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        r_order_id: true,
        workflow_status_id: true,
        tracking_number: true,
      },
    });

    if (items.length === 0) {
      return NextResponse.json({ error: "No valid items found" }, { status: 404 });
    }

    // ── Validate transitions per-item ──────────────────────────
    // Group items by current status to batch transition checks
    const byStatus = new Map<number, typeof items>();
    for (const item of items) {
      if (!item.workflow_status_id) continue;
      const arr = byStatus.get(item.workflow_status_id) || [];
      arr.push(item);
      byStatus.set(item.workflow_status_id, arr);
    }

    // Check each unique current-status → target transition is allowed
    const validItemIds: number[] = [];
    const skippedItems: { id: number; reason: string }[] = [];
    const now = new Date();

    for (const [fromStatusId, statusItems] of byStatus) {
      const transitions = await getAllowedTransitions(session.roleKey, fromStatusId);
      const allowed = transitions.find((t) => t.toStatusKey === to_status_key);

      if (!allowed) {
        for (const item of statusItems) {
          skippedItems.push({
            id: item.id,
            reason: `Transition not allowed from current status`,
          });
        }
        continue;
      }

      validItemIds.push(...statusItems.map((i) => i.id));
    }

    if (validItemIds.length === 0) {
      return NextResponse.json(
        {
          error: "No items could be transitioned",
          skipped: skippedItems,
        },
        { status: 400 }
      );
    }

    // ── Execute in a single transaction ────────────────────────
    const updateData: any = {
      workflow_status_id: targetStatus.id,
      workflow_status_updated_at: now,
      workflow_status_updated_by: session.userId,
    };

    // Legacy status mapping for terminal states
    if (to_status_key === "cancelled") updateData.status = 5;
    else if (to_status_key === "refunded") updateData.status = 6;

    // Build audit history rows for valid items
    const validItems = items.filter((i) => validItemIds.includes(i.id));
    const historyRows = validItems.map((item) => ({
      order_product_id: item.id,
      order_id: item.r_order_id,
      from_status_id: item.workflow_status_id!,
      to_status_id: targetStatus.id,
      changed_by_user_id: session.userId,
      tracking_number_snapshot: item.tracking_number || null,
      note: "Bulk status change",
      changed_at: now,
    }));

    await prisma.$transaction([
      // Batch update all valid items at once
      prisma.order_products.updateMany({
        where: { id: { in: validItemIds } },
        data: updateData,
      }),
      // Batch insert audit trail
      prisma.order_product_status_history.createMany({
        data: historyRows,
      }),
    ]);

    // ── Derive order status for each affected order ────────────
    const affectedOrderIds = [...new Set(validItems.map((i) => i.r_order_id))];
    const orderStatusChanges: Record<number, any> = {};
    for (const orderId of affectedOrderIds) {
      const result = await deriveOrderStatusFromItems(orderId);
      if (result !== null) {
        orderStatusChanges[orderId] = result;
      }
    }

    return NextResponse.json({
      success: true,
      updated_count: validItemIds.length,
      skipped: skippedItems,
      skipped_count: skippedItems.length,
      target_status: {
        key: targetStatus.status_key,
        label: targetStatus.status_label,
      },
      order_status_changes: orderStatusChanges,
    });
  } catch (err) {
    console.error("PUT /api/orders/items/bulk-workflow error:", err);
    return NextResponse.json(
      { error: "Failed to perform bulk status update" },
      { status: 500 }
    );
  }
}
