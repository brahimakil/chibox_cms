'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ImageIcon, Database, Link2, FolderTree, Activity } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface CategoryData {
  id?: number
  categoryName: string
  slug: string
  parent: number | null
  parent_name?: string | null
  type: number
  showInNavbar: number
  display: number
  cartBtn?: number
  mainImage?: string | null
  additionalImages?: string[]
  productCount?: number
  orderNumber?: number | null
  // Additional fields from database
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: number | null
  updatedBy?: number | null
  lockedBy?: number | null
  rStoreId?: number | null
  rGridId?: number | null
  syncId?: number | null
  source?: string
  sourceCategoryId?: string | null
  categoryNameZh?: string | null
  categoryNameEn?: string | null
  level?: number
  hasChildren?: number
  highestProductId?: string | null
  lowestProductId?: string | null
  fullySynced?: number
  lastSyncDirection?: string
  lastProductSync?: string | null
  lastCategorySync?: string | null
  newProductsFound?: number
  totalProductsApi?: number
  productsInDb?: number
  syncEnabled?: number
  syncPriority?: string
  fullPath?: string | null
  childSynced?: number
  lastChildCheck?: string | null
  attachmentCounter?: number | null
  [key: string]: unknown
}

interface ViewCatFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId?: number | null
}

export function ViewCatForm({ open, onOpenChange, categoryId }: ViewCatFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [category, setCategory] = useState<CategoryData | null>(null)

  // Fetch category data when dialog opens
  useEffect(() => {
    const fetchCategoryData = async () => {
      if (!categoryId) return
      
      try {
        setIsLoading(true)
        const response = await fetch(`/api/categories/${categoryId}`)
        const result = await response.json()

        if (result.success && result.category) {
          setCategory(result.category)
        } else {
          toast({
            title: "Error",
            description: result.error || 'Failed to fetch category data',
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error fetching category:', error)
        toast({
          title: "Error",
          description: 'Failed to fetch category data',
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (open && categoryId) {
      fetchCategoryData()
    } else if (!open) {
      // Reset when dialog closes
      setCategory(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[85vw] w-[85vw] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0"
        showMaximizeButton={false}
      >
        <DialogHeader className="px-8 py-4  border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-3">
            View Category
            {category && (
              <span className="text-xl font-mono">#{category.id}</span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-8 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading category data...</p>
              </div>
            </div>
          ) : category ? (
            <div className="space-y-6">
              {/* Grid Layout for Cards */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Basic Information Section */}
                <Card className="shadow-md">
                  <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-5">
                      {/* ID */}
                      <div className="flex items-start justify-between border-b pb-3">
                        <Label className="text-sm font-medium text-muted-foreground">ID</Label>
                        <div className="text-sm font-mono font-semibold">#{category.id}</div>
                      </div>

                      {/* Category Name */}
                      <div className="flex items-start justify-between border-b pb-3">
                        <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                        <div className="text-sm font-semibold text-right max-w-[60%]">{category.categoryName || '—'}</div>
                      </div>

                      {/* Category Name (Chinese) */}
                      {category.categoryNameZh && (
                        <div className="flex items-start justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Name (中文)</Label>
                          <div className="text-sm text-right max-w-[60%]">{category.categoryNameZh}</div>
                        </div>
                      )}

                      {/* Category Name (English) */}
                      {category.categoryNameEn && (
                        <div className="flex items-start justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Name (EN)</Label>
                          <div className="text-sm text-right max-w-[60%]">{category.categoryNameEn}</div>
                        </div>
                      )}

                      {/* Slug */}
                      <div className="flex items-start justify-between border-b pb-3">
                        <Label className="text-sm font-medium text-muted-foreground">Slug</Label>
                        <div className="text-sm font-mono">/{category.slug || '—'}</div>
                      </div>

                      {/* Full Path */}
                      {category.fullPath && (
                        <div className="flex items-start justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Full Path</Label>
                          <div className="text-sm text-right max-w-[60%] wrap-break-word">{category.fullPath}</div>
                        </div>
                      )}

                      {/* Source */}
                      {category.source && (
                        <div className="flex items-start justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Source</Label>
                          <Badge variant="outline" className="text-xs">{category.source}</Badge>
                        </div>
                      )}

                      {/* Source Category ID */}
                      {category.sourceCategoryId && (
                        <div className="flex items-start justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Source ID</Label>
                          <div className="text-sm font-mono">{category.sourceCategoryId}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Display & Settings Section */}
                <Card className="shadow-md">
                  <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-600" />
                      Display & Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-5">
                      {/* Type */}
                      <div className="flex items-center justify-between border-b pb-3">
                        <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                        <Badge variant={category.type === 0 ? "default" : "outline"}>
                          {category.type === 0 ? "Main Category" : "Subcategory"}
                        </Badge>
                      </div>

                      {/* Display Status */}
                      <div className="flex items-center justify-between border-b pb-3">
                        <Label className="text-sm font-medium text-muted-foreground">Display</Label>
                        <Badge variant={category.display === 1 ? "default" : "secondary"}>
                          {category.display === 1 ? "Active" : "Hidden"}
                        </Badge>
                      </div>

                      {/* Show in Navbar */}
                      <div className="flex items-center justify-between border-b pb-3">
                        <Label className="text-sm font-medium text-muted-foreground">Show in Navbar</Label>
                        <Badge variant={category.showInNavbar === 1 ? "default" : "secondary"}>
                          {category.showInNavbar === 1 ? "Yes" : "No"}
                        </Badge>
                      </div>

                      {/* Cart Button */}
                      {category.cartBtn !== undefined && (
                        <div className="flex items-center justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Cart Button</Label>
                          <Badge variant={category.cartBtn === 1 ? "default" : "secondary"}>
                            {category.cartBtn === 1 ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      )}

                      {/* Order Number */}
                      {category.orderNumber !== null && category.orderNumber !== undefined && (
                        <div className="flex items-center justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Order Number</Label>
                          <div className="text-sm font-semibold">{category.orderNumber}</div>
                        </div>
                      )}

                      {/* Product Count */}
                      {category.productCount !== undefined && (
                        <div className="flex items-center justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Products</Label>
                          <div className="text-lg font-bold text-blue-600">{category.productCount.toLocaleString()}</div>
                        </div>
                      )}

                      {/* Grid ID */}
                      {category.rGridId !== null && category.rGridId !== undefined && (
                        <div className="flex items-center justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Grid ID</Label>
                          <div className="text-sm font-mono">#{category.rGridId}</div>
                        </div>
                      )}

                      {/* Sync ID */}
                      {category.syncId !== null && category.syncId !== undefined && (
                        <div className="flex items-center justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Sync ID</Label>
                          <div className="text-sm font-mono">#{category.syncId}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Hierarchy & Structure Section */}
                <Card className="shadow-md">
                  <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <FolderTree className="w-5 h-5 text-purple-600" />
                      Hierarchy & Structure
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-5">
                      {/* Parent Category */}
                      <div className="flex items-start justify-between border-b pb-3">
                        <Label className="text-sm font-medium text-muted-foreground">Parent</Label>
                        <div className="text-sm text-right max-w-[60%]">
                          {category.parent !== null ? (
                            <div>
                              <div className="font-semibold">{category.parent_name || '—'}</div>
                              <div className="text-xs text-muted-foreground font-mono">ID: {category.parent}</div>
                            </div>
                          ) : (
                            <Badge variant="outline">Root Category</Badge>
                          )}
                        </div>
                      </div>

                      {/* Level */}
                      {category.level !== undefined && (
                        <div className="flex items-center justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Level</Label>
                          <Badge variant="outline">{category.level}</Badge>
                        </div>
                      )}

                      {/* Has Children */}
                      {category.hasChildren !== undefined && (
                        <div className="flex items-center justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Has Children</Label>
                          <Badge variant={category.hasChildren === 1 ? "default" : "secondary"}>
                            {category.hasChildren === 1 ? "Yes" : "No"}
                          </Badge>
                        </div>
                      )}

                      {/* Child Synced */}
                      {category.childSynced !== undefined && (
                        <div className="flex items-center justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Children Synced</Label>
                          <Badge variant={category.childSynced === 1 ? "default" : "secondary"}>
                            {category.childSynced === 1 ? "Yes" : "No"}
                          </Badge>
                        </div>
                      )}

                      {/* Last Child Check */}
                      {category.lastChildCheck && (
                        <div className="flex items-start justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Last Child Check</Label>
                          <div className="text-xs text-right">
                            {new Date(category.lastChildCheck).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Sync Information Section */}
                <Card className="shadow-md">
                  <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-cyan-600" />
                      Sync Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-5">
                      {/* Sync Enabled */}
                      {category.syncEnabled !== undefined && (
                        <div className="flex items-center justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Sync Enabled</Label>
                          <Badge variant={category.syncEnabled === 1 ? "default" : "secondary"}>
                            {category.syncEnabled === 1 ? "Yes" : "No"}
                          </Badge>
                        </div>
                      )}

                      {/* Sync Priority */}
                      {category.syncPriority && (
                        <div className="flex items-center justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Sync Priority</Label>
                          <Badge variant="outline">{category.syncPriority}</Badge>
                        </div>
                      )}

                      {/* Fully Synced */}
                      {category.fullySynced !== undefined && (
                        <div className="flex items-center justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Fully Synced</Label>
                          <Badge variant={category.fullySynced === 1 ? "default" : "secondary"}>
                            {category.fullySynced === 1 ? "Yes" : "No"}
                          </Badge>
                        </div>
                      )}

                      {/* Last Sync Direction */}
                      {/* {category.lastSyncDirection && (
                        <div className="flex items-center justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Last Direction</Label>
                          <Badge variant="outline">{category.lastSyncDirection}</Badge>
                        </div>
                      )} */}

                      {/* Last Category Sync */}
                      {category.lastCategorySync && (
                        <div className="flex items-start justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Last Category Sync</Label>
                          <div className="text-xs text-right">
                            {new Date(category.lastCategorySync).toLocaleString()}
                          </div>
                        </div>
                      )}

                      {/* Last Product Sync */}
                      {category.lastProductSync && (
                        <div className="flex items-start justify-between border-b pb-3">
                          <Label className="text-sm font-medium text-muted-foreground">Last Product Sync</Label>
                          <div className="text-xs text-right">
                            {new Date(category.lastProductSync).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Images Section - Full Width */}
              <Card className="shadow-md">
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-pink-600" />
                    Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Category Image */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Main Category Image</Label>
                      <div className="border-2 border-dashed rounded-xl p-8 text-center min-h-[250px] flex items-center justify-center bg-muted/30">
                        {category.mainImage ? (
                          <img
                            src={category.mainImage}
                            alt="Category"
                            className="max-h-56 w-full object-contain rounded-lg shadow-md"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <div className="rounded-full bg-muted p-5">
                              <ImageIcon className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">No image uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Images */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Additional Images</Label>
                      <div className="border-2 border-dashed rounded-xl p-8 text-center min-h-[250px] flex items-center justify-center bg-muted/30">
                        {category.additionalImages && category.additionalImages.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3 w-full max-h-[230px] overflow-y-auto">
                            {category.additionalImages.map((image, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={image}
                                  alt={`Additional ${index + 1}`}
                                  className="w-full h-28 object-cover rounded-lg shadow-md"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <div className="rounded-full bg-muted p-5">
                              <ImageIcon className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">No additional images</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No category data available</p>
            </div>
          )}
        </div>
        
        {/* Fixed Footer with Close Button */}
        <div className="border-t bg-background px-8 py-4 shrink-0 flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-11 px-8 text-base"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ViewCatForm
