'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CloudUpload, X, ImageIcon, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'

// Form validation schema
const gridElementFormSchema = z.object({
  positionX: z.string().min(1, 'Position X is required'),
  positionY: z.string().min(1, 'Position Y is required'),
  width: z.string().optional(),
  height: z.string().optional(),
  actionType: z.string().optional(),
  actionValue: z.string().optional(),
})

type GridElementFormValues = z.infer<typeof gridElementFormSchema>

interface GridElementFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  elementId?: number | null
  gridId: number
  onSuccess?: () => void
}

// Action type options
const actionTypes = [
  { value: '', label: 'No Action' },
  { value: 'category', label: 'Go to Category' },
  { value: 'product', label: 'Go to Product' },
  { value: 'url', label: 'Open URL' },
  { value: 'flash_sale', label: 'Go to Flash Sale' },
  { value: 'search', label: 'Search Query' },
]

export function GridElementForm({ open, onOpenChange, elementId, gridId, onSuccess }: GridElementFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingElement, setIsLoadingElement] = useState(false)
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null)
  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<GridElementFormValues>({
    resolver: zodResolver(gridElementFormSchema),
    defaultValues: {
      positionX: '0',
      positionY: '0',
      width: '100',
      height: '100',
      actionType: '',
      actionValue: '',
    },
  })

  const watchActionType = form.watch('actionType')

  // Fetch element data when editing
  useEffect(() => {
    const fetchElementData = async () => {
      if (!elementId) return
      
      try {
        setIsLoadingElement(true)
        const response = await fetch(`/api/grid-elements/${elementId}`)
        const result = await response.json()

        if (result.success && result.element) {
          const element = result.element
          setMainImagePreview(element.mainImage || null)
          
          // Parse actions JSON
          let actionType = ''
          let actionValue = ''
          if (element.actions) {
            try {
              const actions = JSON.parse(element.actions)
              actionType = actions.type || ''
              actionValue = actions.value || ''
            } catch {
              console.error('Failed to parse actions JSON')
            }
          }
          
          form.reset({
            positionX: element.positionX || '0',
            positionY: element.positionY || '0',
            width: element.width || '100',
            height: element.height || '100',
            actionType,
            actionValue,
          })
        } else {
          toast({
            title: "Error",
            description: result.error || 'Failed to fetch element data',
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error fetching element:', error)
        toast({
          title: "Error",
          description: 'Failed to fetch element data',
          variant: "destructive",
        })
      } finally {
        setIsLoadingElement(false)
      }
    }

    if (open && elementId) {
      fetchElementData()
    } else if (!open) {
      // Reset when dialog closes
      setMainImagePreview(null)
      setMainImageFile(null)
      form.reset({
        positionX: '0',
        positionY: '0',
        width: '100',
        height: '100',
        actionType: '',
        actionValue: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, elementId])

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        })
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        })
        return
      }

      setMainImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setMainImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setMainImagePreview(null)
    setMainImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Upload image to server
  const uploadImage = async (file: File, elementId: number): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('id', elementId.toString())
      formData.append('table', 'grid_element')
      formData.append('type', '1') // Main image type
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      
      if (result.success) {
        return result.file_path
      } else {
        console.error('Upload failed:', result.error)
        return null
      }
    } catch (error) {
      console.error('Upload error:', error)
      return null
    }
  }

  const onSubmit = async (data: GridElementFormValues) => {
    setIsLoading(true)
    
    try {
      // Build actions JSON
      let actionsJson: string | null = null
      if (data.actionType && data.actionType !== '') {
        actionsJson = JSON.stringify({
          type: data.actionType,
          value: data.actionValue || '',
        })
      }

      const payload: Record<string, any> = {
        r_grid_id: gridId,
        position_x: data.positionX,
        position_y: data.positionY,
        width: data.width || '100',
        height: data.height || '100',
        actions: actionsJson,
      }

      let savedElementId = elementId

      if (elementId) {
        // Update existing element
        const response = await fetch(`/api/grid-elements/${elementId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update element')
        }
      } else {
        // Create new element
        const response = await fetch('/api/grid-elements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create element')
        }
        
        savedElementId = result.element.id
      }

      // Upload image if a new file was selected
      if (mainImageFile && savedElementId) {
        setIsUploading(true)
        const imagePath = await uploadImage(mainImageFile, savedElementId)
        
        if (imagePath) {
          // Update element with new image path
          await fetch(`/api/grid-elements/${savedElementId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ main_image: imagePath }),
          })
        }
        setIsUploading(false)
      }

      toast({
        title: "Success",
        description: elementId ? "Banner updated successfully" : "Banner created successfully",
      })
      
      onSuccess?.()
    } catch (error) {
      console.error('Submit error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save element',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsUploading(false)
    }
  }

  const getActionValueLabel = () => {
    switch (watchActionType) {
      case 'category':
        return 'Category ID'
      case 'product':
        return 'Product ID'
      case 'url':
        return 'URL'
      case 'flash_sale':
        return 'Flash Sale ID'
      case 'search':
        return 'Search Query'
      default:
        return 'Value'
    }
  }

  const getActionValuePlaceholder = () => {
    switch (watchActionType) {
      case 'category':
        return 'Enter category ID (e.g., 123)'
      case 'product':
        return 'Enter product ID (e.g., 456)'
      case 'url':
        return 'Enter full URL (e.g., https://example.com)'
      case 'flash_sale':
        return 'Enter flash sale ID (e.g., 789)'
      case 'search':
        return 'Enter search query (e.g., summer dresses)'
      default:
        return 'Enter value'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {elementId ? 'Edit Banner' : 'Add New Banner'}
          </DialogTitle>
          <DialogDescription>
            {elementId 
              ? 'Update the banner image and settings' 
              : 'Upload a banner image and configure its behavior'}
          </DialogDescription>
        </DialogHeader>

        {isLoadingElement ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Banner Image Upload */}
              <div className="space-y-2">
                <Label>Banner Image</Label>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                    "hover:border-primary hover:bg-muted/50",
                    mainImagePreview ? "border-primary" : "border-muted-foreground/25"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  
                  {mainImagePreview ? (
                    <div className="relative">
                      <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={mainImagePreview}
                          alt="Banner Preview"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <div className="absolute top-2 right-2 flex gap-2">
                        {mainImagePreview.startsWith('http') && (
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(mainImagePreview, '_blank')
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveImage()
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8">
                      <CloudUpload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload banner image
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: 1080 x 320 pixels (PNG, JPG, WebP)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Position Fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="positionY"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position Y (Row)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Order in the carousel (0 = first)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="positionX"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position X (Column)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Column position (usually 0)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dimension Fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Width</FormLabel>
                      <FormControl>
                        <Input placeholder="100" {...field} />
                      </FormControl>
                      <FormDescription>
                        Width in pixels or percentage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height</FormLabel>
                      <FormControl>
                        <Input placeholder="100" {...field} />
                      </FormControl>
                      <FormDescription>
                        Height in pixels or percentage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Action Configuration */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium">Tap Action (Optional)</h4>
                <p className="text-sm text-muted-foreground">
                  Configure what happens when users tap this banner
                </p>
                
                <FormField
                  control={form.control}
                  name="actionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {actionTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {watchActionType && watchActionType !== '' && (
                  <FormField
                    control={form.control}
                    name="actionValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{getActionValueLabel()}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={getActionValuePlaceholder()} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading || isUploading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || isUploading}>
                  {(isLoading || isUploading) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isUploading 
                    ? 'Uploading...' 
                    : isLoading 
                      ? 'Saving...' 
                      : elementId 
                        ? 'Update Banner' 
                        : 'Create Banner'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
