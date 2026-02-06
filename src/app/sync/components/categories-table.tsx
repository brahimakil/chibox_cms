"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import Link from "next/link"
import {
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  FolderSync,
  Package,
  Store,
  Layers,
  Box,
  ShieldOff,
  Eye,
  Search,
  X,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CategoriesTableProps {
  searchQuery: string
  selectedCategory: string
}

interface ExcludedCategoryResponse {
  category_id: number
  [key: string]: unknown
}

interface Category {
  id: number
  name: string
  direct_products: number
  products_with_children: number
  product_count: number
  child_categories: number
  last_category_sync: string | null
  last_child_check: string | null
  source_category_id: string
  product_ids: {
    lowest: number
    highest: number
  }
  last_product_sync: string | null
  productlastsync: string | null
  children: Category[]
}

interface Product {
  id: number
  display_name: string
  source_product_id: string
  product_price: number
  product_price_currency: string
  product_price_converted: number
  product_price_converted_currency: string
  main_image: string
  quantity_begin: number
  sales_count: number
  category_id: number
  category_name: string
}

export function CategoriesTable({ searchQuery, selectedCategory }: CategoriesTableProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set())
  const [isExcluding, setIsExcluding] = useState(false)
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<Set<number>>(new Set())
  const itemsPerPage = 10
  const { toast } = useToast()

  // Products modal state
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false)
  const [selectedCategoryForProducts, setSelectedCategoryForProducts] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [productsPage, setProductsPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [totalProductsPages, setTotalProductsPages] = useState(0)
  const productsPerPage = 12
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchExcludedCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/category-stats")
      const data = await response.json()
      if (data.success && data.data?.rows) {
        setCategories(data.data.rows)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchExcludedCategories = async () => {
    try {
      const response = await fetch("/api/excluded-list")
      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        // Extract all excluded category IDs
        const excludedIds = new Set<number>()
        
        data.data.forEach((excluded: ExcludedCategoryResponse) => {
          excludedIds.add(excluded.category_id)
        })

        setExcludedCategoryIds(excludedIds)
      }
    } catch (error) {
      console.error("Error fetching excluded categories:", error)
    }
  }

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleSelection = (categoryId: number) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
    } else {
      newSelected.add(categoryId)
    }
    setSelectedCategories(newSelected)
  }

  const getStatusBadge = (lastSync: string | null) => {
    if (!lastSync) {
      return (
        <Badge variant="secondary" className="gap-1 bg-chart-3/10 text-chart-3 dark:bg-chart-3/20 dark:text-chart-3">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-chart-2/10 text-chart-2 dark:bg-chart-2/20 dark:text-chart-2">
        <CheckCircle className="h-3 w-3" />
        Synced
      </Badge>
    )
  }

  const handleCheckNewChildren = async (category: Category) => {
    try {
      toast({
        title: "Checking for New Children",
        description: `Scanning category "${category.name}" for new subcategories...`,
      })

      const formData = new FormData()
      formData.append("categoryId", category.source_category_id)

      const response = await fetch("https://cms2.devback.website/v2_0_0-category/sync-all", {
        method: "POST",
        body: formData,
      })

      // Get response as text first since it may contain emojis and text before JSON
      const responseText = await response.text()
      
      // Try to extract JSON from the response
      // Look for the last occurrence of '{' to find the JSON object
      interface SyncResponse {
        success: boolean
        message?: string
        data?: {
          success: boolean
          mode?: string
          total?: number
          api_calls?: number
          duration?: number
        }
      }
      
      let result: SyncResponse
      try {
        // Try to parse the entire response as JSON first
        result = JSON.parse(responseText)
      } catch {
        // If that fails, try to find JSON at the end of the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}$/)
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0])
          } catch (e) {
            console.error("Failed to parse JSON from response:", e)
            // If we can't parse JSON but response is ok, consider it a success
            if (response.ok) {
              result = { success: true, message: "Category sync completed" }
            } else {
              throw new Error("Failed to parse response")
            }
          }
        } else {
          // No JSON found, but if response is ok, consider it a success
          if (response.ok) {
            result = { success: true, message: "Category sync completed" }
          } else {
            throw new Error("Failed to parse response and response not ok")
          }
        }
      }

      if (result.success) {
        toast({
          title: "Sync Completed",
          description: `Successfully synced children for "${category.name}"`,
        })
        // Refresh the categories table to show updated data
        await fetchCategories()
      } else {
        toast({
          title: "Sync Failed",
          description: result.message || "Failed to sync children categories",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while syncing children categories",
        variant: "destructive",
      })
      console.error("Error syncing children:", error)
    }
  }

  const handleSyncProducts = async (category: Category) => {
    try {
      toast({
        title: "Syncing Products",
        description: `Synchronizing products for category "${category.name}"...`,
      })

      const formData = new FormData()
      formData.append("category_id", category.source_category_id)

      const response = await fetch("https://cms2.devback.website/v2_0_0-discovery/sync-category", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Products Synced",
          description: `Successfully synced products for "${category.name}"`,
        })
        // Refresh the categories table to show updated data
        await fetchCategories()
      } else {
        toast({
          title: "Sync Failed",
          description: result.message || "Failed to sync products",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while syncing products",
        variant: "destructive",
      })
      console.error("Error syncing products:", error)
    }
  }

  const handleViewProducts = async (category: Category) => {
    setSelectedCategoryForProducts(category)
    setIsProductsModalOpen(true)
    setProductsPage(1)
    setProductSearchQuery("")
    await fetchProducts(category.id, 1, "")
  }

  const fetchProducts = async (categoryId: number, page: number, search: string) => {
    setIsLoadingProducts(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        category_id: categoryId.toString(),
        limit: productsPerPage.toString(),
        ...(search && { search }),
      })

      const response = await fetch(`/api/category-products?${params.toString()}`)
      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data)
        setTotalProducts(data.pagination?.total || data.data.length)
        setTotalProductsPages(data.pagination?.total_pages || 1)
      } else {
        setProducts([])
        setTotalProducts(0)
        setTotalProductsPages(0)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      })
      setProducts([])
      setTotalProducts(0)
      setTotalProductsPages(0)
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const handleProductsPageChange = (newPage: number) => {
    setProductsPage(newPage)
    if (selectedCategoryForProducts) {
      fetchProducts(selectedCategoryForProducts.id, newPage, productSearchQuery)
    }
  }

  const handleProductSearch = (search: string) => {
    setProductSearchQuery(search)
    setProductsPage(1)
    if (selectedCategoryForProducts) {
      fetchProducts(selectedCategoryForProducts.id, 1, search)
    }
  }

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl)
    setIsImageDialogOpen(true)
  }

  const handleExcludeCategories = async () => {
    if (selectedCategories.size === 0) {
      toast({
        title: "No Categories Selected",
        description: "Please select categories to exclude",
        variant: "destructive",
      })
      return
    }

    setIsExcluding(true)

    try {
      toast({
        title: "Excluding Categories",
        description: `Marking ${selectedCategories.size} categories as excluded...`,
      })

      const categoriesToExclude = Array.from(selectedCategories)
      let successCount = 0
      let failedCount = 0
      const successfullyExcludedIds: number[] = []

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
            successfullyExcludedIds.push(categoryId)
            console.log("Successfully excluded category:", categoryId)
          } else {
            failedCount++
            console.error("Failed to exclude category:", categoryId, data)
          }
        } catch (error) {
          failedCount++
          console.error("Error excluding category:", categoryId, error)
        }
      }

      // Update local state with successfully excluded categories
      // This will automatically update the table via the filteredCategories useMemo
      if (successfullyExcludedIds.length > 0) {
        setExcludedCategoryIds((prev) => {
          const updated = new Set(prev)
          successfullyExcludedIds.forEach((id) => updated.add(id))
          return updated
        })
      }

      // Sync excluded list with server (optional, but ensures consistency)
      await fetchExcludedCategories()

      // Clear selections
      setSelectedCategories(new Set())

      // Show appropriate toast message
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
      console.error("Error excluding categories:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while excluding categories",
        variant: "destructive",
      })
    } finally {
      setIsExcluding(false)
    }
  }

  const getCategoryIcon = (level: number) => {
    if (level === 1) return <Store className="h-4 w-4 text-blue-600" />
    if (level === 2) return <Layers className="h-4 w-4 text-purple-600" />
    return <Box className="h-4 w-4 text-amber-600" />
  }

  const getLevelBadgeColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-blue-100 text-blue-700 border-blue-200"
      case 2:
        return "bg-purple-100 text-purple-700 border-purple-200"
      case 3:
        return "bg-amber-100 text-amber-700 border-amber-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getLevelStyle = (level: number) => {
    switch (level) {
      case 1:
        return "border-l-2 border-l-blue-400 hover:bg-blue-50/30"
      case 2:
        return "border-l-2 border-l-purple-400 hover:bg-purple-50/30"
      case 3:
        return "border-l-2 border-l-amber-400 hover:bg-amber-50/30"
      default:
        return "hover:bg-muted/50"
    }
  }

  const renderCategory = (category: Category, level = 1) => {
    const isExpanded = expandedCategories.has(category.id)
    const hasChildren = category.children && category.children.length > 0
    const indent = (level - 1) * 40

    const productSyncTime = category.productlastsync || category.last_product_sync

    return (
      <React.Fragment key={category.id}>
        <TableRow className={`${getLevelStyle(level)} transition-colors`}>
          <TableCell className="py-3">
            <div className="flex items-center gap-3" style={{ paddingLeft: `${indent}px` }}>
              <Checkbox
                checked={selectedCategories.has(category.id)}
                onCheckedChange={() => toggleSelection(category.id)}
                className="h-4 w-4"
              />
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-background/80"
                  onClick={() => toggleCategory(category.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              ) : (
                <div className="w-6" />
              )}
              {getCategoryIcon(level)}
              <span
                className={`${level === 1 ? "font-semibold text-blue-900" : level === 2 ? "font-medium text-purple-900" : "text-amber-900"}`}
              >
                {category.name}
              </span>
            </div>
          </TableCell>
          <TableCell className="py-3">
            <Badge variant="outline" className={`text-xs px-2 py-0.5 ${getLevelBadgeColor(level)}`}>
              L{level}
            </Badge>
          </TableCell>
          <TableCell className="py-3">
            <span className="font-semibold">{category.product_count?.toLocaleString() || 0}</span>
          </TableCell>
          <TableCell className="py-3">
            <div className="text-sm">
              {category.child_categories > 0 ? (
                <span className="font-medium text-foreground">{category.child_categories} subcategories</span>
              ) : (
                <span className="text-muted-foreground">No subcategories</span>
              )}
            </div>
          </TableCell>
          <TableCell className="py-3">{getStatusBadge(category.last_category_sync)}</TableCell>
          <TableCell className="py-3 text-sm">
            {category.last_category_sync ? (
              <span className="text-foreground">{category.last_category_sync}</span>
            ) : (
              <span className="text-muted-foreground">Never synced</span>
            )}
          </TableCell>
          <TableCell className="py-3 text-sm">
            {productSyncTime ? (
              <span className="text-foreground">{productSyncTime}</span>
            ) : (
              <span className="text-muted-foreground">Never synced</span>
            )}
          </TableCell>
          <TableCell className="py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs cursor-pointer  bg-transparent"
                onClick={() => handleCheckNewChildren(category)}
              >
                <FolderSync className="h-3.5 w-3.5" />
                Check Children
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs cursor-pointer  bg-transparent"
                onClick={() => handleSyncProducts(category)}
              >
                <Package className="h-3.5 w-3.5" />
                Sync Products
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs cursor-pointer  bg-transparent"
                onClick={() => handleViewProducts(category)}
              >
                <Eye className="h-3.5 w-3.5" />
                View Products
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && category.children.map((child) => renderCategory(child, level + 1))}
      </React.Fragment>
    )
  }

  const filteredCategories = useMemo(() => {
    // Helper function to check if a category is excluded
    const isCategoryExcluded = (categoryId: number): boolean => {
      return excludedCategoryIds.has(categoryId)
    }

    const filterCategories = (cats: Category[]): Category[] => {
      let filtered = cats

      // Filter out excluded categories (children will be filtered recursively)
      filtered = filtered.filter((cat) => !isCategoryExcluded(cat.id))

      // Filter by selected category from dropdown
      if (selectedCategory !== "all") {
        const selectedId = Number.parseInt(selectedCategory)
        filtered = filtered.filter((cat) => cat.id === selectedId)
      }

      // Filter by search query and recursively filter children
      return filtered
        .map((cat) => {
          // Recursively filter children (this will also exclude children of excluded parents)
          const filteredChildren = cat.children ? filterCategories(cat.children) : []
          const matchesSearch = searchQuery
            ? cat.name.toLowerCase().includes(searchQuery.toLowerCase())
            : true

          if (matchesSearch || filteredChildren.length > 0) {
            return { ...cat, children: filteredChildren }
          }
          return null
        })
        .filter((cat): cat is Category => cat !== null)
    }

    return filterCategories(categories)
  }, [categories, searchQuery, selectedCategory, excludedCategoryIds])

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage)
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredCategories.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredCategories, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Category Hierarchy ({filteredCategories.length} categories)</CardTitle>
            <div className="flex items-center gap-2">
              <Link href="/excluded-categories">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <ShieldOff className="h-4 w-4" />
                  View Excluded Categories
                </Button>
              </Link>
              {selectedCategories.size > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="gap-2" 
                  onClick={handleExcludeCategories}
                  disabled={isExcluding}
                >
                  {isExcluding ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Excluding...
                    </>
                  ) : (
                    <>
                      Exclude Selected ({selectedCategories.size})
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={fetchCategories}>
                <RefreshCw className="h-4 w-4" />
                Refresh All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="py-3 font-semibold">Category Name</TableHead>
                  <TableHead className="py-3 font-semibold">Level</TableHead>
                  <TableHead className="py-3 font-semibold">Products</TableHead>
                  <TableHead className="py-3 font-semibold">In subcategories</TableHead>
                  <TableHead className="py-3 font-semibold">Status</TableHead>
                  <TableHead className="py-3 font-semibold">Last Category Sync</TableHead>
                  <TableHead className="py-3 font-semibold">Last Product Sync</TableHead>
                  <TableHead className="py-3 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCategories.map((category) => renderCategory(category, 1))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredCategories.length)} of {filteredCategories.length}{" "}
                categories
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Modal */}
      <Dialog open={isProductsModalOpen} onOpenChange={setIsProductsModalOpen}>
        <DialogContent className="w-[96vw]! max-w-[96vw]! sm:max-w-[96vw]! max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-2xl font-semibold text-foreground">
              Products in {selectedCategoryForProducts?.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Showing {products.length} of {totalProducts} product{totalProducts !== 1 ? "s" : ""} in this category
            </DialogDescription>
          </DialogHeader>

          <div className="px-1 py-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search by product name..."
                value={productSearchQuery}
                onChange={(e) => handleProductSearch(e.target.value)}
                className="pl-9 pr-3 py-2 w-full border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto rounded-md border">
            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                {productSearchQuery ? "No products match your search" : "No products found in this category"}
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 border-b-2 border-primary/20">
                    <TableHead className="font-semibold text-center text-foreground bg-gradient-to-r from-primary/10 to-primary/5">Image</TableHead>
                    <TableHead className="font-semibold text-foreground bg-gradient-to-r from-primary/10 to-primary/5">Product Name</TableHead>
                    <TableHead className="font-semibold text-center text-foreground bg-gradient-to-r from-primary/10 to-primary/5">Source ID</TableHead>
                    <TableHead className="font-semibold text-center text-foreground bg-gradient-to-r from-primary/10 to-primary/5">Price (CNY)</TableHead>
                    <TableHead className="font-semibold text-center text-foreground bg-gradient-to-r from-primary/10 to-primary/5">Price (USD)</TableHead>
                    <TableHead className="font-semibold text-center text-foreground bg-gradient-to-r from-primary/10 to-primary/5">Sales</TableHead>
                    <TableHead className="font-semibold text-center text-foreground bg-gradient-to-r from-primary/10 to-primary/5">Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center py-3">
                        <div className="flex items-center justify-center">
                          <img
                            src={product.main_image || "/placeholder.svg?height=80&width=80"}
                            alt={product.display_name}
                            className="h-16 w-16 object-cover rounded-lg border-2 cursor-pointer hover:opacity-80 hover:scale-105 transition-all shadow-sm"
                            onClick={() => handleImageClick(product.main_image)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/placeholder.svg?height=80&width=80"
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-base max-w-md">
                        <div className="line-clamp-2">{product.display_name}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-center text-sm">
                        {product.source_product_id}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {product.product_price_currency} {product.product_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-primary">
                        {product.product_price_converted_currency}{product.product_price_converted.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-semibold">
                          {product.sales_count.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {product.category_name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {totalProductsPages > 1 && !isLoadingProducts && (
            <div className="flex items-center justify-between border-t bg-linear-to-r from-slate-50 to-gray-50 px-6 py-4 rounded-b-lg mt-auto">
              <div className="text-sm font-medium text-muted-foreground">
                Page {productsPage} of {totalProductsPages} • {totalProducts} total{" "}
                {totalProducts === 1 ? "product" : "products"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleProductsPageChange(productsPage - 1)}
                  disabled={productsPage === 1}
                  className="font-medium hover:bg-primary/10 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalProductsPages) }, (_, i) => {
                    let pageNum
                    if (totalProductsPages <= 5) {
                      pageNum = i + 1
                    } else if (productsPage <= 3) {
                      pageNum = i + 1
                    } else if (productsPage >= totalProductsPages - 2) {
                      pageNum = totalProductsPages - 4 + i
                    } else {
                      pageNum = productsPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={productsPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleProductsPageChange(pageNum)}
                        className={`h-9 w-9 p-0 font-semibold transition-all ${
                          productsPage === pageNum
                            ? "bg-primary shadow-md scale-105"
                            : "hover:bg-primary/10 hover:scale-105"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleProductsPageChange(productsPage + 1)}
                  disabled={productsPage === totalProductsPages}
                  className="font-medium hover:bg-primary/10 transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-4xl p-0">
          <VisuallyHidden>
            <DialogTitle>Product Image Preview</DialogTitle>
          </VisuallyHidden>
          <div className="relative">
            <button
              onClick={() => setIsImageDialogOpen(false)}
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={selectedImage || ""}
              alt="Product preview"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg?height=800&width=800"
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
