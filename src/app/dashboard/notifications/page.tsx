"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell,
  Search,
  X,
  Loader2,
  MoreHorizontal,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Send,
  Users,
  User,
  ShoppingCart,
  Package,
  Tag,
  Globe,
  Megaphone,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Image as ImageIcon,
  Plus,
  Link2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

/* ═══════════════════════════════════════════ Types ═══ */

interface TargetUser {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  main_image: string | null;
}

interface Notification {
  id: number;
  r_user_id: number | null;
  is_seen: number;
  notification_type: string | null;
  subject: string;
  body: string;
  table_id: number | null;
  row_id: number | null;
  action_url: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  target_user: TargetUser | null;
  reach_count: number;
  seen_count: number;
}

interface DetailNotification {
  id: number;
  r_user_id: number | null;
  is_seen: number;
  notification_type: string | null;
  subject: string;
  body: string;
  table_id: number | null;
  row_id: number | null;
  action_url: string | null;
  image_url: string | null;
  created_at: string;
}

interface DetailRecipient {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  main_image: string | null;
  is_seen: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface RelatedEntity { type: string; data: Record<string, any> }

interface NotifDetail {
  notification: DetailNotification;
  target_user: TargetUser | null;
  recipient_stats: { total: number; seen: number; unseen: number } | null;
  recipients: DetailRecipient[];
  related_entity: RelatedEntity | null;
}

interface Pagination { page: number; limit: number; total: number; totalPages: number }
interface Stats { total: number; broadcast: number; order: number; promo: number }

interface SearchUser {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  main_image: string | null;
  device_type: string | null;
}

/* ═══════════════════════════════════════════ Constants ═══ */

const NOTIFICATION_TYPES: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  order: { label: "Order", icon: ShoppingCart, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300" },
  shipping: { label: "Shipping", icon: Package, color: "text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300" },
  product: { label: "Product", icon: Tag, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300" },
  category: { label: "Category", icon: Tag, color: "text-teal-600 bg-teal-100 dark:bg-teal-900/40 dark:text-teal-300" },
  promo: { label: "Promo", icon: Megaphone, color: "text-pink-600 bg-pink-100 dark:bg-pink-900/40 dark:text-pink-300" },
  cart: { label: "Cart", icon: ShoppingCart, color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300" },
  web: { label: "Web", icon: Globe, color: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-300" },
  general: { label: "General", icon: Bell, color: "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300" },
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  Confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Processing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  Shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Delivered: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  Cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Refunded: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  "On Hold": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

/* ═══════════════════════════════════════════ Helpers ═══ */

function timeAgo(d: string | null) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function userName(u: { first_name: string | null; last_name: string | null; email?: string | null } | null) {
  if (!u) return "Unknown User";
  const n = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return n || u.email || "Unknown User";
}

function getTypeInfo(t: string | null) {
  return NOTIFICATION_TYPES[t || "general"] || NOTIFICATION_TYPES.general;
}

/* ═══════════════════════════════════════════ Sub-components ═══ */

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: typeof Bell; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ Entity search types ═══ */

interface SearchProduct { id: number; product_name: string; product_code: string | null; product_price: number; main_image: string | null }
interface SearchCategory { id: number; category_name: string; level: number; product_count: number; main_image: string | null }
interface SearchOrder { id: number; total: number; status: number; status_label: string; address_first_name: string; address_last_name: string; created_at: string }

/* ═══════════════════════════════════════════ Main Page ═══ */

export default function NotificationsPage() {
  /* ─ Hydration guard ─ */
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  /* ─ List state ─ */
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<Stats>({ total: 0, broadcast: 0, order: 0, promo: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  /* ─ Detail dialog ─ */
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<NotifDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"info" | "recipients">("info");

  /* ─ Delete confirm ─ */
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  /* ─ Create/Send dialog ─ */
  const [createOpen, setCreateOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formTarget, setFormTarget] = useState<"all" | "user">("all");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formType, setFormType] = useState("general");
  const [formRowId, setFormRowId] = useState("");
  const [formActionUrl, setFormActionUrl] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formUserId, setFormUserId] = useState<number | null>(null);
  const [formSendPush, setFormSendPush] = useState(true);

  /* ─ Entity search for linked entity picker ─ */
  const [entitySearchInput, setEntitySearchInput] = useState("");
  const [entitySearchResults, setEntitySearchResults] = useState<(SearchProduct | SearchCategory | SearchOrder)[]>([]);
  const [entitySearching, setEntitySearching] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; id: number; label: string; image?: string | null } | null>(null);

  /* ─ Image (deferred upload) ─ */
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  /* ─ User search for single user targeting ─ */
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<SearchUser[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);

  /* ─── Fetch list ─── */
  const fetchNotifications = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ page: String(page), limit: "20", sort, order });
      if (search) sp.set("search", search);
      if (typeFilter !== "all") sp.set("type", typeFilter);
      if (targetFilter !== "all") sp.set("target", targetFilter === "all_broadcast" ? "all" : targetFilter);

      const res = await fetch(`/api/notifications?${sp}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      setStats(data.stats || { total: 0, broadcast: 0, order: 0, promo: 0 });
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [search, typeFilter, targetFilter, sort, order]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  /* ─── Debounced search ─── */
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ─── User search for create dialog ─── */
  useEffect(() => {
    if (!userSearchInput.trim() || userSearchInput.length < 2) {
      setUserSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setUserSearching(true);
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(userSearchInput)}&limit=8`);
        const data = await res.json();
        setUserSearchResults(
          (data.customers || []).map((c: SearchUser) => ({
            id: c.id, first_name: c.first_name, last_name: c.last_name,
            email: c.email, phone_number: c.phone_number,
            main_image: c.main_image, device_type: c.device_type,
          }))
        );
      } catch { /* ignore */ } finally {
        setUserSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [userSearchInput]);

  /* ─── Entity search for order/product/category picker ─── */
  useEffect(() => {
    if (!entitySearchInput.trim() || entitySearchInput.length < 2) {
      setEntitySearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setEntitySearching(true);
      try {
        let url = "";
        if (formType === "order" || formType === "shipping") {
          url = `/api/orders/search?search=${encodeURIComponent(entitySearchInput)}&limit=8`;
        } else if (formType === "product") {
          url = `/api/products?search=${encodeURIComponent(entitySearchInput)}&pageSize=8`;
        } else if (formType === "category") {
          url = `/api/categories/list?search=${encodeURIComponent(entitySearchInput)}&limit=8`;
        }
        if (!url) return;
        const res = await fetch(url);
        const data = await res.json();
        if (formType === "order" || formType === "shipping") {
          setEntitySearchResults(data.orders || []);
        } else if (formType === "product") {
          setEntitySearchResults(data.products || []);
        } else if (formType === "category") {
          setEntitySearchResults(data.categories || []);
        }
      } catch { /* ignore */ } finally {
        setEntitySearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [entitySearchInput, formType]);

  /* ─── Image select handler (preview only, no upload yet) ─── */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke previous preview URL
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFormImageUrl(""); // clear any previously-uploaded URL
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  /* ─── Upload image to server (called at send time) ─── */
  const uploadImage = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "nots");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.success && data.remote_url) return data.remote_url;
    if (data.success && data.file_path) return data.file_path;
    return null;
  };

  /* ─── Reset form ─── */
  const resetForm = () => {
    setFormTarget("all"); setFormSubject(""); setFormBody(""); setFormType("general");
    setFormRowId(""); setFormActionUrl(""); setFormImageUrl(""); setFormUserId(null);
    setSelectedUser(null); setUserSearchInput(""); setUserSearchResults([]); setFormSendPush(true);
    setEntitySearchInput(""); setEntitySearchResults([]); setSelectedEntity(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null); setImagePreview(null);
  };

  /* ─── Send notification ─── */
  const handleSend = async () => {
    if (!formSubject.trim() || !formBody.trim()) return;
    if (formTarget === "user" && !formUserId) return;
    setSending(true);
    try {
      /* Step 1: upload image if user selected one */
      let finalImageUrl = formImageUrl;
      if (imageFile) {
        setImageUploading(true);
        const uploaded = await uploadImage(imageFile);
        setImageUploading(false);
        if (!uploaded) {
          setSending(false);
          return; // upload failed — don't send notification
        }
        finalImageUrl = uploaded;
      }

      /* Step 2: build payload & send */
      const payload: Record<string, unknown> = {
        subject: formSubject.trim(),
        body: formBody.trim(),
        notification_type: formType,
        send_push: formSendPush,
      };
      if (formTarget === "user" && formUserId) payload.r_user_id = formUserId;
      if (formRowId) payload.row_id = Number(formRowId);
      if (formActionUrl.trim()) payload.action_url = formActionUrl.trim();
      if (finalImageUrl.trim()) payload.image_url = finalImageUrl.trim();

      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) { setCreateOpen(false); resetForm(); fetchNotifications(1); }
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  /* ─── Fetch detail ─── */
  const openDetail = useCallback(async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailTab("info");
    try {
      const res = await fetch(`/api/notifications/${id}`);
      const data = await res.json();
      setDetail(data);
    } catch { /* ignore */ } finally {
      setDetailLoading(false);
    }
  }, []);

  /* ─── Delete ─── */
  const handleDelete = useCallback(async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      fetchNotifications(pagination.page);
    } catch { /* ignore */ }
  }, [fetchNotifications, pagination.page]);

  /* ─── Toggle sort ─── */
  const toggleSort = (col: string) => {
    if (sort === col) setOrder((o) => (o === "desc" ? "asc" : "desc"));
    else { setSort(col); setOrder("desc"); }
  };

  /* ─── Navigate to customer ─── */
  const goToCustomer = (userId: number) => {
    window.open(`/dashboard/customers?viewUser=${userId}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Notifications</h1>
          <p className="mt-1 text-muted-foreground">
            View, manage &amp; send in-app and push notifications
          </p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Notification
        </Button>
      </div>

      {/* ═══ Stats ═══ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total.toLocaleString()} icon={Bell} color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" />
        <StatCard label="Broadcast" value={stats.broadcast.toLocaleString()} icon={Users} color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300" />
        <StatCard label="Order" value={stats.order.toLocaleString()} icon={ShoppingCart} color="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300" />
        <StatCard label="Promo" value={stats.promo.toLocaleString()} icon={Megaphone} color="bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300" />
      </div>

      {/* ═══ Filters ═══ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subject, body, ID ..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
          {searchInput && (
            <button onClick={() => setSearchInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {mounted && (
          <>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(NOTIFICATION_TYPES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Target" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Targets</SelectItem>
                <SelectItem value="all_broadcast">Broadcast</SelectItem>
                <SelectItem value="single">Single User</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* ═══ Table ═══ */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">
                  <button onClick={() => toggleSort("id")} className="inline-flex items-center gap-1 hover:text-foreground">
                    ID <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">
                  <button onClick={() => toggleSort("subject")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Subject <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">Target</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">Reach / Seen</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">
                  <button onClick={() => toggleSort("created_at")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Date <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></td></tr>
              ) : notifications.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center">
                  <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">No notifications found</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">Try adjusting your filters or send a new notification</p>
                </td></tr>
              ) : (
                notifications.map((n) => {
                  const ti = getTypeInfo(n.notification_type);
                  const TypeIcon = ti.icon;
                  return (
                    <tr
                      key={n.id}
                      className="border-b cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => openDetail(n.id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{n.id}</td>
                      <td className="max-w-[300px] px-4 py-3">
                        <p className="truncate font-medium">{n.subject}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.body}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ti.color}`}>
                          <TypeIcon className="h-3 w-3" />
                          {ti.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {n.r_user_id ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">
                              {n.target_user?.main_image ? (
                                <img src={resolveImageUrl(n.target_user.main_image)} alt="" className="h-7 w-7 rounded-full object-cover" />
                              ) : (n.target_user?.first_name?.[0] || "?")}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">{userName(n.target_user)}</p>
                              <p className="text-[10px] text-muted-foreground">ID: {n.r_user_id}</p>
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Users className="h-3 w-3" /> Broadcast
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Send className="h-3 w-3" /> {n.reach_count}
                          </span>
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> {n.seen_count}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="text-xs">{timeAgo(n.created_at)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(n.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(n.id); }}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            {n.r_user_id && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); goToCustomer(n.r_user_id!); }}>
                                <User className="mr-2 h-4 w-4" /> View User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteConfirm(n.id); }} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination ─── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total.toLocaleString()} total
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page <= 1} onClick={() => fetchNotifications(1)}><ChevronsLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page <= 1} onClick={() => fetchNotifications(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchNotifications(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchNotifications(pagination.totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Delete Confirm Dialog ═══ */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Notification</DialogTitle>
            <DialogDescription>
              This will permanently delete this notification and all associated user delivery records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Detail Dialog ═══ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          {detailLoading || !detail ? (
            <div className="flex h-[400px] items-center justify-center">
              <DialogTitle className="sr-only">Notification Details</DialogTitle>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {(() => { const ti = getTypeInfo(detail.notification.notification_type); const TypeIcon = ti.icon; return (
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${ti.color}`}><TypeIcon className="h-5 w-5" /></div>
                  ); })()}
                  <div className="min-w-0">
                    <span className="block truncate">{detail.notification.subject}</span>
                    <p className="text-xs font-normal text-muted-foreground">
                      ID: #{detail.notification.id} · {formatDate(detail.notification.created_at)} · {getTypeInfo(detail.notification.notification_type).label}
                    </p>
                  </div>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Notification details and recipient information
                </DialogDescription>
              </DialogHeader>

              {/* Body */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{detail.notification.body}</p>
              </div>

              {/* Meta Row */}
              <div className="flex flex-wrap gap-2">
                {detail.notification.r_user_id ? (
                  <Badge variant="outline" className="gap-1"><User className="h-3 w-3" /> Single User (ID: {detail.notification.r_user_id})</Badge>
                ) : (
                  <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" /> Broadcast</Badge>
                )}
                {detail.notification.row_id && (
                  <Badge variant="outline" className="gap-1"><Info className="h-3 w-3" /> {getTypeInfo(detail.notification.notification_type).label} #{detail.notification.row_id}</Badge>
                )}
                {detail.notification.action_url && (
                  <Badge variant="outline" className="gap-1"><ExternalLink className="h-3 w-3" /> Has URL</Badge>
                )}
                {detail.notification.image_url && (
                  <Badge variant="outline" className="gap-1"><ImageIcon className="h-3 w-3" /> Has Image</Badge>
                )}
              </div>

              {/* Image preview */}
              {detail.notification.image_url && (
                <div className="rounded-lg border p-2">
                  <img src={resolveImageUrl(detail.notification.image_url)} alt="" className="h-24 w-auto rounded-md object-contain" />
                </div>
              )}

              {/* Action URL */}
              {detail.notification.action_url && (
                <div className="rounded-lg border p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Action URL</p>
                  <a href={detail.notification.action_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline break-all hover:text-blue-800 dark:text-blue-400">
                    {detail.notification.action_url}
                  </a>
                </div>
              )}

              {/* Target User Card */}
              {detail.target_user && (
                <div className="rounded-lg border p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target User</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-sm font-bold uppercase text-blue-700 dark:text-blue-300">
                        {detail.target_user.main_image ? (
                          <img src={resolveImageUrl(detail.target_user.main_image)} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (detail.target_user.first_name?.[0] || "?")}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{userName(detail.target_user)}</p>
                        <p className="text-xs text-muted-foreground">{detail.target_user.email || `ID: ${detail.target_user.id}`}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => goToCustomer(detail.target_user!.id)}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View User
                    </Button>
                  </div>
                </div>
              )}

              {/* Related Entity */}
              {detail.related_entity && (
                <div className="rounded-lg border p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Related {detail.related_entity.type}
                  </p>
                  {detail.related_entity.type === "order" && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-xs text-muted-foreground">Order ID</span><p className="font-medium">#{detail.related_entity.data.id}</p></div>
                      <div><span className="text-xs text-muted-foreground">Status</span>
                        <Badge className={`mt-0.5 ${ORDER_STATUS_COLORS[detail.related_entity.data.status_label] || ""}`}>
                          {detail.related_entity.data.status_label}
                        </Badge>
                      </div>
                      <div><span className="text-xs text-muted-foreground">Total</span><p className="font-medium">${Number(detail.related_entity.data.total).toFixed(2)}</p></div>
                      <div><span className="text-xs text-muted-foreground">Placed</span><p className="font-medium">{formatDate(detail.related_entity.data.created_at)}</p></div>
                      <div><span className="text-xs text-muted-foreground">Shipping To</span><p className="font-medium">{detail.related_entity.data.address_first_name} {detail.related_entity.data.address_last_name}</p></div>
                      <div><span className="text-xs text-muted-foreground">Location</span><p className="font-medium">{detail.related_entity.data.city}, {detail.related_entity.data.country}</p></div>
                    </div>
                  )}
                  {detail.related_entity.type === "product" && (
                    <div className="flex items-center gap-3">
                      {detail.related_entity.data.main_image && (
                        <img src={resolveImageUrl(detail.related_entity.data.main_image)} alt="" className="h-14 w-14 rounded-md border object-cover" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{detail.related_entity.data.product_name}</p>
                        <p className="text-xs text-muted-foreground">Code: {detail.related_entity.data.product_code} · ${Number(detail.related_entity.data.product_price).toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                  {detail.related_entity.type === "category" && (
                    <div className="flex items-center gap-3">
                      {detail.related_entity.data.main_image && (
                        <img src={resolveImageUrl(detail.related_entity.data.main_image)} alt="" className="h-14 w-14 rounded-md border object-cover" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{detail.related_entity.data.category_name}</p>
                        <p className="text-xs text-muted-foreground">{detail.related_entity.data.product_count} products · Level {detail.related_entity.data.level}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tabs for broadcast stats + recipients */}
              {!detail.notification.r_user_id && (
                <>
                  <div className="flex gap-1 rounded-lg border p-1">
                    {(["info", "recipients"] as const).map((tab) => (
                      <button key={tab} onClick={() => setDetailTab(tab)}
                        className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${detailTab === tab ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        {tab === "info" ? "Delivery Stats" : `Recipients (${detail.recipient_stats?.total || 0})`}
                      </button>
                    ))}
                  </div>

                  {detailTab === "info" && detail.recipient_stats && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border p-3 text-center">
                        <Send className="mx-auto mb-1 h-4 w-4 text-blue-500" />
                        <p className="text-lg font-bold">{detail.recipient_stats.total}</p>
                        <p className="text-[10px] text-muted-foreground">Delivered</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-green-500" />
                        <p className="text-lg font-bold">{detail.recipient_stats.seen}</p>
                        <p className="text-[10px] text-muted-foreground">Seen</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <Clock className="mx-auto mb-1 h-4 w-4 text-amber-500" />
                        <p className="text-lg font-bold">{detail.recipient_stats.unseen}</p>
                        <p className="text-[10px] text-muted-foreground">Unseen</p>
                      </div>
                    </div>
                  )}

                  {detailTab === "recipients" && (
                    <div className="max-h-[250px] overflow-y-auto rounded-lg border">
                      {detail.recipients.length === 0 ? (
                        <div className="flex h-[120px] items-center justify-center">
                          <p className="text-xs text-muted-foreground">No recipients found</p>
                        </div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead><tr className="border-b bg-muted/40">
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">User</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Seen</th>
                            <th className="px-3 py-2 text-right font-medium text-muted-foreground"></th>
                          </tr></thead>
                          <tbody>
                            {detail.recipients.map((r) => (
                              <tr key={r.id} className="border-b hover:bg-muted/30">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase">
                                      {r.main_image ? (
                                        <img src={resolveImageUrl(r.main_image)} alt="" className="h-6 w-6 rounded-full object-cover" />
                                      ) : (r.first_name?.[0] || "?")}
                                    </div>
                                    <span className="font-medium">{userName(r)}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{r.email || "—"}</td>
                                <td className="px-3 py-2">
                                  {r.is_seen ? (
                                    <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> Yes</Badge>
                                  ) : (
                                    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"><Clock className="h-3 w-3" /> No</Badge>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => goToCustomer(r.id)}>
                                    <Eye className="mr-1 h-3 w-3" /> View
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Create / Send Notification Dialog ═══ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Notification
            </DialogTitle>
            <DialogDescription>
              Create an in-app notification and optionally send a push notification via FCM.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Target */}
            <div className="grid gap-2">
              <Label>Target Audience</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setFormTarget("all"); setFormUserId(null); setSelectedUser(null); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${formTarget === "all"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "hover:bg-muted"}`}
                >
                  <Users className="h-4 w-4" /> All Users
                </button>
                <button
                  onClick={() => setFormTarget("user")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${formTarget === "user"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "hover:bg-muted"}`}
                >
                  <User className="h-4 w-4" /> Specific User
                </button>
              </div>
            </div>

            {/* User search (when targeting specific user) */}
            {formTarget === "user" && (
              <div className="grid gap-2">
                <Label>Search User</Label>
                {selectedUser ? (
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-xs font-bold uppercase text-blue-700 dark:text-blue-300">
                        {selectedUser.main_image ? (
                          <img src={resolveImageUrl(selectedUser.main_image)} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (selectedUser.first_name?.[0] || "?")}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{userName(selectedUser)}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {selectedUser.id}
                          {selectedUser.email && ` · ${selectedUser.email}`}
                          {selectedUser.device_type && (
                            <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">{selectedUser.device_type}</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(null); setFormUserId(null); setUserSearchInput(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, phone, or ID..."
                      value={userSearchInput}
                      onChange={(e) => setUserSearchInput(e.target.value)}
                      className="pl-10"
                    />
                    {userSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                    {userSearchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-[200px] w-full overflow-y-auto rounded-lg border bg-card shadow-lg">
                        {userSearchResults.map((u) => (
                          <button
                            key={u.id}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                            onClick={() => {
                              setSelectedUser(u);
                              setFormUserId(u.id);
                              setUserSearchInput("");
                              setUserSearchResults([]);
                            }}
                          >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase">
                              {u.main_image ? (
                                <img src={resolveImageUrl(u.main_image)} alt="" className="h-7 w-7 rounded-full object-cover" />
                              ) : (u.first_name?.[0] || "?")}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium">{userName(u)}</p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                ID: {u.id}{u.email && ` · ${u.email}`}
                              </p>
                            </div>
                            {u.device_type && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{u.device_type}</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Subject */}
            <div className="grid gap-2">
              <Label htmlFor="pn-subject">Title / Subject *</Label>
              <Input
                id="pn-subject"
                placeholder="e.g. Flash Sale - 50% Off!"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                maxLength={200}
              />
            </div>

            {/* Body */}
            <div className="grid gap-2">
              <Label htmlFor="pn-body">Message Body *</Label>
              <Textarea
                id="pn-body"
                placeholder="Write the notification message..."
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label>Notification Type</Label>
              <Select value={formType} onValueChange={(v) => { setFormType(v); setSelectedEntity(null); setFormRowId(""); setEntitySearchInput(""); setEntitySearchResults([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTIFICATION_TYPES).map(([key, val]) => {
                    const Icon = val.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="inline-flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" /> {val.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Determines where the user navigates when tapping the notification
              </p>
            </div>

            {/* Linked Entity picker (searchable) */}
            {["order", "shipping", "product", "category"].includes(formType) && (
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  {formType === "order" || formType === "shipping" ? (
                    <><ShoppingCart className="h-3.5 w-3.5" /> Search Order</>
                  ) : formType === "product" ? (
                    <><Tag className="h-3.5 w-3.5" /> Search Product</>
                  ) : (
                    <><Tag className="h-3.5 w-3.5" /> Search Category</>
                  )}
                </Label>
                {selectedEntity ? (
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                      {selectedEntity.image && (
                        <img src={resolveImageUrl(selectedEntity.image)} alt="" className="h-9 w-9 rounded-md border object-cover" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{selectedEntity.label}</p>
                        <p className="text-xs text-muted-foreground">ID: {selectedEntity.id}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedEntity(null); setFormRowId(""); setEntitySearchInput(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={
                        formType === "order" || formType === "shipping"
                          ? "Search by order ID or customer name..."
                          : formType === "product"
                          ? "Search by product name or code..."
                          : "Search by category name..."
                      }
                      value={entitySearchInput}
                      onChange={(e) => setEntitySearchInput(e.target.value)}
                      className="pl-10"
                    />
                    {entitySearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                    {entitySearchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-[200px] w-full overflow-y-auto rounded-lg border bg-card shadow-lg">
                        {entitySearchResults.map((item) => {
                          if (formType === "order" || formType === "shipping") {
                            const o = item as SearchOrder;
                            return (
                              <button
                                key={o.id}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                                onClick={() => {
                                  setSelectedEntity({ type: "order", id: o.id, label: `Order #${o.id} — ${o.address_first_name} ${o.address_last_name} ($${Number(o.total).toFixed(2)})` });
                                  setFormRowId(String(o.id));
                                  setEntitySearchInput("");
                                  setEntitySearchResults([]);
                                }}
                              >
                                <ShoppingCart className="h-5 w-5 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">Order #{o.id} — {o.address_first_name} {o.address_last_name}</p>
                                  <p className="truncate text-[10px] text-muted-foreground">${Number(o.total).toFixed(2)} · {o.status_label} · {new Date(o.created_at).toLocaleDateString()}</p>
                                </div>
                              </button>
                            );
                          }
                          if (formType === "product") {
                            const p = item as SearchProduct;
                            return (
                              <button
                                key={p.id}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                                onClick={() => {
                                  setSelectedEntity({ type: "product", id: p.id, label: p.product_name, image: p.main_image });
                                  setFormRowId(String(p.id));
                                  setEntitySearchInput("");
                                  setEntitySearchResults([]);
                                }}
                              >
                                {p.main_image ? (
                                  <img src={resolveImageUrl(p.main_image)} alt="" className="h-8 w-8 rounded-md border object-cover" />
                                ) : <Tag className="h-5 w-5 shrink-0 text-muted-foreground" />}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">{p.product_name}</p>
                                  <p className="truncate text-[10px] text-muted-foreground">Code: {p.product_code || "—"} · ${Number(p.product_price).toFixed(2)}</p>
                                </div>
                              </button>
                            );
                          }
                          /* category */
                          const c = item as SearchCategory;
                          return (
                            <button
                              key={c.id}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                              onClick={() => {
                                setSelectedEntity({ type: "category", id: c.id, label: c.category_name, image: c.main_image });
                                setFormRowId(String(c.id));
                                setEntitySearchInput("");
                                setEntitySearchResults([]);
                              }}
                            >
                              {c.main_image ? (
                                <img src={resolveImageUrl(c.main_image)} alt="" className="h-8 w-8 rounded-md border object-cover" />
                              ) : <Tag className="h-5 w-5 shrink-0 text-muted-foreground" />}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">{c.category_name}</p>
                                <p className="truncate text-[10px] text-muted-foreground">Level {c.level} · {c.product_count} products</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action URL (for web/promo types) */}
            {["web", "promo"].includes(formType) && (
              <div className="grid gap-2">
                <Label htmlFor="pn-url" className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> Action URL
                </Label>
                <Input
                  id="pn-url"
                  type="url"
                  placeholder="https://example.com/promo"
                  value={formActionUrl}
                  onChange={(e) => setFormActionUrl(e.target.value)}
                />
              </div>
            )}

            {/* Image (instant preview, upload on send) */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Notification Image <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              {(imagePreview || formImageUrl) ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                  <img
                    src={imagePreview || resolveImageUrl(formImageUrl) || undefined}
                    alt=""
                    className="h-16 w-16 rounded-md border object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{imageFile?.name || formImageUrl.split("/").pop()}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {imageFile
                        ? `${(imageFile.size / 1024).toFixed(0)} KB · will be compressed & uploaded on send`
                        : "Uploaded"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (imagePreview) URL.revokeObjectURL(imagePreview);
                    setImageFile(null); setImagePreview(null); setFormImageUrl("");
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-muted-foreground/40"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Upload className="h-6 w-6" />
                    <span className="text-xs font-medium">Click to select image</span>
                    <span className="text-[10px]">JPG, PNG, WebP — compressed on send</span>
                  </div>
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            {/* Send Push toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Send Push Notification</p>
                <p className="text-xs text-muted-foreground">Also deliver via FCM push to devices</p>
              </div>
              <button
                onClick={() => setFormSendPush(!formSendPush)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formSendPush ? "bg-primary" : "bg-muted-foreground/30"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formSendPush ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          {/* Preview */}
          {formSubject && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
              <div className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getTypeInfo(formType).color}`}>
                  {(() => { const Icon = getTypeInfo(formType).icon; return <Icon className="h-4 w-4" />; })()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{formSubject}</p>
                  {formBody && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{formBody}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formTarget === "all" ? "To: All Users" : selectedUser ? `To: ${userName(selectedUser)}` : "To: Select a user"}
                    {formSendPush && " · Push enabled"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={handleSend}
              disabled={sending || !formSubject.trim() || !formBody.trim() || (formTarget === "user" && !formUserId)}
              className="gap-2"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending && imageUploading ? "Uploading image..." : sending ? "Sending..." : formTarget === "all" ? "Broadcast to All" : "Send to User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
