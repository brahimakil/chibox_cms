/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://cms2.devback.website";

/**
 * POST /api/orders/[id]/refund — Process refund
 *
 * Body: { refund_type: "full"|"products_only"|"shipping_only", refund_amount?: number, refund_notes?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    const body = await req.json();

    const order = await prisma.orders.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === 6) {
      return NextResponse.json({ error: "Order is already refunded" }, { status: 400 });
    }

    const refundType = body.refund_type;
    if (!["full", "products_only", "shipping_only"].includes(refundType)) {
      return NextResponse.json({ error: "Invalid refund type" }, { status: 400 });
    }

    // Calculate refund amount if not manually provided
    let refundAmount = body.refund_amount;
    if (refundAmount === undefined || refundAmount === null) {
      const subtotal = order.subtotal || 0;
      const shipping = order.shipping_amount || 0;
      const tax = order.tax_amount || 0;

      switch (refundType) {
        case "full":
          refundAmount = subtotal + shipping + tax - (order.discount_amount || 0);
          break;
        case "products_only":
          refundAmount = subtotal - (order.discount_amount || 0);
          break;
        case "shipping_only":
          refundAmount = shipping + tax;
          break;
      }
    }

    // Update order
    await prisma.orders.update({
      where: { id: orderId },
      data: {
        status: 6,
        refund_type: refundType,
        refund_amount: refundAmount,
        refund_notes: body.refund_notes || null,
        refunded_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Tracking entry
    await prisma.order_tracking.create({
      data: {
        r_order_id: orderId,
        r_status_id: 6,
        track_date: new Date(),
      },
    });

    // Notification
    try {
      const user = await prisma.users.findUnique({
        where: { id: order.r_user_id },
        select: { mobile_token: true },
      });

      if (user?.mobile_token) {
        const pushRes = await fetch(`${BACKEND_URL}/v3_0_0-notification/send-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fcm_token: user.mobile_token,
            title: "💰 Refund Processed",
            body: `Refund of $${Number(refundAmount).toFixed(2)} has been processed for Order #${orderId}.`,
            data: {
              type: "order",
              notification_type: "order",
              order_id: String(orderId),
              target_id: String(orderId),
              click_action: "FLUTTER_NOTIFICATION_CLICK",
            },
          }),
        });
        if (!pushRes.ok) {
          const errText = await pushRes.text().catch(() => "");
          console.error(`FCM push failed [${pushRes.status}]:`, errText);
        }
      }

      await prisma.notifications.create({
        data: {
          r_user_id: order.r_user_id,
          notification_type: "order",
          subject: "💰 Refund Processed",
          body: JSON.stringify({
            message: `Refund of $${Number(refundAmount).toFixed(2)} has been processed for Order #${orderId}.`,
            order_id: orderId,
            refund_amount: refundAmount,
            refund_type: refundType,
          }),
          row_id: orderId,
          created_by: 1,
        },
      });
    } catch (notifErr) {
      console.warn("Refund notification failed (non-fatal):", notifErr);
    }

    return NextResponse.json({
      success: true,
      refund_type: refundType,
      refund_amount: refundAmount,
    });
  } catch (err) {
    console.error("POST /api/orders/[id]/refund error:", err);
    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
