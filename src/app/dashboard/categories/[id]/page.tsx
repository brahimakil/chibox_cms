"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  FolderTree,
  Loader2,
  MapPin,
  Package,
  ShieldAlert,
  Ship,
  Plane,
  ImageOff,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Plus,
} from "lucide-react";
import { CategoryEditForm } from "@/components/categories/category-edit-form";
import { CategoryProductsTable } from "@/components/categories/category-products-table";
import { ImageLightbox } from "@/components/products/image-lightbox";
import { resolveImageUrl } from "@/lib/image-url";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface CategoryDetail {
  id: number;
  category_name: string;
  category_name_en: string | null;
  category_name_zh: string | null;
  slug: string;
  full_path: string | null;
  parent: number | null;
  level: number | null;
  has_children: boolean | null;
  main_image: string | null;
  product_count: number;
  products_in_db: number | null;
  total_products_api: number | null;
  display: boolean;
  show_in_navbar: number | null;
  fully_synced: boolean | null;
  sync_enabled: boolean | null;
  source: string | null;
  source_category_id: string | null;
  order_number: number | null;
  tax_air: number | null;
  tax_sea: number | null;
  tax_min_qty_air: number | null;
  tax_min_qty_sea: number | null;
  cbm_rate: number | null;
  shipping_surcharge_percent: number | null;
  air_shipping_rate: number | null;
  created_at: string;
  updated_at: string;
  last_product_sync: string | null;
  last_category_sync: string | null;
}

interface BreadcrumbItem {
  id: number;
  name: string;
}

interface ChildCategory {
  id: number;
  category_name: string;
  category_name_en: string | null;
  level: number | null;
  product_count: number;
  display: boolean;
  main_image: string | null;
  order_number: number | null;
}

export default function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [children, setChildren] = useState<ChildCategory[]>([]);
  const [isExcluded, setIsExcluded] = useState(false);
  const [excludedReason, setExcludedReason] = useState<string | null>(null);
  const [realProductCount, setRealProductCount] = useState(0);
  const [totalProductsInTree, setTotalProductsInTree] = useState(0);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);

  // Try On Me prompt state
  const [tryonPrompt, setTryonPrompt] = useState<{
    has_prompt: boolean;
    prompt: any;
    inherited: boolean;
    inherited_from_category_id?: number;
    inherited_from_category_name?: string;
  } | null>(null);
  const [tryonLoading, setTryonLoading] = useState(true);

  const openImage = (url: string) => {
    setLightboxImages([url]);
    setLightboxOpen(true);
  };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/categories/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCategory(data.category);
        setBreadcrumb(data.breadcrumb || []);
        setChildren(data.children || []);
        setIsExcluded(data.is_excluded);
        setExcludedReason(data.excluded_reason);
        setRealProductCount(data.real_product_count);
        setTotalProductsInTree(data.total_products_in_tree);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch Try On Me prompt status
  useEffect(() => {
    setTryonLoading(true);
    fetch(`/api/tryon-prompts/by-category/${id}`)
      .then((r) => r.json())
      .then((data) => setTryonPrompt(data))
      .catch(() => setTryonPrompt(null))
      .finally(() => setTryonLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-muted-foreground">Category not found</p>
        <Link
          href="/dashboard/categories"
          className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to categories
        </Link>
      </div>
    );
  }

  const name = category.category_name_en || category.category_name;

  const handleSaved = (updated: any) => {
    setCategory({ ...category, ...updated });
    setEditing(false);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Back + Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/categories"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Categories
        </Link>
        {breadcrumb.map((b) => (
          <span key={b.id} className="flex items-center gap-1 text-muted-foreground">
            <ChevronRight className="h-3 w-3" />
            <Link
              href={`/dashboard/categories/${b.id}`}
              className="hover:text-foreground hover:underline"
            >
              {b.name}
            </Link>
          </span>
        ))}
        <span className="flex items-center gap-1 text-foreground font-medium">
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          {name}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Category Image */}
          {category.main_image ? (
            <button
              onClick={() => openImage(resolveImageUrl(category.main_image) || category.main_image!)}
              className="shrink-0 overflow-hidden rounded-xl border hover:ring-2 hover:ring-ring cursor-pointer"
            >
              <img
                src={resolveImageUrl(category.main_image) || undefined}
                alt={name}
                className="h-20 w-20 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </button>
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border bg-muted">
              <ImageOff className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}

          <div>
            <h1 className="text-2xl font-bold">{name}</h1>
            {category.category_name_en &&
              category.category_name !== category.category_name_en && (
                <p className="text-sm text-muted-foreground">
                  {category.category_name}
                </p>
              )}
            <p className="mt-1 text-sm text-muted-foreground font-mono">
              /{category.slug}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* Badges */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  isExcluded
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                }`}
              >
                <ShieldAlert className="h-3 w-3" />
                {isExcluded ? "Excluded" : "Not Excluded"}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                Level {category.level ?? 0}
              </span>

              {category.source && (
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  {category.source}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setEditing(!editing)}
          className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Edit className="h-4 w-4" />
          {editing ? "Cancel Edit" : "Edit Category"}
        </button>
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <CategoryEditForm
            category={category}
            onSaved={handleSaved}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      {/* Info Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard
          icon={<Package className="h-5 w-5 text-blue-500" />}
          label="Direct Products"
          value={realProductCount.toLocaleString()}
        />
        <InfoCard
          icon={<FolderTree className="h-5 w-5 text-amber-500" />}
          label="Products in Tree"
          value={totalProductsInTree.toLocaleString()}
          sub={`${children.length} direct children`}
        />
        <InfoCard
          icon={<MapPin className="h-5 w-5 text-purple-500" />}
          label="DB Product Count"
          value={(category.products_in_db ?? 0).toLocaleString()}
          sub={`API: ${(category.total_products_api ?? 0).toLocaleString()}`}
        />
      </div>

      {/* Details Panel */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Info */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Category Details
          </h3>
          <div className="grid gap-2 text-sm">
            <DetailRow label="ID" value={category.id} />
            <DetailRow label="Name" value={category.category_name} />
            <DetailRow label="English Name" value={category.category_name_en || "—"} />
            <DetailRow label="Chinese Name" value={category.category_name_zh || "—"} />
            <DetailRow label="Slug" value={category.slug} mono />
            <DetailRow label="Full Path" value={category.full_path || "—"} mono />
            <DetailRow label="Source ID" value={category.source_category_id || "—"} mono />
            <DetailRow label="Order" value={category.order_number ?? "—"} />
            <DetailRow
              label="Has Children"
              value={category.has_children ? "Yes" : "No"}
            />

            {isExcluded && excludedReason && (
              <DetailRow label="Excluded Reason" value={excludedReason} />
            )}
            <DetailRow label="Created" value={formatDate(category.created_at)} />
            <DetailRow label="Updated" value={formatDate(category.updated_at)} />

          </div>
        </div>

        {/* Shipping Info */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Shipping & Tax
          </h3>
          <div className="grid gap-2 text-sm">
            <DetailRow
              label="Air Tax Rate"
              value={
                category.tax_air != null ? (
                  <span className="flex items-center gap-1">
                    <Plane className="h-3 w-3 text-blue-400" />
                    {category.tax_air}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <DetailRow
              label="Sea Tax Rate"
              value={
                category.tax_sea != null ? (
                  <span className="flex items-center gap-1">
                    <Ship className="h-3 w-3 text-cyan-500" />
                    {category.tax_sea}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <DetailRow
              label="Air Shipping Rate"
              value={category.air_shipping_rate ?? "—"}
            />
            <DetailRow label="CBM Rate" value={category.cbm_rate ?? "—"} />
            <DetailRow
              label="Shipping Surcharge %"
              value={
                category.shipping_surcharge_percent != null
                  ? `${category.shipping_surcharge_percent}%`
                  : "—"
              }
            />
            <DetailRow
              label="Min Qty (Air)"
              value={category.tax_min_qty_air ?? "—"}
            />
            <DetailRow
              label="Min Qty (Sea)"
              value={category.tax_min_qty_sea ?? "—"}
            />
          </div>
        </div>
      </div>

      {/* AI Try On Me Section */}
      {!tryonLoading && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI Try On Me
          </h3>

          {tryonPrompt?.has_prompt ? (
            <div className="space-y-3">
              {/* Inherited badge */}
              {tryonPrompt.inherited && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 dark:border-blue-900 dark:bg-blue-950/30">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    ↗️ Inherited from parent category:{" "}
                    <Link
                      href={`/dashboard/categories/${tryonPrompt.inherited_from_category_id}`}
                      className="font-medium underline hover:text-blue-900 dark:hover:text-blue-200"
                    >
                      {tryonPrompt.inherited_from_category_name}
                    </Link>
                  </p>
                </div>
              )}

              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    tryonPrompt.prompt.is_active
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  }`}
                >
                  {tryonPrompt.prompt.is_active ? "Active" : "Inactive"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Prompt #{tryonPrompt.prompt.id}
                </span>
              </div>

              {/* Prompt preview */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed max-h-32 overflow-auto">
                {tryonPrompt.prompt.prompt_template}
              </div>

              {/* Edit button — opens edit page in new tab */}
              <a
                href={`/dashboard/tryon-prompts/${tryonPrompt.prompt.id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Prompt
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No AI try-on prompt configured for this category. Products here
                won&apos;t show the &quot;Try On Me&quot; button in the mobile app.
              </p>
              <a
                href={`/dashboard/tryon-prompts/new?category_id=${category.id}&category_name=${encodeURIComponent(name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Prompt
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Children Categories */}
      {children.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Sub-Categories ({children.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/dashboard/categories/${child.id}`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                {child.main_image ? (
                  <img
                    src={resolveImageUrl(child.main_image) || undefined}
                    alt=""
                    className="h-10 w-10 rounded-md object-cover border shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted shrink-0">
                    <FolderTree className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {child.category_name_en || child.category_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {child.product_count.toLocaleString()} products
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <CategoryProductsTable categoryId={category.id} />
      </div>

      <ImageLightbox
        images={lightboxImages}
        initialIndex={0}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}

/* ─── Helper Components ─── */

function InfoCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={`text-right ${mono ? "font-mono text-xs" : ""} break-all`}
      >
        {value}
      </span>
    </div>
  );
}
