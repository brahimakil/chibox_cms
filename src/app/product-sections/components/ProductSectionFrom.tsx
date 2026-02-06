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
const productSectionFormSchema = z.object({
  sectionName: z.string().min(1, 'Section Name cannot be blank.').max(100, 'Section Name must be 100 characters or less').trim(),
  slug: z.string().min(1, 'Slug cannot be blank.').max(200, 'Slug must be 200 characters or less').trim(),
  sliderType: z.enum(['0', '1']),
  showHide: z.enum(['0', '1']),
})

type ProductSectionFormValues = z.infer<typeof productSectionFormSchema>

interface ProductSectionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionId?: number | null
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
}

interface ListItem {
  id: number
  label: string
  value: number
}

export function ProductSectionForm({ open, onOpenChange, sectionId, onSuccess }: ProductSectionFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSection, setIsLoadingSection] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined)

  const form = useForm<ProductSectionFormValues>({
    resolver: zodResolver(productSectionFormSchema),
    defaultValues: {
      sectionName: '',
      slug: '',
      sliderType: '0',
      showHide: '0',
    },
  })

  // Watch sectionName to auto-generate slug
  const sectionName = form.watch('sectionName')

  // Auto-generate slug from section name
  useEffect(() => {
    if (sectionName) {
      const generatedSlug = sectionName.trim().replace(/\s+/g, '-')
      form.setValue('slug', generatedSlug, { shouldValidate: true })
    } else {
      form.setValue('slug', '', { shouldValidate: false })
    }
  }, [sectionName, form])

  // Fetch products for combobox
  const fetchProducts = useCallback(async (search: string, page: number, limit: number) => {
    try {
      const items: ComboboxOption[] = []
      
      // If search is a number, try to find by ID first
      if (search && !isNaN(Number(search)) && page === 1) {
        try {
          const response = await fetch(`/api/products/${search}`)
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

  // Fetch product section data when editing
  useEffect(() => {
    const fetchSectionData = async () => {
      if (!sectionId) return
      
      try {
        setIsLoadingSection(true)
        const response = await fetch(`/api/product-sections/${sectionId}`)
        const result = await response.json()

        if (result.success && result.section) {
          const section = result.section
          
          // Reset form with fetched data
          form.reset({
            sectionName: section.sectionName || '',
            slug: section.slug || '',
            sliderType: section.sliderType?.toString() || '0',
            showHide: section.showHide?.toString() || '0',
          })

          // Fetch products for this section with details
          try {
            const productsResponse = await fetch(`/api/product-sections/${sectionId}/products`)
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
              }) => ({
                id: p.id,
                label: p.displayName || p.productName || p.originalName || `Product ${p.id}`,
                mainImage: p.mainImage || null,
                categories: p.categories || null,
                brandName: p.brandName || null,
                imageCount: p.imageCount || 0,
                productQtyLeft: p.productQtyLeft || 0,
              }))
              setSelectedProducts(products)
            }
          } catch (error) {
            console.error('Error fetching section products:', error)
            // If endpoint doesn't exist, we'll handle it gracefully
          }
        } else {
          toast({
            title: "Error",
            description: result.error || 'Failed to fetch product section data',
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error fetching product section:', error)
        toast({
          title: "Error",
          description: 'Failed to fetch product section data',
          variant: "destructive",
        })
      } finally {
        setIsLoadingSection(false)
      }
    }

    if (open && sectionId) {
      fetchSectionData()
    } else if (!open) {
      // Reset when dialog closes
      form.reset({
        sectionName: '',
        slug: '',
        sliderType: '0',
        showHide: '0',
      })
      setSelectedProducts([])
      setSelectedProductId(undefined)
    }
  }, [open, sectionId, form, toast])

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
          const newProduct: Product = {
            id: product.id,
            label: product.displayName || product.productName || product.originalName || `Product ${product.id}`,
            mainImage: product.mainImage,
            categories: product.categories,
            brandName: product.brandName,
            imageCount: product.imageCount,
            productQtyLeft: product.productQtyLeft,
          }
          setSelectedProducts(prev => [...prev, newProduct])
          setSelectedProductId(undefined)
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

  const onFormSubmit = async (data: ProductSectionFormValues) => {
    try {
      setIsLoading(true)
      
      const isEditMode = sectionId !== undefined && sectionId !== null
      
      const url = isEditMode
        ? `/api/product-sections/${sectionId}`
        : '/api/product-sections'
      const method = isEditMode ? 'PUT' : 'POST'

      const requestBody: {
        section_name: string
        slug: string
        slider_type: number
        show_hide: number
        related_products: number[]
      } = {
        section_name: data.sectionName.trim(),
        slug: data.slug.trim(),
        slider_type: parseInt(data.sliderType),
        show_hide: parseInt(data.showHide),
        related_products: selectedProducts.map(p => p.id),
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
          description: isEditMode ? 'Product section updated successfully' : 'Product section created successfully',
        })
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: result.error || (isEditMode ? 'Failed to update product section' : 'Failed to create product section'),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving product section:', error)
      toast({
        title: "Error",
        description: 'Failed to save product section',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[800px] w-[90vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        showMaximizeButton={true}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-2xl font-semibold">
            {sectionId ? 'Edit Product Section' : 'Create Product Section'}
          </DialogTitle>
        </DialogHeader>

        {isLoadingSection ? (
          <div className="flex items-center justify-center py-16 flex-1 overflow-y-auto">
            <div className="text-muted-foreground">Loading product section data...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="flex flex-col h-full min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-muted/30 min-h-0">
                {/* Section Name Field */}
                <FormField
                  control={form.control}
                  name="sectionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Section Name<span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter section name"
                          className="h-11 bg-background"
                        />
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

                {/* Show Hide Field */}
                <FormField
                  control={form.control}
                  name="showHide"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Show Hide<span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex gap-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="0" id="show-false" />
                            <Label htmlFor="show-false" className="cursor-pointer">False</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="1" id="show-true" />
                            <Label htmlFor="show-true" className="cursor-pointer">True</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                              <TableHead>Categories</TableHead>
                              <TableHead>Brand</TableHead>
                              <TableHead className="text-right">Available Qty</TableHead>
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
                                <TableCell className="text-sm text-muted-foreground">
                                  {product.categories || '—'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {product.brandName || '—'}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {product.productQtyLeft}
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
                  {isLoading ? 'Saving...' : sectionId ? 'Update Section' : 'Create Section'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

