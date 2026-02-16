"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  ToggleLeft,
  ToggleRight,
  FolderTree,
  Info,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Prompt {
  id: number;
  category_id: number;
  category_name: string;
  category_slug: string | null;
  category_level: number | null;
  parent_name: string | null;
  prompt_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function TryOnPromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Prompt | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const pageSize = 20;

  const fetchPrompts = useCallback(
    async (s: string, active: string, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (s) params.set("search", s);
        if (active) params.set("is_active", active);
        params.set("page", String(p));
        params.set("pageSize", String(pageSize));

        const res = await fetch(`/api/tryon-prompts?${params}`);
        const data = await res.json();
        setPrompts(data.prompts || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
      } catch {
        setPrompts([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPrompts(search, filterActive, page);
  }, [fetchPrompts, page, filterActive]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchPrompts(value, filterActive, 1);
    }, 300);
  };

  const toggleActive = async (prompt: Prompt) => {
    setToggling(prompt.id);
    try {
      const res = await fetch(`/api/tryon-prompts/${prompt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !prompt.is_active }),
      });
      if (res.ok) {
        setPrompts((prev) =>
          prev.map((p) =>
            p.id === prompt.id ? { ...p, is_active: !p.is_active } : p
          )
        );
      }
    } catch {
      // ignore
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(deleteConfirm.id);
    try {
      const res = await fetch(`/api/tryon-prompts/${deleteConfirm.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPrompts((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
        setTotal((t) => t - 1);
        setDeleteConfirm(null);
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Try On Me — AI Prompts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage AI virtual try-on prompts per category. Products in these
            categories (and their children) will show a &quot;Try On Me&quot;
            button in the mobile app.
          </p>
        </div>
        <Link
          href="/dashboard/tryon-prompts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Prompt
        </Link>
      </div>

      {/* Hint banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <div className="flex gap-3">
          <Info className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p className="font-medium">How it works</p>
            <p>
              Each prompt is linked to a <strong>category</strong>. When a user
              opens a product in that category (or any of its sub-categories),
              the &quot;Try On Me&quot; button appears. The prompt template
              supports placeholders:{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-xs dark:bg-blue-900">
                {"{product_name}"}
              </code>
              ,{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-xs dark:bg-blue-900">
                {"{category_name}"}
              </code>
              ,{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-xs dark:bg-blue-900">
                {"{color}"}
              </code>
            </p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Prompts"
          value={total}
          icon={<Sparkles className="h-4 w-4 text-purple-500" />}
        />
        <StatCard
          label="Active"
          value={prompts.filter((p) => p.is_active).length}
          icon={<Eye className="h-4 w-4 text-green-500" />}
          sub={`of ${prompts.length} shown`}
        />
        <StatCard
          label="Inactive"
          value={prompts.filter((p) => !p.is_active).length}
          icon={<EyeOff className="h-4 w-4 text-amber-500" />}
          sub="won't show Try On button"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by category name, slug, or ID..."
            className="h-9 w-full rounded-lg border bg-muted/50 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {[
            { label: "All", value: "" },
            { label: "Active", value: "true" },
            { label: "Inactive", value: "false" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setFilterActive(opt.value);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border",
                filterActive === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            No prompts found
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            {search
              ? "Try a different search term"
              : "Add your first AI try-on prompt to get started"}
          </p>
          {!search && (
            <Link
              href="/dashboard/tryon-prompts/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Add First Prompt
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                    Level
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                    Parent
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                    Updated
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {prompts.map((prompt) => (
                  <Fragment key={prompt.id}>
                    <tr
                      className={cn(
                        "border-b transition-colors hover:bg-muted/30",
                        !prompt.is_active && "opacity-60"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div>
                            <Link
                              href={`/dashboard/categories/${prompt.category_id}`}
                              className="font-medium hover:underline hover:text-primary"
                            >
                              {prompt.category_name}
                            </Link>
                            <p className="text-xs text-muted-foreground font-mono">
                              ID: {prompt.category_id}
                              {prompt.category_slug &&
                                ` · /${prompt.category_slug}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          Level {prompt.category_level ?? "?"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {prompt.parent_name || "Root"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(prompt)}
                          disabled={toggling === prompt.id}
                          className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                        >
                          {toggling === prompt.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : prompt.is_active ? (
                            <ToggleRight className="h-5 w-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                          <span
                            className={
                              prompt.is_active
                                ? "text-green-700 dark:text-green-400"
                                : "text-gray-500"
                            }
                          >
                            {prompt.is_active ? "Active" : "Inactive"}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {formatDate(prompt.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              setExpandedId(
                                expandedId === prompt.id ? null : prompt.id
                              )
                            }
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Preview prompt"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/dashboard/tryon-prompts/${prompt.id}/edit`}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Edit prompt"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteConfirm(prompt)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors"
                            title="Delete prompt"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === prompt.id && (
                      <tr key={`${prompt.id}-expand`} className="border-b">
                        <td colSpan={6} className="px-4 py-3 bg-muted/20">
                          <div className="max-w-3xl">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Prompt Template:
                            </p>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {prompt.prompt_template}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border px-2 py-1 text-xs disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md border px-2 py-1 text-xs disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg mx-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold">Delete Prompt</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Are you sure you want to delete the prompt for{" "}
                  <strong>{deleteConfirm.category_name}</strong>? Products in
                  this category will no longer show the &quot;Try On Me&quot;
                  button.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting === deleteConfirm.id}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting === deleteConfirm.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
