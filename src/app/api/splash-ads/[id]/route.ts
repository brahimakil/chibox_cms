/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/splash-ads/[id] — Get single splash ad
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ad = await prisma.splash_ads.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!ad) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ad: {
        ...ad,
        skip_duration: Number(ad.skip_duration),
        total_duration: Number(ad.total_duration),
        view_count: Number(ad.view_count),
        click_count: Number(ad.click_count),
        skip_count: Number(ad.skip_count),
        is_active: Boolean(ad.is_active),
      },
    });
  } catch (error) {
    console.error("Error fetching splash ad:", error);
    return NextResponse.json(
      { error: "Failed to fetch splash ad" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/splash-ads/[id] — Update splash ad
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: any = { updated_at: new Date() };
    const allowedFields = [
      "title",
      "media_type",
      "media_url",
      "thumbnail_url",
      "link_type",
      "link_value",
      "skip_duration",
      "total_duration",
      "is_active",
      "start_date",
      "end_date",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "start_date" || field === "end_date") {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    await prisma.splash_ads.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating splash ad:", error);
    return NextResponse.json(
      { error: "Failed to update splash ad" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/splash-ads/[id] — Delete splash ad
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.splash_ads.delete({ where: { id: parseInt(id, 10) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting splash ad:", error);
    return NextResponse.json(
      { error: "Failed to delete splash ad" },
      { status: 500 }
    );
  }
}
