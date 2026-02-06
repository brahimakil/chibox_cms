'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronRight, ChevronDown, Eye, Pencil, Trash2, Folder, FolderOpen, Search, X, MoreHorizontal, ChevronsUpDown, ChevronsDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface CategoryData {
  id: number
  categoryName: string
  slug: string
  parent: number | null
  type: number
  productCount: number
  showInNavbar: number
  display: number
  orderNumber: number | null
  children?: CategoryData[]
  [key: string]: unknown
}

interface CategoryTreeProps {
  categories: CategoryData[]
  onView?: (category: CategoryData) => void
  onEdit?: (category: CategoryData) => void
  onDelete?: (category: CategoryData) => void
  expandedIds?: Set<number>
  onExpandedChange?: (expandedIds: Set<number>) => void
}

// Flattened node for virtualization
interface FlatNode {
  category: CategoryData
  level: number
  hasChildren: boolean
}

export function CategoryTree({
  categories,
  onView,
  onEdit,
  onDelete,
  expandedIds: controlledExpandedIds,
  onExpandedChange,
}: CategoryTreeProps) {
  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState<string>("")
  const parentRef = useRef<HTMLDivElement>(null)
  
  const expandedIds = controlledExpandedIds ?? internalExpandedIds
  const setExpandedIds = useCallback((ids: Set<number>) => {
    if (onExpandedChange) {
      onExpandedChange(ids)
    } else {
      setInternalExpandedIds(ids)
    }
  }, [onExpandedChange])

  // Build tree structure from flat list
  const tree = useMemo(() => {
    const categoryMap = new Map<number, CategoryData>()
    const rootCategories: CategoryData[] = []

    // First pass: create map of all categories
    categories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] })
    })

    // Second pass: build tree structure
    categories.forEach((cat) => {
      const category = categoryMap.get(cat.id)!
      if (cat.parent === null || cat.parent === 0) {
        rootCategories.push(category)
      } else {
        const parent = categoryMap.get(cat.parent)
        if (parent) {
          if (!parent.children) {
            parent.children = []
          }
          parent.children.push(category)
        } else {
          rootCategories.push(category)
        }
      }
    })

    // Sort categories by orderNumber if available, otherwise by name
    const sortCategories = (cats: CategoryData[]): CategoryData[] => {
      return cats
        .sort((a, b) => {
          if (a.orderNumber !== null && b.orderNumber !== null) {
            return a.orderNumber - b.orderNumber
          }
          if (a.orderNumber !== null) return -1
          if (b.orderNumber !== null) return 1
          return a.categoryName.localeCompare(b.categoryName)
        })
        .map((cat) => ({
          ...cat,
          children: cat.children ? sortCategories(cat.children) : [],
        }))
    }

    return sortCategories(rootCategories)
  }, [categories])

  // Filter categories based on search term
  const filterCategories = useCallback((categories: CategoryData[], term: string): CategoryData[] => {
    if (!term) return categories
    
    return categories.filter(category => {
      const matchesName = category.categoryName.toLowerCase().includes(term.toLowerCase())
      const hasMatchingChildren = category.children && 
        filterCategories(category.children, term).length > 0
      return matchesName || hasMatchingChildren
    }).map(category => ({
      ...category,
      children: category.children ? filterCategories(category.children, term) : []
    }))
  }, [])

  const filteredTree = useMemo(() => filterCategories(tree, searchTerm), [tree, searchTerm, filterCategories])

  // Flatten the tree for virtualization - only include visible nodes
  const flattenedNodes = useMemo(() => {
    const result: FlatNode[] = []
    
    const flatten = (categories: CategoryData[], level: number) => {
      categories.forEach(category => {
        const hasChildren = !!(category.children && category.children.length > 0)
        result.push({ category, level, hasChildren })
        
        // Only include children if this node is expanded
        if (hasChildren && expandedIds.has(category.id)) {
          flatten(category.children!, level + 1)
        }
      })
    }
    
    flatten(filteredTree, 0)
    return result
  }, [filteredTree, expandedIds])

  // Virtualizer setup
  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44, // Estimated row height
    overscan: 10, // Render 10 extra items above/below viewport
  })

  const handleToggleExpand = useCallback((id: number) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }, [expandedIds, setExpandedIds])

  // Helper to get all category IDs with children recursively
  const getAllParentIds = useCallback((categories: CategoryData[]): number[] => {
    let ids: number[] = []
    categories.forEach(category => {
      if (category.children && category.children.length > 0) {
        ids.push(category.id)
        ids = ids.concat(getAllParentIds(category.children))
      }
    })
    return ids
  }, [])

  // Expand all categories
  const handleExpandAll = useCallback(() => {
    const allParentIds = getAllParentIds(tree)
    setExpandedIds(new Set(allParentIds))
  }, [tree, getAllParentIds, setExpandedIds])

  // Collapse all categories
  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [setExpandedIds])

  if (tree.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-linear-to-br from-blue-500 to-cyan-600 text-white shadow-sm">
              <Folder className="w-5 h-5" />
            </div>
            Categories Tree
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>No categories available</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <div className="p-2 rounded-lg bg-linear-to-br from-blue-500 to-cyan-600 text-white shadow-sm">
            <Folder className="w-5 h-5" />
          </div>
          Categories Tree
        </h1>
      </div>

      {/* Search and Controls */}
      <div className="mb-6 space-y-4 shrink-0">
        {/* Search input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search categories..."
            className="block w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
            </button>
          )}
        </div>

        {/* Expand/Collapse Controls */}
        <div className="flex gap-2">
          <button
            onClick={handleExpandAll}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
          >
            <ChevronsDown className="w-4 h-4" />
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronsUpDown className="w-4 h-4" />
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree Content - Virtualized */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-auto min-h-0"
      >
        {flattenedNodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>No categories found</p>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const { category, level, hasChildren } = flattenedNodes[virtualRow.index]
              const isExpanded = expandedIds.has(category.id)

              return (
                <div
                  key={category.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-linear-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-950 dark:hover:to-cyan-950 hover:shadow-sm",
                      level > 0 && "ml-6",
                    )}
                    style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
                    onClick={() => hasChildren && handleToggleExpand(category.id)}
                  >
                    {hasChildren && (
                      <div className="p-0.5 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                    )}

                    {!hasChildren && level > 0 && (
                      <div className="w-5 flex justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-300 dark:bg-blue-600" />
                      </div>
                    )}

                    {level === 0 && (
                      <div className="p-1.5 rounded-lg bg-linear-to-br from-blue-500 to-cyan-600 text-white shadow-sm">
                        {hasChildren ? (
                          isExpanded ? (
                            <FolderOpen className="w-4 h-4" />
                          ) : (
                            <Folder className="w-4 h-4" />
                          )
                        ) : (
                          <Folder className="w-4 h-4" />
                        )}
                      </div>
                    )}

                    <span className="flex-1 font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-800 dark:group-hover:text-blue-400">
                      {category.categoryName}
                    </span>

                    {category.productCount > 0 && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                        {category.productCount}
                      </span>
                    )}

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900"
                        >
                          <MoreHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onView && (
                          <DropdownMenuItem onClick={() => onView(category)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(category)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={() => onDelete(category)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
