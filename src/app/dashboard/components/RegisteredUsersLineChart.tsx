'use client'

import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { format } from "date-fns"

interface RegisteredUser {
  period: string
  normalUsers: number
  googleUsers: number
  facebookUsers: number
  appleUsers: number
  total: number
}

interface RegisteredUsersLineChartProps {
  data: RegisteredUser[]
  userPeriod: 'day' | 'week' | 'month' | 'year'
}

export function RegisteredUsersLineChart({ data, userPeriod }: RegisteredUsersLineChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  return (
    <ChartContainer
      config={{
        normalUsers: { label: "Normal Users", color: "hsl(217, 91%, 60%)" },
        googleUsers: { label: "Google Users", color: "hsl(142, 76%, 36%)" },
        facebookUsers: { label: "Facebook Users", color: "hsl(24, 95%, 53%)" },
        appleUsers: { label: "Apple Users", color: "hsl(280, 100%, 70%)" },
      }}
      className="h-[400px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={80}
            tickFormatter={(value) => {
              const valueStr = String(value)
              if (userPeriod === 'month' && valueStr && valueStr.length === 7) {
                const [year, month] = valueStr.split('-')
                const date = new Date(parseInt(year), parseInt(month) - 1)
                return format(date, 'MMM yyyy')
              } else if (userPeriod === 'day' && valueStr) {
                return format(new Date(valueStr), 'MMM dd')
              } else if (userPeriod === 'week' && valueStr) {
                const [, week] = valueStr.split('-')
                return `W${week}`
              } else if (userPeriod === 'year' && valueStr) {
                return valueStr
              }
              return valueStr
            }}
            label={{ value: 'Date', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fontSize: 12 } }}
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            label={{ value: 'Number of Users', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 12 } }}
          />
          <ChartTooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                // Format the label based on user period type
                let formattedLabel = String(label || '')
                const labelStr = String(label || '')
                if (userPeriod === 'month' && labelStr && labelStr.length === 7) {
                  // Format YYYY-MM to "Month YYYY"
                  const [year, month] = labelStr.split('-')
                  const date = new Date(parseInt(year), parseInt(month) - 1)
                  formattedLabel = format(date, 'MMMM yyyy')
                } else if (userPeriod === 'day' && labelStr) {
                  // Format YYYY-MM-DD to readable date
                  formattedLabel = format(new Date(labelStr), 'PPP')
                } else if (userPeriod === 'week' && labelStr) {
                  // Format YYYY-WW to "Week WW, YYYY"
                  const [year, week] = labelStr.split('-')
                  formattedLabel = `Week ${week}, ${year}`
                } else if (userPeriod === 'year' && labelStr) {
                  formattedLabel = labelStr
                }

                return (
                  <div className="bg-background border rounded-lg shadow-lg p-3">
                    <p className="font-semibold mb-2 text-sm border-b pb-1">{formattedLabel}</p>
                    <div className="flex flex-col gap-1.5">
                      {payload.map((entry, index) => {
                        const value = typeof entry.value === 'number' ? entry.value : 0
                        // Only show user types that have registrations on this date
                        if (value === 0) return null
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm font-medium">
                              {entry.name}: <span className="font-bold">{value}</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <ChartLegend 
            verticalAlign="top" 
            height={36}
            iconType="line"
            wrapperStyle={{ paddingBottom: '10px' }}
          />
          <Line
            type="monotone"
            dataKey="normalUsers"
            stroke="hsl(217, 91%, 60%)"
            strokeWidth={2}
            dot={{ r: 4, fill: "hsl(217, 91%, 60%)" }}
            activeDot={{ r: 6 }}
            name="Normal Users"
          />
          <Line
            type="monotone"
            dataKey="googleUsers"
            stroke="hsl(142, 76%, 36%)"
            strokeWidth={2}
            dot={{ r: 4, fill: "hsl(142, 76%, 36%)" }}
            activeDot={{ r: 6 }}
            name="Google Users"
          />
          <Line
            type="monotone"
            dataKey="facebookUsers"
            stroke="hsl(24, 95%, 53%)"
            strokeWidth={2}
            dot={{ r: 4, fill: "hsl(24, 95%, 53%)" }}
            activeDot={{ r: 6 }}
            name="Facebook Users"
          />
          <Line
            type="monotone"
            dataKey="appleUsers"
            stroke="hsl(280, 100%, 70%)"
            strokeWidth={2}
            dot={{ r: 4, fill: "hsl(280, 100%, 70%)" }}
            activeDot={{ r: 6 }}
            name="Apple Users"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

