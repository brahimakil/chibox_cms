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
import { Eye, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Package, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Product variant interface
interface ProductVariant {
  id: number;
  productId: number;
  skuId: string | null;
  variantName: string | null;
  propsIds: string | null;
  propsNames: string | null;
  variantImage: string | null;
  salePrice: number | null;
  originPrice: number | null;
  discountPrice: number | null;
  stock: number;
  sortOrder: number;
}

// Product data type
export interface ProductData {
  id: number;
  productName: string;
  displayName: string | null;
  productCode: string;
  slug: string;
  productPrice: number;
  productQtyLeft: number;
  salesDiscount: number | null;
  booleanPercentDiscount: number;
  outOfStock: number;
  hasOption: number;
  showOnWebsite: number;
  productStatus: number;
  freeShipping: number;
  flatRate: number;
  multiShipping: number;
  mainImage: string | null;
  brand_name?: string | null;
  category_name?: string | null;
  // New fields from product_1688_info
  titleZh?: string | null;
  titleEn?: string | null;
  rating?: number | null;
  reviewsCount?: number;
  variantsCount?: number;
  variations?: ProductVariant[];
  [key: string]: unknown; // Allow other properties
}

interface ProductsTableProps {
  onView?: (product: ProductData) => void;
  onEdit?: (product: ProductData) => void;
  onDelete?: (product: ProductData) => void;
  onBulkDelete?: (products: ProductData[]) => void;
  onAdd?: () => void;
  onRefresh?: () => void;
  refreshKey?: number; // Key to trigger refresh
}

// Column definitions - showing only necessary fields
const columns: ColumnDef<ProductData>[] = [
  {
    accessorKey: "id",
    header: "ID",
    enableSorting: true,
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.getValue("id")}</div>
      )
    },
  },
  {
    accessorKey: "mainImage",
    header: "Image",
    enableSorting: false,
    cell: ({ row }) => {
      const mainImage = row.getValue("mainImage") as string | null | undefined
      const productName = row.original.displayName || row.original.productName || "Product"
      
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
            alt={productName}
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
    accessorKey: "displayName",
    header: "Product Name",
    enableSorting: true,
    cell: ({ row }) => {
      const product = row.original
      const productName = product.productName as string | null | undefined
      const trimmedProductName = productName?.trim() || ''
      const displayName: string = 
        (product.displayName as string) || 
        trimmedProductName || 
        (product.originalName as string) || 
        'N/A'
      return (
        <span className="font-medium" title={displayName}>
          {displayName}
        </span>
      )
    },
  },
  {
    accessorKey: "category_name",
    header: "Category",
    enableSorting: true,
    cell: ({ row }) => {
      const categoryName = row.getValue("category_name") as string | null | undefined
      return (
        <span className="font-medium" title={categoryName || ''}>
          {categoryName || <span className="text-muted-foreground">—</span>}
        </span>
      )
    },
  },
  {
    accessorKey: "productPrice",
    header: "Price",
    enableSorting: true,
    cell: ({ row }) => {
      const price = row.getValue("productPrice") as number
      const discount = row.original.salesDiscount
      const isPercent = row.original.booleanPercentDiscount === 1
      const hasDiscount = discount && discount > 0
      
      let finalPrice = price
      if (hasDiscount) {
        if (isPercent) {
          finalPrice = price - (price * discount / 100)
        } else {
          finalPrice = price - discount
        }
      }
      
      return (
        <div className="whitespace-nowrap">
          <span className="font-medium">{finalPrice.toFixed(2)}</span>
          {hasDiscount && (
            <>
              <span className="text-xs text-muted-foreground line-through ml-1">{price.toFixed(2)}</span>
              <div className="text-xs text-green-600">
                {isPercent ? `${discount}% off` : `$${discount} off`}
              </div>
            </>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "productQtyLeft",
    header: "Stock",
    enableSorting: true,
    cell: ({ row }) => {
      const qty = row.getValue("productQtyLeft") as number
      const outOfStock = row.original.outOfStock === 1
      return (
        <Badge variant={qty > 0 && !outOfStock ? "default" : "destructive"} className="whitespace-nowrap">
          {qty > 0 && !outOfStock ? qty.toLocaleString() : "Out of Stock"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "hasOption",
    header: "Variants",
    enableSorting: false,
    enableColumnFilter: true,
    cell: ({ row }) => {
      const variantsCount = row.original.variantsCount as number | undefined
      const hasVariants = variantsCount !== undefined && variantsCount > 0
      
      return (
        <Badge variant={hasVariants ? "default" : "secondary"}>
          {hasVariants ? `${variantsCount}` : "No"}
        </Badge>
      )
    },
    meta: {
      filterPlaceholder: "yes/no or number"
    }
  },
  {
    accessorKey: "showOnWebsite",
    header: "Status",
    enableSorting: true,
    cell: ({ row }) => {
      const show = row.getValue("showOnWebsite") as number
      return (
        <Badge variant={show === 1 ? "default" : "secondary"}>
          {show === 1 ? "Published" : "Hidden"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "productStatus",
    header: "Active",
    enableSorting: true,
    cell: ({ row }) => {
      const status = row.getValue("productStatus") as number
      return (
        <Badge variant={status === 32 ? "default" : "destructive"}>
          {status === 32 ? "Active" : "Inactive"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "rating",
    header: "Rating",
    enableSorting: true,
    cell: ({ row }) => {
      const rating = row.getValue("rating") as number | null | undefined
      const reviewsCount = row.original.reviewsCount as number | undefined
      
      if (!rating && !reviewsCount) {
        return <span className="text-sm text-muted-foreground">—</span>
      }
      
      return (
        <div className="flex items-center gap-1 whitespace-nowrap">
          {rating && (
            <>
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
            </>
          )}
          {reviewsCount !== undefined && reviewsCount > 0 && (
            <span className="text-xs text-muted-foreground">({reviewsCount})</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "freeShipping",
    header: "Shipping",
    enableSorting: true,
    cell: ({ row }) => {
      const freeShipping = row.getValue("freeShipping") as number
      const flatRate = row.original.flatRate
      const multiShipping = row.original.multiShipping
      
      let shippingText = "—"
      if (freeShipping === 1) {
        shippingText = "Free"
      } else if (flatRate === 1) {
        shippingText = "Flat"
      } else if (multiShipping === 1) {
        shippingText = "Multi"
      }
      
      return <span className="text-sm">{shippingText}</span>
    },
  },
]

export default function ProductsTable({
  onView,
  onDelete,
  onBulkDelete,
  onAdd,
  refreshKey,
}: ProductsTableProps) {
  const [products, setProducts] = useState<ProductData[]>([])
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

  // Fetch products with server-side pagination and filtering
  const fetchProducts = useCallback(async (page: number = 1) => {
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
        'displayName': 'display_name',
        'productName': 'product_name',
        'productPrice': 'product_price',
        'productQtyLeft': 'product_qty_left',
        'hasOption': 'has_variants',
        'showOnWebsite': 'show_on_website',
        'productStatus': 'product_status',
        'freeShipping': 'free_shipping',
        'flatRate': 'flat_rate',
        'multiShipping': 'multi_shipping',
        'category_name': 'category_name',
      }
      
      Object.entries(debouncedColumnFilters).forEach(([columnId, value]) => {
        if (value && value.trim()) {
          const apiParam = columnFilterMap[columnId] || columnId.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          
          // Special handling for has_variants filter - convert text to 0/1
          if (apiParam === 'has_variants') {
            const lowerValue = value.trim().toLowerCase()
            if (lowerValue === 'yes' || lowerValue === 'true' || lowerValue === '1' || parseInt(lowerValue) > 0) {
              params.append(apiParam, '1')
            } else if (lowerValue === 'no' || lowerValue === 'false' || lowerValue === '0') {
              params.append(apiParam, '0')
            }
          } else {
            params.append(apiParam, value.trim())
          }
        }
      })

      // Add sorting parameters
      if (sorting.length > 0) {
        const columnSortMap: Record<string, string> = {
          'id': 'id',
          'displayName': 'display_name',
          'productName': 'product_name',
          'productPrice': 'product_price',
          'productQtyLeft': 'product_qty_left',
          'hasOption': 'has_option',
          'showOnWebsite': 'show_on_website',
          'productStatus': 'product_status',
          'freeShipping': 'free_shipping',
          'flatRate': 'flat_rate',
          'multiShipping': 'multi_shipping',
          'category_name': 'category_name',
        }
        
        sorting.forEach((sort) => {
          const apiColumn = columnSortMap[sort.id] || sort.id.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append('sort', `${apiColumn}:${sort.desc ? 'desc' : 'asc'}`)
        })
      }
      
      const apiUrl = `/api/products?${params.toString()}`
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ProductsTable] Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Map API response to match frontend interface
        const mappedProducts: ProductData[] = (data.products || []).map((product: ProductData & { categoryName?: string | null }) => ({
          ...product,
          category_name: product.categoryName || product.category_name || null,
        }))
        setProducts(mappedProducts)
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
        // console.log(`[ProductsTable] Loaded ${mappedProducts.length} products (page ${data.page || 1} of ${data.totalPages || 1})`)
      } else {
        console.error('[ProductsTable] API returned success:false', data)
        toast({
          title: "Error",
          description: data.error || "Failed to fetch products",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[ProductsTable] Error fetching products:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, pageSize, debouncedColumnFilters, sorting])

  useEffect(() => {
    fetchProducts(currentPage)
  }, [currentPage, fetchProducts, refreshKey])

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
  const lastClickProduct = useRef<ProductData | null>(null)

  const handleRowClick = (product: ProductData) => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTime.current
    
    // Check if this is a double-click (within 300ms and same product)
    if (
      timeSinceLastClick < 300 &&
      lastClickProduct.current?.id === product.id
    ) {
      // Double-click detected - open view dialog
      onView?.(product)
      lastClickTime.current = 0
      lastClickProduct.current = null
    } else {
      // Single click - update tracking
      lastClickTime.current = now
      lastClickProduct.current = product
    }
  }

  // const handleSelectionChange = (selectedProducts: ProductData[]) => {
  //   console.log("Selected products:", selectedProducts)
  // }

  // Define row actions
  const rowActions = [
    {
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: (product: ProductData) => {
        onView?.(product)
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (product: ProductData) => {
        onDelete?.(product)
      },
      variant: "destructive" as const,
    },
  ]

  // Define bulk actions
  const bulkActions = [
    {
      label: "Delete Selected",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (selectedProducts: ProductData[]) => {
        onBulkDelete?.(selectedProducts)
      },
      variant: "destructive" as const,
    },
  ]

  const endRecord = Math.min(currentPage * pageSize, total)

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow p-6 h-full min-h-0 overflow-hidden w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Products
          </h2>
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
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex flex-col flex-1 min-h-0 mt-4 overflow-hidden w-full max-w-full">
        <DataTable
          columns={columns}
          data={products}
          searchKey="displayName"
          searchPlaceholder="Search products by name..."
          enableRowSelection={true}
          enableGlobalFilter={false}
          enableColumnFilters={true}
          enableSorting={true}
          enablePagination={false}
          pageSize={pageSize}
          loading={loading}
          onRowClick={handleRowClick}
          // onSelectionChange={handleSelectionChange}
          title=""
          showAddButton={false}
          rowActions={rowActions}
          enableRowContextMenu={true}
          bulkActions={bulkActions}
          emptyMessage="No products found."
          onColumnFilterChange={handleColumnFilterChange}
          columnFilterValues={columnFilters}
          onSortingChange={setSorting}
          sortingValues={sorting}
          tableHeight="calc(100vh - 280px)"
          className="w-full max-w-full"
        />
      </div>
      
      {/* Pagination */}
      {(totalPages > 1 || total > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-2 mt-auto shrink-0 border-t border-gray-200 dark:border-gray-700 pt-3">
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
                fetchProducts(1)
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
                  fetchProducts(newPage)
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
                  fetchProducts(newPage)
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
                fetchProducts(totalPages)
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
