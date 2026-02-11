"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  DollarSign,
  Truck,
  Clock,
  FileText,
  CreditCard,
  ChevronDown,
  Loader2,
  Save,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  ExternalLink,
  Copy,
  Store,
  Pencil,
  Receipt,
  Plus,
  Eye,
  Ban,
} from "lucide-react";
import { resolveImageUrl } from "@/lib/image-url";
import {
  ORDER_STATUS,
  SHIPPING_STATUS,
  PAYMENT_TYPES,
  VALID_STATUS_TRANSITIONS,
} from "@/lib/order-constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Helpers ───────────────────────────────────────────────────────────
function StatusBadge({ label, color, large }: { label: string; color: string; large?: boolean }) {
  const colorMap: Record<string, string> = {
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    cyan: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colorMap[color] || colorMap.gray} ${
        large ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
    >
      {label}
    </span>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

// ── Main component ────────────────────────────────────────────────────
export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Action states
  const [statusChanging, setStatusChanging] = useState(false);
  const [shippingEditing, setShippingEditing] = useState(false);
  const [shippingSaving, setShippingSaving] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Shipping form
  const [shippingForm, setShippingForm] = useState({
    shipping_method: "",
    shipping_amount: "",
  });
  const [shippingEstimates, setShippingEstimates] = useState<{ air: number; sea: number; selected_method: string } | null>(null);
  const [estimatesLoading, setEstimatesLoading] = useState(false);
  const [shippingStatusChanging, setShippingStatusChanging] = useState(false);
  const [isPaidToggling, setIsPaidToggling] = useState(false);

  // Refund form
  const [refundForm, setRefundForm] = useState({
    refund_type: "full",
    refund_amount: "",
    refund_notes: "",
  });

  // Notes
  const [notes, setNotes] = useState("");

  // Invoices
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);
  const [invoiceUpdating, setInvoiceUpdating] = useState<number | null>(null);

  // Item-level editing states
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [itemSaving, setItemSaving] = useState<number | null>(null);
  const [itemForms, setItemForms] = useState<Record<number, { status: number; tracking_number: string; shipping_method: string; shipping: string; quantity: string }>>({});

  const startEditItem = (p: any) => {
    setEditingItem(p.id);
    // Use the pre-fetched air/sea cost based on item's current shipping method
    const method = p.shipping_method || "air";
    const calcCost = method === "air" ? p.shipping_air : p.shipping_sea;
    const shippingValue = (p.shipping && Number(p.shipping) > 0) ? p.shipping : (calcCost ?? 0);
    setItemForms((prev) => ({
      ...prev,
      [p.id]: {
        status: p.status ?? 9,
        tracking_number: p.tracking_number || "",
        shipping_method: method,
        shipping: String(shippingValue),
        quantity: String(p.quantity || 1),
      },
    }));
  };

  const cancelEditItem = () => {
    setEditingItem(null);
  };

  const saveItemUpdate = async (itemId: number) => {
    const form = itemForms[itemId];
    if (!form) return;
    setItemSaving(itemId);
    try {
      const res = await fetch(`/api/orders/${id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: itemId,
          status: form.status,
          tracking_number: form.tracking_number,
          shipping_method: form.shipping_method,
          shipping: Number(form.shipping),
          quantity: Number(form.quantity),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      showToast("Item updated successfully", "success");
      setEditingItem(null);
      await fetchOrder();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setItemSaving(null);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      const json = await res.json();
      setData(json);
      setNotes(json.order.notes || "");
      setShippingForm({
        shipping_method: json.order.shipping_method || "",
        shipping_amount: String(json.order.shipping_amount || ""),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ── Fetch invoices ────────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/invoices`);
      if (res.ok) {
        const json = await res.json();
        setInvoices(json.invoices || []);
      }
    } catch {
      // Non-fatal
    } finally {
      setInvoicesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    fetchInvoices();
  }, [fetchOrder, fetchInvoices]);

  // ── Handle status change ──────────────────────────────────────────
  const handleStatusChange = async (newStatus: number) => {
    if (!confirm(`Change status to "${ORDER_STATUS[newStatus]?.label}"?`)) return;
    setStatusChanging(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      showToast(`Status updated to ${ORDER_STATUS[newStatus]?.label}`, "success");
      await fetchOrder();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setStatusChanging(false);
    }
  };

  // ── Fetch shipping estimates for both methods ──────────────────────
  const fetchShippingEstimates = async () => {
    setEstimatesLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/shipping-estimate`);
      if (res.ok) {
        const json = await res.json();
        setShippingEstimates(json);
      }
    } catch {
      // Non-fatal — estimates are optional
    } finally {
      setEstimatesLoading(false);
    }
  };

  // ── Handle entering shipping edit mode ──────────────────────────────
  const startShippingEdit = () => {
    setShippingEditing(true);
    fetchShippingEstimates();
  };

  // ── Handle method change — auto-populate with calculated estimate ──
  const handleMethodChange = (newMethod: string) => {
    const updates: { shipping_method: string; shipping_amount?: string } = {
      shipping_method: newMethod,
    };
    // Auto-populate amount with the calculated estimate for the new method
    if (shippingEstimates && (newMethod === "air" || newMethod === "sea")) {
      updates.shipping_amount = String(shippingEstimates[newMethod]);
    }
    setShippingForm((prev) => ({ ...prev, ...updates }));
  };

  // ── Handle shipping details save (amounts only, no status change) ───
  const handleShippingSave = async () => {
    setShippingSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}/shipping`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping_method: shippingForm.shipping_method || undefined,
          shipping_amount: shippingForm.shipping_amount ? Number(shippingForm.shipping_amount) : undefined,
          // No shipping_status — just editing amounts
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      showToast("Shipping details updated", "success");
      setShippingEditing(false);
      await fetchOrder();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setShippingSaving(false);
    }
  };

  // ── Handle shipping status change (0 ↔ 1) ────────────────────────
  const handleShippingStatusChange = async (newShippingStatus: number) => {
    const label = newShippingStatus === 1
      ? "Confirm shipping price and notify user? This enables the Pay button in the app."
      : "Reset shipping status to Pending Review?";
    if (!confirm(label)) return;
    setShippingStatusChanging(true);
    try {
      const res = await fetch(`/api/orders/${id}/shipping`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipping_status: newShippingStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      const msg = newShippingStatus === 1
        ? "Shipping confirmed — user notified with Pay button!"
        : "Shipping status reset to Pending Review";
      showToast(msg, "success");
      await fetchOrder();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setShippingStatusChanging(false);
    }
  };

  // ── Handle is_paid toggle ─────────────────────────────────────────
  const handleIsPaidToggle = async () => {
    const newPaid = data?.order?.is_paid ? 0 : 1;
    const label = newPaid === 1
      ? "Mark products as PAID?"
      : "Mark products as UNPAID?";
    if (!confirm(label)) return;
    setIsPaidToggling(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_paid: newPaid }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(newPaid === 1 ? "Marked as Paid" : "Marked as Unpaid", "success");
      await fetchOrder();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsPaidToggling(false);
    }
  };

  // ── Handle refund ─────────────────────────────────────────────────
  const handleRefund = async () => {
    if (!confirm("Process this refund? This action cannot be undone.")) return;
    setRefundProcessing(true);
    try {
      const res = await fetch(`/api/orders/${id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refund_type: refundForm.refund_type,
          refund_amount: refundForm.refund_amount ? Number(refundForm.refund_amount) : undefined,
          refund_notes: refundForm.refund_notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      showToast(`Refund of $${Number(json.refund_amount).toFixed(2)} processed`, "success");
      setRefundOpen(false);
      await fetchOrder();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setRefundProcessing(false);
    }
  };

  // ── Handle notes save ─────────────────────────────────────────────
  const handleNotesSave = async () => {
    setNotesSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      showToast("Notes saved", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setNotesSaving(false);
    }
  };

  // ── Generate invoice ──────────────────────────────────────────────
  const handleGenerateInvoice = async (type: "product" | "shipping") => {
    const label = type === "product" ? "Product" : "Shipping";
    if (!confirm(`Generate a ${label} invoice for this order?`)) return;
    setInvoiceGenerating(true);
    try {
      const res = await fetch(`/api/orders/${id}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      showToast(`${label} invoice generated: ${json.invoice.invoice_number}`, "success");
      await fetchInvoices();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setInvoiceGenerating(false);
    }
  };

  // ── Update invoice status ─────────────────────────────────────────
  const handleInvoiceStatusChange = async (invoiceId: number, newStatus: string) => {
    const label = newStatus === "void" ? "Void this invoice? This cannot be undone." : `Mark invoice as "${newStatus}"?`;
    if (!confirm(label)) return;
    setInvoiceUpdating(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      showToast(`Invoice status updated to ${newStatus}`, "success");
      await fetchInvoices();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setInvoiceUpdating(null);
    }
  };

  // ── Loading / Error states ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <XCircle className="h-12 w-12 text-red-400" />
        <p className="text-lg font-medium">{error || "Order not found"}</p>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
      </div>
    );
  }

  const { order, products, tracking, transactions, customer, coupon } = data;
  const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status] || [];

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}

      {/* ── Section A: Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/orders"
            className="rounded-lg border p-2 hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Order #{order.id}
            </h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <StatusBadge label={order.status_label} color={order.status_color} large />
              {order.is_paid ? (
                <StatusBadge label="Products Paid" color="green" />
              ) : (
                <StatusBadge label="Products Unpaid" color="red" />
              )}
              <StatusBadge label={order.shipping_status_label} color={order.shipping_status_color} />
              <span className="text-xs text-muted-foreground">
                {new Date(order.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid: 2 columns on desktop */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column — 2/3 */}
        <div className="space-y-5 lg:col-span-2">
          {/* ── Section B: Status Management ───────────────────────── */}
          <SectionCard title="Status Management" icon={Clock}>
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">Current:</span>
                <StatusBadge label={order.status_label} color={order.status_color} large />
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>

              {allowedTransitions.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {allowedTransitions.map((s: number) => {
                    const st = ORDER_STATUS[s];
                    if (!st) return null;
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        disabled={statusChanging}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        {statusChanging ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : null}
                        → {st.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No further status transitions available.
                </p>
              )}
            </div>
          </SectionCard>

          {/* ── Section D: Shipping Management ──────────────────────── */}
          <SectionCard
            title="Shipping Management"
            icon={Truck}
            actions={
              order.shipping_status !== 2 && !shippingEditing ? (
                <button
                  onClick={startShippingEdit}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-accent"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              ) : null
            }
          >
            <div className="space-y-4">
              {/* Shipping Status Control — always visible */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Shipping Payment Status</span>
                  <StatusBadge label={order.shipping_status_label} color={order.shipping_status_color} large />
                </div>

                {order.shipping_status === 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Shipping cost is under review. Confirm the price to enable the Pay button in the customer&apos;s app.
                    </p>
                    <button
                      onClick={() => handleShippingStatusChange(1)}
                      disabled={shippingStatusChanging}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {shippingStatusChanging ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                      Confirm Price &amp; Notify User
                    </button>
                  </div>
                )}

                {order.shipping_status === 1 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Price confirmed — waiting for customer payment. Customer sees a &ldquo;Pay&rdquo; button in the app.
                    </p>
                    <button
                      onClick={() => handleShippingStatusChange(0)}
                      disabled={shippingStatusChanging}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                    >
                      {shippingStatusChanging ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                      Reset to Pending Review
                    </button>
                  </div>
                )}

                {order.shipping_status === 2 && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Shipping has been paid by the customer.
                  </p>
                )}
              </div>

              {/* Shipping Details — edit / view mode */}
              {shippingEditing ? (
                <div className="space-y-4">
                  {/* Method selector with calculated estimates */}
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Method</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(["air", "sea"] as const).map((m) => {
                        const isSelected = shippingForm.shipping_method === m;
                        const isUserMethod = shippingEstimates?.selected_method === m;
                        const icon = m === "air" ? "✈️" : "🚢";
                        const label = m === "air" ? "Air" : "Sea";
                        const estimate = shippingEstimates?.[m];
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleMethodChange(m)}
                            className={`flex flex-col rounded-lg border-2 px-3 py-2.5 text-left transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-muted hover:border-muted-foreground/30"
                            }`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <span className="text-sm font-medium">{icon} {label}</span>
                              <span className="text-sm font-mono font-semibold">
                                {estimatesLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : estimate !== undefined && estimate > 0 ? (
                                  `$${estimate.toFixed(2)}`
                                ) : (
                                  "—"
                                )}
                              </span>
                            </div>
                            <span className={`mt-1 text-[10px] ${isUserMethod ? "text-primary font-medium" : "text-muted-foreground"}`}>
                              {isUserMethod ? "✓ User selected" : "System estimate"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Editable shipping amount */}
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Shipping Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={shippingForm.shipping_amount}
                      onChange={(e) =>
                        setShippingForm({ ...shippingForm, shipping_amount: e.target.value })
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Calculated estimate auto-fills when you switch method. Edit manually if needed.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleShippingSave}
                      disabled={shippingSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {shippingSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save
                    </button>
                    <button
                      onClick={() => setShippingEditing(false)}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <InfoRow
                    label="Method"
                    value={
                      order.shipping_method
                        ? order.shipping_method === "both"
                          ? "✈️🚢 Both (Air & Sea)"
                          : `${order.shipping_method === "air" ? "✈️" : "🚢"} ${order.shipping_method.charAt(0).toUpperCase() + order.shipping_method.slice(1)}`
                        : "—"
                    }
                  />
                  <InfoRow label="Shipping Amount" value={`$${Number(order.shipping_amount).toFixed(2)}`} mono />
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── Section E: Products Table ────────────────────────────── */}
          <SectionCard title={`Products (${products.length})`} icon={Package}>
            <div className="space-y-4">
              {products.map((p: any) => (
                <div key={p.id} className="rounded-lg border p-4">
                  <div className="flex gap-4">
                    {/* Product image */}
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {resolveImageUrl(p.main_image) ? (
                        <Image
                          src={resolveImageUrl(p.main_image)!}
                          alt={p.product_name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/dashboard/products/${p.r_product_id}`}
                        className="font-medium text-primary hover:underline line-clamp-2 text-sm"
                      >
                        {p.product_name}
                      </Link>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>SKU: {p.product_code}</span>
                        {p.variation_name && <span>Variant: {p.variation_name}</span>}
                      </div>

                      {/* Item status badge + tracking */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <StatusBadge
                          label={p.status_label || ORDER_STATUS[p.status ?? 9]?.label || "Pending"}
                          color={p.status_color || ORDER_STATUS[p.status ?? 9]?.color || "gray"}
                        />
                        {p.tracking_number && (
                          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
                            🔗 {p.tracking_number}
                          </span>
                        )}
                        {p.shipping_method && (
                          <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground uppercase">
                            {p.shipping_method === "air" ? "✈️" : "🚢"} {p.shipping_method}
                          </span>
                        )}
                      </div>

                      {/* Variations */}
                      {p.variations?.length > 0 && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {p.variations.map((v: any) => (
                            <span
                              key={v.id}
                              className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {v.option_name}: {v.option_value}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Store info */}
                      {p.store_info && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Store className="h-3 w-3" />
                          {p.store_info.shop_url ? (
                            <a
                              href={p.store_info.shop_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-blue-600 dark:text-blue-400"
                            >
                              {p.store_info.shop_name || "1688 Store"}
                            </a>
                          ) : (
                            <span>{p.store_info.shop_name || "1688 Store"}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Price info + Edit button */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <div className="text-sm font-medium">${Number(p.product_price).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        Qty: {p.quantity}
                      </div>
                      {(p.shipping ?? 0) > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          Ship: ${Number(p.shipping).toFixed(2)}
                        </div>
                      )}
                      {editingItem !== p.id && (
                        <button
                          onClick={() => startEditItem(p)}
                          className="mt-1 inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent transition-colors"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Inline Edit Form ─────────────────────────── */}
                  {editingItem === p.id && itemForms[p.id] && (
                    <div className="mt-3 border-t pt-3 grid grid-cols-2 gap-3">
                      {/* Status */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Status</label>
                        <select
                          className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                          value={itemForms[p.id].status}
                          onChange={(e) =>
                            setItemForms((prev) => ({
                              ...prev,
                              [p.id]: { ...prev[p.id], status: Number(e.target.value) },
                            }))
                          }
                        >
                          {Object.entries(ORDER_STATUS).map(([val, s]) => (
                            <option key={val} value={val}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Shipping Method */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Shipping</label>
                        <div className="mt-1 grid grid-cols-2 gap-1.5">
                          {(["air", "sea"] as const).map((m) => {
                            const isSelected = itemForms[p.id].shipping_method === m;
                            const icon = m === "air" ? "✈️" : "🚢";
                            const label = m === "air" ? "Air" : "Sea";
                            const cost = m === "air" ? p.shipping_air : p.shipping_sea;
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  setItemForms((prev) => ({
                                    ...prev,
                                    [p.id]: {
                                      ...prev[p.id],
                                      shipping_method: m,
                                      shipping: String(cost ?? prev[p.id].shipping),
                                    },
                                  }));
                                }}
                                className={`flex flex-col items-center rounded-md border-2 px-2 py-1.5 text-xs transition-colors ${
                                  isSelected
                                    ? "border-primary bg-primary/10 font-semibold"
                                    : "border-muted hover:border-muted-foreground/30"
                                }`}
                              >
                                <span>{icon} {label}</span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  ${Number(cost ?? 0).toFixed(2)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tracking Number */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Tracking #</label>
                        <input
                          type="text"
                          className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm font-mono"
                          placeholder="Enter tracking number..."
                          value={itemForms[p.id].tracking_number}
                          onChange={(e) =>
                            setItemForms((prev) => ({
                              ...prev,
                              [p.id]: { ...prev[p.id], tracking_number: e.target.value },
                            }))
                          }
                        />
                      </div>

                      {/* Shipping Cost */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Shipping ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm font-mono"
                          value={itemForms[p.id].shipping}
                          onChange={(e) =>
                            setItemForms((prev) => ({
                              ...prev,
                              [p.id]: { ...prev[p.id], shipping: e.target.value },
                            }))
                          }
                        />
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex justify-end gap-2">
                        <button
                          onClick={cancelEditItem}
                          className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                          disabled={itemSaving === p.id}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveItemUpdate(p.id)}
                          disabled={itemSaving === p.id}
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {itemSaving === p.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Products summary */}
              <div className="border-t pt-3 space-y-1">
                <InfoRow
                  label={`Subtotal (${products.length} items)`}
                  value={`$${Number(order.subtotal || 0).toFixed(2)}`}
                  mono
                />
                <InfoRow label="Shipping" value={`$${Number(order.shipping_amount).toFixed(2)}`} mono />
                {order.discount_amount > 0 && (
                  <InfoRow
                    label="Discount"
                    value={
                      <span className="text-red-600 dark:text-red-400">
                        -${Number(order.discount_amount).toFixed(2)}
                      </span>
                    }
                    mono
                  />
                )}
                <div className="border-t pt-2">
                  <InfoRow
                    label="Total"
                    value={<span className="text-base">${Number(order.total).toFixed(2)}</span>}
                    mono
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Section G: Timeline ──────────────────────────────────── */}
          <SectionCard title="Order Timeline" icon={Clock}>
            {tracking.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No tracking events yet.</p>
            ) : (
              <div className="relative space-y-0">
                {tracking.map((t: any, i: number) => (
                  <div key={t.id} className="flex gap-3 pb-4 last:pb-0">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-3 w-3 rounded-full border-2 ${
                          i === tracking.length - 1
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30 bg-background"
                        }`}
                      />
                      {i < tracking.length - 1 && (
                        <div className="w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="-mt-0.5">
                      <StatusBadge label={t.status_label} color={t.status_color} />
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(t.track_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-5">
          {/* ── Section C: Payment Summary ──────────────────────────── */}
          <SectionCard title="Payment Summary" icon={CreditCard}>
            <div className="space-y-1">
              <InfoRow
                label="Payment Type"
                value={order.payment_type_label}
              />
              <InfoRow
                label="Products Paid"
                value={
                  <div className="flex items-center gap-2">
                    {order.is_paid ? (
                      <StatusBadge label="Paid" color="green" />
                    ) : (
                      <StatusBadge label="Unpaid" color="red" />
                    )}
                    <button
                      onClick={handleIsPaidToggle}
                      disabled={isPaidToggling}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium border transition-colors ${
                        order.is_paid
                          ? "text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                          : "text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
                      } disabled:opacity-50`}
                      title={order.is_paid ? "Mark as Unpaid" : "Mark as Paid"}
                    >
                      {isPaidToggling ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : order.is_paid ? (
                        <XCircle className="h-2.5 w-2.5" />
                      ) : (
                        <CheckCircle className="h-2.5 w-2.5" />
                      )}
                      {order.is_paid ? "Unpay" : "Pay"}
                    </button>
                  </div>
                }
              />
              {order.payment_id && (
                <InfoRow
                  label="Payment ID"
                  value={
                    <button
                      onClick={() => copyToClipboard(order.payment_id)}
                      className="inline-flex items-center gap-1 font-mono text-xs hover:text-primary"
                      title="Copy"
                    >
                      {order.payment_id.substring(0, 16)}…
                      <Copy className="h-3 w-3" />
                    </button>
                  }
                />
              )}
              {order.shipping_payment_id && (
                <InfoRow
                  label="Shipping Payment"
                  value={
                    <button
                      onClick={() => copyToClipboard(order.shipping_payment_id)}
                      className="inline-flex items-center gap-1 font-mono text-xs hover:text-primary"
                      title="Copy"
                    >
                      {order.shipping_payment_id.substring(0, 16)}…
                      <Copy className="h-3 w-3" />
                    </button>
                  }
                />
              )}
            </div>

            {/* Transactions */}
            {transactions.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                  Transactions
                </h3>
                <div className="space-y-2">
                  {transactions.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                      <div>
                        <span className="text-xs font-medium capitalize">{t.gateway}</span>
                        <p className="text-[10px] text-muted-foreground">{t.external_id}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">${t.amount.toFixed(2)}</span>
                        <p className="text-[10px]">
                          <StatusBadge
                            label={t.status}
                            color={t.status === "success" || t.status === "completed" ? "green" : t.status === "pending" ? "yellow" : "red"}
                          />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coupon */}
            {coupon && (
              <div className="mt-4 border-t pt-3">
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Coupon</h3>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-mono text-sm font-medium">{coupon.code}</span>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {coupon.percentage ? `${coupon.discount}%` : `$${coupon.discount}`}
                  </span>
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Section: Invoices ───────────────────────────────────── */}
          <SectionCard
            title={`Invoices (${invoices.length})`}
            icon={Receipt}
            actions={
              <div className="flex gap-1">
                {!invoices.some((inv: any) => inv.type === "product") && (
                  <button
                    onClick={() => handleGenerateInvoice("product")}
                    disabled={invoiceGenerating}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium hover:bg-accent disabled:opacity-50"
                    title="Generate Product Invoice"
                  >
                    {invoiceGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Product
                  </button>
                )}
                {!invoices.some((inv: any) => inv.type === "shipping") && (
                  <button
                    onClick={() => handleGenerateInvoice("shipping")}
                    disabled={invoiceGenerating}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium hover:bg-accent disabled:opacity-50"
                    title="Generate Shipping Invoice"
                  >
                    {invoiceGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Shipping
                  </button>
                )}
              </div>
            }
          >
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-4">
                <Receipt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground italic">No invoices generated yet.</p>
                <div className="flex gap-2 justify-center mt-3">
                  <button
                    onClick={() => handleGenerateInvoice("product")}
                    disabled={invoiceGenerating}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                  >
                    {invoiceGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Product Invoice
                  </button>
                  <button
                    onClick={() => handleGenerateInvoice("shipping")}
                    disabled={invoiceGenerating}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                  >
                    {invoiceGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Shipping Invoice
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="rounded-lg border p-3 space-y-2">
                    {/* Invoice header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          inv.type === "product"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                        }`}>
                          {inv.type === "product" ? "📦 Product" : "🚚 Shipping"}
                        </span>
                        <StatusBadge
                          label={inv.status}
                          color={inv.status === "generated" ? "blue" : inv.status === "sent" ? "green" : "red"}
                        />
                      </div>
                      <span className="text-sm font-mono font-semibold">${inv.total.toFixed(2)}</span>
                    </div>

                    {/* Invoice number & date */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">{inv.invoice_number}</span>
                      <span>{new Date(inv.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-1 border-t">
                      <a
                        href={inv.view_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-primary hover:bg-accent"
                      >
                        <Eye className="h-3 w-3" /> View
                      </a>
                      {inv.status === "generated" && (
                        <button
                          onClick={() => handleInvoiceStatusChange(inv.id, "sent")}
                          disabled={invoiceUpdating === inv.id}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/50 disabled:opacity-50"
                        >
                          {invoiceUpdating === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                          Mark Sent
                        </button>
                      )}
                      {inv.status !== "void" && (
                        <button
                          onClick={() => handleInvoiceStatusChange(inv.id, "void")}
                          disabled={invoiceUpdating === inv.id}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 disabled:opacity-50"
                        >
                          {invoiceUpdating === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                          Void
                        </button>
                      )}
                    </div>

                    {/* Notes */}
                    {inv.notes && (
                      <p className="text-[10px] text-muted-foreground italic border-t pt-1">{inv.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Section F: Customer & Address ───────────────────────── */}
          <SectionCard title="Customer & Address" icon={User}>
            <div className="space-y-3">
              {/* Customer info */}
              {customer && (
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                    {resolveImageUrl(customer.main_image) ? (
                      <Image
                        src={resolveImageUrl(customer.main_image)!}
                        alt="Customer"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {customer.first_name} {customer.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                  </div>
                </div>
              )}

              <div className="border-t pt-3 space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Shipping Address
                </h3>
                <p className="text-sm font-medium">
                  {order.address_first_name} {order.address_last_name}
                </p>
                <p className="text-sm text-muted-foreground">{order.address}</p>
                <p className="text-sm text-muted-foreground">
                  {order.building_name}, Floor {order.floor_number}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.route_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.city}, {order.state ? `${order.state}, ` : ""}{order.country}
                </p>
                <p className="text-sm text-muted-foreground">
                  📞 {order.address_country_code} {order.address_phone_number}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* ── Section H: Admin Notes ──────────────────────────────── */}
          <SectionCard title="Admin Notes" icon={FileText}>
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Internal notes about this order…"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none"
              />
              <button
                onClick={handleNotesSave}
                disabled={notesSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {notesSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save Notes
              </button>

              {/* Client notes (read-only) */}
              {order.client_notes && (
                <div className="border-t pt-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Customer Notes
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {order.client_notes}
                  </p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── Section I: Refund Card ──────────────────────────────── */}
          {order.status === 6 ? (
            <SectionCard title="Refund Details" icon={RotateCcw}>
              <div className="space-y-1">
                <InfoRow label="Refund Type" value={order.refund_type || "—"} />
                <InfoRow
                  label="Refund Amount"
                  value={
                    order.refund_amount != null
                      ? `$${Number(order.refund_amount).toFixed(2)}`
                      : "—"
                  }
                  mono
                />
                {order.refund_notes && (
                  <InfoRow label="Notes" value={order.refund_notes} />
                )}
                {order.refunded_at && (
                  <InfoRow
                    label="Refunded At"
                    value={new Date(order.refunded_at).toLocaleString()}
                  />
                )}
              </div>
            </SectionCard>
          ) : order.status === 4 ? (
            <SectionCard title="Process Refund" icon={RotateCcw}>
              {refundOpen ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Refund Type</label>
                    <select
                      value={refundForm.refund_type}
                      onChange={(e) =>
                        setRefundForm({ ...refundForm, refund_type: e.target.value })
                      }
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      <option value="full">Full Refund</option>
                      <option value="products_only">Products Only</option>
                      <option value="shipping_only">Shipping Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Custom Amount (leave empty for auto)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={refundForm.refund_amount}
                      onChange={(e) =>
                        setRefundForm({ ...refundForm, refund_amount: e.target.value })
                      }
                      placeholder="Auto-calculated"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
                    <textarea
                      value={refundForm.refund_notes}
                      onChange={(e) =>
                        setRefundForm({ ...refundForm, refund_notes: e.target.value })
                      }
                      rows={2}
                      placeholder="Reason for refund…"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRefund}
                      disabled={refundProcessing}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {refundProcessing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      Process Refund
                    </button>
                    <button
                      onClick={() => setRefundOpen(false)}
                      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> This action cannot be undone.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setRefundOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  <RotateCcw className="h-3 w-3" /> Initiate Refund
                </button>
              )}
            </SectionCard>
          ) : null}

          {/* ── Section J: Additional Info ──────────────────────────── */}
          <SectionCard title="Additional Details" icon={FileText}>
            <div className="space-y-1">
              <InfoRow label="Order ID" value={`#${order.id}`} mono />
              <InfoRow label="User ID" value={order.r_user_id} mono />
              <InfoRow label="Currency" value={order.currency_id === 6 ? "USD" : `ID: ${order.currency_id}`} />
              {order.r_delivery_company_id && (
                <InfoRow label="Delivery Company" value={`#${order.r_delivery_company_id}`} />
              )}
              {order.pick_up_date && (
                <InfoRow label="Pickup Date" value={new Date(order.pick_up_date).toLocaleDateString()} />
              )}
              {order.additional_details && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Additional Details:</p>
                  <p className="text-sm whitespace-pre-wrap">{order.additional_details}</p>
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <InfoRow label="Created" value={new Date(order.created_at).toLocaleString()} />
                {order.updated_at && (
                  <InfoRow label="Updated" value={new Date(order.updated_at).toLocaleString()} />
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
