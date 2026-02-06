'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { useToast } from '@/hooks/use-toast'

// Table mapping based on old backend (table_id values)
const TABLE_OPTIONS = [
  { id: 136, label: 'Brand', table: 'brand', field: 'brand_name' },
  { id: 137, label: 'Category', table: 'category', field: 'category_name' },
  { id: 154, label: 'Products', table: 'product', field: 'product_name' },
  { id: 155, label: 'Product Sections', table: 'product_sections', field: 'section_name' },
  { id: 159, label: 'Flash Sales', table: 'flash_sales', field: 'title' },
]

// Form validation schema
const notificationFormSchema = z.object({
  rUserId: z.string().optional().nullable(),
  tableId: z.string().optional().nullable(),
  rowId: z.string().optional().nullable(),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
})

type NotificationFormValues = z.infer<typeof notificationFormSchema>

interface NotificationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notificationId?: number | null
  onSuccess?: () => void
}

interface ListItem {
  id: number
  label: string
  value: number
}

export function NotificationForm({ open, onOpenChange, notificationId, onSuccess }: NotificationFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingNotification, setIsLoadingNotification] = useState(false)
  
  // Lists for comboboxes
  const [users, setUsers] = useState<ListItem[]>([])
  const [targetItems, setTargetItems] = useState<ListItem[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isLoadingTargetItems, setIsLoadingTargetItems] = useState(false)
  
  // Track selected table
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      rUserId: null,
      tableId: null,
      rowId: null,
      subject: '',
      body: '',
    },
  })

  // Watch tableId to load target items
  const watchedTableId = form.watch('tableId')

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true)
      const response = await fetch('/api/users/list?limit=1000')
      const result = await response.json()
      
      if (result.success && result.users) {
        setUsers(result.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  // Create fetch function for paginated combobox
  const createFetchTargetItems = React.useCallback((tableId: string) => {
    return async (search: string, page: number, limit: number) => {
      const tableOption = TABLE_OPTIONS.find(t => t.id.toString() === tableId)
      if (!tableOption) {
        return { options: [], pagination: { page: 1, limit, total: 0, hasMore: false } }
      }

      let endpoint = ''
      switch (tableOption.id) {
        case 136: // Brand
          endpoint = `/api/brands/list?limit=${limit}&page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`
          break
        case 137: // Category
          endpoint = `/api/categories/list?limit=${limit}&page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`
          break
        case 154: // Product
          endpoint = `/api/products/list?limit=${limit}&page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`
          break
        case 155: // Product Sections
          endpoint = `/api/product-sections/list?limit=${limit}&page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`
          break
        case 159: // Flash Sales
          endpoint = `/api/flash-sales/list?limit=${limit}&page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`
          break
      }

      try {
        const response = await fetch(endpoint)
        const result = await response.json()
        
        if (result.success) {
          // Map the result based on endpoint
          let items: ComboboxOption[] = []
          if (result.brands) {
            items = result.brands.map((item: ListItem) => ({
              value: item.id.toString(),
              label: item.label,
            }))
          } else if (result.categories) {
            items = result.categories.map((item: ListItem) => ({
              value: item.id.toString(),
              label: item.label,
            }))
          } else if (result.products) {
            items = result.products.map((item: ListItem) => ({
              value: item.id.toString(),
              label: item.label,
            }))
          } else if (result.sections) {
            items = result.sections.map((item: ListItem) => ({
              value: item.id.toString(),
              label: item.label,
            }))
          } else if (result.flashSales) {
            items = result.flashSales.map((item: ListItem) => ({
              value: item.id.toString(),
              label: item.label,
            }))
          }
          
          return {
            options: items,
            pagination: result.pagination || { page, limit, total: 0, hasMore: false },
          }
        }
        
        return { options: [], pagination: { page, limit, total: 0, hasMore: false } }
      } catch (error) {
        console.error('Error fetching target items:', error)
        toast({
          title: "Error",
          description: 'Failed to fetch target items',
          variant: "destructive",
        })
        return { options: [], pagination: { page, limit, total: 0, hasMore: false } }
      }
    }
  }, [toast])

  // Legacy fetch for initial load (for edit mode)
  const fetchTargetItems = React.useCallback(async (tableId: string) => {
    try {
      setIsLoadingTargetItems(true)
      const fetchFn = createFetchTargetItems(tableId)
      const result = await fetchFn('', 1, 50)
      
      // Convert to ListItem format for compatibility
      const items: ListItem[] = result.options.map(opt => ({
        id: parseInt(opt.value),
        label: opt.label,
        value: parseInt(opt.value),
      }))
      
      setTargetItems(items)
    } catch (error) {
      console.error('Error fetching target items:', error)
      toast({
        title: "Error",
        description: 'Failed to fetch target items',
        variant: "destructive",
      })
    } finally {
      setIsLoadingTargetItems(false)
    }
  }, [createFetchTargetItems, toast])

  // Fetch users list
  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  // Fetch target items when table is selected
  useEffect(() => {
    if (watchedTableId && watchedTableId !== 'null') {
      setSelectedTableId(watchedTableId)
      fetchTargetItems(watchedTableId)
    } else {
      setSelectedTableId(null)
      setTargetItems([])
      form.setValue('rowId', null)
    }
  }, [watchedTableId, fetchTargetItems, form])

  // Store notification rowId and targetFieldName to set after target items load
  const [pendingRowId, setPendingRowId] = useState<string | null>(null)
  const [pendingTargetFieldName, setPendingTargetFieldName] = useState<string | null>(null)

  // Handle pending rowId: add item to list if missing, then set form value
  useEffect(() => {
    if (!pendingRowId || !form.getValues('tableId')) return

    const rowIdNum = parseInt(pendingRowId)
    if (isNaN(rowIdNum)) return

    // Check if item exists in targetItems
    const itemExists = targetItems.some(item => item.id === rowIdNum)

    if (!itemExists && pendingTargetFieldName) {
      // Item doesn't exist in list, add it first
      setTargetItems(prev => [
        {
          id: rowIdNum,
          label: pendingTargetFieldName,
          value: rowIdNum,
        },
        ...prev.filter(item => item.id !== rowIdNum) // Remove duplicate if exists
      ])
      // Will retry setting form value after state updates
      return
    }

    if (itemExists) {
      // Item exists in list, set the form value
      form.setValue('rowId', pendingRowId, { shouldValidate: false })
      setPendingRowId(null)
      setPendingTargetFieldName(null)
    }
  }, [targetItems, pendingRowId, pendingTargetFieldName, form])

  // Fetch notification data when editing
  useEffect(() => {
    const fetchNotificationData = async () => {
      if (!notificationId) return
      
      try {
        setIsLoadingNotification(true)
        const response = await fetch(`/api/notifications/${notificationId}`)
        const result = await response.json()

        if (result.success && result.notification) {
          const notification = result.notification
          
          // Reset form with fetched data
          form.reset({
            rUserId: notification.rUserId?.toString() || null,
            tableId: notification.tableId?.toString() || null,
            rowId: null, // Will be set after target items are loaded
            subject: notification.subject || '',
            body: notification.body || '',
          })

          // If tableId exists, fetch target items first
          if (notification.tableId) {
            setSelectedTableId(notification.tableId.toString())
            // Store rowId and targetFieldName to set after items load
            if (notification.rowId) {
              setPendingRowId(notification.rowId.toString())
              if (notification.targetFieldName) {
                setPendingTargetFieldName(notification.targetFieldName)
              }
            }
            await fetchTargetItems(notification.tableId.toString())
          } else {
            // No tableId, so rowId should also be null
            setPendingRowId(null)
            setPendingTargetFieldName(null)
            form.setValue('rowId', null)
          }
        } else {
          toast({
            title: "Error",
            description: result.error || 'Failed to fetch notification data',
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error fetching notification:', error)
        toast({
          title: "Error",
          description: 'Failed to fetch notification data',
          variant: "destructive",
        })
      } finally {
        setIsLoadingNotification(false)
      }
    }

    if (open && notificationId) {
      fetchNotificationData()
    } else if (!open) {
      // Reset when dialog closes
      setTargetItems([])
      setSelectedTableId(null)
      setPendingRowId(null)
      setPendingTargetFieldName(null)
      form.reset({
        rUserId: null,
        tableId: null,
        rowId: null,
        subject: '',
        body: '',
      })
    }
  }, [open, notificationId, fetchTargetItems, form, toast])

  const onFormSubmit = async (data: NotificationFormValues) => {
    try {
      setIsLoading(true)
      
      const isEditMode = notificationId !== undefined && notificationId !== null
      
      const url = isEditMode
        ? `/api/notifications/${notificationId}`
        : '/api/notifications'
      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          r_user_id: data.rUserId && data.rUserId !== 'null' ? parseInt(data.rUserId) : null,
          table_id: data.tableId && data.tableId !== 'null' ? parseInt(data.tableId) : null,
          row_id: data.rowId && data.rowId !== 'null' ? parseInt(data.rowId) : null,
          subject: data.subject,
          body: data.body,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: isEditMode ? 'Notification updated successfully' : 'Notification created successfully',
        })
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: result.error || (isEditMode ? 'Failed to update notification' : 'Failed to create notification'),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving notification:', error)
      toast({
        title: "Error",
        description: 'Failed to save notification',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[70vw] w-[70vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0"
        showMaximizeButton={false}
      >
        <DialogHeader className="px-8 pt-8 pb-6 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-2xl font-semibold">
            {notificationId ? 'Edit Notification' : 'Add Notification'}
          </DialogTitle>
        </DialogHeader>

        {isLoadingNotification ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">Loading notification data...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-muted/30">
                {/* Notification Settings Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground border-b pb-2">Notification Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Target User */}
                    <FormField
                      control={form.control}
                      name="rUserId"
                      render={({ field }) => {
                        const userOptions: ComboboxOption[] = [
                          { value: 'all', label: 'All Clients' },
                          ...users.map((user) => ({
                            value: user.id.toString(),
                            label: user.label,
                          })),
                        ]
                        
                        return (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Target Client</FormLabel>
                            <FormControl>
                              <Combobox
                                options={userOptions}
                                value={field.value === null ? 'all' : field.value || undefined}
                                onValueChange={(value) => {
                                  field.onChange(value === 'all' || value === undefined ? null : value)
                                }}
                                placeholder={isLoadingUsers ? "Loading..." : "Select Client (optional)"}
                                searchPlaceholder="Search clients..."
                                emptyText="No client found."
                                disabled={isLoadingUsers}
                                className="h-11 bg-background"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    {/* Target Table */}
                    <FormField
                      control={form.control}
                      name="tableId"
                      render={({ field }) => {
                        const tableOptions: ComboboxOption[] = [
                          { value: 'none', label: 'None' },
                          ...TABLE_OPTIONS.map((table) => ({
                            value: table.id.toString(),
                            label: table.label,
                          })),
                        ]
                        
                        return (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Target Table</FormLabel>
                            <FormControl>
                              <Combobox
                                options={tableOptions}
                                value={field.value === null ? 'none' : field.value || undefined}
                                onValueChange={(value) => {
                                  const newValue = value === 'none' || value === undefined ? null : value
                                  field.onChange(newValue)
                                  form.setValue('rowId', null) // Reset row_id when table changes
                                }}
                                placeholder="Select Target Table (optional)"
                                searchPlaceholder="Search tables..."
                                emptyText="No table found."
                                className="h-11 bg-background"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />
                  </div>

                  {/* Target Field */}
                  {selectedTableId && (
                    <FormField
                      control={form.control}
                      name="rowId"
                      render={({ field }) => {
                        const fetchFn = createFetchTargetItems(selectedTableId)
                        
                        return (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Target Field</FormLabel>
                            <FormControl>
                              <PaginatedCombobox
                                fetchOptions={fetchFn}
                                value={field.value === null ? undefined : field.value || undefined}
                                onValueChange={(value) => {
                                  field.onChange(value === undefined ? null : value)
                                }}
                                placeholder="Select Target Field (optional)"
                                searchPlaceholder="Search items..."
                                emptyText="No item found."
                                disabled={isLoadingTargetItems}
                                className="h-11 bg-background"
                                limit={50}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />
                  )}
                </div>

                {/* Notification Content Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground border-b pb-2">Notification Content</h3>
                  
                  {/* Subject */}
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Subject</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter notification subject" 
                            className="h-11 text-base bg-background"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Body */}
                  <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Body</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter notification body"
                            className="min-h-[200px] text-base resize-y bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 px-8 py-6 border-t bg-muted/30 shrink-0">
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
                  {isLoading ? 'Saving...' : notificationId ? 'Update Notification' : 'Create Notification'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

