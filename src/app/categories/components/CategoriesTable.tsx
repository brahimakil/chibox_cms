'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ColumnDef, SortingState } from "@tanstack/react-table"
import { DataTable } from "@/components/Table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Card } from '@/components/ui/card'

// Category data type
export interface CategoryData {
  id: number;
  categoryName: string;
  slug: string;
  parent: number | null;
  parent_name?: string | null;
  type: number;
  productCount: number;
  showInNavbar: number;
  display: number;
  orderNumber: number | null;
  mainImage?: string | null;
  [key: string]: unknown; // Allow other properties
}

interface CategoriesTableProps {
  onView?: (category: CategoryData) => void;
  onEdit?: (category: CategoryData) => void;
  onDelete?: (category: CategoryData) => void;
  onBulkDelete?: (categories: CategoryData[]) => void;
  onAdd?: () => void;
  onRefresh?: () => void;
  refreshKey?: number; // Key to trigger refresh
}

// Column definitions - showing only necessary fields
const columns: ColumnDef<CategoryData>[] = [
  {
    accessorKey: "id",
    header: "ID",
    enableSorting: true,
    cell: ({ row }) => {
      return (
        <div className="font-medium w-16">{row.getValue("id")}</div>
      )
    },
  },
  {
    accessorKey: "mainImage",
    header: "Image",
    enableSorting: false,
    cell: ({ row }) => {
      const mainImage = row.getValue("mainImage") as string | null | undefined
      const categoryName = row.original.categoryName || "Category"
      
      // Check if URL is valid
      const isValidUrl = mainImage && (mainImage.startsWith('http') || mainImage.startsWith('//') || mainImage.startsWith('/'))
      
      if (!mainImage || !isValidUrl) {
        return (
          <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 border bg-muted flex items-center justify-center">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
        )
      }
      
      return (
        <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 border bg-muted">
          <img
            src={mainImage}
            alt={categoryName}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Hide broken image on error
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        </div>
      )
    },
  },
  {
    accessorKey: "categoryName",
    header: "Category Name",
    enableSorting: true,
    cell: ({ row }) => {
      const category = row.original
      return (
        <div className="flex flex-col gap-1">
          <div className="font-medium">{row.getValue("categoryName")}</div>
          {category.slug && (
            <div className="text-xs text-muted-foreground">/{category.slug}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "parent",
    header: "Parent",
    enableSorting: true,
    cell: ({ row }) => {
      const parent = row.getValue("parent") as number | null
      const parentName = row.original.parent_name
      return (
        <div className="text-sm">
          {parentName || (parent ? `ID: ${parent}` : '—')}
        </div>
      )
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    enableSorting: true,
    cell: ({ row }) => {
      const type = row.getValue("type") as number
      return (
        <Badge variant={type === 0 ? "default" : "outline"}>
          {type === 0 ? "Main" : "Sub"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "productCount",
    header: "Products",
    enableSorting: true,
    cell: ({ row }) => {
      const count = row.getValue("productCount") as number
      return (
        <div className="text-center font-medium">{count.toLocaleString()}</div>
      )
    },
  },
  {
    accessorKey: "showInNavbar",
    header: "Navbar",
    enableSorting: true,
    cell: ({ row }) => {
      const show = row.getValue("showInNavbar") as number
      return (
        <Badge variant={show === 1 ? "default" : "secondary"} className="w-fit">
          {show === 1 ? "Yes" : "No"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "display",
    header: "Status",
    enableSorting: true,
    cell: ({ row }) => {
      const display = row.getValue("display") as number
      return (
        <Badge variant={display === 1 ? "default" : "secondary"} className="w-fit">
          {display === 1 ? "Active" : "Hidden"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "orderNumber",
    header: "Order",
    enableSorting: true,
    cell: ({ row }) => {
      const order = row.getValue("orderNumber") as number | null
      return (
        <div className="text-center">{order ?? '—'}</div>
      )
    },
  },
]

export default function CategoriesTable({
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
  onAdd,
  refreshKey,
}: CategoriesTableProps) {
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Server-side pagination and filtering
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSizeOptions = [50, 100, 200, 500]

  // Filter state - all filters handled on backend
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState<Record<string, string>>({})

  // Sorting state - all sorting handled on backend
  const [sorting, setSorting] = useState<SortingState>([])

  // Debounce column filters (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters)
    }, 500)

    return () => clearTimeout(timer)
  }, [columnFilters])

  // Fetch categories with server-side pagination and filtering
  const fetchCategories = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })

      // Add column filters (from header filters)
      // Map column IDs (camelCase) to API parameter names (snake_case)
      const columnFilterMap: Record<string, string> = {
        'id': 'id',
        'categoryName': 'category_name',
        'parent': 'parent',
        'productCount': 'product_count',
        'showInNavbar': 'show_in_navbar',
        'orderNumber': 'order_number',
      }
      
      Object.entries(debouncedColumnFilters).forEach(([columnId, value]) => {
        if (value && value.trim()) {
          // Use mapping if available, otherwise convert camelCase to snake_case
          const apiParam = columnFilterMap[columnId] || columnId.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append(apiParam, value.trim())
        }
      })

      // Add sorting parameters
      if (sorting.length > 0) {
        // Map column IDs (camelCase) to API parameter names (snake_case)
        const columnSortMap: Record<string, string> = {
          'id': 'id',
          'categoryName': 'category_name',
          'parent': 'parent',
          'productCount': 'product_count',
          'showInNavbar': 'show_in_navbar',
          'orderNumber': 'order_number',
          'display': 'display',
          'type': 'type',
        }
        
        sorting.forEach((sort) => {
          const apiColumn = columnSortMap[sort.id] || sort.id.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append('sort', `${apiColumn}:${sort.desc ? 'desc' : 'asc'}`)
        })
      }
      
      const apiUrl = `/api/categories?${params.toString()}`
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[CategoriesTable] Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Map parent IDs to parent names for better display
        const allCategories = data.categories || []
        const categoriesWithParents = allCategories.map((cat: CategoryData) => {
          const parentCategory = allCategories.find((c: CategoryData) => c.id === cat.parent)
          return {
            ...cat,
            parent_name: parentCategory?.categoryName || null,
          }
        })
        setCategories(categoriesWithParents)
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
        console.log(`[CategoriesTable] Loaded ${categoriesWithParents.length} categories (page ${data.page || 1} of ${data.totalPages || 1})`)
      } else {
        console.error('[CategoriesTable] API returned success:false', data)
        toast({
          title: "Error",
          description: data.error || "Failed to fetch categories",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[CategoriesTable] Error fetching categories:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch categories",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, pageSize, debouncedColumnFilters, sorting])

  useEffect(() => {
    fetchCategories(currentPage)
  }, [currentPage, fetchCategories, refreshKey])

  // Reset to page 1 when pageSize, column filters, or sorting change
  useEffect(() => {
    setCurrentPage(1)
  }, [pageSize, debouncedColumnFilters, sorting])

  // Handle column filter change (from header filters)
  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => {
      if (value && value.trim()) {
        return { ...prev, [columnId]: value }
      } else {
        const newFilters = { ...prev }
        delete newFilters[columnId]
        return newFilters
      }
    })
  }

  // Track last click time for double-click detection
  const lastClickTime = useRef<number>(0)
  const lastClickCategory = useRef<CategoryData | null>(null)

  const handleRowClick = (category: CategoryData) => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTime.current
    
    // Check if this is a double-click (within 300ms and same category)
    if (
      timeSinceLastClick < 300 &&
      lastClickCategory.current?.id === category.id
    ) {
      // Double-click detected - open view dialog
      onView?.(category)
      lastClickTime.current = 0 // Reset to prevent triple-click issues
      lastClickCategory.current = null
    } else {
      // Single click - update tracking
      lastClickTime.current = now
      lastClickCategory.current = category
    }
  }

  const handleSelectionChange = (selectedCategories: CategoryData[]) => {
    console.log("Selected categories:", selectedCategories)
  }

  // Define row actions
  const rowActions = [
    {
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: (category: CategoryData) => {
        onView?.(category)
      },
    },
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: (category: CategoryData) => {
        onEdit?.(category)
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (category: CategoryData) => {
        onDelete?.(category)
      },
      variant: "destructive" as const,
    },
  ]

  // Define bulk actions
  const bulkActions = [
    {
      label: "Delete Selected",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (selectedCategories: CategoryData[]) => {
        onBulkDelete?.(selectedCategories)
      },
      variant: "destructive" as const,
    },
  ]

  const endRecord = Math.min(currentPage * pageSize, total)

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow p-6 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Categories
          </h2>
          {/* <p className="text-gray-600 mt-1">
            {total} {total === 1 ? 'Category' : 'Categories'}
          </p> */}
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="w-fit bg-linear-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200"
          >
            {endRecord}/{total} items shown
          </Badge>
          {onAdd && (
            <Button 
              onClick={onAdd}
              className="bg-linear-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              Add Category
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="hidden lg:flex lg:flex-col flex-1 min-h-0 overflow-hidden w-full max-w-full">
        <DataTable
          columns={columns}
          data={categories}
          searchKey="categoryName"
          searchPlaceholder="Search categories by name..."
          enableRowSelection={true}
          enableGlobalFilter={false}
          enableColumnFilters={true}
          enableSorting={true}
          enablePagination={false}
          pageSize={pageSize}
          loading={loading}
          onRowClick={handleRowClick}
          onSelectionChange={handleSelectionChange}
          title=""
          showAddButton={false}
          rowActions={rowActions}
          enableRowContextMenu={true}
          bulkActions={bulkActions}
          emptyMessage="No categories found."
          onColumnFilterChange={handleColumnFilterChange}
          columnFilterValues={columnFilters}
          onSortingChange={setSorting}
          sortingValues={sorting}
          tableHeight="calc(100vh - 280px)"
          className="w-full max-w-full"
        />
      </div>

      {/* Mobile Cards - Simplified version */}
      <div className="lg:hidden space-y-4 flex-1">
        {loading ? (
          <Card className="p-8 text-center text-gray-500">
            Loading categories...
          </Card>
        ) : categories.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No categories found.
          </Card>
        ) : (
          categories.map((category) => (
            <Card key={category.id} className="p-4 shadow-lg border-0 bg-linear-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
              <div className="flex items-start gap-3 mb-3">
                {/* Category Image */}
                <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0 border bg-muted">
                  {category.mainImage && (category.mainImage.startsWith('http') || category.mainImage.startsWith('//') || category.mainImage.startsWith('/')) ? (
                    <img
                      src={category.mainImage}
                      alt={category.categoryName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>'
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{category.categoryName}</h3>
                      {category.slug && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">/{category.slug}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {category.type === 0 ? (
                        <Badge variant="default" className="text-xs">Main</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Sub</Badge>
                      )}
                      {category.display === 1 ? (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Hidden</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">ID:</span>
                  <span className="ml-2 font-mono text-gray-700">#{category.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Products:</span>
                  <span className="ml-2 font-medium">{category.productCount.toLocaleString()}</span>
                </div>
                {category.parent_name && (
                  <div>
                    <span className="text-gray-500">Parent:</span>
                    <span className="ml-2">{category.parent_name}</span>
                  </div>
                )}
                {category.orderNumber !== null && (
                  <div>
                    <span className="text-gray-500">Order:</span>
                    <span className="ml-2">{category.orderNumber}</span>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
      
      {/* Pagination */}
      {(totalPages > 1 || total > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-1 mt-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => setPageSize(Number.parseInt(value))}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(1)
                fetchCategories(1)
              }}
              disabled={currentPage === 1 || loading}
              className="h-8 px-3"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage > 1) {
                  const newPage = currentPage - 1
                  setCurrentPage(newPage)
                  fetchCategories(newPage)
                }
              }}
              disabled={currentPage === 1 || loading}
              className="h-8 px-3"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage < totalPages) {
                  const newPage = currentPage + 1
                  setCurrentPage(newPage)
                  fetchCategories(newPage)
                }
              }}
              disabled={currentPage === totalPages || loading}
              className="h-8 px-3"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(totalPages)
                fetchCategories(totalPages)
              }}
              disabled={currentPage === totalPages || loading}
              className="h-8 px-3"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

