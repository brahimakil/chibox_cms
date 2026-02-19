"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Zap,
  Eye,
  EyeOff,
  Timer,
  Calendar,
  Info,
  Package,
  Search,
  X,
  ChevronDown,
  ChevronUp,
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { resolveImageUrl, thumbnailUrl } from "@/lib/image-url";
import { toast } from "sonner";

/* ─── Types ─── */

interface FlashSale {
  id: number;
  title: string;
  slug: string;
  color_1: string;
  color_2: string;
  color_3: string;
  slider_type: number;
  start_time: string | null;
  end_time: string | null;
  display: boolean;
  r_store_id: number;
  discount: number;
  order_number: number;
  product_count: number;
  created_at: string | null;
  updated_at: string | null;
}

interface FlashProduct {
  id: number;
  title: string;
  price: number;
  discount_price: number | null;
  main_image: string | null;
  quantity: number;
  status: number;
}

interface FlashSaleFormData {
  title: string;
  color_1: string;
  color_2: string;
  color_3: string;
  slider_type: number;
  start_time: string;
  end_time: string;
  display: boolean;
  discount: number;
}

const EMPTY_FORM: FlashSaleFormData = {
  title: "",
  color_1: "#e24040",
  color_2: "#3c5d9f",
  color_3: "#208d4f",
  slider_type: 1,
  start_time: "",
  end_time: "",
  display: true,
  discount: 0,
};

/* ─── Countdown Hook ─── */

function useCountdown(endTime: string | null) {
  const [remaining, setRemaining] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!endTime) {
      setRemaining("No deadline");
      return;
    }

    const update = () => {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setRemaining("Expired");
        setIsExpired(true);
        return;
      }

      setIsExpired(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (days > 0) {
        setRemaining(`${days}d ${hours}h ${minutes}m`);
      } else {
        setRemaining(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  return { remaining, isExpired };
}

/* ─── FlashSaleCard sub-component with its own countdown ─── */

function FlashSaleCard({
  sale,
  onEdit,
  onDelete,
  onToggle,
  onManageProducts,
}: {
  sale: FlashSale;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onManageProducts: () => void;
}) {
  const { remaining, isExpired } = useCountdown(sale.end_time);
  const isScheduled = sale.start_time && new Date(sale.start_time) > new Date();

  return (
    <div className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Color gradient bar */}
      <div
        className="h-2"
        style={{
          background: `linear-gradient(90deg, ${sale.color_1}, ${sale.color_2}, ${sale.color_3})`,
        }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            {/* Title + status */}
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="font-semibold">{sale.title || "(Untitled)"}</span>
              <Badge
                variant={
                  !sale.display
                    ? "outline"
                    : isScheduled
                    ? "secondary"
                    : isExpired
                    ? "destructive"
                    : "success"
                }
                className="text-[10px]"
              >
                {!sale.display
                  ? "Hidden"
                  : isScheduled
                  ? "Scheduled"
                  : isExpired
                  ? "Expired"
                  : "Active"}
              </Badge>
            </div>

            {/* Timer */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {sale.start_time && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Starts: {new Date(sale.start_time).toLocaleString()}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {remaining}
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {sale.product_count} products
              </span>
              <span>Discount: {sale.discount}%</span>
              <span>Type: {sale.slider_type === 1 ? "Standard" : "Swiper"}</span>
            </div>

            {/* Colors preview */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Colors:</span>
              {[sale.color_1, sale.color_2, sale.color_3].map((c, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div
                    className="h-4 w-4 rounded-full border"
                    style={{ backgroundColor: c }}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {c}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons – inline instead of dropdown */}
          <div className="flex flex-col gap-1.5">
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onEdit}>
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onManageProducts}>
              <Package className="h-3 w-3" />
              Products
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={onToggle}
            >
              {sale.display ? (
                <><EyeOff className="h-3 w-3" />Hide</>
              ) : (
                <><Eye className="h-3 w-3" />Show</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function FlashSalesPage() {
  /* ─── State ─── */
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<FlashSale | null>(null);
  const [formData, setFormData] = useState<FlashSaleFormData>(EMPTY_FORM);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<FlashSale | null>(null);

  // Products dialog
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  const [productsTarget, setProductsTarget] = useState<FlashSale | null>(null);
  const [saleProducts, setSaleProducts] = useState<FlashProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<FlashProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [expandedProducts, setExpandedProducts] = useState(false);

  /* ─── Fetch sales ─── */
  const fetchSales = useCallback(async () => {
    try {
      const res = await fetch("/api/flash-sales");
      const data = await res.json();
      setSales(data.sales || []);
    } catch (err) {
      console.error("Failed to fetch flash sales:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  /* ─── Handlers ─── */

  const openCreate = () => {
    setEditingSale(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (sale: FlashSale) => {
    setEditingSale(sale);
    setFormData({
      title: sale.title || "",
      color_1: sale.color_1 || "#e24040",
      color_2: sale.color_2 || "#3c5d9f",
      color_3: sale.color_3 || "#208d4f",
      slider_type: sale.slider_type || 1,
      start_time: sale.start_time
        ? new Date(sale.start_time).toISOString().slice(0, 16)
        : "",
      end_time: sale.end_time
        ? new Date(sale.end_time).toISOString().slice(0, 16)
        : "",
      display: sale.display,
      discount: sale.discount,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // If no end_time set, default to 1 year from now (required for mobile visibility)
      const defaultEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16);
      const payload = {
        ...formData,
        start_time: formData.start_time || null,
        end_time: formData.end_time || defaultEnd,
      };

      if (editingSale) {
        // Optimistic: update local state immediately
        setSales((prev) =>
          prev.map((s) => s.id === editingSale.id ? { ...s, ...payload, display: formData.display } : s)
        );
        const res = await fetch(`/api/flash-sales/${editingSale.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("Flash sale updated");
      } else {
        const res = await fetch("/api/flash-sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success("Flash sale created");
      }
      setDialogOpen(false);
      fetchSales();
    } catch (err) {
      toast.error("Failed to save flash sale");
      fetchSales(); // revert optimistic
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    // Optimistic: remove from UI immediately
    setSales((prev) => prev.filter((s) => s.id !== targetId));
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/flash-sales/${targetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Flash sale deleted");
    } catch (err) {
      toast.error("Failed to delete flash sale");
      fetchSales(); // revert
    }
  };

  const toggleDisplay = async (sale: FlashSale) => {
    // Optimistic: toggle in UI immediately
    setSales((prev) =>
      prev.map((s) => s.id === sale.id ? { ...s, display: !s.display } : s)
    );
    try {
      const res = await fetch(`/api/flash-sales/${sale.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display: !sale.display }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(sale.display ? "Flash sale hidden" : "Flash sale shown");
    } catch (err) {
      toast.error("Failed to toggle visibility");
      fetchSales(); // revert
    }
  };

  /* ─── Products management ─── */

  const openProducts = async (sale: FlashSale) => {
    setProductsTarget(sale);
    setProductsDialogOpen(true);
    setProductsLoading(true);
    setProductSearch("");
    setSearchResults([]);
    setExpandedProducts(false);
    try {
      const res = await fetch(`/api/flash-sales/${sale.id}/products`);
      const data = await res.json();
      setSaleProducts(data.products || []);
    } catch (err) {
      console.error("Failed to fetch flash sale products:", err);
    } finally {
      setProductsLoading(false);
    }
  };

  const searchProducts = (query: string) => {
    setProductSearch(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(query)}&pageSize=10`
        );
        const data = await res.json();
        // Pricing info for CNY→USD conversion
        const pricing = data.pricing as
          | { markupPercent: number; exchangeRate: number }
          | undefined;
        const rate = pricing ? Number(pricing.exchangeRate) : 0.14;
        const markup = pricing ? 1 + Number(pricing.markupPercent) / 100 : 1.15;
        // Filter out already-added products and map field names
        const existingIds = new Set(saleProducts.map((p) => p.id));
        setSearchResults(
          (data.products || [])
            .filter((p: Record<string, unknown>) => !existingIds.has(p.id as number))
            .map((p: Record<string, unknown>) => {
              const rawPrice =
                Number(p.product_price) || Number(p.origin_price) || 0;
              // Convert to USD (most products are CNY)
              const usdPrice =
                Math.round(rawPrice * rate * markup * 100) / 100;
              return {
                id: p.id as number,
                title: (p.display_name || p.product_name || `#${p.id}`) as string,
                price: usdPrice,
                discount_price: null,
                main_image: (p.main_image as string) || null,
                quantity: 0,
                status: p.product_status as number,
              };
            })
        );
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const addProduct = async (product: FlashProduct) => {
    if (!productsTarget) return;
    try {
      await fetch(`/api/flash-sales/${productsTarget.id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: [product.id] }),
      });
      setSaleProducts((prev) => [...prev, product]);
      setSearchResults((prev) => prev.filter((p) => p.id !== product.id));
      // Update the count in the sales list
      setSales((prev) =>
        prev.map((s) =>
          s.id === productsTarget.id
            ? { ...s, product_count: s.product_count + 1 }
            : s
        )
      );
    } catch (err) {
      console.error("Failed to add product:", err);
    }
  };

  const removeProduct = async (product: FlashProduct) => {
    if (!productsTarget) return;
    try {
      await fetch(`/api/flash-sales/${productsTarget.id}/products`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: [product.id] }),
      });
      setSaleProducts((prev) => prev.filter((p) => p.id !== product.id));
      setSales((prev) =>
        prev.map((s) =>
          s.id === productsTarget.id
            ? { ...s, product_count: Math.max(0, s.product_count - 1) }
            : s
        )
      );
    } catch (err) {
      console.error("Failed to remove product:", err);
    }
  };

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Flash Sales
          </h1>
          <p className="mt-1 text-muted-foreground">
            Time-limited deals with countdown timers
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Flash Sale
        </Button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-300">
            Flash Sale Display
          </p>
          <p className="mt-1 text-amber-700 dark:text-amber-400/80">
            Cards appear on the home screen at <strong>240×140px</strong> (standard) or{" "}
            <strong>280px height</strong> (swiper mode). The 3 gradient colors
            style the countdown boxes and background. Products in the sale show
            the flash discount badge.
          </p>
        </div>
      </div>

      {/* Sales list */}
      {sales.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex h-[400px] flex-col items-center justify-center gap-4 p-8">
            <div className="rounded-full bg-muted p-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">No flash sales yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create flash sales to drive urgency and boost sales with
                time-limited offers.
              </p>
            </div>
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Flash Sale
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {sales.map((sale) => (
            <FlashSaleCard
              key={sale.id}
              sale={sale}
              onEdit={() => openEdit(sale)}
              onDelete={() => setDeleteTarget(sale)}
              onToggle={() => toggleDisplay(sale)}
              onManageProducts={() => openProducts(sale)}
            />
          ))}
        </div>
      )}

      {/* ─── Create/Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingSale ? "Edit Flash Sale" : "Create Flash Sale"}
            </DialogTitle>
            <DialogDescription>
              Configure timer, colors, and discount for this flash sale.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="fs-title">Title</Label>
              <Input
                id="fs-title"
                placeholder="Weekend Flash Sale"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            {/* Start & End time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fs-start">Start Time</Label>
                <Input
                  id="fs-start"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Leave empty to start immediately.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fs-end">End Time <span className="text-destructive">*</span></Label>
                <Input
                  id="fs-end"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Required for mobile visibility. Defaults to 1 year if empty.
                </p>
              </div>
            </div>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fs-discount">Discount (%)</Label>
                <Input
                  id="fs-discount"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={formData.discount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <Label>Gradient Colors (3 colors for countdown & background)</Label>
              <div className="grid grid-cols-3 gap-4">
                {(["color_1", "color_2", "color_3"] as const).map((key, i) => (
                  <div key={key} className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">
                        Color {i + 1}
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData[key]}
                        onChange={(e) =>
                          setFormData({ ...formData, [key]: e.target.value })
                        }
                        className="h-9 w-12 cursor-pointer rounded border bg-transparent"
                      />
                      <Input
                        className="font-mono text-xs"
                        value={formData[key]}
                        onChange={(e) =>
                          setFormData({ ...formData, [key]: e.target.value })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* Preview gradient */}
              <div
                className="h-8 rounded-lg"
                style={{
                  background: `linear-gradient(90deg, ${formData.color_1}, ${formData.color_2}, ${formData.color_3})`,
                }}
              />
            </div>

            {/* Slider type */}
            <div className="grid gap-2">
              <Label>Display Type</Label>
              <Select
                value={String(formData.slider_type)}
                onValueChange={(v) =>
                  setFormData({ ...formData, slider_type: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Standard (240px cards)</SelectItem>
                  <SelectItem value="2">Swiper (280px carousel)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Display toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Visible</p>
                <p className="text-xs text-muted-foreground">
                  Show this flash sale on the home screen
                </p>
              </div>
              <Switch
                checked={formData.display}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, display: checked })
                }
              />
            </div>
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
              {editingSale ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Products Management Dialog ─── */}
      <Dialog open={productsDialogOpen} onOpenChange={setProductsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              Manage Products — {productsTarget?.title || "Flash Sale"}
            </DialogTitle>
            <DialogDescription>
              Add or remove products from this flash sale.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search to add */}
            <div className="space-y-2">
              <Label>Add Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products by name..."
                  className="pl-10"
                  value={productSearch}
                  onChange={(e) => searchProducts(e.target.value)}
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="max-h-[200px] space-y-1 overflow-y-auto rounded-lg border p-2">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                        {p.main_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnailUrl(p.main_image) || ""}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm break-words">{p.title || `#${p.id}`}</p>
                        <p className="text-xs text-muted-foreground">
                          ${p.price?.toFixed(2)}
                          {p.discount_price
                            ? ` → $${p.discount_price.toFixed(2)}`
                            : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addProduct(p)}
                        className="shrink-0"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current products */}
            <div className="space-y-2">
              <button
                onClick={() => setExpandedProducts(!expandedProducts)}
                className="flex w-full items-center justify-between text-sm font-medium"
              >
                <span>
                  Current Products ({saleProducts.length})
                </span>
                {expandedProducts ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {productsLoading ? (
                <div className="flex h-20 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : saleProducts.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No products assigned yet. Search above to add products.
                </p>
              ) : (
                <div
                  className={`space-y-1 overflow-y-auto rounded-lg border p-2 ${
                    expandedProducts ? "max-h-[400px]" : "max-h-[200px]"
                  }`}
                >
                  {saleProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                        {p.main_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnailUrl(p.main_image) || ""}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm break-words">{p.title || `#${p.id}`}</p>
                        <p className="text-xs text-muted-foreground">
                          ${p.price?.toFixed(2)}
                          {p.discount_price
                            ? ` → $${p.discount_price.toFixed(2)}`
                            : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeProduct(p)}
                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProductsDialogOpen(false)}
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
        title="Delete Flash Sale"
        description={`Are you sure you want to delete "${deleteTarget?.title || "this flash sale"}"? All product associations will be removed.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
