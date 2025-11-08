// components/AdvancedAnalyticsDashboard.tsx
"use client"

import { useState } from 'react'
import { 
  LineChart, BarChart, PieChart, Cell,
  Line, Bar, Pie, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { useTheme } from '@/components/ThemeContext'
import { useAnalyticsStore } from '@/lib/analyticsStore'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AdvancedAnalyticsDashboard() {
  const { theme } = useTheme()
  const { weeklyTrends, productivityScore, focusSessions } = useAnalyticsStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'sessions'>('overview')

  const textColor = theme === 'dark' ? '#d1d5db' : '#374151'
  const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb'
  const tooltipBg = theme === 'dark' ? '#1f2937' : '#ffffff'

  // Process session data for charts
  const sessionTypeData = focusSessions.reduce((acc, session) => {
    const type = session.session_type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const sessionTypeChartData = Object.entries(sessionTypeData).map(([name, value]) => ({
    name,
    value
  }))

  const dailyFocusData = weeklyTrends.map(day => {
    // Ensure we have a valid date object
    const dateObj = day.date instanceof Date ? day.date : new Date(day.date)
    
    return {
      date: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      focusTime: Math.round((day.focusTime || 0) / 60), // Convert seconds to minutes
      tasksCompleted: day.tasksCompleted || 0
    }
  }).filter(day => !isNaN(new Date(day.date).getTime())) // Filter out invalid dates

  return (
    <div style={{ 
      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        borderBottom: `1px solid ${gridColor}`,
        paddingBottom: '16px'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'overview' ? '#3b82f6' : 'transparent',
            color: activeTab === 'overview' ? 'white' : textColor,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'trends' ? '#3b82f6' : 'transparent',
            color: activeTab === 'trends' ? 'white' : textColor,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Trends
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'sessions' ? '#3b82f6' : 'transparent',
            color: activeTab === 'sessions' ? 'white' : textColor,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Sessions
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: textColor, marginBottom: '8px' }}>Productivity Score</h3>
            <div style={{ 
              fontSize: '48px', 
              fontWeight: 'bold', 
              color: productivityScore > 80 ? '#10b981' : productivityScore > 60 ? '#f59e0b' : '#ef4444' 
            }}>
              {productivityScore}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={sessionTypeChartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {sessionTypeChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, color: textColor }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'trends' && (
        <div style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyFocusData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" stroke={textColor} />
              <YAxis stroke={textColor} />
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, color: textColor }} />
              <Legend />
              <Bar dataKey="focusTime" fill="#3b82f6" name="Focus Time (min)" />
              <Bar dataKey="tasksCompleted" fill="#10b981" name="Tasks Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyFocusData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" stroke={textColor} />
              <YAxis stroke={textColor} />
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, color: textColor }} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="focusTime" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Focus Time (min)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}