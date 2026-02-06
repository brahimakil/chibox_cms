'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface NotificationData {
  id: number
  rUserId: number | null
  isSeen: number
  subject: string
  body: string
  tableId: number | null
  rowId: number | null
  lockedBy: number | null
  createdBy: number
  updatedBy: number | null
  createdAt: Date | null
  updatedAt: Date | null
  // Enriched fields
  userName?: string | null
  tableName?: string | null
  targetFieldName?: string | null
}

interface ViewNotificationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notificationId: number | null
}

const TABLE_OPTIONS = [
  { id: 136, label: 'Brand', table: 'brand', field: 'brand_name' },
  { id: 137, label: 'Category', table: 'category', field: 'category_name' },
  { id: 154, label: 'Products', table: 'product', field: 'product_name' },
  { id: 155, label: 'Product Sections', table: 'product_sections', field: 'section_name' },
  { id: 159, label: 'Flash Sales', table: 'flash_sales', field: 'title' },
]

export function ViewNotification({
  open,
  onOpenChange,
  notificationId,
}: ViewNotificationProps) {
  const [notification, setNotification] = useState<NotificationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Fetch notification data when dialog opens
  useEffect(() => {
    const fetchNotificationData = async () => {
      if (!notificationId || !open) return
      
      try {
        setIsLoading(true)
        const response = await fetch(`/api/notifications/${notificationId}`)
        const result = await response.json()

        if (result.success && result.notification) {
          setNotification(result.notification)
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
        setIsLoading(false)
      }
    }

    fetchNotificationData()
  }, [notificationId, open, toast])

  // Reset notification when dialog closes
  useEffect(() => {
    if (!open) {
      setNotification(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[70vw] w-[70vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-8 pt-8 pb-6 border-b bg-muted/30 shrink-0">
          <DialogTitle className="text-2xl font-semibold">
            View Notification
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">Loading notification data...</div>
          </div>
        ) : notification ? (
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-muted/30">
            {/* Notification Settings Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground border-b pb-2">
                Notification Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Target User */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Target Client
                  </label>
                  <div className="text-base font-medium bg-background p-3 rounded-md border min-h-[44px] flex items-center">
                    {notification.rUserId ? (
                      notification.userName || `Client ${notification.rUserId}`
                    ) : (
                      <Badge variant="default">All Clients</Badge>
                    )}
                  </div>
                </div>

                {/* Target Table */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Target Table
                  </label>
                  <div className="text-base font-medium bg-background p-3 rounded-md border min-h-[44px] flex items-center">
                    {notification.tableId ? (
                      notification.tableName || 
                      TABLE_OPTIONS.find(t => t.id === notification.tableId)?.label || 
                      `Table ${notification.tableId}`
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </div>
                </div>

                {/* Target Field */}
                {notification.tableId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Target Field
                    </label>
                    <div className="text-base font-medium bg-background p-3 rounded-md border min-h-[44px] flex items-center">
                      {notification.rowId ? (
                        notification.targetFieldName || `Item ${notification.rowId}`
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="bg-background p-3 rounded-md border min-h-[44px] flex items-center">
                    <Badge variant={notification.isSeen === 1 ? "default" : "secondary"}>
                      {notification.isSeen === 1 ? "Seen" : "Unread"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

         

            {/* Notification Content Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground border-b pb-2">
                Notification Content
              </h3>
              
              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Subject
                </label>
                <div className="text-base font-medium bg-background p-3 rounded-md border min-h-[44px] flex items-center">
                  {notification.subject}
                </div>
              </div>

              {/* Body */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Body
                </label>
                <div className="text-base bg-background p-3 rounded-md border min-h-[200px] whitespace-pre-wrap">
                  {notification.body}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">No notification data available</div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 px-8 py-6 border-t bg-muted/30 shrink-0">
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

