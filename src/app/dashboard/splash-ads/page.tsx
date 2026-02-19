"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  MonitorPlay,
  Eye,
  EyeOff,
  Play,
  ImageIcon,
  Video,
  Info,
  BarChart3,
  Calendar,
  Clock,
  MousePointerClick,
  SkipForward,
  Upload,
  Search,
  FolderTree,
  Package,
  Globe,
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { resolveImageUrl } from "@/lib/image-url";
import { toast } from "sonner";

/* ─── Types ─── */

interface SplashAd {
  id: number;
  title: string;
  media_type: "image" | "video" | "lottie" | "gif";
  media_url: string | null;
  thumbnail_url: string | null;
  link_type: "product" | "category" | "url" | "none";
  link_value: string | null;
  skip_duration: number;
  total_duration: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  view_count: number;
  click_count: number;
  skip_count: number;
  created_at: string | null;
  updated_at: string | null;
}

interface SplashAdFormData {
  title: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string;
  link_type: string;
  link_value: string;
  skip_duration: number;
  total_duration: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  /** File picked by admin — not yet uploaded */
  pendingFile?: File | null;
  /** Blob URL for instant local preview */
  pendingPreview?: string | null;
  /** Thumbnail file picked by admin */
  pendingThumbFile?: File | null;
  /** Thumbnail blob URL */
  pendingThumbPreview?: string | null;
}

interface CategoryOption {
  id: number;
  name: string;
  parent_name: string | null;
}

interface ProductOption {
  id: number;
  title: string;
  main_image: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const EMPTY_FORM: SplashAdFormData = {
  title: "",
  media_type: "image",
  media_url: "",
  thumbnail_url: "",
  link_type: "none",
  link_value: "",
  skip_duration: 5,
  total_duration: 10,
  is_active: true,
  start_date: "",
  end_date: "",
  pendingFile: null,
  pendingPreview: null,
  pendingThumbFile: null,
  pendingThumbPreview: null,
};

/**
 * No-op error handler — displaySrc already provides the correct URL.
 * Kept because JSX elements reference it as onError.
 */
function handleImgError(
  _e: React.SyntheticEvent<HTMLImageElement>,
  _originalPath: string | null | undefined
) {
  // Images are now always served from the backend URL via displaySrc.
}

/**
 * For a given image path, resolve it to a full backend URL.
 */
function displaySrc(path: string | null | undefined): string {
  return resolveImageUrl(path) || "";
}

/* ════════════════════════════════════════════════════════════
   LinkSelector — search categories / products / enter URL
   ════════════════════════════════════════════════════════════ */

function LinkSelector({
  linkType,
  linkValue,
  onTypeChange,
  onValueChange,
}: {
  linkType: string;
  linkValue: string;
  onTypeChange: (v: string) => void;
  onValueChange: (v: string) => void;
}) {
  const [catQuery, setCatQuery] = useState("");
  const [catResults, setCatResults] = useState<CategoryOption[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [prodQuery, setProdQuery] = useState("");
  const [prodResults, setProdResults] = useState<ProductOption[]>([]);
  const [prodLoading, setProdLoading] = useState(false);

  useEffect(() => {
    if (catQuery.length < 2) { setCatResults([]); return; }
    const t = setTimeout(async () => {
      setCatLoading(true);
      try {
        const res = await fetch("/api/categories/tree");
        const data = await res.json();
        const cats: any[] = data.categories || [];
        const q = catQuery.toLowerCase();
        const matched = cats.filter(
          (c: any) =>
            c.category_name?.toLowerCase().includes(q) ||
            c.category_name_en?.toLowerCase().includes(q) ||
            String(c.id) === catQuery
        );
        const nameMap = new Map<number, string>();
        for (const c of cats) nameMap.set(c.id, c.category_name_en || c.category_name || "");
        setCatResults(
          matched.slice(0, 20).map((c: any) => ({
            id: c.id,
            name: c.category_name_en || c.category_name || `#${c.id}`,
            parent_name: c.parent ? nameMap.get(c.parent) || null : null,
          }))
        );
      } catch { setCatResults([]); }
      finally { setCatLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [catQuery]);

  useEffect(() => {
    if (prodQuery.length < 2) { setProdResults([]); return; }
    const t = setTimeout(async () => {
      setProdLoading(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(prodQuery)}&limit=15`);
        const data = await res.json();
        setProdResults(
          (data.products || []).map((p: any) => ({
            id: p.id,
            title: p.display_name || p.product_name || p.title || `#${p.id}`,
            main_image: p.main_image,
          }))
        );
      } catch { setProdResults([]); }
      finally { setProdLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [prodQuery]);

  useEffect(() => {
    setCatQuery(""); setCatResults([]);
    setProdQuery(""); setProdResults([]);
  }, [linkType]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label>When clicked, go to</Label>
        <Select value={linkType} onValueChange={onTypeChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none"><span className="flex items-center gap-2"><X className="h-3 w-3" /> No link</span></SelectItem>
            <SelectItem value="category"><span className="flex items-center gap-2"><FolderTree className="h-3 w-3" /> Category</span></SelectItem>
            <SelectItem value="product"><span className="flex items-center gap-2"><Package className="h-3 w-3" /> Product</span></SelectItem>
            <SelectItem value="url"><span className="flex items-center gap-2"><Globe className="h-3 w-3" /> Custom URL</span></SelectItem>
          </SelectContent>
        </Select>
      </div>
      {linkType === "category" && (
        <div className="space-y-2">
          <Label>Search Category</Label>
          {linkValue && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <FolderTree className="h-3 w-3 text-muted-foreground" />
              <span>Category ID: {linkValue}</span>
              <Button size="sm" variant="ghost" className="ml-auto h-6 w-6 p-0" onClick={() => onValueChange("")}><X className="h-3 w-3" /></Button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Type to search categories..." value={catQuery} onChange={(e) => setCatQuery(e.target.value)} />
          </div>
          {catLoading && <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Searching...</div>}
          {catResults.length > 0 && (
            <div className="max-h-[150px] space-y-1 overflow-y-auto rounded-lg border p-2">
              {catResults.map((cat) => (
                <button key={cat.id} type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => { onValueChange(String(cat.id)); setCatQuery(""); setCatResults([]); }}>
                  <FolderTree className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="break-words">{cat.name}</span>
                  {cat.parent_name && <span className="ml-auto shrink-0 text-xs text-muted-foreground">in {cat.parent_name}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {linkType === "product" && (
        <div className="space-y-2">
          <Label>Search Product</Label>
          {linkValue && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <Package className="h-3 w-3 text-muted-foreground" />
              <span>Product ID: {linkValue}</span>
              <Button size="sm" variant="ghost" className="ml-auto h-6 w-6 p-0" onClick={() => onValueChange("")}><X className="h-3 w-3" /></Button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Type to search products..." value={prodQuery} onChange={(e) => setProdQuery(e.target.value)} />
          </div>
          {prodLoading && <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Searching...</div>}
          {prodResults.length > 0 && (
            <div className="max-h-[150px] space-y-1 overflow-y-auto rounded-lg border p-2">
              {prodResults.map((p) => (
                <button key={p.id} type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => { onValueChange(String(p.id)); setProdQuery(""); setProdResults([]); }}>
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">
                    {p.main_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={displaySrc(p.main_image)} alt="" className="h-full w-full object-cover" onError={(e) => handleImgError(e, p.main_image)} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Package className="h-3 w-3 text-muted-foreground/50" /></div>
                    )}
                  </div>
                  <span className="break-words text-sm">{p.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {linkType === "url" && (
        <div className="grid gap-2">
          <Label>URL</Label>
          <Input placeholder="https://example.com" value={linkValue} onChange={(e) => onValueChange(e.target.value)} />
        </div>
      )}
    </div>
  );
}

const MEDIA_TYPE_ICONS: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  gif: Play,
  lottie: MonitorPlay,
};

export default function SplashAdsPage() {
  /* ─── State ─── */
  const [ads, setAds] = useState<SplashAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<SplashAd | null>(null);
  const [formData, setFormData] = useState<SplashAdFormData>(EMPTY_FORM);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<SplashAd | null>(null);

  // Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMediaType, setPreviewMediaType] = useState<string>("image");

  // File input refs
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const thumbFileRef = useRef<HTMLInputElement>(null);

  /* ─── Fetch ─── */
  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch("/api/splash-ads");
      const data = await res.json();
      setAds(data.ads || []);
    } catch (err) {
      console.error("Failed to fetch splash ads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  /* ─── File pick handlers (preview only — no upload yet) ─── */
  const handleMediaFilePick = (file: File) => {
    if (formData.pendingPreview) URL.revokeObjectURL(formData.pendingPreview);
    const blobUrl = URL.createObjectURL(file);
    setFormData((f) => ({
      ...f,
      pendingFile: file,
      pendingPreview: blobUrl,
      media_url: "",
    }));
  };

  const handleThumbFilePick = (file: File) => {
    if (formData.pendingThumbPreview) URL.revokeObjectURL(formData.pendingThumbPreview);
    const blobUrl = URL.createObjectURL(file);
    setFormData((f) => ({
      ...f,
      pendingThumbFile: file,
      pendingThumbPreview: blobUrl,
      thumbnail_url: "",
    }));
  };

  /* ─── Upload a file to the remote backend ─── */
  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "splash-ads");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.success && data.file_path) return data.file_path as string;
    console.error("Upload failed:", data.error);
    return null;
  };

  /* ─── Handlers ─── */

  const openCreate = () => {
    setEditingAd(null);
    setFormData({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (ad: SplashAd) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title || "",
      media_type: ad.media_type || "image",
      media_url: ad.media_url || "",
      thumbnail_url: ad.thumbnail_url || "",
      link_type: ad.link_type || "none",
      link_value: ad.link_value || "",
      skip_duration: ad.skip_duration ?? 5,
      total_duration: ad.total_duration ?? 10,
      is_active: ad.is_active,
      start_date: ad.start_date
        ? new Date(ad.start_date).toISOString().slice(0, 16)
        : "",
      end_date: ad.end_date
        ? new Date(ad.end_date).toISOString().slice(0, 16)
        : "",
      pendingFile: null,
      pendingPreview: null,
      pendingThumbFile: null,
      pendingThumbPreview: null,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let mediaUrl = formData.media_url;
      let thumbUrl = formData.thumbnail_url;

      // Upload pending media file if any
      if (formData.pendingFile) {
        setUploading(true);
        const uploaded = await uploadFile(formData.pendingFile);
        setUploading(false);
        if (!uploaded) { setSaving(false); return; }
        mediaUrl = uploaded;
      }

      // Upload pending thumbnail file if any
      if (formData.pendingThumbFile) {
        setUploading(true);
        const uploaded = await uploadFile(formData.pendingThumbFile);
        setUploading(false);
        if (!uploaded) { setSaving(false); return; }
        thumbUrl = uploaded;
      }

      const payload = {
        title: formData.title,
        media_type: formData.media_type,
        media_url: mediaUrl,
        thumbnail_url: thumbUrl,
        link_type: formData.link_type,
        link_value: formData.link_value,
        skip_duration: formData.skip_duration,
        total_duration: formData.total_duration,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      if (editingAd) {
        const res = await fetch(`/api/splash-ads/${editingAd.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("Splash ad updated");
      } else {
        const res = await fetch("/api/splash-ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success("Splash ad created");
      }

      // Revoke blob URLs
      if (formData.pendingPreview) URL.revokeObjectURL(formData.pendingPreview);
      if (formData.pendingThumbPreview) URL.revokeObjectURL(formData.pendingThumbPreview);

      setDialogOpen(false);
      fetchAds();
    } catch (err) {
      toast.error("Failed to save splash ad");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    // Optimistic: remove from UI immediately
    setAds((prev) => prev.filter((a) => a.id !== targetId));
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/splash-ads/${targetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Splash ad deleted");
    } catch (err) {
      toast.error("Failed to delete splash ad");
      fetchAds(); // revert
    }
  };

  const toggleActive = async (ad: SplashAd) => {
    // Optimistic: toggle in UI immediately
    setAds((prev) =>
      prev.map((a) => a.id === ad.id ? { ...a, is_active: !a.is_active } : a)
    );
    try {
      const res = await fetch(`/api/splash-ads/${ad.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !ad.is_active }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(ad.is_active ? "Splash ad deactivated" : "Splash ad activated");
    } catch (err) {
      toast.error("Failed to toggle splash ad");
      fetchAds(); // revert
    }
  };

  /* ─── Helpers ─── */

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isAdScheduled = (ad: SplashAd) => {
    const now = new Date();
    if (ad.start_date && new Date(ad.start_date) > now) return "scheduled";
    if (ad.end_date && new Date(ad.end_date) < now) return "expired";
    return "active";
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
            Splash Screen Ads
          </h1>
          <p className="mt-1 text-muted-foreground">
            Full-screen ads shown when users open the app
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Splash Ad
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900 dark:bg-purple-950/30">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
        <div className="text-sm">
          <p className="font-medium text-purple-900 dark:text-purple-300">
            Splash Ad Format
          </p>
          <p className="mt-1 text-purple-700 dark:text-purple-400/80">
            Full-screen display (<strong>1080×1920px portrait</strong>{" "}
            recommended). Supports <strong>image, video, GIF, and Lottie</strong>{" "}
            formats. Users see a skip button after the configured skip duration.
            Link to a product, category, or custom URL.
          </p>
        </div>
      </div>

      {/* Ads list */}
      {ads.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex h-[400px] flex-col items-center justify-center gap-4 p-8">
            <div className="rounded-full bg-muted p-4">
              <MonitorPlay className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">No splash ads yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create a full-screen splash ad to engage users when they
                open the app.
              </p>
            </div>
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Splash Ad
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {ads.map((ad) => {
            const status = isAdScheduled(ad);
            const MediaIcon = MEDIA_TYPE_ICONS[ad.media_type] || ImageIcon;
            const thumbUrl = resolveImageUrl(ad.thumbnail_url || ad.media_url);

            return (
              <div
                key={ad.id}
                className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-stretch">
                  {/* Thumbnail */}
                  <div
                    className="relative w-[120px] shrink-0 cursor-pointer overflow-hidden bg-muted"
                    style={{ aspectRatio: "9/16" }}
                    onClick={() => {
                      const mediaUrl = resolveImageUrl(ad.media_url);
                      if (mediaUrl) {
                        setPreviewUrl(mediaUrl);
                        setPreviewMediaType(ad.media_type);
                      } else if (thumbUrl) {
                        setPreviewUrl(thumbUrl);
                        setPreviewMediaType("image");
                      }
                    }}
                  >
                    {ad.media_type === "video" && !ad.thumbnail_url ? (
                      <video
                        src={resolveImageUrl(ad.media_url) || ""}
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                        onLoadedData={(e) => {
                          const v = e.currentTarget;
                          v.currentTime = 1;
                        }}
                      />
                    ) : thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl}
                        alt={ad.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                        <MediaIcon className="h-8 w-8 text-muted-foreground/40" />
                        <span className="text-[10px] uppercase text-muted-foreground/60">
                          {ad.media_type}
                        </span>
                      </div>
                    )}
                    {/* Media type badge */}
                    <div className="absolute bottom-2 left-2">
                      <Badge
                        variant="secondary"
                        className="bg-black/60 text-[10px] text-white backdrop-blur"
                      >
                        {ad.media_type}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div className="space-y-2">
                      {/* Title row */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {ad.title || "(Untitled)"}
                        </span>
                        <Badge
                          variant={
                            !ad.is_active
                              ? "outline"
                              : status === "active"
                              ? "success"
                              : status === "scheduled"
                              ? "warning"
                              : "destructive"
                          }
                          className="text-[10px]"
                        >
                          {!ad.is_active
                            ? "Inactive"
                            : status === "active"
                            ? "Active"
                            : status === "scheduled"
                            ? "Scheduled"
                            : "Expired"}
                        </Badge>
                      </div>

                      {/* Timing */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Skip: {ad.skip_duration}s / Total: {ad.total_duration}s
                        </span>
                        {ad.link_type !== "none" && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium capitalize">
                              {ad.link_type}:
                            </span>{" "}
                            {ad.link_value || "—"}
                          </span>
                        )}
                      </div>

                      {/* Schedule */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(ad.start_date)} → {formatDate(ad.end_date)}
                        </span>
                      </div>
                    </div>

                    {/* Analytics */}
                    <div className="mt-3 flex items-center gap-4 border-t pt-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        <span>
                          <strong className="text-foreground">
                            {ad.view_count.toLocaleString()}
                          </strong>{" "}
                          views
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        <span>
                          <strong className="text-foreground">
                            {ad.click_count.toLocaleString()}
                          </strong>{" "}
                          clicks
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <SkipForward className="h-3.5 w-3.5" />
                        <span>
                          <strong className="text-foreground">
                            {ad.skip_count.toLocaleString()}
                          </strong>{" "}
                          skips
                        </span>
                      </div>
                      {ad.view_count > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>
                            <strong className="text-foreground">
                              {((ad.click_count / ad.view_count) * 100).toFixed(
                                1
                              )}
                              %
                            </strong>{" "}
                            CTR
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons – inline instead of dropdown */}
                  <div className="flex flex-col items-center justify-center gap-1.5 p-4">
                    <Button variant="outline" size="sm" className="h-7 w-full gap-1.5 text-xs" onClick={() => openEdit(ad)}>
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-full gap-1.5 text-xs"
                      onClick={() => toggleActive(ad)}
                    >
                      {ad.is_active ? (
                        <><EyeOff className="h-3 w-3" />Deactivate</>
                      ) : (
                        <><Eye className="h-3 w-3" />Activate</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-full gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(ad)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create/Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>
              {editingAd ? "Edit Splash Ad" : "Create Splash Ad"}
            </DialogTitle>
            <DialogDescription>
              Full-screen ad shown on app launch. Recommended: 1080×1920px
              portrait.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="s-title">Title</Label>
              <Input
                id="s-title"
                placeholder="Summer Sale Splash"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            {/* Media type + Upload */}
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <div className="grid gap-2">
                <Label>Media Type</Label>
                <Select
                  value={formData.media_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, media_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="gif">GIF</SelectItem>
                    <SelectItem value="lottie">Lottie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>
                  Media File
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (1080×1920 portrait)
                  </span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Upload or paste URL..."
                    value={formData.media_url}
                    onChange={(e) =>
                      setFormData({ ...formData, media_url: e.target.value })
                    }
                    className="flex-1"
                  />
                  <input
                    ref={mediaFileRef}
                    type="file"
                    accept={
                      formData.media_type === "video"
                        ? "video/mp4"
                        : formData.media_type === "lottie"
                        ? ".json"
                        : "image/*"
                    }
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleMediaFilePick(f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    className="shrink-0 gap-2"
                    onClick={() => mediaFileRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Choose
                  </Button>
                </div>
                {formData.pendingFile && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    File will be uploaded when you save
                  </p>
                )}
              </div>
            </div>

            {/* Phone Mockup Preview — show when any visual media is available */}
            {(() => {
              const hasMedia = formData.pendingPreview || formData.media_url;
              const hasThumb = formData.pendingThumbPreview || formData.thumbnail_url;
              const showPreview = (hasMedia || hasThumb) && formData.media_type !== "lottie";
              if (!showPreview) return null;

              // For video: show thumbnail image in mockup (video can't inline-preview well);
              // for image/gif: show the media itself
              const previewSrc =
                formData.media_type === "video"
                  ? (formData.pendingThumbPreview || resolveImageUrl(formData.thumbnail_url) ||
                     formData.pendingPreview || resolveImageUrl(formData.media_url))
                  : (formData.pendingPreview || resolveImageUrl(formData.media_url));

              return (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Mobile Preview
                  </Label>
                  {/* Portrait phone mockup — 9:16 splash */}
                  <div className="mx-auto w-[200px] overflow-hidden rounded-[22px] border-[3px] border-gray-800 bg-black shadow-xl dark:border-gray-600">
                    {/* Status bar */}
                    <div className="flex items-center justify-between bg-gray-900 px-3 py-0.5">
                      <span className="text-[8px] text-white/70">9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="h-[5px] w-[5px] rounded-full bg-white/60" />
                        <div className="h-[5px] w-[8px] rounded-sm border border-white/60" />
                      </div>
                    </div>
                    {/* Splash ad — 9:16 full screen */}
                    <div className="relative w-full" style={{ aspectRatio: "9/16" }}>
                      {formData.media_type === "video" ? (
                        <video
                          src={formData.pendingPreview || resolveImageUrl(formData.media_url) || ""}
                          muted
                          playsInline
                          autoPlay
                          loop
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={previewSrc}
                          alt="Mobile preview"
                          className="h-full w-full object-cover"
                          onError={(e) =>
                            handleImgError(e, formData.media_url)
                          }
                        />
                      )}
                      {/* Video play icon overlay */}
                      {formData.media_type === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="rounded-full bg-black/40 p-2 backdrop-blur-sm">
                            <Play className="h-5 w-5 text-white" fill="white" />
                          </div>
                        </div>
                      )}
                      {/* Skip button overlay (top-right) */}
                      <div className="absolute right-2 top-3">
                        <div className="rounded-full border border-white/30 bg-black/40 px-2 py-0.5 text-[7px] text-white backdrop-blur-sm">
                          Skip &rsaquo;
                        </div>
                      </div>
                      {/* Progress bar overlay (bottom) */}
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20">
                        <div className="h-full w-1/3 bg-purple-500" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Link type + value — reuses LinkSelector like banners */}
            <LinkSelector
              linkType={formData.link_type}
              linkValue={formData.link_value}
              onTypeChange={(v) =>
                setFormData({ ...formData, link_type: v, link_value: "" })
              }
              onValueChange={(v) =>
                setFormData({ ...formData, link_value: v })
              }
            />

            {/* Timing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="s-skip">Skip Duration (seconds)</Label>
                <Input
                  id="s-skip"
                  type="number"
                  min={0}
                  value={formData.skip_duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      skip_duration: Number(e.target.value),
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Time before skip button appears (default: 5s)
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="s-total">Total Duration (seconds)</Label>
                <Input
                  id="s-total"
                  type="number"
                  min={1}
                  value={formData.total_duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_duration: Number(e.target.value),
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Auto-dismiss after this time (default: 10s)
                </p>
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="s-start">Start Date</Label>
                <Input
                  id="s-start"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="s-end">End Date</Label>
                <Input
                  id="s-end"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Show this ad to users when they open the app
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (formData.pendingPreview) URL.revokeObjectURL(formData.pendingPreview);
                if (formData.pendingThumbPreview) URL.revokeObjectURL(formData.pendingThumbPreview);
                setDialogOpen(false);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                uploading ||
                (!formData.media_url && !formData.pendingFile)
              }
              className="gap-2"
            >
              {(saving || uploading) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {uploading
                ? "Uploading..."
                : saving
                  ? "Saving..."
                  : editingAd
                    ? "Update"
                    : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Splash Ad"
        description={`Are you sure you want to delete "${deleteTarget?.title || "this splash ad"}"? Analytics data will be lost.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* ─── Preview Modal ─── */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
          onClick={() => setPreviewUrl(null)}
        >
          {previewMediaType === "video" ? (
            <video
              src={previewUrl}
              controls
              autoPlay
              muted
              playsInline
              className="max-h-[80vh] max-w-full rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Splash ad preview"
              className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          )}
        </div>
      )}
    </div>
  );
}
