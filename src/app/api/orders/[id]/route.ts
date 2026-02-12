/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SHIPPING_STATUS, PAYMENT_TYPES } from "@/lib/order-constants";

const STATUS_COLORS: Record<string, string> = {
  processing: "yellow",
  ordered: "blue",
  shipped_to_wh: "indigo",
  received_to_wh: "cyan",
  shipped_to_leb: "purple",
  received_to_leb: "violet",
  delivered_to_customer: "green",
  cancelled: "red",
  refunded: "orange",
};

/**
 * GET /api/orders/[id] — Full order detail with products, tracking, transactions
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    if (!orderId) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // ── Fetch order ────────────────────────────────────────────────
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // ── Fetch related data in parallel ─────────────────────────────
    const [
      orderProducts,
      orderTracking,
      paymentTransactions,
      customer,
      coupon,
    ] = await Promise.all([
      prisma.order_products.findMany({
        where: { r_order_id: orderId },
        orderBy: { id: "asc" },
      }),
      prisma.order_tracking.findMany({
        where: { r_order_id: orderId },
        orderBy: { track_date: "asc" },
      }),
      prisma.payment_transactions.findMany({
        where: { order_id: orderId },
        orderBy: { created_at: "desc" },
      }),
      prisma.users.findUnique({
        where: { id: order.r_user_id },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          country_code: true,
          phone_number: true,
          main_image: true,
        },
      }),
      order.coupon_code
        ? prisma.coupon_code.findUnique({
            where: { id: order.coupon_code },
            select: { id: true, code: true, discount: true, type: true, percentage: true },
          })
        : null,
    ]);

    // ── Fetch product variations for each order product ─────────────
    const opIds = orderProducts.map((op) => op.id);
    const variations = opIds.length
      ? await prisma.order_product_variations.findMany({
          where: { r_order_product_id: { in: opIds } },
          orderBy: { id: "asc" },
        })
      : [];

    // Group variations by order_product_id
    const variationsByOp = new Map<number, typeof variations>();
    for (const v of variations) {
      const arr = variationsByOp.get(v.r_order_product_id) || [];
      arr.push(v);
      variationsByOp.set(v.r_order_product_id, arr);
    }

    // ── Fetch 1688 store info for each product ─────────────────────
    const productIds = [...new Set(orderProducts.map((op) => op.r_product_id))];
    const storeInfos = productIds.length
      ? await prisma.product_1688_info.findMany({
          where: { product_id: { in: productIds } },
          select: {
            product_id: true,
            shop_name: true,
            shop_url: true,
            seller_login_id: true,
            seller_user_id: true,
          },
        })
      : [];
    const storeInfoMap = new Map(
      storeInfos.map((si) => [si.product_id, si])
    );

    // ── Calculate per-item shipping for BOTH air and sea via backend ──
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://cms2.devback.website";
    const shippingMethod = order.shipping_method || "air";
    let airShippingMap = new Map<number, number>();
    let seaShippingMap = new Map<number, number>();

    try {
      const shippingItems = orderProducts.map((op) => ({
        product_id: op.r_product_id,
        quantity: op.quantity,
      }));
      // Fetch air and sea costs in parallel
      const [airRes, seaRes] = await Promise.all([
        fetch(`${BACKEND_URL}/v3_0_0-shipping/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: shippingItems, method: "air" }),
        }),
        fetch(`${BACKEND_URL}/v3_0_0-shipping/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: shippingItems, method: "sea" }),
        }),
      ]);
      if (airRes.ok) {
        const airData = await airRes.json();
        for (const ci of (airData?.data?.items || [])) {
          airShippingMap.set(ci.product_id, ci.total_cost ?? 0);
        }
      }
      if (seaRes.ok) {
        const seaData = await seaRes.json();
        for (const ci of (seaData?.data?.items || [])) {
          seaShippingMap.set(ci.product_id, ci.total_cost ?? 0);
        }
      }
    } catch (err) {
      console.warn("Backend shipping calculate for per-item costs failed (non-fatal):", err);
    }

    // ── Fetch workflow statuses for items ─────────────────────────
    const allWorkflowStatuses = await prisma.cms_order_item_statuses.findMany({
      where: { is_active: 1 },
    });
    const workflowStatusMap = new Map(allWorkflowStatuses.map((s) => [s.id, s]));

    // ── Enrich order products ──────────────────────────────────────
    const enrichedProducts = orderProducts.map((op) => {
      const storedShipping = op.shipping ? Number(op.shipping) : 0;
      const methodMap = shippingMethod === "sea" ? seaShippingMap : airShippingMap;
      const calcShipping = methodMap.get(op.r_product_id) ?? 0;
      const effectiveShipping = storedShipping > 0 ? storedShipping : calcShipping;

      const ws = op.workflow_status_id ? workflowStatusMap.get(op.workflow_status_id) : null;
      const statusKey = ws?.status_key || "processing";
      const statusLabel = ws?.status_label || "Processing";

      return {
        ...op,
        weight_kg: op.weight_kg ? Number(op.weight_kg) : null,
        length_m: op.length_m ? Number(op.length_m) : null,
        width_m: op.width_m ? Number(op.width_m) : null,
        height_m: op.height_m ? Number(op.height_m) : null,
        tax_amount: op.tax_amount ? Number(op.tax_amount) : 0,
        shipping: effectiveShipping,
        shipping_air: airShippingMap.get(op.r_product_id) ?? 0,
        shipping_sea: seaShippingMap.get(op.r_product_id) ?? 0,
        workflow_status_key: statusKey,
        workflow_status_label: statusLabel,
        workflow_status_id: op.workflow_status_id,
        is_terminal: ws?.is_terminal === 1,
        status_label: statusLabel,
        status_color: STATUS_COLORS[statusKey] || "gray",
        tracking_number: op.tracking_number || null,
        variations: variationsByOp.get(op.id) || [],
        store_info: storeInfoMap.get(op.r_product_id) || null,
      };
    });

    // ── Enrich tracking with status labels ─────────────────────────
    const enrichedTracking = orderTracking.map((t) => {
      // Try to find a workflow status that matches, otherwise use a generic label
      const ws = allWorkflowStatuses.find((s) => s.id === t.r_status_id);
      return {
        ...t,
        status_label: ws?.status_label || `Status ${t.r_status_id}`,
        status_color: ws ? (STATUS_COLORS[ws.status_key] || "gray") : "gray",
      };
    });

    // ── Enrich transactions ────────────────────────────────────────
    const enrichedTransactions = paymentTransactions.map((pt) => ({
      ...pt,
      amount: Number(pt.amount),
    }));

    // ── Derive order-level workflow status from items ───────────────
    let orderStatusKey = "processing";
    let orderStatusLabel = "Processing";
    if (enrichedProducts.length > 0) {
      // Lowest status_order among non-terminal items
      let lowestOrder = Infinity;
      let allTerminal = true;
      for (const p of enrichedProducts) {
        const ws = p.workflow_status_id ? workflowStatusMap.get(p.workflow_status_id) : null;
        if (!ws || ws.is_terminal !== 1) allTerminal = false;
        const so = ws?.status_order ?? 1;
        if (ws?.is_terminal === 1) continue;
        if (so < lowestOrder) {
          lowestOrder = so;
          orderStatusKey = ws?.status_key || "processing";
          orderStatusLabel = ws?.status_label || "Processing";
        }
      }
      if (allTerminal) {
        const firstWs = enrichedProducts[0].workflow_status_id
          ? workflowStatusMap.get(enrichedProducts[0].workflow_status_id)
          : null;
        orderStatusKey = firstWs?.status_key || "processing";
        orderStatusLabel = firstWs?.status_label || "Processing";
      }
    }

    // ── Build response ─────────────────────────────────────────────
    return NextResponse.json({
      order: {
        ...order,
        refund_amount: order.refund_amount ? Number(order.refund_amount) : null,
        status_label: orderStatusLabel,
        status_color: STATUS_COLORS[orderStatusKey] || "gray",
        status_key: orderStatusKey,
        shipping_status_label: SHIPPING_STATUS[order.shipping_status]?.label || "Unknown",
        shipping_status_color: SHIPPING_STATUS[order.shipping_status]?.color || "gray",
        payment_type_label: PAYMENT_TYPES[order.payment_type] || `Type ${order.payment_type}`,
        customer_name: `${order.address_first_name} ${order.address_last_name}`.trim(),
      },
      products: enrichedProducts,
      tracking: enrichedTracking,
      transactions: enrichedTransactions,
      customer,
      coupon,
    });
  } catch (err) {
    console.error("GET /api/orders/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders/[id] — Update admin notes, is_paid toggle
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    const body = await req.json();

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.is_paid !== undefined) {
      updateData.is_paid = Number(body.is_paid) === 1 ? 1 : 0;
    }

    await prisma.orders.update({
      where: { id: orderId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/orders/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
