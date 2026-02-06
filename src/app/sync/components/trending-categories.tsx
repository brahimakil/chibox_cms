"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Store, ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface SubcategoryBreakdown {
  category_id: number
  category_name: string
  access_count: number
}

interface TrendingCategory {
  category_id: number
  category_name: string
  main_image: string | null
  total_accesses: number
  subcategory_breakdown: SubcategoryBreakdown[]
}

interface ApiResponse {
  success: boolean
  data: {
    items: TrendingCategory[]
    generated_at: string
  }
}

export function TrendingCategories() {
  const [trendingData, setTrendingData] = useState<TrendingCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchTrendingCategories()
  }, [])

  const fetchTrendingCategories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/trending-categories")
      const apiResponse: ApiResponse = await response.json()

      if (apiResponse.success && apiResponse.data) {
        setTrendingData(apiResponse.data.items)
      }
    } catch (error) {
      console.error("Error fetching trending categories:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending Categories
          </CardTitle>
          <CardDescription>Most accessed categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Trending Categories
            </CardTitle>
            <CardDescription>Most accessed categories with subcategory breakdown</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {trendingData.map((category, index) => {
            const isExpanded = expandedCategories.has(category.category_id)
            const hasSubcategories = category.subcategory_breakdown.length > 0

            return (
              <div key={category.category_id} className="rounded-lg border border-border bg-card">
                {/* Main Category Row */}
                <div
                  className="flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-muted/50"
                  onClick={() => hasSubcategories && toggleCategory(category.category_id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      <span className="font-medium text-primary">{category.category_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">
                        {category.total_accesses.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">total accesses</div>
                    </div>
                    {hasSubcategories && (
                      <div className="text-muted-foreground">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subcategory Breakdown */}
                {isExpanded && hasSubcategories && (
                  <div className="border-t border-border bg-muted/20 p-3">
                    <div className="mb-2 text-xs font-semibold text-muted-foreground">Subcategory Breakdown:</div>
                    <div className="space-y-1.5">
                      {category.subcategory_breakdown.map((sub) => (
                        <div
                          key={sub.category_id}
                          className="flex items-center justify-between rounded-md bg-card px-3 py-2"
                        >
                          <span className="text-sm text-foreground">{sub.category_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {sub.access_count.toLocaleString()} accesses
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
