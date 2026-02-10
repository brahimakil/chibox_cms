import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ORDER_STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Confirmed",
  2: "Processing",
  3: "Shipped",
  4: "Delivered",
  5: "Cancelled",
  6: "Refunded",
  7: "Failed",
  8: "On Hold",
  9: "Pending",
};

/**
 * GET /api/orders/search?search=...&limit=8
 * Lightweight order search for the notification entity picker.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.trim() || "";
    const limit = Math.min(20, Math.max(1, Number(sp.get("limit")) || 8));

    if (!search) {
      return NextResponse.json({ orders: [] });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    const num = Number(search);

    if (Number.isFinite(num) && num > 0) {
      // Search by ID
      where.id = num;
    } else {
      // Search by customer name
      where.OR = [
        { address_first_name: { contains: search } },
        { address_last_name: { contains: search } },
      ];
    }

    const orders = await prisma.orders.findMany({
      where,
      select: {
        id: true,
        total: true,
        status: true,
        address_first_name: true,
        address_last_name: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    const enriched = orders.map((o) => ({
      ...o,
      status_label: ORDER_STATUS_LABELS[Number(o.status)] || `Status ${o.status}`,
    }));

    return NextResponse.json({ orders: enriched });
  } catch (err) {
    console.error("GET /api/orders/search error:", err);
    return NextResponse.json({ error: "Failed to search orders" }, { status: 500 });
  }
}
