"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Loader2,
  Sparkles,
  FolderTree,
  Info,
  Check,
  X,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryResult {
  id: number;
  category_name: string;
  category_name_original: string;
  slug: string;
  level: number | null;
  parent_name: string | null;
  product_count: number;
  has_prompt: boolean;
  prompt_id: number | null;
}

const DEFAULT_PROMPT = `You are given two images: a photo of a real person and a product image. Generate a single realistic image showing the person wearing/using this product in {color} color. The product is: {product_name} from the {category_name} category. Keep the person's original pose, body proportions, and outfit intact. Only add the product naturally. Maintain realistic lighting and shadows. The final image should look like a real photograph, not a composite. Do not add any text, watermarks, or brand logos.`;

export default function NewTryOnPromptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewTryOnPromptInner />
    </Suspense>
  );
}

function NewTryOnPromptInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const presetCategoryId = searchParams.get("category_id");
  const presetCategoryName = searchParams.get("category_name");

  // Category search
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryResults, setCategoryResults] = useState<CategoryResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Selected category
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryResult | null>(null);

  // Form
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_PROMPT);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill from URL params (when coming from category detail page)
  useEffect(() => {
    if (presetCategoryId) {
      const catId = Number(presetCategoryId);
      setSelectedCategory({
        id: catId,
        category_name: presetCategoryName || `Category #${catId}`,
        category_name_original: presetCategoryName || "",
        slug: "",
        level: null,
        parent_name: null,
        product_count: 0,
        has_prompt: false,
        prompt_id: null,
      });
      setCategoryQuery(presetCategoryName || `#${catId}`);
    }
  }, [presetCategoryId, presetCategoryName]);

  // Click outside to close results
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchCategories = useCallback(async (q: string) => {
    if (q.length < 1) {
      setCategoryResults([]);
      setShowResults(false);
      return;
    }
    setSearchLoading(true);
    setShowResults(true);
    try {
      const res = await fetch(
        `/api/tryon-prompts/search-categories?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setCategoryResults(data.categories || []);
    } catch {
      setCategoryResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setCategoryQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCategories(value), 250);
  };

  const selectCategory = (cat: CategoryResult) => {
    setSelectedCategory(cat);
    setCategoryQuery(cat.category_name);
    setShowResults(false);
    setError(null);
  };

  const clearCategory = () => {
    setSelectedCategory(null);
    setCategoryQuery("");
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!selectedCategory) {
      setError("Please select a category first.");
      return;
    }
    if (!promptTemplate.trim()) {
      setError("Prompt template cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tryon-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: selectedCategory.id,
          prompt_template: promptTemplate,
          is_active: isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create prompt.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/tryon-prompts"), 1200);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back + Header */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/tryon-prompts"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Try On Me Prompts
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-500" />
          Add New Prompt
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an AI try-on prompt for a product category. All products in
          this category and its sub-categories will show the &quot;Try On
          Me&quot; button.
        </p>
      </div>

      {/* Category Search */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Select Category</h3>
          <div className="group relative ml-auto">
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            <div className="absolute right-0 top-6 z-10 hidden group-hover:block w-72 rounded-lg border bg-popover p-3 text-xs shadow-lg">
              <p className="font-medium mb-1">💡 Tip: Choosing the right level</p>
              <p>
                Pick a <strong>parent category</strong> (e.g. &quot;Shoes&quot;)
                to cover all its sub-categories automatically. Only add
                sub-category prompts if you need different prompt wording for
                specific sub-categories.
              </p>
            </div>
          </div>
        </div>

        {selectedCategory ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-green-800 dark:text-green-300">
                {selectedCategory.category_name}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500">
                ID: {selectedCategory.id}
                {selectedCategory.slug && ` · /${selectedCategory.slug}`}
                {selectedCategory.parent_name &&
                  ` · Parent: ${selectedCategory.parent_name}`}
              </p>
            </div>
            <button
              onClick={clearCategory}
              className="rounded-md p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={categoryQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (categoryResults.length > 0) setShowResults(true);
                }}
                placeholder="Search by name, slug, or category ID..."
                className="h-10 w-full rounded-lg border bg-muted/50 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>

            {showResults && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-[320px] overflow-auto rounded-xl border bg-popover shadow-lg z-20">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : categoryResults.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No categories found for &quot;{categoryQuery}&quot;
                  </div>
                ) : (
                  <div className="p-1">
                    {categoryResults.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() =>
                          cat.has_prompt ? undefined : selectCategory(cat)
                        }
                        disabled={cat.has_prompt}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                          cat.has_prompt
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-accent cursor-pointer"
                        )}
                      >
                        <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {cat.category_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            ID: {cat.id} · /{cat.slug} ·{" "}
                            {cat.product_count.toLocaleString()} products
                            {cat.parent_name && ` · ${cat.parent_name}`}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {cat.has_prompt ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              Has Prompt
                            </span>
                          ) : (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              Level {cat.level ?? "?"}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prompt Template */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Prompt Template</h3>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex gap-2">
            <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-medium">Available placeholders:</p>
              <ul className="space-y-0.5 ml-2">
                <li>
                  <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900">
                    {"{product_name}"}
                  </code>{" "}
                  — Replaced with the actual product name
                </li>
                <li>
                  <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900">
                    {"{category_name}"}
                  </code>{" "}
                  — Replaced with the category name
                </li>
                <li>
                  <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900">
                    {"{color}"}
                  </code>{" "}
                  — Replaced with the user&apos;s selected color
                </li>
              </ul>
            </div>
          </div>
        </div>

        <textarea
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
          rows={8}
          className="w-full rounded-lg border bg-muted/50 p-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:border-ring focus:ring-1 focus:ring-ring resize-y"
          placeholder="Write your AI prompt template here..."
        />

        <p className="text-xs text-muted-foreground">
          {promptTemplate.length} characters ·{" "}
          {promptTemplate.includes("{product_name}") ? "✅" : "⚠️"}{" "}
          product_name ·{" "}
          {promptTemplate.includes("{category_name}") ? "✅" : "⚠️"}{" "}
          category_name · {promptTemplate.includes("{color}") ? "✅" : "⚠️"}{" "}
          color
        </p>
      </div>

      {/* Active toggle */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Active Status</h3>
            <p className="text-sm text-muted-foreground">
              {isActive
                ? "The Try On Me button will be shown for this category"
                : "The prompt exists but the button won't show on mobile"}
            </p>
          </div>
          <button
            onClick={() => setIsActive(!isActive)}
            className="transition-transform"
          >
            {isActive ? (
              <div className="flex h-7 w-12 items-center rounded-full bg-green-500 p-0.5">
                <div className="h-6 w-6 translate-x-5 rounded-full bg-white shadow transition-transform" />
              </div>
            ) : (
              <div className="flex h-7 w-12 items-center rounded-full bg-gray-300 dark:bg-gray-600 p-0.5">
                <div className="h-6 w-6 rounded-full bg-white shadow transition-transform" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Error / success */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30 flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-300">
            Prompt created successfully! Redirecting...
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving || success || !selectedCategory}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Create Prompt"}
        </button>
        <Link
          href="/dashboard/tryon-prompts"
          className="rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
