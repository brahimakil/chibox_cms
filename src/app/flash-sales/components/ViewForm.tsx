'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'

interface FlashSaleData {
  id: number
  title: string
  slug: string
  color1: string
  color2: string
  color3: string
  endTime: Date | null
  display: number
  sliderType: number
  rStoreId: number
  discount: number
  orderNumber: number
  lockedBy: number | null
  createdBy: number
  updatedBy: number | null
  createdAt: Date | null
  updatedAt: Date | null
  [key: string]: unknown
}

interface Product {
  id: number
  label: string
  mainImage: string | null
  categories: string | null
  brandName: string | null
  imageCount: number
  productQtyLeft: number
  storeName: string | null
  discount: number
}

interface ViewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  flashSale: FlashSaleData | null
}

export function ViewForm({ open, onOpenChange, flashSale }: ViewFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [flashSaleData, setFlashSaleData] = useState<FlashSaleData | null>(null)

  // Fetch flash sale details and products when dialog opens
  useEffect(() => {
    const fetchFlashSaleDetails = async () => {
      if (!open || !flashSale) return

      try {
        setIsLoading(true)
        
        // Fetch full flash sale details
        const response = await fetch(`/api/flash-sales/${flashSale.id}`)
        const result = await response.json()

        if (result.success && result.flashSale) {
          setFlashSaleData(result.flashSale)
          
          // Fetch products for this flash sale
          try {
            const productsResponse = await fetch(`/api/flash-sales/${flashSale.id}/products`)
            const productsResult = await productsResponse.json()
            if (productsResult.success && productsResult.products) {
              const fetchedProducts: Product[] = productsResult.products.map((p: {
                id: number
                displayName?: string
                productName?: string
                originalName?: string
                mainImage?: string | null
                categories?: string | null
                brandName?: string | null
                imageCount?: number
                productQtyLeft?: number
                storeName?: string | null
                salesDiscount?: number
              }) => ({
                id: p.id,
                label: p.displayName || p.productName || p.originalName || `Product ${p.id}`,
                mainImage: p.mainImage || null,
                categories: p.categories || null,
                brandName: p.brandName || null,
                imageCount: p.imageCount || 0,
                productQtyLeft: p.productQtyLeft || 0,
                storeName: p.storeName || null,
                discount: p.salesDiscount || 0,
              }))
              setProducts(fetchedProducts)
            }
          } catch (error) {
            console.error('Error fetching flash sale products:', error)
            // Products endpoint might not exist, that's okay
          }
        }
      } catch (error) {
        console.error('Error fetching flash sale details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFlashSaleDetails()
  }, [open, flashSale])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setFlashSaleData(null)
      setProducts([])
    }
  }, [open])

  const formatDate = (date: Date | null | string) => {
    if (!date) return '—'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return '—'
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const data = flashSaleData || flashSale

  if (!data) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl w-[90vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        showMaximizeButton={true}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-2xl font-semibold">
            View Flash Sale #{data.id}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 flex-1">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <div className="text-muted-foreground">Loading flash sale details...</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-muted/30 min-h-0">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-px bg-blue-500 flex-1"></div>
                <h3 className="text-base font-semibold text-blue-600">Basic Information</h3>
                <div className="h-px bg-blue-500 flex-1"></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">ID</div>
                  <div className="text-base font-semibold">{data.id}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Order Number</div>
                  <div className="text-base">
                    <Badge variant="secondary">{data.orderNumber}</Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Title</div>
                  <div className="text-base font-semibold">{data.title}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Slug</div>
                  <div className="text-base font-mono text-muted-foreground">/{data.slug}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Discount</div>
                  <div className="text-base">
                    <Badge variant="default" className="text-base px-3 py-1">
                      {data.discount}%
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Display</div>
                  <div className="text-base">
                    <Badge variant={data.display === 1 ? "default" : "secondary"}>
                      {data.display === 1 ? "True" : "False"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Slider Type</div>
                  <div className="text-base">
                    <Badge variant={data.sliderType === 1 ? "default" : "outline"}>
                      {data.sliderType === 1 ? "Swiper" : "Grid"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">End Time</div>
                  <div className="text-base">{formatDate(data.endTime)}</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Colors Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-px bg-blue-500 flex-1"></div>
                <h3 className="text-base font-semibold text-blue-600">Colors</h3>
                <div className="h-px bg-blue-500 flex-1"></div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Color 1</div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-12 h-12 rounded border-2 border-border"
                      style={{ backgroundColor: data.color1 || '#000000' }}
                    />
                    <div className="text-base font-mono">{data.color1 || '—'}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Color 2</div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-12 h-12 rounded border-2 border-border"
                      style={{ backgroundColor: data.color2 || '#000000' }}
                    />
                    <div className="text-base font-mono">{data.color2 || '—'}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Color 3</div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-12 h-12 rounded border-2 border-border"
                      style={{ backgroundColor: data.color3 || '#000000' }}
                    />
                    <div className="text-base font-mono">{data.color3 || '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Products Section */}
            {products.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-blue-500 flex-1"></div>
                  <h3 className="text-base font-semibold text-blue-600">
                    Products ({products.length})
                  </h3>
                  <div className="h-px bg-blue-500 flex-1"></div>
                </div>

                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="w-20">Image</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead className="w-24">Discount</TableHead>
                        <TableHead>Categories</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead className="text-right">Available Qty</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead className="text-right">Images</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product, index) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            {product.mainImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.mainImage}
                                alt={product.label}
                                className="w-12 h-12 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const parent = e.currentTarget.parentElement
                                  if (parent) {
                                    parent.innerHTML = '<div class="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">No Image</div>'
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                No Image
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{product.label}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.discount}%</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {product.categories || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {product.brandName || '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {product.productQtyLeft}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {product.storeName || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.imageCount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/30 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-6"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

