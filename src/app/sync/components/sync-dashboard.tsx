"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search} from "lucide-react"
import { CategoriesTable } from "./categories-table"
import { SyncStats } from "./sync-stats"
import { CategoryFilter } from "./category-filter"
import { TrendingKeywords } from "./trending-keywords"
import { PriceInsights } from "./price-insights"
import { TrendingCategories } from "./trending-categories"

interface OverviewData {
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
}

export function SyncDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isSyncing, setIsSyncing] = useState(false)
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchOverviewData()
  }, [])

  const fetchOverviewData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/overview")
      const apiResponse = await response.json()

      if (apiResponse.success && apiResponse.data) {
        const mappedData = {
          total_products: apiResponse.data.products.total,
          total_categories: apiResponse.data.categories.total,
          root_categories: apiResponse.data.categories.root,
          child_categories: apiResponse.data.categories.children,
          last_category_sync: {
            completed_at: apiResponse.data.last_category_structure.completed_at,
          },
          product_discovery: {
            completed_at: apiResponse.data.last_product_discovery.completed_at,
          },
        }
        setOverviewData(mappedData)
      }
    } catch (error) {
      console.error("Error fetching overview data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {/* <header className=" border-b border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60 shadow-sm">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Sync Dashboard
                </h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Alibaba 1688</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>Category Management</span>
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <div className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Real-time Sync
              </div>
            </div>
          </div>
        </div>
      </header> */}

      <div className="container mx-auto px-6 py-8">
        {/* Stats Section */}
        <SyncStats isSyncing={isSyncing} data={overviewData} isLoading={isLoading} />

        {/* Insights Sections */}
        <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <TrendingKeywords />
          <PriceInsights type="highest" />
          <PriceInsights type="lowest" />
        </div>

        {/* Trending Categories Section */}
        <div className="mb-6">
          <TrendingCategories />
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
            <CardDescription>Find categories by name or keyword</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by category name or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <CategoryFilter selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
            </div>
          </CardContent>
        </Card>

        <CategoriesTable searchQuery={searchQuery} selectedCategory={selectedCategory} />
      </div>
    </div>
  )
}
