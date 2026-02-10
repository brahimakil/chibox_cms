"use client";

import { useState } from "react";
import { Save, Loader2, Package, Ruler } from "lucide-react";

interface DimensionsFormProps {
  product: {
    product_weight: number | null;
    length_m: number | null;
    width_m: number | null;
    height_m: number | null;
  };
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

export function DimensionsForm({ product, onSave }: DimensionsFormProps) {
  const [form, setForm] = useState({
    product_weight: product.product_weight ?? "",
    length_m: product.length_m ?? "",
    width_m: product.width_m ?? "",
    height_m: product.height_m ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {};
      for (const key of ["product_weight", "length_m", "width_m", "height_m"]) {
        const val = form[key as keyof typeof form];
        data[key] = val === "" ? null : Number(val);
      }
      await onSave(data);
      setDirty(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Weight */}
      <div>
        <label htmlFor="dim-weight" className="mb-1.5 flex items-center gap-2 text-sm font-medium">
          <Package className="h-4 w-4 text-muted-foreground" />
          Weight (kg)
        </label>
        <input
          id="dim-weight"
          type="number"
          step="0.01"
          value={form.product_weight}
          onChange={(e) => update("product_weight", e.target.value)}
          placeholder="e.g. 0.5"
          className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Dimensions */}
      <div>
        <span className="mb-1.5 flex items-center gap-2 text-sm font-medium">
          <Ruler className="h-4 w-4 text-muted-foreground" />
          Dimensions (meters)
        </span>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="dim-length" className="mb-1 block text-xs text-muted-foreground">
              Length
            </label>
            <input
              id="dim-length"
              type="number"
              step="0.0001"
              value={form.length_m}
              onChange={(e) => update("length_m", e.target.value)}
              placeholder="0.00"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="dim-width" className="mb-1 block text-xs text-muted-foreground">
              Width
            </label>
            <input
              id="dim-width"
              type="number"
              step="0.0001"
              value={form.width_m}
              onChange={(e) => update("width_m", e.target.value)}
              placeholder="0.00"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="dim-height" className="mb-1 block text-xs text-muted-foreground">
              Height
            </label>
            <input
              id="dim-height"
              type="number"
              step="0.0001"
              value={form.height_m}
              onChange={(e) => update("height_m", e.target.value)}
              placeholder="0.00"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {dirty && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Dimensions
        </button>
      )}
    </div>
  );
}
