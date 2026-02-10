"use client";

import { useMemo } from "react";
import { SearchInput } from "@/components/shared/search-input";
import { CategorySelect } from "@/components/products/category-select";

interface CategoryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  levelFilter: string;
  onLevelFilterChange: (value: string) => void;
  excludedFilter: string;
  onExcludedFilterChange: (value: string) => void;
  parentId: string;
  onParentIdChange: (value: string) => void;
  categories: {
    id: number;
    category_name: string;
    category_name_en: string | null;
    parent: number | null;
    level: number | null;
  }[];
}

export function CategoryFilters({
  search,
  onSearchChange,
  levelFilter,
  onLevelFilterChange,
  excludedFilter,
  onExcludedFilterChange,
  parentId,
  onParentIdChange,
  categories,
}: CategoryFiltersProps) {
  const levels = useMemo(() => {
    const set = new Set<number>();
    categories.forEach((c) => {
      if (c.level != null) set.add(c.level);
    });
    return [...set].sort((a, b) => a - b);
  }, [categories]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="w-full sm:w-72">
        <SearchInput
          defaultValue={search}
          onSearch={onSearchChange}
          placeholder="Search name, slug..."
        />
      </div>

      {/* Level */}
      <select
        value={levelFilter}
        onChange={(e) => onLevelFilterChange(e.target.value)}
        className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All Levels</option>
        {levels.map((l) => (
          <option key={l} value={l}>
            Level {l}
          </option>
        ))}
      </select>

      {/* Excluded */}
      <select
        value={excludedFilter}
        onChange={(e) => onExcludedFilterChange(e.target.value)}
        className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All</option>
        <option value="excluded">Excluded</option>
        <option value="not_excluded">Not Excluded</option>
      </select>

      {/* Parent category filter */}
      <div className="w-56">
        <CategorySelect
          categories={categories}
          value={parentId || null}
          onChange={(id) => onParentIdChange(id ? String(id) : "")}
          placeholder="Parent Category"
        />
      </div>
    </div>
  );
}
