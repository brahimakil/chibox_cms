/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VALID_STATUS_TRANSITIONS, ORDER_STATUS } from "@/lib/order-constants";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://cms2.devback.website";

/**
 * PUT /api/orders/[id]/status — Update order status
 *
 * Body: { status: number }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    const body = await req.json();
    const newStatus = Number(body.status);

    if (!ORDER_STATUS[newStatus]) {
      return NextResponse.json({ error: "Invalid status code" }, { status: 400 });
    }

    // Get current order
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, r_user_id: true, shipping_status: true, is_paid: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate transition
    const allowed = VALID_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${ORDER_STATUS[order.status]?.label} to ${ORDER_STATUS[newStatus]?.label}`,
        },
        { status: 400 }
      );
    }

    // Update status
    await prisma.orders.update({
      where: { id: orderId },
      data: { status: newStatus, updated_at: new Date() },
    });

    // Create tracking entry
    await prisma.order_tracking.create({
      data: {
        r_order_id: orderId,
        r_status_id: newStatus,
        track_date: new Date(),
      },
    });

    // Send notification via PHP backend
    try {
      const statusLabel = ORDER_STATUS[newStatus]?.label || "Updated";
      const user = await prisma.users.findUnique({
        where: { id: order.r_user_id },
        select: { mobile_token: true },
      });

      if (user?.mobile_token) {
        await fetch(`${BACKEND_URL}/v3_0_0-notification/send-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: user.mobile_token,
            title: `Order #${orderId} ${statusLabel}`,
            body: `Your order has been ${statusLabel.toLowerCase()}.`,
            data: {
              type: "order",
              order_id: String(orderId),
            },
          }),
        });
      }

      // Create notification record
      await prisma.notifications.create({
        data: {
          r_user_id: order.r_user_id,
          notification_type: "order",
          subject: `Order #${orderId} ${statusLabel}`,
          body: JSON.stringify({
            message: `Your order has been ${statusLabel.toLowerCase()}.`,
            order_id: orderId,
            status: newStatus,
          }),
          row_id: orderId,
          created_by: 1,
        },
      });
    } catch (notifErr) {
      console.warn("Notification send failed (non-fatal):", notifErr);
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error("PUT /api/orders/[id]/status error:", err);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
