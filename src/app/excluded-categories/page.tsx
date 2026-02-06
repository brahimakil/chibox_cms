"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Ban,
  Plus,
  Trash2,
  Store,
  Box,
  ShieldOff,
  AlertCircle,
  TrendingDown,
  // ArrowLeft,
  RefreshCw,
  Layers,
  Package,
  Calendar,
  ChevronRight,
  ChevronDown,
  Loader2,
  Check,
  Minus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
// import Link from "next/link"

interface ExcludedCategory {
  id: number
  category_id: number
  category_name: string
  category_name_zh: string
  category_name_en: string
  level: number
  parent_hierarchy: Array<{ id: number; name: string }>
  is_parent: boolean
  scope_impact: "all_children" | "specific_only"
  children_excluded_count: number
  reason: string
  excluded_by: string
  excluded_date: string
  updated_at: string
}

// interface CategoryOption {
//   id: number
//   name: string
//   level: number
//   fullPath: string
//   indentLevel: number
//   source_category_id: number
//   child_categories: number
//   category_name_en: string
//   has_children: boolean
//   product_count?: number
// }

interface ExcludedStats {
  total_excluded: number
  parent_categories_count: number
  specific_only_count: number
}

export default function ExcludedCategoriesPage() {
  const [excludedCategories, setExcludedCategories] = useState<ExcludedCategory[]>([])
  const [availableCategories, setAvailableCategories] = useState<any[]>([])
  const [stats, setStats] = useState<ExcludedStats>({
    total_excluded: 0,
    parent_categories_count: 0,
    specific_only_count: 0,
  })
  const [showAddForm, setShowAddForm] = useState(false)
  // const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [loadingAvailable, setLoadingAvailable] = useState(false)
  // const [hoveredCategoryId, setHoveredCategoryId] = useState<number | null>(null)
  // const [hoveredL2CategoryId, setHoveredL2CategoryId] = useState<number | null>(null)
  // const [subcategories, setSubcategories] = useState<any[]>([])
  // const [l3Subcategories, setL3Subcategories] = useState<any[]>([])
  // const [loadingSubcategories, setLoadingSubcategories] = useState(false)
  // const [loadingL3Subcategories, setLoadingL3Subcategories] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  const [categoryChildren, setCategoryChildren] = useState<Record<number, any[]>>({})
  const [loadingChildren, setLoadingChildren] = useState<Set<number>>(new Set())
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set())
  const [isAddingExclusion, setIsAddingExclusion] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchStats()
    fetchExcludedCategories()
    fetchAvailableCategories()
  }, [])

  const fetchExcludedCategories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/excluded-list")
      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        setExcludedCategories(data.data)
      } else if (data.success && data.data) {
        // Single item response
        setExcludedCategories([data.data])
      } else {
        setExcludedCategories([])
      }
    } catch (error) {
      console.error("Error fetching excluded categories:", error)
      toast({
        title: "Error",
        description: "Failed to load excluded categories",
        variant: "destructive",
      })
      setExcludedCategories([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableCategories = async () => {
    setLoadingAvailable(true)
    try {
      const response = await fetch("/api/available-categories")
      const result = await response.json()

      if (result.success) {
        setAvailableCategories(result.categories || [])
      }
    } catch (error) {
      console.error("Error fetching available categories:", error)
      toast({
        title: "Error",
        description: "Failed to load available categories",
        variant: "destructive",
      })
    } finally {
      setLoadingAvailable(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/excluded-stats")
      const data = await response.json()
      if (data.success && data.stats) {
        setStats({
          total_excluded: data.stats.total_excluded || 0,
          parent_categories_count: data.stats.parent_categories || 0,
          specific_only_count: data.stats.specific_only || 0,
        })
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const handleRemoveExclusion = async (categoryId: string) => {
    try {
      toast({
        title: "Removing Exclusion",
        description: "Removing category from excluded list...",
      })

      const formData = new FormData()
      formData.append("category_id", categoryId)

      const response = await fetch("https://cms2.devback.website/v2_0_0-excluded-categories/remove", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to remove exclusion")
      }

      // Refresh the excluded categories list
      await fetchExcludedCategories()

      // Refresh stats
      await fetchStats()

      toast({
        title: "Exclusion Removed",
        description: result.message || "Category has been restored to active status",
      })
    } catch (error) {
      console.error("[v0] Error removing exclusion:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove exclusion",
        variant: "destructive",
      })
    }
  }

  // Helper function to build category tree map for parent-child relationships
  // const buildCategoryTreeMap = (categories: any[]): Map<number, number[]> => {
  //   const treeMap = new Map<number, number[]>()

  //   const processCategory = (category: any, parentId?: number) => {
  //     if (parentId) {
  //       const children = treeMap.get(parentId) || []
  //       children.push(category.id)
  //       treeMap.set(parentId, children)
  //     }

  //     if (category.children) {
  //       category.children.forEach((child: any) => processCategory(child, category.id))
  //     }
  //   }

  //   categories.forEach((cat) => processCategory(cat))
  //   return treeMap
  // }

  const getOptimizedCategoryIds = (): number[] => {
    const selectedIds = Array.from(selectedCategories)
    const optimizedIds: number[] = []

    // Build a map of parent -> children relationships from expanded categories
    const parentChildMap = new Map<number, Set<number>>()

    // For each expanded category, map parent to its loaded children
    expandedCategories.forEach((parentId) => {
      const children = categoryChildren[parentId]
      if (children) {
        const childIds = new Set<number>()
        children.forEach((child) => {
          childIds.add(child.id)

          // Also track grandchildren (L3) if the L2 is expanded
          if (expandedCategories.has(child.id) && categoryChildren[child.id]) {
            categoryChildren[child.id].forEach((grandchild) => {
              childIds.add(grandchild.id)
            })
          }
        })
        parentChildMap.set(parentId, childIds)
      }
    })

    // For each selected category, check if its parent is also selected
    for (const categoryId of selectedIds) {
      let hasSelectedParent = false

      // Check if any selected parent has this category as a child
      for (const [parentId, children] of parentChildMap.entries()) {
        if (selectedCategories.has(parentId) && children.has(categoryId)) {
          hasSelectedParent = true
          break
        }
      }

      // Only include this category if no parent is selected
      if (!hasSelectedParent) {
        optimizedIds.push(categoryId)
      }
    }

    console.log(
      "[v0] Parent-child map:",
      Array.from(parentChildMap.entries()).map(([p, children]) => ({
        parent: p,
        children: Array.from(children),
      })),
    )
    console.log("[v0] Selected IDs:", selectedIds)
    console.log("[v0] Optimized IDs (parents only):", optimizedIds)

    return optimizedIds
  }

  const handleAddExclusion = async () => {
    if (selectedCategories.size === 0) {
      toast({
        title: "No Category Selected",
        description: "Please select at least one category to exclude",
        variant: "destructive",
      })
      return
    }

    const categoriesToExclude = getOptimizedCategoryIds()

    console.log("[v0] Selected categories:", Array.from(selectedCategories))
    console.log("[v0] Optimized categories to send:", categoriesToExclude)

    setIsAddingExclusion(true)

    try {
      let successCount = 0
      let failedCount = 0

      for (const categoryId of categoriesToExclude) {
        try {
          const formData = new FormData()
          formData.append("category_id", categoryId.toString())

          const response = await fetch("https://cms2.devback.website/v2_0_0-excluded-categories/add", {
            method: "POST",
            body: formData,
          })

          const data = await response.json()

          if (data.success) {
            successCount++
            console.log("[v0] Successfully excluded category:", categoryId)
          } else {
            failedCount++
            console.error("[v0] Failed to exclude category:", categoryId, data)
          }
        } catch (error) {
          failedCount++
          console.error("[v0] Error excluding category:", categoryId, error)
        }
      }

      await fetchExcludedCategories()
      await fetchStats()

      setShowAddForm(false)
      setSelectedCategories(new Set())
      setExpandedCategories(new Set())

      if (failedCount === 0) {
        toast({
          title: "Categories Excluded Successfully",
          description: `${successCount} categor${successCount > 1 ? "ies have" : "y has"} been added to the exclusion list`,
        })
      } else if (successCount === 0) {
        toast({
          title: "Failed to Exclude Categories",
          description: `Failed to exclude ${failedCount} categor${failedCount > 1 ? "ies" : "y"}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Partial Success",
          description: `Excluded ${successCount} categor${successCount > 1 ? "ies" : "y"}, but ${failedCount} failed`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error in handleAddExclusion:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while adding exclusions",
        variant: "destructive",
      })
    } finally {
      setIsAddingExclusion(false)
    }
  }

  // const fetchSubcategories = async (parentId: number) => {
  //   setLoadingSubcategories(true)
  //   try {
  //     const response = await fetch(`/api/subcategories?parent_id=${parentId}`)
  //     const data = await response.json()
  //     if (data.success) {
  //       setSubcategories(data.subcategories || [])
  //     }
  //   } catch (error) {
  //     console.error("Failed to fetch subcategories:", error)
  //   } finally {
  //     setLoadingSubcategories(false)
  //   }
  // }

  // const fetchL3Subcategories = async (parentId: number) => {
  //   setLoadingL3Subcategories(true)
  //   try {
  //     const response = await fetch(`/api/subcategories?parent_id=${parentId}`)
  //     const data = await response.json()
  //     if (data.success) {
  //       setL3Subcategories(data.subcategories || [])
  //     }
  //   } catch (error) {
  //     console.error("Failed to fetch L3 subcategories:", error)
  //   } finally {
  //     setLoadingL3Subcategories(false)
  //   }
  // }

  // const handleCategoryHover = (categoryId: number) => {
  //   if (hoveredCategoryId !== categoryId) {
  //     setHoveredCategoryId(categoryId)
  //     setHoveredL2CategoryId(null)
  //     setL3Subcategories([])
  //     fetchSubcategories(categoryId)
  //   }
  // }

  // const handleL2CategoryHover = (categoryId: number) => {
  //   if (hoveredL2CategoryId !== categoryId) {
  //     setHoveredL2CategoryId(categoryId)
  //     fetchL3Subcategories(categoryId)
  //   }
  // }

  const getCategoryIcon = (level: number) => {
    switch (level) {
      case 0:
        return <Store className="h-4 w-4" />
      case 1:
        return <Layers className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const getLevelBadgeColor = (level: number) => {
    switch (level) {
      case 0:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30"
      case 1:
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 dark:border-purple-500/30"
      default:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30"
    }
  }

  const getAllDescendantIds = (categoryId: number): number[] => {
    const children = categoryChildren[categoryId] || []
    let descendants: number[] = []

    children.forEach((child) => {
      descendants.push(child.id)
      // Recursively get grandchildren
      descendants = [...descendants, ...getAllDescendantIds(child.id)]
    })

    return descendants
  }

  const areAllChildrenSelected = (categoryId: number): boolean => {
    const children = categoryChildren[categoryId] || []
    if (children.length === 0) return false

    return children.every((child) => {
      const isSelected = selectedCategories.has(child.id)
      const childrenSelected = child.has_children ? areAllChildrenSelected(child.id) : true
      return isSelected && childrenSelected
    })
  }

  const toggleCategorySelection = (categoryId: number, hasChildren: boolean) => {
    const newSelected = new Set(selectedCategories)

    if (newSelected.has(categoryId)) {
      // Deselecting: remove this category and all its descendants
      newSelected.delete(categoryId)
      const descendants = getAllDescendantIds(categoryId)
      descendants.forEach((id) => newSelected.delete(id))

      // Also uncheck all parent categories
      uncheckParentCategories(categoryId, newSelected)
    } else {
      // Selecting: add this category
      newSelected.add(categoryId)
      if (hasChildren) {
        const descendants = getAllDescendantIds(categoryId)
        descendants.forEach((id) => newSelected.add(id))
      }

      // Check parent if all siblings are now selected
      checkParentIfAllSiblingsSelected(categoryId, newSelected)
    }

    setSelectedCategories(newSelected)
  }

  // Helper function to uncheck all parent categories
  const uncheckParentCategories = (categoryId: number, selectedSet: Set<number>) => {
    // Find parent of this category
    const parent = findParentCategory(categoryId)
    if (parent) {
      selectedSet.delete(parent.id)
      // Recursively uncheck grandparents
      uncheckParentCategories(parent.id, selectedSet)
    }
  }

  // Helper function to find the parent category
  const findParentCategory = (categoryId: number): any => {
    // Search through all categories and their children
    for (const [parentId, children] of Object.entries(categoryChildren)) {
      if (children.some((child: any) => child.id === categoryId)) {
        // Find the parent category object
        const parentIdNum = Number.parseInt(parentId)
        // Search in availableCategories first
        let parentCat = availableCategories.find((c: any) => c.id === parentIdNum)
        if (!parentCat) {
          // Search recursively in children
          for (const children of Object.values(categoryChildren)) {
            parentCat = children.find((c: any) => c.id === parentIdNum)
            if (parentCat) break
          }
        }
        return parentCat
      }
    }
    return null
  }

  // Helper function to check parent if all siblings are selected
  const checkParentIfAllSiblingsSelected = (categoryId: number, selectedSet: Set<number>) => {
    const parent = findParentCategory(categoryId)
    if (parent) {
      const siblings = categoryChildren[parent.id] || []
      const allSiblingsSelected = siblings.every((sibling: any) => selectedSet.has(sibling.id))

      if (allSiblingsSelected) {
        selectedSet.add(parent.id)
        // Recursively check grandparents
        checkParentIfAllSiblingsSelected(parent.id, selectedSet)
      }
    }
  }

  const toggleCategory = async (categoryId: number, hasChildren: boolean) => {
    if (!hasChildren) return

    const newExpanded = new Set(expandedCategories)

    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
      setExpandedCategories(newExpanded)
    } else {
      newExpanded.add(categoryId)
      setExpandedCategories(newExpanded)

      // Fetch children if not already loaded
      if (!categoryChildren[categoryId]) {
        setLoadingChildren(new Set(loadingChildren).add(categoryId))
        try {
          const response = await fetch(`/api/subcategories?parent_id=${categoryId}`)
          const data = await response.json()
          if (data.success) {
            setCategoryChildren((prev) => ({
              ...prev,
              [categoryId]: data.subcategories || [],
            }))

            if (selectedCategories.has(categoryId)) {
              const newSelected = new Set(selectedCategories)
              data.subcategories?.forEach((child: any) => {
                newSelected.add(child.id)
              })
              setSelectedCategories(newSelected)
            }
          }
        } catch (error) {
          console.error("Error fetching subcategories:", error)
          toast({
            title: "Error",
            description: "Failed to load subcategories",
            variant: "destructive",
          })
        } finally {
          const newLoading = new Set(loadingChildren)
          newLoading.delete(categoryId)
          setLoadingChildren(newLoading)
        }
      }
    }
  }

  const renderCategoryTree = (categories: any[], level = 0): React.ReactNode => {
    return categories.map((cat) => {
      const isExpanded = expandedCategories.has(cat.id)
      const children = categoryChildren[cat.id] || []
      const isLoadingChildren = loadingChildren.has(cat.id)
      const isSelected = selectedCategories.has(cat.id)
      const hasSelectedChildren = cat.has_children && children.some((child) => selectedCategories.has(child.id))

      return (
        <div key={cat.id}>
          <div
            className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-200 ${
              level > 0 ? "border-l-2 border-border/50 ml-2" : ""
            } ${isSelected ? "bg-primary/10 dark:bg-primary/20 border-l-primary" : "hover:bg-muted/50 dark:hover:bg-muted/30"}`}
            style={{ paddingLeft: `${level * 32 + 12}px` }}
          >
            {/* Chevron button - only for expansion/collapse */}
            {cat.has_children ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleCategory(cat.id, cat.has_children)
                }}
                className="flex items-center gap-1 p-0 hover:bg-transparent focus:outline-none"
              >
                {isLoadingChildren ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4" />
            )}

            {/* Checkbox and label - for selection */}
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => toggleCategorySelection(cat.id, cat.has_children)}
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected ? "bg-primary border-primary" : "border-muted-foreground hover:border-primary"
                }`}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
                {!isSelected && hasSelectedChildren && <Minus className="h-3 w-3 text-muted-foreground" />}
              </div>

              {cat.level === 0 && <Store className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
              {cat.level === 1 && <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
              {cat.level === 2 && <Box className="h-4 w-4 text-amber-600 dark:text-amber-400" />}

              <span
                className={`flex-1 text-sm ${
                  isSelected ? "font-semibold text-primary" : ""
                } ${cat.level === 0 ? "font-semibold" : cat.level === 1 ? "font-medium" : ""}`}
              >
                {cat.category_name_en || cat.category_name}
              </span>

              <Badge
                variant="outline"
                className={`text-xs ${
                  cat.level === 0
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30"
                    : cat.level === 1
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 dark:border-purple-500/30"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30"
                }`}
              >
                L{cat.level + 1}
              </Badge>

              {cat.has_children && (
                <Badge variant="secondary" className="text-xs bg-muted">
                  {cat.child_categories || 0}
                </Badge>
              )}
            </div>
          </div>

          {isExpanded && children.length > 0 && (
            <div className="mt-0.5 space-y-0.5">{renderCategoryTree(children, level + 1)}</div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 ">
          <div className="flex items-center gap-4">
            {/* <Link href="/">
              <Button variant="outline" size="sm" className="gap-2 hover:bg-accent hover:text-accent-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link> */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <div className="p-2.5 bg-destructive/10 dark:bg-destructive/20 rounded-lg border border-destructive/20 dark:border-destructive/30">
                  <Ban className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                </div>
                <span className="text-foreground">
                  Excluded Categories Management
                </span>
              </h1>
              <p className="text-muted-foreground dark:text-muted-foreground mt-1.5 text-sm sm:text-base">
                Manage categories that are excluded from sync operations
              </p>
            </div>
          </div>
          <Button 
            variant="default" 
            size="sm" 
            className="gap-2 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer" 
            onClick={fetchExcludedCategories}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Card className="bg-linear-to-br from-red-500/5 via-red-500/10 to-red-500/5 dark:from-red-500/10 dark:via-red-500/20 dark:to-red-500/10 border-red-500/20 dark:border-red-500/30 ">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-red-500/10 dark:bg-red-500/20 rounded-xl border border-red-500/20 dark:border-red-500/30">
                  <ShieldOff className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Excluded</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.total_excluded}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-orange-500/5 via-orange-500/10 to-orange-500/5 dark:from-orange-500/10 dark:via-orange-500/20 dark:to-orange-500/10 border-orange-500/20 dark:border-orange-500/30 ">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl border border-orange-500/20 dark:border-orange-500/30">
                  <TrendingDown className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Parent Categories</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.parent_categories_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-blue-500/5 via-blue-500/10 to-blue-500/5 dark:from-blue-500/10 dark:via-blue-500/20 dark:to-blue-500/10 border-blue-500/20 dark:border-blue-500/30 ">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl border border-blue-500/20 dark:border-blue-500/30">
                  <Box className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Specific Only</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.specific_only_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warning Alert */}
        {stats.parent_categories_count > 0 && (
          <Alert className="bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/30 dark:border-orange-500/40">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-900 dark:text-orange-200">
              <strong>{stats.parent_categories_count} parent categories</strong> are excluded, which also excludes all
              their subcategories from sync operations.
            </AlertDescription>
          </Alert>
        )}

        {/* Add Exclusion Form */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="font-semibold">Add New Exclusion</span>
              {!showAddForm && (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="gap-2 hover:opacity-90 transition-opacity cursor-pointer" 
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Exclusion
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          {showAddForm && (
            <CardContent className="">
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 border border-border rounded-lg p-4 max-h-[400px] overflow-y-auto bg-card shadow-inner">
                    {loadingAvailable ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>Loading categories...</span>
                      </div>
                    ) : availableCategories.length > 0 ? (
                      <div className="space-y-1">{renderCategoryTree(availableCategories)}</div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Package className="h-8 w-8 mb-2 opacity-50" />
                        <p>No categories available</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[140px]">
                    <Button
                      variant="default"
                      onClick={handleAddExclusion}
                      disabled={selectedCategories.size === 0 || isAddingExclusion}
                      className="gap-2 flex-1 lg:flex-none hover:opacity-90 transition-opacity"
                    >
                      {isAddingExclusion ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Add Exclusion {selectedCategories.size > 0 && `(${selectedCategories.size})`}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false)
                        setSelectedCategories(new Set())
                      }}
                      disabled={isAddingExclusion}
                      className="flex-1 lg:flex-none hover:bg-accent transition-colors"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                <Alert className="bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 dark:border-amber-500/40">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-900 dark:text-amber-200 text-sm">
                    <strong>Note:</strong> Excluding a parent category (L1 or L2) will automatically exclude all its
                    subcategories from sync operations. L3 categories can be excluded individually without affecting
                    others.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Excluded Categories Table */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="">
            <CardTitle className="text-lg font-semibold">
              Excluded Categories ({excludedCategories.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-lg border-t border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-muted/30 hover:bg-muted/50 dark:hover:bg-muted/30 border-b border-border">
                      <TableHead className="font-semibold py-4 text-foreground">Category Name</TableHead>
                      <TableHead className="font-semibold text-foreground">Level</TableHead>
                      <TableHead className="font-semibold text-foreground">Parent Hierarchy</TableHead>
                      <TableHead className="font-semibold text-foreground">Excluded Date</TableHead>
                      <TableHead className="font-semibold text-foreground">Scope Impact</TableHead>
                      <TableHead className="font-semibold text-foreground">Excluded By</TableHead>
                      <TableHead className="font-semibold text-foreground">Reason</TableHead>
                      <TableHead className="font-semibold text-center text-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Loading excluded categories...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : excludedCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-muted/50 dark:bg-muted/30 rounded-full border border-border">
                              <ShieldOff className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold text-base text-foreground">No excluded categories</p>
                              <p className="text-sm text-muted-foreground mt-1.5">
                                All categories are currently active for sync operations
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      excludedCategories.map((category) => (
                        <TableRow 
                          key={category.id} 
                          className="hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors border-b border-border/50"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20 dark:border-blue-500/30">
                                {getCategoryIcon(category.level)}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{category.category_name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">ID: {category.category_id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getLevelBadgeColor(category.level)}>Level {category.level + 1}</Badge>
                          </TableCell>
                          <TableCell>
                            {category.parent_hierarchy.length > 0 ? (
                              <div className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400">
                                <Store className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[200px]">{category.parent_hierarchy.map((p) => p.name).join(" > ")}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400">
                                <Store className="h-3.5 w-3.5" />
                                <span>Root Category</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground">{category.excluded_date}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {category.scope_impact === "all_children" ? (
                              <Badge className="bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30 dark:border-orange-500/40 px-3 py-1">
                                <TrendingDown className="h-3 w-3 mr-1.5" />
                                All Children Excluded
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 dark:border-blue-500/40 px-3 py-1">
                                This Category Only
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center border border-primary/20 dark:border-primary/30">
                                <span className="text-xs font-semibold text-primary">
                                  {category.excluded_by?.[0]?.toUpperCase() || "?"}
                                </span>
                              </div>
                              <span className="text-sm text-foreground">{category.excluded_by || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {category.reason ? (
                              <p className="text-sm text-muted-foreground line-clamp-2">{category.reason}</p>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive/10 dark:hover:bg-destructive/20 transition-colors"
                              onClick={() => handleRemoveExclusion(category.category_id.toString())}
                              title="Remove from exclusion list"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
