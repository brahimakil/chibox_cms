"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
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
  Save,
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

interface PromptData {
  id: number;
  category_id: number;
  category_name: string;
  category_slug: string | null;
  category_level: number | null;
  prompt_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function EditTryOnPromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<PromptData | null>(null);

  // Category search
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryResults, setCategoryResults] = useState<CategoryResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [changingCategory, setChangingCategory] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Selected category
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryResult | null>(null);

  // Form
  const [promptTemplate, setPromptTemplate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch the prompt
  useEffect(() => {
    setLoading(true);
    fetch(`/api/tryon-prompts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.prompt) {
          setPrompt(data.prompt);
          setPromptTemplate(data.prompt.prompt_template);
          setIsActive(data.prompt.is_active);
          setSelectedCategory({
            id: data.prompt.category_id,
            category_name: data.prompt.category_name,
            category_name_original: "",
            slug: data.prompt.category_slug || "",
            level: data.prompt.category_level,
            parent_name: null,
            product_count: 0,
            has_prompt: true,
            prompt_id: data.prompt.id,
          });
          setCategoryQuery(data.prompt.category_name);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Click outside
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
    setChangingCategory(false);
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
      const body: Record<string, unknown> = {
        prompt_template: promptTemplate,
        is_active: isActive,
      };
      // If category changed
      if (prompt && selectedCategory.id !== prompt.category_id) {
        body.category_id = selectedCategory.id;
      }

      const res = await fetch(`/api/tryon-prompts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update prompt.");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-muted-foreground">Prompt not found</p>
        <Link
          href="/dashboard/tryon-prompts"
          className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to prompts
        </Link>
      </div>
    );
  }

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
          Edit Prompt
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Editing prompt #{prompt.id} for &quot;{prompt.category_name}&quot;
        </p>
      </div>

      {/* Category Section */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Category</h3>
          <div className="group relative ml-auto">
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            <div className="absolute right-0 top-6 z-10 hidden group-hover:block w-72 rounded-lg border bg-popover p-3 text-xs shadow-lg">
              <p className="font-medium mb-1">💡 Changing category</p>
              <p>
                You can reassign this prompt to a different category. The
                prompt will stop working for the old category and start
                working for the new one.
              </p>
            </div>
          </div>
        </div>

        {!changingCategory && selectedCategory ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-green-800 dark:text-green-300">
                {selectedCategory.category_name}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500">
                ID: {selectedCategory.id}
                {selectedCategory.slug && ` · /${selectedCategory.slug}`}
              </p>
            </div>
            <button
              onClick={() => setChangingCategory(true)}
              className="rounded-md px-2 py-1 text-xs font-medium border text-muted-foreground hover:bg-muted transition-colors"
            >
              Change
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
                autoFocus
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
                    No categories found
                  </div>
                ) : (
                  <div className="p-1">
                    {categoryResults.map((cat) => {
                      const isSelf =
                        cat.has_prompt && cat.prompt_id === prompt.id;
                      const isOther = cat.has_prompt && !isSelf;
                      return (
                        <button
                          key={cat.id}
                          onClick={() =>
                            isOther ? undefined : selectCategory(cat)
                          }
                          disabled={isOther}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                            isOther
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
                            </p>
                          </div>
                          {isSelf && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Current
                            </span>
                          )}
                          {isOther && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              Has Prompt
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {changingCategory && (
              <button
                onClick={() => {
                  setChangingCategory(false);
                  if (prompt) {
                    setCategoryQuery(prompt.category_name);
                  }
                }}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel change
              </button>
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
            Prompt updated successfully! Redirecting...
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving || success}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
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
