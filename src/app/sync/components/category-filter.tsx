"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw } from "lucide-react"

interface CategoryFilterProps {
  selectedCategory: string
  onCategoryChange: (value: string) => void
}

interface TopCategory {
  id: number
  name: string
  source_category_id: string
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const [topCategories, setTopCategories] = useState<TopCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTopCategories()
  }, [])

  const fetchTopCategories = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/category-stats")
      const data = await response.json()
      if (data.success && data.data?.rows) {
        setTopCategories(data.data.rows)
      }
    } catch (error) {
      console.error("Error fetching top categories:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Select value={selectedCategory} onValueChange={onCategoryChange} disabled={isLoading}>
      <SelectTrigger className="w-full md:w-[240px]">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <SelectValue placeholder="Select category" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Categories</SelectItem>
        {topCategories.map((category) => (
          <SelectItem key={category.id} value={category.id.toString()}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
