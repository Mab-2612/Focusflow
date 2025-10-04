"use client"

import { useAnalyticsStore } from '@/lib/analyticsStore'
import { useTheme } from '@/components/ThemeContext'

export default function EnhancedAnalytics() {
  const { theme } = useTheme()
  const { productivityScore, weeklyTrends, dailyStats } = useAnalyticsStore()

  const getProductivityLevel = (score: number) => {
    if (score >= 80) return { level: 'Excellent', color: '#10b981', emoji: '🚀' }
    if (score >= 60) return { level: 'Good', color: '#f59e0b', emoji: '👍' }
    if (score >= 40) return { level: 'Average', color: '#6b7280', emoji: '📊' }
    return { level: 'Needs Improvement', color: '#ef4444', emoji: '💪' }
  }

  const productivityInfo = getProductivityLevel(productivityScore)

  return (
    <div style={{
      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <h3 style={{ 
        marginBottom: '20px', 
        color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        📈 Productivity Insights
      </h3>

      {/* Productivity Score Card */}
      <div style={{
        backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '14px', color: theme === 'dark' ? '#d1d5db' : '#6b7280' }}>
          Your Productivity Score
        </div>
        <div style={{ 
          fontSize: '48px', 
          fontWeight: 'bold', 
          color: productivityInfo.color,
          margin: '10px 0'
        }}>
          {productivityScore}
          <span style={{ fontSize: '24px', marginLeft: '5px' }}>/100</span>
        </div>
        <div style={{ 
          fontSize: '16px', 
          color: productivityInfo.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          {productivityInfo.emoji} {productivityInfo.level}
        </div>
      </div>

      {/* Weekly Focus Trend */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ 
          marginBottom: '15px', 
          color: theme === 'dark' ? '#f3f4f6' : '#374151' 
        }}>
          📅 Weekly Focus Trend
        </h4>
        <div style={{ display: 'flex', alignItems: 'end', gap: '8px', height: '120px' }}>
          {weeklyTrends.map((day, index) => (
            <div key={index} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ 
                height: `${Math.min(100, (day.focusTime / 120) * 100)}px`, 
                backgroundColor: '#3b82f6',
                borderRadius: '4px 4px 0 0',
                margin: '0 auto',
                width: '20px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-25px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '12px',
                  color: theme === 'dark' ? '#d1d5db' : '#6b7280'
                }}>
                  {day.focusTime}m
                </div>
              </div>
              <div style={{ 
                fontSize: '12px', 
                marginTop: '8px', 
                color: theme === 'dark' ? '#9ca3af' : '#6b7280' 
              }}>
                {day.date.split('-')[2]}/{day.date.split('-')[1]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Stats */}
      <div>
        <h4 style={{ 
          marginBottom: '15px', 
          color: theme === 'dark' ? '#f3f4f6' : '#374151' 
        }}>
          📊 Today's Progress
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={{ 
            backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
              {dailyStats[new Date().toISOString().split('T')[0]]?.focusTime || 0}m
            </div>
            <div style={{ fontSize: '12px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
              Focus Time
            </div>
          </div>
          <div style={{ 
            backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
              {dailyStats[new Date().toISOString().split('T')[0]]?.tasksCompleted || 0}
            </div>
            <div style={{ fontSize: '12px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
              Tasks Done
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}