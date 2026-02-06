"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExternalLink, CheckCircle, Clock, AlertCircle } from "lucide-react"

interface ProductTableProps {
  searchQuery: string
  selectedCategory: string
}

// Mock data - replace with real data from API
const mockProducts = [
  {
    id: "1",
    name: "Wireless Bluetooth Earbuds Pro",
    category: "electronics",
    price: "¥89.50",
    usdPrice: "$12.34",
    status: "synced",
    lastSync: "2m ago",
    sku: "WBE-001",
    stock: 1250,
  },
  {
    id: "2",
    name: "Cotton T-Shirt - Multiple Colors",
    category: "clothing",
    price: "¥45.00",
    usdPrice: "$6.21",
    status: "synced",
    lastSync: "5m ago",
    sku: "CTS-204",
    stock: 8500,
  },
  {
    id: "3",
    name: "Smart LED Desk Lamp",
    category: "home",
    price: "¥125.00",
    usdPrice: "$17.25",
    status: "pending",
    lastSync: "15m ago",
    sku: "SDL-087",
    stock: 420,
  },
  {
    id: "4",
    name: "Stainless Steel Water Bottle",
    category: "sports",
    price: "¥38.00",
    usdPrice: "$5.24",
    status: "synced",
    lastSync: "1m ago",
    sku: "SWB-312",
    stock: 3200,
  },
  {
    id: "5",
    name: "Kids Building Blocks Set",
    category: "toys",
    price: "¥68.00",
    usdPrice: "$9.38",
    status: "error",
    lastSync: "30m ago",
    sku: "KBB-155",
    stock: 0,
  },
  {
    id: "6",
    name: "Facial Cleansing Brush",
    category: "beauty",
    price: "¥55.00",
    usdPrice: "$7.59",
    status: "synced",
    lastSync: "3m ago",
    sku: "FCB-421",
    stock: 950,
  },
]

export function ProductTable({ searchQuery, selectedCategory }: ProductTableProps) {
  const [products] = useState(mockProducts)

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "synced":
        return (
          <Badge variant="secondary" className="gap-1 bg-chart-2/10 text-chart-2 dark:bg-chart-2/20 dark:text-chart-2">
            <CheckCircle className="h-3 w-3" />
            Synced
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1 bg-chart-3/10 text-chart-3 dark:bg-chart-3/20 dark:text-chart-3">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products ({filteredProducts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price (CNY)</TableHead>
                <TableHead>Price (USD)</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell className="capitalize">{product.category}</TableCell>
                    <TableCell>{product.price}</TableCell>
                    <TableCell>{product.usdPrice}</TableCell>
                    <TableCell>{product.stock.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{product.lastSync}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
