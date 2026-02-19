/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateHomeCache } from "@/lib/cache-invalidation";

/**
 * Get pricing settings (markup + CNY→USD exchange rate).
 */
async function getPricing() {
  const [settings, exchangeRateRow] = await Promise.all([
    prisma.general_settings.findFirst({
      select: { price_markup_percentage: true },
    }),
    prisma.ex_currency.findFirst({
      where: { from_currency: 9, to_currency: 6 },
      select: { rate: true },
    }),
  ]);
  return {
    markupPercent: settings?.price_markup_percentage
      ? Number(settings.price_markup_percentage)
      : 15,
    exchangeRate: exchangeRateRow?.rate ?? 0.14,
  };
}

/** Convert a raw price (CNY) to USD with markup. */
function convertPrice(
  rawPrice: number,
  currencyId: number | null,
  rate: number,
  markup: number
): number {
  // currency_id 6 = USD (already in USD, only apply markup)
  if (currencyId === 6) return Math.round(rawPrice * markup * 100) / 100;
  // Everything else: convert via CNY→USD rate + markup
  return Math.round(rawPrice * rate * markup * 100) / 100;
}

/**
 * GET /api/flash-sales/[id]/products — List products in a flash sale
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [products, pricing] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT p.id, p.product_name, p.display_name, p.product_price, p.origin_price,
                p.sale_price, p.main_image, p.currency_id,
                p.product_qty_left, p.product_status, p.r_flash_id
         FROM flash_sales_products fp
         JOIN product p ON p.id = fp.r_product_id
         WHERE fp.r_flash_id = ?
         ORDER BY p.product_name ASC`,
        Number(id)
      ) as Promise<any[]>,
      getPricing(),
    ]);

    const rate = Number(pricing.exchangeRate);
    const markup = 1 + Number(pricing.markupPercent) / 100;

    return NextResponse.json({
      products: products.map((p: any) => {
        const rawPrice = Number(p.product_price) || Number(p.origin_price) || 0;
        const currencyId = p.currency_id ? Number(p.currency_id) : null;
        const usdPrice = convertPrice(rawPrice, currencyId, rate, markup);
        const rawSale = p.sale_price ? Number(p.sale_price) : null;
        const usdSale = rawSale === null ? null : convertPrice(rawSale, currencyId, rate, markup);
        return {
          id: Number(p.id),
          title: p.display_name || p.product_name || `#${p.id}`,
          price: usdPrice,
          discount_price: usdSale,
          main_image: p.main_image,
          quantity: Number(p.product_qty_left),
          status: Number(p.product_status),
        };
      }),
      total: products.length,
    });
  } catch (error) {
    console.error("Error fetching flash sale products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flash-sales/[id]/products — Add products to a flash sale
 * Body: { product_ids: number[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const body = await request.json();

    if (!body.product_ids?.length) {
      return NextResponse.json(
        { error: "product_ids array is required" },
        { status: 400 }
      );
    }

    // Get existing product IDs to avoid duplicates
    const existing = (await prisma.$queryRawUnsafe(
      `SELECT r_product_id FROM flash_sales_products WHERE r_flash_id = ?`,
      numId
    )) as any[];

    const existingSet = new Set(existing.map((e: any) => Number(e.r_product_id)));
    const newIds = body.product_ids.filter(
      (pid: number) => !existingSet.has(pid)
    );

    if (newIds.length) {
      const insertValues = newIds
        .map((pid: number) => `(${numId}, ${pid})`)
        .join(",");
      await prisma.$executeRawUnsafe(
        `INSERT INTO flash_sales_products (r_flash_id, r_product_id) VALUES ${insertValues}`
      );

      // Also set r_flash_id on the Product records
      await prisma.$executeRawUnsafe(
        `UPDATE product SET r_flash_id = ? WHERE id IN (${newIds.join(",")})`,
        numId
      );
    }

    // Invalidate backend home cache so the change is instant
    invalidateHomeCache();

    return NextResponse.json({
      success: true,
      added: newIds.length,
      skipped: body.product_ids.length - newIds.length,
    });
  } catch (error) {
    // Invalidate cache even on partial success (products may have been added)
    invalidateHomeCache();
    console.error("Error adding products to flash sale:", error);
    return NextResponse.json(
      { error: "Failed to add products" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/flash-sales/[id]/products — Remove products from a flash sale
 * Body: { product_ids: number[] }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const body = await request.json();

    if (!body.product_ids?.length) {
      return NextResponse.json(
        { error: "product_ids array is required" },
        { status: 400 }
      );
    }

    const idList = body.product_ids.join(",");

    await prisma.$executeRawUnsafe(
      `DELETE FROM flash_sales_products WHERE r_flash_id = ? AND r_product_id IN (${idList})`,
      numId
    );

    // Clear r_flash_id from products
    await prisma.$executeRawUnsafe(
      `UPDATE product SET r_flash_id = NULL WHERE id IN (${idList}) AND r_flash_id = ?`,
      numId
    );

    // Invalidate backend home cache so the change is instant
    invalidateHomeCache();

    return NextResponse.json({ success: true, removed: body.product_ids.length });
  } catch (error) {
    // Invalidate cache even on partial success
    invalidateHomeCache();
    console.error("Error removing products from flash sale:", error);
    return NextResponse.json(
      { error: "Failed to remove products" },
      { status: 500 }
    );
  }
}
