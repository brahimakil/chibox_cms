"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Trash2, Package, Loader2 } from "lucide-react";
import { ProductsTable } from "@/components/products/products-table";
import { ProductFilters } from "@/components/products/product-filters";
import { PricingControls } from "@/components/products/pricing-controls";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

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

interface CategoryOption {
  id: number;
  category_name: string;
  category_name_en: string | null;
  parent: number | null;
  level: number | null;
}

const PAGE_SIZE = 50;

export default function ProductsPage() {
  // Products data (accumulated via infinite scroll)
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [excludedFilter, setExcludedFilter] = useState("");

  // Categories dropdown + excluded IDs
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<number[]>([]);

  // Pricing
  const [markupPercent, setMarkupPercent] = useState(15);
  const [exchangeRate, setExchangeRate] = useState(0.14);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Delete dialog
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Ref to prevent duplicate loadMore calls
  const loadingRef = useRef(false);

  /**
   * Fetch a batch of products. If cursor is null, it's the initial load
   * (resets products array and fetches total + pricing).
   */
  const fetchProducts = useCallback(
    async (cursor: number | null, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({ pageSize: PAGE_SIZE.toString() });
        if (cursor) params.set("cursor", cursor.toString());
        if (search) params.set("search", search);
        if (categoryId) params.set("categoryId", categoryId);
        if (stockFilter) params.set("stock", stockFilter);
        if (excludedFilter) params.set("excluded", excludedFilter);

        const res = await fetch(`/api/products?${params}`);
        const data = await res.json();

        // Compute app_price client-side using pricing data
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
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [search, categoryId, stockFilter, excludedFilter, markupPercent, exchangeRate]
  );

  // Load categories + excluded IDs once
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories || []);
        setExcludedCategoryIds(data.excludedCategoryIds || []);
      })
      .catch(console.error);
  }, []);

  // Initial load + reset when filters change
  useEffect(() => {
    setSelectedIds(new Set());
    setNextCursor(null);
    setHasMore(true);
    fetchProducts(null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, stockFilter, excludedFilter]);

  // Load more callback (triggered by infinite scroll)
  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingRef.current || !nextCursor) return;
    fetchProducts(nextCursor, true);
  }, [hasMore, nextCursor, fetchProducts]);

  // Recompute app prices when markup/rate change
  const handlePricingSaved = useCallback(() => {
    // Re-fetch from scratch to get updated pricing
    setNextCursor(null);
    setHasMore(true);
    fetchProducts(null, false);
  }, [fetchProducts]);

  // Selection handlers
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  // Delete handlers
  const handleDeleteRequest = (ids: number[]) => {
    setDeleteIds(ids);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: deleteIds }),
      });
      if (!res.ok) throw new Error("Delete failed");
      // Remove deleted products from local state
      const deletedSet = new Set(deleteIds);
      setProducts((prev) => prev.filter((p) => !deletedSet.has(p.id)));
      setTotal((prev) => prev - deleteIds.length);
      setSelectedIds(new Set());
      setDeleteOpen(false);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    handleDeleteRequest(Array.from(selectedIds));
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Package className="h-7 w-7" />
            Products
          </h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} products total
            {products.length > 0 && products.length < total && (
              <span className="ml-1">
                · {products.length.toLocaleString()} loaded
              </span>
            )}
          </p>
        </div>

        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4" />
            Delete {selectedIds.size} selected
          </button>
        )}
      </div>

      {/* Global Pricing Controls */}
      <PricingControls
        markupPercent={markupPercent}
        exchangeRate={exchangeRate}
        onSaved={handlePricingSaved}
      />

      {/* Filters */}
      <ProductFilters
        search={search}
        onSearchChange={setSearch}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        excludedFilter={excludedFilter}
        onExcludedFilterChange={setExcludedFilter}
        categories={categories}
        excludedCategoryIds={excludedCategoryIds}
      />

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ProductsTable
          products={products}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          allSelected={
            products.length > 0 && selectedIds.size === products.length
          }
          onDelete={handleDeleteRequest}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMore}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Products"
        description={`Are you sure you want to permanently delete ${deleteIds.length} product${deleteIds.length > 1 ? "s" : ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

/** Compute app price from origin CNY price */
function computeAppPrice(
  originPrice: number | null,
  markupPercent: number,
  exchangeRate: number
): number | null {
  if (originPrice === null) return null;
  const converted = originPrice * exchangeRate;
  return Math.round(converted * (1 + markupPercent / 100) * 100) / 100;
}
