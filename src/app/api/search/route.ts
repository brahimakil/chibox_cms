import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const limit = 6;

  try {
    const [products, orders, customers, categories, coupons] =
      await Promise.all([
        // Products - search by name, display_name, product_code
        prisma.product.findMany({
          where: {
            OR: [
              { product_name: { contains: q } },
              { display_name: { contains: q } },
              { product_code: { contains: q } },
            ],
          },
          select: {
            id: true,
            display_name: true,
            product_name: true,
            product_code: true,
            product_price: true,
          },
          take: limit,
        }),

        // Orders - search by ID or customer name
        prisma.orders.findMany({
          where: {
            OR: [
              ...(isNumeric(q) ? [{ id: Number.parseInt(q) }] : []),
              { address_first_name: { contains: q } },
              { address_last_name: { contains: q } },
              { address_phone_number: { contains: q } },
            ],
          },
          select: {
            id: true,
            address_first_name: true,
            address_last_name: true,
            total: true,
            status: true,
            created_at: true,
          },
          take: limit,
          orderBy: { created_at: "desc" },
        }),

        // Customers - search by name, email, phone
        prisma.users.findMany({
          where: {
            OR: [
              { first_name: { contains: q } },
              { last_name: { contains: q } },
              { email: { contains: q } },
              { phone_number: { contains: q } },
            ],
          },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          },
          take: limit,
        }),

        // Categories - search by name
        prisma.category.findMany({
          where: {
            OR: [
              { category_name: { contains: q } },
              { category_name_en: { contains: q } },
            ],
          },
          select: {
            id: true,
            category_name: true,
            category_name_en: true,
            product_count: true,
          },
          take: limit,
        }),

        // Coupons - search by code
        prisma.coupon_code.findMany({
          where: {
            code: { contains: q },
          },
          select: {
            id: true,
            code: true,
            discount: true,
            percentage: true,
            type: true,
            is_active: true,
          },
          take: limit,
        }),
      ]);

    const results = [
      ...products.map((p) => ({
        type: "product" as const,
        id: p.id,
        title: p.display_name || p.product_name || p.product_code,
        subtitle: `Code: ${p.product_code} · $${p.product_price.toFixed(2)}`,
        href: `/dashboard/products/${p.id}`,
      })),
      ...orders.map((o) => ({
        type: "order" as const,
        id: o.id,
        title: `Order #${o.id}`,
        subtitle: `${o.address_first_name} ${o.address_last_name} · $${o.total.toFixed(2)}`,
        href: `/dashboard/orders/${o.id}`,
      })),
      ...customers.map((c) => ({
        type: "customer" as const,
        id: c.id,
        title: [c.first_name, c.last_name].filter(Boolean).join(" ") || "No name",
        subtitle: c.email || c.phone_number || `ID: ${c.id}`,
        href: `/dashboard/customers/${c.id}`,
      })),
      ...categories.map((cat) => ({
        type: "category" as const,
        id: cat.id,
        title: cat.category_name_en || cat.category_name,
        subtitle: `${cat.product_count} products`,
        href: `/dashboard/categories/${cat.id}`,
      })),
      ...coupons.map((cp) => ({
        type: "coupon" as const,
        id: cp.id,
        title: cp.code,
        subtitle: formatCouponSubtitle(cp),
        href: `/dashboard/coupons/${cp.id}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [] });
  }
}

function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

function formatCouponSubtitle(cp: {
  percentage: unknown;
  discount: number;
  is_active: boolean | null;
}): string {
  const discountPart = cp.percentage
    ? `${cp.percentage}% off`
    : `$${cp.discount} off`;
  const statusPart = cp.is_active ? "Active" : "Inactive";
  return `${discountPart} · ${statusPart}`;
}
