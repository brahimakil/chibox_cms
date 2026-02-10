"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Eye,
  Clock,
  DollarSign,
  Truck,
  Package,
  Loader2,
  ArrowUpDown,
  ChevronsUpDown,
} from "lucide-react";
import { ORDER_STATUS, SHIPPING_STATUS } from "@/lib/order-constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Status badge component ────────────────────────────────────────────
function StatusBadge({ label, color }: { label: string; color: string }) {
  const colorMap: Record<string, string> = {
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[color] || colorMap.gray}`}
    >
      {label}
    </span>
  );
}

// ── Quick stats card ──────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  const bg: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400",
    green: "bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${bg[color] || bg.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 25, totalCount: 0, totalPages: 0 });

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isPaidFilter, setIsPaidFilter] = useState("");
  const [shippingStatusFilter, setShippingStatusFilter] = useState("");
  const [shippingMethodFilter, setShippingMethodFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [fullyPaidFirst, setFullyPaidFirst] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "25");
        if (search) params.set("search", search);
        if (statusFilter !== "") params.set("status", statusFilter);
        if (isPaidFilter !== "") params.set("is_paid", isPaidFilter);
        if (shippingStatusFilter !== "") params.set("shipping_status", shippingStatusFilter);
        if (shippingMethodFilter) params.set("shipping_method", shippingMethodFilter);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);
        params.set("sort_by", sortBy);
        params.set("sort_dir", sortDir);
        if (fullyPaidFirst) params.set("fully_paid_first", "1");

        const res = await fetch(`/api/orders?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setOrders(data.orders);
        setPagination(data.pagination);
        setStats(data.stats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, isPaidFilter, shippingStatusFilter, shippingMethodFilter, dateFrom, dateTo, sortBy, sortDir, fullyPaidFirst]
  );

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setIsPaidFilter("");
    setShippingStatusFilter("");
    setShippingMethodFilter("");
    setDateFrom("");
    setDateTo("");
    setSortBy("created_at");
    setSortDir("desc");
    setFullyPaidFirst(false);
  };

  const hasActiveFilters =
    search ||
    statusFilter !== "" ||
    isPaidFilter !== "" ||
    shippingStatusFilter !== "" ||
    shippingMethodFilter ||
    dateFrom ||
    dateTo;

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const exportCSV = () => {
    if (orders.length === 0) return;
    const headers = ["Order #", "Customer", "Items", "Total", "Product Paid", "Shipping", "Method", "Status", "Created"];
    const rows = orders.map((o: any) => [
      o.id,
      o.customer_name,
      o.item_count,
      `$${Number(o.total).toFixed(2)}`,
      o.is_paid ? "Yes" : "No",
      o.shipping_status_label,
      o.shipping_method || "-",
      o.status_label,
      new Date(o.created_at).toLocaleDateString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage customer orders, shipping, and payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent ${showFilters ? "bg-accent" : "bg-background"}`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                !
              </span>
            )}
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={ShoppingCart} label="Total Orders" value={stats.totalOrders ?? "—"} color="blue" />
        <StatCard icon={Clock} label="Pending Review" value={stats.pendingReview ?? "—"} color="yellow" />
        <StatCard icon={Truck} label="Ready to Ship" value={stats.readyToShip ?? "—"} color="green" />
        <StatCard
          icon={DollarSign}
          label="Today Revenue"
          value={stats.todayRevenue ? `$${Number(stats.todayRevenue).toFixed(0)}` : "$0"}
          color="emerald"
        />
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Filters</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {/* Search */}
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Order # or customer name…"
                  className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {Object.entries(ORDER_STATUS).map(([code, { label }]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Product Paid</label>
              <select
                value={isPaidFilter}
                onChange={(e) => setIsPaidFilter(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="1">Paid</option>
                <option value="0">Unpaid</option>
              </select>
            </div>

            {/* Shipping Status */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Shipping Status</label>
              <select
                value={shippingStatusFilter}
                onChange={(e) => setShippingStatusFilter(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {Object.entries(SHIPPING_STATUS).map(([code, { label }]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Shipping Method */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Method</label>
              <select
                value={shippingMethodFilter}
                onChange={(e) => setShippingMethodFilter(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="air">✈️ Air</option>
                <option value="sea">🚢 Sea</option>
              </select>
            </div>

            {/* Date range */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Fully paid first toggle */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={fullyPaidFirst}
                  onChange={(e) => setFullyPaidFirst(e.target.checked)}
                  className="rounded border"
                />
                <span className="text-xs">Fully paid first</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-96 flex-col items-center justify-center gap-4 p-8">
            <div className="rounded-full bg-muted p-4">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">No orders found</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Try adjusting your filters to see more results."
                  : "Orders will appear here once customers start placing them."}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th
                      className="px-4 py-3 text-left font-medium cursor-pointer select-none hover:bg-muted/80"
                      onClick={() => handleSort("id")}
                    >
                      <span className="flex items-center gap-1">
                        Order #
                        {sortBy === "id" ? <ArrowUpDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Customer</th>
                    <th className="px-4 py-3 text-center font-medium">Items</th>
                    <th
                      className="px-4 py-3 text-right font-medium cursor-pointer select-none hover:bg-muted/80"
                      onClick={() => handleSort("total")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Total
                        {sortBy === "total" ? <ArrowUpDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center font-medium">Product</th>
                    <th className="px-4 py-3 text-center font-medium">Shipping</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th
                      className="px-4 py-3 text-left font-medium cursor-pointer select-none hover:bg-muted/80"
                      onClick={() => handleSort("created_at")}
                    >
                      <span className="flex items-center gap-1">
                        Created
                        {sortBy === "created_at" ? <ArrowUpDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/orders/${o.id}`)}>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/orders/${o.id}`} className="font-medium text-primary hover:underline">
                          #{o.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{o.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{o.country}{o.city ? `, ${o.city}` : ""}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Package className="h-3 w-3" /> {o.item_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Number(o.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {o.is_paid ? (
                          <StatusBadge label="Paid" color="green" />
                        ) : (
                          <StatusBadge label="Unpaid" color="red" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <StatusBadge label={o.shipping_status_label} color={o.shipping_status_color} />
                          {o.shipping_method && (
                            <span className="text-[10px] text-muted-foreground uppercase">
                              {o.shipping_method === "air" ? "✈️" : "🚢"} {o.shipping_method}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge label={o.status_label} color={o.status_color} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/dashboard/orders/${o.id}`}
                          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          <Eye className="h-3 w-3" /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="grid gap-3 p-3 lg:hidden">
              {orders.map((o: any) => (
                <Link
                  key={o.id}
                  href={`/dashboard/orders/${o.id}`}
                  className="rounded-lg border bg-background p-4 hover:bg-accent/50 transition-colors block"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-primary">#{o.id}</span>
                    <StatusBadge label={o.status_label} color={o.status_color} />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">{o.customer_name}</span>
                    <span className="text-sm font-medium">${Number(o.total).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {o.is_paid ? (
                      <StatusBadge label="Paid" color="green" />
                    ) : (
                      <StatusBadge label="Unpaid" color="red" />
                    )}
                    <StatusBadge label={o.shipping_status_label} color={o.shipping_status_color} />
                    {o.shipping_method && (
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {o.shipping_method === "air" ? "✈️" : "🚢"} {o.shipping_method}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(o.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{" "}
                  {pagination.totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchOrders(pagination.page - 1)}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </button>
                  <span className="text-sm font-medium">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchOrders(pagination.page + 1)}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
