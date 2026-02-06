'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface SplashAdData {
  id: number;
  title: string;
  mediaType: 'image' | 'video' | 'lottie';
  mediaUrl: string;
  thumbnailUrl: string | null;
  linkType: 'product' | 'category' | 'url' | 'none';
  linkValue: string | null;
  skipDuration: number;
  totalDuration: number;
  isActive: number;
  startDate: Date | null;
  endDate: Date | null;
}

interface SplashAdFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  splashAd?: SplashAdData | null;
}

export function SplashAdForm({ open, onClose, onSuccess, splashAd }: SplashAdFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Form state
  const [title, setTitle] = useState('')
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'lottie'>('image')
  const [mediaUrl, setMediaUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [linkType, setLinkType] = useState<'product' | 'category' | 'url' | 'none'>('none')
  const [linkValue, setLinkValue] = useState('')
  const [skipDuration, setSkipDuration] = useState(5)
  const [totalDuration, setTotalDuration] = useState(10)
  const [isActive, setIsActive] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (splashAd) {
        // Edit mode - populate form
        setTitle(splashAd.title)
        setMediaType(splashAd.mediaType)
        setMediaUrl(splashAd.mediaUrl)
        setThumbnailUrl(splashAd.thumbnailUrl || '')
        setLinkType(splashAd.linkType)
        setLinkValue(splashAd.linkValue || '')
        setSkipDuration(splashAd.skipDuration)
        setTotalDuration(splashAd.totalDuration)
        setIsActive(splashAd.isActive === 1)
        setStartDate(splashAd.startDate ? new Date(splashAd.startDate).toISOString().split('T')[0] : '')
        setEndDate(splashAd.endDate ? new Date(splashAd.endDate).toISOString().split('T')[0] : '')
      } else {
        // Create mode - reset form
        setTitle('')
        setMediaType('image')
        setMediaUrl('')
        setThumbnailUrl('')
        setLinkType('none')
        setLinkValue('')
        setSkipDuration(5)
        setTotalDuration(10)
        setIsActive(false)
        setStartDate('')
        setEndDate('')
      }
    }
  }, [open, splashAd])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      })
      return
    }
    
    if (!mediaUrl.trim()) {
      toast({
        title: "Error",
        description: "Media URL is required",
        variant: "destructive",
      })
      return
    }
    
    setLoading(true)
    try {
      const data = {
        title: title.trim(),
        media_type: mediaType,
        media_url: mediaUrl.trim(),
        thumbnail_url: thumbnailUrl.trim() || null,
        link_type: linkType,
        link_value: linkType !== 'none' ? linkValue.trim() : null,
        skip_duration: skipDuration,
        total_duration: totalDuration,
        is_active: isActive ? 1 : 0,
        start_date: startDate ? new Date(startDate) : null,
        end_date: endDate ? new Date(endDate) : null,
      }

      const url = splashAd ? `/api/splash-ads/${splashAd.id}` : '/api/splash-ads'
      const method = splashAd ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: splashAd ? "Splash ad updated successfully" : "Splash ad created successfully",
        })
        onSuccess()
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to save splash ad",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving splash ad:', error)
      toast({
        title: "Error",
        description: "Failed to save splash ad",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{splashAd ? 'Edit Splash Ad' : 'Create Splash Ad'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter splash ad title"
            />
          </div>

          {/* Media Type & URL */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Media Type *</Label>
              <Select value={mediaType} onValueChange={(v) => setMediaType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="lottie">Lottie Animation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mediaUrl">Media URL *</Label>
              <Input
                id="mediaUrl"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Thumbnail URL (for video) */}
          {mediaType === 'video' && (
            <div className="space-y-2">
              <Label htmlFor="thumbnailUrl">Thumbnail URL (optional)</Label>
              <Input
                id="thumbnailUrl"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://... (shown while video loads)"
              />
            </div>
          )}

          {/* Preview */}
          {mediaUrl && mediaType === 'image' && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-lg p-2 bg-muted">
                <img 
                  src={mediaUrl} 
                  alt="Preview" 
                  className="max-h-40 mx-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            </div>
          )}

          {/* Link Type & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Link Type</Label>
              <Select value={linkType} onValueChange={(v) => setLinkType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Link</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="url">External URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {linkType !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="linkValue">
                  {linkType === 'product' && 'Product ID'}
                  {linkType === 'category' && 'Category ID'}
                  {linkType === 'url' && 'URL'}
                </Label>
                <Input
                  id="linkValue"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder={
                    linkType === 'product' ? 'Enter product ID' :
                    linkType === 'category' ? 'Enter category ID' :
                    'https://...'
                  }
                />
              </div>
            )}
          </div>

          {/* Durations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="skipDuration">Skip Duration (seconds)</Label>
              <Input
                id="skipDuration"
                type="number"
                min={1}
                max={30}
                value={skipDuration}
                onChange={(e) => setSkipDuration(parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-muted-foreground">Time before skip button becomes available</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalDuration">Total Duration (seconds)</Label>
              <Input
                id="totalDuration"
                type="number"
                min={1}
                max={60}
                value={totalDuration}
                onChange={(e) => setTotalDuration(parseInt(e.target.value) || 10)}
              />
              <p className="text-xs text-muted-foreground">Auto-advances after this time</p>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date (optional)</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="isActive">Active</Label>
              <p className="text-sm text-muted-foreground">Enable this splash ad</p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {splashAd ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
