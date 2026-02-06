"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface KeywordData {
  keyword: string
  search_count: number
  last_searched_at: string
}

interface ApiResponse {
  success: boolean
  data: KeywordData[]
  total: number
}

export function TrendingKeywords() {
  const [keywords, setKeywords] = useState<KeywordData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchKeywords() {
      try {
        const response = await fetch("/api/trending-keywords")
        const result: ApiResponse = await response.json()

        if (result.success && result.data) {
          setKeywords(result.data)
        }
      } catch (error) {
        console.error("Error loading trending keywords:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchKeywords()
  }, [])

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Trending Keywords</CardTitle>
          <TrendingUp className="h-4 w-4 text-chart-2" />
        </div>
        <CardDescription>Most searched product keywords</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : keywords.length > 0 ? (
          <div className="space-y-3">
            {keywords.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{item.keyword}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{item.search_count.toLocaleString()} searches</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No trending keywords found</p>
        )}
      </CardContent>
    </Card>
  )
}
