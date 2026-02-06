'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, Clock, Truck } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Product Variation in Order (matching PHP backend)
interface OrderProductVariation {
  option_name: string | null
  value_name: string | null
  is_color: number
  color: string | null
  image_url: string | null
  pid: string | null
  vid: string | null
}

// Order Product interface matching PHP backend structure
interface OrderProduct {
  id: number
  product_id: number
  product_code: string
  product_name: string
  source_product_id: string | null
  sku_id: string | null
  variation_name: string | null
  props_ids: string | null
  main_image: string | null
  variation_image: string | null
  quantity: number
  price: number
  total: number
  variations: OrderProductVariation[]
}

// Order Tracking entry (matching PHP backend)
interface OrderTrackingEntry {
  status: string
  status_id: number
  date: string
}

// Order Address (nested object matching PHP backend)
interface OrderAddress {
  first_name: string
  last_name: string
  country_code: string
  phone_number: string
  address: string
  country: string
  city: string
  state: string | null
  route_name: string
  building_name: string
  floor_number: number
}

// Order interface matching PHP backend structure (v3.0.0)
interface OrderDetails {
  id: number
  order_number: string
  status: string
  status_id: number
  subtotal: number
  shipping_amount: number
  tax_amount: number
  discount_amount: number
  total: number
  currency_id: number
  currency_symbol: string
  quantity: number
  is_paid: number
  payment_type: string
  payment_type_id: number
  payment_id: string | null
  address: OrderAddress
  client_notes: string | null
  created_at: string | null
  updated_at: string | null
  products: OrderProduct[]
  tracking: OrderTrackingEntry[]
  userName?: string | null
}

interface OrderDetailsProps {
  orderId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDetails({ orderId, open, onOpenChange }: OrderDetailsProps) {
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchOrderDetails = React.useCallback(async () => {
    if (!orderId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${orderId}?enriched=true`)
      const data = await response.json()

      if (data.success && data.order) {
        setOrder(data.order)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch order details",
          variant: "destructive",
        })
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Error fetching order details:', error)
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive",
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [orderId, toast, onOpenChange])

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails()
    } else {
      setOrder(null)
    }
  }, [open, orderId, fetchOrderDetails])

  const getStatusClassName = () => {
    if (!order) return ''
    const status = order.status_id
    switch (status) {
      case 9: return "w-fit bg-yellow-500 hover:bg-yellow-600 text-white border-transparent"
      case 10: return "w-fit bg-blue-500 hover:bg-blue-600 text-white border-transparent"
      case 11: return "w-fit bg-red-500 hover:bg-red-600 text-white border-transparent"
      case 12: return "w-fit bg-cyan-500 hover:bg-cyan-600 text-white border-transparent"
      case 13: return "w-fit bg-purple-500 hover:bg-purple-600 text-white border-transparent"
      case 14: return "w-fit bg-green-500 hover:bg-green-600 text-white border-transparent"
      case 15: return "w-fit bg-red-500 hover:bg-red-600 text-white border-transparent"
      default: return "w-fit"
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    try {
      const d = new Date(date)
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

  const formatTrackingDate = (date: string | null) => {
    if (!date) return 'N/A'
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return 'N/A'
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
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
          <DialogTitle className="text-2xl font-semibold">
            {order?.order_number || `Order #${orderId}`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 flex-1 overflow-y-auto">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : order ? (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-muted/30 min-h-0">
            {/* Order Status and Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Order Information</h3>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Order Number:</span>
                    <p className="text-sm font-medium">{order.order_number}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Status:</span>
                    <div className="mt-1">
                      <Badge variant="outline" className={getStatusClassName()}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Payment Status:</span>
                    <div className="mt-1">
                      <Badge variant={order.is_paid === 1 ? "default" : "destructive"} className="w-fit">
                        {order.is_paid === 1 ? "Paid" : "Unpaid"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Payment Method:</span>
                    <p className="text-sm">{order.payment_type}</p>
                  </div>

                  {order.payment_id && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Payment ID:</span>
                      <p className="text-sm font-mono">{order.payment_id}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Created:</span>
                    <p className="text-sm">{formatDate(order.created_at)}</p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Updated:</span>
                    <p className="text-sm">{formatDate(order.updated_at)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Customer Information</h3>
                
                <div className="space-y-3">
                  {order.userName && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Customer:</span>
                      <p className="text-sm">{order.userName}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Name:</span>
                    <p className="text-sm">{order.address.first_name} {order.address.last_name}</p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                    <p className="text-sm">{order.address.country_code} {order.address.phone_number}</p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Address:</span>
                    <p className="text-sm">
                      {order.address.address}, {order.address.route_name}, {order.address.building_name}, Floor {order.address.floor_number}
                      <br />
                      {order.address.city}, {order.address.state ? `${order.address.state}, ` : ''}{order.address.country}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            {order.products && order.products.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg">Order Items ({order.products.length})</h3>
                
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Image</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.products.map((product) => {
                        const displayImage = product.variation_image || product.main_image
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              {displayImage && isValidUrl(displayImage) ? (
                                <div className="relative w-16 h-16 rounded overflow-hidden border bg-muted">
                                  <Image
                                    src={displayImage}
                                    alt={product.product_name}
                                    fill
                                    className="object-cover"
                                    sizes="64px"
                                    unoptimized={true}
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center">
                                  <Package className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{product.product_name}</div>
                                {product.product_code && (
                                  <div className="text-xs text-muted-foreground">Code: {product.product_code}</div>
                                )}
                                {product.sku_id && (
                                  <div className="text-xs text-muted-foreground">SKU: {product.sku_id}</div>
                                )}
                                {product.variation_name && (
                                  <div className="text-xs text-muted-foreground">{product.variation_name}</div>
                                )}
                                {/* Product Variations */}
                                {product.variations && product.variations.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {product.variations.map((variation, idx) => (
                                      <div key={idx} className="flex items-center gap-1">
                                        {variation.is_color === 1 && variation.color && (
                                          <div
                                            className="w-3 h-3 rounded-full border"
                                            style={{ backgroundColor: variation.color }}
                                            title={variation.color}
                                          />
                                        )}
                                        {variation.image_url && isValidUrl(variation.image_url) && (
                                          <div className="relative w-4 h-4 rounded overflow-hidden border">
                                            <Image
                                              src={variation.image_url}
                                              alt={variation.value_name || ''}
                                              fill
                                              className="object-cover"
                                              sizes="16px"
                                              unoptimized={true}
                                            />
                                          </div>
                                        )}
                                        <Badge variant="secondary" className="text-xs">
                                          {variation.option_name}: {variation.value_name}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-medium">
                                {order.currency_symbol}{product.price.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{product.quantity}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-medium">
                                {order.currency_symbol}{product.total.toFixed(2)}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Order Summary</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{order.currency_symbol}{order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span className="font-medium">{order.currency_symbol}{order.shipping_amount.toFixed(2)}</span>
                  </div>
                  {order.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax:</span>
                      <span className="font-medium">{order.currency_symbol}{order.tax_amount.toFixed(2)}</span>
                    </div>
                  )}
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span className="font-medium">-{order.currency_symbol}{order.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Total:</span>
                    <span className="font-semibold text-lg">{order.currency_symbol}{order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Order Tracking */}
              {order.tracking && order.tracking.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Order Tracking
                  </h3>
                  
                  <div className="space-y-3">
                    {order.tracking.map((track, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                          {index < order.tracking.length - 1 && (
                            <div className="w-0.5 h-8 bg-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 pb-2">
                          <p className={`text-sm font-medium ${index === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {track.status}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTrackingDate(track.date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {order.client_notes && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg">Notes</h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Client Notes:</span>
                    <p className="mt-1 whitespace-pre-wrap">{order.client_notes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 flex-1 overflow-y-auto">
            <p className="text-muted-foreground">No order data available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
