"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Eye, ImageOff, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { StockBadge } from "@/components/products/product-status-badge";
import { ImageLightbox } from "@/components/products/image-lightbox";
import { SearchInput } from "@/components/shared/search-input";
import { resolveImageUrl } from "@/lib/image-url";

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
}

interface CategoryProductsTableProps {
  categoryId: number;
}

const ROW_HEIGHT = 56;
const GRID_COLS =
  "48px minmax(160px,2fr) minmax(80px,1fr) minmax(80px,1fr) 90px 100px 70px 60px";
const PAGE_SIZE = 50;

function resolveDisplayName(p: Product): string {
  return p.display_name || p.original_name || p.product_name || p.product_code;
}

function computeAppPrice(
  originPrice: number | null,
  markupPercent: number,
  exchangeRate: number
): number | null {
  if (originPrice === null) return null;
  return Math.round(originPrice * exchangeRate * (1 + markupPercent / 100) * 100) / 100;
}

export function CategoryProductsTable({
  categoryId,
}: CategoryProductsTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [markupPercent, setMarkupPercent] = useState(15);
  const [exchangeRate, setExchangeRate] = useState(0.14);

  const loadingRef = useRef(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openImage = (url: string) => {
    setLightboxImages([url]);
    setLightboxIndex(0);
    setLightboxOpen(true);
  };

  const fetchProducts = useCallback(
    async (cursor: number | null, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({ pageSize: PAGE_SIZE.toString() });
        if (cursor) params.set("cursor", cursor.toString());
        if (search) params.set("search", search);

        const res = await fetch(
          `/api/categories/${categoryId}/products?${params}`
        );
        const data = await res.json();

        const mk = data.pricing?.markupPercent ?? markupPercent;
        const er = data.pricing?.exchangeRate ?? exchangeRate;

        const withAppPrice = data.products.map((p: Product) => ({
          ...p,
          app_price: computeAppPrice(p.origin_price, mk, er),
        }));

        if (append) {
          setProducts((prev) => [...prev, ...withAppPrice]);
        } else {
          setProducts(withAppPrice);
          if (data.total != null) setTotal(data.total);
          if (data.pricing) {
            setMarkupPercent(data.pricing.markupPercent);
            setExchangeRate(data.pricing.exchangeRate);
          }
        }

        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error("Failed to fetch category products:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [categoryId, search, markupPercent, exchangeRate]
  );

  useEffect(() => {
    setProducts([]);
    setNextCursor(null);
    setHasMore(true);
    fetchProducts(null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, search]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingRef.current || !nextCursor) return;
    fetchProducts(nextCursor, true);
  }, [hasMore, nextCursor, fetchProducts]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !hasMore || loadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 300) {
      handleLoadMore();
    }
  }, [hasMore, loadingMore, handleLoadMore]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">
            Products ({total.toLocaleString()})
          </h3>
          {products.length > 0 && products.length < total && (
            <span className="text-xs text-muted-foreground">
              · {products.length.toLocaleString()} loaded
            </span>
          )}
        </div>
        <div className="w-60">
          <SearchInput
            defaultValue={search}
            onSearch={setSearch}
            placeholder="Search products..."
          />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Package className="mb-2 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No products in this category
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          {/* Header row */}
          <div
            className="grid items-center border-b bg-muted/80 text-xs font-medium"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <div className="px-2 py-2">Image</div>
            <div className="px-2 py-2">Product</div>
            <div className="px-2 py-2">Code</div>
            <div className="px-2 py-2">Sub-Category</div>
            <div className="px-2 py-2 text-right">Origin (CNY)</div>
            <div className="px-2 py-2 text-right">App (USD)</div>
            <div className="px-2 py-2 text-center">Stock</div>
            <div className="px-2 py-2 text-center">View</div>
          </div>

          <div
            ref={scrollContainerRef}
            className="overflow-auto"
            style={{ height: "400px" }}
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
                    {/* Image */}
                    <div className="px-2 py-1">
                      {p.main_image ? (
                        <button
                          onClick={() => openImage(p.main_image!)}
                          className="block overflow-hidden rounded border hover:ring-2 hover:ring-ring cursor-pointer"
                        >
                          <img
                            src={resolveImageUrl(p.main_image) || ""}
                            alt=""
                            className="h-9 w-9 object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </button>
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-muted">
                          <ImageOff className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="px-2 py-1 min-w-0">
                      <Link
                        href={`/dashboard/products/${p.id}`}
                        className="font-medium text-foreground hover:underline line-clamp-2 block text-xs"
                      >
                        {resolveDisplayName(p)}
                      </Link>
                    </div>

                    {/* Code */}
                    <div className="px-2 py-1 font-mono text-xs text-muted-foreground truncate">
                      {p.product_code}
                    </div>

                    {/* Category */}
                    <div className="px-2 py-1 text-xs text-muted-foreground truncate">
                      {p.category_name || "—"}
                    </div>

                    {/* Origin */}
                    <div className="px-2 py-1 text-right text-xs text-muted-foreground">
                      {p.origin_price !== null
                        ? `¥${p.origin_price.toFixed(2)}`
                        : "—"}
                    </div>

                    {/* App Price */}
                    <div className="px-2 py-1 text-right text-xs font-medium">
                      {p.app_price !== null
                        ? `$${p.app_price.toFixed(2)}`
                        : "—"}
                    </div>

                    {/* Stock */}
                    <div className="px-2 py-1 flex justify-center">
                      <StockBadge outOfStock={p.out_of_stock} />
                    </div>

                    {/* View */}
                    <div className="px-2 py-1 flex justify-center">
                      <Link
                        href={`/dashboard/products/${p.id}`}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {loadingMore && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">
                  Loading more...
                </span>
              </div>
            )}

            {!hasMore && products.length > 0 && (
              <div className="py-2 text-center text-xs text-muted-foreground">
                All {products.length.toLocaleString()} products displayed
              </div>
            )}
          </div>
        </div>
      )}

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
