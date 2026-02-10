"use client";

import { useState } from "react";
import { Save, Loader2, X, Upload } from "lucide-react";
import { resolveImageUrl } from "@/lib/image-url";

interface CategoryData {
  id: number;
  category_name: string;
  category_name_en: string | null;
  category_name_zh: string | null;
  main_image: string | null;
  display: boolean;
  show_in_navbar: number | null;
  tax_air: number | null;
  tax_sea: number | null;
  tax_min_qty_air: number | null;
  tax_min_qty_sea: number | null;
  cbm_rate: number | null;
  shipping_surcharge_percent: number | null;
  air_shipping_rate: number | null;
  sync_enabled: boolean | null;
}

interface CategoryEditFormProps {
  category: CategoryData;
  onSaved: (updated: CategoryData) => void;
  onCancel: () => void;
}

export function CategoryEditForm({
  category,
  onSaved,
  onCancel,
}: CategoryEditFormProps) {
  const [form, setForm] = useState({
    category_name: category.category_name,
    category_name_en: category.category_name_en || "",
    category_name_zh: category.category_name_zh || "",
    main_image: category.main_image || "",
    display: category.display,
    show_in_navbar: category.show_in_navbar ?? 0,
    tax_air: category.tax_air ?? "",
    tax_sea: category.tax_sea ?? "",
    tax_min_qty_air: category.tax_min_qty_air ?? "",
    tax_min_qty_sea: category.tax_min_qty_sea ?? "",
    cbm_rate: category.cbm_rate ?? "",
    shipping_surcharge_percent: category.shipping_surcharge_percent ?? "",
    air_shipping_rate: category.air_shipping_rate ?? "",
    sync_enabled: category.sync_enabled ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        category_name: form.category_name,
        category_name_en: form.category_name_en || null,
        category_name_zh: form.category_name_zh || null,
        main_image: form.main_image || null,
        display: form.display,
        show_in_navbar: form.show_in_navbar,
        sync_enabled: form.sync_enabled,
      };

      // Numeric shipping fields
      const numericFields = [
        "tax_air",
        "tax_sea",
        "tax_min_qty_air",
        "tax_min_qty_sea",
        "cbm_rate",
        "shipping_surcharge_percent",
        "air_shipping_rate",
      ] as const;

      for (const field of numericFields) {
        const val = form[field];
        body[field] =
          val === "" || val === null || val === undefined
            ? null
            : Number(val);
      }

      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const data = await res.json();
      onSaved(data.category);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-sm font-medium text-foreground mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div>
        <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">
          Basic Information
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Name (Original)</label>
            <input
              className={inputClass}
              value={form.category_name}
              onChange={(e) =>
                setForm({ ...form, category_name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className={labelClass}>Name (English)</label>
            <input
              className={inputClass}
              value={form.category_name_en}
              onChange={(e) =>
                setForm({ ...form, category_name_en: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass}>Name (Chinese)</label>
            <input
              className={inputClass}
              value={form.category_name_zh}
              onChange={(e) =>
                setForm({ ...form, category_name_zh: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass}>Main Image URL</label>
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={form.main_image}
                onChange={(e) =>
                  setForm({ ...form, main_image: e.target.value })
                }
                placeholder="https://..."
              />
              {form.main_image && (
                <img
                  src={resolveImageUrl(form.main_image) || undefined}
                  alt=""
                  className="h-9 w-9 rounded border object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Visibility */}
      <div>
        <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">
          Visibility
        </h4>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.display}
              onChange={(e) =>
                setForm({ ...form, display: e.target.checked })
              }
              className="h-4 w-4 rounded border"
            />
            Visible on website
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.show_in_navbar === 1}
              onChange={(e) =>
                setForm({
                  ...form,
                  show_in_navbar: e.target.checked ? 1 : 0,
                })
              }
              className="h-4 w-4 rounded border"
            />
            Show in navbar
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.sync_enabled}
              onChange={(e) =>
                setForm({ ...form, sync_enabled: e.target.checked })
              }
              className="h-4 w-4 rounded border"
            />
            Sync enabled
          </label>
        </div>
      </div>

      {/* Shipping */}
      <div>
        <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">
          Shipping & Tax
        </h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Air Tax Rate</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.tax_air}
              onChange={(e) => setForm({ ...form, tax_air: e.target.value as unknown as number })}
              placeholder="e.g. 0.15"
            />
          </div>
          <div>
            <label className={labelClass}>Sea Tax Rate</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.tax_sea}
              onChange={(e) => setForm({ ...form, tax_sea: e.target.value as unknown as number })}
              placeholder="e.g. 0.10"
            />
          </div>
          <div>
            <label className={labelClass}>Air Shipping Rate</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.air_shipping_rate}
              onChange={(e) =>
                setForm({ ...form, air_shipping_rate: e.target.value as unknown as number })
              }
              placeholder="e.g. 5.00"
            />
          </div>
          <div>
            <label className={labelClass}>CBM Rate</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.cbm_rate}
              onChange={(e) =>
                setForm({ ...form, cbm_rate: e.target.value as unknown as number })
              }
              placeholder="e.g. 150.00"
            />
          </div>
          <div>
            <label className={labelClass}>Shipping Surcharge %</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.shipping_surcharge_percent}
              onChange={(e) =>
                setForm({
                  ...form,
                  shipping_surcharge_percent: e.target.value as unknown as number,
                })
              }
              placeholder="e.g. 5"
            />
          </div>
          <div>
            <label className={labelClass}>Min Qty Air</label>
            <input
              type="number"
              className={inputClass}
              value={form.tax_min_qty_air}
              onChange={(e) =>
                setForm({ ...form, tax_min_qty_air: e.target.value as unknown as number })
              }
            />
          </div>
          <div>
            <label className={labelClass}>Min Qty Sea</label>
            <input
              type="number"
              className={inputClass}
              value={form.tax_min_qty_sea}
              onChange={(e) =>
                setForm({ ...form, tax_min_qty_sea: e.target.value as unknown as number })
              }
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
