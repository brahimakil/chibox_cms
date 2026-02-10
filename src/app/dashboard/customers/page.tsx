"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Search,
  X,
  Loader2,
  MoreHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Star,
  Heart,
  Ticket,
  MapPin,
  Smartphone,
  Monitor,
  Mail,
  Phone,
  Clock,
  DollarSign,
  ArrowUpDown,
  UserCheck,
  UserX,
  Info,
  ChevronsLeft,
  ChevronsRight,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveImageUrl } from "@/lib/image-url";

/* ─── Types ─── */

interface Customer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  country_code: string | null;
  phone_number: string | null;
  gender: string | null;
  is_active: number;
  is_activated: number;
  type: number;
  device_type: string | null;
  device_id: string | null;
  main_image: string | null;
  last_login: string | null;
  is_provider: number | null;
  r_store_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  orders_count: number;
  total_spent: number;
  reviews_count: number;
  coupons_used: number;
  favorites_count: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CustomerProfile {
  customer: Customer;
  stats: {
    orders_count: number;
    total_spent: number;
    total_discount: number;
    avg_order_value: number;
    last_order_date: string | null;
    reviews_count: number;
    avg_rating: number | null;
    favorites_count: number;
    balance_credit: number;
    balance_debit: number;
  };
  orders: OrderRecord[];
  reviews: ReviewRecord[];
  coupon_usages: CouponUsageRecord[];
  addresses: AddressRecord[];
  last_device: DeviceRecord | null;
}

interface OrderRecord {
  id: number;
  total: number;
  subtotal: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  shipping_amount: number;
  quantity: number;
  status: number;
  status_label: string;
  is_paid: number;
  payment_type: number;
  shipping_method: string | null;
  country: string;
  city: string;
  coupon_code: number | null;
  created_at: string | null;
}

interface ReviewRecord {
  id: number;
  r_product_id: number;
  rating: number;
  text: string | null;
  status: number;
  created_at: string | null;
}

interface CouponUsageRecord {
  id: number;
  status: string;
  coupon_code: string;
  coupon_discount: string;
  order_id: number | null;
  claimed_at: string | null;
  used_at: string | null;
}

interface AddressRecord {
  id: number;
  first_name: string;
  last_name: string;
  country_code: string;
  phone_number: string;
  address: string;
  state: string | null;
  is_default: number;
  route_name: string;
  building_name: string;
  floor_number: number;
}

interface DeviceRecord {
  os: string;
  brand: string;
  model: string;
  manufacturer: string;
  device_id: string;
  screen: string;
  logged_at: string | null;
}

/* ─── Constants ─── */

const AUTH_TYPES: Record<number, string> = {
  3: "Email/Phone",
  4: "Google",
  5: "Apple",
  6: "Facebook",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Processing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  Shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Delivered: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  Refunded: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  Failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  "On Hold": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const PAYMENT_TYPES: Record<number, string> = {
  1: "Cash on Delivery",
  2: "Card",
  3: "Whish Money",
};

/* ─── Helpers ─── */

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function customerName(c: Customer | CustomerProfile["customer"]) {
  const name = `${c.first_name || ""} ${c.last_name || ""}`.trim();
  return name || c.email || `Customer #${c.id}`;
}

function timeAgo(d: string | null) {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/* ════════════════════════════════════════════════════════════ */

export default function CustomersPage() {
  return (
    <Suspense>
      <CustomersPageContent />
    </Suspense>
  );
}

function CustomersPageContent() {
  /* ─── List State ─── */
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");

  /* ─── Detail Dialog State ─── */
  const [detailOpen, setDetailOpen] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "reviews" | "coupons" | "addresses" | "device">("orders");

  /* ─── Fetch List ─── */
  const fetchCustomers = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pagination.limit),
          sort: sortField,
          order: sortOrder,
        });
        if (searchQuery) params.set("search", searchQuery);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (deviceFilter !== "all") params.set("device", deviceFilter);

        const res = await fetch(`/api/customers?${params}`);
        const data = await res.json();
        setCustomers(data.customers || []);
        setPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
      } catch (err) {
        console.error("Failed to fetch customers:", err);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, sortField, sortOrder, statusFilter, deviceFilter, pagination.limit]
  );

  useEffect(() => {
    fetchCustomers(1);
  }, [searchQuery, sortField, sortOrder, statusFilter, deviceFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Search debounce ─── */
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ─── Open Customer Detail ─── */
  const openDetail = async (c: Customer) => {
    openDetailById(c.id);
  };

  const openDetailById = async (id: number) => {
    setDetailOpen(true);
    setProfileLoading(true);
    setActiveTab("orders");
    try {
      const res = await fetch(`/api/customers/${id}`);
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error("Failed to fetch customer profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  /* ─── Handle viewUser query param ─── */
  const searchParams = useSearchParams();
  const viewUserHandled = useRef(false);
  useEffect(() => {
    const viewUserId = searchParams.get("viewUser");
    if (viewUserId && !viewUserHandled.current) {
      viewUserHandled.current = true;
      openDetailById(Number(viewUserId));
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Toggle Active ─── */
  const toggleActive = async (c: Customer) => {
    try {
      await fetch(`/api/customers/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: c.is_active === 1 ? 0 : 1 }),
      });
      fetchCustomers(pagination.page);
    } catch (err) {
      console.error("Failed to toggle customer:", err);
    }
  };

  /* ─── Toggle Sort ─── */
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  /* ─── Stats ─── */
  const totalCustomers = pagination.total;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Customers
          </h1>
          <p className="mt-1 text-muted-foreground">
            {totalCustomers.toLocaleString()} registered customers
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Total
          </div>
          <p className="mt-1 text-2xl font-bold">{totalCustomers.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            iOS
          </div>
          <p className="mt-1 text-2xl font-bold">
            {customers.filter((c) => c.device_type === "ios").length > 0
              ? customers.filter((c) => c.device_type === "ios").length
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            Android
          </div>
          <p className="mt-1 text-2xl font-bold">
            {customers.filter((c) => c.device_type === "android").length > 0
              ? customers.filter((c) => c.device_type === "android").length
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Monitor className="h-4 w-4" />
            Web
          </div>
          <p className="mt-1 text-2xl font-bold">
            {customers.filter((c) => c.device_type === "web").length > 0
              ? customers.filter((c) => c.device_type === "web").length
              : "—"}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-700 dark:text-blue-400/80">
          Click any customer to view their full profile — order history, reviews,
          addresses, coupon usage, device info, and account balance.
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, phone, or ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => {
                setSearchInput("");
                setSearchQuery("");
              }}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Disabled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={deviceFilter} onValueChange={setDeviceFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Device" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            <SelectItem value="ios">iOS</SelectItem>
            <SelectItem value="android">Android</SelectItem>
            <SelectItem value="web">Web</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-[400px] items-center justify-center rounded-xl border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex h-[400px] flex-col items-center justify-center gap-4 p-8">
            <div className="rounded-full bg-muted p-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">No customers found</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "Customer accounts will appear here once users register."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">
                    <button
                      onClick={() => handleSort("first_name")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Customer
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Contact</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">
                    <button
                      onClick={() => handleSort("created_at")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Joined
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-medium">Orders</th>
                  <th className="px-4 py-3 text-right font-medium">Spent</th>
                  <th className="px-4 py-3 text-center font-medium">Device</th>
                  <th className="px-4 py-3 text-center font-medium">Auth</th>
                  <th className="w-[50px] px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b transition-colors hover:bg-muted/30 cursor-pointer"
                    onClick={() => openDetail(c)}
                  >
                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-xs font-bold uppercase text-blue-700 dark:text-blue-300">
                          {c.main_image ? (
                            <img
                              src={resolveImageUrl(c.main_image)}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            (c.first_name?.[0] || c.email?.[0] || "?")
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {customerName(c)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            ID: {c.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {c.email && (
                          <p className="flex items-center gap-1 truncate max-w-[200px]">
                            <Mail className="h-3 w-3 shrink-0" />
                            {c.email}
                          </p>
                        )}
                        {c.phone_number && (
                          <p className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            {c.country_code} {c.phone_number}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-start gap-1">
                        <Badge
                          variant={c.is_active === 1 ? "success" : "destructive"}
                          className="text-[10px]"
                        >
                          {c.is_active === 1 ? "Active" : "Disabled"}
                        </Badge>
                        {c.is_activated === 1 && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <UserCheck className="h-2.5 w-2.5" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <p>{formatDate(c.created_at)}</p>
                        <p className="text-muted-foreground">
                          Last: {timeAgo(c.last_login)}
                        </p>
                      </div>
                    </td>

                    {/* Orders */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold">{c.orders_count}</span>
                    </td>

                    {/* Spent */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold">
                        {c.total_spent > 0
                          ? formatCurrency(c.total_spent)
                          : "—"}
                      </span>
                    </td>

                    {/* Device */}
                    <td className="px-4 py-3 text-center">
                      {c.device_type ? (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {c.device_type === "ios" ? (
                            <Smartphone className="mr-1 h-2.5 w-2.5" />
                          ) : c.device_type === "android" ? (
                            <Smartphone className="mr-1 h-2.5 w-2.5" />
                          ) : (
                            <Monitor className="mr-1 h-2.5 w-2.5" />
                          )}
                          {c.device_type}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Auth Type */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-muted-foreground">
                        {AUTH_TYPES[c.type] || `Type ${c.type}`}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(c)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleActive(c)}>
                            {c.is_active === 1 ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Disable Account
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Enable Account
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total.toLocaleString()}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pagination.page === 1}
                  onClick={() => fetchCustomers(1)}
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pagination.page === 1}
                  onClick={() => fetchCustomers(pagination.page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-3 text-sm font-medium">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchCustomers(pagination.page + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchCustomers(pagination.totalPages)}
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Customer Detail Dialog ═══ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
          {profileLoading || !profile ? (
            <div className="flex h-[400px] items-center justify-center">
              <DialogTitle className="sr-only">Customer Details</DialogTitle>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-sm font-bold uppercase text-blue-700 dark:text-blue-300">
                    {profile.customer.main_image ? (
                      <img
                        src={resolveImageUrl(profile.customer.main_image)}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      (profile.customer.first_name?.[0] || "?")
                    )}
                  </div>
                  <div>
                    <span>{customerName(profile.customer)}</span>
                    <p className="text-xs font-normal text-muted-foreground">
                      ID: {profile.customer.id} · Joined {formatDate(profile.customer.created_at)} ·{" "}
                      {AUTH_TYPES[profile.customer.type] || "Unknown"}
                    </p>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  {profile.customer.email && (
                    <span className="mr-4">{profile.customer.email}</span>
                  )}
                  {profile.customer.phone_number && (
                    <span>
                      {profile.customer.country_code} {profile.customer.phone_number}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                <StatCard icon={ShoppingCart} label="Orders" value={String(profile.stats.orders_count)} />
                <StatCard
                  icon={DollarSign}
                  label="Spent"
                  value={
                    profile.stats.total_spent > 0
                      ? formatCurrency(profile.stats.total_spent)
                      : "—"
                  }
                />
                <StatCard
                  icon={DollarSign}
                  label="Avg Order"
                  value={
                    profile.stats.avg_order_value > 0
                      ? formatCurrency(profile.stats.avg_order_value)
                      : "—"
                  }
                />
                <StatCard icon={Star} label="Reviews" value={String(profile.stats.reviews_count)} />
                <StatCard icon={Heart} label="Favorites" value={String(profile.stats.favorites_count)} />
                <StatCard
                  icon={DollarSign}
                  label="Balance"
                  value={formatCurrency(
                    (profile.stats.balance_credit || 0) -
                      (profile.stats.balance_debit || 0)
                  )}
                />
              </div>

              {/* Customer Info Row */}
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant={profile.customer.is_active === 1 ? "success" : "destructive"}>
                  {profile.customer.is_active === 1 ? "Active" : "Disabled"}
                </Badge>
                {profile.customer.is_activated === 1 && (
                  <Badge variant="secondary" className="gap-1">
                    <UserCheck className="h-2.5 w-2.5" />
                    Verified
                  </Badge>
                )}
                {profile.customer.gender && (
                  <Badge variant="outline" className="capitalize">
                    {profile.customer.gender}
                  </Badge>
                )}
                {profile.customer.device_type && (
                  <Badge variant="outline" className="capitalize gap-1">
                    <Smartphone className="h-2.5 w-2.5" />
                    {profile.customer.device_type}
                  </Badge>
                )}
                {profile.customer.is_provider === 1 && (
                  <Badge variant="secondary">Provider</Badge>
                )}
                {profile.customer.last_login && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    Last login: {timeAgo(profile.customer.last_login)}
                  </Badge>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b">
                {(
                  [
                    { key: "orders", label: "Orders", icon: ShoppingCart, count: profile.stats.orders_count },
                    { key: "reviews", label: "Reviews", icon: Star, count: profile.stats.reviews_count },
                    { key: "coupons", label: "Coupons", icon: Ticket, count: profile.coupon_usages.length },
                    { key: "addresses", label: "Addresses", icon: MapPin, count: profile.addresses.length },
                    { key: "device", label: "Device", icon: Smartphone, count: null },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                      activeTab === tab.key
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {tab.count !== null && tab.count > 0 && (
                      <span className="rounded-full bg-muted px-1.5 text-[10px]">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[200px]">
                {/* Orders Tab */}
                {activeTab === "orders" && (
                  <div className="space-y-2">
                    {profile.orders.length === 0 ? (
                      <EmptyTabState icon={ShoppingCart} message="No orders yet" />
                    ) : (
                      profile.orders.map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center gap-4 rounded-lg border p-3 text-sm"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">#{o.id}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  ORDER_STATUS_COLORS[o.status_label] || "bg-muted text-muted-foreground"
                                }`}
                              >
                                {o.status_label}
                              </span>
                              {o.is_paid === 1 && (
                                <Badge variant="success" className="text-[9px]">
                                  Paid
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatDate(o.created_at)} · {o.quantity} items ·{" "}
                              {o.country}, {o.city}
                              {o.coupon_code && ` · Coupon #${o.coupon_code}`}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold">{formatCurrency(o.total)}</p>
                            {o.discount_amount && o.discount_amount > 0 && (
                              <p className="text-[10px] text-emerald-600">
                                -{formatCurrency(o.discount_amount)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {profile.stats.orders_count > 20 && (
                      <p className="text-center text-xs text-muted-foreground pt-2">
                        Showing latest 20 of {profile.stats.orders_count} orders
                      </p>
                    )}
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === "reviews" && (
                  <div className="space-y-2">
                    {profile.reviews.length === 0 ? (
                      <EmptyTabState icon={Star} message="No reviews yet" />
                    ) : (
                      profile.reviews.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                        >
                          <div className="flex items-center gap-0.5 pt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < r.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">
                              Product #{r.r_product_id} · {formatDate(r.created_at)}
                            </p>
                            {r.text && <p className="mt-1">{r.text}</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Coupons Tab */}
                {activeTab === "coupons" && (
                  <div className="space-y-2">
                    {profile.coupon_usages.length === 0 ? (
                      <EmptyTabState icon={Ticket} message="No coupons used" />
                    ) : (
                      profile.coupon_usages.map((cu) => (
                        <div
                          key={cu.id}
                          className="flex items-center gap-4 rounded-lg border p-3 text-sm"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Ticket className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold">
                                {cu.coupon_code}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {cu.coupon_discount}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                                  cu.status === "redeemed"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                    : cu.status === "claimed"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                }`}
                              >
                                {cu.status}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Claimed: {formatDate(cu.claimed_at)}
                              {cu.order_id && ` · Order #${cu.order_id}`}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Addresses Tab */}
                {activeTab === "addresses" && (
                  <div className="space-y-2">
                    {profile.addresses.length === 0 ? (
                      <EmptyTabState icon={MapPin} message="No saved addresses" />
                    ) : (
                      profile.addresses.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                        >
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {a.first_name} {a.last_name}
                              </span>
                              {a.is_default === 1 && (
                                <Badge variant="secondary" className="text-[9px]">
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {a.address}, {a.route_name}, {a.building_name}, Floor{" "}
                              {a.floor_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {a.country_code} {a.phone_number}
                              {a.state && ` · ${a.state}`}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Device Tab */}
                {activeTab === "device" && (
                  <div className="space-y-3">
                    {profile.last_device ? (
                      <div className="grid grid-cols-2 gap-3">
                        <DeviceInfoRow label="OS" value={profile.last_device.os} />
                        <DeviceInfoRow label="Brand" value={profile.last_device.brand} />
                        <DeviceInfoRow label="Model" value={profile.last_device.model} />
                        <DeviceInfoRow
                          label="Manufacturer"
                          value={profile.last_device.manufacturer}
                        />
                        <DeviceInfoRow
                          label="Screen"
                          value={profile.last_device.screen}
                        />
                        <DeviceInfoRow
                          label="Device ID"
                          value={profile.last_device.device_id}
                        />
                        <DeviceInfoRow
                          label="Last Seen"
                          value={formatDateTime(profile.last_device.logged_at)}
                        />
                        {profile.customer.device_type && (
                          <DeviceInfoRow
                            label="Current Type"
                            value={profile.customer.device_type}
                          />
                        )}
                      </div>
                    ) : (
                      <EmptyTabState
                        icon={Smartphone}
                        message="No device information available"
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border p-2.5 text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <p className="mt-1 text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyTabState({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="flex h-[150px] flex-col items-center justify-center gap-2 text-muted-foreground">
      <Icon className="h-6 w-6" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function DeviceInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium truncate">{value}</p>
    </div>
  );
}
