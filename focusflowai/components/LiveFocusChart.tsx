//components/LiveFocusChart.tsx
"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAppStore } from '@/lib/store'
import { useTheme } from '@/components/ThemeContext'

export default function LiveFocusChart() {
  const { theme } = useTheme()
  const { analytics } = useAppStore()

  // Mock data for now - we'll replace with real data
  const data = [
    { day: 'Mon', focus: 120 },
    { day: 'Tue', focus: 180 },
    { day: 'Wed', focus: 90 },
    { day: 'Thu', focus: 210 },
    { day: 'Fri', focus: 150 },
    { day: 'Sat', focus: 60 },
    { day: 'Sun', focus: 30 }
  ]

  const chartColor = theme === 'dark' ? '#8884d8' : '#3b82f6'
  const textColor = theme === 'dark' ? '#d1d5db' : '#374151'

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
          <XAxis 
            dataKey="day" 
            stroke={textColor}
            tick={{ fill: textColor }}
          />
          <YAxis 
            stroke={textColor}
            tick={{ fill: textColor }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
              color: textColor
            }}
          />
          <Line 
            type="monotone" 
            dataKey="focus" 
            stroke={chartColor}
            strokeWidth={2}
            dot={{ fill: chartColor, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: chartColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}