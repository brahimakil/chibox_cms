"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { useEffect, useState } from "react"

interface Product {
  id: number
  name: string
  price_converted: number
  price_converted_formatted: string
  category: string
}

interface PriceInsightsProps {
  type: "highest" | "lowest"
}

export function PriceInsights({ type }: PriceInsightsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPriceData()
  }, [type])

  const fetchPriceData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/price-extremes")
      const result = await response.json()

      if (result.success) {
        const data = type === "highest" ? result.data.highest_priced : result.data.lowest_priced
        setProducts(data)
      }
    } catch (error) {
      console.error("Error fetching price data:", error)
    } finally {
      setLoading(false)
    }
  }

  const Icon = type === "highest" ? ArrowUpCircle : ArrowDownCircle
  const iconColor = type === "highest" ? "text-red-500" : "text-green-500"

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{type === "highest" ? "Highest" : "Lowest"} Priced Products</CardTitle>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <CardDescription>Top 5 products by {type} price</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/4" />
                </div>
                <div className="h-4 bg-muted rounded animate-pulse w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.id} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category}</p>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">
                  $
                  {product.price_converted.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
