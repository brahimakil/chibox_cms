'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useToast } from "@/hooks/use-toast"
import { CategoryForm } from "./components/CategoryForm"
import { ViewCatForm } from "./components/ViewCatForm"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { CategoryTree } from "./components/CategoryTree"
import CategoriesTable, { CategoryData } from "./components/CategoriesTable"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function Categories() {
  const [allCategories, setAllCategories] = useState<CategoryData[]>([]) // For tree view
  const [treeLoading, setTreeLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [tableRefreshKey, setTableRefreshKey] = useState(0)
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  
  // View dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingCategoryId, setViewingCategoryId] = useState<number | null>(null)
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryData | null>(null)
  const [categoriesToDelete, setCategoriesToDelete] = useState<CategoryData[]>([])
  const [isBulkDelete, setIsBulkDelete] = useState(false)
  
  // Tree view expanded state
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  // Fetch all categories for tree view
  const fetchAllCategories = useCallback(async () => {
    try {
      setTreeLoading(true)
      const response = await fetch('/api/categories/tree', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Categories Page] Error fetching tree:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        const allCategoriesData = data.categories || []
        const categoriesWithParents = allCategoriesData.map((cat: CategoryData) => {
          const parentCategory = allCategoriesData.find((c: CategoryData) => c.id === cat.parent)
          return {
            ...cat,
            parent_name: parentCategory?.categoryName || null,
          }
        })
        setAllCategories(categoriesWithParents)
        console.log(`[Categories Page] Loaded ${categoriesWithParents.length} categories for tree view`)
      } else {
        console.error('[Categories Page] Tree API returned success:false', data)
        toast({
          title: "Error",
          description: data.error || "Failed to fetch categories tree",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[Categories Page] Error fetching categories tree:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch categories tree",
        variant: "destructive",
      })
    } finally {
      setTreeLoading(false)
    }
  }, [toast])

  // Fetch tree data on mount
  useEffect(() => {
    if (allCategories.length === 0) {
      fetchAllCategories()
    }
  }, [allCategories.length, fetchAllCategories])


  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      if (isBulkDelete && categoriesToDelete.length > 0) {
        // Bulk delete
        const ids = categoriesToDelete.map(cat => cat.id)
        const response = await fetch('/api/categories/bulk-delete', {
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
            description: `${categoriesToDelete.length} categories deleted successfully`,
          })
          fetchAllCategories() // Refresh the tree
          setTableRefreshKey(prev => prev + 1) // Refresh the table
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete categories",
            variant: "destructive",
          })
        }
      } else if (categoryToDelete) {
        // Single delete
        const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
          method: 'DELETE',
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: "Success",
            description: "Category deleted successfully",
          })
          fetchAllCategories() // Refresh the tree
          setTableRefreshKey(prev => prev + 1) // Refresh the table
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete category",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
      setCategoriesToDelete([])
      setIsBulkDelete(false)
    }
  }

  return (
    <div className="h-[calc(100vh-100px)] overflow-hidden">
      <div className="h-full p-6">
        {/* Split View: Tree on left, Table on right */}
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Tree View */}
          <ResizablePanel defaultSize={30} minSize={20} className="flex flex-col min-h-0">
            <div className="h-full overflow-hidden">
              {treeLoading ? (
                <div className="h-full flex flex-col overflow-hidden">
                  <Card className="flex flex-col h-full min-h-0 overflow-hidden gap-0 py-0">
                    <CardHeader className="sticky top-0 z-10 bg-card border-b shrink-0 py-4">
                      <CardTitle>Categories Tree</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center flex-1 min-h-0">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading categories tree...</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  <CategoryTree
                    categories={allCategories}
                    onView={(category) => {
                      setViewingCategoryId(category.id)
                      setViewDialogOpen(true)
                    }}
                    onEdit={(category) => {
                      setEditingCategoryId(category.id)
                      setDialogOpen(true)
                    }}
                    onDelete={(category) => {
                      setCategoryToDelete(category)
                      setCategoriesToDelete([])
                      setIsBulkDelete(false)
                      setDeleteDialogOpen(true)
                    }}
                    expandedIds={expandedIds}
                    onExpandedChange={setExpandedIds}
                  />
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Table View */}
          <ResizablePanel defaultSize={70} minSize={40} className="flex flex-col min-h-0">
            <div className="h-full overflow-y-auto">
              <CategoriesTable
                refreshKey={tableRefreshKey}
                onView={(category) => {
                  setViewingCategoryId(category.id)
                  setViewDialogOpen(true)
                }}
                onEdit={(category) => {
                  setEditingCategoryId(category.id)
                  setDialogOpen(true)
                }}
                onDelete={(category) => {
                  setCategoryToDelete(category)
                  setCategoriesToDelete([])
                  setIsBulkDelete(false)
                  setDeleteDialogOpen(true)
                }}
                onBulkDelete={(categories) => {
                  setCategoriesToDelete(categories)
                  setCategoryToDelete(null)
                  setIsBulkDelete(true)
                  setDeleteDialogOpen(true)
                }}
                onAdd={() => {
                  setEditingCategoryId(null)
                  setDialogOpen(true)
                }}
                onRefresh={fetchAllCategories}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Category Form Dialog */}
      <CategoryForm
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingCategoryId(null)
          }
        }}
        categoryId={editingCategoryId}
        onSuccess={() => {
          fetchAllCategories() // Refresh the tree
          setTableRefreshKey(prev => prev + 1) // Refresh the table
        }}
      />

      {/* View Category Dialog */}
      <ViewCatForm
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open)
          if (!open) {
            setViewingCategoryId(null)
          }
        }}
        categoryId={viewingCategoryId}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        variant={isBulkDelete ? 'bulk' : 'single'}
        itemName={categoryToDelete?.categoryName}
        itemCount={categoriesToDelete.length}
        isLoading={deleting}
        title={isBulkDelete ? `Delete ${categoriesToDelete.length} categories?` : undefined}
        description={isBulkDelete ? undefined : undefined}
      />
    </div>
  )
}
