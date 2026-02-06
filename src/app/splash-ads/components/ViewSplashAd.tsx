'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

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
  viewCount: number;
  clickCount: number;
  skipCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ViewSplashAdProps {
  open: boolean;
  onClose: () => void;
  splashAd: SplashAdData | null;
}

export function ViewSplashAd({ open, onClose, splashAd }: ViewSplashAdProps) {
  if (!splashAd) return null

  const formatDate = (date: Date | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Calculate CTR and Skip Rate
  const ctr = splashAd.viewCount > 0 
    ? ((splashAd.clickCount / splashAd.viewCount) * 100).toFixed(2) 
    : '0.00'
  const skipRate = splashAd.viewCount > 0 
    ? ((splashAd.skipCount / splashAd.viewCount) * 100).toFixed(2) 
    : '0.00'

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Splash Ad Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold">{splashAd.title}</h3>
              <p className="text-sm text-muted-foreground">ID: {splashAd.id}</p>
            </div>
            <Badge variant={splashAd.isActive === 1 ? "default" : "secondary"}>
              {splashAd.isActive === 1 ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Media Preview */}
          <div className="space-y-2">
            <h4 className="font-medium">Media Preview</h4>
            <div className="border rounded-lg p-4 bg-black">
              {splashAd.mediaType === 'image' && (
                <img 
                  src={splashAd.mediaUrl} 
                  alt={splashAd.title}
                  className="max-h-60 mx-auto object-contain"
                />
              )}
              {splashAd.mediaType === 'video' && (
                <video 
                  src={splashAd.mediaUrl}
                  poster={splashAd.thumbnailUrl || undefined}
                  controls
                  className="max-h-60 mx-auto"
                />
              )}
              {splashAd.mediaType === 'lottie' && (
                <div className="text-center text-white">
                  <p>Lottie Animation</p>
                  <a 
                    href={splashAd.mediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 underline text-sm"
                  >
                    View animation file
                  </a>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{splashAd.mediaType}</Badge>
              <span className="text-xs text-muted-foreground truncate flex-1">{splashAd.mediaUrl}</span>
            </div>
          </div>

          <Separator />

          {/* Link Info */}
          <div className="space-y-2">
            <h4 className="font-medium">Link Configuration</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Link Type:</span>
                <Badge variant="outline" className="ml-2 capitalize">{splashAd.linkType}</Badge>
              </div>
              {splashAd.linkValue && (
                <div>
                  <span className="text-muted-foreground">Link Value:</span>
                  <span className="ml-2">{splashAd.linkValue}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Duration Settings */}
          <div className="space-y-2">
            <h4 className="font-medium">Duration Settings</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">Skip Available After</p>
                <p className="text-2xl font-bold">{splashAd.skipDuration}s</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">Auto-advance After</p>
                <p className="text-2xl font-bold">{splashAd.totalDuration}s</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Schedule */}
          <div className="space-y-2">
            <h4 className="font-medium">Schedule</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Start Date:</span>
                <span className="ml-2">{splashAd.startDate ? formatDate(splashAd.startDate) : 'No start date'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">End Date:</span>
                <span className="ml-2">{splashAd.endDate ? formatDate(splashAd.endDate) : 'No end date'}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Analytics */}
          <div className="space-y-2">
            <h4 className="font-medium">Analytics</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-muted-foreground text-xs">Views</p>
                <p className="text-xl font-bold">{splashAd.viewCount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-muted-foreground text-xs">Clicks</p>
                <p className="text-xl font-bold">{splashAd.clickCount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-muted-foreground text-xs">Skips</p>
                <p className="text-xl font-bold">{splashAd.skipCount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-muted-foreground text-xs">CTR</p>
                <p className="text-xl font-bold">{ctr}%</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Skip Rate: {skipRate}%</p>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>Created: {formatDate(splashAd.createdAt)}</div>
            <div>Updated: {formatDate(splashAd.updatedAt)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
