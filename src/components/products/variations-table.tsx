"use client";

import { resolveDisplayColor } from "@/lib/color-utils";

interface Variation {
  id: number;
  variation_name: string;
  price: number;
  provider_price: number;
  stock: number | null;
}

interface VariationsTableProps {
  variations: Variation[];
  exchangeRate: number;
  markupPercent: number;
}

/**
 * Parse variation_name like "Color:Little Red;Size:36" into segments
 * and resolve colors for color-like property names.
 */
function parseVariationName(name: string): { label: string; value: string; color: string | null }[] {
  return name.split(";").filter(Boolean).map((segment) => {
    const [label, value] = segment.split(":").map((s) => s.trim());
    const isColorProp =
      label &&
      (label.toLowerCase().includes("color") ||
        label.toLowerCase().includes("colour") ||
        label.includes("颜色"));
    const color = isColorProp && value ? resolveDisplayColor(null, value, true) : null;
    return { label: label || "", value: value || "", color };
  });
}

export function VariationsTable({
  variations,
  exchangeRate,
  markupPercent,
}: VariationsTableProps) {
  if (variations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No variations available.</p>
    );
  }

  const computeUSD = (cny: number | null) => {
    if (cny === null) return null;
    return Math.round(cny * exchangeRate * (1 + markupPercent / 100) * 100) / 100;
  };

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">Variation</th>
            <th className="px-3 py-2 text-right font-medium">Origin (CNY)</th>
            <th className="px-3 py-2 text-right font-medium">Provider (CNY)</th>
            <th className="px-3 py-2 text-right font-medium">App Price (USD)</th>
            <th className="px-3 py-2 text-right font-medium">Stock</th>
          </tr>
        </thead>
        <tbody>
          {variations.map((v) => {
            const appPrice = computeUSD(v.price);
            const segments = parseVariationName(v.variation_name);

            return (
              <tr key={v.id} className="border-b last:border-0">
                <td className="max-w-[280px] px-3 py-2">
                  {segments.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {segments.map((seg, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-xs text-muted-foreground"
                        >
                          {seg.color && (
                            <span
                              className="inline-block h-3 w-3 rounded-full border flex-shrink-0"
                              style={{ backgroundColor: seg.color }}
                            />
                          )}
                          <span className="font-medium">{seg.label}:</span> {seg.value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span>{v.variation_name}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  ¥{v.price.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  ¥{v.provider_price.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {appPrice !== null ? `$${appPrice.toFixed(2)}` : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {v.stock !== null ? v.stock : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
