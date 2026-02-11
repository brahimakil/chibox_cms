/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS } from "@/lib/order-constants";

/**
 * PUT /api/orders/[id]/items — Update individual order item
 *
 * Body: {
 *   item_id: number,          // order_product ID (required)
 *   status?: number,          // new status for this item
 *   tracking_number?: string,
 *   shipping_method?: "air" | "sea",
 *   shipping?: number,        // per-item shipping cost
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
    const { item_id, status, tracking_number, shipping_method, shipping, quantity } = body;

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

    if (status !== undefined) {
      const newStatus = Number(status);
      if (!ORDER_STATUS[newStatus]) {
        return NextResponse.json({ error: "Invalid status code" }, { status: 400 });
      }
      updateData.status = newStatus;
      updatedFields.push("status");
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
      updateData.shipping = shippingCost;
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

    // ── Auto-cascade status ──────────────────────────────────────
    let orderStatusUpdated = false;
    if (updatedFields.includes("status")) {
      const newStatus = updateData.status;
      const allItems = await prisma.order_products.findMany({
        where: { r_order_id: orderId, status: { not: 5 } },
        select: { status: true },
      });
      const allSameStatus = allItems.length > 0 && allItems.every((i) => i.status === newStatus);
      if (allSameStatus) {
        const order = await prisma.orders.findUnique({
          where: { id: orderId },
          select: { status: true },
        });
        if (order && order.status !== newStatus) {
          await prisma.orders.update({
            where: { id: orderId },
            data: { status: newStatus, updated_at: new Date() },
          });
          await prisma.order_tracking.create({
            data: { r_order_id: orderId, r_status_id: newStatus, track_date: new Date() },
          });
          orderStatusUpdated = true;
        }
      }
    }

    // ── Recalc order shipping_amount from items ──────────────────
    if (updatedFields.includes("shipping") || updatedFields.includes("quantity")) {
      const allItems = await prisma.order_products.findMany({
        where: { r_order_id: orderId },
        select: { shipping: true },
      });
      const totalShipping = allItems.reduce((sum, i) => sum + (i.shipping ?? 0), 0);
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
        where: { r_order_id: orderId, status: { not: 5 } },
        select: { shipping_method: true },
      });
      const methods = new Set(allItems.map((i) => i.shipping_method).filter(Boolean));
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

    return NextResponse.json({
      success: true,
      item: {
        id: updatedItem.id,
        status: updatedItem.status,
        status_label: ORDER_STATUS[updatedItem.status ?? 9]?.label || "Unknown",
        tracking_number: updatedItem.tracking_number,
        shipping_method: updatedItem.shipping_method,
        shipping: updatedItem.shipping,
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
