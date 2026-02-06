'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { PaginatedCombobox } from '@/components/ui/paginated-combobox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

// Form validation schema
const gridFormSchema = z.object({
  isMain: z.enum(['0', '1']),
  type: z.string().min(1, 'Type is required').max(255, 'Type must be 255 characters or less').trim(),
  rSectionId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
})

type GridFormValues = z.infer<typeof gridFormSchema>

interface GridFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gridId?: number | null
  onSuccess?: () => void
}

interface ListItem {
  id: number
  label: string
  value: number
}

export function GridForm({ open, onOpenChange, gridId, onSuccess }: GridFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGrid, setIsLoadingGrid] = useState(false)
  const [typeOptions, setTypeOptions] = useState<ComboboxOption[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = useState(false)
  
  // Store pre-fetched selected items for display
  const [prefetchedSection, setPrefetchedSection] = useState<ComboboxOption | null>(null)
  const [prefetchedCategory, setPrefetchedCategory] = useState<ComboboxOption | null>(null)
  const [prefetchedBrand, setPrefetchedBrand] = useState<ComboboxOption | null>(null)

  const form = useForm<GridFormValues>({
    resolver: zodResolver(gridFormSchema),
    defaultValues: {
      isMain: '0',
      type: '',
      rSectionId: null,
      categoryId: null,
      brandId: null,
    },
  })


  // Fetch specific item by ID
  const fetchItemById = useCallback(async (type: 'section' | 'category' | 'brand', id: number) => {
    try {
      let endpoint = ''
      switch (type) {
        case 'section':
          endpoint = `/api/product-sections/${id}`
          break
        case 'category':
          // Categories don't have a show endpoint, so we'll search by ID
          endpoint = `/api/categories/list?limit=1&page=1&search=${id}`
          break
        case 'brand':
          endpoint = `/api/brands/${id}`
          break
      }

      console.log(`Fetching ${type} by ID ${id} from ${endpoint}`)
      const response = await fetch(endpoint)
      const result = await response.json()
      console.log(`Fetch ${type} result:`, result)

      if (result.success) {
        if (type === 'section' && result.section) {
          const item = {
            value: result.section.id.toString(),
            label: result.section.sectionName || `Section ${result.section.id}`,
          }
          console.log(`Product section item:`, item)
          return item
        } else if (type === 'category' && result.categories && result.categories.length > 0) {
          const cat = result.categories[0]
          return {
            value: cat.id.toString(),
            label: cat.label || `Category ${cat.id}`,
          }
        } else if (type === 'brand' && result.brand) {
          return {
            value: result.brand.id.toString(),
            label: result.brand.brandName || `Brand ${result.brand.id}`,
          }
        }
      }
      console.log(`No ${type} found for ID ${id}`)
      return null
    } catch (error) {
      console.error(`Error fetching ${type} by ID:`, error)
      return null
    }
  }, [])

  // Create fetch functions for paginated comboboxes
  const fetchProductSections = useCallback(async (search: string, page: number, limit: number) => {
    try {
      // If search is a number, try to find by ID first
      const items: ComboboxOption[] = []
      if (search && !isNaN(Number(search)) && page === 1) {
        const itemById = await fetchItemById('section', Number(search))
        if (itemById) {
          items.push(itemById)
        }
      }

      const endpoint = `/api/product-sections/list?limit=${limit}&page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`
      const response = await fetch(endpoint)
      const result = await response.json()
      
      if (result.success && result.sections) {
        const fetchedItems: ComboboxOption[] = result.sections.map((item: ListItem) => ({
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
      console.error('Error fetching product sections:', error)
      return { options: [], pagination: { page, limit, total: 0, hasMore: false } }
    }
  }, [fetchItemById])

  const fetchCategories = useCallback(async (search: string, page: number, limit: number) => {
    try {
      // If search is a number, try to find by ID first
      const items: ComboboxOption[] = []
      if (search && !isNaN(Number(search)) && page === 1) {
        const itemById = await fetchItemById('category', Number(search))
        if (itemById) {
          items.push(itemById)
        }
      }

      const endpoint = `/api/categories/list?limit=${limit}&page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`
      const response = await fetch(endpoint)
      const result = await response.json()
      
      if (result.success && result.categories) {
        const fetchedItems: ComboboxOption[] = result.categories.map((item: ListItem) => ({
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
      console.error('Error fetching categories:', error)
      return { options: [], pagination: { page, limit, total: 0, hasMore: false } }
    }
  }, [fetchItemById])

  const fetchBrands = useCallback(async (search: string, page: number, limit: number) => {
    try {
      // If search is a number, try to find by ID first
      const items: ComboboxOption[] = []
      if (search && !isNaN(Number(search)) && page === 1) {
        const itemById = await fetchItemById('brand', Number(search))
        if (itemById) {
          items.push(itemById)
        }
      }

      const endpoint = `/api/brands/list?limit=${limit}&page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`
      const response = await fetch(endpoint)
      const result = await response.json()
      
      if (result.success && result.brands) {
        const fetchedItems: ComboboxOption[] = result.brands.map((item: ListItem) => ({
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
      console.error('Error fetching brands:', error)
      return { options: [], pagination: { page, limit, total: 0, hasMore: false } }
    }
  }, [fetchItemById])

  // Fetch distinct type values
  const fetchTypes = useCallback(async () => {
    try {
      setIsLoadingTypes(true)
      const response = await fetch('/api/grids/types')
      const result = await response.json()
      
      if (result.success && result.types) {
        const options: ComboboxOption[] = result.types.map((type: string) => ({
          value: type,
          label: type,
        }))
        setTypeOptions(options)
      }
    } catch (error) {
      console.error('Error fetching types:', error)
      toast({
        title: "Error",
        description: 'Failed to fetch grid types',
        variant: "destructive",
      })
    } finally {
      setIsLoadingTypes(false)
    }
  }, [toast])


  // Fetch types when dialog opens
  useEffect(() => {
    if (open) {
      fetchTypes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Fetch grid data when editing
  useEffect(() => {
    const fetchGridData = async () => {
      if (!gridId) return
      
      try {
        setIsLoadingGrid(true)
        console.log('Fetching grid data for ID:', gridId)
        const response = await fetch(`/api/grids/${gridId}`)
        console.log('Grid fetch response status:', response.status)
        const result = await response.json()
        console.log('Grid fetch result:', result)

        if (result.success && result.grid) {
          const grid = result.grid
          
          // Pre-fetch selected items by ID so they display immediately
          const fetchPromises: Promise<void>[] = []
          
          if (grid.rSectionId) {
            fetchPromises.push(
              fetchItemById('section', grid.rSectionId).then(item => {
                console.log('Prefetched section item:', item)
                if (item) {
                  setPrefetchedSection(item)
                } else {
                  console.warn('Failed to prefetch section with ID:', grid.rSectionId)
                }
              })
            )
          } else {
            setPrefetchedSection(null)
          }
          
          if (grid.categoryId) {
            fetchPromises.push(
              fetchItemById('category', grid.categoryId).then(item => {
                if (item) setPrefetchedCategory(item)
              })
            )
          } else {
            setPrefetchedCategory(null)
          }
          
          if (grid.brandId) {
            fetchPromises.push(
              fetchItemById('brand', grid.brandId).then(item => {
                if (item) setPrefetchedBrand(item)
              })
            )
          } else {
            setPrefetchedBrand(null)
          }
          
          // Wait for all items to be fetched
          await Promise.all(fetchPromises)
          
          // Reset form with fetched data
          form.reset({
            isMain: grid.isMain?.toString() || '0',
            type: grid.type || '',
            rSectionId: grid.rSectionId?.toString() || null,
            categoryId: grid.categoryId?.toString() || null,
            brandId: grid.brandId?.toString() || null,
          })
        } else {
          toast({
            title: "Error",
            description: result.error || 'Failed to fetch grid data',
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error fetching grid:', error)
        toast({
          title: "Error",
          description: 'Failed to fetch grid data',
          variant: "destructive",
        })
      } finally {
        setIsLoadingGrid(false)
      }
    }

    if (open && gridId) {
      fetchGridData()
    } else if (!open) {
      // Reset when dialog closes
      form.reset({
        isMain: '0',
        type: '',
        rSectionId: null,
        categoryId: null,
        brandId: null,
      })
      setPrefetchedSection(null)
      setPrefetchedCategory(null)
      setPrefetchedBrand(null)
    }
  }, [open, gridId, form, toast, fetchItemById])

  const onFormSubmit = async (data: GridFormValues) => {
    try {
      setIsLoading(true)
      
      const isEditMode = gridId !== undefined && gridId !== null
      
      const url = isEditMode
        ? `/api/grids/${gridId}`
        : '/api/grids'
      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_main: parseInt(data.isMain),
          type: data.type.trim().substring(0, 255), // Ensure type is trimmed and max 255 chars
          r_section_id: data.rSectionId && data.rSectionId !== 'null' ? parseInt(data.rSectionId) : null,
          category_id: data.categoryId && data.categoryId !== 'null' ? parseInt(data.categoryId) : null,
          brand_id: data.brandId && data.brandId !== 'null' ? parseInt(data.brandId) : null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: isEditMode ? 'Grid updated successfully' : 'Grid created successfully',
        })
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: result.error || (isEditMode ? 'Failed to update grid' : 'Failed to create grid'),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving grid:', error)
      toast({
        title: "Error",
        description: 'Failed to save grid',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[600px] w-[90vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0"
        showMaximizeButton={false}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-2xl font-semibold">
            {gridId ? 'Edit Grid' : 'Create Grid'}
          </DialogTitle>
        </DialogHeader>

        {isLoadingGrid ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">Loading grid data...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-muted/30">
                {/* Main Field */}
                <FormField
                  control={form.control}
                  name="isMain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Main</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex gap-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="0" id="main-false" />
                            <Label htmlFor="main-false" className="cursor-pointer">false</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="1" id="main-true" />
                            <Label htmlFor="main-true" className="cursor-pointer">true</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Type Field */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        type<span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Combobox
                          options={typeOptions}
                          value={field.value || undefined}
                          onValueChange={(value) => {
                            field.onChange(value || '')
                          }}
                          placeholder={isLoadingTypes ? "Loading types..." : "Select type"}
                          searchPlaceholder="Search types..."
                          emptyText="No type found."
                          disabled={isLoadingTypes}
                          className="h-11 bg-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Product Sections Field */}
                <FormField
                  control={form.control}
                  name="rSectionId"
                  render={({ field }) => {
                    // Ensure value is string for comparison
                    const fieldValue = field.value === null ? undefined : field.value?.toString()
                    
                    return (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Product Sections</FormLabel>
                        <FormControl>
                          <PaginatedCombobox
                            key={`section-${prefetchedSection?.value || 'none'}-${fieldValue || 'none'}`}
                            fetchOptions={fetchProductSections}
                            value={fieldValue}
                            onValueChange={(value) => {
                              field.onChange(value === undefined ? null : value)
                            }}
                            placeholder="Select Section Name..."
                            searchPlaceholder="Search sections..."
                            emptyText="No section found."
                            className="h-11 bg-background"
                            limit={50}
                            initialSelectedOption={prefetchedSection}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                {/* Category Field */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Category</FormLabel>
                      <FormControl>
                        <PaginatedCombobox
                          fetchOptions={fetchCategories}
                          value={field.value === null ? undefined : field.value || undefined}
                          onValueChange={(value) => {
                            field.onChange(value === undefined ? null : value)
                          }}
                          placeholder="Select category_name..."
                          searchPlaceholder="Search categories..."
                          emptyText="No category found."
                          className="h-11 bg-background"
                          limit={50}
                          initialSelectedOption={prefetchedCategory}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Brand Field */}
                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Brand</FormLabel>
                      <FormControl>
                        <PaginatedCombobox
                          fetchOptions={fetchBrands}
                          value={field.value === null ? undefined : field.value || undefined}
                          onValueChange={(value) => {
                            field.onChange(value === undefined ? null : value)
                          }}
                          placeholder="Select brand_name..."
                          searchPlaceholder="Search brands..."
                          emptyText="No brand found."
                          className="h-11 bg-background"
                          limit={50}
                          initialSelectedOption={prefetchedBrand}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  {isLoading ? 'Saving...' : gridId ? 'Update Grid' : 'Create Grid'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

