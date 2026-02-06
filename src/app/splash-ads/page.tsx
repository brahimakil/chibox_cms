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
import { Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Power } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { SplashAdForm } from "./components/SplashAdForm"
import { ViewSplashAd } from "./components/ViewSplashAd"

// SplashAd data type
interface SplashAdData {
  id: number;
  title: string;
  mediaType: 'image' | 'video' | 'lottie';
  mediaUrl: string;
  thumbnailUrl: string | null;
  linkType: 'product' | 'category' | 'url' | 'none';
  linkValue: string | null;
  skipDuration: number;
  totalDuration: number;
  isActive: number;
  startDate: Date | null;
  endDate: Date | null;
  viewCount: number;
  clickCount: number;
  skipCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  [key: string]: unknown;
}

// Column definitions
const columns: ColumnDef<SplashAdData>[] = [
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
      const splashAd = row.original
      return (
        <div className="flex items-center gap-3">
          {splashAd.mediaUrl && splashAd.mediaType === 'image' && (
            <img 
              src={splashAd.mediaUrl} 
              alt={splashAd.title}
              className="w-12 h-12 object-cover rounded"
            />
          )}
          <div className="flex flex-col gap-1">
            <div className="font-medium">{splashAd.title}</div>
            <div className="text-xs text-muted-foreground capitalize">{splashAd.mediaType}</div>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "linkType",
    header: "Link",
    enableSorting: true,
    cell: ({ row }) => {
      const splashAd = row.original
      const linkType = row.getValue("linkType") as string
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit capitalize">
            {linkType}
          </Badge>
          {splashAd.linkValue && (
            <div className="text-xs text-muted-foreground truncate max-w-[100px]">
              {splashAd.linkValue}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "skipDuration",
    header: "Durations",
    enableSorting: false,
    cell: ({ row }) => {
      const splashAd = row.original
      return (
        <div className="flex flex-col gap-1 text-sm">
          <span>Skip: {splashAd.skipDuration}s</span>
          <span>Total: {splashAd.totalDuration}s</span>
        </div>
      )
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    enableSorting: true,
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as number
      return (
        <Badge variant={isActive === 1 ? "default" : "secondary"} className="w-fit">
          {isActive === 1 ? "Active" : "Inactive"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "startDate",
    header: "Schedule",
    enableSorting: true,
    cell: ({ row }) => {
      const splashAd = row.original
      const startDate = splashAd.startDate ? new Date(splashAd.startDate) : null
      const endDate = splashAd.endDate ? new Date(splashAd.endDate) : null
      
      if (!startDate && !endDate) return <div className="text-sm text-muted-foreground">No schedule</div>
      
      const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      
      return (
        <div className="text-xs">
          {startDate && <div>From: {formatDate(startDate)}</div>}
          {endDate && <div>To: {formatDate(endDate)}</div>}
        </div>
      )
    },
  },
  {
    accessorKey: "viewCount",
    header: "Stats",
    enableSorting: true,
    cell: ({ row }) => {
      const splashAd = row.original
      return (
        <div className="flex flex-col gap-1 text-xs">
          <span>👁 {splashAd.viewCount}</span>
          <span>👆 {splashAd.clickCount}</span>
          <span>⏭ {splashAd.skipCount}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date | null
      if (!date) return <div className="text-sm">—</div>
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
      return (
        <div className="text-sm">{formattedDate}</div>
      )
    },
  },
]

export default function SplashAdsPage() {
  const [splashAds, setSplashAds] = useState<SplashAdData[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [searchValue, setSearchValue] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])
  const { toast } = useToast()
  
  // Form and dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedSplashAd, setSelectedSplashAd] = useState<SplashAdData | null>(null)
  const [splashAdToDelete, setSplashAdToDelete] = useState<SplashAdData | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Selected rows for bulk actions
  const [selectedRows, setSelectedRows] = useState<SplashAdData[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  
  // Reference to previous fetch params to prevent duplicate requests
  const prevFetchParams = useRef<string>('')

  const fetchSplashAds = useCallback(async () => {
    // Build params string for comparison
    const sortParam = sorting.length > 0 
      ? sorting.map(s => `${s.id}:${s.desc ? 'DESC' : 'ASC'}`).join(',')
      : ''
    const paramsString = `${page}-${limit}-${searchValue}-${sortParam}`
    
    // Prevent duplicate requests
    if (paramsString === prevFetchParams.current) return
    prevFetchParams.current = paramsString
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      
      if (searchValue) {
        params.append('search', searchValue)
      }
      
      if (sorting.length > 0) {
        params.append('sort', sortParam)
      }
      
      const apiUrl = `/api/splash-ads?${params.toString()}`
      const response = await fetch(apiUrl)
      const data = await response.json()
      
      if (data.success) {
        setSplashAds(data.splashAds || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch splash ads",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching splash ads:', error)
      toast({
        title: "Error",
        description: "Failed to fetch splash ads",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [page, limit, searchValue, sorting, toast])

  useEffect(() => {
    fetchSplashAds()
  }, [fetchSplashAds])

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1)
      } else {
        prevFetchParams.current = ''
        fetchSplashAds()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue])

  // Handle actions
  const handleView = (splashAd: SplashAdData) => {
    setSelectedSplashAd(splashAd)
    setIsViewOpen(true)
  }

  const handleEdit = (splashAd: SplashAdData) => {
    setSelectedSplashAd(splashAd)
    setIsFormOpen(true)
  }

  const handleDelete = (splashAd: SplashAdData) => {
    setSplashAdToDelete(splashAd)
  }

  const handleToggleActive = async (splashAd: SplashAdData) => {
    try {
      const response = await fetch(`/api/splash-ads/${splashAd.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: splashAd.isActive === 1 ? 0 : 1 }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Splash ad ${splashAd.isActive === 1 ? 'deactivated' : 'activated'}`,
        })
        prevFetchParams.current = ''
        fetchSplashAds()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error toggling status:', error)
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
    }
  }

  const confirmDelete = async () => {
    if (!splashAdToDelete) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/splash-ads/${splashAdToDelete.id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Splash ad deleted successfully",
        })
        setSplashAdToDelete(null)
        prevFetchParams.current = ''
        fetchSplashAds()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete splash ad",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting splash ad:', error)
      toast({
        title: "Error",
        description: "Failed to delete splash ad",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return
    
    setIsBulkDeleting(true)
    try {
      const response = await fetch('/api/splash-ads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedRows.map(r => r.id) }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Splash ads deleted successfully",
        })
        setSelectedRows([])
        setShowBulkDeleteConfirm(false)
        prevFetchParams.current = ''
        fetchSplashAds()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete splash ads",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error bulk deleting:', error)
      toast({
        title: "Error",
        description: "Failed to delete splash ads",
        variant: "destructive",
      })
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setSelectedSplashAd(null)
  }

  const handleFormSuccess = () => {
    handleFormClose()
    prevFetchParams.current = ''
    fetchSplashAds()
  }

  // Action column
  const actionColumn: ColumnDef<SplashAdData> = {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const splashAd = row.original
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleView(splashAd)}
            title="View"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(splashAd)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleActive(splashAd)}
            title={splashAd.isActive === 1 ? "Deactivate" : "Activate"}
          >
            <Power className={`h-4 w-4 ${splashAd.isActive === 1 ? 'text-green-500' : 'text-gray-400'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(splashAd)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )
    },
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Splash Ads</h1>
          <p className="text-muted-foreground">Manage splash screen advertisements</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          Add Splash Ad
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedRows.length} item(s) selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteConfirm(true)}
          >
            Delete Selected
          </Button>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={[...columns, actionColumn]}
        data={splashAds}
        loading={loading}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search splash ads..."
        sorting={sorting}
        onSortingChange={setSorting}
        onRowSelectionChange={setSelectedRows}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * limit + 1, total)} to {Math.min(page * limit, total)} of {total}
          </span>
          <Select value={limit.toString()} onValueChange={(v) => { setLimit(parseInt(v)); setPage(1); }}>
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Form Dialog */}
      <SplashAdForm
        open={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        splashAd={selectedSplashAd}
      />

      {/* View Dialog */}
      <ViewSplashAd
        open={isViewOpen}
        onClose={() => { setIsViewOpen(false); setSelectedSplashAd(null); }}
        splashAd={selectedSplashAd}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!splashAdToDelete}
        onOpenChange={(open) => !open && setSplashAdToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Splash Ad"
        description={`Are you sure you want to delete "${splashAdToDelete?.title}"? This action cannot be undone.`}
        isLoading={isDeleting}
      />

      {/* Bulk Delete Confirmation */}
      <DeleteConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        onConfirm={handleBulkDelete}
        title="Delete Selected Splash Ads"
        description={`Are you sure you want to delete ${selectedRows.length} splash ad(s)? This action cannot be undone.`}
        isLoading={isBulkDeleting}
      />
    </div>
  )
}
