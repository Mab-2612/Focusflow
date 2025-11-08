// components/AnalyticsDashboard.tsx
"use client"

import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'

interface FocusSession {
  id: string
  duration: number
  session_type: string
  completed_tasks: number
  created_at: string
}

interface AnalyticsData {
  totalFocusTime: number
  totalSessions: number
  avgSessionLength: number
  tasksCompleted: number
  weeklyData: { day: string; minutes: number }[]
  bestTime: string
  consistencyScore: number
}

export default function AnalyticsDashboard() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week')
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalFocusTime: 0,
    totalSessions: 0,
    avgSessionLength: 0,
    tasksCompleted: 0,
    weeklyData: [],
    bestTime: 'Morning',
    consistencyScore: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  // Helper function to validate UUID format
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  useEffect(() => {
    if (user) {
      loadAnalyticsData()
    }
  }, [user, timeRange])

  const loadAnalyticsData = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      // Validate the user ID is a valid UUID
      if (!isValidUUID(user.id)) {
        console.error('Invalid user ID format');
        setIsLoading(false);
        return;
      }

      // Load focus sessions
      let query = supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
      
      // Apply time filter
      const now = new Date()
      if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        query = query.gte('created_at', monthAgo.toISOString())
      }
      
      const { data: sessionsData, error } = await query.order('created_at', { ascending: false })
      
      if (sessionsData && !error) {
        setSessions(sessionsData)
        
        // Calculate analytics
        const totalFocusTime = sessionsData.reduce((sum, session) => sum + session.duration, 0)
        const tasksCompleted = sessionsData.reduce((sum, session) => sum + session.completed_tasks, 0)
        const avgSessionLength = sessionsData.length > 0 ? Math.round(totalFocusTime / sessionsData.length) : 0
        
        // Generate weekly data from actual sessions
        const weeklyData = generateWeeklyData(sessionsData)
        
        setAnalytics({
          totalFocusTime,
          totalSessions: sessionsData.length,
          avgSessionLength,
          tasksCompleted,
          weeklyData,
          bestTime: calculateBestTime(sessionsData),
          consistencyScore: calculateConsistencyScore(sessionsData)
        })
      } else if (error) {
        console.error('Error loading analytics:', error);
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateWeeklyData = (sessions: FocusSession[]): { day: string; minutes: number }[] => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const result = days.map(day => ({ day, minutes: 0 }))
    
    // Get the start of the week (Sunday)
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    // Group sessions by day of week
    sessions.forEach(session => {
      const sessionDate = new Date(session.created_at)
      if (sessionDate >= startOfWeek) {
        const dayOfWeek = sessionDate.getDay()
        result[dayOfWeek].minutes += session.duration
      }
    })
    
    return result
  }

  const calculateBestTime = (sessions: FocusSession[]): string => {
    const timeSlots = {
      morning: 0,    // 6am - 12pm
      afternoon: 0,  // 12pm - 6pm
      evening: 0,    // 6pm - 10pm
      night: 0       // 10pm - 6am
    }
    
    sessions.forEach(session => {
      const sessionDate = new Date(session.created_at)
      const hours = sessionDate.getHours()
      
      if (hours >= 6 && hours < 12) timeSlots.morning += session.duration
      else if (hours >= 12 && hours < 18) timeSlots.afternoon += session.duration
      else if (hours >= 18 && hours < 22) timeSlots.evening += session.duration
      else timeSlots.night += session.duration
    })
    
    // Find the time slot with the most focus time
    const bestTime = Object.entries(timeSlots).reduce((max, [time, duration]) => 
      duration > max.duration ? { time, duration } : max, 
      { time: '', duration: 0 }
    )
    
    return bestTime.time ? bestTime.time.charAt(0).toUpperCase() + bestTime.time.slice(1) : 'Morning'
  }

  const calculateConsistencyScore = (sessions: FocusSession[]): number => {
    if (sessions.length < 2) return 0
    
    // Calculate consistency based on number of days with at least one session in the last week
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    
    const sessionDays = new Set()
    sessions.forEach(session => {
      const sessionDate = new Date(session.created_at)
      if (sessionDate >= lastWeek) {
        sessionDays.add(sessionDate.toDateString())
      }
    })
    
    // Score is percentage of days with at least one session
    return Math.round((sessionDays.size / 7) * 100)
  }

  const formatTime = (minutes: number): string => {
    if (isNaN(minutes)) return '0m'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const containerStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    transition: 'background-color 0.3s ease'
  }

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  }

  const titleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const filterStyle = {
    display: 'flex',
    gap: '8px'
  }

  const filterButtonStyle = (isActive: boolean) => ({
    padding: '6px 12px',
    backgroundColor: isActive ? '#3b82f6' : 'transparent',
    color: isActive ? 'white' : (theme === 'dark' ? '#d1d5db' : '#6b7280'),
    border: `1px solid ${isActive ? '#3b82f6' : (theme === 'dark' ? '#374151' : '#d1d5db')}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  })

  const statsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  }

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
    color: theme === 'dark' ? '#d1d5db' : '#6b7280',
    margin: 0
  }

  const chartContainerStyle = {
    height: '200px',
    backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
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

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '40px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
          Loading analytics...
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Productivity Analytics</h2>
        <div style={filterStyle}>
          <button 
            style={filterButtonStyle(timeRange === 'week')}
            onClick={() => setTimeRange('week')}
          >
            Week
          </button>
          <button 
            style={filterButtonStyle(timeRange === 'month')}
            onClick={() => setTimeRange('month')}
          >
            Month
          </button>
          <button 
            style={filterButtonStyle(timeRange === 'all')}
            onClick={() => setTimeRange('all')}
          >
            All Time
          </button>
        </div>
      </div>

      <div style={statsGridStyle}>
        <div style={statCardStyle}>
          <div style={statValueStyle}>{formatTime(analytics.totalFocusTime)}</div>
          <p style={statLabelStyle}>Total Focus Time</p>
        </div>
        <div style={statCardStyle}>
          <div style={statValueStyle}>{analytics.totalSessions}</div>
          <p style={statLabelStyle}>Focus Sessions</p>
        </div>
        <div style={statCardStyle}>
          <div style={statValueStyle}>{formatTime(analytics.avgSessionLength)}</div>
          <p style={statLabelStyle}>Avg. Session</p>
        </div>
        <div style={statCardStyle}>
          <div style={statValueStyle}>{analytics.tasksCompleted}</div>
          <p style={statLabelStyle}>Tasks Completed</p>
        </div>
      </div>

      <div style={chartContainerStyle}>
        Focus Time Chart (Placeholder - would show {timeRange} data)
      </div>

      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}>
          Recent Focus Sessions
        </h3>
        <div style={sessionListStyle}>
          {sessions.slice(0, 5).map(session => (
            <div key={session.id} style={sessionItemStyle}>
              <span>
                {new Date(session.created_at).toLocaleDateString()} - {session.session_type}
              </span>
              <span>{formatTime(session.duration)}</span>
            </div>
          ))}
          {sessions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
              No focus sessions recorded yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}