"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, Clock, Activity } from "lucide-react"

export function SyncHealthMonitor() {
  // Mock data - replace with actual API call
  const syncActivities = [
    {
      type: "success",
      message: "Category structure sync completed",
      details: "183 categories processed successfully",
      timestamp: "2 minutes ago",
    },
    {
      type: "success",
      message: "Product discovery completed",
      details: "1,247 new products found",
      timestamp: "15 minutes ago",
    },
    {
      type: "warning",
      message: "Slow response from API",
      details: "Response time exceeded 5 seconds",
      timestamp: "1 hour ago",
    },
    {
      type: "info",
      message: "Price update scheduled",
      details: "Next update in 2 hours",
      timestamp: "3 hours ago",
    },
  ]

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-chart-2" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-chart-3" />
      case "info":
        return <Clock className="h-4 w-4 text-chart-1" />
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "success":
        return "default"
      case "warning":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sync Activity Monitor</CardTitle>
            <CardDescription>Real-time synchronization events and health status</CardDescription>
          </div>
          <Badge variant="default" className="gap-1">
            <Activity className="h-3 w-3" />
            Healthy
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {syncActivities.map((activity, index) => (
            <div key={index} className="flex items-start gap-4 rounded-lg border border-border p-4">
              <div className="mt-0.5">{getIcon(activity.type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <Badge variant={getBadgeVariant(activity.type)} className="text-xs">
                    {activity.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{activity.details}</p>
                <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
