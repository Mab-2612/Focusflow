"use client"

import { useAnalyticsStore } from '@/lib/analyticsStore'
import { useTheme } from '@/components/ThemeContext'
import { useEffect, useState } from 'react'

interface AnalyticsSummary {
  todayFocus: number
  todayTasks: number
  weekFocus: number
  weekTasks: number
  productivityScore: number
}

export default function SimpleAnalyticsDashboard() {
  const { theme } = useTheme()
  const { productivityScore, dailyStats } = useAnalyticsStore()
  const [summary, setSummary] = useState<AnalyticsSummary>({
    todayFocus: 0,
    todayTasks: 0,
    weekFocus: 0,
    weekTasks: 0,
    productivityScore: 0
  })

  useEffect(() => {
    calculateSummary()
  }, [dailyStats, productivityScore])

  const calculateSummary = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayData = dailyStats[today] || { focusTime: 0, tasksCompleted: 0 }
    
    // Calculate weekly totals
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    })

    const weekData = last7Days.reduce((acc, date) => {
      const stats = dailyStats[date] || { focusTime: 0, tasksCompleted: 0 }
      return {
        focusTime: acc.focusTime + stats.focusTime,
        tasksCompleted: acc.tasksCompleted + stats.tasksCompleted
      }
    }, { focusTime: 0, tasksCompleted: 0 })

    setSummary({
      todayFocus: todayData.focusTime,
      todayTasks: todayData.tasksCompleted,
      weekFocus: weekData.focusTime,
      weekTasks: weekData.tasksCompleted,
      productivityScore
    })
  }

  const getProgressPercentage = (value: number, max: number) => {
    return Math.min(100, (value / max) * 100)
  }

  const containerStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
  }

  const statGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  }

  const statCardStyle = {
    backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center' as const
  }

  const statValueStyle = {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '8px 0',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const statLabelStyle = {
    fontSize: '14px',
    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
    margin: 0
  }

  const progressBarStyle = (percentage: number, color: string) => ({
    width: '100%',
    height: '8px',
    backgroundColor: theme === 'dark' ? '#4b5563' : '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    margin: '8px 0'
  })

  const progressFillStyle = (percentage: number, color: string) => ({
    width: `${percentage}%`,
    height: '100%',
    backgroundColor: color,
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  })

  return (
    <div style={containerStyle}>
      <h3 style={{ 
        marginBottom: '20px', 
        color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        📊 Productivity Overview
      </h3>
      
      <div style={statGridStyle}>
        <div style={statCardStyle}>
          <div style={statValueStyle}>{summary.todayFocus}m</div>
          <div style={statLabelStyle}>Today's Focus</div>
          <div style={progressBarStyle(100, '#3b82f6')}>
            <div style={progressFillStyle(getProgressPercentage(summary.todayFocus, 120), '#3b82f6')} />
          </div>
          <div style={statLabelStyle}>
            {getProgressPercentage(summary.todayFocus, 120).toFixed(0)}% of goal
          </div>
        </div>
        
        <div style={statCardStyle}>
          <div style={statValueStyle}>{summary.todayTasks}</div>
          <div style={statLabelStyle}>Today's Tasks</div>
          <div style={progressBarStyle(100, '#10b981')}>
            <div style={progressFillStyle(getProgressPercentage(summary.todayTasks, 8), '#10b981')} />
          </div>
          <div style={statLabelStyle}>
            {getProgressPercentage(summary.todayTasks, 8).toFixed(0)}% of goal
          </div>
        </div>
        
        <div style={statCardStyle}>
          <div style={statValueStyle}>{summary.weekFocus}m</div>
          <div style={statLabelStyle}>Weekly Focus</div>
          <div style={progressBarStyle(100, '#8b5cf6')}>
            <div style={progressFillStyle(getProgressPercentage(summary.weekFocus, 420), '#8b5cf6')} />
          </div>
          <div style={statLabelStyle}>
            {getProgressPercentage(summary.weekFocus, 420).toFixed(0)}% of goal
          </div>
        </div>
        
        <div style={statCardStyle}>
          <div style={{
            ...statValueStyle,
            color: summary.productivityScore > 80 ? '#10b981' : 
                   summary.productivityScore > 60 ? '#f59e0b' : '#ef4444'
          }}>
            {summary.productivityScore}
          </div>
          <div style={statLabelStyle}>Productivity Score</div>
          <div style={progressBarStyle(100, '#ec4899')}>
            <div style={progressFillStyle(summary.productivityScore, '#ec4899')} />
          </div>
          <div style={statLabelStyle}>
            {summary.productivityScore >= 80 ? 'Excellent' :
             summary.productivityScore >= 60 ? 'Good' : 'Needs improvement'}
          </div>
        </div>
      </div>

      {/* Weekly Summary */}
      <div style={{
        padding: '16px',
        backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
        borderRadius: '8px',
        marginTop: '16px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <span style={{ fontWeight: '500', color: theme === 'dark' ? '#f3f4f6' : '#374151' }}>
            Weekly Summary
          </span>
          <span style={{ 
            fontSize: '14px', 
            color: theme === 'dark' ? '#9ca3af' : '#6b7280' 
          }}>
            {Math.round(summary.weekFocus / 60)}h focused • {summary.weekTasks} tasks
          </span>
        </div>
        
        <div style={progressBarStyle(100, '#6b7280')}>
          <div style={progressFillStyle(getProgressPercentage(summary.weekFocus, 420), '#3b82f6')} />
        </div>
      </div>
    </div>
  )
}