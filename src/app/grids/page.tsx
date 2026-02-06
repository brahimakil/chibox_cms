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
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Image } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { GridForm } from "./components/GridForm"

// Grid data type
interface GridData {
  id: number;
  rStoreId: number | null;
  rSectionId: number | null;
  isMain: number;
  type: string;
  categoryId: number | null;
  brandId: number | null;
  lockedBy: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  [key: string]: unknown;
}

// Column definitions
const columns: ColumnDef<GridData>[] = [
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
    accessorKey: "type",
    header: "Type",
    enableSorting: true,
    cell: ({ row }) => {
      const type = row.getValue("type") as string
      return (
        <div className="font-medium">{type}</div>
      )
    },
  },
  {
    accessorKey: "isMain",
    header: "Is Main",
    enableSorting: true,
    cell: ({ row }) => {
      const isMain = row.getValue("isMain") as number
      return (
        <Badge variant={isMain === 1 ? "default" : "secondary"} className="w-fit">
          {isMain === 1 ? "Yes" : "No"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "rStoreId",
    header: "Store ID",
    enableSorting: true,
    cell: ({ row }) => {
      const storeId = row.getValue("rStoreId") as number | null
      return (
        <div className="text-sm">{storeId || "—"}</div>
      )
    },
  },
  {
    accessorKey: "rSectionId",
    header: "Section ID",
    enableSorting: true,
    cell: ({ row }) => {
      const sectionId = row.getValue("rSectionId") as number | null
      return (
        <div className="text-sm">{sectionId || "—"}</div>
      )
    },
  },
  {
    accessorKey: "categoryId",
    header: "Category ID",
    enableSorting: true,
    cell: ({ row }) => {
      const categoryId = row.getValue("categoryId") as number | null
      return (
        <div className="text-sm">{categoryId || "—"}</div>
      )
    },
  },
  {
    accessorKey: "brandId",
    header: "Brand ID",
    enableSorting: true,
    cell: ({ row }) => {
      const brandId = row.getValue("brandId") as number | null
      return (
        <div className="text-sm">{brandId || "—"}</div>
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

export default function Grids() {
  const router = useRouter()
  const [grids, setGrids] = useState<GridData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [gridToDelete, setGridToDelete] = useState<GridData | null>(null)
  const [gridsToDelete, setGridsToDelete] = useState<GridData[]>([])
  const [isBulkDelete, setIsBulkDelete] = useState(false)

  // Grid form dialog state
  const [gridFormOpen, setGridFormOpen] = useState(false)
  const [gridToEdit, setGridToEdit] = useState<GridData | null>(null)

  // Fetch grids with server-side pagination and filtering
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

  const fetchGrids = useCallback(async (page: number = 1) => {
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
        'type': 'type',
        'isMain': 'is_main',
        'rStoreId': 'r_store_id',
        'rSectionId': 'r_section_id',
        'categoryId': 'category_id',
        'brandId': 'brand_id',
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
          'type': 'type',
          'isMain': 'is_main',
          'rStoreId': 'r_store_id',
          'rSectionId': 'r_section_id',
          'categoryId': 'category_id',
          'brandId': 'brand_id',
          'createdAt': 'created_at',
          'updatedAt': 'updated_at',
        }
        
        sorting.forEach((sort) => {
          const apiColumn = columnSortMap[sort.id] || sort.id.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append('sort', `${apiColumn}:${sort.desc ? 'desc' : 'asc'}`)
        })
      }
      
      const apiUrl = `/api/grids?${params.toString()}`
      console.log(`[Grids Page] Fetching grids from: ${apiUrl}`)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Grids Page] Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setGrids(data.grids || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
        console.log(`[Grids Page] Loaded ${data.grids?.length || 0} grids (page ${data.page || 1} of ${data.totalPages || 1})`)
      } else {
        console.error('[Grids Page] API returned success:false', data)
        toast({
          title: "Error",
          description: data.error || "Failed to fetch grids",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[Grids Page] Error fetching grids:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch grids",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, pageSize, debouncedColumnFilters, sorting])

  useEffect(() => {
    fetchGrids(currentPage)
  }, [currentPage, fetchGrids])

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

  const handleRowClick = (grid: GridData) => {
    console.log("Grid clicked:", grid)
  }

  const handleSelectionChange = (selectedGrids: GridData[]) => {
    console.log("Selected grids:", selectedGrids)
  }

  // Define row actions
  const rowActions = [
    {
      label: "Manage Banners",
      icon: <Image className="h-4 w-4" />,
      onClick: (grid: GridData) => {
        router.push(`/grids/${grid.id}/elements`)
      },
    },
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: (grid: GridData) => {
        setGridToEdit(grid)
        setGridFormOpen(true)
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (grid: GridData) => {
        setGridToDelete(grid)
        setGridsToDelete([])
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
      onClick: (selectedGrids: GridData[]) => {
        setGridsToDelete(selectedGrids)
        setGridToDelete(null)
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
      if (isBulkDelete && gridsToDelete.length > 0) {
        // Bulk delete
        const ids = gridsToDelete.map(grid => grid.id)
        const response = await fetch('/api/grids/bulk-delete', {
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
            description: `${gridsToDelete.length} grids deleted successfully`,
          })
          fetchGrids(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete grids",
            variant: "destructive",
          })
        }
      } else if (gridToDelete) {
        // Single delete
        const response = await fetch(`/api/grids/${gridToDelete.id}`, {
          method: 'DELETE',
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: "Success",
            description: "Grid deleted successfully",
          })
          fetchGrids(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete grid",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error deleting grid:', error)
      toast({
        title: "Error",
        description: "Failed to delete grid",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setGridToDelete(null)
      setGridsToDelete([])
      setIsBulkDelete(false)
    }
  }

  return (
    <div className="bg-background p-4 space-y-4">
      <DataTable
        columns={columns}
        data={grids}
        enableRowSelection={true}
        enableGlobalFilter={false}
        enableColumnFilters={true}
        enableSorting={true}
        enablePagination={false}
        pageSize={pageSize}
        loading={loading}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        title="Grids"
        showAddButton={true}
        onAdd={() => {
          setGridToEdit(null)
          setGridFormOpen(true)
        }}
        addButtonLabel="Add Grid"
        rowActions={rowActions}
        enableRowContextMenu={true}
        bulkActions={bulkActions}
        emptyMessage="No grids found."
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
                fetchGrids(1)
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
                  fetchGrids(newPage)
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
                  fetchGrids(newPage)
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
                fetchGrids(totalPages)
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
        itemName={gridToDelete ? `Grid ${gridToDelete.type}` : undefined}
        itemCount={gridsToDelete.length}
        isLoading={deleting}
        title={isBulkDelete ? `Delete ${gridsToDelete.length} grids?` : undefined}
        description={isBulkDelete ? undefined : undefined}
      />

      {/* Grid Form Dialog */}
      <GridForm
        open={gridFormOpen}
        onOpenChange={setGridFormOpen}
        gridId={gridToEdit?.id || null}
        onSuccess={() => {
          fetchGrids(currentPage)
          setGridToEdit(null)
        }}
      />
    </div>
  )
}
