"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  MoreHorizontal,
  Ticket,
  Copy,
  Users,
  Eye,
  EyeOff,
  Info,
  Percent,
  DollarSign,
  Calendar,
  Infinity,
  Globe,
  Lock,
  RefreshCw,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

/* ─── Types ─── */

interface Coupon {
  id: number;
  code: string;
  discount: number;
  percentage: number;
  type: "Web" | "Mobile" | "Both";
  start_date: string | null;
  end_date: string | null;
  is_forever: boolean;
  is_active: boolean;
  is_public: boolean;
  can_take_again: boolean;
  r_user_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  total_usage: number;
  claimed_count: number;
  locked_count: number;
  redeemed_count: number;
}

interface CouponFormData {
  code: string;
  discount_type: "percentage" | "fixed";
  discount: number;
  percentage: number;
  type: "Web" | "Mobile" | "Both";
  start_date: string;
  end_date: string;
  is_forever: boolean;
  is_active: boolean;
  is_public: boolean;
  can_take_again: boolean;
}

interface UsageRecord {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string | null;
  user_phone: string | null;
  order_id: number | null;
  order_total: number | null;
  order_discount: number | null;
  order_status: string | null;
  status: string;
  claimed_at: string | null;
  used_at: string | null;
}

const EMPTY_FORM: CouponFormData = {
  code: "",
  discount_type: "percentage",
  discount: 0,
  percentage: 0,
  type: "Both",
  start_date: "",
  end_date: "",
  is_forever: false,
  is_active: true,
  is_public: false,
  can_take_again: false,
};

/* ─── Helpers ─── */

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCouponStatus(c: Coupon): "active" | "scheduled" | "expired" | "inactive" {
  if (!c.is_active) return "inactive";
  if (c.is_forever) return "active";
  const now = new Date();
  if (c.start_date && new Date(c.start_date) > now) return "scheduled";
  if (c.end_date && new Date(c.end_date) < now) return "expired";
  return "active";
}

function getDiscountLabel(c: Coupon): string {
  if (c.percentage > 0) return `${c.percentage}%`;
  return `$${c.discount.toFixed(2)}`;
}

const statusBadgeMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  active: "success",
  scheduled: "warning",
  expired: "destructive",
  inactive: "outline",
};

const usageStatusColors: Record<string, string> = {
  claimed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  locked: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  redeemed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

/* ════════════════════════════════════════════════════════════ */

export default function CouponsPage() {
  /* ─── State ─── */
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  // Usage dialog
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [usageCoupon, setUsageCoupon] = useState<Coupon | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  // Copied feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);

  /* ─── Fetch ─── */
  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/coupons");
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  /* ─── Filtered coupons ─── */
  const filtered = searchQuery
    ? coupons.filter(
        (c) =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(c.id) === searchQuery
      )
    : coupons;

  /* ─── Handlers ─── */

  const openCreate = () => {
    setEditingCoupon(null);
    setFormData({ ...EMPTY_FORM, code: generateCode() });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditingCoupon(c);
    setFormData({
      code: c.code,
      discount_type: c.percentage > 0 ? "percentage" : "fixed",
      discount: c.discount,
      percentage: c.percentage,
      type: c.type,
      start_date: c.start_date
        ? new Date(c.start_date).toISOString().slice(0, 16)
        : "",
      end_date: c.end_date
        ? new Date(c.end_date).toISOString().slice(0, 16)
        : "",
      is_forever: c.is_forever,
      is_active: c.is_active,
      is_public: c.is_public,
      can_take_again: c.can_take_again,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      setFormError("Coupon code is required");
      return;
    }

    const discountVal =
      formData.discount_type === "percentage" ? 0 : formData.discount;
    const percentageVal =
      formData.discount_type === "percentage" ? formData.percentage : 0;

    if (discountVal === 0 && percentageVal === 0) {
      setFormError("Set a discount value");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        discount: discountVal,
        percentage: percentageVal,
        type: formData.type,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_forever: formData.is_forever,
        is_active: formData.is_active,
        is_public: formData.is_public,
        can_take_again: formData.can_take_again,
      };

      const url = editingCoupon
        ? `/api/coupons/${editingCoupon.id}`
        : "/api/coupons";
      const method = editingCoupon ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to save");
        return;
      }

      setDialogOpen(false);
      fetchCoupons();
    } catch (err) {
      console.error("Failed to save coupon:", err);
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/coupons/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      fetchCoupons();
    } catch (err) {
      console.error("Failed to delete coupon:", err);
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await fetch(`/api/coupons/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      fetchCoupons();
    } catch (err) {
      console.error("Failed to toggle coupon:", err);
    }
  };

  const copyCode = (c: Coupon) => {
    navigator.clipboard.writeText(c.code);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openUsageDialog = async (c: Coupon) => {
    setUsageCoupon(c);
    setUsageDialogOpen(true);
    setUsageLoading(true);
    try {
      const res = await fetch(`/api/coupons/${c.id}/usage`);
      const data = await res.json();
      setUsageRecords(data.usages || []);
    } catch (err) {
      console.error("Failed to fetch usage:", err);
      setUsageRecords([]);
    } finally {
      setUsageLoading(false);
    }
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ─── Stats ─── */
  const totalActive = coupons.filter((c) => c.is_active).length;
  const totalRedeemed = coupons.reduce((s, c) => s + c.redeemed_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Coupons
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage discount coupons &amp; promo codes
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ticket className="h-4 w-4" />
            Total
          </div>
          <p className="mt-1 text-2xl font-bold">{coupons.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Active
          </div>
          <p className="mt-1 text-2xl font-bold">{totalActive}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShoppingCart className="h-4 w-4" />
            Redeemed
          </div>
          <p className="mt-1 text-2xl font-bold">{totalRedeemed}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            Public
          </div>
          <p className="mt-1 text-2xl font-bold">
            {coupons.filter((c) => c.is_public).length}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="text-sm">
          <p className="font-medium text-emerald-900 dark:text-emerald-300">
            Coupon System
          </p>
          <p className="mt-1 text-emerald-700 dark:text-emerald-400/80">
            <strong>Public</strong> coupons appear in the app&apos;s Deals
            screen. <strong>Private</strong> coupons must be entered manually.{" "}
            <strong>Forever</strong> coupons never expire.{" "}
            <strong>Can Take Again</strong> lets users reuse after redemption.
          </p>
        </div>
      </div>

      {/* Search */}
      {coupons.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      )}

      {/* Coupon List */}
      {filtered.length === 0 && !searchQuery ? (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex h-[400px] flex-col items-center justify-center gap-4 p-8">
            <div className="rounded-full bg-muted p-4">
              <Ticket className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">No coupons yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create coupons to offer discounts and promotions to your
                customers.
              </p>
            </div>
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Coupon
            </Button>
          </div>
        </div>
      ) : filtered.length === 0 && searchQuery ? (
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="text-muted-foreground">
            No coupons matching &quot;{searchQuery}&quot;
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => {
            const status = getCouponStatus(c);
            return (
              <div
                key={c.id}
                className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-stretch">
                  {/* Left strip — discount badge */}
                  <div
                    className={`flex w-[100px] shrink-0 flex-col items-center justify-center gap-1 p-4 ${
                      c.percentage > 0
                        ? "bg-gradient-to-b from-purple-500/10 to-purple-600/10 dark:from-purple-400/10 dark:to-purple-500/10"
                        : "bg-gradient-to-b from-emerald-500/10 to-emerald-600/10 dark:from-emerald-400/10 dark:to-emerald-500/10"
                    }`}
                  >
                    {c.percentage > 0 ? (
                      <Percent className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span
                      className={`text-xl font-bold ${
                        c.percentage > 0
                          ? "text-purple-700 dark:text-purple-300"
                          : "text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {getDiscountLabel(c)}
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      off
                    </span>
                  </div>

                  {/* Main content */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div className="space-y-2">
                      {/* Code + status row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => copyCode(c)}
                          className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1 font-mono text-sm font-bold tracking-wider transition-colors hover:bg-muted/80"
                          title="Click to copy"
                        >
                          {c.code}
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </button>
                        {copiedId === c.id && (
                          <span className="text-xs text-emerald-600">
                            Copied!
                          </span>
                        )}
                        <Badge
                          variant={statusBadgeMap[status]}
                          className="text-[10px]"
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                        {c.is_public && (
                          <Badge
                            variant="secondary"
                            className="gap-1 text-[10px]"
                          >
                            <Globe className="h-2.5 w-2.5" />
                            Public
                          </Badge>
                        )}
                        {c.is_forever && (
                          <Badge
                            variant="secondary"
                            className="gap-1 text-[10px]"
                          >
                            <Infinity className="h-2.5 w-2.5" />
                            Forever
                          </Badge>
                        )}
                        {c.can_take_again && (
                          <Badge
                            variant="secondary"
                            className="gap-1 text-[10px]"
                          >
                            <RefreshCw className="h-2.5 w-2.5" />
                            Reusable
                          </Badge>
                        )}
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {c.is_forever
                            ? "No expiry"
                            : `${formatDate(c.start_date)} → ${formatDate(c.end_date)}`}
                        </span>
                        <span className="flex items-center gap-1 capitalize">
                          <Lock className="h-3 w-3" />
                          {c.type}
                        </span>
                      </div>
                    </div>

                    {/* Usage stats */}
                    <div className="mt-3 flex items-center gap-4 border-t pt-3">
                      <button
                        onClick={() => openUsageDialog(c)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>
                          <strong className="text-foreground">
                            {c.total_usage}
                          </strong>{" "}
                          total
                        </span>
                      </button>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          <strong className="text-foreground">
                            {c.claimed_count}
                          </strong>{" "}
                          claimed
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        <span>
                          <strong className="text-foreground">
                            {c.locked_count}
                          </strong>{" "}
                          locked
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          <strong className="text-foreground">
                            {c.redeemed_count}
                          </strong>{" "}
                          redeemed
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-center justify-between p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openUsageDialog(c)}>
                          <Users className="mr-2 h-4 w-4" />
                          View Redemptions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyCode(c)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Code
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleActive(c)}>
                          {c.is_active ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(c)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Create / Edit Dialog ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? "Edit Coupon" : "Create Coupon"}
            </DialogTitle>
            <DialogDescription>
              {editingCoupon
                ? "Update coupon settings."
                : "Create a new discount coupon or promo code."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Code */}
            <div className="grid gap-2">
              <Label htmlFor="c-code">Coupon Code</Label>
              <div className="flex gap-2">
                <Input
                  id="c-code"
                  placeholder="WELCOME20"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="flex-1 font-mono tracking-wider"
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    setFormData({ ...formData, code: generateCode() })
                  }
                  className="shrink-0"
                  title="Generate random code"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Discount type + value */}
            <div className="grid grid-cols-[160px_1fr] gap-4">
              <div className="grid gap-2">
                <Label>Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(v: "percentage" | "fixed") =>
                    setFormData({ ...formData, discount_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-value">
                  {formData.discount_type === "percentage"
                    ? "Percentage"
                    : "Amount ($)"}
                </Label>
                <Input
                  id="c-value"
                  type="number"
                  min={0}
                  max={formData.discount_type === "percentage" ? 100 : undefined}
                  step={formData.discount_type === "percentage" ? 1 : 0.01}
                  value={
                    formData.discount_type === "percentage"
                      ? formData.percentage
                      : formData.discount
                  }
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (formData.discount_type === "percentage") {
                      setFormData({ ...formData, percentage: val, discount: 0 });
                    } else {
                      setFormData({ ...formData, discount: val, percentage: 0 });
                    }
                  }}
                />
              </div>
            </div>

            {/* Platform */}
            <div className="grid gap-2">
              <Label>Platform</Label>
              <Select
                value={formData.type}
                onValueChange={(v: "Web" | "Mobile" | "Both") =>
                  setFormData({ ...formData, type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Both">Both (Web + Mobile)</SelectItem>
                  <SelectItem value="Mobile">Mobile Only</SelectItem>
                  <SelectItem value="Web">Web Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Forever toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Never Expires</p>
                <p className="text-xs text-muted-foreground">
                  Coupon remains valid indefinitely
                </p>
              </div>
              <Switch
                checked={formData.is_forever}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_forever: checked })
                }
              />
            </div>

            {/* Dates — only if not forever */}
            {!formData.is_forever && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="c-start">Start Date</Label>
                  <Input
                    id="c-start"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-end">End Date</Label>
                  <Input
                    id="c-end"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Users can claim and use this coupon
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Public</p>
                  <p className="text-xs text-muted-foreground">
                    Visible in the app&apos;s Deals screen for all users
                  </p>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_public: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Can Take Again</p>
                  <p className="text-xs text-muted-foreground">
                    Users can re-claim after using the coupon
                  </p>
                </div>
                <Switch
                  checked={formData.can_take_again}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, can_take_again: checked })
                  }
                />
              </div>
            </div>

            {/* Error */}
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingCoupon ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Usage / Redemptions Dialog ═══ */}
      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Redemptions for{" "}
              <span className="font-mono">{usageCoupon?.code}</span>
            </DialogTitle>
            <DialogDescription>
              {usageCoupon &&
                `${getDiscountLabel(usageCoupon)} off — ${usageCoupon.total_usage} total claims`}
            </DialogDescription>
          </DialogHeader>

          {usageLoading ? (
            <div className="flex h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : usageRecords.length === 0 ? (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <Users className="h-8 w-8" />
              <p className="text-sm">No one has claimed this coupon yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr_90px_90px_100px] gap-2 border-b px-3 pb-2 text-xs font-medium text-muted-foreground">
                <span>User</span>
                <span>Status</span>
                <span>Order</span>
                <span>Date</span>
              </div>

              {/* Rows */}
              <div className="max-h-[400px] space-y-1 overflow-y-auto">
                {usageRecords.map((u) => (
                  <div
                    key={u.id}
                    className="grid grid-cols-[1fr_90px_90px_100px] items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    {/* User */}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.user_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.user_email || u.user_phone || `ID: ${u.user_id}`}
                      </p>
                    </div>

                    {/* Status */}
                    <div>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                          usageStatusColors[u.status] ||
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {u.status}
                      </span>
                    </div>

                    {/* Order */}
                    <div className="text-xs text-muted-foreground">
                      {u.order_id ? (
                        <span>
                          #{u.order_id}
                          {u.order_discount != null && (
                            <span className="block text-emerald-600 dark:text-emerald-400">
                              -${Number(u.order_discount).toFixed(2)}
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </div>

                    {/* Date */}
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(u.claimed_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUsageDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Coupon"
        description={`Are you sure you want to delete coupon "${deleteTarget?.code}"? All usage records will be permanently lost.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
