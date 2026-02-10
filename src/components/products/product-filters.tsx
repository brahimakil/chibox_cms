"use client";

import { useMemo } from "react";
import { SearchInput } from "@/components/shared/search-input";
import { CategorySelect } from "@/components/products/category-select";

interface ProductFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  stockFilter: string;
  onStockFilterChange: (value: string) => void;
  excludedFilter: string;
  onExcludedFilterChange: (value: string) => void;
  categories: { id: number; category_name: string; category_name_en: string | null; parent: number | null; level: number | null }[];
  excludedCategoryIds: number[];
}

export function ProductFilters({
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  stockFilter,
  onStockFilterChange,
  excludedFilter,
  onExcludedFilterChange,
  categories,
  excludedCategoryIds,
}: ProductFiltersProps) {
  // When "Excluded" is selected, only show excluded categories in the dropdown
  // When "Not Excluded" is selected, only show non-excluded categories
  const filteredCategories = useMemo(() => {
    if (excludedFilter === "excluded") {
      const excludedSet = new Set(excludedCategoryIds);
      return categories.filter((c) => excludedSet.has(c.id));
    }
    if (excludedFilter === "not_excluded") {
      const excludedSet = new Set(excludedCategoryIds);
      return categories.filter((c) => !excludedSet.has(c.id));
    }
    return categories;
  }, [categories, excludedCategoryIds, excludedFilter]);

  const categoryPlaceholder = useMemo(() => {
    if (excludedFilter === "excluded") {
      return `Excluded Categories (${filteredCategories.length})`;
    }
    if (excludedFilter === "not_excluded") {
      return `Active Categories (${filteredCategories.length})`;
    }
    return "All Categories";
  }, [excludedFilter, filteredCategories.length]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-full sm:w-72">
        <SearchInput
          defaultValue={search}
          onSearch={onSearchChange}
          placeholder="Search name, code..."
        />
      </div>

      {/* Excluded filter */}
      <select
        value={excludedFilter}
        onChange={(e) => {
          onExcludedFilterChange(e.target.value);
          // Reset category selection when excluded filter changes
          onCategoryChange("");
        }}
        className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All</option>
        <option value="excluded">Excluded</option>
        <option value="not_excluded">Not Excluded</option>
      </select>

      {/* Category filter — adapts to excluded filter */}
      <div className="w-56">
        <CategorySelect
          categories={filteredCategories}
          value={categoryId || null}
          onChange={(id) => onCategoryChange(id ? String(id) : "")}
          placeholder={categoryPlaceholder}
        />
      </div>

      {/* Stock filter */}
      <select
        value={stockFilter}
        onChange={(e) => onStockFilterChange(e.target.value)}
        className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All Stock</option>
        <option value="in_stock">In Stock</option>
        <option value="out_of_stock">Out of Stock</option>
      </select>
    </div>
  );
}
