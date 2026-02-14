/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://cms2.devback.website";

function parseId(idStr: string): number | null {
  const id = Number.parseInt(idStr, 10);
  return Number.isNaN(id) ? null : id;
}

/** Translated data returned by the backend's on-the-fly translation */
interface BackendTranslatedData {
  product_props: any[] | null;  // Translated specs [{"Brand":"Nike"}, ...]
  title_en: string | null;      // English title
  display_name: string | null;  // English display name
}

/**
 * Call the backend's get-product-by-id endpoint.
 * This triggers on-demand variant fetching AND returns translated data
 * (product_props keys/values translated from Chinese, title_en, etc.).
 * The backend translates product_props on-the-fly (not saved to DB).
 */
async function fetchBackendProduct(productId: number): Promise<BackendTranslatedData | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(
      `${BACKEND_URL}/v3_0_0-product/get-product-by-id?id=${productId}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Backend fetch for product ${productId} returned ${res.status}`);
      return null;
    }

    const body = await res.json();
    const p = body?.data?.product;
    if (!p) return null;

    return {
      product_props: p.product_props ?? null,
      title_en: p.title_en ?? p.display_name ?? null,
      display_name: p.display_name ?? null,
    };
  } catch (err: any) {
    console.warn(`Backend fetch for product ${productId} failed:`, err.message);
    return null;
  }
}

/**
 * Walk up the category parent chain to inherit shipping fields.
 * Returns resolved values (first non-null in chain, or defaults).
 */
async function resolveInheritedShippingFields(category: any) {
  const result = {
    air_shipping_rate: null as number | null,
    cbm_rate: null as number | null,
    shipping_surcharge_percent: 0,
    tax_air: 0,
    tax_sea: 0,
    tax_min_qty_air: null as number | null,
    tax_min_qty_sea: null as number | null,
    source_category: null as string | null,
  };

  if (!category) return result;

  const visited = new Set<number>();
  let current = category;

  while (current) {
    visited.add(current.id);
    applyInheritedField(result, current);
    if (!current.parent || visited.has(current.parent)) break;
    current = await prisma.category.findUnique({
      where: { id: current.parent },
      select: {
        id: true,
        parent: true,
        category_name: true,
        category_name_en: true,
        air_shipping_rate: true,
        cbm_rate: true,
        shipping_surcharge_percent: true,
        tax_air: true,
        tax_sea: true,
        tax_min_qty_air: true,
        tax_min_qty_sea: true,
      },
    });
  }

  return result;
}

/** Apply a single category node's values to the result (first-non-null wins). */
function applyInheritedField(result: any, cat: any) {
  const numOrNull = (v: any) => (v == null ? null : Number(v));
  const numOrZero = (v: any) => (v == null ? 0 : Number(v));

  if (result.air_shipping_rate === null) result.air_shipping_rate = numOrNull(cat.air_shipping_rate);
  if (result.cbm_rate === null) result.cbm_rate = numOrNull(cat.cbm_rate);
  if (result.shipping_surcharge_percent === 0) result.shipping_surcharge_percent = numOrZero(cat.shipping_surcharge_percent);
  if (result.tax_air === 0) result.tax_air = numOrZero(cat.tax_air);
  if (result.tax_sea === 0) result.tax_sea = numOrZero(cat.tax_sea);
  if (result.tax_min_qty_air === null && cat.tax_min_qty_air != null) result.tax_min_qty_air = cat.tax_min_qty_air;
  if (result.tax_min_qty_sea === null && cat.tax_min_qty_sea != null) result.tax_min_qty_sea = cat.tax_min_qty_sea;
  if (result.source_category === null && (cat.air_shipping_rate != null || cat.cbm_rate != null)) {
    result.source_category = cat.category_name_en || cat.category_name;
  }
}

/**
 * Compute shipping cost estimation for 1 unit of the product.
 */
function computeShippingEstimation(
  product: any,
  shippingFields: any,
  exchangeRate: number,
  shippingSettings: any
) {
  const weight = product.product_weight ? Number(product.product_weight) : null;
  const length = product.length_m ? Number(product.length_m) : null;
  const width = product.width_m ? Number(product.width_m) : null;
  const height = product.height_m ? Number(product.height_m) : null;
  const originPrice = product.origin_price ? Number(product.origin_price) : null;

  // Fallback dimensions when product has none
  const estWeight = weight ?? 0.5;
  const estLength = length ?? 0.2;
  const estWidth = width ?? 0.15;
  const estHeight = height ?? 0.1;
  const hasDimensions = weight !== null || (length !== null && width !== null && height !== null);

  // Rates (category overrides, then global, then hardcoded fallback)
  const globalAirRate = shippingSettings?.air_price_per_kg
    ? Number(shippingSettings.air_price_per_kg)
    : 8;
  const globalSeaRate = shippingSettings?.sea_price_per_cbm
    ? Number(shippingSettings.sea_price_per_cbm)
    : 150;

  const airRate = shippingFields.air_shipping_rate ?? globalAirRate;
  const seaRate = shippingFields.cbm_rate ?? globalSeaRate;

  // Air: weight × rate
  const airCost = Math.max(estWeight * airRate, 0.5);

  // Sea: max(CBM, tons) × rate
  const cbm = estLength * estWidth * estHeight;
  const tons = estWeight / 1000;
  const chargeable = Math.max(cbm, tons);
  const chargedBy = cbm >= tons ? "volume" : "weight";
  const seaCost = Math.max(chargeable * seaRate, 0.5);

  // Surcharge (on product price in USD)
  let surchargeAmount = 0;
  const surchargePercent = shippingFields.shipping_surcharge_percent ?? 0;
  if (surchargePercent > 0 && originPrice) {
    const priceUSD = originPrice * exchangeRate;
    surchargeAmount = priceUSD * (surchargePercent / 100);
  }

  return {
    hasDimensions,
    status: hasDimensions ? "calculated" : "estimated",
    product: {
      weight,
      length,
      width,
      height,
      usedWeight: estWeight,
      usedLength: estLength,
      usedWidth: estWidth,
      usedHeight: estHeight,
    },
    rates: {
      airRate,
      airRateSource: shippingFields.air_shipping_rate === null ? "global" : "category",
      seaRate,
      seaRateSource: shippingFields.cbm_rate === null ? "global" : "category",
      sourceCategory: shippingFields.source_category,
    },
    air: {
      baseCost: round2(airCost),
      surcharge: round2(surchargeAmount),
      total: round2(airCost + surchargeAmount),
    },
    sea: {
      cbm: round6(cbm),
      tons: round6(tons),
      chargeable: round6(chargeable),
      chargedBy,
      baseCost: round2(seaCost),
      surcharge: round2(surchargeAmount),
      total: round2(seaCost + surchargeAmount),
    },
    surchargePercent,
    tax: {
      air: shippingFields.tax_air,
      sea: shippingFields.tax_sea,
      minQtyAir: shippingFields.tax_min_qty_air,
      minQtySea: shippingFields.tax_min_qty_sea,
    },
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round6(n: number) {
  return Math.round(n * 1000000) / 1000000;
}

async function fetchProductDetail(id: number) {
  // First, check if this is a 1688-source product that might need on-demand refresh
  const productCheck = await prisma.product.findUnique({
    where: { id },
    select: { id: true, source: true, source_product_id: true },
  });

  if (!productCheck) return null;

  // For 1688-source products, call the backend API which:
  // 1. Triggers on-demand variant fetching if needed
  // 2. Returns translated product_props and title (on-the-fly, not saved to DB)
  // Run backend call in parallel with Prisma query for better performance.
  // The backend call also populates variants on first visit, so we need
  // its data before reading — BUT for already-fetched products (majority),
  // running them in parallel saves ~1-2s.
  const is1688 = productCheck.source === "1688" && !!productCheck.source_product_id;

  const [backendData, product] = await Promise.all([
    is1688 ? fetchBackendProduct(id) : Promise.resolve(null),
    prisma.product.findUnique({
      where: { id },
      include: {
        product_1688_info: true,
        product_variant: {
          orderBy: { sort_order: "asc" },
        },
      },
    }),
  ]);

  if (!product) return null;

  // Get category with shipping fields
  const category = product.category_id
    ? await prisma.category.findUnique({
        where: { id: product.category_id },
        select: {
          id: true,
          category_name: true,
          category_name_en: true,
          parent: true,
          full_path: true,
          tax_air: true,
          tax_sea: true,
          tax_min_qty_air: true,
          tax_min_qty_sea: true,
          cbm_rate: true,
          shipping_surcharge_percent: true,
          air_shipping_rate: true,
        },
      })
    : null;

  // Resolve inherited shipping fields by walking up parent chain
  const shippingFields = await resolveInheritedShippingFields(category);

  // Get product options + values
  const options = await prisma.product_options.findMany({
    where: { product_id: id },
    orderBy: { order_number: "asc" },
  });

  const optionIds = options.map((o: any) => o.id);
  const optionValues =
    optionIds.length > 0
      ? await prisma.product_options_values.findMany({
          where: { r_product_option_id: { in: optionIds } },
          orderBy: { order_number: "asc" },
        })
      : [];

  // Get legacy variations
  const variations = await prisma.product_variation.findMany({
    where: { product_id: id },
    orderBy: { sort_order: "asc" },
  });

  // Get pricing settings + shipping settings
  const [settings, exchangeRateRow, shippingSettings] = await Promise.all([
    prisma.general_settings.findFirst({
      select: { price_markup_percentage: true },
    }),
    prisma.ex_currency.findFirst({
      where: { from_currency: 9, to_currency: 6 },
      select: { rate: true },
    }),
    prisma.shipping_settings.findFirst({
      select: { air_price_per_kg: true, sea_price_per_cbm: true },
    }),
  ]);

  const markupPercent = settings?.price_markup_percentage
    ? Number(settings.price_markup_percentage)
    : 15;
  const exchangeRate = exchangeRateRow?.rate ?? 0.14;

  // Compute times sold from orders
  const salesResult = await prisma.$queryRaw<
    { total_sold: bigint }[]
  >`SELECT COALESCE(SUM(op.quantity), 0) as total_sold
    FROM order_products op
    INNER JOIN orders o ON op.r_order_id = o.id
    WHERE op.r_product_id = ${id}
      AND (o.status IN (2, 3, 4, 5) OR (o.status = 9 AND o.is_paid = 1))`;

  const timesSold = salesResult[0] ? Number(salesResult[0].total_sold) : 0;

  // Get store info if exists
  const store = product.r_store_id
    ? await prisma.stores.findUnique({
        where: { id: product.r_store_id },
        select: { id: true, store_name: true },
      })
    : null;

  // Format options with values
  const formattedOptions = options.map((opt: any) => ({
    id: opt.id,
    type: opt.type,
    pid: opt.pid,
    is_color: opt.is_color,
    source: opt.source,
    values: optionValues
      .filter((v: any) => v.r_product_option_id === opt.id)
      .map((v: any) => ({
        id: v.id,
        name: v.name,
        vid: v.vid,
        is_color: v.is_color,
        color: v.color,
        image_url: v.image_url,
      })),
  }));

  // Serialize BigInts and merge backend-translated product_props
  const info1688 = product.product_1688_info.map((info: any) => {
    const serialized = {
      ...info,
      id: info.id.toString(),
      origin_price: info.origin_price ? Number(info.origin_price) : null,
      origin_price_min: info.origin_price_min ? Number(info.origin_price_min) : null,
      origin_price_max: info.origin_price_max ? Number(info.origin_price_max) : null,
      previous_origin_price: info.previous_origin_price ? Number(info.previous_origin_price) : null,
      discount_price: info.discount_price ? Number(info.discount_price) : null,
      unit_weight: info.unit_weight ? Number(info.unit_weight) : null,
      mix_amount: info.mix_amount ? Number(info.mix_amount) : null,
      delivery_fee: info.delivery_fee ? Number(info.delivery_fee) : null,
    };

    // If the backend returned translated product_props, use those instead of raw Chinese
    if (backendData?.product_props) {
      serialized.product_props = JSON.stringify(backendData.product_props);
    }
    // If the backend returned an English title, store it for the frontend
    if (backendData?.title_en && !serialized.title_en) {
      serialized.title_en = backendData.title_en;
    }

    return serialized;
  });

  const formattedVariants = product.product_variant.map((v: any) => ({
    ...v,
    id: v.id.toString(),
    origin_price: v.origin_price ? Number(v.origin_price) : null,
    sale_price: v.sale_price ? Number(v.sale_price) : null,
    previous_origin_price: v.previous_origin_price ? Number(v.previous_origin_price) : null,
  }));

  const formattedVariations = variations.map((v: any) => ({
    ...v,
    price: v.price,
    provider_price: v.provider_price,
  }));

  return {
    product: {
      ...product,
      origin_price: product.origin_price ? Number(product.origin_price) : null,
      show_price: product.show_price ? Number(product.show_price) : null,
      sale_price: product.sale_price ? Number(product.sale_price) : null,
      length_m: product.length_m ? Number(product.length_m) : null,
      width_m: product.width_m ? Number(product.width_m) : null,
      height_m: product.height_m ? Number(product.height_m) : null,
      shipping_confidence_score: product.shipping_confidence_score
        ? Number(product.shipping_confidence_score)
        : null,
      website_price: product.website_price ? Number(product.website_price) : null,
      // If backend returned a translated display_name, include it
      ...(backendData?.display_name && !product.display_name
        ? { display_name: backendData.display_name }
        : {}),
      product_1688_info: info1688,
      product_variant: formattedVariants,
    },
    category,
    options: formattedOptions,
    variations: formattedVariations,
    store,
    timesSold,
    pricing: { markupPercent, exchangeRate },
    shippingEstimation: computeShippingEstimation(
      product,
      shippingFields,
      exchangeRate,
      shippingSettings
    ),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (id === null) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const result = await fetchProductDetail(id);
    if (!result) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (id === null) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      "category_id",
      "product_weight",
      "length_m",
      "width_m",
      "height_m",
      "free_shipping",
      "flat_rate",
      "shipping_cost",
      "express_delivery",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // If dimensions are updated, set shipping_data_source to manual
    if (
      updateData.product_weight !== undefined ||
      updateData.length_m !== undefined ||
      updateData.width_m !== undefined ||
      updateData.height_m !== undefined
    ) {
      updateData.shipping_data_source = "manual";
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, product: { id: updated.id } });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (id === null) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    // Delete related records first
    const optionIds = (
      await prisma.product_options.findMany({
        where: { product_id: id },
        select: { id: true },
      })
    ).map((o: any) => o.id);

    await prisma.$transaction([
      ...(optionIds.length > 0
        ? [
            prisma.product_options_values.deleteMany({
              where: { r_product_option_id: { in: optionIds } },
            }),
          ]
        : []),
      prisma.product_options.deleteMany({ where: { product_id: id } }),
      prisma.product_variation.deleteMany({ where: { product_id: id } }),
      prisma.product_categories.deleteMany({ where: { product_id: id } }),
      prisma.productpayload.deleteMany({ where: { product_id: id } }),
      prisma.products_view.deleteMany({ where: { product_id: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
