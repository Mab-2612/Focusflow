//components/PomodoroTimer.tsx
"use client"

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/components/ThemeContext'
import { useAudioTones } from '@/hooks/useAudioTones'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { useAnalyticsStore } from '@/lib/analyticsStore'

interface PomodoroTimerProps {
  onTimerComplete?: (sessionType: 'work' | 'break' | 'longBreak') => void
  compact?: boolean
}

type TimerMode = 'work' | 'break' | 'longBreak'

export default function PomodoroTimer({ onTimerComplete, compact = false }: PomodoroTimerProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const { playStartTone, playStopTone } = useAudioTones()
  const { addFocusSession, updateDailyStats } = useAnalyticsStore()
  
  // Timer settings (in seconds)
  const [WORK_TIME, setWorkTime] = useState(25 * 60)
  const [BREAK_TIME, setBreakTime] = useState(5 * 60)
  const [LONG_BREAK_TIME, setLongBreakTime] = useState(15 * 60)
  const SESSIONS_BEFORE_LONG_BREAK = 4

  const [timeLeft, setTimeLeft] = useState<number>(25 * 60)
  const [isActive, setIsActive] = useState<boolean>(false)
  const [mode, setMode] = useState<TimerMode>('work')
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(0)
  const [totalSessions, setTotalSessions] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  const setDefaultTimes = () => {
    setWorkTime(25 * 60);
    setBreakTime(5 * 60);
    setLongBreakTime(15 * 60);
    setTimeLeft(25 * 60);
  }

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }
      
      try {
        // Validate user ID format
        if (!isValidUUID(user.id)) {
          console.log('Invalid user ID format, using default times');
          setDefaultTimes();
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .single()

        if (error) {
          // Handle specific error cases
          if (error.code === 'PGRST116') { // No rows returned
            console.log('No preferences found, using defaults');
            setDefaultTimes();
          } else {
            console.error('Error loading preferences:', error.message || error);
            setDefaultTimes();
          }
        } else if (data?.preferences) {
          const preferences = data.preferences;
          const workDuration = parseInt(preferences.work_duration) || 25;
          const breakDuration = parseInt(preferences.break_duration) || 5;
          const longBreakDuration = parseInt(preferences.long_break_duration) || 15;
          
          setWorkTime(workDuration * 60);
          setBreakTime(breakDuration * 60);
          setLongBreakTime(longBreakDuration * 60);
          setTimeLeft(workDuration * 60);
        } else {
          setDefaultTimes();
        }
      } catch (error) {
        console.error('Unexpected error loading preferences:', error);
        setDefaultTimes();
      } finally {
        setIsLoading(false);
      }
    }

    loadUserPreferences()
  }, [user])

  // Track focus session with proper analytics
  const trackFocusSession = async (sessionType: string, duration: number) => {
    if (!user) return
    
    try {
      // Get completed tasks in the last 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('updated_at', thirtyMinutesAgo)
      
      const completedTasks = tasks ? tasks.length : 0
      
      // Record the focus session in Supabase
      const { data: session } = await supabase
        .from('focus_sessions')
        .insert([{
          user_id: user.id,
          duration: duration,
          session_type: sessionType,
          completed_tasks: completedTasks
        }])
        .select()
        .single()

      if (session) {
        // Update analytics store
        const today = new Date().toISOString().split('T')[0]
        const durationMinutes = Math.round(duration / 60)
        
        addFocusSession(session)
        updateDailyStats(today, durationMinutes, completedTasks)
      }
    } catch (error) {
      console.error('Error tracking focus session:', error)
    }
  }

  // Format time for display (MM:SS)
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '25:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Switch to next mode
  const switchMode = useCallback((nextMode: TimerMode) => {
    setMode(nextMode)
    setIsActive(false)
    
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
    
    if (onTimerComplete) {
      onTimerComplete(nextMode)
    }
  }, [WORK_TIME, BREAK_TIME, LONG_BREAK_TIME, onTimerComplete])

  // Handle timer completion
  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      playStopTone()
      setIsActive(false)
      
      // Track the completed session
      const sessionDuration = mode === 'work' ? WORK_TIME : 
                             mode === 'break' ? BREAK_TIME : LONG_BREAK_TIME
      trackFocusSession(mode, sessionDuration)
      
      if (mode === 'work') {
        const newSessionsCompleted = sessionsCompleted + 1
        setSessionsCompleted(newSessionsCompleted)
        setTotalSessions(prev => prev + 1)
        
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
    }
  }, [timeLeft, isActive, mode, sessionsCompleted, switchMode, playStopTone, WORK_TIME, BREAK_TIME, LONG_BREAK_TIME])

  // Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1)
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft])

  // Start/pause timer
  const toggleTimer = () => {
    if (!isActive) {
      playStartTone()
    }
    setIsActive(!isActive)
  }

  // Reset timer to current mode's default time
  const resetTimer = () => {
    setIsActive(false)
    switchMode(mode)
  }

  // Skip current session
  const skipSession = () => {
    if (mode === 'work') {
      const newSessionsCompleted = sessionsCompleted + 1
      setSessionsCompleted(newSessionsCompleted)
      setTotalSessions(prev => prev + 1)
      
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
        Session: {totalSessions + 1} • Next: {mode === 'work' ? 
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