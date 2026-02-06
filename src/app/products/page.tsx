'use client'

import React, { useState } from 'react'
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"
import { ProductDetails } from "./components/ProductDetails"
import ProductsTable, { ProductData } from "./components/ProductsTable"

export default function Products() {
  const [deleting, setDeleting] = useState(false)
  const [tableRefreshKey, setTableRefreshKey] = useState(0)
  const { toast } = useToast()
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<ProductData | null>(null)
  const [productsToDelete, setProductsToDelete] = useState<ProductData[]>([])
  const [isBulkDelete, setIsBulkDelete] = useState(false)

  // Product details dialog state
  const [productDetailsOpen, setProductDetailsOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      if (isBulkDelete && productsToDelete.length > 0) {
        // Bulk delete
        const ids = productsToDelete.map(prod => prod.id)
        const response = await fetch('/api/products/bulk-delete', {
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
            description: `${productsToDelete.length} products deleted successfully`,
          })
          setTableRefreshKey(prev => prev + 1)
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete products",
            variant: "destructive",
          })
        }
      } else if (productToDelete) {
        // Single delete
        const response = await fetch(`/api/products/${productToDelete.id}`, {
          method: 'DELETE',
        })
        const data = await response.json()

        if (data.success) {
          toast({
            title: "Success",
            description: "Product deleted successfully",
          })
          setTableRefreshKey(prev => prev + 1)
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to delete product",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setProductToDelete(null)
      setProductsToDelete([])
      setIsBulkDelete(false)
    }
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 p-6 overflow-hidden min-h-0 w-full max-w-full">
        <ProductsTable
          refreshKey={tableRefreshKey}
          onView={(product) => {
            setSelectedProductId(product.id)
            setProductDetailsOpen(true)
          }}
          onDelete={(product) => {
            setProductToDelete(product)
            setProductsToDelete([])
            setIsBulkDelete(false)
            setDeleteDialogOpen(true)
          }}
          onBulkDelete={(products) => {
            setProductsToDelete(products)
            setProductToDelete(null)
            setIsBulkDelete(true)
            setDeleteDialogOpen(true)
          }}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        variant={isBulkDelete ? 'bulk' : 'single'}
        itemName={productToDelete?.displayName || productToDelete?.productName}
        itemCount={productsToDelete.length}
        isLoading={deleting}
        title={isBulkDelete ? `Delete ${productsToDelete.length} products?` : undefined}
        description={isBulkDelete ? undefined : undefined}
      />

      {/* Product Details Dialog */}
      <ProductDetails
        productId={selectedProductId}
        open={productDetailsOpen}
        onOpenChange={setProductDetailsOpen}
      />
    </div>
  )
}
