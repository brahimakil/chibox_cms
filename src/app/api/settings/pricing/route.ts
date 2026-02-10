import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [settings, exchangeRateRow] = await Promise.all([
      prisma.general_settings.findFirst({
        select: { id: true, price_markup_percentage: true },
      }),
      prisma.ex_currency.findFirst({
        where: { from_currency: 9, to_currency: 6 },
        select: { id: true, rate: true },
      }),
    ]);

    return NextResponse.json({
      markupPercent: settings?.price_markup_percentage
        ? Number(settings.price_markup_percentage)
        : 15,
      exchangeRate: exchangeRateRow?.rate ?? 0.14,
      settingsId: settings?.id ?? null,
      exchangeRateId: exchangeRateRow?.id ?? null,
    });
  } catch (error) {
    console.error("Error fetching pricing settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { markupPercent, exchangeRate } = body;

    const results: string[] = [];

    if (markupPercent !== undefined) {
      await prisma.general_settings.updateMany({
        where: { id: { gt: 0 } },
        data: { price_markup_percentage: markupPercent },
      });
      results.push(`Markup updated to ${markupPercent}%`);
    }

    if (exchangeRate !== undefined) {
      // Update existing or create new
      const existing = await prisma.ex_currency.findFirst({
        where: { from_currency: 9, to_currency: 6 },
      });

      if (existing) {
        await prisma.ex_currency.update({
          where: { id: existing.id },
          data: { rate: exchangeRate },
        });
      } else {
        await prisma.ex_currency.create({
          data: {
            from_currency: 9,
            to_currency: 6,
            rate: exchangeRate,
            created_by: 1,
          },
        });
      }
      results.push(`Exchange rate updated to ${exchangeRate}`);
    }

    return NextResponse.json({ success: true, messages: results });
  } catch (error) {
    console.error("Error updating pricing settings:", error);
    return NextResponse.json(
      { error: "Failed to update pricing settings" },
      { status: 500 }
    );
  }
}
