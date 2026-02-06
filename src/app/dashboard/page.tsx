'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, CalendarDays, Package, ShoppingCart, Users, DollarSign, Clock, User, ShoppingBag, ChevronRight, TrendingUp, Award, FolderTree } from "lucide-react"
import { Combobox } from "@/components/ui/combobox"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"

// Dynamically import chart components with SSR disabled to prevent server-side rendering issues
const OrderStatusPieChart = dynamic(
  () => import('./components/OrderStatusPieChart').then(mod => ({ default: mod.OrderStatusPieChart })),
  { ssr: false }
)

const PaymentStatusBarChart = dynamic(
  () => import('./components/PaymentStatusBarChart').then(mod => ({ default: mod.PaymentStatusBarChart })),
  { ssr: false }
)

const RegisteredUsersLineChart = dynamic(
  () => import('./components/RegisteredUsersLineChart').then(mod => ({ default: mod.RegisteredUsersLineChart })),
  { ssr: false }
)

interface BasicStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCategories: number;
  totalUsers: number;
  totalBrands: number;
  totalNotifications: number;
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
}

interface ChartData {
  orderStatusBreakdown: Array<{
    status: number;
    statusName?: string;
    count: number;
    percentage: number;
  }>;
  paidOrders: number;
  unpaidOrders: number;
  totalOrders: number;
  revenueByPeriod: Array<{
    period: string;
    revenue: number;
    orders: number;
  }>;
  registeredUsers: Array<{
    period: string;
    normalUsers: number;
    googleUsers: number;
    facebookUsers: number;
    appleUsers: number;
    total: number;
  }>;
  userTypeBreakdown: {
    normal: number;
    google: number;
    facebook: number;
    apple: number;
  };
}

interface RecentOrder {
  id: number;
  total: number;
  quantity: number;
  status: number;
  statusName?: string;
  isPaid: number;
  createdAt: Date | null;
  customerName: string;
  shippingAmount: number;
  items: Array<{
    id: number;
    productName: string;
    productCode: string;
    quantity: number;
    productPrice: number;
    mainImage: string | null;
  }>;
}

interface TopProduct {
  id: number;
  productName: string;
  displayName: string | null;
  orderCount: number;
  totalRevenue: number;
  mainImage: string | null;
}

interface TopCategory {
  id: number;
  categoryName: string;
  productCount: number;
  totalRevenue: number;
  orderCount: number;
  mainImage: string | null;
  parent: number | null;
  level: number;
}

interface CategoryOption {
  id: number;
  categoryName: string;
}

// Safe Image Component with error handling
function SafeImage({ 
  src, 
  alt, 
  className, 
  fill = false, 
  width, 
  height, 
  sizes,
  containerClassName 
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  containerClassName?: string;
}) {
  const [imageError, setImageError] = useState(false);

  // Check if URL is valid
  const isValidUrl = src && (src.startsWith('http') || src.startsWith('//') || src.startsWith('/'));

  if (!src || imageError || !isValidUrl) {
    return (
      <div className={cn("relative bg-muted flex items-center justify-center", containerClassName, fill && "absolute inset-0")}>
        <Package className={cn("text-muted-foreground", fill ? "h-6 w-6" : "h-5 w-5")} />
      </div>
    );
  }

  // For external images (especially AliCDN), use unoptimized to avoid optimization issues
  // Next.js Image optimization can fail for external images due to CORS or content-type issues
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      className={className}
      sizes={sizes}
      onError={() => {
        console.error('Image failed to load:', src);
        setImageError(true);
      }}
      unoptimized={true}
    />
  );
}

export default function Dashboard() {
  // Separate state for each section
  const [basicStats, setBasicStats] = useState<BasicStats | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCategories, setTopCategories] = useState<TopCategory[]>([])
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([])
  
  // Separate loading states for each section
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingOrderCharts, setLoadingOrderCharts] = useState(true) // Order status & Payment charts
  const [loadingRevenueChart, setLoadingRevenueChart] = useState(true) // Revenue by period
  const [loadingUserCharts, setLoadingUserCharts] = useState(true) // Registered users chart
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  
  // Filter states
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [period, setPeriod] = useState<string>('month')
  const [orderStatus, setOrderStatus] = useState<string>('all')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [userPeriod, setUserPeriod] = useState<string>('day')
  
  const { toast } = useToast()

  // Fetch basic statistics
  const fetchBasicStats = async () => {
    try {
      setLoadingStats(true)
      const params = new URLSearchParams()
      
      if (startDate) {
        params.append('start_date', startDate.toISOString().split('T')[0])
      }
      if (endDate) {
        params.append('end_date', endDate.toISOString().split('T')[0])
      }

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setBasicStats(data.stats)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch statistics",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
      toast({
        title: "Error",
        description: "Failed to fetch statistics",
        variant: "destructive",
      })
    } finally {
      setLoadingStats(false)
    }
  }

  // Fetch order charts (order status & payment status)
  const fetchOrderCharts = async () => {
    try {
      setLoadingOrderCharts(true)
      const params = new URLSearchParams()
      
      if (startDate) {
        params.append('start_date', startDate.toISOString().split('T')[0])
      }
      if (endDate) {
        params.append('end_date', endDate.toISOString().split('T')[0])
      }
      params.append('period', period)
      params.append('user_period', userPeriod)

      const response = await fetch(`/api/dashboard/charts?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setChartData(prev => ({
          ...prev,
          orderStatusBreakdown: data.charts.orderStatusBreakdown,
          paidOrders: data.charts.paidOrders,
          unpaidOrders: data.charts.unpaidOrders,
          totalOrders: data.charts.totalOrders,
        } as ChartData))
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch order charts",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching order charts:', error)
      toast({
        title: "Error",
        description: "Failed to fetch order charts",
        variant: "destructive",
      })
    } finally {
      setLoadingOrderCharts(false)
    }
  }

  // Fetch revenue chart (revenue by period)
  const fetchRevenueChart = async () => {
    try {
      setLoadingRevenueChart(true)
      const params = new URLSearchParams()
      
      if (startDate) {
        params.append('start_date', startDate.toISOString().split('T')[0])
      }
      if (endDate) {
        params.append('end_date', endDate.toISOString().split('T')[0])
      }
      params.append('period', period)
      params.append('user_period', userPeriod)

      const response = await fetch(`/api/dashboard/charts?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setChartData(prev => ({
          ...prev,
          revenueByPeriod: data.charts.revenueByPeriod,
        } as ChartData))
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch revenue chart",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching revenue chart:', error)
      toast({
        title: "Error",
        description: "Failed to fetch revenue chart",
        variant: "destructive",
      })
    } finally {
      setLoadingRevenueChart(false)
    }
  }

  // Fetch user charts (registered users & user type breakdown)
  const fetchUserCharts = async () => {
    try {
      setLoadingUserCharts(true)
      const params = new URLSearchParams()
      
      if (startDate) {
        params.append('start_date', startDate.toISOString().split('T')[0])
      }
      if (endDate) {
        params.append('end_date', endDate.toISOString().split('T')[0])
      }
      params.append('period', period)
      params.append('user_period', userPeriod)

      const response = await fetch(`/api/dashboard/charts?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setChartData(prev => ({
          ...prev,
          registeredUsers: data.charts.registeredUsers,
          userTypeBreakdown: data.charts.userTypeBreakdown,
        } as ChartData))
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch user charts",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching user charts:', error)
      toast({
        title: "Error",
        description: "Failed to fetch user charts",
        variant: "destructive",
      })
    } finally {
      setLoadingUserCharts(false)
    }
  }

  // Fetch all chart data (used on initial load)
  const fetchAllChartData = async () => {
    try {
      setLoadingOrderCharts(true)
      setLoadingRevenueChart(true)
      setLoadingUserCharts(true)
      const params = new URLSearchParams()
      
      if (startDate) {
        params.append('start_date', startDate.toISOString().split('T')[0])
      }
      if (endDate) {
        params.append('end_date', endDate.toISOString().split('T')[0])
      }
      params.append('period', period)
      params.append('user_period', userPeriod)

      const response = await fetch(`/api/dashboard/charts?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setChartData(data.charts)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch chart data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching chart data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch chart data",
        variant: "destructive",
      })
    } finally {
      setLoadingOrderCharts(false)
      setLoadingRevenueChart(false)
      setLoadingUserCharts(false)
    }
  }

  // Fetch recent orders
  const fetchRecentOrders = async () => {
    try {
      setLoadingOrders(true)
      const params = new URLSearchParams()
      
      if (startDate) {
        params.append('start_date', startDate.toISOString().split('T')[0])
      }
      if (endDate) {
        params.append('end_date', endDate.toISOString().split('T')[0])
      }
      if (orderStatus && orderStatus !== 'all') {
        params.append('order_status', orderStatus)
      }

      const response = await fetch(`/api/dashboard/recent-orders?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setRecentOrders(data.recentOrders)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch recent orders",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching recent orders:', error)
      toast({
        title: "Error",
        description: "Failed to fetch recent orders",
        variant: "destructive",
      })
    } finally {
      setLoadingOrders(false)
    }
  }

  // Fetch top products
  const fetchTopProducts = async () => {
    try {
      setLoadingProducts(true)
      const params = new URLSearchParams()
      
      if (startDate) {
        params.append('start_date', startDate.toISOString().split('T')[0])
      }
      if (endDate) {
        params.append('end_date', endDate.toISOString().split('T')[0])
      }

      const response = await fetch(`/api/dashboard/top-products?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setTopProducts(data.topProducts)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch top products",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching top products:', error)
      toast({
        title: "Error",
        description: "Failed to fetch top products",
        variant: "destructive",
      })
    } finally {
      setLoadingProducts(false)
    }
  }

  // Fetch top categories
  const fetchTopCategories = async () => {
    try {
      setLoadingCategories(true)
      const params = new URLSearchParams()
      
      if (startDate) {
        params.append('start_date', startDate.toISOString().split('T')[0])
      }
      if (endDate) {
        params.append('end_date', endDate.toISOString().split('T')[0])
      }
      if (categoryId && categoryId !== 'all') {
        params.append('category_id', categoryId)
      }

      const response = await fetch(`/api/dashboard/top-categories?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setTopCategories(data.topCategories)
        setAllCategories(data.allCategories)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch top categories",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching top categories:', error)
      toast({
        title: "Error",
        description: "Failed to fetch top categories",
        variant: "destructive",
      })
    } finally {
      setLoadingCategories(false)
    }
  }

  // Fetch all data - called on mount
  const fetchAllData = () => {
    // Fetch in parallel for better performance
    fetchBasicStats()
    fetchAllChartData() // Fetch all charts on initial load
    fetchRecentOrders()
    fetchTopProducts()
    fetchTopCategories()
  }

  // Initial load - fetch all data
  useEffect(() => {
    fetchAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) 

  // Global filters (startDate, endDate) - refetch all data
  // Use a ref to track if it's the first render to avoid fetching on mount
  const dateFiltersInitialMount = React.useRef(true)
  useEffect(() => {
    if (dateFiltersInitialMount.current) {
      dateFiltersInitialMount.current = false
      return
    }
    fetchBasicStats()
    fetchOrderCharts()
    fetchRevenueChart()
    fetchUserCharts()
    fetchRecentOrders()
    fetchTopProducts()
    fetchTopCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  // Period filter - only affects revenue by period chart
  // Use a ref to track if it's the first render to avoid fetching on mount
  const periodInitialMount = React.useRef(true)
  useEffect(() => {
    if (periodInitialMount.current) {
      periodInitialMount.current = false
      return
    }
    fetchRevenueChart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  // User period filter - only affects registered users chart
  // Use a ref to track if it's the first render to avoid fetching on mount
  const userPeriodInitialMount = React.useRef(true)
  useEffect(() => {
    if (userPeriodInitialMount.current) {
      userPeriodInitialMount.current = false
      return
    }
    fetchUserCharts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPeriod])

  // Order status filter - only affects recent orders
  // Use a ref to track if it's the first render to avoid fetching on mount
  const orderStatusInitialMount = React.useRef(true)
  useEffect(() => {
    if (orderStatusInitialMount.current) {
      orderStatusInitialMount.current = false
      return
    }
    fetchRecentOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderStatus])

  // Category filter - only affects top categories
  // Use a ref to track if it's the first render to avoid fetching on mount
  const categoryIdInitialMount = React.useRef(true)
  useEffect(() => {
    if (categoryIdInitialMount.current) {
      categoryIdInitialMount.current = false
      return
    }
    fetchTopCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  const clearFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    setPeriod('month')
    setOrderStatus('all')
    setCategoryId('all')
  }

  // Show skeleton only if all data is still loading (initial load)
  const isInitialLoad = loadingStats && loadingOrderCharts && loadingRevenueChart && loadingUserCharts && loadingOrders && loadingProducts && loadingCategories
  
  if (isInitialLoad) {
    return (
      <div className="p-6 lg:p-8 min-h-full space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 w-[140px]" />
            <Skeleton className="h-10 w-[240px]" />
            <Skeleton className="h-10 w-[240px]" />
          </div>
        </div>

        {/* Statistics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Status & Payment Status Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders & Top Products Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Chart Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 min-h-full space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your store statistics</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 ">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal bg-white",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Start date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal bg-white ",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>End date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {(startDate || endDate || (orderStatus && orderStatus !== 'all')) && (
            <Button variant="default" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{basicStats?.totalOrders.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">${basicStats?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{basicStats?.totalProducts.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{basicStats?.totalUsers.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status & Payment Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Order Status Breakdown</CardTitle>
            <CardDescription>Distribution of orders by status</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingOrderCharts ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : chartData ? (
              <OrderStatusPieChart data={chartData.orderStatusBreakdown} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Orders payment breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingOrderCharts ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : chartData ? (
              <PaymentStatusBarChart 
                paidOrders={chartData.paidOrders}
                unpaidOrders={chartData.unpaidOrders}
                totalOrders={chartData.totalOrders}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Recent Orders</CardTitle>
                </div>
                <CardDescription>Latest 10 orders overview</CardDescription>
              </div>
              {chartData && chartData.orderStatusBreakdown.length > 0 && (
                <Select value={orderStatus} onValueChange={setOrderStatus}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {chartData.orderStatusBreakdown.map((status) => (
                      <SelectItem key={status.status} value={status.status.toString()}>
                        {status.statusName || `Status ${status.status}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 -mr-2">
              {loadingOrders ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border rounded-xl">
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </>
              ) : recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="group relative p-4 border rounded-xl bg-card hover:bg-accent/50 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer"
                  >
                    {/* Header Section */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base">#{order.id}</span>
                            <Badge 
                              variant={order.isPaid === 1 ? "default" : "destructive"}
                              className="text-xs font-medium"
                            >
                              {order.isPaid === 1 ? "Paid" : "Unpaid"}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {order.statusName || `Status ${order.status}`}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            <span className="font-medium text-foreground">{order.customerName}</span>
                          </div>
                          {order.createdAt && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{format(new Date(order.createdAt), "MMM dd, yyyy")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-foreground">
                          ${(order.total + order.shippingAmount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.quantity} {order.quantity === 1 ? 'quantity' : 'quantities'}
                        </p>
                      </div>
                    </div>

                    {/* Order Items Section */}
                    {order.items && order.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Order Items
                        </p>
                        <div className="space-y-2">
                          {order.items.slice(0, 3).map((item) => (
                            <div 
                              key={item.id} 
                              className="flex items-center gap-3 p-2 rounded-lg bg-background/50 hover:bg-background transition-colors"
                            >
                              <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 border">
                                <SafeImage
                                  src={item.mainImage}
                                  alt={item.productName}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                  containerClassName="w-12 h-12 rounded-md"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-foreground">
                                  {item.productName}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-muted-foreground">
                                    {item.productCode}
                                  </p>
                                  <span className="text-muted-foreground">•</span>
                                  <p className="text-xs text-muted-foreground">
                                    Qty: {item.quantity}
                                  </p>
                                  <span className="text-muted-foreground">•</span>
                                  <p className="text-xs font-semibold text-foreground">
                                    ${item.productPrice.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="pt-1">
                              <p className="text-xs text-muted-foreground italic text-center">
                                +{order.items.length - 3} more {order.items.length - 3 === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hover indicator */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No recent orders</p>
                  <p className="text-xs text-muted-foreground mt-1">Orders will appear here once available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col">
          <CardHeader className="pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Top Products</CardTitle>
              </div>
              <CardDescription>Best selling products by revenue</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 -mr-2">
              {loadingProducts ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border rounded-xl">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <Skeleton className="w-20 h-20 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : topProducts && topProducts.length > 0 ? (
                topProducts.map((product, index) => {
                  return (
                  <div 
                    key={product.id} 
                    className="group relative p-4 border rounded-xl bg-card hover:bg-accent/50 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      {/* Ranking Badge */}
                      <div className="shrink-0">
                        {index < 3 ? (
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm",
                            index === 0 && "bg-linear-to-br from-yellow-400 to-yellow-600 shadow-lg",
                            index === 1 && "bg-linear-to-br from-gray-300 to-gray-500 shadow-lg",
                            index === 2 && "bg-linear-to-br from-amber-600 to-amber-800 shadow-lg"
                          )}>
                            {index === 0 && <Award className="h-5 w-5" />}
                            {index === 1 && <span>2</span>}
                            {index === 2 && <span>3</span>}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm border-2 border-muted-foreground/30 bg-background">
                            {index + 1}
                          </div>
                        )}
                      </div>

                      {/* Product Image */}
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border shadow-sm">
                        <SafeImage
                          src={product.mainImage}
                          alt={product.displayName || product.productName}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                          sizes="80px"
                          containerClassName="w-20 h-20 rounded-lg"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <h4 className="font-semibold text-base truncate text-foreground">
                            {product.displayName || product.productName}
                          </h4>
                        </div>
                        
                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">{product.orderCount}</span> orders
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">${product.totalRevenue.toFixed(2)}</span> revenue
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Revenue Highlight */}
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold text-primary">
                          ${product.totalRevenue.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Total revenue
                        </p>
                      </div>
                    </div>

                    {/* Hover indicator */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No product data available</p>
                  <p className="text-xs text-muted-foreground mt-1">Top products will appear here once available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories and Revenue by Period Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Categories Section */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Top Categories</CardTitle>
                </div>
                <CardDescription>Best performing categories by product count and revenue</CardDescription>
              </div>
              {allCategories && allCategories.length > 0 && (
                <Combobox
                  options={[
                    { value: 'all', label: 'All Categories' },
                    ...allCategories.map((category) => ({
                      value: category.id.toString(),
                      label: category.categoryName,
                    })),
                  ]}
                  value={categoryId}
                  onValueChange={(value) => setCategoryId(value || 'all')}
                  placeholder="Filter by Category"
                  searchPlaceholder="Search categories..."
                  emptyText="No category found."
                  className="w-[180px] bg-white"
                />
              )}
            </div>
          </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 -mr-2">
            {loadingCategories ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-xl">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <Skeleton className="w-20 h-20 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : topCategories && topCategories.length > 0 ? (
              topCategories.map((category, index) => {
                return (
                <div 
                  key={category.id} 
                  className="group relative p-4 border rounded-xl bg-card hover:bg-accent/50 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    {/* Ranking Badge */}
                    <div className="shrink-0">
                      {index < 3 ? (
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm",
                          index === 0 && "bg-linear-to-br from-yellow-400 to-yellow-600 shadow-lg",
                          index === 1 && "bg-linear-to-br from-gray-300 to-gray-500 shadow-lg",
                          index === 2 && "bg-linear-to-br from-amber-600 to-amber-800 shadow-lg"
                        )}>
                          {index === 0 && <Award className="h-5 w-5" />}
                          {index === 1 && <span>2</span>}
                          {index === 2 && <span>3</span>}
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm border-2 border-muted-foreground/30 bg-background">
                          {index + 1}
                        </div>
                      )}
                    </div>

                    {/* Category Image */}
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border shadow-sm">
                      <SafeImage
                        src={category.mainImage}
                        alt={category.categoryName}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                        sizes="80px"
                        containerClassName="w-20 h-20 rounded-lg"
                      />
                    </div>

                    {/* Category Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h4 className="font-semibold text-base truncate text-foreground">
                          {category.categoryName}
                        </h4>
                        {category.level > 0 && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Level {category.level}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Stats */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{category.productCount}</span> products
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{category.orderCount}</span> orders
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">${category.totalRevenue.toFixed(2)}</span> revenue
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Revenue Highlight */}
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-primary">
                        ${category.totalRevenue.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Total revenue
                      </p>
                    </div>
                  </div>

                  {/* Hover indicator */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderTree className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No category data available</p>
                <p className="text-xs text-muted-foreground mt-1">Top categories will appear here once available</p>
              </div>
            )}
          </div>
        </CardContent>
        </Card>

        {/* Revenue by Period Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue by Period</CardTitle>
                <CardDescription>
                  {period === 'day' && 'Revenue breakdown per day'}
                  {period === 'week' && 'Revenue breakdown per week'}
                  {period === 'month' && 'Revenue breakdown per month'}
                  {period === 'year' && 'Revenue breakdown per year'}
                </CardDescription>
              </div>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[140px] bg-white">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRevenueChart ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : chartData?.revenueByPeriod && chartData.revenueByPeriod.length > 0 ? (
              <div className="space-y-2">
                {chartData.revenueByPeriod.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm font-medium">{item.period}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{item.orders} orders</span>
                      <span className="text-sm font-medium">${item.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No revenue data available</p>
                <p className="text-xs text-muted-foreground/70">Revenue data will appear here once available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Registered Users Chart */}
      {chartData && chartData.registeredUsers && chartData.registeredUsers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>
                  {userPeriod === 'day' && 'New user registrations per day'}
                  {userPeriod === 'week' && 'New user registrations per week'}
                  {userPeriod === 'month' && 'New user registrations per month'}
                  {userPeriod === 'year' && 'New user registrations per year'}
                </CardDescription>
              </div>
              <Select value={userPeriod} onValueChange={setUserPeriod}>
                <SelectTrigger className="w-[140px] bg-white">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUserCharts ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold">{chartData.userTypeBreakdown.normal}</p>
                    <p className="text-xs text-muted-foreground">Normal Users</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold">{chartData.userTypeBreakdown.google}</p>
                    <p className="text-xs text-muted-foreground">Google Users</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold">{chartData.userTypeBreakdown.facebook}</p>
                    <p className="text-xs text-muted-foreground">Facebook Users</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold">{chartData.userTypeBreakdown.apple}</p>
                    <p className="text-xs text-muted-foreground">Apple Users</p>
                  </div>
                </div>
                <RegisteredUsersLineChart 
                  data={chartData.registeredUsers}
                  userPeriod={userPeriod as 'day' | 'week' | 'month' | 'year'}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
