/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://cms2.devback.website";

/**
 * POST /api/products/[id]/refresh
 * Force-refresh product data from 1688 via the backend's on-demand fetching.
 * This calls the backend's actionGetProductById which triggers
 * refreshProductDetailsIfNeeded() → TMAPI → saves variants to DB.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = Number.parseInt(idStr, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    // Verify product exists and is a 1688 source
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, source: true, source_product_id: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.source !== "1688" || !product.source_product_id) {
      return NextResponse.json(
        { error: "Only 1688-source products can be refreshed" },
        { status: 400 }
      );
    }

    // Count existing data before refresh
    const [optionsBefore, variationsBefore, infoBefore] = await Promise.all([
      prisma.product_options.count({ where: { product_id: id } }),
      prisma.product_variation.count({ where: { product_id: id } }),
      prisma.product_1688_info.count({ where: { product_id: id } }),
    ]);

    // Call backend API to trigger on-demand refresh
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45s for forced refresh

    const res = await fetch(
      `${BACKEND_URL}/v3_0_0-product/get-product-by-id?id=${id}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: 502 }
      );
    }

    // Count data after refresh
    const [optionsAfter, variationsAfter, infoAfter] = await Promise.all([
      prisma.product_options.count({ where: { product_id: id } }),
      prisma.product_variation.count({ where: { product_id: id } }),
      prisma.product_1688_info.count({ where: { product_id: id } }),
    ]);

    return NextResponse.json({
      success: true,
      before: {
        options: optionsBefore,
        variations: variationsBefore,
        product_1688_info: infoBefore,
      },
      after: {
        options: optionsAfter,
        variations: variationsAfter,
        product_1688_info: infoAfter,
      },
    });
  } catch (err: any) {
    console.error("Error refreshing product:", err);

    if (err.name === "AbortError") {
      return NextResponse.json(
        { error: "Backend request timed out" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Failed to refresh product data" },
      { status: 500 }
    );
  }
}
