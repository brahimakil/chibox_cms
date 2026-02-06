'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, Star, Video, ShoppingCart } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

// Legacy ProductVariant interface (for backward compatibility)
interface ProductVariant {
  id: number
  productId: number
  skuId: string | null
  variantName: string | null
  propsIds: string | null
  propsNames: string | null
  variantImage: string | null
  salePrice: number | null
  originPrice: number | null
  discountPrice: number | null
  stock: number
  sortOrder: number
  convertedPrice?: number | null
  currencySymbol?: string
}

// New variant structure matching PHP backend

// Product Option Value (e.g., Red, Blue, S, M)
interface ProductOptionValue {
  id: number
  r_product_option_id: number
  name: string
  vid: string | null
  is_color: number
  color: string | null
  image_url: string | null
}

// Product Option (e.g., Color, Size)
interface ProductOption {
  id: number
  pid: string | null
  name: string
  is_color: number
  values: ProductOptionValue[]
}

// Selected option in a variation
interface SelectedOption {
  r_product_option_id: number
  option_id: number
  value_id: number
  value_name: string
  image_url: string | null
}

// Product Variation (NEW structure matching PHP backend)
interface ProductVariation {
  id: number
  sku_id: string | null
  variation_name: string | null
  props_ids: string | null
  price: number | null
  currency_symbol: string
  variation_image: string | null
  status: string
  selected_options: SelectedOption[]
  cart_quantity: number
}

interface ProductDetails {
  id: number
  productCode: string
  productName: string
  displayName: string | null
  originalName: string | null
  description: string | null
  displayDescription: string | null
  model: string | null
  brand: number | null
  productQtyLeft: number
  productCost: number
  productPrice: number
  hasOption: number
  booleanPercentDiscount: number
  salesDiscount: number | null
  productCondition: number | null
  freeShipping: number
  flatRate: number
  multiShipping: number
  shippingCost: number | null
  showOnWebsite: number
  productStatus: number
  outOfStock: number
  mainImage: string | null
  slug: string
  currencyId: number
  expressDelivery: number
  createdAt: Date | null
  updatedAt: Date | null
  viewCount: number
  salesCount: number
  buyerCount: number
  productUrl: string | null
  categoryName?: string | null
  category_name?: string | null
  brandName?: string | null
  brand_name?: string | null
  storeName?: string | null
  store_name?: string | null
  imageCount?: number
  // New fields from product_1688_info
  titleZh?: string | null
  titleEn?: string | null
  descriptionZh?: string | null
  descriptionEn?: string | null
  videoUrl?: string | null
  infoVideoUrl?: string | null
  serviceTags?: Record<string, unknown>[] | null
  productProps?: Record<string, unknown>[] | null
  images?: string[] | null
  infoOriginPrice?: number | null
  // Computed fields
  rating?: number | null
  reviewsCount?: number
  convertedPrice?: number | null
  currencySymbol?: string
  // LEGACY Relations (old variant structure)
  variations?: ProductVariant[]
  // NEW variant structure matching PHP backend
  options?: ProductOption[]
  variationsNew?: ProductVariation[]
}

interface ProductDetailsProps {
  productId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductDetails({ productId, open, onOpenChange }: ProductDetailsProps) {
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchProductDetails = React.useCallback(async () => {
    if (!productId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/products/${productId}`)
      const data = await response.json()

      if (data.success && data.product) {
        setProduct(data.product)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch product details",
          variant: "destructive",
        })
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Error fetching product details:', error)
      toast({
        title: "Error",
        description: "Failed to fetch product details",
        variant: "destructive",
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [productId, toast, onOpenChange])

  useEffect(() => {
    if (open && productId) {
      fetchProductDetails()
    } else {
      // Reset product when dialog closes
      setProduct(null)
    }
  }, [open, productId, fetchProductDetails])

  const getDisplayName = () => {
    if (!product) return 'N/A'
    return product.displayName || product.productName || product.originalName || 'N/A'
  }

  const getFinalPrice = () => {
    if (!product) return 0
    const price = product.productPrice || 0
    const discount = product.salesDiscount
    const isPercent = product.booleanPercentDiscount === 1
    
    if (discount && discount > 0) {
      if (isPercent) {
        return price - (price * discount / 100)
      } else {
        return price - discount
      }
    }
    return price
  }

  const getShippingText = () => {
    if (!product) return '—'
    if (product.freeShipping === 1) return 'Free Shipping'
    if (product.flatRate === 1) return 'Flat Rate'
    if (product.multiShipping === 1) return 'Multi Shipping'
    return 'Standard'
  }

  const formatDate = (date: Date | null | string) => {
    if (!date) return 'N/A'
    try {
      const d = typeof date === 'string' ? new Date(date) : date
      if (isNaN(d.getTime())) return 'N/A'
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'N/A'
    }
  }

  const isValidUrl = (url: string | null | undefined) => {
    return url && (url.startsWith('http') || url.startsWith('//') || url.startsWith('/'))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-6xl w-[90vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        showMaximizeButton={true}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-2xl font-semibold">Product Details #{product?.id}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 flex-1 overflow-y-auto">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : product ? (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-muted/30 min-h-0">
            {/* Product Image and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden border bg-muted">
                  {product.mainImage && isValidUrl(product.mainImage) ? (
                    <Image
                      src={product.mainImage}
                      alt={getDisplayName()}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized={true}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{getDisplayName()}</h2>
                  {product.originalName && product.originalName !== product.productName && (
                    <p className="text-sm text-muted-foreground mt-1">Original: {product.originalName}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={product.showOnWebsite === 1 ? "default" : "secondary"}>
                    {product.showOnWebsite === 1 ? "Published" : "Hidden"}
                  </Badge>
                  <Badge variant={product.productStatus === 32 ? "default" : "destructive"}>
                    {product.productStatus === 32 ? "Active" : "Inactive"}
                  </Badge>
                  {(() => {
                    const variantsCount = (product.variationsNew?.length || 0) || (product.variations?.length || 0);
                    const hasOptions = product.options && product.options.length > 0;
                    return (
                      <Badge variant={variantsCount > 0 || hasOptions ? "default" : "secondary"}>
                        {variantsCount > 0 
                          ? `Has ${variantsCount} Variants` 
                          : hasOptions 
                            ? `Has ${product.options?.length} Options`
                            : "No Variants"}
                      </Badge>
                    );
                  })()}
                  {product.outOfStock === 1 || product.productQtyLeft === 0 ? (
                    <Badge variant="destructive">Out of Stock</Badge>
                  ) : (
                    <Badge variant="default">In Stock</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Price:</span>
                    <div className="text-right">
                      {product.convertedPrice !== null && product.convertedPrice !== undefined ? (
                        <>
                          <span className="text-xl font-bold">
                            {product.currencySymbol || '$'}{product.convertedPrice.toFixed(2)}
                          </span>
                          {product.salesDiscount && product.salesDiscount > 0 && (
                            <div className="text-xs text-green-600 mt-1">
                              {product.booleanPercentDiscount === 1 
                                ? `${product.salesDiscount}% off` 
                                : `${product.currencySymbol || '$'}${product.salesDiscount} off`}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xl font-bold">
                          ${getFinalPrice().toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Stock Quantity:</span>
                    <Badge variant={product.productQtyLeft > 0 && product.outOfStock === 0 ? "default" : "destructive"}>
                      {product.productQtyLeft > 0 && product.outOfStock === 0 
                        ? product.productQtyLeft.toLocaleString() 
                        : "Out of Stock"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cost:</span>
                    <span className="text-xl font-bold">${product.productCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Product Information</h3>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Product ID:</span>
                    <p className="text-sm">{product.id}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Product Code:</span>
                    <p className="text-sm">{product.productCode || 'N/A'}</p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Slug:</span>
                    <p className="text-sm">{product.slug || 'N/A'}</p>
                  </div>

                  {product.model && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Model:</span>
                      <p className="text-sm">{product.model}</p>
                    </div>
                  )}

                  {(product.categoryName || product.category_name) && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Category:</span>
                      <p className="text-sm">{product.categoryName || product.category_name}</p>
                    </div>
                  )}

                  {(product.brandName || product.brand_name) && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Brand:</span>
                      <p className="text-sm">{product.brandName || product.brand_name}</p>
                    </div>
                  )}

                  {/* Ratings & Reviews */}
                  {(() => {
                    const hasRating = product.rating !== null && product.rating !== undefined;
                    const hasReviews = product.reviewsCount !== undefined && product.reviewsCount > 0;
                    return (hasRating || hasReviews) ? (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Rating:</span>
                        <div className="flex items-center gap-2 mt-1">
                          {typeof product.rating === 'number' && product.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{product.rating.toFixed(2)}</span>
                            </div>
                          )}
                          {typeof product.reviewsCount === 'number' && product.reviewsCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({product.reviewsCount} reviews)
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Video URL */}
                  {(product.infoVideoUrl || product.videoUrl) && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Video:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={String(product.infoVideoUrl || product.videoUrl || '#')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View Product Video
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Shipping & Status</h3>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Shipping Type:</span>
                    <p className="text-sm">{getShippingText()}</p>
                  </div>

                  {product.shippingCost !== null && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Shipping Cost:</span>
                      <p className="text-lg">${product.shippingCost.toFixed(2)}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Express Delivery:</span>
                    <Badge variant={product.expressDelivery === 1 ? "default" : "secondary"}>
                      {product.expressDelivery === 1 ? "Yes" : "No"}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Views:</span>
                    <p className="text-sm">{product.viewCount.toLocaleString()}</p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Sales Count:</span>
                    <p className="text-sm">{product.salesCount.toLocaleString()}</p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Buyer Count:</span>
                    <p className="text-sm">{product.buyerCount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Options (Color, Size, etc.) - NEW structure */}
            {product.options && product.options.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-lg mb-3">Product Options</h3>
                <div className="space-y-4">
                  {product.options.map((option) => (
                    <div key={option.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{option.name}</span>
                        {option.is_color === 1 && (
                          <Badge variant="outline" className="text-xs">Color</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">({option.values.length} options)</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value) => (
                          <div
                            key={value.id}
                            className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-muted/30"
                          >
                            {value.image_url && (
                              <div className="relative w-6 h-6 rounded overflow-hidden border shrink-0">
                                <Image
                                  src={value.image_url}
                                  alt={value.name}
                                  fill
                                  className="object-cover"
                                  sizes="24px"
                                  unoptimized={true}
                                />
                              </div>
                            )}
                            {value.color && value.is_color === 1 && !value.image_url && (
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: value.color }}
                                title={value.color}
                              />
                            )}
                            <span className="text-sm">{value.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Variations/SKUs - NEW structure */}
            {product.variationsNew && product.variationsNew.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Product Variations ({product.variationsNew.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {product.variationsNew.map((variant, index) => (
                    <div key={variant.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-3">
                        {variant.variation_image && (
                          <div className="relative w-16 h-16 rounded overflow-hidden border shrink-0">
                            <Image
                              src={variant.variation_image}
                              alt={variant.variation_name || `Variation ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="64px"
                              unoptimized={true}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{variant.variation_name || `Variation ${index + 1}`}</p>
                          {variant.selected_options && variant.selected_options.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {variant.selected_options.map((opt, optIndex) => (
                                <Badge key={optIndex} variant="secondary" className="text-xs">
                                  {opt.value_name}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {variant.price !== null && variant.price !== undefined && (
                              <span className="text-sm font-semibold">
                                {variant.currency_symbol || '$'}{variant.price.toFixed(2)}
                              </span>
                            )}
                            <Badge 
                              variant={variant.status === 'active' ? "default" : "destructive"} 
                              className="text-xs"
                            >
                              {variant.status === 'active' ? 'Active' : variant.status === 'out_of_stock' ? 'Out of Stock' : variant.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LEGACY Variants/SKUs - for backward compatibility */}
            {(!product.variationsNew || product.variationsNew.length === 0) && 
             product.variations && product.variations.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Product Variants ({product.variations.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {product.variations.map((variant, index) => (
                    <div key={variant.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-3">
                        {variant.variantImage && (
                          <div className="relative w-16 h-16 rounded overflow-hidden border shrink-0">
                            <Image
                              src={variant.variantImage}
                              alt={variant.variantName || `Variant ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="64px"
                              unoptimized={true}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{variant.variantName || `Variant ${index + 1}`}</p>
                          {variant.propsNames && (
                            <p className="text-xs text-muted-foreground mt-1">{variant.propsNames}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {(variant.convertedPrice !== null && variant.convertedPrice !== undefined) && (
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-semibold">
                                  {variant.currencySymbol || '$'}{variant.convertedPrice.toFixed(2)}
                                </span>
                                {variant.discountPrice !== null && variant.discountPrice > 0 && (
                                  <span className="text-xs text-green-600 ml-1">
                                    (Discount available)
                                  </span>
                                )}
                              </div>
                            )}
                            {variant.stock !== undefined && (
                              <Badge variant={variant.stock > 0 ? "default" : "destructive"} className="text-xs">
                                {variant.stock > 0 ? `Stock: ${variant.stock}` : "Out of Stock"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {(product.description || product.displayDescription || product.descriptionEn || product.descriptionZh) && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-lg mb-3">Description</h3>
                <div className="space-y-3">
                  {(product.displayDescription || product.description) && (
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {product.displayDescription || product.description}
                    </div>
                  )}
                  {product.descriptionEn && product.descriptionEn !== product.displayDescription && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">English Description:</p>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {product.descriptionEn}
                      </div>
                    </div>
                  )}
                  {product.descriptionZh && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Chinese Description:</p>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {product.descriptionZh}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Images */}
            {product.images && Array.isArray(product.images) && product.images.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-lg mb-3">Product Images ({product.images.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {product.images.map((imageUrl, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                      <Image
                        src={imageUrl}
                        alt={`Product image ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                        unoptimized={true}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div>
                <h3 className="font-semibold text-lg mb-3">Timestamps</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Created:</span>
                    <p>{formatDate(product.createdAt)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Updated:</span>
                    <p>{formatDate(product.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {product.productUrl && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Links</h3>
                  <a
                    href={product.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {product.productUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 flex-1 overflow-y-auto">
            <p className="text-muted-foreground">No product data available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

