//components/RealTimePomodoroTimer.tsx
"use client"

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/components/ThemeContext'
import { useAudioTones } from '@/hooks/useAudioTones'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { useAnalyticsStore } from '@/lib/analyticsStore'

interface RealTimePomodoroTimerProps {
  compact?: boolean
  onTimerComplete?: (sessionType: 'work' | 'break' | 'longBreak') => void
}

type TimerMode = 'work' | 'break' | 'longBreak'

export default function RealTimePomodoroTimer({ compact = false, onTimerComplete }: RealTimePomodoroTimerProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const { playStartTone, playStopTone } = useAudioTones()
  const { isOnline } = useAppStore()
  
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60)
  const [isActive, setIsActive] = useState<boolean>(false)
  const [mode, setMode] = useState<TimerMode>('work')
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(0)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Timer settings (in seconds)
  const WORK_TIME = 25 * 60
  const BREAK_TIME = 5 * 60
  const LONG_BREAK_TIME = 15 * 60
  const SESSIONS_BEFORE_LONG_BREAK = 4

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }
      
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .single()

        if (data && !error) {
          const preferences = data.preferences
          const workDuration = parseInt(preferences.work_duration) || 25
          const breakDuration = parseInt(preferences.break_duration) || 5
          const longBreakDuration = parseInt(preferences.long_break_duration) || 15
          
          setTimeLeft(workDuration * 60)
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserPreferences()
  }, [user])

  // Sync timer state across devices
  const syncTimerState = useCallback(async (state: {
    timeLeft: number
    isActive: boolean
    mode: TimerMode
    sessionsCompleted: number
  }) => {
    if (!user || !isOnline) return

    try {
      await supabase
        .from('timer_sessions')
        .upsert({
          user_id: user.id,
          time_left: state.timeLeft,
          is_active: state.isActive,
          mode: state.mode,
          sessions_completed: state.sessionsCompleted,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
    } catch (error) {
      console.error('Error syncing timer state:', error)
    }
  }, [user, isOnline])

  // Load timer state from server
  const loadTimerState = useCallback(async () => {
    if (!user || !isOnline) return

    try {
      const { data, error } = await supabase
        .from('timer_sessions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data && !error) {
        setTimeLeft(data.time_left)
        setIsActive(data.is_active)
        setMode(data.mode)
        setSessionsCompleted(data.sessions_completed)
      }
    } catch (error) {
      console.error('Error loading timer state:', error)
    }
  }, [user, isOnline])

  // Subscribe to real-time timer updates
  useEffect(() => {
    if (!user || !isOnline) return

    const subscription = supabase
      .channel('timer-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'timer_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newState = payload.new
          // Only update if the change is from another device (recent update)
          const isRecent = new Date(newState.last_updated).getTime() > Date.now() - 2000
          
          if (isRecent) {
            setTimeLeft(newState.time_left)
            setIsActive(newState.is_active)
            setMode(newState.mode)
            setSessionsCompleted(newState.sessions_completed)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, isOnline])

  // Initial load
  useEffect(() => {
    loadTimerState()
  }, [loadTimerState])

  // Sync state changes
  useEffect(() => {
    const syncDelay = setTimeout(() => {
      syncTimerState({ timeLeft, isActive, mode, sessionsCompleted })
    }, 500)

    return () => clearTimeout(syncDelay)
  }, [timeLeft, isActive, mode, sessionsCompleted, syncTimerState])

  // Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1)
      }, 1000)
    } else if (timeLeft === 0 && isActive) {
      // Timer completed
      handleTimerCompletion()
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft])

  const handleTimerCompletion = () => {
    playStopTone()
    setIsActive(false)
    
    // Calculate session duration and track it
    if (sessionStartTime && currentSessionId) {
      const duration = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)
      completeFocusSession(duration)
    }
    
    if (mode === 'work') {
      const newSessionsCompleted = sessionsCompleted + 1
      setSessionsCompleted(newSessionsCompleted)
      
      // Every 4 work sessions, take a long break
      if (newSessionsCompleted >= SESSIONS_BEFORE_LONG_BREAK) {
        switchMode('longBreak')
        setSessionsCompleted(0)
      } else {
        switchMode('break')
      }
    } else {
      // After break, go back to work
      switchMode('work')
    }

    if (onTimerComplete) {
      onTimerComplete(mode)
    }
  }

  const switchMode = (nextMode: TimerMode) => {
    setMode(nextMode)
    setIsActive(false)
    setSessionStartTime(null)
    setCurrentSessionId(null)
    
    switch (nextMode) {
      case 'work':
        setTimeLeft(WORK_TIME)
        break
      case 'break':
        setTimeLeft(BREAK_TIME)
        break
      case 'longBreak':
        setTimeLeft(LONG_BREAK_TIME)
        break
    }
  }

  const createFocusSession = async (): Promise<string | null> => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .insert([{
          user_id: user.id,
          start_time: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating focus session:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Error creating focus session:', error)
      return null
    }
  }

  const completeFocusSession = async (duration: number) => {
    if (!user || !currentSessionId) return

    try {
      // Get completed tasks during this session (using created_at since completed_at doesn't exist)
      const tasksCompleted = await getCompletedTasksDuringSession(sessionStartTime!)
      
      // Update the focus session with end time
      const { error } = await supabase
        .from('focus_sessions')
        .update({
          end_time: new Date().toISOString()
        })
        .eq('id', currentSessionId)

      if (error) {
        console.error('Error completing focus session:', error)
        return
      }

      // Calculate duration in minutes for analytics
      const durationMinutes = Math.round(duration / 60)
      
      // Update analytics
      const { updateDailyStats } = useAnalyticsStore.getState()
      const today = new Date().toISOString().split('T')[0]
      const currentStats = useAnalyticsStore.getState().dailyStats[today] || { 
        focusTime: 0, 
        tasksCompleted: 0 
      }
      
      updateDailyStats(today, currentStats.focusTime + durationMinutes, currentStats.tasksCompleted + tasksCompleted)
    } catch (error) {
      console.error('Error completing focus session:', error)
    }
  }

  const getCompletedTasksDuringSession = async (startTime: Date): Promise<number> => {
    if (!user) return 0

    try {
      // Since completed_at column doesn't exist, we'll count all completed tasks today
      // This is an approximation since we can't track exactly which tasks were completed during this session
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed', true)
        // Use created_at as approximation since completed_at doesn't exist
        .gte('created_at', today + 'T00:00:00.000Z')
        .lte('created_at', new Date().toISOString())

      if (error) {
        console.error('Error fetching completed tasks:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Error fetching completed tasks:', error)
      return 0
    }
  }

  const toggleTimer = async () => {
    if (!isActive) {
      // Starting the timer
      playStartTone()
      setIsActive(true)
      setSessionStartTime(new Date())
      
      // Create a new focus session for work mode
      if (mode === 'work') {
        const sessionId = await createFocusSession()
        setCurrentSessionId(sessionId)
      }
    } else {
      // Pausing the timer
      playStopTone()
      setIsActive(false)
      
      // If we have an active session, complete it
      if (sessionStartTime && currentSessionId) {
        const duration = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)
        completeFocusSession(duration)
      }
    }
  }

  const resetTimer = () => {
    setIsActive(false)
    setSessionStartTime(null)
    setCurrentSessionId(null)
    switchMode(mode)
  }

  const skipSession = () => {
    if (mode === 'work') {
      const newSessionsCompleted = sessionsCompleted + 1
      setSessionsCompleted(newSessionsCompleted)
      
      if (newSessionsCompleted >= SESSIONS_BEFORE_LONG_BREAK) {
        switchMode('longBreak')
        setSessionsCompleted(0)
      } else {
        switchMode('break')
      }
    } else {
      switchMode('work')
    }
  }

  // Format time for display (MM:SS)
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '25:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage for circular progress
  const getProgressPercentage = (): number => {
    const totalTime = mode === 'work' ? WORK_TIME : 
                     mode === 'break' ? BREAK_TIME : LONG_BREAK_TIME
    return ((totalTime - timeLeft) / totalTime) * 100
  }

  // Get mode colors
  const getModeColors = () => {
    switch (mode) {
      case 'work':
        return {
          primary: '#ef4444',
          secondary: '#fecaca',
          text: theme === 'dark' ? '#fef2f2' : '#7f1d1d'
        }
      case 'break':
        return {
          primary: '#10b981',
          secondary: '#a7f3d0',
          text: theme === 'dark' ? '#ecfdf5' : '#064e3b'
        }
      case 'longBreak':
        return {
          primary: '#3b82f6',
          secondary: '#bfdbfe',
          text: theme === 'dark' ? '#eff6ff' : '#1e3a8a'
        }
    }
  }

  const colors = getModeColors()

  if (isLoading) {
    return (
      <div style={{
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center',
        color: theme === 'dark' ? '#9ca3af' : '#6b7280'
      }}>
        Loading timer...
      </div>
    )
  }

  if (compact) {
    return (
      <div style={{
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        border: `2px solid ${colors.primary}20`,
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: '600', 
          color: colors.primary,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {mode === 'work' ? 'Focus Time' : mode === 'break' ? 'Short Break' : 'Long Break'}
        </div>
        
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: colors.text,
          marginBottom: '12px',
          fontFamily: 'monospace'
        }}>
          {formatTime(timeLeft)}
        </div>
        
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={toggleTimer}
            style={{
              padding: '6px 12px',
              backgroundColor: isActive ? colors.primary : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {isActive ? 'Pause' : 'Start'}
          </button>
          
          {!isActive && (
            <button
              onClick={skipSession}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Skip
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
      borderRadius: '20px',
      padding: '32px',
      textAlign: 'center',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      border: `3px solid ${colors.primary}20`,
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      {/* Progress Circle */}
      <div style={{
        position: 'relative',
        width: '200px',
        height: '200px',
        margin: '0 auto 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: '50%',
          border: `8px solid ${colors.secondary}`,
          clipPath: `conic-gradient(transparent 0%, transparent ${100 - getProgressPercentage()}%, ${colors.primary} ${100 - getProgressPercentage()}%, ${colors.primary} 100%)`
        }} />
        
        <div style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: colors.text,
          fontFamily: 'monospace'
        }}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Mode indicator */}
      <div style={{ 
        fontSize: '18px', 
        fontWeight: '600', 
        color: colors.primary,
        marginBottom: '16px'
      }}>
        {mode === 'work' ? 'Time to Focus! 🚀' : 
         mode === 'break' ? 'Take a Short Break ☕' : 
         'Enjoy a Long Break 🌴'}
      </div>

      {/* Session counter */}
      <div style={{ 
        color: theme === 'dark' ? '#d1d5db' : '#6b7280',
        marginBottom: '24px',
        fontSize: '14px'
      }}>
        Session: {sessionsCompleted + 1} • Next: {mode === 'work' ? 
          (sessionsCompleted + 1 >= SESSIONS_BEFORE_LONG_BREAK ? 'Long Break' : 'Short Break') : 
          'Work'}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
        <button
          onClick={toggleTimer}
          style={{
            padding: '12px 24px',
            backgroundColor: isActive ? '#6b7280' : colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            minWidth: '100px'
          }}
        >
          {isActive ? 'Pause' : 'Start'}
        </button>
        
        <button
          onClick={resetTimer}
          style={{
            padding: '12px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          Reset
        </button>
      </div>

      <button
        onClick={skipSession}
        style={{
          padding: '8px 16px',
          backgroundColor: 'transparent',
          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
          border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Skip Session
      </button>

      {/* Mode selector */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'center', 
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
      }}>
        {(['work', 'break', 'longBreak'] as TimerMode[]).map((timerMode) => (
          <button
            key={timerMode}
            onClick={() => switchMode(timerMode)}
            style={{
              padding: '8px 12px',
              backgroundColor: mode === timerMode ? colors.primary : 'transparent',
              color: mode === timerMode ? 'white' : theme === 'dark' ? '#d1d5db' : '#6b7280',
              border: `1px solid ${mode === timerMode ? colors.primary : (theme === 'dark' ? '#374151' : '#d1d5db')}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {timerMode === 'work' ? 'Work' : timerMode === 'break' ? 'Break' : 'Long Break'}
          </button>
        ))}
      </div>
    </div>
  )
}