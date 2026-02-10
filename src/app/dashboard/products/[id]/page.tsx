"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  Loader2,
  Package,
  ShoppingCart,
  Store,
  Tag,
  Image as ImageIcon,
  DollarSign,
  Layers,
  Palette,
  Ruler,
  Info,
  ExternalLink,
  Save,
  Truck,
  ClipboardList,
} from "lucide-react";
import { ImageLightbox } from "@/components/products/image-lightbox";
import { ProductStatusBadge, StockBadge } from "@/components/products/product-status-badge";
import { VariantsTable } from "@/components/products/variants-table";
import { OptionsDisplay } from "@/components/products/options-display";
import { CategorySelect } from "@/components/products/category-select";
import { DimensionsForm } from "@/components/products/dimensions-form";
import { ShippingEstimation } from "@/components/products/shipping-estimation";
import { SpecificationsTable } from "@/components/products/specifications-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { resolveImageUrl } from "@/lib/image-url";

/* eslint-disable @typescript-eslint/no-explicit-any */

function buildImageGallery(product: any): string[] {
  const images: string[] = [];
  if (product.main_image) images.push(product.main_image);
  if (product.images_json) {
    try {
      const parsed = JSON.parse(product.images_json);
      if (Array.isArray(parsed)) {
        for (const url of parsed) {
          if (typeof url === "string" && url !== product.main_image) {
            images.push(url);
          }
        }
      }
    } catch {
      // ignore malformed JSON
    }
  }
  return images;
}

function computeAppPrice(product: any, exchangeRate: number, markupPercent: number): { originPrice: number | null; convertedUSD: number | null; appPrice: number | null } {
  const originPrice = product.origin_price ? Number(product.origin_price) : null;
  const convertedUSD = originPrice ? originPrice * exchangeRate : null;
  let appPrice: number | null = null;
  if (convertedUSD) {
    appPrice = Math.round(convertedUSD * (1 + markupPercent / 100) * 100) / 100;
  } else if (product.product_price) {
    appPrice = Math.round(Number(product.product_price) * 100) / 100;
  }
  return { originPrice, convertedUSD, appPrice };
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Category editing
  const [categories, setCategories] = useState<any[]>([]);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryDirty, setCategoryDirty] = useState(false);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    fetchProduct();
    fetchCategories();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) throw new Error("Product not found");
      const json = await res.json();
      setData(json);
      setEditCategoryId(json.product.category_id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      setCategories(json.categories || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCategorySave = async () => {
    setCategorySaving(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: editCategoryId }),
      });
      if (!res.ok) throw new Error("Save failed");
      setCategoryDirty(false);
      fetchProduct();
    } catch (err) {
      console.error(err);
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDimensionsSave = async (formData: Record<string, unknown>) => {
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) throw new Error("Save failed");
    fetchProduct();
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/dashboard/products");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-lg font-medium text-destructive">
          {error || "Product not found"}
        </p>
        <Link
          href="/dashboard/products"
          className="text-sm text-primary hover:underline"
        >
          ← Back to products
        </Link>
      </div>
    );
  }

  const { product, category, options, store, timesSold, pricing, shippingEstimation } =
    data;
  const { markupPercent, exchangeRate } = pricing;

  const images = buildImageGallery(product);
  const displayName =
    product.display_name || product.original_name || product.product_name || product.product_code;
  const { originPrice, convertedUSD, appPrice } = computeAppPrice(product, exchangeRate, markupPercent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/products"
            className="mt-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold leading-tight sm:text-2xl line-clamp-2">
              {displayName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{product.product_code}</span>
              <ProductStatusBadge source={product.source} />
              <StockBadge outOfStock={product.out_of_stock} />
              <span className="flex items-center gap-1">
                <ShoppingCart className="h-3.5 w-3.5" />
                {timesSold} sold
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setDeleteOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Images & Media */}
          <Section icon={ImageIcon} title="Images & Media">
            {images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {images.map((url, i) => (
                  <button
                    key={`img-${url.slice(-20)}`}
                    onClick={() => {
                      setLightboxImages(images);
                      setLightboxIndex(i);
                      setLightboxOpen(true);
                    }}
                    className="aspect-square overflow-hidden rounded-lg border hover:ring-2 hover:ring-ring"
                  >
                    <img
                      src={resolveImageUrl(url) || url}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No images</p>
            )}
            {product.video_url && (
              <div className="mt-3">
                <a
                  href={product.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Video
                </a>
              </div>
            )}
          </Section>

          {/* General Info */}
          <Section icon={Info} title="General Information">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow label="Product Code" value={product.product_code} />
              <InfoRow label="Display Name" value={product.display_name || "—"} />
              <InfoRow label="Original Name" value={product.original_name || "—"} />
              <InfoRow label="Source" value={product.source || "manual"} />
              <InfoRow label="Model" value={product.model || "—"} />
              <InfoRow
                label="Created"
                value={new Date(product.created_at).toLocaleDateString()}
              />
              <InfoRow
                label="Last Updated"
                value={new Date(product.updated_at).toLocaleDateString()}
              />
              <InfoRow
                label="Views"
                value={product.view_count?.toLocaleString() || "0"}
              />
            </div>
            {product.description && (
              <div className="mt-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Description
                </span>
                <div
                  className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-3 text-sm"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
          </Section>

          {/* Pricing Breakdown */}
          <Section icon={DollarSign} title="Pricing">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PriceCard
                label="Origin Price"
                value={originPrice ? `¥${originPrice.toFixed(2)}` : "—"}
                sublabel="CNY (from 1688)"
              />
              <PriceCard
                label="Converted"
                value={convertedUSD ? `$${convertedUSD.toFixed(4)}` : "—"}
                sublabel={`Rate: ${exchangeRate}`}
              />
              <PriceCard
                label="Markup"
                value={`+${markupPercent}%`}
                sublabel="Global markup"
              />
              <PriceCard
                label="App Price"
                value={appPrice ? `$${appPrice.toFixed(2)}` : "—"}
                sublabel="Shown to customers"
                highlight
              />
            </div>
          </Section>

          {/* Specifications */}
          {product.product_1688_info?.[0]?.product_props && (
            <Section icon={ClipboardList} title="Specifications">
              <SpecificationsTable
                productPropsJson={product.product_1688_info[0].product_props}
              />
            </Section>
          )}

          {/* Options */}
          {options && options.length > 0 && (
            <Section icon={Palette} title="Product Options">
              <OptionsDisplay options={options} />
            </Section>
          )}

          {/* Variants */}
          {product.product_variant && product.product_variant.length > 0 && (
            <Section icon={Layers} title={`Variants (${product.product_variant.length})`}>
              <VariantsTable
                variants={product.product_variant}
                exchangeRate={exchangeRate}
                markupPercent={markupPercent}
              />
            </Section>
          )}
        </div>

        {/* Right Column - Editable & Info Panels */}
        <div className="space-y-6">
          {/* Categorization - EDITABLE */}
          <Section icon={Tag} title="Category">
            <CategorySelect
              categories={categories}
              value={editCategoryId}
              onChange={(val) => {
                setEditCategoryId(val);
                setCategoryDirty(val !== product.category_id);
              }}
            />
            {category && !categoryDirty && (
              <p className="mt-2 text-xs text-muted-foreground">
                {category.full_path || category.category_name}
              </p>
            )}
            {categoryDirty && (
              <button
                onClick={handleCategorySave}
                disabled={categorySaving}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {categorySaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Category
              </button>
            )}
          </Section>

          {/* Dimensions - EDITABLE */}
          <Section icon={Ruler} title="Dimensions">
            <DimensionsForm product={product} onSave={handleDimensionsSave} />
          </Section>

          {/* Shipping Estimation - READ ONLY */}
          {shippingEstimation && (
            <Section icon={Truck} title="Shipping Estimation">
              <ShippingEstimation estimation={shippingEstimation} />
            </Section>
          )}

          {/* Store Info */}
          {(store || product.shop_company_name) && (
            <Section icon={Store} title="Shop / Store">
              <div className="space-y-2">
                {store && (
                  <InfoRow label="Store" value={store.store_name} />
                )}
                {product.shop_company_name && (
                  <InfoRow label="Company" value={product.shop_company_name} />
                )}
                {product.shop_login_id && (
                  <InfoRow label="Login ID" value={product.shop_login_id} />
                )}
                {product.shop_is_super_factory && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    Super Factory
                  </span>
                )}
                {product.shop_repurchase_rate && (
                  <InfoRow
                    label="Repurchase Rate"
                    value={product.shop_repurchase_rate}
                  />
                )}
                {product.shop_url && (
                  <a
                    href={product.shop_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Visit Shop
                  </a>
                )}
              </div>
            </Section>
          )}

          {/* Quick Stats */}
          <Section icon={Package} title="Quick Stats">
            <div className="space-y-2">
              <InfoRow label="Times Sold" value={timesSold.toString()} />
            </div>
          </Section>
        </div>
      </div>

      {/* Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Product"
        description={`Are you sure you want to permanently delete "${displayName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// --- Helper sub-components ---

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="text-sm break-all">{value}</p>
    </div>
  );
}

function PriceCard({
  label,
  value,
  sublabel,
  highlight,
}: {
  label: string;
  value: string;
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? "border-primary bg-primary/5" : "bg-muted/20"
      }`}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p
        className={`text-lg font-bold ${
          highlight ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <span className="text-xs text-muted-foreground">{sublabel}</span>
    </div>
  );
}
