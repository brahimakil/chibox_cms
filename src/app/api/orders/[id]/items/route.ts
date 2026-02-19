/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deriveOrderStatusFromItems } from "@/lib/rbac";

/**
 * PUT /api/orders/[id]/items — Update individual order item
 *
 * Body: {
 *   item_id: number,                // order_product ID (required)
 *   workflow_status_key?: string,    // workflow status key (e.g. "processing", "ordered")
 *   tracking_number?: string,
 *   shipping_method?: "air" | "sea",
 *   shipping?: number,              // per-item shipping cost
 *   quantity?: number,
 * }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    const body = await req.json();
    const { item_id, workflow_status_key, tracking_number, shipping_method, shipping, quantity } = body;

    if (!item_id) {
      return NextResponse.json({ error: "item_id is required" }, { status: 400 });
    }

    // Verify item belongs to this order
    const item = await prisma.order_products.findFirst({
      where: { id: Number(item_id), r_order_id: orderId },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Order item not found or does not belong to this order" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    const updatedFields: string[] = [];

    // ── Workflow status update ───────────────────────────────────
    if (workflow_status_key !== undefined) {
      const workflowStatus = await prisma.cms_order_item_statuses.findFirst({
        where: { status_key: workflow_status_key },
      });
      if (!workflowStatus) {
        return NextResponse.json({ error: `Invalid workflow status key: ${workflow_status_key}` }, { status: 400 });
      }
      updateData.workflow_status_id = workflowStatus.id;
      updatedFields.push("workflow_status");

      // Also update the legacy status field for terminal states
      if (workflow_status_key === "cancelled") {
        updateData.status = 5;
      } else if (workflow_status_key === "refunded") {
        updateData.status = 6;
      }
    }

    if (tracking_number !== undefined) {
      updateData.tracking_number = tracking_number || null;
      updatedFields.push("tracking_number");
    }

    if (shipping_method !== undefined) {
      if (!["air", "sea"].includes(shipping_method)) {
        return NextResponse.json(
          { error: 'Invalid shipping method. Must be "air" or "sea"' },
          { status: 400 }
        );
      }
      updateData.shipping_method = shipping_method;
      updatedFields.push("shipping_method");
    }

    if (shipping !== undefined) {
      const shippingCost = Number(shipping);
      if (Number.isNaN(shippingCost) || shippingCost < 0) {
        return NextResponse.json({ error: "Invalid shipping cost" }, { status: 400 });
      }
      // Determine which column to write based on the item's shipping method
      const effectiveMethod = shipping_method || item.shipping_method || "air";
      if (effectiveMethod === "sea") {
        updateData.by_sea = shippingCost;
      } else {
        updateData.by_air = shippingCost;
      }
      updatedFields.push("shipping");
    }

    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
      }
      updateData.quantity = qty;
      updatedFields.push("quantity");
    }

    if (updatedFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update. Send at least one of: status, tracking_number, shipping_method, shipping, quantity" },
        { status: 400 }
      );
    }

    // Update the item
    const updatedItem = await prisma.order_products.update({
      where: { id: Number(item_id) },
      data: updateData,
    });

    // ── Auto-derive order status from items (shared logic) ──
    let orderStatusUpdated = false;
    if (updatedFields.includes("workflow_status")) {
      const result = await deriveOrderStatusFromItems(orderId);
      orderStatusUpdated = result !== null;
    }

    // ── Recalc order shipping_amount from items (excluding cancelled) ─────
    // Also recalc when workflow status changes (item may have been cancelled/uncancelled)
    if (updatedFields.includes("shipping") || updatedFields.includes("quantity") || updatedFields.includes("shipping_method") || updatedFields.includes("workflow_status")) {
      // Get cancelled status ID to exclude
      const cancelledWs = await prisma.cms_order_item_statuses.findFirst({
        where: { status_key: "cancelled" },
      });
      const cancelledWsId = cancelledWs?.id ?? -1;

      const allItems = await prisma.order_products.findMany({
        where: {
          r_order_id: orderId,
          OR: [
            { workflow_status_id: null },
            { NOT: { workflow_status_id: cancelledWsId } },
          ],
        },
        select: { by_air: true, by_sea: true, shipping_method: true },
      });
      const totalShipping = allItems.reduce((sum, i) => {
        const cost = i.shipping_method === "sea" ? (i.by_sea ?? 0) : (i.by_air ?? 0);
        return sum + cost;
      }, 0);
      const currentOrder = await prisma.orders.findUnique({ where: { id: orderId } });
      if (currentOrder) {
        const newTotal =
          (currentOrder.subtotal ?? 0) + totalShipping + (currentOrder.tax_amount ?? 0) - (currentOrder.discount_amount ?? 0);
        await prisma.orders.update({
          where: { id: orderId },
          data: { shipping_amount: totalShipping, total: newTotal, updated_at: new Date() },
        });
      }
    }

    // ── Auto-update order shipping_method to 'both' if mixed ────
    if (updatedFields.includes("shipping_method")) {
      const allItems = await prisma.order_products.findMany({
        where: { r_order_id: orderId },
        select: { shipping_method: true, workflow_status_id: true },
      });

      // Fetch statuses to filter out cancelled
      const cancelledStatus = await prisma.cms_order_item_statuses.findFirst({
        where: { status_key: "cancelled" },
      });
      const cancelledId = cancelledStatus?.id ?? -1;

      const activeItems = allItems.filter((i) => i.workflow_status_id !== cancelledId);
      const methods = new Set(activeItems.map((i) => i.shipping_method).filter(Boolean));
      let orderMethod: "air" | "sea" | "both" = "air";
      if (methods.has("air") && methods.has("sea")) {
        orderMethod = "both";
      } else if (methods.has("sea")) {
        orderMethod = "sea";
      } else {
        orderMethod = "air";
      }
      await prisma.orders.update({
        where: { id: orderId },
        data: { shipping_method: orderMethod, updated_at: new Date() },
      });
    }

    // Fetch fresh order data for response
    const freshOrder = await prisma.orders.findUnique({ where: { id: orderId } });

    // Get workflow status label for the updated item
    let workflowLabel = "Unknown";
    if (updatedItem.workflow_status_id) {
      const ws = await prisma.cms_order_item_statuses.findUnique({
        where: { id: updatedItem.workflow_status_id },
      });
      if (ws) workflowLabel = ws.status_label;
    }

    return NextResponse.json({
      success: true,
      item: {
        id: updatedItem.id,
        workflow_status_id: updatedItem.workflow_status_id,
        workflow_status_label: workflowLabel,
        tracking_number: updatedItem.tracking_number,
        shipping_method: updatedItem.shipping_method,
        by_air: updatedItem.by_air,
        by_sea: updatedItem.by_sea,
        quantity: updatedItem.quantity,
      },
      updated_fields: updatedFields,
      order_status_updated: orderStatusUpdated,
      order_shipping_amount: freshOrder?.shipping_amount,
      order_shipping_method: freshOrder?.shipping_method,
      order_total: freshOrder?.total,
    });
  } catch (err) {
    console.error("PUT /api/orders/[id]/items error:", err);
    return NextResponse.json(
      { error: "Failed to update order item" },
      { status: 500 }
    );
  }
}
