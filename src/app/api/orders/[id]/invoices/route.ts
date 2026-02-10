/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://cms2.devback.website";

/**
 * GET /api/orders/[id]/invoices — Fetch all invoices for an order
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

    const invoices = await prisma.invoices.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: "desc" },
    });

    // Convert Decimal fields to numbers for JSON serialization
    const serialized = invoices.map((inv) => ({
      ...inv,
      subtotal: Number(inv.subtotal),
      shipping_amount: Number(inv.shipping_amount),
      tax_amount: Number(inv.tax_amount),
      discount_amount: Number(inv.discount_amount),
      total: Number(inv.total),
      items: inv.items ? (typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items) : [],
      billing_address: inv.billing_address
        ? typeof inv.billing_address === "string"
          ? JSON.parse(inv.billing_address)
          : inv.billing_address
        : null,
      view_url: `${BACKEND_URL}/v3_0_0-invoice/view?id=${inv.id}`,
    }));

    return NextResponse.json({ invoices: serialized });
  } catch (err) {
    console.error("GET /api/orders/[id]/invoices error:", err);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[id]/invoices — Generate a new invoice for an order (admin)
 *
 * Body: {
 *   type: "product" | "shipping"
 *   notes?: string
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    const body = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const type = body.type as string;
    if (!type || !["product", "shipping"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'product' or 'shipping'" },
        { status: 400 }
      );
    }

    // Fetch the order
    const order = await prisma.orders.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check for duplicate
    const existing = await prisma.invoices.findFirst({
      where: { order_id: orderId, type: type as any },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A ${type} invoice already exists for this order (INV #${existing.invoice_number})` },
        { status: 409 }
      );
    }

    // Generate invoice number
    const lastInvoice = await prisma.invoices.findFirst({
      orderBy: { id: "desc" },
      select: { invoice_number: true },
    });
    let nextNum = 1;
    if (lastInvoice?.invoice_number) {
      const match = lastInvoice.invoice_number.match(/INV-(\d+)/);
      if (match) nextNum = Number.parseInt(match[1], 10) + 1;
    }
    const invoiceNumber = `INV-${String(nextNum).padStart(8, "0")}`;

    // Build invoice data based on type
    let subtotal = 0;
    let shippingAmount = 0;
    let taxAmount = 0;
    let discountAmount = 0;
    let total = 0;
    let items: any[] = [];

    if (type === "product") {
      // Fetch order products
      const orderProducts = await prisma.order_products.findMany({
        where: { r_order_id: orderId },
      });

      items = orderProducts.map((op) => ({
        product_name: op.product_name,
        product_code: op.product_code,
        variation_name: op.variation_name || null,
        main_image: op.main_image || null,
        quantity: op.quantity,
        unit_price: Number(op.product_price),
        total: Number(op.product_price) * op.quantity,
      }));

      subtotal = Number(order.subtotal) || 0;
      discountAmount = Number(order.discount_amount) || 0;
      total = subtotal - discountAmount;
    } else {
      // Shipping invoice
      shippingAmount = Number(order.shipping_amount) || 0;
      taxAmount = Number(order.tax_amount) || 0;
      total = shippingAmount + taxAmount;

      items = [
        {
          product_name: `Shipping (${(order.shipping_method || "standard").toUpperCase()})`,
          product_code: "SHIPPING",
          quantity: 1,
          unit_price: shippingAmount,
          total: shippingAmount,
        },
      ];

      if (taxAmount > 0) {
        items.push({
          product_name: "Tax",
          product_code: "TAX",
          quantity: 1,
          unit_price: taxAmount,
          total: taxAmount,
        });
      }
    }

    // Build billing address
    const billingAddress = {
      first_name: order.address_first_name || "",
      last_name: order.address_last_name || "",
      address: order.address || "",
      building_name: order.building_name || "",
      floor_number: order.floor_number || "",
      city: order.city || "",
      state: order.state || "",
      country: order.country || "",
      country_code: order.address_country_code || "",
      phone_number: order.address_phone_number || "",
    };

    // Determine payment method
    const paymentTypeMap: Record<number, string> = {
      0: "Cash on Delivery",
      1: "Credit Card",
      2: "WhishMoney",
      3: "Wallet",
    };
    const paymentMethod = paymentTypeMap[order.payment_type] || `Type ${order.payment_type}`;

    // Get payment reference
    const transaction = await prisma.payment_transactions.findFirst({
      where: { order_id: orderId, status: "success" },
      orderBy: { created_at: "desc" },
      select: { external_id: true },
    });

    // Create the invoice
    const invoice = await prisma.invoices.create({
      data: {
        order_id: orderId,
        user_id: order.r_user_id,
        invoice_number: invoiceNumber,
        type: type as any,
        subtotal,
        shipping_amount: shippingAmount,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total,
        currency: "USD",
        items: items,
        billing_address: billingAddress,
        payment_method: paymentMethod,
        payment_reference: transaction?.external_id || order.payment_id || null,
        status: "generated",
        notes: body.notes || null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Update order invoice_generated_at
    await prisma.orders.update({
      where: { id: orderId },
      data: { invoice_generated_at: new Date() },
    });

    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        shipping_amount: Number(invoice.shipping_amount),
        tax_amount: Number(invoice.tax_amount),
        discount_amount: Number(invoice.discount_amount),
        total: Number(invoice.total),
        view_url: `${BACKEND_URL}/v3_0_0-invoice/view?id=${invoice.id}`,
      },
    });
  } catch (err) {
    console.error("POST /api/orders/[id]/invoices error:", err);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
