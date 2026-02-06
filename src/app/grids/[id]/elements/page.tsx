'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { ArrowLeft, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Image as ImageIcon, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { GridElementForm } from "./components/GridElementForm"
import Image from "next/image"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Grid Element data type
interface GridElementData {
  id: number;
  rGridId: number | null;
  positionX: string | null;
  positionY: string | null;
  width: string | null;
  height: string | null;
  actions: string | null;
  mainImage: string | null;
  lockedBy: number | null;
  createdBy: number;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  [key: string]: unknown;
}

interface GridInfo {
  id: number;
  type: string;
}

export default function GridElements() {
  const params = useParams()
  const router = useRouter()
  const gridId = Number.parseInt(params.id as string)
  
  const [elements, setElements] = useState<GridElementData[]>([])
  const [gridInfo, setGridInfo] = useState<GridInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [elementToDelete, setElementToDelete] = useState<GridElementData | null>(null)
  const [elementsToDelete, setElementsToDelete] = useState<GridElementData[]>([])
  const [isBulkDelete, setIsBulkDelete] = useState(false)

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [elementToEdit, setElementToEdit] = useState<GridElementData | null>(null)

  // Image preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Fetch elements with server-side pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSizeOptions = [50, 100, 200, 500]

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([])

  // Column definitions
  const columns: ColumnDef<GridElementData>[] = [
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
      header: "Banner Image",
      enableSorting: false,
      cell: ({ row }) => {
        const mainImage = row.getValue("mainImage") as string | null
        if (!mainImage) {
          return (
            <div className="flex items-center justify-center w-24 h-16 bg-muted rounded-md">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )
        }
        return (
          <div 
            className="relative w-24 h-16 rounded-md overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onClick={(e) => {
              e.stopPropagation()
              setPreviewImage(mainImage)
              setPreviewOpen(true)
            }}
          >
            <Image
              src={mainImage}
              alt="Banner"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )
      },
    },
    {
      accessorKey: "positionY",
      header: "Position",
      enableSorting: true,
      cell: ({ row }) => {
        const posX = row.original.positionX || '0'
        const posY = row.original.positionY || '0'
        return (
          <div className="text-sm">
            <Badge variant="outline">Y: {posY}</Badge>
            <Badge variant="outline" className="ml-1">X: {posX}</Badge>
          </div>
        )
      },
    },
    {
      accessorKey: "width",
      header: "Dimensions",
      enableSorting: false,
      cell: ({ row }) => {
        const width = row.original.width || '—'
        const height = row.original.height || '—'
        return (
          <div className="text-sm text-muted-foreground">
            {width} × {height}
          </div>
        )
      },
    },
    {
      accessorKey: "actions",
      header: "Action Type",
      enableSorting: false,
      cell: ({ row }) => {
        const actionsJson = row.getValue("actions") as string | null
        if (!actionsJson) {
          return <div className="text-sm text-muted-foreground">No action</div>
        }
        try {
          const actions = JSON.parse(actionsJson)
          if (actions.type) {
            return (
              <Badge variant="secondary">{actions.type}</Badge>
            )
          }
          return <div className="text-sm text-muted-foreground">Configured</div>
        } catch {
          return <div className="text-sm text-muted-foreground">Invalid</div>
        }
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

  const fetchElements = useCallback(async (page: number = 1) => {
    if (Number.isNaN(gridId)) {
      toast({
        title: "Error",
        description: "Invalid grid ID",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })

      // Add sorting parameters
      if (sorting.length > 0) {
        const columnSortMap: Record<string, string> = {
          'id': 'id',
          'positionY': 'position_y',
          'positionX': 'position_x',
          'createdAt': 'created_at',
          'updatedAt': 'updated_at',
        }
        
        sorting.forEach((sort) => {
          const apiColumn = columnSortMap[sort.id] || sort.id
          params.append('sort', `${apiColumn}:${sort.desc ? 'desc' : 'asc'}`)
        })
      }
      
      const apiUrl = `/api/grid-elements/by-grid/${gridId}?${params.toString()}`
      console.log(`[Grid Elements Page] Fetching from: ${apiUrl}`)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Grid Elements Page] Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setElements(data.elements || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
        setCurrentPage(data.page || 1)
        if (data.grid) {
          setGridInfo(data.grid)
        }
        console.log(`[Grid Elements Page] Loaded ${data.elements?.length || 0} elements`)
      } else {
        console.error('[Grid Elements Page] API returned success:false', data)
        toast({
          title: "Error",
          description: data.error || "Failed to fetch elements",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[Grid Elements Page] Error fetching elements:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch elements",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, pageSize, sorting, gridId])

  useEffect(() => {
    fetchElements(currentPage)
  }, [currentPage, fetchElements])

  // Reset to page 1 when pageSize or sorting change
  useEffect(() => {
    setCurrentPage(1)
  }, [pageSize, sorting])

  const handleRowClick = (element: GridElementData) => {
    console.log("Element clicked:", element)
  }

  const handleSelectionChange = (selectedElements: GridElementData[]) => {
    console.log("Selected elements:", selectedElements)
  }

  // Define row actions
  const rowActions = [
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: (element: GridElementData) => {
        setElementToEdit(element)
        setFormOpen(true)
      },
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (element: GridElementData) => {
        setElementToDelete(element)
        setElementsToDelete([])
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
      onClick: (selectedElements: GridElementData[]) => {
        setElementsToDelete(selectedElements)
        setElementToDelete(null)
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
      if (isBulkDelete) {
        const ids = elementsToDelete.map(e => e.id)
        const response = await fetch('/api/grid-elements/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        })
        
        if (!response.ok) {
          throw new Error('Failed to delete elements')
        }
        
        toast({
          title: "Success",
          description: `${ids.length} element(s) deleted successfully`,
        })
      } else if (elementToDelete) {
        const response = await fetch(`/api/grid-elements/${elementToDelete.id}`, {
          method: 'DELETE',
        })
        
        if (!response.ok) {
          throw new Error('Failed to delete element')
        }
        
        toast({
          title: "Success",
          description: "Element deleted successfully",
        })
      }
      
      fetchElements(currentPage)
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setElementToDelete(null)
      setElementsToDelete([])
      setIsBulkDelete(false)
    }
  }

  const handleFormSuccess = () => {
    fetchElements(currentPage)
    setFormOpen(false)
    setElementToEdit(null)
  }

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1)
  const goToPreviousPage = () => setCurrentPage(p => Math.max(1, p - 1))
  const goToNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1))
  const goToLastPage = () => setCurrentPage(totalPages)

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/grids')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Banner Elements
            </h1>
            <p className="text-sm text-muted-foreground">
              {gridInfo ? `Grid: ${gridInfo.type} (ID: ${gridInfo.id})` : `Grid ID: ${gridId}`}
            </p>
          </div>
        </div>
        <Button onClick={() => { setElementToEdit(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Banner
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Banners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Grid Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gridInfo?.type || '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">With Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {elements.filter(e => e.mainImage).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={elements}
        loading={loading}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        rowActions={rowActions}
        bulkActions={bulkActions}
        enableSorting={true}
        onSortingChange={setSorting}
        sorting={sorting}
        manualSorting={true}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number.parseInt(value))}>
            <SelectTrigger className="h-8 w-[70px]">
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
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToFirstPage}
              disabled={currentPage === 1 || loading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToPreviousPage}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextPage}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToLastPage}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        title={isBulkDelete ? "Delete Multiple Elements" : "Delete Element"}
        description={
          isBulkDelete
            ? `Are you sure you want to delete ${elementsToDelete.length} element(s)? This action cannot be undone.`
            : `Are you sure you want to delete this banner element? This action cannot be undone.`
        }
      />

      {/* Grid Element Form Dialog */}
      <GridElementForm
        open={formOpen}
        onOpenChange={setFormOpen}
        elementId={elementToEdit?.id || null}
        gridId={gridId}
        onSuccess={handleFormSuccess}
      />

      {/* Image Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Banner Preview
              {previewImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(previewImage, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
              <Image
                src={previewImage}
                alt="Banner Preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
