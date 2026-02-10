"use client";

import { resolveDisplayColor } from "@/lib/color-utils";
import { resolveImageUrl } from "@/lib/image-url";

interface Variant {
  id: string;
  sku_id: string;
  spec_id?: string | null;
  variant_name: string | null;
  props_ids: string | null;
  props_names: string | null;
  origin_price: number | null;
  sale_price: number | null;
  previous_origin_price?: number | null;
  stock: number | null;
  sale_count: number | null;
  variant_image: string | null;
  status: string | null;
  sort_order?: number | null;
}

interface VariantsTableProps {
  variants: Variant[];
  exchangeRate: number;
  markupPercent: number;
}

/**
 * Parse props_names like "颜色:红色;尺寸:XL" into segments
 * and resolve colors for color-like property names.
 */
function parsePropsWithColor(propsNames: string): { label: string; value: string; color: string | null }[] {
  return propsNames.split(";").filter(Boolean).map((segment) => {
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

export function VariantsTable({
  variants,
  exchangeRate,
  markupPercent,
}: VariantsTableProps) {
  if (variants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No variants available.</p>
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
            <th className="px-3 py-2 text-left font-medium">Image</th>
            <th className="px-3 py-2 text-left font-medium">Name / Props</th>
            <th className="px-3 py-2 text-left font-medium">SKU</th>
            <th className="px-3 py-2 text-right font-medium">Origin (CNY)</th>
            <th className="px-3 py-2 text-right font-medium">App Price (USD)</th>
            <th className="px-3 py-2 text-right font-medium">Stock</th>
            <th className="px-3 py-2 text-right font-medium">Sold</th>
            <th className="px-3 py-2 text-center font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => {
            const appPrice = computeUSD(v.origin_price);
            const prevAppPrice = v.previous_origin_price != null
              ? computeUSD(v.previous_origin_price)
              : null;
            const propSegments = v.props_names
              ? parsePropsWithColor(v.props_names)
              : [];

            return (
              <tr key={v.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  {v.variant_image ? (
                    <img
                      src={resolveImageUrl(v.variant_image) || ""}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                </td>
                <td className="max-w-[220px] px-3 py-2">
                  <div className="font-medium">
                    {v.variant_name || "—"}
                  </div>
                  {propSegments.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {propSegments.map((seg, i) => (
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
                          <span>{seg.label}: {seg.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{v.sku_id}</td>
                <td className="px-3 py-2 text-right">
                  <div>
                    {v.origin_price !== null ? `¥${v.origin_price.toFixed(2)}` : "—"}
                  </div>
                  {v.previous_origin_price != null &&
                    v.previous_origin_price !== v.origin_price && (
                      <div className="text-xs text-muted-foreground line-through">
                        ¥{v.previous_origin_price.toFixed(2)}
                      </div>
                    )}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  <div>
                    {appPrice !== null ? `$${appPrice.toFixed(2)}` : "—"}
                  </div>
                  {prevAppPrice != null && prevAppPrice !== appPrice && (
                    <div className="text-xs text-muted-foreground line-through">
                      ${prevAppPrice.toFixed(2)}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{v.stock ?? "—"}</td>
                <td className="px-3 py-2 text-right">{v.sale_count ?? 0}</td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      v.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {v.status || "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
