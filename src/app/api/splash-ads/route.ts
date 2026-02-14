/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/splash-ads — List all splash ads
 */
export async function GET() {
  try {
    const ads = (await prisma.$queryRawUnsafe(`
      SELECT id, title, media_type, media_url, thumbnail_url, link_type, link_value,
             skip_duration, total_duration, is_active, start_date, end_date,
             view_count, click_count, skip_count, created_at, updated_at
      FROM splash_ads ORDER BY id DESC
    `)) as any[];

    const formatted = ads.map((a: any) => ({
      id: Number(a.id),
      title: a.title,
      media_type: a.media_type,
      media_url: a.media_url,
      thumbnail_url: a.thumbnail_url,
      link_type: a.link_type,
      link_value: a.link_value,
      skip_duration: Number(a.skip_duration),
      total_duration: Number(a.total_duration),
      is_active: Boolean(a.is_active),
      start_date: a.start_date,
      end_date: a.end_date,
      view_count: Number(a.view_count),
      click_count: Number(a.click_count),
      skip_count: Number(a.skip_count),
      created_at: a.created_at,
      updated_at: a.updated_at,
    }));

    return NextResponse.json({ ads: formatted, total: formatted.length });
  } catch (error) {
    console.error("Error fetching splash ads:", error);
    return NextResponse.json(
      { error: "Failed to fetch splash ads" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/splash-ads — Create a new splash ad
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const ad = await prisma.splash_ads.create({
      data: {
        title: body.title || "",
        media_type: body.media_type || "image",
        media_url: body.media_url || "",
        thumbnail_url: body.thumbnail_url || null,
        link_type: body.link_type || "none",
        link_value: body.link_value || null,
        skip_duration: body.skip_duration ?? 5,
        total_duration: body.total_duration ?? 10,
        is_active: body.is_active ?? false,
        start_date: body.start_date ? new Date(body.start_date) : null,
        end_date: body.end_date ? new Date(body.end_date) : null,
        view_count: 0,
        click_count: 0,
        skip_count: 0,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, ad });
  } catch (error) {
    console.error("Error creating splash ad:", error);
    return NextResponse.json(
      { error: "Failed to create splash ad" },
      { status: 500 }
    );
  }
}
