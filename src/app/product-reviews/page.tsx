'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
import { Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Star, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// Product Review data type
interface ProductReviewData {
  id: number;
  rUserId: number;
  rProductId: number;
  rating: number;
  text: string | null;
  status: number;
  statusText?: string | null;
  userName?: string | null;
  productName?: string | null;
  lockedBy: number | null;
  createdBy: number;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  [key: string]: unknown;
}

// Column definitions
const columns: ColumnDef<ProductReviewData>[] = [
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
    accessorKey: "userName",
    header: "User",
    enableSorting: false,
    cell: ({ row }) => {
      const userName = row.original.userName
      const userId = row.original.rUserId
      return (
        <div className="text-sm">
          {userName ? (
            <div>{userName}</div>
          ) : (
            <div className="text-muted-foreground">User #{userId}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "productName",
    header: "Product",
    enableSorting: false,
    cell: ({ row }) => {
      const productName = row.original.productName
      const productId = row.original.rProductId
      return (
        <div className="text-sm max-w-md">
          {productName ? (
            <div className="truncate" title={productName}>
              {productName}
            </div>
          ) : (
            <div className="text-muted-foreground">Product #{productId}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "rating",
    header: "Rating",
    enableSorting: true,
    cell: ({ row }) => {
      const rating = row.getValue("rating") as number
      return (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="font-medium">{rating}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "text",
    header: "Review Text",
    enableSorting: false,
    cell: ({ row }) => {
      const text = row.getValue("text") as string | null
      return (
        <div className="max-w-md text-sm">
          {text ? (
            <div className="truncate" title={text}>
              {text}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: true,
    cell: ({ row }) => {
      const statusText = row.original.statusText || null
      const status = row.getValue("status") as number
      
      // Use statusText from ag_list_options if available, otherwise fallback to status ID
      const statusLabel = statusText || `Status ${status}`
      let statusVariant: "default" | "secondary" | "destructive" = "secondary"
      
      // Map common status texts to badge variants
      if (statusText) {
        const lowerText = statusText.toLowerCase()
        if (lowerText.includes('pending') || lowerText.includes('waiting')) {
          statusVariant = "secondary"
        } else if (lowerText.includes('confirmed') || lowerText.includes('accepted') || lowerText.includes('approved')) {
          statusVariant = "default"
        } else if (lowerText.includes('rejected') || lowerText.includes('declined') || lowerText.includes('cancelled')) {
          statusVariant = "destructive"
        }
      }
      
      return (
        <Badge variant={statusVariant} className="w-fit">
          {statusLabel}
        </Badge>
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
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue("updatedAt") as Date | null
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

export default function ProductReviews() {
  const [reviews, setReviews] = useState<ProductReviewData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reviewToDelete, setReviewToDelete] = useState<ProductReviewData | null>(null)
  const [reviewsToDelete, setReviewsToDelete] = useState<ProductReviewData[]>([])
  const [isBulkDelete, setIsBulkDelete] = useState(false)

  // Update status dialog state
  const [updateStatusDialogOpen, setUpdateStatusDialogOpen] = useState(false)
  const [reviewToUpdate, setReviewToUpdate] = useState<ProductReviewData | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [statusOptions, setStatusOptions] = useState<Array<{ id: number; text: string }>>([])
  const [loadingStatusOptions, setLoadingStatusOptions] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Fetch reviews with server-side pagination and filtering
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

  const fetchReviews = useCallback(async (page: number = 1) => {
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
        'rUserId': 'r_user_id',
        'rProductId': 'r_product_id',
        'rating': 'rating',
        'status': 'status',
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
          'rUserId': 'r_user_id',
          'rProductId': 'r_product_id',
          'rating': 'rating',
          'status': 'status',
          'createdAt': 'created_at',
          'updatedAt': 'updated_at',
        }
        
        sorting.forEach((sort) => {
          const apiColumn = columnSortMap[sort.id] || sort.id.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append('sort', `${apiColumn}:${sort.desc ? 'desc' : 'asc'}`)
        })
      }
      
      const apiUrl = `/api/product-reviews?${params.toString()}`
      console.log(`[Product Reviews Page] Fetching reviews from: ${apiUrl}`)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Product Reviews Page] Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setReviews(data.reviews || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
        console.log(`[Product Reviews Page] Loaded ${data.reviews?.length || 0} reviews (page ${data.page || 1} of ${data.totalPages || 1})`)
      } else {
        console.error('[Product Reviews Page] API returned success:false', data)
        toast({
          title: "Error",
          description: data.error || "Failed to fetch product reviews",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[Product Reviews Page] Error fetching reviews:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch product reviews",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, pageSize, debouncedColumnFilters, sorting])

  useEffect(() => {
    fetchReviews(currentPage)
  }, [currentPage, fetchReviews])

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

  const handleRowClick = (review: ProductReviewData) => {
    console.log("Product review clicked:", review)
  }

  const handleSelectionChange = (selectedReviews: ProductReviewData[]) => {
    console.log("Selected reviews:", selectedReviews)
  }

  // Fetch status options
  const fetchStatusOptions = useCallback(async () => {
    setLoadingStatusOptions(true)
    try {
      const response = await fetch('/api/list-options?id=6&page=1&q=')
      if (response.ok) {
        const data = await response.json()
        setStatusOptions(data.results || [])
      }
    } catch (error) {
      console.error('Error fetching status options:', error)
    } finally {
      setLoadingStatusOptions(false)
    }
  }, [])

  // Open update status dialog
  const handleUpdateStatusClick = (review: ProductReviewData) => {
    setReviewToUpdate(review)
    setSelectedStatus(review.status.toString())
    setUpdateStatusDialogOpen(true)
    fetchStatusOptions()
  }

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!reviewToUpdate || !selectedStatus) {
      console.error('Missing reviewToUpdate or selectedStatus:', { reviewToUpdate, selectedStatus })
      return
    }

    setUpdatingStatus(true)
    try {
      const reviewId = reviewToUpdate.id
      console.log('Updating review status:', { reviewId, selectedStatus })
      
      const response = await fetch(`/api/product-reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: parseInt(selectedStatus),
        }),
      })
      
      console.log('Update response status:', response.status)

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Product review status updated successfully",
        })
        setUpdateStatusDialogOpen(false)
        setReviewToUpdate(null)
        setSelectedStatus("")
        fetchReviews(currentPage) // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update product review status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Error",
        description: "Failed to update product review status",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Define row actions
  const rowActions = [
    {
      label: "Update Status",
      icon: <Edit className="h-4 w-4" />,
      onClick: handleUpdateStatusClick,
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (review: ProductReviewData) => {
        setReviewToDelete(review)
        setReviewsToDelete([])
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
      onClick: (selectedReviews: ProductReviewData[]) => {
        setReviewsToDelete(selectedReviews)
        setReviewToDelete(null)
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
      if (isBulkDelete && reviewsToDelete.length > 0) {
        // Bulk delete
        const ids = reviewsToDelete.map(review => review.id)
        const response = await fetch('/api/product-reviews/bulk-delete', {
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
            description: `${reviewsToDelete.length} product reviews deleted successfully`,
          })
          fetchReviews(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete product reviews",
            variant: "destructive",
          })
        }
      } else if (reviewToDelete) {
        // Single delete
        const response = await fetch(`/api/product-reviews/${reviewToDelete.id}`, {
          method: 'DELETE',
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: "Success",
            description: "Product review deleted successfully",
          })
          fetchReviews(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete product review",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error deleting product review:', error)
      toast({
        title: "Error",
        description: "Failed to delete product review",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setReviewToDelete(null)
      setReviewsToDelete([])
      setIsBulkDelete(false)
    }
  }

  return (
    <div className="bg-background p-4 space-y-4">
      <DataTable
        columns={columns}
        data={reviews}
        enableRowSelection={true}
        enableGlobalFilter={false}
        enableColumnFilters={true}
        enableSorting={true}
        enablePagination={false}
        pageSize={pageSize}
        loading={loading}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        title="Product Reviews"
        showAddButton={false}
        rowActions={rowActions}
        enableRowContextMenu={true}
        bulkActions={bulkActions}
        emptyMessage="No product reviews found."
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
                fetchReviews(1)
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
                  fetchReviews(newPage)
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
                  fetchReviews(newPage)
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
                fetchReviews(totalPages)
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
        itemName={reviewToDelete ? `Review #${reviewToDelete.id}` : undefined}
        itemCount={reviewsToDelete.length}
        isLoading={deleting}
        title={isBulkDelete ? `Delete ${reviewsToDelete.length} product reviews?` : undefined}
        description={isBulkDelete ? undefined : undefined}
      />

      {/* Update Status Dialog */}
      <Dialog open={updateStatusDialogOpen} onOpenChange={setUpdateStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Update the status for review #{reviewToUpdate?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
                disabled={loadingStatusOptions || updatingStatus}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder={loadingStatusOptions ? "Loading..." : "Select status"} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id.toString()}>
                      {option.text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpdateStatusDialogOpen(false)
                setReviewToUpdate(null)
                setSelectedStatus("")
              }}
              disabled={updatingStatus}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={!selectedStatus || updatingStatus || loadingStatusOptions}
            >
              {updatingStatus ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
