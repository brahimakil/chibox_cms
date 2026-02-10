/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://cms2.devback.website";

/**
 * GET /api/orders/[id]/shipping-estimate
 *
 * Returns shipping costs for BOTH air and sea methods:
 *   - For the method the user SELECTED → uses the STORED order shipping_amount (exact, from backend)
 *   - For the OTHER method → calls the PHP backend shipping/calculate API (same calculator the mobile uses)
 *
 * Returns: { air: number, sea: number, selected_method: string }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);

    // Get the order's stored shipping details
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      select: {
        shipping_amount: true,
        shipping_method: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const selectedMethod = order.shipping_method || "air";
    const storedAmount = order.shipping_amount || 0;

    // Get order products to build the items list for the backend API
    const orderProducts = await prisma.order_products.findMany({
      where: { r_order_id: orderId },
      select: {
        r_product_id: true,
        quantity: true,
      },
    });

    if (orderProducts.length === 0) {
      return NextResponse.json({
        air: 0,
        sea: 0,
        selected_method: selectedMethod,
      });
    }

    // Call the PHP backend's shipping/calculate for the OTHER method
    // The selected method's cost is already stored in the order — no recalculation needed
    const otherMethod = selectedMethod === "air" ? "sea" : "air";
    let otherMethodCost = 0;

    try {
      const items = orderProducts.map((op) => ({
        product_id: op.r_product_id,
        quantity: op.quantity,
      }));

      const backendRes = await fetch(`${BACKEND_URL}/v3_0_0-shipping/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          method: otherMethod,
        }),
      });

      if (backendRes.ok) {
        const backendData = await backendRes.json();
        if (backendData?.data?.summary?.total_shipping_cost !== undefined) {
          otherMethodCost = backendData.data.summary.total_shipping_cost;
        }
      }
    } catch (backendErr) {
      console.warn("Backend shipping calculate failed (non-fatal):", backendErr);
    }

    return NextResponse.json({
      air: selectedMethod === "air" ? storedAmount : otherMethodCost,
      sea: selectedMethod === "sea" ? storedAmount : otherMethodCost,
      selected_method: selectedMethod,
    });
  } catch (err) {
    console.error("GET /api/orders/[id]/shipping-estimate error:", err);
    return NextResponse.json(
      { error: "Failed to get shipping estimates" },
      { status: 500 }
    );
  }
}
