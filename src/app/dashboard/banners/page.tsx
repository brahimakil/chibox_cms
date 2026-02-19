"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  ImageIcon,
  Loader2,
  Pencil,
  Trash2,
  Info,
  Eye,
  Upload,
  Search,
  Link,
  FolderTree,
  Package,
  Globe,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { resolveImageUrl } from "@/lib/image-url";
import { toast } from "sonner";

/* ─── Types ─── */

interface GridElement {
  id: number;
  r_grid_id: number;
  position_x: string | null;
  position_y: string | null;
  width: string | null;
  height: string | null;
  main_image: string | null;
  actions: Record<string, string> | null;
}

interface GridFormData {
  main_image: string;
  link_type: "none" | "category" | "product" | "url";
  link_value: string;
  /** File picked by the admin — not yet uploaded */
  pendingFile?: File | null;
  /** Blob URL for instant local preview */
  pendingPreview?: string | null;
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

const EMPTY_GRID_FORM: GridFormData = {
  main_image: "",
  link_type: "none",
  link_value: "",
  pendingFile: null,
  pendingPreview: null,
};

const RECOMMENDED_WIDTH = 800;
const RECOMMENDED_HEIGHT = 220;

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
   LinkSelector — Standalone component (extracted to avoid
   focus-loss caused by inline component re-creation).
   Search state is local to this component.
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

  /* Category search */
  useEffect(() => {
    if (catQuery.length < 2) {
      setCatResults([]);
      return;
    }
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
        // Build a quick id→name map for parent labels
        const nameMap = new Map<number, string>();
        for (const c of cats) {
          nameMap.set(c.id, c.category_name_en || c.category_name || "");
        }
        setCatResults(
          matched.slice(0, 20).map((c: any) => ({
            id: c.id,
            name: c.category_name_en || c.category_name || `#${c.id}`,
            parent_name: c.parent ? nameMap.get(c.parent) || null : null,
          }))
        );
      } catch {
        setCatResults([]);
      } finally {
        setCatLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [catQuery]);

  /* Product search */
  useEffect(() => {
    if (prodQuery.length < 2) {
      setProdResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setProdLoading(true);
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(prodQuery)}&limit=15`
        );
        const data = await res.json();
        setProdResults(
          (data.products || []).map((p: any) => ({
            id: p.id,
            title:
              p.display_name || p.product_name || p.title || `#${p.id}`,
            main_image: p.main_image,
          }))
        );
      } catch {
        setProdResults([]);
      } finally {
        setProdLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [prodQuery]);

  /* Reset search when link type changes */
  useEffect(() => {
    setCatQuery("");
    setCatResults([]);
    setProdQuery("");
    setProdResults([]);
  }, [linkType]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label>When clicked, go to</Label>
        <Select value={linkType} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="flex items-center gap-2">
                <X className="h-3 w-3" /> No link
              </span>
            </SelectItem>
            <SelectItem value="category">
              <span className="flex items-center gap-2">
                <FolderTree className="h-3 w-3" /> Category
              </span>
            </SelectItem>
            <SelectItem value="product">
              <span className="flex items-center gap-2">
                <Package className="h-3 w-3" /> Product
              </span>
            </SelectItem>
            <SelectItem value="url">
              <span className="flex items-center gap-2">
                <Globe className="h-3 w-3" /> Custom URL
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── Category picker ─── */}
      {linkType === "category" && (
        <div className="space-y-2">
          <Label>Search Category</Label>
          {linkValue && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <FolderTree className="h-3 w-3 text-muted-foreground" />
              <span>Category ID: {linkValue}</span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-6 w-6 p-0"
                onClick={() => onValueChange("")}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Type to search categories..."
              value={catQuery}
              onChange={(e) => setCatQuery(e.target.value)}
            />
          </div>
          {catLoading && (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching...
            </div>
          )}
          {catResults.length > 0 && (
            <div className="max-h-[150px] space-y-1 overflow-y-auto rounded-lg border p-2">
              {catResults.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => {
                    onValueChange(String(cat.id));
                    setCatQuery("");
                    setCatResults([]);
                  }}
                >
                  <FolderTree className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="break-words">{cat.name}</span>
                  {cat.parent_name && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      in {cat.parent_name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Product picker ─── */}
      {linkType === "product" && (
        <div className="space-y-2">
          <Label>Search Product</Label>
          {linkValue && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <Package className="h-3 w-3 text-muted-foreground" />
              <span>Product ID: {linkValue}</span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-6 w-6 p-0"
                onClick={() => onValueChange("")}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Type to search products..."
              value={prodQuery}
              onChange={(e) => setProdQuery(e.target.value)}
            />
          </div>
          {prodLoading && (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching...
            </div>
          )}
          {prodResults.length > 0 && (
            <div className="max-h-[150px] space-y-1 overflow-y-auto rounded-lg border p-2">
              {prodResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => {
                    onValueChange(String(p.id));
                    setProdQuery("");
                    setProdResults([]);
                  }}
                >
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">
                    {p.main_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={displaySrc(p.main_image)}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => handleImgError(e, p.main_image)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <span className="break-words text-sm">{p.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── URL input ─── */}
      {linkType === "url" && (
        <div className="grid gap-2">
          <Label>URL</Label>
          <Input
            placeholder="https://example.com"
            value={linkValue}
            onChange={(e) => onValueChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   BannersPage
   ════════════════════════════════════════════════════════════ */

export default function BannersPage() {
  /* ─── State ─── */
  const [gridElements, setGridElements] = useState<GridElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Grid element dialog
  const [gridDialogOpen, setGridDialogOpen] = useState(false);
  const [editingGrid, setEditingGrid] = useState<GridElement | null>(null);
  const [gridForm, setGridForm] = useState<GridFormData>(EMPTY_GRID_FORM);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "grid";
    id: number;
    name: string;
  } | null>(null);

  // Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // File input ref
  const gridFileRef = useRef<HTMLInputElement>(null);

  /* ─── Fetch data ─── */
  const fetchBanners = useCallback(async () => {
    try {
      const res = await fetch("/api/banners");
      const data = await res.json();
      const allElements: GridElement[] = [];
      (data.grids || []).forEach((g: { elements: GridElement[] }) => {
        allElements.push(...(g.elements || []));
      });
      setGridElements(allElements);
    } catch (err) {
      console.error("Failed to fetch banners:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  /* ─── Parse actions from grid element ─── */
  const parseActions = (
    actions: Record<string, string> | null
  ): { type: "none" | "category" | "product" | "url"; value: string } => {
    if (!actions || Object.keys(actions).length === 0)
      return { type: "none", value: "" };
    if (actions.type === "category" && actions.id)
      return { type: "category", value: String(actions.id) };
    if (actions.type === "product" && actions.id)
      return { type: "product", value: String(actions.id) };
    if (actions.type === "url" && actions.url)
      return { type: "url", value: actions.url };
    if (actions.category_id)
      return { type: "category", value: actions.category_id };
    if (actions.product_id)
      return { type: "product", value: actions.product_id };
    return { type: "none", value: "" };
  };

  /* ─── Build actions JSON ─── */
  const buildActions = (
    linkType: string,
    linkValue: string
  ): Record<string, string> | null => {
    if (linkType === "none" || !linkValue) return null;
    if (linkType === "category") return { type: "category", id: linkValue };
    if (linkType === "product") return { type: "product", id: linkValue };
    if (linkType === "url") return { type: "url", url: linkValue };
    return null;
  };

  /* ─── File pick handler (preview only — no upload yet) ─── */
  const handleFilePick = (file: File) => {
    // Revoke old blob URL if any
    if (gridForm.pendingPreview) URL.revokeObjectURL(gridForm.pendingPreview);
    const blobUrl = URL.createObjectURL(file);
    setGridForm((f) => ({
      ...f,
      pendingFile: file,
      pendingPreview: blobUrl,
      // Clear existing main_image so we know to upload on save
      main_image: "",
    }));
  };

  /* ─── Actually upload a file to the remote backend ─── */
  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "grid-elements");

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.success && data.file_path) return data.file_path as string;
    console.error("Upload failed:", data.error);
    return null;
  };

  /* ─── Grid Element CRUD ─── */
  const openCreateGrid = () => {
    setEditingGrid(null);
    setGridForm({ ...EMPTY_GRID_FORM });
    setGridDialogOpen(true);
  };

  const openEditGrid = (el: GridElement) => {
    setEditingGrid(el);
    const parsed = parseActions(el.actions);
    setGridForm({
      main_image: el.main_image || "",
      link_type: parsed.type,
      link_value: parsed.value,
      pendingFile: null,
      pendingPreview: null,
    });
    setGridDialogOpen(true);
  };

  const saveGrid = async () => {
    setSaving(true);
    try {
      let imagePath = gridForm.main_image;

      // If there's a pending file, upload it now
      if (gridForm.pendingFile) {
        setUploading(true);
        const uploaded = await uploadFile(gridForm.pendingFile);
        setUploading(false);
        if (!uploaded) {
          setSaving(false);
          return; // upload failed, don't save
        }
        imagePath = uploaded;
      }

      const payload = {
        main_image: imagePath || null,
        actions: buildActions(gridForm.link_type, gridForm.link_value),
      };

      if (editingGrid) {
        const res = await fetch(`/api/grid-elements/${editingGrid.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("Banner updated");
      } else {
        const res = await fetch("/api/grid-elements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success("Banner created");
      }

      // Revoke blob URL
      if (gridForm.pendingPreview)
        URL.revokeObjectURL(gridForm.pendingPreview);

      setGridDialogOpen(false);
      fetchBanners();
    } catch (err) {
      toast.error("Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Delete ─── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    // Optimistic: remove from UI immediately
    setGridElements((prev) => prev.filter((g) => g.id !== targetId));
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/grid-elements/${targetId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Banner deleted");
    } catch (err) {
      toast.error("Failed to delete banner");
      fetchBanners(); // revert
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Banners
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage app home screen banners and carousel slides
        </p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="space-y-2 text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-300">
            How Banners Work
          </p>
          <p className="text-blue-700 dark:text-blue-400/80">
            <strong>Banner Carousel</strong> — The main banners at the top of
            the home screen. Users swipe through them. Each can link to a
            category, product, or URL.
          </p>
          <p className="text-blue-700 dark:text-blue-400/80">
            Recommended size:{" "}
            <strong>
              {RECOMMENDED_WIDTH}&times;{RECOMMENDED_HEIGHT}px
            </strong>{" "}
            ({(RECOMMENDED_WIDTH / RECOMMENDED_HEIGHT).toFixed(1)}:1 ratio).
          </p>
        </div>
      </div>

      {/* ═══ Banner Carousel (Grid Elements) ═══ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Banner Carousel{" "}
            <Badge variant="secondary" className="ml-2">
              {gridElements.length}
            </Badge>
          </h2>
          <Button onClick={openCreateGrid} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Banner
          </Button>
        </div>

        {gridElements.length === 0 ? (
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex h-[250px] flex-col items-center justify-center gap-4 p-8">
              <div className="rounded-full bg-muted p-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">No banners yet</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Add banners to the home screen carousel. Users swipe through
                  these.
                </p>
              </div>
              <Button
                onClick={openCreateGrid}
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Banner
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {gridElements.map((el) => {
              const parsed = parseActions(el.actions);
              return (
                <div
                  key={el.id}
                  className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-stretch">
                    <div
                      className="relative w-[260px] shrink-0 cursor-pointer overflow-hidden bg-muted"
                      style={{
                        aspectRatio: `${RECOMMENDED_WIDTH}/${RECOMMENDED_HEIGHT}`,
                      }}
                      onClick={() =>
                        el.main_image &&
                        setPreviewImage(el.main_image)
                      }
                    >
                      {el.main_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displaySrc(el.main_image)}
                          alt="Banner"
                          className="h-full w-full object-cover"
                          onError={(e) => handleImgError(e, el.main_image)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                        <Eye className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-center gap-2 p-4">
                      <span className="text-sm font-semibold">
                        Banner #{el.id}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link className="h-3 w-3" />
                        {parsed.type === "none" && "No link set"}
                        {parsed.type === "category" && (
                          <Badge variant="outline" className="text-xs">
                            <FolderTree className="mr-1 h-3 w-3" />
                            Category #{parsed.value}
                          </Badge>
                        )}
                        {parsed.type === "product" && (
                          <Badge variant="outline" className="text-xs">
                            <Package className="mr-1 h-3 w-3" />
                            Product #{parsed.value}
                          </Badge>
                        )}
                        {parsed.type === "url" && (
                          <span className="truncate">{parsed.value}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pr-4">
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => openEditGrid(el)}>
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          setDeleteTarget({
                            type: "grid",
                            id: el.id,
                            name: `Banner #${el.id}`,
                          })
                        }
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
      </div>

      {/* ═══ Grid Element Dialog ═══ */}
      <Dialog open={gridDialogOpen} onOpenChange={setGridDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingGrid ? "Edit Banner" : "Add Banner"}
            </DialogTitle>
            <DialogDescription>
              {editingGrid
                ? "Update this carousel banner."
                : `Upload an image (${RECOMMENDED_WIDTH}\u00D7${RECOMMENDED_HEIGHT}px) and optionally link to a category or product.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>
                Banner Image
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({RECOMMENDED_WIDTH}&times;{RECOMMENDED_HEIGHT}px)
                </span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Upload or paste image URL..."
                  value={gridForm.main_image}
                  onChange={(e) =>
                    setGridForm({ ...gridForm, main_image: e.target.value })
                  }
                  className="flex-1"
                />
                <input
                  ref={gridFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFilePick(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  className="shrink-0 gap-2"
                  onClick={() => gridFileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Choose
                </Button>
              </div>
              {(gridForm.pendingPreview || gridForm.main_image) && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Mobile Preview
                  </Label>
                  {/* Phone mockup — matches Flutter: 110px header + 220px banner */}
                  <div className="mx-auto w-[280px] overflow-hidden rounded-[28px] border-[3px] border-gray-800 bg-black shadow-xl dark:border-gray-600">
                    {/* Status bar */}
                    <div className="flex items-center justify-between bg-gray-900 px-4 py-1">
                      <span className="text-[9px] text-white/70">9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="h-[6px] w-[6px] rounded-full bg-white/60" />
                        <div className="h-[6px] w-[10px] rounded-sm border border-white/60" />
                      </div>
                    </div>
                    {/* Search / header area — mimic 110px at ~0.7 scale */}
                    <div className="bg-white px-3 pb-2 pt-1 dark:bg-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="h-6 flex-1 rounded-full bg-gray-100 px-3 dark:bg-gray-800">
                          <span className="text-[8px] leading-6 text-gray-400">
                            Search products...
                          </span>
                        </div>
                        <div className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800" />
                      </div>
                      {/* Category pills */}
                      <div className="mt-1.5 flex gap-1 overflow-hidden">
                        {["All", "Fashion", "Electronics", "Home"].map(
                          (c) => (
                            <div
                              key={c}
                              className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[7px] text-gray-500 dark:bg-gray-800"
                            >
                              {c}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    {/* Banner image — height ≈ 220/800 aspect of full width, ~77px at 280px width */}
                    <div className="relative w-full" style={{ aspectRatio: "800/220" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          gridForm.pendingPreview ||
                          displaySrc(gridForm.main_image)
                        }
                        alt="Mobile preview"
                        className="h-full w-full object-cover"
                        onError={(e) =>
                          handleImgError(e, gridForm.main_image)
                        }
                      />
                      {/* Dots indicator overlay */}
                      <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
                        <div className="h-[4px] w-[10px] rounded-full bg-white" />
                        <div className="h-[4px] w-[4px] rounded-full bg-white/50" />
                        <div className="h-[4px] w-[4px] rounded-full bg-white/50" />
                      </div>
                    </div>
                    {/* Bottom section placeholder */}
                    <div className="space-y-2 bg-white px-3 py-2 dark:bg-gray-900">
                      <div className="flex gap-2">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
                        <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
                        <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
                        <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
                      </div>
                      <div className="h-2 w-20 rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                  </div>
                  {gridForm.pendingFile && (
                    <p className="text-center text-xs text-amber-600 dark:text-amber-400">
                      Image will be uploaded when you save
                    </p>
                  )}
                </div>
              )}
            </div>

            <LinkSelector
              linkType={gridForm.link_type}
              linkValue={gridForm.link_value}
              onTypeChange={(v) =>
                setGridForm({
                  ...gridForm,
                  link_type: v as GridFormData["link_type"],
                  link_value: "",
                })
              }
              onValueChange={(v) =>
                setGridForm({ ...gridForm, link_value: v })
              }
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (gridForm.pendingPreview)
                  URL.revokeObjectURL(gridForm.pendingPreview);
                setGridDialogOpen(false);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={saveGrid}
              disabled={
                saving ||
                uploading ||
                (!gridForm.main_image && !gridForm.pendingFile)
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
                  : editingGrid
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
        title="Delete Banner"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* ─── Image Preview Modal ─── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
          onClick={() => setPreviewImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc(previewImage)}
            alt="Banner preview"
            className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
            onError={(e) => handleImgError(e, previewImage)}
          />
        </div>
      )}
    </div>
  );
}
