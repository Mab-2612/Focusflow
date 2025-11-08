// components/LiveProductivityMetrics.tsx
"use client"

import { useEffect, useState } from 'react'
import { useTheme } from '@/components/ThemeContext'
import { useAnalyticsStore } from '@/lib/analyticsStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LiveMetric {
  id: string
  label: string
  value: number | string
  unit: string
  trend: 'up' | 'down' | 'stable'
  change: number
}

export default function LiveProductivityMetrics() {
  const { theme } = useTheme()
  const { focusSessions, dailyStats, productivityScore } = useAnalyticsStore()
  const [metrics, setMetrics] = useState<LiveMetric[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    const calculateMetrics = () => {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const todayStats = dailyStats[today] || { focusTime: 0, tasksCompleted: 0 }
      const yesterdayStats = dailyStats[yesterdayStr] || { focusTime: 0, tasksCompleted: 0 }

      // Calculate trends
      const focusTrend = todayStats.focusTime > yesterdayStats.focusTime ? 'up' : 
                        todayStats.focusTime < yesterdayStats.focusTime ? 'down' : 'stable'
      
      const tasksTrend = todayStats.tasksCompleted > yesterdayStats.tasksCompleted ? 'up' : 
                        todayStats.tasksCompleted < yesterdayStats.tasksCompleted ? 'down' : 'stable'

      const newMetrics: LiveMetric[] = [
        {
          id: 'focus-time',
          label: 'Today\'s Focus',
          value: Math.round(todayStats.focusTime / 60), // Convert to minutes
          unit: 'min',
          trend: focusTrend,
          change: yesterdayStats.focusTime > 0 
            ? Math.round(((todayStats.focusTime - yesterdayStats.focusTime) / yesterdayStats.focusTime) * 100)
            : todayStats.focusTime > 0 ? 100 : 0
        },
        {
          id: 'tasks-completed',
          label: 'Tasks Done',
          value: todayStats.tasksCompleted,
          unit: 'tasks',
          trend: tasksTrend,
          change: yesterdayStats.tasksCompleted > 0
            ? Math.round(((todayStats.tasksCompleted - yesterdayStats.tasksCompleted) / yesterdayStats.tasksCompleted) * 100)
            : todayStats.tasksCompleted > 0 ? 100 : 0
        },
        {
          id: 'sessions',
          label: 'Focus Sessions',
          value: focusSessions.filter(session => {
            const sessionDate = new Date(session.created_at).toISOString().split('T')[0]
            return sessionDate === today
          }).length,
          unit: 'sessions',
          trend: 'stable',
          change: 0
        },
        {
          id: 'productivity',
          label: 'Productivity Score',
          value: productivityScore,
          unit: '/100',
          trend: productivityScore > 70 ? 'up' : productivityScore < 50 ? 'down' : 'stable',
          change: 0
        }
      ]

      setMetrics(newMetrics)
      setLastUpdate(new Date())
    }

    calculateMetrics()

    // Update metrics every 30 seconds
    const interval = setInterval(calculateMetrics, 30000)

    return () => clearInterval(interval)
  }, [dailyStats, focusSessions, productivityScore])

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '#10b981'
      case 'down': return '#ef4444'
      case 'stable': return '#6b7280'
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '↗'
      case 'down': return '↘'
      case 'stable': return '→'
    }
  }

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    width: '100%'
  }

  const cardStyle = {
    backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
    border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const
  }

  const valueStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '8px 0',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const labelStyle = {
    fontSize: '14px',
    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
    margin: '0'
  }

  const trendStyle = (trend: 'up' | 'down' | 'stable') => ({
    fontSize: '12px',
    color: getTrendColor(trend),
    margin: '4px 0 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px'
  })

  const updateStyle = {
    fontSize: '12px',
    color: theme === 'dark' ? '#6b7280' : '#9ca3af',
    margin: '8px 0 0 0',
    textAlign: 'center' as const
  }

  return (
    <div>
      <div style={containerStyle}>
        {metrics.map(metric => (
          <div key={metric.id} style={{
            backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
            border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center' as const
          }}>
            <div style={labelStyle}>{metric.label}</div>
            <div style={valueStyle}>
              {metric.value} <span style={{ fontSize: '14px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                {metric.unit}
              </span>
            </div>
            {(metric.trend !== 'stable' && metric.change !== 0) && (
              <div style={trendStyle(metric.trend)}>
                {getTrendIcon(metric.trend)} {Math.abs(metric.change)}%
                {metric.trend === 'up' ? ' increase' : ' decrease'} from yesterday
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div style={updateStyle}>
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  )
}