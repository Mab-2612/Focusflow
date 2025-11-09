// app/analytics/page.tsx
"use client"

import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'

export default function AnalyticsPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  
  const [focusSessions, setFocusSessions] = useState<any[]>([])
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([])
  const [productivityScore, setProductivityScore] = useState(0)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [totalFocusTime, setTotalFocusTime] = useState(0)
  const [totalTasksCompleted, setTotalTasksCompleted] = useState(0)

  // Theme-aware styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    transition: 'background-color 0.3s ease, color 0.3s ease'
  }

  const titleStyle = {
    fontSize: 'var(--font-xl)',
    fontWeight: '700',
    marginBottom: '32px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const sectionStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    marginBottom: '24px'
  }

  const sectionTitleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '16px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  // Analytics styles
  const statCardStyle = {
    backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center' as const
  }

  const statValueStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '8px 0',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const statLabelStyle = {
    fontSize: '14px',
    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
    margin: 0
  }

  const sessionListStyle = {
    maxHeight: '300px',
    overflowY: 'auto' as const
  }

  const sessionItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
    fontSize: '14px'
  }

  useEffect(() => {
    setIsMounted(true)
    if (user) {
      loadAnalyticsData()
    }
  }, [user])
  
  const loadAnalyticsData = useCallback(async () => {
    if (!user) return
    
    setIsLoadingAnalytics(true)
    try {
      const { data: sessions, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (sessions && !error) {
        setFocusSessions(sessions)
        
        const totalTime = sessions.reduce((sum, session) => sum + Math.round(session.duration / 60), 0)
        const totalTasks = sessions.reduce((sum, session) => sum + session.completed_tasks, 0)
        
        setTotalFocusTime(totalTime)
        setTotalTasksCompleted(totalTasks)
        
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - i)
          return date.toISOString().split('T')[0]
        }).reverse()

        const weeklyData = last7Days.map(date => {
          const daySessions = sessions.filter(session => 
            new Date(session.created_at).toISOString().split('T')[0] === date
          )
          
          const dayFocus = daySessions.reduce((sum, session) => sum + Math.round(session.duration / 60), 0)
          const dayTasks = daySessions.reduce((sum, session) => sum + session.completed_tasks, 0)
          
          return {
            date,
            focusTime: dayFocus,
            tasksCompleted: dayTasks
          }
        })
        
        setWeeklyTrends(weeklyData)
        
        const activeDays = last7Days.filter(date => 
          weeklyData.find(day => day.date === date)?.focusTime > 0
        ).length
        
        const consistency = (activeDays / 7) * 40
        const efficiency = Math.min(100, (totalTasks / 20) * 60)
        setProductivityScore(Math.round(consistency + efficiency))
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoadingAnalytics(false)
    }
  }, [user])

  const exportAnalyticsData = () => {
    const csvContent = [
      ['Date', 'Session Type', 'Duration (minutes)', 'Tasks Completed'],
      ...focusSessions.map(session => [
        new Date(session.created_at).toLocaleDateString(),
        session.session_type,
        Math.round(session.duration / 60),
        session.completed_tasks
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `focusflow-analytics-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }
  
  if (!isMounted) {
    return (
      <div style={containerStyle}>
        <div className="page-container">
          <h1 style={titleStyle}>Analytics</h1>
        </div>
        <Navbar />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div className="page-container">
        <h1 style={titleStyle}>Analytics</h1>

        {/* Analytics Tab Content */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Productivity Analytics</h2>
          <p style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280', marginBottom: '24px' }}>
            {isLoadingAnalytics ? 'Loading your productivity data...' : 'Track your productivity trends and improve your focus habits.'}
          </p>
          
          {isLoadingAnalytics ? (
            <div style={{ textAlign: 'center', padding: '40px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
              <div style={{ animation: 'spin 1s linear infinite', fontSize: '24px', marginBottom: '16px' }}>⏳</div>
              Loading your productivity data...
            </div>
          ) : (
            <>
              <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={statCardStyle}>
                  <div style={statValueStyle}>{focusSessions.length}</div>
                  <div style={statLabelStyle}>Focus Sessions</div>
                </div>
                
                <div style={statCardStyle}>
                  <div style={statValueStyle}>
                    {Math.floor(totalFocusTime / 60)}h {totalFocusTime % 60}m
                  </div>
                  <div style={statLabelStyle}>Total Focus Time</div>
                </div>
                
                <div style={statCardStyle}>
                  <div style={statValueStyle}>{totalTasksCompleted}</div>
                  <div style={statLabelStyle}>Tasks Completed</div>
                </div>
                
                <div style={statCardStyle}>
                  <div style={{...statValueStyle, color: productivityScore > 80 ? '#10b981' : productivityScore > 60 ? '#f59e0b' : '#ef4444'}}>
                    {productivityScore}
                  </div>
                  <div style={statLabelStyle}>Productivity Score</div>
                </div>
              </div>

              {/* Weekly Focus Chart */}
              <div style={{ height: '200px', backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                {weeklyTrends.length > 0 ? (
                  <div style={{ width: '100%', height: '100%' }}>
                    <h4 style={{ marginBottom: '12px', color: theme === 'dark' ? '#f3f4f6' : '#374151' }}>Weekly Focus Time</h4>
                    <div style={{ display: 'flex', alignItems: 'end', gap: '8px', height: '120px' }}>
                      {weeklyTrends.map((day, index) => (
                        <div key={index} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ height: `${Math.min(100, (day.focusTime / 120) * 100)}px`, backgroundColor: '#3b82f6', borderRadius: '4px 4px 0 0', margin: '0 auto', width: '20px' }} />
                          <div style={{ fontSize: '12px', marginTop: '8px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280', textAlign: 'center', padding: '20px' }}>
                    No focus sessions recorded yet. Start a Pomodoro session to see analytics!
                  </div>
                )}
              </div>

              {/* Session History */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}>
                  Recent Focus Sessions
                </h3>
                <div style={sessionListStyle}>
                  {focusSessions.slice(0, 5).map(session => (
                    <div key={session.id} style={sessionItemStyle}>
                      <span>{new Date(session.created_at).toLocaleDateString()} - {session.session_type}</span>
                      <span>{Math.round(session.duration / 60)}m • {session.completed_tasks} tasks</span>
                    </div>
                  ))}
                  {focusSessions.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                      No focus sessions recorded yet
                    </div>
                  )}
                </div>
              </div>

              {focusSessions.length > 0 && (
                <button onClick={exportAnalyticsData} style={{ padding: '10px 16px', backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6', color: theme === 'dark' ? '#d1d5db' : '#374151', border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`, borderRadius: '8px', cursor: 'pointer', marginTop: '16px' }}>
                  Export Analytics Data
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <Navbar />
    </div>
  )
}