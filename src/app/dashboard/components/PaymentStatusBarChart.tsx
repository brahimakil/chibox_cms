'use client'

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts"

interface PaymentStatusBarChartProps {
  paidOrders: number
  unpaidOrders: number
  totalOrders: number
}

export function PaymentStatusBarChart({ paidOrders, unpaidOrders, totalOrders }: PaymentStatusBarChartProps) {
  if (totalOrders === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-sm text-muted-foreground">No payment data available</p>
      </div>
    )
  }

  const paymentData = [
    {
      name: "Paid",
      value: paidOrders,
      percentage: (paidOrders / totalOrders) * 100,
      fill: "hsl(142, 76%, 36%)", // Green
    },
    {
      name: "Unpaid",
      value: unpaidOrders,
      percentage: (unpaidOrders / totalOrders) * 100,
      fill: "hsl(0, 84%, 60%)", // Red
    },
  ]

  const chartConfig = {
    paid: {
      label: "Paid",
      color: "hsl(142, 76%, 36%)",
    },
    unpaid: {
      label: "Unpaid",
      color: "hsl(0, 84%, 60%)",
    },
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto h-[300px] w-full"
    >
      <BarChart
        data={paymentData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          type="number"
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0]
              return (
                <ChartTooltipContent>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{data.name}</span>
                    <span className="text-muted-foreground">
                      {data.value} orders ({(data.payload as { percentage?: number })?.percentage?.toFixed(1)}%)
                    </span>
                  </div>
                </ChartTooltipContent>
              )
            }
            return null
          }}
        />
        <Bar
          dataKey="value"
          radius={[8, 8, 0, 0]}
          label={{ position: 'top', style: { fontSize: 12, fill: 'currentColor', fontWeight: 500 } }}
        >
          {paymentData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

