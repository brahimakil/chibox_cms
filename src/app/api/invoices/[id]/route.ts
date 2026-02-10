/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://cms2.devback.website";

/**
 * GET /api/invoices/[id] — Fetch a single invoice
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceId = Number(id);
    if (!invoiceId) {
      return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 });
    }

    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({
      invoice: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        shipping_amount: Number(invoice.shipping_amount),
        tax_amount: Number(invoice.tax_amount),
        discount_amount: Number(invoice.discount_amount),
        total: Number(invoice.total),
        items: invoice.items
          ? typeof invoice.items === "string"
            ? JSON.parse(invoice.items)
            : invoice.items
          : [],
        billing_address: invoice.billing_address
          ? typeof invoice.billing_address === "string"
            ? JSON.parse(invoice.billing_address)
            : invoice.billing_address
          : null,
        view_url: `${BACKEND_URL}/v3_0_0-invoice/view?id=${invoice.id}`,
      },
    });
  } catch (err) {
    console.error("GET /api/invoices/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/invoices/[id] — Update an invoice (admin)
 *
 * Body: {
 *   notes?: string
 *   status?: "generated" | "sent" | "void"
 *   subtotal?: number
 *   shipping_amount?: number
 *   tax_amount?: number
 *   discount_amount?: number
 *   total?: number
 * }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceId = Number(id);
    const body = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 });
    }

    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Build update data
    const data: any = { updated_at: new Date() };

    if (body.notes !== undefined) {
      data.notes = body.notes || null;
    }

    if (body.status && ["generated", "sent", "void"].includes(body.status)) {
      data.status = body.status;
    }

    if (body.subtotal !== undefined) data.subtotal = Number(body.subtotal);
    if (body.shipping_amount !== undefined) data.shipping_amount = Number(body.shipping_amount);
    if (body.tax_amount !== undefined) data.tax_amount = Number(body.tax_amount);
    if (body.discount_amount !== undefined) data.discount_amount = Number(body.discount_amount);

    // Recalculate total if any amount field was provided
    if (
      body.total !== undefined
    ) {
      data.total = Number(body.total);
    } else if (
      body.subtotal !== undefined ||
      body.shipping_amount !== undefined ||
      body.tax_amount !== undefined ||
      body.discount_amount !== undefined
    ) {
      const sub = data.subtotal ?? Number(invoice.subtotal);
      const ship = data.shipping_amount ?? Number(invoice.shipping_amount);
      const tax = data.tax_amount ?? Number(invoice.tax_amount);
      const disc = data.discount_amount ?? Number(invoice.discount_amount);
      data.total = sub + ship + tax - disc;
    }

    const updated = await prisma.invoices.update({
      where: { id: invoiceId },
      data,
    });

    return NextResponse.json({
      success: true,
      invoice: {
        ...updated,
        subtotal: Number(updated.subtotal),
        shipping_amount: Number(updated.shipping_amount),
        tax_amount: Number(updated.tax_amount),
        discount_amount: Number(updated.discount_amount),
        total: Number(updated.total),
        view_url: `${BACKEND_URL}/v3_0_0-invoice/view?id=${updated.id}`,
      },
    });
  } catch (err) {
    console.error("PUT /api/invoices/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}
