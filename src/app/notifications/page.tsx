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
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { NotificationForm } from "./components/NotificationForm"
import { ViewNotification } from "./components/ViewNotification"

// Table mapping based on table_id values
const TABLE_OPTIONS = [
  { id: 136, label: 'Brand', table: 'brand', field: 'brand_name' },
  { id: 137, label: 'Category', table: 'category', field: 'category_name' },
  { id: 154, label: 'Products', table: 'product', field: 'product_name' },
  { id: 155, label: 'Product Sections', table: 'product_sections', field: 'section_name' },
  { id: 159, label: 'Flash Sales', table: 'flash_sales', field: 'title' },
];

// Notification data type
interface NotificationData {
  id: number;
  rUserId: number | null;
  isSeen: number;
  subject: string;
  body: string;
  tableId: number | null;
  rowId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  // Enriched fields (optional, populated when available)
  userName?: string | null;
  tableName?: string | null;
  targetFieldName?: string | null;
  [key: string]: unknown; // Allow other properties
}

// Column definitions
const columns: ColumnDef<NotificationData>[] = [
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
    accessorKey: "subject",
    header: "Subject",
    enableSorting: true,
    cell: ({ row }) => {
      const subject = row.getValue("subject") as string
      return (
        <div className="font-medium max-w-[300px] truncate" title={subject}>
          {subject}
        </div>
      )
    },
  },
  {
    accessorKey: "body",
    header: "Body",
    enableSorting: false,
    cell: ({ row }) => {
      const body = row.getValue("body") as string
      const truncatedBody = body.length > 100 ? `${body.substring(0, 100)}...` : body
      return (
        <div className="text-sm text-muted-foreground max-w-[400px] truncate" title={body}>
          {truncatedBody}
        </div>
      )
    },
  },
  {
    accessorKey: "rUserId",
    header: "Target User",
    enableSorting: true,
    cell: ({ row }) => {
      const notification = row.original
      const userName = notification.userName
      const userId = notification.rUserId
      
      if (!userId) {
        return (
          <Badge variant="default" className="w-fit">
            All Users
          </Badge>
        )
      }
      
      return (
        <div className="text-sm">
          {userName || `User ${userId}`}
        </div>
      )
    },
  },
  {
    accessorKey: "tableId",
    header: "Target Table",
    enableSorting: true,
    cell: ({ row }) => {
      const notification = row.original
      const tableName = notification.tableName
      const tableId = notification.tableId
      
      if (!tableId) {
        return <div className="text-sm text-muted-foreground">—</div>
      }
      
      return (
        <div className="text-sm">
          {tableName || TABLE_OPTIONS.find(t => t.id === tableId)?.label || `Table ${tableId}`}
        </div>
      )
    },
  },
  {
    accessorKey: "rowId",
    header: "Target Field",
    enableSorting: true,
    cell: ({ row }) => {
      const notification = row.original
      const targetFieldName = notification.targetFieldName
      const rowId = notification.rowId
      
      if (!rowId) {
        return <div className="text-sm text-muted-foreground">—</div>
      }
      
      return (
        <div className="text-sm max-w-[200px] truncate" title={targetFieldName || `Item ${rowId}`}>
          {targetFieldName || `Item ${rowId}`}
        </div>
      )
    },
  },
  {
    accessorKey: "isSeen",
    header: "Status",
    enableSorting: true,
    cell: ({ row }) => {
      const isSeen = row.getValue("isSeen") as number
      return (
        <Badge variant={isSeen === 1 ? "default" : "secondary"} className="w-fit">
          {isSeen === 1 ? "Seen" : "Unread"}
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
]

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  
  // Form dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNotificationId, setEditingNotificationId] = useState<number | null>(null)
  
  // View dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingNotificationId, setViewingNotificationId] = useState<number | null>(null)
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [notificationToDelete, setNotificationToDelete] = useState<NotificationData | null>(null)
  const [notificationsToDelete, setNotificationsToDelete] = useState<NotificationData[]>([])
  const [isBulkDelete, setIsBulkDelete] = useState(false)

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

  // Fetch notifications with server-side pagination and filtering
  const fetchNotifications = useCallback(async (page: number = 1) => {
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
        'subject': 'subject',
        'rUserId': 'r_user_id',
        'tableId': 'table_id',
        'rowId': 'row_id',
        'isSeen': 'is_seen',
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
          'subject': 'subject',
          'rUserId': 'r_user_id',
          'tableId': 'table_id',
          'rowId': 'row_id',
          'isSeen': 'is_seen',
          'createdAt': 'created_at',
        }
        
        sorting.forEach((sort) => {
          const apiColumn = columnSortMap[sort.id] || sort.id.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append('sort', `${apiColumn}:${sort.desc ? 'desc' : 'asc'}`)
        })
      }
      
      // Add enriched parameter to get names
      params.append('enriched', 'true')
      
      const apiUrl = `/api/notifications?${params.toString()}`
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Notifications Page] Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setNotifications(data.notifications || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
        console.log(`[Notifications Page] Loaded ${data.notifications?.length || 0} notifications (page ${data.page || 1} of ${data.totalPages || 1})`)
      } else {
        console.error('[Notifications Page] API returned success:false', data)
        toast({
          title: "Error",
          description: data.error || "Failed to fetch notifications",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[Notifications Page] Error fetching notifications:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch notifications",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, pageSize, debouncedColumnFilters, sorting])

  useEffect(() => {
    fetchNotifications(currentPage)
  }, [currentPage, fetchNotifications])

  // Reset to page 1 when pageSize, column filters, or sorting change
  useEffect(() => {
    setCurrentPage(1)
  }, [pageSize, debouncedColumnFilters, sorting])

  // Handle column filter change (from header filters)
  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => {
      // Check if trimmed value is empty to decide whether to keep or remove filter
      // But store the original value (with spaces) to allow multi-word searches
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
  const lastClickNotification = useRef<NotificationData | null>(null)

  const handleRowClick = (notification: NotificationData) => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTime.current
    
    // Check if this is a double-click (within 300ms and same notification)
    if (
      timeSinceLastClick < 300 &&
      lastClickNotification.current?.id === notification.id
    ) {
      // Double-click detected - open view dialog
      setViewingNotificationId(notification.id)
      setViewDialogOpen(true)
      lastClickTime.current = 0 // Reset to prevent triple-click issues
      lastClickNotification.current = null
    } else {
      // Single click - update tracking
      lastClickTime.current = now
      lastClickNotification.current = notification
    }
  }

  const handleSelectionChange = (selectedNotifications: NotificationData[]) => {
    console.log("Selected notifications:", selectedNotifications)
  }

  // Define row actions
  const rowActions = [
    {
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: (notification: NotificationData) => {
        setViewingNotificationId(notification.id)
        setViewDialogOpen(true)
      },
    },
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: (notification: NotificationData) => {
        setEditingNotificationId(notification.id)
        setDialogOpen(true)
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (notification: NotificationData) => {
        setNotificationToDelete(notification)
        setNotificationsToDelete([])
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
      onClick: (selectedNotifications: NotificationData[]) => {
        setNotificationsToDelete(selectedNotifications)
        setNotificationToDelete(null)
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
      if (isBulkDelete && notificationsToDelete.length > 0) {
        // Bulk delete
        const ids = notificationsToDelete.map(notif => notif.id)
        const response = await fetch('/api/notifications/bulk-delete', {
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
            description: `${notificationsToDelete.length} notifications deleted successfully`,
          })
          fetchNotifications(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete notifications",
            variant: "destructive",
          })
        }
      } else if (notificationToDelete) {
        // Single delete
        const response = await fetch(`/api/notifications/${notificationToDelete.id}`, {
          method: 'DELETE',
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: "Success",
            description: "Notification deleted successfully",
          })
          fetchNotifications(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete notification",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setNotificationToDelete(null)
      setNotificationsToDelete([])
      setIsBulkDelete(false)
    }
  }

  return (
    <div className="bg-background p-4 space-y-4">
      <DataTable
        columns={columns}
        data={notifications}
        searchKey="subject"
        searchPlaceholder="Search notifications by subject..."
        enableRowSelection={true}
        enableGlobalFilter={false}
        enableColumnFilters={true}
        enableSorting={true}
        enablePagination={false}
        pageSize={pageSize}
        loading={loading}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        title="Notifications"
        showAddButton={true}
        onAdd={() => {
          setEditingNotificationId(null)
          setDialogOpen(true)
        }}
        addButtonLabel="Add Notification"
        rowActions={rowActions}
        enableRowContextMenu={true}
        bulkActions={bulkActions}
        emptyMessage="No notifications found."
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
                fetchNotifications(1)
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
                  fetchNotifications(newPage)
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
                  fetchNotifications(newPage)
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
                fetchNotifications(totalPages)
              }}
              disabled={currentPage === totalPages || loading}
              className="h-8 w-8 p-0 bg-white dark:bg-input/30"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Notification Form Dialog */}
      <NotificationForm
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingNotificationId(null)
          }
        }}
        notificationId={editingNotificationId}
        onSuccess={() => {
          fetchNotifications(currentPage) // Refresh the list
        }}
      />

      {/* View Notification Dialog */}
      <ViewNotification
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open)
          if (!open) {
            setViewingNotificationId(null)
          }
        }}
        notificationId={viewingNotificationId}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        variant={isBulkDelete ? 'bulk' : 'single'}
        itemName={notificationToDelete?.subject}
        itemCount={notificationsToDelete.length}
        isLoading={deleting}
        title={isBulkDelete ? `Delete ${notificationsToDelete.length} notifications?` : undefined}
        description={isBulkDelete ? undefined : undefined}
      />
    </div>
  )
}
