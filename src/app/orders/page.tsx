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
import { Eye, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { UpdateOrderStatus } from "./components/UpdateOrderStatus"
import { OrderDetails } from "./components/OrderDetails"

// Order Product type
interface OrderProduct {
  id: number;
  rOrderId: number;
  rProductId: number;
  productCode: string;
  productName: string;
  model: string | null;
  brand: number | null;
  providerPrice: number;
  productPrice: number;
  quantity: number;
  productCost: number | null;
  profit: number;
  productCondition: number | null;
  discount: number | null;
  shipping: number | null;
  mainImage?: string | null;
}

// Order data type
interface OrderData {
  id: number;
  rUserId: number;
  total: number;
  quantity: number;
  addressFirstName: string;
  addressLastName: string;
  addressCountryCode: string;
  addressPhoneNumber: string;
  address: string;
  country: string;
  city: string;
  state: string | null;
  routeName: string;
  buildingName: string;
  floorNumber: number;
  status: number;
  shippingAmount: number;
  isPaid: number;
  paymentType: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  // Enriched fields
  userName?: string | null;
  statusName?: string | null;
  paymentMethodName?: string | null;
  products?: OrderProduct[];
  [key: string]: unknown;
}

// Column definitions
const columns: ColumnDef<OrderData>[] = [
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
    accessorKey: "rUserId",
    header: "Customer",
    enableSorting: true,
    cell: ({ row }) => {
      const order = row.original
      const userName = order.userName
      const userId = order.rUserId
      
      return (
        <div className="text-sm">
          {userName || `User ${userId}`}
        </div>
      )
    },
  },
  {
    accessorKey: "addressFirstName",
    header: "Customer Name",
    enableSorting: true,
    cell: ({ row }) => {
      const order = row.original
      return (
        <div className="flex flex-col gap-1">
          <div className="font-medium">{order.addressFirstName} {order.addressLastName}</div>
          <div className="text-xs text-muted-foreground">{order.addressPhoneNumber}</div>
        </div>
      )
    },
  },
  {
    accessorKey: "total",
    header: "Total",
    enableSorting: true,
    cell: ({ row }) => {
      const total = row.getValue("total") as number
      const shippingAmount = row.original.shippingAmount
      const grandTotal = total + shippingAmount
      
      return (
        <div className="flex flex-col gap-1">
          <div className="font-medium">{grandTotal.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">
            Subtotal: {total.toFixed(2)} | Shipping: {shippingAmount.toFixed(2)}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    enableSorting: true,
    cell: ({ row }) => {
      const qty = row.getValue("quantity") as number
      return (
        <div className="text-center">
          <Badge variant="default" className="w-fit">
            {qty}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "products",
    header: "Items",
    enableSorting: false,
    cell: ({ row }) => {
      const order = row.original
      const products = order.products || []
      const itemsCount = products.length
      
      if (itemsCount === 0) {
        return (
          <div className="text-sm text-muted-foreground">—</div>
        )
      }

      return (
        <div className="text-center">
          <Badge variant="secondary" className="w-fit">
            {itemsCount} item{itemsCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: true,
    cell: ({ row }) => {
      const order = row.original
      const statusName = order.statusName
      const status = order.status
      
      // Status color mapping:
      // 9 - In Review: Yellow/Orange (pending)
      // 10 - Confirmed: Blue (confirmed)
      // 11 - Rejected: Red (error)
      // 12 - Ready: Cyan (ready)
      // 13 - Out for delivery: Purple (in transit)
      // 14 - Completed: Green (success)
      // 15 - Canceled: Red (error)
      const getStatusClassName = () => {
        switch (status) {
          case 9: // In Review
            return "w-fit bg-yellow-500 hover:bg-yellow-600 text-white border-transparent"
          case 10: // Confirmed
            return "w-fit bg-blue-500 hover:bg-blue-600 text-white border-transparent"
          case 11: // Rejected
            return "w-fit bg-red-500 hover:bg-red-600 text-white border-transparent"
          case 12: // Ready
            return "w-fit bg-cyan-500 hover:bg-cyan-600 text-white border-transparent"
          case 13: // Out for delivery
            return "w-fit bg-purple-500 hover:bg-purple-600 text-white border-transparent"
          case 14: // Completed
            return "w-fit bg-green-500 hover:bg-green-600 text-white border-transparent"
          case 15: // Canceled
            return "w-fit bg-red-500 hover:bg-red-600 text-white border-transparent"
          default:
            return "w-fit"
        }
      }
      
      return (
        <Badge variant="outline" className={getStatusClassName()}>
          {statusName || `Status ${status}`}
        </Badge>
      )
    },
  },
  {
    accessorKey: "isPaid",
    header: "Payment Status",
    enableSorting: true,
    cell: ({ row }) => {
      const isPaid = row.getValue("isPaid") as number
      return (
        <Badge variant={isPaid === 1 ? "default" : "destructive"} className="w-fit">
          {isPaid === 1 ? "Paid" : "Unpaid"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "paymentType",
    header: "Payment Method",
    enableSorting: true,
    cell: ({ row }) => {
      const order = row.original
      const paymentMethodName = order.paymentMethodName
      const paymentType = order.paymentType
      
      return (
        <div className="text-sm">
          {paymentMethodName || `Method ${paymentType}`}
        </div>
      )
    },
  },
  {
    accessorKey: "city",
    header: "Location",
    enableSorting: true,
    cell: ({ row }) => {
      const order = row.original
      return (
        <div className="text-sm">
          {order.city}, {order.country}
        </div>
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

export default function Orders() {
  const [orders, setOrders] = useState<OrderData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<OrderData | null>(null)
  const [ordersToDelete, setOrdersToDelete] = useState<OrderData[]>([])
  const [isBulkDelete, setIsBulkDelete] = useState(false)

  // Update status dialog state
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false)
  const [orderToUpdateStatus, setOrderToUpdateStatus] = useState<OrderData | null>(null)

  // Order details dialog state
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  // Fetch orders with server-side pagination and filtering
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

  const fetchOrders = useCallback(async (page: number = 1) => {
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
        'rUserId': 'r_user_id',
        'total': 'total',
        'quantity': 'quantity',
        'status': 'status',
        'isPaid': 'is_paid',
        'paymentType': 'payment_type',
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
          'rUserId': 'r_user_id',
          'total': 'total',
          'quantity': 'quantity',
          'status': 'status',
          'isPaid': 'is_paid',
          'paymentType': 'payment_type',
          'createdAt': 'created_at',
        }
        
        sorting.forEach((sort) => {
          const apiColumn = columnSortMap[sort.id] || sort.id.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append('sort', `${apiColumn}:${sort.desc ? 'desc' : 'asc'}`)
        })
      }
      
      // Add enriched parameter to get names
      params.append('enriched', 'true')
      
      const apiUrl = `/api/orders?${params.toString()}`
      console.log(`[Orders Page] Fetching orders from: ${apiUrl}`)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Orders Page] Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setOrders(data.orders || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
        console.log(`[Orders Page] Loaded ${data.orders?.length || 0} orders (page ${data.page || 1} of ${data.totalPages || 1})`)
      } else {
        console.error('[Orders Page] API returned success:false', data)
        toast({
          title: "Error",
          description: data.error || "Failed to fetch orders",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[Orders Page] Error fetching orders:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch orders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, pageSize, debouncedColumnFilters, sorting])

  useEffect(() => {
    fetchOrders(currentPage)
  }, [currentPage, fetchOrders])

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

  const handleRowClick = (order: OrderData) => {
    console.log("Order clicked:", order)
    // You can navigate to order details page here
    // router.push(`/orders/${order.id}`)
  }

  const handleSelectionChange = (selectedOrders: OrderData[]) => {
    console.log("Selected orders:", selectedOrders)
  }

  // Define row actions
  const rowActions = [
    {
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: (order: OrderData) => {
        setSelectedOrderId(order.id)
        setOrderDetailsOpen(true)
      },
    },
    {
      label: "Update Status",
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: (order: OrderData) => {
        setOrderToUpdateStatus(order)
        setUpdateStatusOpen(true)
      },
    },
    // {
    //   label: "Edit",
    //   icon: <Pencil className="h-4 w-4" />,
    //   onClick: (order: OrderData) => {
    //     console.log("Edit order:", order)
    //     toast({
    //       title: "Edit Order",
    //       description: `Editing order: #${order.id}`,
    //     })
    //     // Open edit modal or navigate to edit page
    //     // router.push(`/orders/${order.id}/edit`)
    //   },
    // },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (order: OrderData) => {
        setOrderToDelete(order)
        setOrdersToDelete([])
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
      onClick: (selectedOrders: OrderData[]) => {
        setOrdersToDelete(selectedOrders)
        setOrderToDelete(null)
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
      if (isBulkDelete && ordersToDelete.length > 0) {
        // Bulk delete
        const ids = ordersToDelete.map(order => order.id)
        const response = await fetch('/api/orders/bulk-delete', {
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
            description: `${ordersToDelete.length} orders deleted successfully`,
          })
          fetchOrders(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete orders",
            variant: "destructive",
          })
        }
      } else if (orderToDelete) {
        // Single delete
        const response = await fetch(`/api/orders/${orderToDelete.id}`, {
          method: 'DELETE',
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: "Success",
            description: "Order deleted successfully",
          })
          fetchOrders(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete order",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setOrderToDelete(null)
      setOrdersToDelete([])
      setIsBulkDelete(false)
    }
  }

  return (
    <div className="bg-background p-4 space-y-4">
      <DataTable
        columns={columns}
        data={orders}
        enableRowSelection={true}
        enableGlobalFilter={false}
        enableColumnFilters={true}
        enableSorting={true}
        enablePagination={false}
        pageSize={pageSize}
        loading={loading}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        title="Orders"
        showAddButton={false}
        rowActions={rowActions}
        enableRowContextMenu={true}
        bulkActions={bulkActions}
        emptyMessage="No orders found."
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
                fetchOrders(1)
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
                  fetchOrders(newPage)
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
                  fetchOrders(newPage)
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
                fetchOrders(totalPages)
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
        itemName={orderToDelete ? `Order #${orderToDelete.id}` : undefined}
        itemCount={ordersToDelete.length}
        isLoading={deleting}
        title={isBulkDelete ? `Delete ${ordersToDelete.length} orders?` : undefined}
        description={isBulkDelete ? undefined : undefined}
      />

      {/* Update Status Dialog */}
      <UpdateOrderStatus
        orderId={orderToUpdateStatus?.id || null}
        currentStatus={orderToUpdateStatus?.status || null}
        open={updateStatusOpen}
        onOpenChange={setUpdateStatusOpen}
        onSuccess={() => {
          fetchOrders(currentPage)
          setOrderToUpdateStatus(null)
        }}
      />

      {/* Order Details Dialog */}
      <OrderDetails
        orderId={selectedOrderId}
        open={orderDetailsOpen}
        onOpenChange={setOrderDetailsOpen}
      />
    </div>
  )
}
