"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart3,
  Search,
  Loader2,
  Package,
  Users,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Zap,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { thumbnailUrl, resolveImageUrl } from "@/lib/image-url";

// ── Types ──

interface Stats {
  total_generations: number;
  total_users: number;
  total_products: number;
  completed: number;
  failed: number;
  pending: number;
  today_count: number;
  avg_generation_time_ms: number | null;
  top_products: { product_id: number; name: string; main_image: string | null; count: number }[];
  top_users: { user_id: number; name: string; email: string; count: number }[];
  status_breakdown: { status: string; count: number }[];
  daily_trend: { day: string; count: number }[];
}

interface ProductRow {
  product_id: number;
  name: string;
  product_code: string | null;
  main_image: string | null;
  total_generations: number;
  completed_count: number;
  failed_count: number;
  unique_users: number;
  last_used_at: string | null;
}

interface UserRow {
  user_id: number;
  full_name: string;
  email: string;
  profile_image: string | null;
  total_generations: number;
  completed_count: number;
  failed_count: number;
  unique_products: number;
  last_used_at: string | null;
}

interface Generation {
  id: number;
  user_id: number;
  product_id: number;
  category_id: number;
  color_name: string | null;
  user_photo_url: string;
  generated_image_url: string | null;
  generation_time_ms: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
  user_profile_image: string | null;
  product_name: string;
  product_code: string | null;
  product_image: string | null;
  category_name: string | null;
}

type TabKey = "overview" | "products" | "users";

// ── Helpers ──

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", styles[status] || "bg-gray-100 text-gray-800")}>
      {status === "completed" && <CheckCircle2 className="h-3 w-3" />}
      {status === "failed" && <XCircle className="h-3 w-3" />}
      {status === "pending" && <AlertCircle className="h-3 w-3" />}
      {status}
    </span>
  );
}

// ── Component ──

export default function TryOnAnalyticsPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Products tab state
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsSearch, setProductsSearch] = useState("");
  const [productsPage, setProductsPage] = useState(1);
  const [productsTotalPages, setProductsTotalPages] = useState(0);
  const [productsTotal, setProductsTotal] = useState(0);
  const productsSearchRef = useRef<NodeJS.Timeout>(undefined);

  // Users tab state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  const usersSearchRef = useRef<NodeJS.Timeout>(undefined);

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailGenerations, setDetailGenerations] = useState<Generation[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPage, setDetailPage] = useState(1);
  const [detailTotalPages, setDetailTotalPages] = useState(0);
  const [detailTotal, setDetailTotal] = useState(0);
  const detailFilterRef = useRef<{ product_id?: number; user_id?: number }>({});

  // Image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ── Fetchers ──

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/tryon-generations/stats");
      const data = await res.json();
      setStats(data);
    } catch {
      /* ignore */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async (search: string, page: number) => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams({ view: "products", page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/tryon-generations?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      setProductsTotalPages(data.totalPages || 0);
      setProductsTotal(data.total || 0);
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (search: string, page: number) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ view: "users", page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/tryon-generations?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setUsersTotalPages(data.totalPages || 0);
      setUsersTotal(data.total || 0);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (filter: { product_id?: number; user_id?: number }, page: number) => {
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({ view: "all", page: String(page), pageSize: "20", status: "completed" });
      if (filter.product_id) params.set("product_id", String(filter.product_id));
      if (filter.user_id) params.set("user_id", String(filter.user_id));
      const res = await fetch(`/api/tryon-generations?${params}`);
      const data = await res.json();
      setDetailGenerations(data.generations || []);
      setDetailTotalPages(data.totalPages || 0);
      setDetailTotal(data.total || 0);
    } catch {
      setDetailGenerations([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Effects ──

  useEffect(() => {
    if (tab === "overview") fetchStats();
  }, [tab, fetchStats]);

  useEffect(() => {
    if (tab === "products") fetchProducts(productsSearch, productsPage);
  }, [tab, productsPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "users") fetchUsers(usersSearch, usersPage);
  }, [tab, usersPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search handlers ──

  const handleProductsSearch = (v: string) => {
    setProductsSearch(v);
    if (productsSearchRef.current) clearTimeout(productsSearchRef.current);
    productsSearchRef.current = setTimeout(() => {
      setProductsPage(1);
      fetchProducts(v, 1);
    }, 300);
  };

  const handleUsersSearch = (v: string) => {
    setUsersSearch(v);
    if (usersSearchRef.current) clearTimeout(usersSearchRef.current);
    usersSearchRef.current = setTimeout(() => {
      setUsersPage(1);
      fetchUsers(v, 1);
    }, 300);
  };

  // ── Detail modal open ──

  const openProductDetail = (p: ProductRow) => {
    detailFilterRef.current = { product_id: p.product_id };
    setDetailTitle(p.name);
    setDetailPage(1);
    setDetailOpen(true);
    fetchDetail({ product_id: p.product_id }, 1);
  };

  const openUserDetail = (u: UserRow) => {
    detailFilterRef.current = { user_id: u.user_id };
    setDetailTitle(u.full_name);
    setDetailPage(1);
    setDetailOpen(true);
    fetchDetail({ user_id: u.user_id }, 1);
  };

  const handleDetailPageChange = (newPage: number) => {
    setDetailPage(newPage);
    fetchDetail(detailFilterRef.current, newPage);
  };

  // ── Tab config ──

  const tabs: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "products", label: "Products", icon: Package },
    { key: "users", label: "Users", icon: Users },
  ];

  // ====================================================================
  // RENDER
  // ====================================================================

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Try-On Analytics</h1>
          <p className="text-sm text-muted-foreground">
            View all AI try-on generations, products, and users
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      {tab === "overview" && <OverviewTab stats={stats} loading={statsLoading} />}
      {tab === "products" && (
        <DataTab
          type="products"
          data={products}
          loading={productsLoading}
          search={productsSearch}
          onSearch={handleProductsSearch}
          page={productsPage}
          totalPages={productsTotalPages}
          total={productsTotal}
          onPageChange={setProductsPage}
          onRowClick={openProductDetail}
        />
      )}
      {tab === "users" && (
        <DataTab
          type="users"
          data={users}
          loading={usersLoading}
          search={usersSearch}
          onSearch={handleUsersSearch}
          page={usersPage}
          totalPages={usersTotalPages}
          total={usersTotal}
          onPageChange={setUsersPage}
          onRowClick={openUserDetail}
        />
      )}

      {/* ── Detail Modal ── */}
      {detailOpen && (
        <DetailModal
          title={detailTitle}
          generations={detailGenerations}
          loading={detailLoading}
          page={detailPage}
          totalPages={detailTotalPages}
          total={detailTotal}
          onPageChange={handleDetailPageChange}
          onClose={() => setDetailOpen(false)}
          onPreview={setPreviewImage}
        />
      )}

      {/* ── Image Preview ── */}
      {previewImage && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/80"
            onClick={() => setPreviewImage(null)}
            onKeyDown={(e) => e.key === "Escape" && setPreviewImage(null)}
            role="none"
          />
          {/* Image container */}
          <div className="pointer-events-none fixed inset-0 z-[61] flex items-center justify-center">
            <div className="pointer-events-auto relative max-h-[90vh] max-w-[90vw]">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -right-3 -top-3 z-[62] rounded-full bg-white p-1 shadow-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
              <img
                src={resolveImageUrl(previewImage) || ""}
                alt="Preview"
                className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ====================================================================
// OVERVIEW TAB
// ====================================================================

function OverviewTab({ stats, loading }: Readonly<{ stats: Stats | null; loading: boolean }>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!stats) {
    return <p className="py-10 text-center text-muted-foreground">No data available</p>;
  }

  const successRate = stats.total_generations > 0
    ? ((stats.completed / stats.total_generations) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Zap} label="Total Generations" value={stats.total_generations} />
        <StatCard icon={Calendar} label="Today" value={stats.today_count} />
        <StatCard icon={Users} label="Unique Users" value={stats.total_users} />
        <StatCard icon={Package} label="Products Used" value={stats.total_products} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="emerald" />
        <StatCard icon={XCircle} label="Failed" value={stats.failed} color="red" />
        <StatCard icon={TrendingUp} label="Success Rate" value={`${successRate}%`} color="blue" />
        <StatCard
          icon={Clock}
          label="Avg Time"
          value={stats.avg_generation_time_ms ? `${(stats.avg_generation_time_ms / 1000).toFixed(1)}s` : "—"}
        />
      </div>

      {/* ── Daily Trend ── */}
      {stats.daily_trend.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">Daily Generations (Last 14 Days)</h3>
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {(() => {
              const maxCount = Math.max(...stats.daily_trend.map((d) => d.count), 1);
              return stats.daily_trend.map((d, i) => {
                const height = Math.max((d.count / maxCount) * 100, 2);
                const dayLabel = new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return (
                  <div
                    key={d.day}
                    className="group relative flex flex-1 flex-col items-center"
                    title={`${dayLabel}: ${d.count}`}
                  >
                    <div
                      className="w-full max-w-[32px] rounded-t bg-blue-500 transition-colors group-hover:bg-blue-600"
                      style={{ height: `${height}%` }}
                    />
                    <span className="mt-1 text-[9px] text-muted-foreground">{dayLabel}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* ── Top Products & Users ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top products */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">Top Products</h3>
          {stats.top_products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.top_products.map((p) => (
                <div key={p.product_id} className="flex items-center gap-3">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded border bg-muted">
                    {p.main_image ? (
                      <img
                        src={thumbnailUrl(p.main_image) || ""}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {p.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top users */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">Top Users</h3>
          {stats.top_users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.top_users.map((u) => (
                <div key={u.user_id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-bold uppercase">
                    {u.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                    {u.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// STAT CARD
// ====================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: Readonly<{
  icon: typeof Zap;
  label: string;
  value: string | number;
  color?: "emerald" | "red" | "blue";
}>) {
  const colorStyles = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
  };
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={cn("h-4 w-4", color && colorStyles[color])} />
        <span className="text-xs">{label}</span>
      </div>
      <p className={cn("mt-1 text-2xl font-bold", color && colorStyles[color])}>
        {value}
      </p>
    </div>
  );
}

// ====================================================================
// DATA TAB (Products / Users)
// ====================================================================

function DataTab({
  type,
  data,
  loading,
  search,
  onSearch,
  page,
  totalPages,
  total,
  onPageChange,
  onRowClick,
}: Readonly<{
  type: "products" | "users";
  data: ProductRow[] | UserRow[];
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
  onRowClick: (item: any) => void;
}>) {
  return (
    <div className="space-y-4">
      {/* Search + count */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={type === "products" ? "Search products..." : "Search users..."}
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <span className="text-sm text-muted-foreground">{total} {type}</span>
      </div>

      {/* Table */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {!loading && data.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">
          No {type} found
        </p>
      )}
      {!loading && data.length > 0 && type === "products" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-center font-medium">Total</th>
                <th className="px-4 py-3 text-center font-medium">Completed</th>
                <th className="px-4 py-3 text-center font-medium">Failed</th>
                <th className="px-4 py-3 text-center font-medium">Users</th>
                <th className="px-4 py-3 text-right font-medium">Last Used</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data as ProductRow[]).map((p) => (
                <tr key={p.product_id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
                        {p.main_image ? (
                          <img src={thumbnailUrl(p.main_image) || ""} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        {p.product_code && (
                          <p className="text-xs text-muted-foreground">{p.product_code}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{p.total_generations}</td>
                  <td className="px-4 py-3 text-center text-emerald-600">{p.completed_count}</td>
                  <td className="px-4 py-3 text-center text-red-500">{p.failed_count}</td>
                  <td className="px-4 py-3 text-center">{p.unique_users}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-muted-foreground">
                    {formatDate(p.last_used_at)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onRowClick(p)}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    >
                      <Eye className="h-3 w-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && data.length > 0 && type === "users" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-center font-medium">Total</th>
                <th className="px-4 py-3 text-center font-medium">Completed</th>
                <th className="px-4 py-3 text-center font-medium">Failed</th>
                <th className="px-4 py-3 text-center font-medium">Products</th>
                <th className="px-4 py-3 text-right font-medium">Last Used</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data as UserRow[]).map((u) => (
                <tr key={u.user_id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-sm font-bold uppercase">
                        {u.profile_image ? (
                          <img src={resolveImageUrl(u.profile_image) || ""} alt="" className="h-full w-full object-cover" />
                        ) : (
                          u.full_name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{u.total_generations}</td>
                  <td className="px-4 py-3 text-center text-emerald-600">{u.completed_count}</td>
                  <td className="px-4 py-3 text-center text-red-500">{u.failed_count}</td>
                  <td className="px-4 py-3 text-center">{u.unique_products}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-muted-foreground">
                    {formatDate(u.last_used_at)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onRowClick(u)}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    >
                      <Eye className="h-3 w-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================================================
// DETAIL MODAL (Images)
// ====================================================================

function DetailModal({
  title,
  generations,
  loading,
  page,
  totalPages,
  total,
  onPageChange,
  onClose,
  onPreview,
}: Readonly<{
  title: string;
  generations: Generation[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
  onClose: () => void;
  onPreview: (url: string) => void;
}>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{total} completed generation{total === 1 ? "" : "s"}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && generations.length === 0 && (
            <p className="py-10 text-center text-muted-foreground">
              No completed generations found
            </p>
          )}
          {!loading && generations.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {generations.map((g) => (
                <div key={g.id} className="overflow-hidden rounded-lg border">
                  {/* User info */}
                  <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase">
                      {g.user_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{g.user_name}</p>
                    </div>
                    {statusBadge(g.status)}
                  </div>

                  {/* Images side by side */}
                  <div className="grid grid-cols-2 gap-px bg-muted">
                    {/* User photo */}
                    <button
                      type="button"
                      className="relative block w-full cursor-pointer border-none bg-background p-0 outline-none"
                      onClick={() => g.user_photo_url && onPreview(g.user_photo_url)}
                    >
                      <div className="aspect-[3/4] overflow-hidden">
                        {g.user_photo_url ? (
                          <img
                            src={resolveImageUrl(g.user_photo_url) || ""}
                            alt="User upload"
                            className="h-full w-full object-cover transition-transform hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Original
                      </span>
                    </button>

                    {/* AI generated */}
                    <button
                      type="button"
                      className="relative block w-full cursor-pointer border-none bg-background p-0 outline-none"
                      onClick={() => g.generated_image_url && onPreview(g.generated_image_url)}
                    >
                      <div className="aspect-[3/4] overflow-hidden">
                        {g.generated_image_url ? (
                          <img
                            src={resolveImageUrl(g.generated_image_url) || ""}
                            alt="AI generated"
                            className="h-full w-full object-cover transition-transform hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-1 left-1 rounded bg-blue-600/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        AI Result
                      </span>
                    </button>
                  </div>

                  {/* Meta */}
                  <div className="space-y-1 px-3 py-2 text-xs text-muted-foreground">
                    <p className="truncate">
                      <span className="font-medium text-foreground">{g.product_name}</span>
                      {g.color_name && (
                        <span className="ml-1">• {g.color_name}</span>
                      )}
                    </p>
                    <div className="flex items-center justify-between">
                      <span>{formatDate(g.created_at)}</span>
                      {g.generation_time_ms && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {(g.generation_time_ms / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
