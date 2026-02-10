"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  FolderTree,
  FolderOpen,
  Package,
  ImageOff,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { SearchInput } from "@/components/shared/search-input";
import { resolveImageUrl } from "@/lib/image-url";

interface TreeCategory {
  id: number;
  category_name: string;
  category_name_en: string | null;
  parent: number | null;
  level: number | null;
  has_children: boolean | null;
  main_image: string | null;
  product_count: number;
  display: boolean;
  order_number: number | null;
}

interface CategoryTreeProps {
  categories: TreeCategory[];
  onReorder: (
    categoryId: number,
    newParentId: number | null,
    newOrder: number
  ) => Promise<void>;
}

/* ────────── Sortable Row ────────── */

function SortableTreeRow({
  category,
  depth,
  isExpanded,
  hasChildren,
  onToggle,
}: {
  category: TreeCategory;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const name = category.category_name_en || category.category_name;
  const imageUrl = resolveImageUrl(category.main_image);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 border-b px-3 py-2 hover:bg-muted/30 transition-colors"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Indent + expand toggle */}
      <div style={{ width: depth * 24 }} className="shrink-0" />
      {hasChildren ? (
        <button
          onClick={onToggle}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : (
        <div className="w-5 shrink-0" />
      )}

      {/* Icon */}
      {hasChildren ? (
        isExpanded ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
        ) : (
          <FolderTree className="h-4 w-4 shrink-0 text-amber-500" />
        )
      ) : (
        <div className="h-4 w-4 shrink-0" />
      )}

      {/* Image thumbnail */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-8 w-8 rounded object-cover shrink-0 border"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded bg-muted shrink-0">
          <ImageOff className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>
      )}

      {/* Name */}
      <Link
        href={`/dashboard/categories/${category.id}`}
        className="flex-1 truncate font-medium text-sm hover:underline"
      >
        {name}
      </Link>

      {/* Product count */}
      <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Package className="h-3 w-3" />
        {category.product_count.toLocaleString()}
      </span>
    </div>
  );
}

/* ────────── Overlay (while dragging) ────────── */

function DragOverlayContent({ category }: { category: TreeCategory }) {
  const name = category.category_name_en || category.category_name;
  const imageUrl = resolveImageUrl(category.main_image);
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-3 shadow-lg">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-8 w-8 rounded object-cover border"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
          <ImageOff className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>
      )}
      <span className="font-medium text-sm">{name}</span>
    </div>
  );
}

/* ────────── Main Tree ────────── */

export function CategoryTree({ categories, onReorder }: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Local categories for optimistic updates — reset whenever server data arrives
  const [localCategories, setLocalCategories] =
    useState<TreeCategory[]>(categories);
  const prevCategoriesRef = useRef(categories);
  if (prevCategoriesRef.current !== categories) {
    prevCategoriesRef.current = categories;
    setLocalCategories(categories);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Build parent→children map
  const childrenMap = useMemo(() => {
    const map = new Map<number | null, TreeCategory[]>();
    for (const c of localCategories) {
      // Treat parent=0 and parent=null both as root
      const parentKey = c.parent === 0 ? null : (c.parent ?? null);
      const arr = map.get(parentKey) || [];
      arr.push(c);
      map.set(parentKey, arr);
    }
    // Sort by order_number
    for (const [, arr] of map) {
      arr.sort(
        (a, b) => (a.order_number ?? 9999) - (b.order_number ?? 9999)
      );
    }
    return map;
  }, [localCategories]);

  const categoriesById = useMemo(
    () => new Map(localCategories.map((c) => [c.id, c])),
    [localCategories]
  );

  // Flatten visible tree into ordered list
  const flatTree = useMemo(() => {
    const result: { category: TreeCategory; depth: number }[] = [];
    const searchLower = search.toLowerCase();

    const matchesSearch = (c: TreeCategory) => {
      if (!search) return true;
      const name = (
        c.category_name_en ||
        c.category_name
      ).toLowerCase();
      return name.includes(searchLower);
    };

    // If searching, show flat list of matches
    if (search) {
      for (const c of localCategories) {
        if (matchesSearch(c)) {
          result.push({ category: c, depth: 0 });
        }
      }
      return result;
    }

    // DFS from roots
    const walk = (parentId: number | null, depth: number) => {
      const children = childrenMap.get(parentId) || [];
      for (const child of children) {
        result.push({ category: child, depth });
        if (expandedIds.has(child.id)) {
          walk(child.id, depth + 1);
        }
      }
    };
    walk(null, 0);
    return result;
  }, [localCategories, childrenMap, expandedIds, search]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const draggedId = active.id as number;
    const overId = over.id as number;
    const draggedCat = categoriesById.get(draggedId);
    const overCat = categoriesById.get(overId);
    if (!draggedCat || !overCat) return;

    // Normalize parent: treat 0 and null both as null (root)
    const normParent = (p: number | null) =>
      p === 0 || p == null ? null : p;
    const sameParent =
      normParent(draggedCat.parent) === normParent(overCat.parent);

    if (sameParent) {
      // Sibling reorder: place dragged at the target's position.
      const newOrder = overCat.order_number ?? 0;
      const parentForApi = normParent(draggedCat.parent);

      // Optimistic: reorder siblings locally
      const parentKey = parentForApi;
      const siblings = (childrenMap.get(parentKey) || []).filter(
        (c) => c.id !== draggedId
      );
      // Insert dragged at the target's index
      const targetIdx = siblings.findIndex((c) => c.id === overId);
      const insertAt = targetIdx >= 0 ? targetIdx : siblings.length;
      siblings.splice(insertAt, 0, draggedCat);
      // Reassign sequential order_numbers
      const updates = new Map<number, number>();
      siblings.forEach((c, i) => updates.set(c.id, i + 1));
      setLocalCategories((prev) =>
        prev.map((c) => {
          const newOrd = updates.get(c.id);
          return newOrd == null ? c : { ...c, order_number: newOrd };
        })
      );

      setSaving(true);
      try {
        await onReorder(draggedId, parentForApi, newOrder);
      } finally {
        setSaving(false);
      }
    } else {
      // Reparent: move dragged under over category
      // Optimistic: update parent and order locally
      setLocalCategories((prev) =>
        prev.map((c) =>
          c.id === draggedId
            ? { ...c, parent: overId, order_number: 0 }
            : c
        )
      );

      setSaving(true);
      try {
        await onReorder(draggedId, overId, 0);
      } finally {
        setSaving(false);
      }
    }
  };

  const activeCategory = activeId ? categoriesById.get(activeId) : null;

  const expandAll = () => {
    setExpandedIds(
      new Set(
        localCategories
          .filter(
            (c) =>
              c.has_children || childrenMap.has(c.id)
          )
          .map((c) => c.id)
      )
    );
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-2">
        <div className="w-64">
          <SearchInput
            defaultValue={search}
            onSearch={setSearch}
            placeholder="Search tree..."
          />
        </div>
        <button
          onClick={expandAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Collapse All
        </button>
        {saving && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </div>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          Drag a category onto another to reparent it
        </span>
      </div>

      {/* Tree body */}
      <div
        className="overflow-auto"
        style={{ height: "calc(100vh - 320px)", minHeight: "400px" }}
      >
        {flatTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderTree className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No categories found</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={flatTree.map((item) => item.category.id)}
              strategy={verticalListSortingStrategy}
            >
              {flatTree.map((item) => (
                <SortableTreeRow
                  key={item.category.id}
                  category={item.category}
                  depth={item.depth}
                  isExpanded={expandedIds.has(item.category.id)}
                  hasChildren={
                    !!item.category.has_children ||
                    (childrenMap.get(item.category.id)?.length ?? 0) > 0
                  }
                  onToggle={() => toggleExpand(item.category.id)}
                />
              ))}
            </SortableContext>

            <DragOverlay>
              {activeCategory && (
                <DragOverlayContent category={activeCategory} />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
