/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://cms2.devback.website";

/**
 * PUT /api/orders/[id]/shipping — Admin updates shipping details and/or shipping status
 *
 * Body: {
 *   shipping_method?: "air"|"sea",
 *   shipping_amount?: number,
 *   tax_amount?: number,
 *   shipping_status?: 0 | 1    // explicitly set shipping status (cannot set to 2, that's user payment)
 * }
 *
 * If shipping_status = 1 is set (Confirm shipping price), we also notify the user.
 * Editing amounts alone does NOT change shipping_status.
 */
export async function PUT(
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

    if (order.shipping_status === 2) {
      return NextResponse.json(
        { error: "Shipping is already paid by the customer. Cannot modify." },
        { status: 400 }
      );
    }

    // Build update data
    const data: any = {
      updated_at: new Date(),
    };

    if (body.shipping_method === "air" || body.shipping_method === "sea") {
      data.shipping_method = body.shipping_method;
    }

    if (body.shipping_amount !== undefined && body.shipping_amount !== null) {
      data.shipping_amount = Number(body.shipping_amount);
    }

    if (body.tax_amount !== undefined && body.tax_amount !== null) {
      data.tax_amount = Number(body.tax_amount);
    }

    // Handle explicit shipping_status change
    // Admin can set 0 (reset to pending) or 1 (confirm price / ready to pay)
    // 2 is set automatically by payment callback, not by admin
    const requestedShippingStatus = body.shipping_status !== undefined ? Number(body.shipping_status) : null;
    const isConfirmingPrice = requestedShippingStatus === 1 && order.shipping_status === 0;

    if (requestedShippingStatus !== null) {
      if (![0, 1].includes(requestedShippingStatus)) {
        return NextResponse.json(
          { error: "Admin can only set shipping_status to 0 (Pending Review) or 1 (Ready to Pay)" },
          { status: 400 }
        );
      }
      data.shipping_status = requestedShippingStatus;
    }

    // Recalculate total: subtotal + shipping + tax - discount
    const subtotal = order.subtotal || 0;
    const shipping = data.shipping_amount ?? order.shipping_amount;
    const tax = data.tax_amount ?? order.tax_amount ?? 0;
    const discount = order.discount_amount || 0;
    data.total = subtotal + shipping + tax - discount;

    await prisma.orders.update({ where: { id: orderId }, data });

    // Only send notification when admin confirms shipping price (0 → 1)
    if (isConfirmingPrice) {
      try {
        const user = await prisma.users.findUnique({
          where: { id: order.r_user_id },
          select: { mobile_token: true },
        });

        const shippingCost = data.shipping_amount ?? order.shipping_amount;

        if (user?.mobile_token) {
          await fetch(`${BACKEND_URL}/v3_0_0-notification/send-push`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fcm_token: user.mobile_token,
              title: "🚚 Shipping Cost Confirmed",
              body: `Your shipping cost has been confirmed! Pay $${Number(shippingCost).toFixed(2)} to proceed.`,
              data: {
                type: "shipping",
                order_id: String(orderId),
              },
            }),
          });
        }

        await prisma.notifications.create({
          data: {
            r_user_id: order.r_user_id,
            notification_type: "shipping",
            subject: "🚚 Shipping Cost Confirmed",
            body: JSON.stringify({
              message: `Your shipping cost has been confirmed! Pay $${Number(shippingCost).toFixed(2)} to proceed.`,
              order_id: orderId,
              shipping_amount: shippingCost,
            }),
            row_id: orderId,
            created_by: 1,
          },
        });
      } catch (notifErr) {
        console.warn("Shipping notification failed (non-fatal):", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      total: data.total,
      shipping_amount: data.shipping_amount ?? order.shipping_amount,
      shipping_status: data.shipping_status ?? order.shipping_status,
      notified: isConfirmingPrice,
    });
  } catch (err) {
    console.error("PUT /api/orders/[id]/shipping error:", err);
    return NextResponse.json(
      { error: "Failed to update shipping" },
      { status: 500 }
    );
  }
}
