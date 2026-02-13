/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://cms2.devback.website";

/**
 * PUT /api/orders/[id]/status — Bulk-update all non-terminal order items to a new workflow status
 *
 * Body: { workflow_status_key: string }   e.g. "ordered", "shipped_to_wh", etc.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    const body = await req.json();
    const { workflow_status_key } = body;

    if (!workflow_status_key) {
      return NextResponse.json({ error: "workflow_status_key is required" }, { status: 400 });
    }

    // Look up the workflow status
    const newStatus = await prisma.cms_order_item_statuses.findFirst({
      where: { status_key: workflow_status_key },
    });

    if (!newStatus) {
      return NextResponse.json({ error: `Invalid workflow status key: ${workflow_status_key}` }, { status: 400 });
    }

    // Get current order
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      select: { id: true, r_user_id: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Find terminal statuses (cancelled, refunded) to exclude
    const terminalStatuses = await prisma.cms_order_item_statuses.findMany({
      where: { is_terminal: true },
    });
    const terminalIds = terminalStatuses.map((s) => s.id);

    // Update all non-terminal items to the new workflow status
    const updateResult = await prisma.order_products.updateMany({
      where: {
        r_order_id: orderId,
        ...(terminalIds.length > 0
          ? { workflow_status_id: { notIn: terminalIds } }
          : {}),
      },
      data: { workflow_status_id: newStatus.id },
    });

    // Create tracking entry
    await prisma.order_tracking.create({
      data: {
        r_order_id: orderId,
        r_status_id: newStatus.status_order,
        track_date: new Date(),
      },
    });

    // Update order timestamp
    await prisma.orders.update({
      where: { id: orderId },
      data: { updated_at: new Date() },
    });

    // Send notification via PHP backend
    try {
      const statusLabel = newStatus.status_label;
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
            title: `Order #${orderId} ${statusLabel}`,
            body: `Your order has been ${statusLabel.toLowerCase()}.`,
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

      // Create notification record
      await prisma.notifications.create({
        data: {
          r_user_id: order.r_user_id,
          notification_type: "order",
          subject: `Order #${orderId} ${statusLabel}`,
          body: JSON.stringify({
            message: `Your order has been ${statusLabel.toLowerCase()}.`,
            order_id: orderId,
            workflow_status_key: workflow_status_key,
          }),
          row_id: orderId,
          created_by: 1,
        },
      });
    } catch (notifErr) {
      console.warn("Notification send failed (non-fatal):", notifErr);
    }

    return NextResponse.json({
      success: true,
      workflow_status_key: workflow_status_key,
      workflow_status_label: newStatus.status_label,
      items_updated: updateResult.count,
    });
  } catch (err) {
    console.error("PUT /api/orders/[id]/status error:", err);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
