"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
// Using plain <img> for product images since they come from many unpredictable CDN domains
import Link from "next/link";
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  Package,
  Filter,
  X,
  Truck,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Workflow status badge ─────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ordered: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  shipped_to_wh: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  received_to_wh: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  shipped_to_leb: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  received_to_leb: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  delivered_to_customer: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

function WorkflowBadge({ statusKey, label }: { statusKey: string | null; label: string | null }) {
  if (!statusKey || !label) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
        Unset
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[statusKey] || "bg-gray-100 text-gray-800"}`}
    >
      {label}
    </span>
  );
}

// ── Workflow status change modal ──────────────────────────────────────
function WorkflowModal({
  item,
  onClose,
  onSuccess,
}: {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [transitions, setTransitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(item.tracking_number || "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/orders/items/${item.id}/workflow`)
      .then((r) => r.json())
      .then((d) => {
        setTransitions(d.allowed_transitions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [item.id]);

  const handleTransition = async (toStatusKey: string, requiresTracking: boolean) => {
    if (requiresTracking && !trackingNumber.trim() && !item.tracking_number) {
      setError("Tracking number is required for this transition");
      return;
    }

    setUpdating(true);
    setError("");

    try {
      const res = await fetch(`/api/orders/items/${item.id}/workflow`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_status_key: toStatusKey,
          tracking_number: trackingNumber || undefined,
          note: note || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update status");
        setUpdating(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Network error");
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Change Status</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-2 text-sm text-muted-foreground">
          {item.product_name} (Item #{item.id})
        </p>
        <p className="mb-4 text-sm">
          Current: <WorkflowBadge statusKey={item.workflow_status_key} label={item.workflow_status_label} />
        </p>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : transitions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No transitions available for your role from this status.
          </p>
        ) : (
          <>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Enter tracking number..."
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Optional note..."
                rows={2}
              />
            </div>

            <div className="flex flex-col gap-2">
              {transitions.map((t: any) => (
                <button
                  key={t.toStatusKey}
                  onClick={() => handleTransition(t.toStatusKey, t.requiresTracking)}
                  disabled={updating}
                  className={`flex items-center justify-between rounded-md border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50 ${
                    t.isTerminal ? "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400" : ""
                  }`}
                >
                  <span>
                    → {t.toStatusLabel}
                    {t.requiresTracking && (
                      <span className="ml-2 text-xs text-muted-foreground">(tracking required)</span>
                    )}
                  </span>
                  {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function ItemListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [statusSummary, setStatusSummary] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("workflow_status", statusFilter);
      if (orderIdFilter) params.set("order_id", orderIdFilter);

      const res = await fetch(`/api/orders/items?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.totalCount || 0);
      setStatusSummary(data.statusSummary || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, orderIdFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Clear selection when items change (page change, filter change, etc.)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [items]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  // ── Selection helpers ───────────────────────────────────────
  const selectableItems = useMemo(
    () => items.filter((i) => !i.is_terminal),
    [items]
  );

  const allSelectableSelected =
    selectableItems.length > 0 && selectableItems.every((i) => selectedIds.has(i.id));
  const someSelected = selectedIds.size > 0 && !allSelectableSelected;

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableItems.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedItemsData = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Item Master List</h1>
            <p className="text-sm text-muted-foreground">{totalCount} items across all orders</p>
          </div>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setStatusFilter(""); setPage(1); }}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !statusFilter
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All ({totalCount})
        </button>
        {statusSummary
          .filter((s) => !s.is_terminal)
          .map((s) => (
            <button
              key={s.status_key}
              onClick={() => { setStatusFilter(s.status_key); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s.status_key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s.status_label} ({s.count})
            </button>
          ))}
        {statusSummary
          .filter((s) => s.is_terminal)
          .map((s) => (
            <button
              key={s.status_key}
              onClick={() => { setStatusFilter(s.status_key); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s.status_key
                  ? "bg-red-600 text-white"
                  : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {s.status_label} ({s.count})
            </button>
          ))}
      </div>

      {/* Search + Order ID filter */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, tracking number, or ID..."
            className="w-full rounded-md border py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <div className="relative w-40">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={orderIdFilter}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setOrderIdFilter(val);
              setPage(1);
            }}
            placeholder="Order #"
            className="w-full rounded-md border py-2 pl-10 pr-4 text-sm"
          />
        </div>
        {(search || orderIdFilter) && (
          <button
            type="button"
            onClick={() => { setSearch(""); setOrderIdFilter(""); setPage(1); }}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <CheckSquare className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">
            {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => setShowBulkModal(true)}
            className="ml-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Bulk Change Status
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No items found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-10 px-4 py-3 text-left">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                    {allSelectableSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : someSelected ? (
                      <MinusSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Qty</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tracking</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Supplier</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => { if (!item.is_terminal) toggleSelectItem(item.id); }}
                  className={`hover:bg-muted/30 transition-colors ${
                    !item.is_terminal ? "cursor-pointer" : ""
                  } ${selectedIds.has(item.id) ? "bg-primary/5" : ""}`}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    {!item.is_terminal ? (
                      <button
                        onClick={() => toggleSelectItem(item.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {selectedIds.has(item.id) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      <span className="inline-block h-4 w-4" />
                    )}
                  </td>
                  {/* Item info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.image_url ? (
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border">
                          <img
                            src={item.image_url}
                            alt={item.product_name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium max-w-[200px]" title={item.product_name}>
                          {item.product_name}
                        </p>
                        {item.variation_name && (
                          <p className="text-xs text-muted-foreground">{item.variation_name}</p>
                        )}
                        <p className="text-xs text-muted-foreground">#{item.id}</p>
                      </div>
                    </div>
                  </td>

                  {/* Order */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/orders/${item.order_id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      #{item.order_id}
                    </Link>
                    {item.customer_name && (
                      <p className="text-xs text-muted-foreground">{item.customer_name}</p>
                    )}
                  </td>

                  {/* Qty */}
                  <td className="px-4 py-3 font-medium">{item.quantity}</td>

                  {/* Workflow status */}
                  <td className="px-4 py-3">
                    <WorkflowBadge
                      statusKey={item.workflow_status_key}
                      label={item.workflow_status_label}
                    />
                  </td>

                  {/* Tracking */}
                  <td className="px-4 py-3">
                    {item.tracking_number ? (
                      <div className="flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-mono">{item.tracking_number}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Supplier */}
                  <td className="px-4 py-3">
                    {item.supplier_link ? (
                      <a
                        href={item.supplier_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Shop
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {!item.is_terminal && (
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        Change Status
                      </button>
                    )}
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
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} items)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Workflow modal */}
      {selectedItem && (
        <WorkflowModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSuccess={() => {
            setSelectedItem(null);
            fetchItems();
          }}
        />
      )}

      {/* Bulk workflow modal */}
      {showBulkModal && selectedItemsData.length > 0 && (
        <BulkWorkflowModal
          items={selectedItemsData}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            setSelectedIds(new Set());
            fetchItems();
          }}
        />
      )}
    </div>
  );
}

// ── Bulk Workflow Modal ──────────────────────────────────────────────
function BulkWorkflowModal({
  items,
  onClose,
  onSuccess,
}: {
  items: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [transitions, setTransitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  // Find transitions that are common to ALL selected items
  // by fetching each unique current-status's transitions and intersecting
  useEffect(() => {
    let cancelled = false;

    async function loadCommonTransitions() {
      try {
        // Get unique workflow status IDs across selected items
        const uniqueStatusKeys = [...new Set(items.map((i) => i.workflow_status_key))];

        // Fetch transitions for one representative item per status group
        const transitionSets: Map<string, any>[] = [];
        for (const statusKey of uniqueStatusKeys) {
          const repr = items.find((i) => i.workflow_status_key === statusKey);
          if (!repr) continue;

          const res = await fetch(`/api/orders/items/${repr.id}/workflow`);
          const data = await res.json();
          const tMap = new Map<string, any>();
          for (const t of data.allowed_transitions || []) {
            tMap.set(t.toStatusKey, t);
          }
          transitionSets.push(tMap);
        }

        if (cancelled) return;

        if (transitionSets.length === 0) {
          setTransitions([]);
          setLoading(false);
          return;
        }

        // Intersect: only keep transitions available in ALL status groups
        const firstSet = transitionSets[0];
        const common: any[] = [];
        for (const [key, t] of firstSet) {
          if (transitionSets.every((s) => s.has(key))) {
            common.push(t);
          }
        }

        setTransitions(common);
      } catch {
        if (!cancelled) setTransitions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCommonTransitions();
    return () => {
      cancelled = true;
    };
  }, [items]);

  const handleBulkTransition = async (toStatusKey: string) => {
    setUpdating(true);
    setError("");

    try {
      const res = await fetch("/api/orders/items/bulk-workflow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_ids: items.map((i) => i.id),
          to_status_key: toStatusKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bulk update failed");
        setUpdating(false);
        return;
      }

      setResult(data);
      // Auto-close after 1.5s if all succeeded
      if (data.skipped_count === 0) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch {
      setError("Network error");
      setUpdating(false);
    }
  };

  // Group selected items by current status for summary
  const statusGroups = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const key = item.workflow_status_label || "Unset";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Bulk Change Status</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-md bg-muted/50 p-3">
          <p className="text-sm font-medium mb-1">
            {items.length} item{items.length > 1 ? "s" : ""} selected
          </p>
          <div className="flex flex-wrap gap-2">
            {statusGroups.map(([label, count]) => (
              <span key={label} className="text-xs text-muted-foreground">
                {label}: {count}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {result ? (
          <div className="space-y-3">
            <div className="rounded bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              Successfully updated {result.updated_count} item{result.updated_count !== 1 ? "s" : ""}
              {" "}to <strong>{result.target_status?.label}</strong>
            </div>
            {result.skipped_count > 0 && (
              <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                <p className="font-medium mb-1">{result.skipped_count} item(s) skipped:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {result.skipped?.map((s: any) => (
                    <li key={s.id}>Item #{s.id}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={onSuccess}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : transitions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No common transitions available for the selected items.
            {statusGroups.length > 1 && (
              <span className="block mt-1 text-xs">
                Try selecting items with the same current status.
              </span>
            )}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {transitions.map((t: any) => (
              <button
                key={t.toStatusKey}
                onClick={() => handleBulkTransition(t.toStatusKey)}
                disabled={updating}
                className={`flex items-center justify-between rounded-md border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50 ${
                  t.isTerminal ? "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400" : ""
                }`}
              >
                <span>→ {t.toStatusLabel} ({items.length} items)</span>
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
