"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Package, FolderTree, CheckCircle, Box } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface SyncStatsProps {
  isSyncing: boolean
  data: {
    total_products: number
    total_categories: number
    root_categories: number
    child_categories: number
    last_category_sync: {
      completed_at: string
    }
    product_discovery: {
      completed_at: string
    }
  } | null
  isLoading: boolean
}

export function SyncStats({ isSyncing, data, isLoading }: SyncStatsProps) {
  const stats = [
    {
      title: "Total Products",
      value: data?.total_products?.toLocaleString() || "0",
      subtitle: "Active products",
      icon: Package,
      color: "text-chart-1 dark:text-chart-1",
    },
    {
      title: "Total Categories",
      value: data?.total_categories?.toLocaleString() || "0",
      subtitle: `${data?.root_categories?.toLocaleString() || 0} root, ${data?.child_categories?.toLocaleString() || 0} children`,
      icon: FolderTree,
      color: "text-chart-2 dark:text-chart-2",
    },
    {
      title: "Last Category Sync",
      value: "Completed",
      subtitle: data?.last_category_sync?.completed_at || "N/A",
      icon: CheckCircle,
      color: "text-chart-3 dark:text-chart-3",
    },
    {
      title: "Product Discovery",
      value: "Completed",
      subtitle: data?.product_discovery?.completed_at || "N/A",
      icon: Box,
      color: "text-chart-4 dark:text-chart-4",
    },
  ]

  if (isLoading) {
    return (
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
