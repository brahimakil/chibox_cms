"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FolderTree, Loader2, LayoutGrid, List } from "lucide-react";
import { CategoriesTable } from "@/components/categories/categories-table";
import { CategoryFilters } from "@/components/categories/category-filters";
import { CategoryTree } from "@/components/categories/category-tree";

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
  sync_enabled: boolean | null;
  is_excluded: boolean;
  source: string | null;
  order_number: number | null;
  tax_air: number | null;
  tax_sea: number | null;
  cbm_rate: number | null;
  shipping_surcharge_percent: number | null;
  air_shipping_rate: number | null;
  created_at: string;
  updated_at: string;
}

/** Lightweight type returned by /api/categories/tree */
interface TreeCategoryData {
  id: number;
  category_name: string;
  category_name_en: string | null;
  parent: number | null;
  level: number | null;
  has_children: boolean | null;
  main_image: string | null;
  product_count: number;
  display: boolean;
  order_number: number | null;
  is_excluded: boolean;
}

interface DropdownCategory {
  id: number;
  category_name: string;
  category_name_en: string | null;
  parent: number | null;
  level: number | null;
}

const PAGE_SIZE = 50;

export default function CategoriesPage() {
  const [view, setView] = useState<"table" | "tree">("table");

  // Table data (cursor-based infinite scroll)
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Tree data (lightweight — only tree-needed fields)
  const [treeCategories, setTreeCategories] = useState<TreeCategoryData[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [excludedFilter, setExcludedFilter] = useState("");
  const [parentId, setParentId] = useState("");

  // Categories for filter dropdown
  const [dropdownCategories, setDropdownCategories] = useState<
    DropdownCategory[]
  >([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const loadingRef = useRef(false);

  /* ─── Fetch categories (table view, cursor-based) ─── */
  const fetchCategories = useCallback(
    async (cursor: number | null, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({
          pageSize: PAGE_SIZE.toString(),
        });
        if (cursor) params.set("cursor", cursor.toString());
        if (search) params.set("search", search);
        if (levelFilter) params.set("level", levelFilter);
        if (excludedFilter) params.set("excluded", excludedFilter);
        if (parentId) params.set("parentId", parentId);

        const res = await fetch(`/api/categories/list?${params}`);
        const data = await res.json();

        if (append) {
          setCategories((prev) => [...prev, ...data.categories]);
        } else {
          setCategories(data.categories);
          if (data.total != null) setTotal(data.total);
        }

        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [search, levelFilter, excludedFilter, parentId]
  );

  /* ─── Fetch ALL categories for tree view + filter dropdown ─── */
  const fetchAllCategories = useCallback(async () => {
    try {
      setTreeLoading(true);

      // Only fetch roots initially — children load lazily on expand
      const res = await fetch("/api/categories/tree");
      const data = await res.json();
      const cats = data.categories || [];

      // Use roots for dropdown initially (will grow as children are loaded)
      setDropdownCategories(cats);

      // Use same data for tree
      setTreeCategories(cats);
    } catch (err) {
      console.error("Failed to load all categories:", err);
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllCategories();
  }, [fetchAllCategories]);

  useEffect(() => {
    setSelectedIds(new Set());
    setNextCursor(null);
    setHasMore(true);
    fetchCategories(null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, levelFilter, excludedFilter, parentId]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingRef.current || !nextCursor) return;
    fetchCategories(nextCursor, true);
  }, [hasMore, nextCursor, fetchCategories]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === categories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(categories.map((c) => c.id)));
    }
  };

  const handleReorder = async (
    categoryId: number,
    newParentId: number | null,
    newOrder: number
  ) => {
    try {
      const res = await fetch("/api/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, newParentId, newOrder }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Reorder failed:", data.error);
        // Revert optimistic update by refetching
        await fetchAllCategories();
        return;
      }
      // Don't refetch — the tree component already applied optimistic updates.
      // The server cache is invalidated, so the next page load gets fresh data.
    } catch (err) {
      console.error("Reorder failed:", err);
      await fetchAllCategories();
    }
  };

  /** Lazy-load children of a specific parent — called by CategoryTree on expand */
  const handleLoadChildren = useCallback(async (parentId: number) => {
    const res = await fetch(`/api/categories/tree?parent=${parentId}`);
    const data = await res.json();
    const children = data.categories || [];

    // Merge children into tree state + dropdown
    setTreeCategories((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const newOnes = children.filter((c: TreeCategoryData) => !existingIds.has(c.id));
      return [...prev, ...newOnes];
    });
    setDropdownCategories((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const newOnes = children.filter((c: TreeCategoryData) => !existingIds.has(c.id));
      return [...prev, ...newOnes];
    });

    return children;
  }, []);

  /** Load full tree — used by "Expand All" and search */
  const handleLoadAll = useCallback(async () => {
    const res = await fetch("/api/categories/tree?mode=all");
    const data = await res.json();
    const cats = data.categories || [];

    setTreeCategories(cats);
    setDropdownCategories(cats);

    return cats;
  }, []);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FolderTree className="h-7 w-7" />
            Categories
          </h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} categories total
            {view === "table" &&
              categories.length > 0 &&
              categories.length < total && (
                <span className="ml-1">
                  · {categories.length.toLocaleString()} loaded
                </span>
              )}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
          <button
            onClick={() => setView("table")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "table"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Table
          </button>
          <button
            onClick={() => setView("tree")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "tree"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-4 w-4" />
            Tree
          </button>
        </div>
      </div>

      {view === "table" && (
        <>
          <CategoryFilters
            search={search}
            onSearchChange={setSearch}
            levelFilter={levelFilter}
            onLevelFilterChange={setLevelFilter}
            excludedFilter={excludedFilter}
            onExcludedFilterChange={setExcludedFilter}
            parentId={parentId}
            onParentIdChange={setParentId}
            categories={dropdownCategories}
          />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CategoriesTable
              categories={categories}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              allSelected={
                categories.length > 0 &&
                selectedIds.size === categories.length
              }
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={handleLoadMore}
            />
          )}
        </>
      )}

      {view === "tree" && (
        <>
          {treeLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">
                Loading category tree...
              </span>
            </div>
          ) : (
            <CategoryTree
              categories={treeCategories}
              onReorder={handleReorder}
              onLoadChildren={handleLoadChildren}
              onLoadAll={handleLoadAll}
            />
          )}
        </>
      )}
    </div>
  );
}
