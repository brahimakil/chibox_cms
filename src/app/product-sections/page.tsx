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
import { Eye, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { ProductSectionForm } from "./components/ProductSectionFrom"

// Product Section data type
interface ProductSectionData {
  id: number;
  sectionName: string;
  slug: string;
  orderNumber: number;
  showHide: number;
  sliderType: number;
  lockedBy: number | null;
  createdBy: number;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  rStoreId: number | null;
  rGridId: number | null;
  [key: string]: unknown;
}

// Column definitions
const columns: ColumnDef<ProductSectionData>[] = [
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
    accessorKey: "sectionName",
    header: "Section Name",
    enableSorting: true,
    cell: ({ row }) => {
      const section = row.original
      return (
        <div className="flex flex-col gap-1">
          <div className="font-medium">{section.sectionName}</div>
          {section.slug ? (
            <div className="text-xs text-muted-foreground">/{section.slug}</div>
          ) : null}
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
    accessorKey: "showHide",
    header: "Visibility",
    enableSorting: true,
    cell: ({ row }) => {
      const showHide = row.getValue("showHide") as number
      return (
        <Badge variant={showHide === 1 ? "default" : "secondary"} className="w-fit">
          {showHide === 1 ? "Show" : "Hide"}
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

export default function ProductSections() {
  const [sections, setSections] = useState<ProductSectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<ProductSectionData | null>(null)
  const [sectionsToDelete, setSectionsToDelete] = useState<ProductSectionData[]>([])
  const [isBulkDelete, setIsBulkDelete] = useState(false)

  // Product section form dialog state
  const [sectionFormOpen, setSectionFormOpen] = useState(false)
  const [sectionToEdit, setSectionToEdit] = useState<ProductSectionData | null>(null)

  // Fetch sections with server-side pagination and filtering
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

  const fetchSections = useCallback(async (page: number = 1) => {
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
        'sectionName': 'section_name',
        'orderNumber': 'order_number',
        'showHide': 'show_hide',
        'sliderType': 'slider_type',
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
          'sectionName': 'section_name',
          'orderNumber': 'order_number',
          'showHide': 'show_hide',
          'sliderType': 'slider_type',
          'createdAt': 'created_at',
          'updatedAt': 'updated_at',
        }
        
        sorting.forEach((sort) => {
          const apiColumn = columnSortMap[sort.id] || sort.id.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase()
          params.append('sort', `${apiColumn}:${sort.desc ? 'desc' : 'asc'}`)
        })
      }
      
      const apiUrl = `/api/product-sections?${params.toString()}`
      console.log(`[Product Sections Page] Fetching sections from: ${apiUrl}`)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Product Sections Page] Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setSections(data.sections || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
        console.log(`[Product Sections Page] Loaded ${data.sections?.length || 0} sections (page ${data.page || 1} of ${data.totalPages || 1})`)
      } else {
        console.error('[Product Sections Page] API returned success:false', data)
        toast({
          title: "Error",
          description: data.error || "Failed to fetch product sections",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[Product Sections Page] Error fetching sections:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch product sections",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, pageSize, debouncedColumnFilters, sorting])

  useEffect(() => {
    fetchSections(currentPage)
  }, [currentPage, fetchSections])

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

  const handleRowClick = (section: ProductSectionData) => {
    console.log("Product section clicked:", section)
    // You can navigate to section details page here
    // router.push(`/product-sections/${section.id}`)
  }

  const handleSelectionChange = (selectedSections: ProductSectionData[]) => {
    console.log("Selected sections:", selectedSections)
  }

  // Define row actions
  const rowActions = [
    // {
    //   label: "View",
    //   icon: <Eye className="h-4 w-4" />,
    //   onClick: (section: ProductSectionData) => {
    //     console.log("View section:", section)
    //     toast({
    //       title: "View Section",
    //       description: `Viewing section: ${section.sectionName}`,
    //     })
    //     // router.push(`/product-sections/${section.id}`)
    //   },
    // },
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: (section: ProductSectionData) => {
        setSectionToEdit(section)
        setSectionFormOpen(true)
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (section: ProductSectionData) => {
        setSectionToDelete(section)
        setSectionsToDelete([])
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
      onClick: (selectedSections: ProductSectionData[]) => {
        setSectionsToDelete(selectedSections)
        setSectionToDelete(null)
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
      if (isBulkDelete && sectionsToDelete.length > 0) {
        // Bulk delete
        const ids = sectionsToDelete.map(section => section.id)
        const response = await fetch('/api/product-sections/bulk-delete', {
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
            description: `${sectionsToDelete.length} product sections deleted successfully`,
          })
          fetchSections(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete product sections",
            variant: "destructive",
          })
        }
      } else if (sectionToDelete) {
        // Single delete
        const response = await fetch(`/api/product-sections/${sectionToDelete.id}`, {
          method: 'DELETE',
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: "Success",
            description: "Product section deleted successfully",
          })
          fetchSections(currentPage) // Refresh the list
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete product section",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error deleting product section:', error)
      toast({
        title: "Error",
        description: "Failed to delete product section",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setSectionToDelete(null)
      setSectionsToDelete([])
      setIsBulkDelete(false)
    }
  }

  return (
    <div className="bg-background p-4 space-y-4">
      <DataTable
        columns={columns}
        data={sections}
        enableRowSelection={true}
        enableGlobalFilter={false}
        enableColumnFilters={true}
        enableSorting={true}
        enablePagination={false}
        pageSize={pageSize}
        loading={loading}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        title="Product Sections"
        showAddButton={true}
        onAdd={() => {
          setSectionToEdit(null)
          setSectionFormOpen(true)
        }}
        addButtonLabel="Add Product Section"
        rowActions={rowActions}
        enableRowContextMenu={true}
        bulkActions={bulkActions}
        emptyMessage="No product sections found."
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
                fetchSections(1)
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
                  fetchSections(newPage)
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
                  fetchSections(newPage)
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
                fetchSections(totalPages)
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
        itemName={sectionToDelete?.sectionName}
        itemCount={sectionsToDelete.length}
        isLoading={deleting}
        title={isBulkDelete ? `Delete ${sectionsToDelete.length} product sections?` : undefined}
        description={isBulkDelete ? undefined : undefined}
      />

      {/* Product Section Form Dialog */}
      <ProductSectionForm
        open={sectionFormOpen}
        onOpenChange={setSectionFormOpen}
        sectionId={sectionToEdit?.id || null}
        onSuccess={() => {
          fetchSections(currentPage)
          setSectionToEdit(null)
        }}
      />
    </div>
  )
}
