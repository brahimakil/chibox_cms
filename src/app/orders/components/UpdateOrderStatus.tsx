'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StatusOption {
  id: number
  text: string
}

interface UpdateOrderStatusProps {
  orderId: number | null
  currentStatus: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function UpdateOrderStatus({ 
  orderId, 
  currentStatus,
  open, 
  onOpenChange,
  onSuccess 
}: UpdateOrderStatusProps) {
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const { toast } = useToast()

  // Fetch status options when dialog opens
  useEffect(() => {
    if (open) {
      fetchStatusOptions()
      // Set current status as default
      setSelectedStatus(currentStatus?.toString() || '')
    } else {
      // Reset when dialog closes
      setSelectedStatus('')
    }
  }, [open, currentStatus])

  const fetchStatusOptions = async () => {
    try {
      setLoadingOptions(true)
      // List ID 4 is for order status (based on the backend code)
      const response = await fetch('/api/list-options?id=4&page=1')
      const data = await response.json()

      if (data.results && Array.isArray(data.results)) {
        setStatusOptions(data.results)
      } else {
        toast({
          title: "Error",
          description: "Failed to load status options",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching status options:', error)
      toast({
        title: "Error",
        description: "Failed to load status options",
        variant: "destructive",
      })
    } finally {
      setLoadingOptions(false)
    }
  }

  const handleSubmit = async () => {
    if (!orderId || !selectedStatus) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: parseInt(selectedStatus),
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Order status updated successfully",
        })
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update order status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            {orderId && `Update the status for order #${orderId}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loadingOptions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id.toString()}>
                      {option.text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !selectedStatus || loadingOptions}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

