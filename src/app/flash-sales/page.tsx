'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { FlashSalesForm } from "./components/FlashSalesForm"
import { ViewForm } from "./components/ViewForm"

// Flash Sale data type
interface FlashSaleData {
  id: number;
  title: string;
  slug: string;
  color1: string;
  color2: string;
  color3: string;
  endTime: Date | null;
  display: number;
  sliderType: number;
  rStoreId: number;
  discount: number;
  orderNumber: number;
  lockedBy: number | null;
  createdBy: number;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  [key: string]: unknown;
}

// Column definitions
const columns: ColumnDef<FlashSaleData>[] = [
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
    accessorKey: "title",
    header: "Title",
    enableSorting: true,
    cell: ({ row }) => {
      const flashSale = row.original
      return (
        <div className="flex flex-col gap-1">
          <div className="font-medium">{flashSale.title}</div>
          {flashSale.slug ? (
            <div className="text-xs text-muted-foreground">/{flashSale.slug}</div>
          ) : null}
        </div>
      )
    },
  },
  {
    accessorKey: "discount",
    header: "Discount",
    enableSorting: true,
    cell: ({ row }) => {
      const discount = row.getValue("discount") as number
      return (
        <div className="text-center">
          <Badge variant="default" className="w-fit">
            {discount}%
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "orderNumber",
    header: "Order",
    enableSorting: true,
    cell: ({ row }) => {
      const orderNumber = row.getValue("orderNumber") as number
      return (
        <div className="text-center">
          <Badge variant="secondary" className="w-fit">
            {orderNumber}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "display",
    header: "Display",
    enableSorting: true,
    cell: ({ row }) => {
      const display = row.getValue("display") as number
      return (
        <Badge variant={display === 1 ? "default" : "secondary"} className="w-fit">
          {display === 1 ? "True" : "False"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "sliderType",
    header: "Type",
    enableSorting: true,
    cell: ({ row }) => {
      const sliderType = row.getValue("sliderType") as number
      return (
        <Badge variant={sliderType === 1 ? "default" : "outline"} className="w-fit">
          {sliderType === 1 ? "Swiper" : "Grid"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "endTime",
    header: "End Time",
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue("endTime") as Date | null
      if (!date) return <div className="text-sm">—</div>
      const formattedDate = new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      return (
        <div className="text-sm">{formattedDate}</div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date | null
      if (!date) return <div className="text-sm">—</div>
      const formattedDate = new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      return (
        <div className="text-sm">{formattedDate}</div>
      )
    },
  },
]

export default function FlashSales() {
  const [flashSales, setFlashSales] = useState<FlashSaleData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [flashSaleToDelete, setFlashSaleToDelete] = useState<FlashSaleData | null>(null)
  const [flashSalesToDelete, setFlashSalesToDelete] = useState<FlashSaleData[]>([])
  const [isBulkDelete, setIsBulkDelete] = useState(false)

  // Flash sale form dialog state
  const [flashSaleFormOpen, setFlashSaleFormOpen] = useState(false)
  const [flashSaleToEdit, setFlashSaleToEdit] = useState<FlashSaleData | null>(null)

  // View dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [flashSaleToView, setFlashSaleToView] = useState<FlashSaleData | null>(null)

  // Fetch flash sales with server-side pagination and filtering
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

  const fetchFlashSales = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })

      // Add column filters (from header filters)
      const columnFilterMap: Record<string, string> = {
        'id': 'id',
        'title': 'title',
        'discount': 'discount',
        'orderNumber': 'order_number',
        'display': 'display',
        'sliderType': 'slider_type',
      }
      
      Object.entries(debouncedColumnFilters).forEach(([columnId, value]) => {
        if (value && value.trim()) {
          const apiParam = columnFilterMap[columnId] || columnId.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append(apiParam, value.trim())
        }
      })

      // Add sorting parameters
      if (sorting.length > 0) {
        const columnSortMap: Record<string, string> = {
          'id': 'id',
          'title': 'title',
          'discount': 'discount',
          'orderNumber': 'order_number',
          'display': 'display',
          'sliderType': 'slider_type',
          'endTime': 'end_time',
          'createdAt': 'created_at',
          'updatedAt': 'updated_at',
        }
        
        sorting.forEach((sort) => {
          const apiColumn = columnSortMap[sort.id] || sort.id.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append('sort', `${apiColumn}:${sort.desc ? 'desc' : 'asc'}`)
        })
      }
      
      const apiUrl = `/api/flash-sales?${params.toString()}`
      console.log(`[Flash Sales Page] Fetching flash sales from: ${apiUrl}`)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Flash Sales Page] Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setFlashSales(data.flashSales || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
        console.log(`[Flash Sales Page] Loaded ${data.flashSales?.length || 0} flash sales (page ${data.page || 1} of ${data.totalPages || 1})`)
      } else {
        console.error('[Flash Sales Page] API returned success:false', data)
        toast({
          title: "Error",
          description: data.error || "Failed to fetch flash sales",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[Flash Sales Page] Error fetching flash sales:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch flash sales",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, pageSize, debouncedColumnFilters, sorting])

  useEffect(() => {
    fetchFlashSales(currentPage)
  }, [currentPage, fetchFlashSales])

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
  const lastClickFlashSale = useRef<FlashSaleData | null>(null)

  const handleRowClick = (flashSale: FlashSaleData) => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTime.current
    
    // Check if this is a double-click (within 300ms and same flash sale)
    if (
      timeSinceLastClick < 300 &&
      lastClickFlashSale.current?.id === flashSale.id
    ) {
      // Double-click detected - open view dialog
      setFlashSaleToView(flashSale)
      setViewDialogOpen(true)
      lastClickTime.current = 0 // Reset to prevent triple-click issues
      lastClickFlashSale.current = null
    } else {
      // Single click - update tracking
      lastClickTime.current = now
      lastClickFlashSale.current = flashSale
    }
  }

  const handleSelectionChange = (selectedFlashSales: FlashSaleData[]) => {
    console.log("Selected flash sales:", selectedFlashSales)
  }

  // Define row actions
  const rowActions = [
    {
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: (flashSale: FlashSaleData) => {
        setFlashSaleToView(flashSale)
        setViewDialogOpen(true)
      },
    },
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: (flashSale: FlashSaleData) => {
        setFlashSaleToEdit(flashSale)
        setFlashSaleFormOpen(true)
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (flashSale: FlashSaleData) => {
        setFlashSaleToDelete(flashSale)
        setFlashSalesToDelete([])
        setIsBulkDelete(false)
        setDeleteDialogOpen(true)
      },
      variant: "destructive" as const,
    },
  ]

  // Define bulk actions
  const bulkActions = [
    {
      label: "Delete Selected",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (selectedFlashSales: FlashSaleData[]) => {
        setFlashSalesToDelete(selectedFlashSales)
        setFlashSaleToDelete(null)
        setIsBulkDelete(true)
        setDeleteDialogOpen(true)
      },
      variant: "destructive" as const,
    },
  ]

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      if (isBulkDelete && flashSalesToDelete.length > 0) {
        // Bulk delete
        const ids = flashSalesToDelete.map(flashSale => flashSale.id)
        const response = await fetch('/api/flash-sales/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids }),
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: "Success",
            description: `${flashSalesToDelete.length} flash sales deleted successfully`,
          })
          fetchFlashSales(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete flash sales",
            variant: "destructive",
          })
        }
      } else if (flashSaleToDelete) {
        // Single delete
        const response = await fetch(`/api/flash-sales/${flashSaleToDelete.id}`, {
          method: 'DELETE',
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: "Success",
            description: "Flash sale deleted successfully",
          })
          fetchFlashSales(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete flash sale",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error deleting flash sale:', error)
      toast({
        title: "Error",
        description: "Failed to delete flash sale",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setFlashSaleToDelete(null)
      setFlashSalesToDelete([])
      setIsBulkDelete(false)
    }
  }

  return (
    <div className="bg-background p-4 space-y-4">
      <DataTable
        columns={columns}
        data={flashSales}
        enableRowSelection={true}
        enableGlobalFilter={false}
        enableColumnFilters={true}
        enableSorting={true}
        enablePagination={false}
        pageSize={pageSize}
        loading={loading}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        title="Flash Sales"
        showAddButton={true}
        onAdd={() => {
          setFlashSaleToEdit(null)
          setFlashSaleFormOpen(true)
        }}
        addButtonLabel="Add Flash Sale"
        rowActions={rowActions}
        enableRowContextMenu={true}
        bulkActions={bulkActions}
        emptyMessage="No flash sales found."
        onColumnFilterChange={handleColumnFilterChange}
        columnFilterValues={columnFilters}
        onSortingChange={setSorting}
        sortingValues={sorting}
      />
      
      {/* Server-side pagination controls */}
      {(totalPages > 1 || total > 0) && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} entries
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(Number.parseInt(value))}
              >
                <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-input/30">
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
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(1)
                fetchFlashSales(1)
              }}
              disabled={currentPage === 1 || loading}
              className="h-8 w-8 p-0 bg-white dark:bg-input/30"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage > 1) {
                  const newPage = currentPage - 1
                  setCurrentPage(newPage)
                  fetchFlashSales(newPage)
                }
              }}
              disabled={currentPage === 1 || loading}
              className="h-8 w-8 p-0 bg-white dark:bg-input/30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage < totalPages) {
                  const newPage = currentPage + 1
                  setCurrentPage(newPage)
                  fetchFlashSales(newPage)
                }
              }}
              disabled={currentPage === totalPages || loading}
              className="h-8 w-8 p-0 bg-white dark:bg-input/30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(totalPages)
                fetchFlashSales(totalPages)
              }}
              disabled={currentPage === totalPages || loading}
              className="h-8 w-8 p-0 bg-white dark:bg-input/30"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        variant={isBulkDelete ? 'bulk' : 'single'}
        itemName={flashSaleToDelete?.title}
        itemCount={flashSalesToDelete.length}
        isLoading={deleting}
        title={isBulkDelete ? `Delete ${flashSalesToDelete.length} flash sales?` : undefined}
        description={isBulkDelete ? undefined : undefined}
      />

      {/* Flash Sale Form Dialog */}
      <FlashSalesForm
        open={flashSaleFormOpen}
        onOpenChange={setFlashSaleFormOpen}
        flashSaleId={flashSaleToEdit?.id || null}
        onSuccess={() => {
          fetchFlashSales(currentPage)
          setFlashSaleToEdit(null)
        }}
      />

      {/* View Flash Sale Dialog */}
      <ViewForm
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        flashSale={flashSaleToView}
      />
    </div>
  )
}
