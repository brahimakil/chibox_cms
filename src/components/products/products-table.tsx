"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Eye, Trash2, ImageOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { StockBadge } from "./product-status-badge";
import { ImageLightbox } from "./image-lightbox";

interface Product {
  id: number;
  product_code: string;
  product_name: string | null;
  display_name: string | null;
  original_name: string | null;
  main_image: string | null;
  origin_price: number | null;
  app_price: number | null;
  category_name: string | null;
  category_id: number | null;
  out_of_stock: number;
  source: string | null;
  product_status: number;
}

interface ProductsTableProps {
  products: Product[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  onDelete: (ids: number[]) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

const ROW_HEIGHT = 64;

function resolveDisplayName(p: Product): string {
  if (p.display_name) return p.display_name;
  if (p.original_name) return p.original_name;
  if (p.product_name) return p.product_name;
  return p.product_code;
}

// Grid column definitions
const GRID_COLS = "40px 56px minmax(180px,2fr) minmax(100px,1fr) minmax(100px,1fr) 100px 110px 80px 72px";

export function ProductsTable({
  products,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  onDelete,
  hasMore,
  loadingMore,
  onLoadMore,
}: ProductsTableProps) {
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
    count: products.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  // Trigger load more when user scrolls near the bottom
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

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <ImageOff className="mb-3 h-12 w-12 text-muted-foreground/40" />
        <p className="text-lg font-medium text-muted-foreground">
          No products found
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
        {/* Header row */}
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
          <div className="px-3 py-3">Product</div>
          <div className="px-3 py-3">Code</div>
          <div className="px-3 py-3">Category</div>
          <div className="px-3 py-3 text-right">Origin (CNY)</div>
          <div className="px-3 py-3 text-right">App Price (USD)</div>
          <div className="px-3 py-3 text-center">Stock</div>
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
              const p = products[virtualRow.index];
              return (
                <div
                  key={p.id}
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
                      checked={selectedIds.has(p.id)}
                      onChange={() => onToggleSelect(p.id)}
                      className="h-4 w-4 rounded border"
                    />
                  </div>

                  {/* Image */}
                  <div className="px-3 py-2">
                    {p.main_image ? (
                      <button
                        onClick={() => openImage(p.main_image!)}
                        className="block overflow-hidden rounded-md border hover:ring-2 hover:ring-ring"
                      >
                        <img
                          src={p.main_image}
                          alt=""
                          className="h-11 w-11 object-cover"
                          loading="lazy"
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
                      href={`/dashboard/products/${p.id}`}
                      className="font-medium text-foreground hover:underline line-clamp-2 block"
                    >
                      {resolveDisplayName(p)}
                    </Link>
                  </div>

                  {/* Code */}
                  <div className="px-3 py-2 font-mono text-xs text-muted-foreground truncate">
                    {p.product_code}
                  </div>

                  {/* Category */}
                  <div className="px-3 py-2 text-muted-foreground truncate">
                    {p.category_name || "—"}
                  </div>

                  {/* Origin Price */}
                  <div className="px-3 py-2 text-right text-muted-foreground">
                    {p.origin_price !== null
                      ? `¥${p.origin_price.toFixed(2)}`
                      : "—"}
                  </div>

                  {/* App Price */}
                  <div className="px-3 py-2 text-right font-medium">
                    {p.app_price !== null
                      ? `$${p.app_price.toFixed(2)}`
                      : "—"}
                  </div>

                  {/* Stock */}
                  <div className="px-3 py-2 flex justify-center">
                    <StockBadge outOfStock={p.out_of_stock} />
                  </div>

                  {/* Actions */}
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/dashboard/products/${p.id}`}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => onDelete([p.id])}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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

          {!hasMore && products.length > 0 && (
            <div className="py-3 text-center text-xs text-muted-foreground">
              All {products.length.toLocaleString()} loaded products displayed
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
