/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasPermission, getAllowedTransitions, deriveOrderStatusFromItems } from "@/lib/rbac";

/**
 * GET /api/orders/items/[itemId]/workflow — Get allowed transitions for this item
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { itemId } = await params;
    const item = await prisma.order_products.findUnique({
      where: { id: Number(itemId) },
      select: { id: true, workflow_status_id: true, product_name: true, tracking_number: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (!item.workflow_status_id) {
      return NextResponse.json({ error: "Item has no workflow status assigned" }, { status: 400 });
    }

    const transitions = await getAllowedTransitions(session.roleKey, item.workflow_status_id);

    return NextResponse.json({
      item_id: item.id,
      product_name: item.product_name,
      tracking_number: item.tracking_number,
      allowed_transitions: transitions,
    });
  } catch (err) {
    console.error("GET /api/orders/items/[itemId]/workflow error:", err);
    return NextResponse.json({ error: "Failed to get transitions" }, { status: 500 });
  }
}

/**
 * PUT /api/orders/items/[itemId]/workflow — Change workflow status of an item
 *
 * Body: {
 *   to_status_key: string,        // e.g. "ordered", "cancelled"
 *   tracking_number?: string,     // required if transition requires it
 *   note?: string,                // optional note for audit trail
 * }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!hasPermission(session.permissions, "action.orders.item.status.change")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { itemId } = await params;
    const body = await req.json();
    const { to_status_key, tracking_number, note } = body;

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

    const item = await prisma.order_products.findUnique({
      where: { id: Number(itemId) },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (!item.workflow_status_id) {
      return NextResponse.json({ error: "Item has no workflow status assigned" }, { status: 400 });
    }

    // Verify the transition is allowed for this role
    const transitions = await getAllowedTransitions(session.roleKey, item.workflow_status_id);
    const target = transitions.find((t) => t.toStatusKey === to_status_key);

    if (!target) {
      return NextResponse.json(
        { error: `Transition to '${to_status_key}' is not allowed for your role from the current status` },
        { status: 403 }
      );
    }

    // Check tracking number requirement
    if (target.requiresTracking && !tracking_number && !item.tracking_number) {
      return NextResponse.json(
        { error: "Tracking number is required for this transition" },
        { status: 400 }
      );
    }

    // Build update
    const updateData: any = {
      workflow_status_id: target.toStatusId,
      workflow_status_updated_at: new Date(),
      workflow_status_updated_by: session.userId,
    };

    if (tracking_number !== undefined) {
      updateData.tracking_number = tracking_number || null;
    }

    // Also update the legacy status field for cancelled/refunded
    if (to_status_key === "cancelled") {
      updateData.status = 5;
    } else if (to_status_key === "refunded") {
      updateData.status = 6;
    }

    // Execute update
    const updatedItem = await prisma.order_products.update({
      where: { id: Number(itemId) },
      data: updateData,
    });

    // Write audit trail
    await prisma.order_product_status_history.create({
      data: {
        order_product_id: item.id,
        order_id: item.r_order_id,
        from_status_id: item.workflow_status_id,
        to_status_id: target.toStatusId,
        changed_by_user_id: session.userId,
        tracking_number_snapshot: updatedItem.tracking_number || null,
        note: note || null,
        changed_at: new Date(),
      },
    });

    // Auto-derive order status (handles all-cancelled/all-refunded)
    const orderStatusUpdate = await deriveOrderStatusFromItems(item.r_order_id);

    // Get the new status label for response
    const newStatus = await prisma.cms_order_item_statuses.findUnique({
      where: { id: target.toStatusId },
    });

    return NextResponse.json({
      success: true,
      item: {
        id: updatedItem.id,
        order_id: updatedItem.r_order_id,
        workflow_status_key: newStatus?.status_key,
        workflow_status_label: newStatus?.status_label,
        is_terminal: newStatus?.is_terminal === 1,
        tracking_number: updatedItem.tracking_number,
      },
      order_status_changed: orderStatusUpdate !== null,
      order_new_status: orderStatusUpdate,
    });
  } catch (err) {
    console.error("PUT /api/orders/items/[itemId]/workflow error:", err);
    return NextResponse.json({ error: "Failed to update workflow status" }, { status: 500 });
  }
}
