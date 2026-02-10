"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Ticket,
  RefreshCw,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

interface DashboardData {
  stats: {
    totalRevenue: number;
    thisMonthRevenue: number;
    revenueChange: number;
    totalOrders: number;
    ordersThisMonth: number;
    ordersChange: number;
    totalProducts: number;
    totalCustomers: number;
    customersThisMonth: number;
    customersChange: number;
    totalCoupons: number;
  };
  charts: {
    monthlyRevenue: Array<{ name: string; revenue: number; orders: number }>;
    ordersByStatus: Array<{ name: string; value: number; status: number }>;
    ordersByPaymentType: Array<{ name: string; count: number; revenue: number }>;
    dailyOrders: Array<{ date: string; orders: number; revenue: number }>;
  };
  recentOrders: Array<{
    id: number;
    customer: string;
    total: number;
    status: string;
    statusCode: number;
    quantity: number;
    isPaid: boolean;
    paymentType: string;
    createdAt: string;
  }>;
  topProducts: Array<{
    id: number;
    name: string;
    image: string | null;
    price: number;
    orders: number;
  }>;
}

const STATUS_COLORS: Record<number, string> = {
  0: "#f59e0b", 1: "#3b82f6", 2: "#8b5cf6", 3: "#10b981",
  4: "#ef4444", 5: "#f97316", 6: "#6366f1", 7: "#eab308",
  8: "#dc2626", 9: "#06b6d4", 10: "#22c55e",
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#22c55e", "#eab308", "#6366f1"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function StatusBadge({ status, code }: { status: string; code: number }) {
  const colors: Record<number, string> = {
    0: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    1: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    2: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    3: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    4: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    5: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    9: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400",
    10: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[code] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Loading your store overview...</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[140px] animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-full lg:col-span-4 h-[400px] animate-pulse rounded-xl border bg-card" />
          <div className="col-span-full lg:col-span-3 h-[400px] animate-pulse rounded-xl border bg-card" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, charts, recentOrders, topProducts } = data;

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      subtitle: `${formatCurrency(stats.thisMonthRevenue)} this month`,
      change: `${stats.revenueChange > 0 ? "+" : ""}${stats.revenueChange}%`,
      trend: stats.revenueChange >= 0 ? "up" : "down",
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      title: "Orders",
      value: formatNumber(stats.totalOrders),
      subtitle: `${stats.ordersThisMonth} this month`,
      change: `${stats.ordersChange > 0 ? "+" : ""}${stats.ordersChange}%`,
      trend: stats.ordersChange >= 0 ? "up" : "down",
      icon: ShoppingCart,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      title: "Products",
      value: formatNumber(stats.totalProducts),
      subtitle: "Active in catalog",
      change: "",
      trend: "up" as const,
      icon: Package,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/50",
    },
    {
      title: "Customers",
      value: formatNumber(stats.totalCustomers),
      subtitle: `${stats.customersThisMonth} this month`,
      change: `${stats.customersChange > 0 ? "+" : ""}${stats.customersChange}%`,
      trend: stats.customersChange >= 0 ? "up" : "down",
      icon: Users,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back! Here&apos;s your store overview.
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-lg p-2.5 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              {stat.change && (
                <div className="flex items-center gap-1 text-xs font-medium">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span className={stat.trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                    {stat.change}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                {stat.subtitle}
                <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Revenue Chart + Orders by Status */}
      <div className="grid gap-4 lg:grid-cols-7">
        <div className="col-span-full rounded-xl border bg-card p-5 shadow-sm lg:col-span-4">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Revenue Overview</h3>
            <p className="text-xs text-muted-foreground">Monthly revenue for {new Date().getFullYear()}</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyRevenue} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" tickFormatter={(v) => `$${formatNumber(v)}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-full rounded-xl border bg-card p-5 shadow-sm lg:col-span-3">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Orders by Status</h3>
            <p className="text-xs text-muted-foreground">Distribution of all orders</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.ordersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={{ strokeWidth: 1 }}
                >
                  {charts.ordersByStatus.map((entry, index) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.status] || PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Daily Orders + Payment Methods */}
      <div className="grid gap-4 lg:grid-cols-7">
        <div className="col-span-full rounded-xl border bg-card p-5 shadow-sm lg:col-span-4">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Daily Orders</h3>
            <p className="text-xs text-muted-foreground">Last 30 days trend</p>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.dailyOrders} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }} />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                />
                <Legend />
                <Area type="monotone" dataKey="orders" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} name="Orders" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-full rounded-xl border bg-card p-5 shadow-sm lg:col-span-3">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Payment Methods</h3>
            <p className="text-xs text-muted-foreground">Revenue by payment type</p>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.ordersByPaymentType} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" tickFormatter={(v) => `$${formatNumber(v)}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Orders + Top Products */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Recent Orders</h3>
              <p className="text-xs text-muted-foreground">Latest 10 orders</p>
            </div>
            <a href="/dashboard/orders" className="text-xs font-medium text-primary hover:underline">View all &rarr;</a>
          </div>
          <div className="space-y-0 divide-y">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">#{order.id}</span>
                    <StatusBadge status={order.status} code={order.statusCode} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {order.customer} &middot; {order.quantity} items
                  </p>
                </div>
                <div className="ml-4 shrink-0 text-right">
                  <p className="text-sm font-semibold">{formatCurrency(order.total)}</p>
                  <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {timeAgo(order.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No orders yet</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Top Products</h3>
              <p className="text-xs text-muted-foreground">By number of orders</p>
            </div>
            <a href="/dashboard/products" className="text-xs font-medium text-primary hover:underline">View all &rarr;</a>
          </div>
          <div className="space-y-0 divide-y">
            {topProducts.map((product, i) => (
              <div key={product.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(product.price)} &middot; {product.orders} orders
                  </p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No product data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Coupons stat */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-pink-50 p-2.5 dark:bg-pink-950/50">
            <Ticket className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active Coupons</p>
            <p className="text-xl font-bold">{stats.totalCoupons}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
