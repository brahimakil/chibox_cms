"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Eye,
  ImageOff,
  Loader2,
  FolderTree,
  Package,
} from "lucide-react";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ImageLightbox } from "@/components/products/image-lightbox";
import { resolveImageUrl } from "@/lib/image-url";

interface Category {
  id: number;
  category_name: string;
  category_name_en: string | null;
  category_name_zh: string | null;
  slug: string;
  parent: number | null;
  parent_name: string | null;
  level: number | null;
  has_children: boolean | null;
  main_image: string | null;
  product_count: number;
  products_in_db: number | null;
  display: boolean;
  fully_synced: boolean | null;
  is_excluded: boolean;
  source: string | null;
  tax_air: number | null;
  tax_sea: number | null;
  cbm_rate: number | null;
  shipping_surcharge_percent: number | null;
  air_shipping_rate: number | null;
}

interface CategoriesTableProps {
  categories: Category[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

const ROW_HEIGHT = 64;
const GRID_COLS =
  "40px 56px minmax(180px,2fr) 70px minmax(100px,1fr) 90px 80px 72px";

function resolveName(c: Category): string {
  return c.category_name_en || c.category_name;
}

export function CategoriesTable({
  categories,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  hasMore,
  loadingMore,
  onLoadMore,
}: CategoriesTableProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openImage = (url: string) => {
    setLightboxImages([url]);
    setLightboxIndex(0);
    setLightboxOpen(true);
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: categories.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !hasMore || loadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 300) {
      onLoadMore();
    }
  }, [hasMore, loadingMore, onLoadMore]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <FolderTree className="mb-3 h-12 w-12 text-muted-foreground/40" />
        <p className="text-lg font-medium text-muted-foreground">
          No categories found
        </p>
        <p className="text-sm text-muted-foreground/60">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        {/* Header */}
        <div
          className="grid items-center border-b bg-muted/80 text-sm font-medium"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div className="px-3 py-3 flex justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              className="h-4 w-4 rounded border"
            />
          </div>
          <div className="px-3 py-3">Image</div>
          <div className="px-3 py-3">Category</div>
          <div className="px-3 py-3 text-center">Level</div>
          <div className="px-3 py-3">Parent</div>
          <div className="px-3 py-3 text-right">Products</div>
          <div className="px-3 py-3 text-center">Excluded</div>
          <div className="px-3 py-3 text-center">Actions</div>
        </div>

        {/* Virtualized scroll body */}
        <div
          ref={scrollContainerRef}
          className="overflow-auto"
          style={{ height: "calc(100vh - 320px)", minHeight: "400px" }}
        >
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualRow) => {
              const c = categories[virtualRow.index];
              return (
                <div
                  key={c.id}
                  className="grid items-center border-b text-sm transition-colors hover:bg-muted/30"
                  style={{
                    gridTemplateColumns: GRID_COLS,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: ROW_HEIGHT,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {/* Checkbox */}
                  <div className="px-3 py-2 flex justify-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => onToggleSelect(c.id)}
                      className="h-4 w-4 rounded border"
                    />
                  </div>

                  {/* Image */}
                  <div className="px-3 py-2">
                    {c.main_image ? (
                      <button
                        onClick={() => openImage(resolveImageUrl(c.main_image) || c.main_image!)}
                        className="block overflow-hidden rounded-md border hover:ring-2 hover:ring-ring cursor-pointer"
                      >
                        <img
                          src={resolveImageUrl(c.main_image) || undefined}
                          alt=""
                          className="h-11 w-11 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </button>
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted">
                        <ImageOff className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="px-3 py-2 min-w-0">
                    <Link
                      href={`/dashboard/categories/${c.id}`}
                      className="font-medium text-foreground hover:underline line-clamp-1 block"
                    >
                      {resolveName(c)}
                    </Link>
                    <span className="text-xs text-muted-foreground truncate block">
                      /{c.slug}
                    </span>
                  </div>

                  {/* Level */}
                  <div className="px-3 py-2 text-center">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium">
                      {c.level ?? 0}
                    </span>
                  </div>

                  {/* Parent */}
                  <div className="px-3 py-2 text-muted-foreground truncate text-xs">
                    {c.parent_name || (c.parent ? `#${c.parent}` : "Root")}
                  </div>

                  {/* Product count */}
                  <div className="px-3 py-2 text-right">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      {(c.product_count ?? 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Excluded */}
                  <div className="px-3 py-2 flex justify-center">
                    {c.is_excluded ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-3 py-2 flex justify-center">
                    <Link
                      href={`/dashboard/categories/${c.id}`}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading more...
              </span>
            </div>
          )}

          {!hasMore && categories.length > 0 && (
            <div className="py-3 text-center text-xs text-muted-foreground">
              All {categories.length.toLocaleString()} loaded categories
              displayed
            </div>
          )}
        </div>
      </div>

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
