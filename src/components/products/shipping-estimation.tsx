"use client";

import { Plane, Ship, AlertTriangle, TrendingUp, Receipt } from "lucide-react";

interface ShippingEstimationProps {
  estimation: {
    hasDimensions: boolean;
    status: string;
    product: {
      weight: number | null;
      length: number | null;
      width: number | null;
      height: number | null;
      usedWeight: number;
      usedLength: number;
      usedWidth: number;
      usedHeight: number;
    };
    rates: {
      airRate: number;
      airRateSource: string;
      seaRate: number;
      seaRateSource: string;
      sourceCategory: string | null;
    };
    air: {
      baseCost: number;
      surcharge: number;
      total: number;
    };
    sea: {
      cbm: number;
      tons: number;
      chargeable: number;
      chargedBy: string;
      baseCost: number;
      surcharge: number;
      total: number;
    };
    surchargePercent: number;
    tax: {
      air: number;
      sea: number;
      minQtyAir: number | null;
      minQtySea: number | null;
    };
  };
}

export function ShippingEstimation({ estimation }: ShippingEstimationProps) {
  const { product: dims, rates, air, sea, surchargePercent, tax, status } = estimation;

  return (
    <div className="space-y-4">
      {/* Estimation warning */}
      {status === "estimated" && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-medium text-amber-800 dark:text-amber-300">
              Estimated — product missing dimensions
            </span>
            <p className="mt-0.5 text-amber-700/80 dark:text-amber-400/70">
              Using fallback: {dims.usedWeight}kg, {(dims.usedLength * 100).toFixed(0)}×{(dims.usedWidth * 100).toFixed(0)}×{(dims.usedHeight * 100).toFixed(0)}cm
            </p>
          </div>
        </div>
      )}

      {/* Dimensions used */}
      {status === "calculated" && (
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <DimBox label="Weight" value={`${dims.usedWeight} kg`} />
          <DimBox label="L" value={`${(dims.usedLength * 100).toFixed(1)} cm`} />
          <DimBox label="W" value={`${(dims.usedWidth * 100).toFixed(1)} cm`} />
          <DimBox label="H" value={`${(dims.usedHeight * 100).toFixed(1)} cm`} />
        </div>
      )}

      {/* Air vs Sea comparison */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Air */}
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center gap-2">
            <Plane className="h-4 w-4 text-sky-500" />
            <span className="text-sm font-semibold">By Air</span>
          </div>
          <div className="space-y-1 text-sm">
            <Row
              label={`${dims.usedWeight}kg × $${rates.airRate}/kg`}
              value={`$${air.baseCost.toFixed(2)}`}
            />
            {air.surcharge > 0 && (
              <Row
                label={`Surcharge (${surchargePercent}%)`}
                value={`+$${air.surcharge.toFixed(2)}`}
                muted
              />
            )}
            <div className="border-t pt-1 mt-1">
              <Row
                label="Shipping / unit"
                value={`$${air.total.toFixed(2)}`}
                bold
              />
            </div>
            {tax.air > 0 && (
              <Row
                label={taxLabel("air", tax.minQtyAir)}
                value={`+$${tax.air.toFixed(2)}`}
                muted
              />
            )}
          </div>
        </div>

        {/* Sea */}
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center gap-2">
            <Ship className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold">By Sea (CBM)</span>
          </div>
          <div className="space-y-1 text-sm">
            <Row
              label={`CBM: ${sea.cbm.toFixed(6)}`}
              value=""
              muted
            />
            <Row
              label={`Tons: ${sea.tons.toFixed(6)}`}
              value=""
              muted
            />
            <Row
              label={`Charged by ${sea.chargedBy}`}
              value={`${sea.chargeable.toFixed(6)} × $${rates.seaRate}`}
              muted
            />
            <Row
              label="Base cost"
              value={`$${sea.baseCost.toFixed(2)}`}
            />
            {sea.surcharge > 0 && (
              <Row
                label={`Surcharge (${surchargePercent}%)`}
                value={`+$${sea.surcharge.toFixed(2)}`}
                muted
              />
            )}
            <div className="border-t pt-1 mt-1">
              <Row
                label="Shipping / unit"
                value={`$${sea.total.toFixed(2)}`}
                bold
              />
            </div>
            {tax.sea > 0 && (
              <Row
                label={taxLabel("sea", tax.minQtySea)}
                value={`+$${tax.sea.toFixed(2)}`}
                muted
              />
            )}
          </div>
        </div>
      </div>

      {/* Rate sources */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>
            Air rate: <strong>${rates.airRate}/kg</strong>{" "}
            ({rates.airRateSource === "category" ? `from category` : "global default"})
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>
            Sea rate: <strong>${rates.seaRate}/CBM</strong>{" "}
            ({rates.seaRateSource === "category" ? `from category` : "global default"})
          </span>
        </div>
        {rates.sourceCategory && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Receipt className="h-3 w-3" />
            <span>Rates inherited from: <strong>{rates.sourceCategory}</strong></span>
          </div>
        )}
        {surchargePercent > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Receipt className="h-3 w-3" />
            <span>Surcharge: <strong>{surchargePercent}%</strong> of product price (USD)</span>
          </div>
        )}
      </div>
    </div>
  );
}

function taxLabel(method: string, minQty: number | null): string {
  if (minQty) return `Tax / unit (min ${minQty} qty)`;
  return "Tax / unit";
}

function DimBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-1.5 text-center">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-medium">{value}</span>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  let labelClass = "";
  if (bold) labelClass = "font-semibold";
  else if (muted) labelClass = "text-muted-foreground";

  let valueClass = "font-mono";
  if (bold) valueClass += " font-bold";
  if (muted) valueClass += " text-muted-foreground";

  return (
    <div className="flex items-center justify-between gap-2">
      <span className={labelClass}>
        {label}
      </span>
      {value && (
        <span className={valueClass}>
          {value}
        </span>
      )}
    </div>
  );
}
