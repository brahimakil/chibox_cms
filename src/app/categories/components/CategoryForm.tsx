'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CloudUpload, X, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

// Form validation schema
const categoryFormSchema = z.object({
  categoryName: z.string().min(1, 'Category Name cannot be blank'),
  slug: z.string().min(1, 'Slug cannot be blank'),
  showInNavbar: z.enum(['0', '1']),
  display: z.enum(['0', '1']),
  type: z.string().min(1, 'Type is required'),
  cartBtn: z.enum(['0', '1']),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

interface CategoryData {
  id?: number
  categoryName: string
  slug: string
  parent: number | null
  type: number
  showInNavbar: number
  display: number
  cartBtn?: number
  mainImage?: string | null
  [key: string]: unknown
}

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryId?: number | null
  onSuccess?: () => void
}

export function CategoryForm({ open, onOpenChange, categoryId, onSuccess }: CategoryFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [category, setCategory] = useState<CategoryData | null>(null)
  const [isLoadingCategory, setIsLoadingCategory] = useState(false)
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null)
  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
  const [additionalImagesPreview, setAdditionalImagesPreview] = useState<string[]>([])
  const [additionalImagesFiles, setAdditionalImagesFiles] = useState<File[]>([])
  // Track original images to detect removals
  const [originalMainImage, setOriginalMainImage] = useState<string | null>(null)
  const [originalAdditionalImages, setOriginalAdditionalImages] = useState<string[]>([])

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      categoryName: '',
      slug: '',
      showInNavbar: '0',
      display: '1',
      type: '',
      cartBtn: '1',
    },
  })

  // Fetch category data when editing
  useEffect(() => {
    const fetchCategoryData = async () => {
      if (!categoryId) return
      
      try {
        setIsLoadingCategory(true)
        const response = await fetch(`/api/categories/${categoryId}`)
        const result = await response.json()

        if (result.success && result.category) {
          setCategory(result.category)
          const mainImg = result.category.mainImage || null
          setMainImagePreview(mainImg)
          setOriginalMainImage(mainImg) // Track original main image
          // Load additional images if they exist
          const additionalImgs = result.category.additionalImages && result.category.additionalImages.length > 0 
            ? result.category.additionalImages 
            : []
          setAdditionalImagesPreview(additionalImgs)
          setOriginalAdditionalImages(additionalImgs) // Track original additional images
          // Reset form with fetched data
          form.reset({
            categoryName: result.category.categoryName || '',
            slug: result.category.slug || '',
            showInNavbar: (result.category.showInNavbar?.toString() as '0' | '1') || '0',
            display: (result.category.display?.toString() as '0' | '1') || '1',
            type: result.category.type?.toString() || '',
            cartBtn: (result.category.cartBtn?.toString() as '0' | '1') || '1',
          })
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
        setIsLoadingCategory(false)
      }
    }

    if (open && categoryId) {
      fetchCategoryData()
    } else if (!open) {
      // Reset when dialog closes
      setCategory(null)
      setMainImagePreview(null)
      setMainImageFile(null)
      setAdditionalImagesPreview([])
      setAdditionalImagesFiles([])
      setOriginalMainImage(null)
      setOriginalAdditionalImages([])
      form.reset({
        categoryName: '',
        slug: '',
        showInNavbar: '0',
        display: '1',
        type: '',
        cartBtn: '1',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryId])

  // Handle main image upload
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMainImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setMainImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveMainImage = () => {
    setMainImagePreview(null)
    setMainImageFile(null)
  }

  // Handle additional images upload
  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAdditionalImagesFiles((prev) => [...prev, ...files])
    
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAdditionalImagesPreview((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveAdditionalImage = (index: number) => {
    // Remove from preview array
    setAdditionalImagesPreview((prev) => prev.filter((_, i) => i !== index))
    
    // Only remove from files array if there's a file at that index
    // When editing, files array might be shorter than preview array (which contains URLs)
    if (index < additionalImagesFiles.length) {
      setAdditionalImagesFiles((prev) => prev.filter((_, i) => i !== index))
    }
    // Note: If the removed image was an existing image (URL from database), 
    // we should ideally delete it from the database, but for now we'll leave it
    // The image will remain in the database but won't be displayed
  }

  // Delete attachment from database and disk
  const deleteAttachment = async (filePath: string, categoryId: number, type: number): Promise<boolean> => {
    try {
      const response = await fetch('/api/attachments/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          table: 'category',
          id: categoryId,
          type: type,
        }),
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Error deleting attachment:', error)
      return false
    }
  }

  // Upload image file and return the URL
  const uploadImage = async (file: File, categoryId: number, type: number): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('id', categoryId.toString())
      formData.append('table', 'category')
      formData.append('type', type.toString())

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        return result.file_path
      } else {
        console.error('Image upload error:', result.error)
        return null
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      return null
    }
  }

  const onFormSubmit = async (data: CategoryFormValues) => {
    try {
      setIsLoading(true)
      
      const isEditMode = categoryId !== undefined && categoryId !== null
      
      // Prepare image URL - check if it's a base64 (new upload) or existing URL
      let imageUrl: string | null = null
      if (mainImagePreview) {
        if (mainImagePreview.startsWith('data:image')) {
          // It's a base64 image - we'll upload it after saving the category
          imageUrl = null
        } else {
          // It's already a URL, use it
          imageUrl = mainImagePreview
        }
      } else if (category?.mainImage) {
        // Use existing category image URL
        imageUrl = category.mainImage
      }
      
      const url = isEditMode
        ? `/api/categories/${categoryId}`
        : '/api/categories'
      const method = isEditMode ? 'PUT' : 'POST'

      // First, save the category
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_name: data.categoryName,
          slug: data.slug,
          type: parseInt(data.type),
          show_in_navbar: parseInt(data.showInNavbar),
          display: parseInt(data.display),
          cart_btn: parseInt(data.cartBtn),
          r_store_id: 1,
          main_image: imageUrl,
          // Skip additional_images for now - will upload separately
          additional_images: [],
        }),
      })

      const result = await response.json()

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || 'Failed to save category',
          variant: "destructive",
        })
        return
      }

      // Get the category ID (from create or edit)
      const savedCategoryId = result.category?.id || categoryId
      if (!savedCategoryId) {
        toast({
          title: "Error",
          description: 'Failed to get category ID',
          variant: "destructive",
        })
        return
      }

      // Handle main image deletion/upload
      if (isEditMode && originalMainImage) {
        // Check if main image was removed or changed
        const isRemoved = !mainImagePreview
        const isChanged = mainImagePreview && mainImagePreview !== originalMainImage && !mainImagePreview.startsWith('data:image')
        
        if (isRemoved || isChanged) {
          // Main image was removed or replaced with a different existing image - delete the original
          await deleteAttachment(originalMainImage, savedCategoryId, 1)
        }
        // If replaced with a new upload (base64), we'll upload it below and the upload endpoint will update main_image
      }

      // Upload main image if it's a new file (base64)
      if (mainImagePreview?.startsWith('data:image') && mainImageFile) {
        const uploadedImageUrl = await uploadImage(mainImageFile, savedCategoryId, 1) // type 1 = main image
        if (!uploadedImageUrl) {
          toast({
            title: "Warning",
            description: 'Category saved but main image upload failed',
            variant: "default",
          })
        }
        // Note: The upload endpoint already updates main_image when type=1, so no need for separate update
      }

      // Handle additional images deletion/upload
      if (isEditMode && originalAdditionalImages.length > 0) {
        // Find which additional images were removed
        const removedImages = originalAdditionalImages.filter(
          originalUrl => !additionalImagesPreview.includes(originalUrl)
        )
        
        // Delete removed images
        if (removedImages.length > 0) {
          const deletePromises = removedImages.map(url =>
            deleteAttachment(url, savedCategoryId, 2) // type 2 = additional images
          )
          await Promise.all(deletePromises)
        }
      }

      // Upload new additional images (only files, not URLs)
      if (additionalImagesFiles.length > 0) {
        const uploadPromises = additionalImagesFiles.map((file) =>
          uploadImage(file, savedCategoryId, 2) // type 2 = additional images
        )
        const uploadedUrls = await Promise.all(uploadPromises)
        const successfulUploads = uploadedUrls.filter(url => url !== null)
        
        if (successfulUploads.length < additionalImagesFiles.length) {
          toast({
            title: "Warning",
            description: `Category saved but ${additionalImagesFiles.length - successfulUploads.length} additional image(s) failed to upload`,
            variant: "default",
          })
        }
      }

      toast({
        title: "Success",
        description: isEditMode
          ? 'Category updated successfully'
          : 'Category created successfully',
      })
      onOpenChange(false)
      onSuccess?.() // Refresh the list
    } catch (error) {
      console.error('Error saving category:', error)
      toast({
        title: "Error",
        description: 'Failed to save category',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[65vw] w-[65vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0"
        showMaximizeButton={false}
      >
        <DialogHeader className="px-8 pt-8 pb-6 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-2xl font-semibold">
            {categoryId ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-8 py-8">
          {isLoadingCategory ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading category data...</p>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-8" id="category-form">
        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Category Name */}
                <FormField
                  control={form.control}
                  name="categoryName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Category Name <span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter category name"
                          className="h-11 text-base"
                          {...field}
                          aria-invalid={!!form.formState.errors.categoryName}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Show in Navbar */}
                <FormField
                  control={form.control}
                  name="showInNavbar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Show in Navbar</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-6 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="0" id="navbar-false" className="h-5 w-5" />
                            <Label htmlFor="navbar-false" className="text-base font-normal cursor-pointer">
                              false
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="1" id="navbar-true" className="h-5 w-5" />
                            <Label htmlFor="navbar-true" className="text-base font-normal cursor-pointer">
                              true
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Display */}
                <FormField
                  control={form.control}
                  name="display"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Display</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-6 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="0" id="display-false" className="h-5 w-5" />
                            <Label htmlFor="display-false" className="text-base font-normal cursor-pointer">
                              false
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="1" id="display-true" className="h-5 w-5" />
                            <Label htmlFor="display-true" className="text-base font-normal cursor-pointer">
                              true
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full h-11 text-base">
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Main</SelectItem>
                          <SelectItem value="1">Sub</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Slug */}
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Slug <span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter slug"
                          className="h-11 text-base"
                          {...field}
                          aria-invalid={!!form.formState.errors.slug}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cart Button */}
                <FormField
                  control={form.control}
                  name="cartBtn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Cart Button</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-6 mt-2"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="0" id="cart-false" className="h-5 w-5" />
                            <Label htmlFor="cart-false" className="text-base font-normal cursor-pointer">
                              false
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="1" id="cart-true" className="h-5 w-5" />
                            <Label htmlFor="cart-true" className="text-base font-normal cursor-pointer">
                              true
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Images Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Category Image */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Category Image</Label>
                <div
                  className={cn(
                    'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
                    'hover:border-primary/60 hover:bg-accent/50',
                    mainImagePreview ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  )}
                  onClick={() => document.getElementById('main-image-input')?.click()}
                >
                  <input
                    id="main-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMainImageChange}
                  />
                  {mainImagePreview ? (
                    <div className="relative group">
                      <img
                        src={mainImagePreview}
                        alt="Category"
                        className="max-h-64 w-full object-cover rounded-lg shadow-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity h-9 w-9"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveMainImage()
                        }}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="rounded-full bg-muted p-6">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-base font-medium mb-1">Click to upload category image</p>
                        <p className="text-sm text-muted-foreground">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Images */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Additional Images</Label>
                <div
                  className={cn(
                    'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all min-h-[300px]',
                    'hover:border-primary/60 hover:bg-accent/50',
                    additionalImagesPreview.length > 0
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25'
                  )}
                  onClick={() => document.getElementById('additional-images-input')?.click()}
                >
                  <input
                    id="additional-images-input"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleAdditionalImagesChange}
                  />
                  {additionalImagesPreview.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto">
                      {additionalImagesPreview.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Additional ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg shadow-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveAdditionalImage(index)
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div
                        className="flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed rounded-lg border-muted-foreground/25 hover:border-primary/60 hover:bg-accent/50 transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          document.getElementById('additional-images-input')?.click()
                        }}
                      >
                        <CloudUpload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Add more</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 h-full">
                      <div className="rounded-full bg-muted p-6">
                        <CloudUpload className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-base font-medium mb-1">Click to upload additional images</p>
                        <p className="text-sm text-muted-foreground">
                          You can select multiple images
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </form>
        </Form>
          )}
        </div>
        
        {/* Fixed Footer with Actions */}
        <div className="border-t bg-background px-8 py-4 shrink-0 flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading || isLoadingCategory}
            className="h-11 px-8 text-base"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="category-form"
            disabled={isLoading || isLoadingCategory} 
            className="h-11 px-8 text-base"
          >
            {isLoading ? 'Saving...' : 'Save Category'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
