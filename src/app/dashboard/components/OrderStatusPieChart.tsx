'use client'

import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"
import { PieChart, Pie, Cell } from "recharts"

interface OrderStatusBreakdownItem {
  status: number
  statusName?: string
  count: number
  percentage: number
}

interface OrderStatusPieChartProps {
  data: OrderStatusBreakdownItem[]
}

export function OrderStatusPieChart({ data }: OrderStatusPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-sm text-muted-foreground">No order status data available</p>
      </div>
    )
  }

  // Color palette for different statuses
  const colors = [
    'hsl(24, 95%, 53%)', // Orange - In Review
    'hsl(142, 76%, 36%)', // Green - Completed
    'hsl(217, 91%, 60%)', // Blue - Confirmed
    'hsl(0, 84%, 60%)', // Red - Rejected
    'hsl(280, 100%, 70%)', // Purple - Out for delivery
    'hsl(38, 92%, 50%)', // Yellow - Canceled
    'hsl(199, 89%, 48%)', // Cyan
    'hsl(262, 83%, 58%)', // Indigo
    'hsl(291, 64%, 42%)', // Pink
    'hsl(210, 98%, 39%)', // Sky blue
  ]

  const chartData = data.map((item, index) => ({
    name: item.statusName || `Status ${item.status}`,
    value: item.count,
    percentage: item.percentage,
    fill: colors[index % colors.length],
  }))

  const chartConfig = chartData.reduce((acc, item, index) => {
    acc[item.name] = {
      label: item.name,
      color: colors[index % colors.length],
    }
    return acc
  }, {} as Record<string, { label: string; color: string }>)

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[300px]"
    >
      <PieChart>
        <ChartTooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0]
              const percentage = (data.payload as { percentage?: number })?.percentage || 0
              return (
                <ChartTooltipContent>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{data.name}</span>
                    <span className="text-muted-foreground">
                      {data.value} orders ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </ChartTooltipContent>
              )
            }
            return null
          }}
        />
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          innerRadius={40}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.fill}
            />
          ))}
        </Pie>
        <ChartLegend
          content={(props) => {
            const { payload } = props
            if (!payload) return null
            
            return (
              <div className="flex items-center justify-center gap-6 pt-4">
                {payload.map((entry) => {
                  const data = chartData.find(item => item.name === entry.value)
                  if (!data) return null
                  
                  return (
                    <div key={entry.value} className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2.5 w-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs font-medium leading-tight">{entry.value}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground leading-tight">
                        {data.value}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          }}
          className="-bottom-2"
        />
      </PieChart>
    </ChartContainer>
  )
}

