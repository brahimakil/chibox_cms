"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, X, FolderTree } from "lucide-react";

interface Category {
  id: number;
  category_name: string;
  category_name_en: string | null;
  parent: number | null;
  level: number | null;
}

interface CategorySelectProps {
  categories: Category[];
  value: number | null | string;
  onChange: (categoryId: number | null) => void;
  placeholder?: string;
}

const BATCH_SIZE = 60;

export function CategorySelect({
  categories,
  value,
  onChange,
  placeholder = "Select category...",
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [displayLimit, setDisplayLimit] = useState(BATCH_SIZE);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  let numericValue: number | null;
  if (typeof value === "string") {
    numericValue = value ? Number(value) : null;
  } else {
    numericValue = value;
  }
  const selectedCategory = categories.find((c) => c.id === numericValue);

  const filteredCategories = useMemo(() => {
    if (!search) return categories;
    const lower = search.toLowerCase();
    return categories.filter(
      (c) =>
        c.category_name.toLowerCase().includes(lower) ||
        (c.category_name_en && c.category_name_en.toLowerCase().includes(lower))
    );
  }, [categories, search]);

  // Only render up to displayLimit items
  const visibleCategories = useMemo(
    () => filteredCategories.slice(0, displayLimit),
    [filteredCategories, displayLimit]
  );

  const hasMore = displayLimit < filteredCategories.length;

  // Reset display limit when search changes or dropdown opens
  useEffect(() => {
    setDisplayLimit(BATCH_SIZE);
  }, [search]);

  // Load more on scroll
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 40) {
      setDisplayLimit((prev) => prev + BATCH_SIZE);
    }
  }, [hasMore]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setDisplayLimit(BATCH_SIZE);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
            if (!open) {
              setDisplayLimit(BATCH_SIZE);
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        className="flex h-9 w-full cursor-pointer items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={`truncate ${selectedCategory ? "" : "text-muted-foreground"}`}>
          {selectedCategory
            ? selectedCategory.category_name_en ||
              selectedCategory.category_name
            : placeholder}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {selectedCategory && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="rounded-sm p-0.5 hover:bg-muted cursor-pointer"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <span className="text-xs text-muted-foreground">
                {filteredCategories.length.toLocaleString()} results
              </span>
            )}
          </div>
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="max-h-60 overflow-auto p-1"
          >
            {visibleCategories.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                <FolderTree className="mx-auto mb-2 h-8 w-8 opacity-40" />
                No categories found
              </div>
            ) : (
              <>
                {visibleCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent ${
                      c.id === numericValue ? "bg-accent font-medium" : ""
                    }`}
                  >
                    {(c.level ?? 0) > 0 && (
                      <span className="whitespace-pre font-mono text-xs text-muted-foreground">
                        {"  ".repeat(c.level || 0)}
                      </span>
                    )}
                    <span className="truncate">
                      {c.category_name_en || c.category_name}
                    </span>
                    {c.level != null && c.level > 0 && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        L{c.level}
                      </span>
                    )}
                  </button>
                ))}
                {hasMore && (
                  <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                    Showing {visibleCategories.length} of{" "}
                    {filteredCategories.length.toLocaleString()} — scroll for more
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
