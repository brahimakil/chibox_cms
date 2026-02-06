'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PaginatedCombobox, ComboboxOption } from '@/components/ui/paginated-combobox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Form validation schema
const flashSalesFormSchema = z.object({
  title: z.string().min(1, 'Title cannot be blank.').max(255, 'Title must be 255 characters or less').trim(),
  slug: z.string().min(1, 'Slug cannot be blank.').max(255, 'Slug must be 255 characters or less').trim(),
  endTime: z.string().optional().nullable(),
  display: z.enum(['0', '1']),
  sliderType: z.enum(['0', '1']),
  color1: z.string().min(1, 'Color 1 cannot be blank.').max(20, 'Color 1 must be 20 characters or less').trim(),
  color2: z.string().min(1, 'Color 2 cannot be blank.').max(20, 'Color 2 must be 20 characters or less').trim(),
  color3: z.string().min(1, 'Color 3 cannot be blank.').max(20, 'Color 3 must be 20 characters or less').trim(),
  discount: z.string().min(1, 'Discount cannot be blank.').refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: 'Discount must be a valid number',
  }),
})

type FlashSalesFormValues = z.infer<typeof flashSalesFormSchema>

interface FlashSalesFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  flashSaleId?: number | null
  onSuccess?: () => void
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

interface ListItem {
  id: number
  label: string
  value: number
}

export function FlashSalesForm({ open, onOpenChange, flashSaleId, onSuccess }: FlashSalesFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingFlashSale, setIsLoadingFlashSale] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined)

  const form = useForm<FlashSalesFormValues>({
    resolver: zodResolver(flashSalesFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      endTime: null,
      display: '1',
      sliderType: '1',
      color1: '',
      color2: '',
      color3: '',
      discount: '',
    },
  })

  // Watch title to auto-generate slug
  const title = form.watch('title')

  // Auto-generate slug from title
  useEffect(() => {
    if (title) {
      const generatedSlug = title.trim().replace(/\s+/g, '-')
      form.setValue('slug', generatedSlug, { shouldValidate: true })
    } else {
      form.setValue('slug', '', { shouldValidate: false })
    }
  }, [title, form])

  // Fetch products for combobox
  const fetchProducts = useCallback(async (search: string, page: number, limit: number) => {
    try {
      const items: ComboboxOption[] = []
      
      // If search is a number, try to find by ID first
      if (search && !isNaN(Number(search)) && page === 1) {
        try {
          const response = await fetch(`/api/products/${search}/details`)
          const result = await response.json()
          if (result.success && result.product) {
            const product = result.product
            const label = product.displayName || product.productName || product.originalName || `Product ${product.id}`
            items.push({
              value: product.id.toString(),
              label: label,
            })
          }
        } catch (error) {
          console.error('Error fetching product by ID:', error)
        }
      }

      const endpoint = `/api/products/list?limit=${limit}&page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`
      const response = await fetch(endpoint)
      const result = await response.json()
      
      if (result.success && result.products) {
        const fetchedItems: ComboboxOption[] = result.products.map((item: ListItem) => ({
          value: item.id.toString(),
          label: item.label,
        }))
        
        // Merge with items found by ID, avoiding duplicates
        const existingValues = new Set(items.map(i => i.value))
        fetchedItems.forEach(item => {
          if (!existingValues.has(item.value)) {
            items.push(item)
          }
        })
      }
      
      return {
        options: items,
        pagination: result.pagination || { page, limit, total: 0, hasMore: false },
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      return { options: [], pagination: { page, limit, total: 0, hasMore: false } }
    }
  }, [])

  // Fetch flash sale data when editing
  useEffect(() => {
    const fetchFlashSaleData = async () => {
      if (!flashSaleId) return
      
      try {
        setIsLoadingFlashSale(true)
        console.log('Fetching flash sale data for ID:', flashSaleId)
        const response = await fetch(`/api/flash-sales/${flashSaleId}`)
        console.log('Flash sale fetch response status:', response.status)
        const result = await response.json()
        console.log('Flash sale fetch result:', result)

        if (result.success && result.flashSale) {
          const flashSale = result.flashSale
          
          // Format endTime for datetime-local input (YYYY-MM-DDTHH:mm)
          let endTimeFormatted = null
          if (flashSale.endTime) {
            const date = new Date(flashSale.endTime)
            if (!isNaN(date.getTime())) {
              // Format as YYYY-MM-DDTHH:mm for datetime-local input
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              const hours = String(date.getHours()).padStart(2, '0')
              const minutes = String(date.getMinutes()).padStart(2, '0')
              endTimeFormatted = `${year}-${month}-${day}T${hours}:${minutes}`
            }
          }
          
          // Reset form with fetched data
          form.reset({
            title: flashSale.title || '',
            slug: flashSale.slug || '',
            endTime: endTimeFormatted,
            display: flashSale.display?.toString() || '1',
            sliderType: flashSale.sliderType?.toString() || '1',
            color1: flashSale.color1 || '',
            color2: flashSale.color2 || '',
            color3: flashSale.color3 || '',
            discount: flashSale.discount?.toString() || '',
          })

          // Fetch products for this flash sale
          try {
            const productsResponse = await fetch(`/api/flash-sales/${flashSaleId}/products`)
            const productsResult = await productsResponse.json()
            if (productsResult.success && productsResult.products) {
              const products: Product[] = productsResult.products.map((p: {
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
              setSelectedProducts(products)
            }
          } catch (error) {
            console.error('Error fetching flash sale products:', error)
            // If endpoint doesn't exist, we'll handle it gracefully
          }
        } else {
          toast({
            title: "Error",
            description: result.error || 'Failed to fetch flash sale data',
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error fetching flash sale:', error)
        toast({
          title: "Error",
          description: 'Failed to fetch flash sale data',
          variant: "destructive",
        })
      } finally {
        setIsLoadingFlashSale(false)
      }
    }

    if (open && flashSaleId) {
      fetchFlashSaleData()
    } else if (!open) {
      // Reset when dialog closes
      form.reset({
        title: '',
        slug: '',
        endTime: null,
        display: '1',
        sliderType: '1',
        color1: '',
        color2: '',
        color3: '',
        discount: '',
      })
      setSelectedProducts([])
      setSelectedProductId(undefined)
    }
  }, [open, flashSaleId, form, toast])

  // Handle product selection
  const handleProductSelect = (productId: string | undefined) => {
    if (!productId) return
    
    // Check if product is already selected
    if (selectedProducts.some(p => p.id.toString() === productId)) {
      toast({
        title: "Product already added",
        description: "This product is already in the list",
        variant: "default",
      })
      setSelectedProductId(undefined)
      return
    }

    // Find the product from the API with details
    fetch(`/api/products/${productId}/details`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.product) {
          const product = result.product
          const defaultDiscount = form.getValues('discount') || '0'
          const newProduct: Product = {
            id: product.id,
            label: product.displayName || product.productName || product.originalName || `Product ${product.id}`,
            mainImage: product.mainImage,
            categories: product.categories,
            brandName: product.brandName,
            imageCount: product.imageCount,
            productQtyLeft: product.productQtyLeft,
            storeName: product.storeName || null,
            discount: Number(defaultDiscount),
          }
          setSelectedProducts(prev => [...prev, newProduct])
          setSelectedProductId(undefined)
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to add product",
            variant: "destructive",
          })
        }
      })
      .catch(error => {
        console.error('Error fetching product:', error)
        toast({
          title: "Error",
          description: "Failed to add product",
          variant: "destructive",
        })
      })
  }

  // Handle product removal
  const handleProductRemove = (productId: number) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId))
  }

  // Handle product discount change
  const handleProductDiscountChange = (productId: number, discount: string) => {
    const discountValue = discount === '' ? 0 : Number(discount)
    if (isNaN(discountValue) || discountValue < 0) return
    
    setSelectedProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, discount: discountValue } : p
    ))
  }

  const onFormSubmit = async (data: FlashSalesFormValues) => {
    try {
      setIsLoading(true)
      
      const isEditMode = flashSaleId !== undefined && flashSaleId !== null
      
      // Validate that all products have discount values
      if (selectedProducts.length > 0) {
        const productsWithoutDiscount = selectedProducts.filter(p => p.discount === undefined || p.discount === null || isNaN(p.discount))
        if (productsWithoutDiscount.length > 0) {
          toast({
            title: "Error",
            description: "Please enter discount values for all products",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }
      }
      
      const url = isEditMode
        ? `/api/flash-sales/${flashSaleId}`
        : '/api/flash-sales'
      const method = isEditMode ? 'PUT' : 'POST'

      // Format endTime for API (convert datetime-local to ISO string)
      let endTimeFormatted = null
      if (data.endTime) {
        const date = new Date(data.endTime)
        if (!isNaN(date.getTime())) {
          endTimeFormatted = date.toISOString()
        }
      }

      const requestBody: {
        title: string
        slug: string
        color_1: string
        color_2: string
        color_3: string
        end_time?: string | null
        display: number
        slider_type: number
        r_store_id: number
        discount: number
        related_products: number[]
        discount_values: number[]
      } = {
        title: data.title.trim(),
        slug: data.slug.trim(),
        color_1: data.color1.trim(),
        color_2: data.color2.trim(),
        color_3: data.color3.trim(),
        end_time: endTimeFormatted,
        display: parseInt(data.display),
        slider_type: parseInt(data.sliderType),
        r_store_id: 1, // TODO: Get from auth context or store selection
        discount: Number(data.discount),
        related_products: selectedProducts.map(p => p.id),
        discount_values: selectedProducts.map(p => p.discount),
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: isEditMode ? 'Flash sale updated successfully' : 'Flash sale created successfully',
        })
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: result.error || (isEditMode ? 'Failed to update flash sale' : 'Failed to create flash sale'),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving flash sale:', error)
      toast({
        title: "Error",
        description: 'Failed to save flash sale',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[1000px] w-[90vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        showMaximizeButton={true}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-2xl font-semibold">
            {flashSaleId ? 'Edit Flash Sale' : 'Create Flash Sale'}
          </DialogTitle>
        </DialogHeader>

        {isLoadingFlashSale ? (
          <div className="flex items-center justify-center py-16 flex-1 overflow-y-auto">
            <div className="text-muted-foreground">Loading flash sale data...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="flex flex-col h-full min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-muted/30 min-h-0">
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Title Field */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Title<span className="text-destructive ml-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter title"
                              className="h-11 bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Slug Field */}
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Slug<span className="text-destructive ml-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Slug will be auto-generated"
                              className="h-11 bg-background"
                              readOnly
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* End Time Field */}
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">End Time</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              value={field.value || ''}
                              className="h-11 bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Display Field */}
                    <FormField
                      control={form.control}
                      name="display"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Display<span className="text-destructive ml-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="flex gap-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="0" id="display-false" />
                                <Label htmlFor="display-false" className="cursor-pointer">False</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="1" id="display-true" />
                                <Label htmlFor="display-true" className="cursor-pointer">True</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Slider Type Field */}
                    <FormField
                      control={form.control}
                      name="sliderType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Slider Type<span className="text-destructive ml-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="flex gap-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="0" id="slider-grid" />
                                <Label htmlFor="slider-grid" className="cursor-pointer">Grid</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="1" id="slider-swiper" />
                                <Label htmlFor="slider-swiper" className="cursor-pointer">Swiper</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Color 1 Field */}
                    <FormField
                      control={form.control}
                      name="color1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Color 1<span className="text-destructive ml-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={field.value || '#000000'}
                                onChange={(e) => {
                                  field.onChange(e.target.value)
                                }}
                                className="h-11 w-20 bg-background cursor-pointer"
                              />
                              <Input
                                value={field.value || ''}
                                onChange={(e) => {
                                  field.onChange(e.target.value)
                                }}
                                placeholder="#000000"
                                className="h-11 bg-background flex-1"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Color 2 Field */}
                    <FormField
                      control={form.control}
                      name="color2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Color 2<span className="text-destructive ml-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={field.value || '#000000'}
                                onChange={(e) => {
                                  field.onChange(e.target.value)
                                }}
                                className="h-11 w-20 bg-background cursor-pointer"
                              />
                              <Input
                                value={field.value || ''}
                                onChange={(e) => {
                                  field.onChange(e.target.value)
                                }}
                                placeholder="#000000"
                                className="h-11 bg-background flex-1"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Color 3 Field */}
                    <FormField
                      control={form.control}
                      name="color3"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Color 3<span className="text-destructive ml-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={field.value || '#000000'}
                                onChange={(e) => {
                                  field.onChange(e.target.value)
                                }}
                                className="h-11 w-20 bg-background cursor-pointer"
                              />
                              <Input
                                value={field.value || ''}
                                onChange={(e) => {
                                  field.onChange(e.target.value)
                                }}
                                placeholder="#000000"
                                className="h-11 bg-background flex-1"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Discount Field */}
                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Discount<span className="text-destructive ml-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Enter discount percentage"
                              className="h-11 bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Choose Products Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="h-px bg-blue-500 flex-1"></div>
                    <h3 className="text-base font-semibold text-blue-600">Choose Products</h3>
                    <div className="h-px bg-blue-500 flex-1"></div>
                  </div>

                  {/* Product Search Combobox */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Product Search</Label>
                    <PaginatedCombobox
                      fetchOptions={fetchProducts}
                      value={selectedProductId}
                      onValueChange={(value) => {
                        setSelectedProductId(value)
                        if (value) {
                          handleProductSelect(value)
                        }
                      }}
                      placeholder="Product Search"
                      searchPlaceholder="Search products..."
                      emptyText="No product found."
                      className="h-11 bg-background"
                      limit={50}
                    />
                  </div>

                  {/* Product List Table */}
                  {selectedProducts.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Selected Products</Label>
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
                              <TableHead className="text-right">Images Count</TableHead>
                              <TableHead className="w-20">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedProducts.map((product, index) => (
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
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={product.discount}
                                    onChange={(e) => handleProductDiscountChange(product.id, e.target.value)}
                                    className="h-8 w-full"
                                  />
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
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleProductRemove(product.id)}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/30 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="h-10 px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="h-10 px-6"
                >
                  {isLoading ? 'Saving...' : flashSaleId ? 'Update Flash Sale' : 'Create Flash Sale'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

