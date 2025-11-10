//components/PomodoroTimer.tsx
"use client"

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/components/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { useAudioTones } from '@/hooks/useAudioTones'
import { supabase } from '@/lib/supabase/client'
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
  const [WORK_TIME, setWorkTime] = useState<number | null>(null)
  const [BREAK_TIME, setBreakTime] = useState<number | null>(null)
  const [LONG_BREAK_TIME, setLongBreakTime] = useState<number | null>(null)
  const SESSIONS_BEFORE_LONG_BREAK = 4

  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isActive, setIsActive] = useState<boolean>(false)
  const [mode, setMode] = useState<TimerMode>('work')
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(0)
  const [totalSessions, setTotalSessions] = useState<number>(0)
  
  // Preferences state
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true)
  const [autoBreakEnabled, setAutoBreakEnabled] = useState(true)

  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  const setDefaultTimes = () => {
    const defaultWork = 25 * 60;
    setWorkTime(defaultWork);
    setBreakTime(5 * 60);
    setLongBreakTime(15 * 60);
    setTimeLeft(defaultWork);
    setSoundEffectsEnabled(true);
    setAutoBreakEnabled(true);
  }

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) {
        setDefaultTimes(); // Set defaults if no user
        return
      }
      
      try {
        if (!isValidUUID(user.id)) {
          console.log('Invalid user ID format, using default times');
          setDefaultTimes();
          return;
        }

        const { data, error } = await supabase
          .from('user_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .single()

        if (error || !data?.preferences) {
          console.log('No preferences found or error, using defaults');
          setDefaultTimes();
        } else {
          const preferences = data.preferences;
          const workDuration = (parseInt(preferences.work_duration) || 25) * 60;
          
          setWorkTime(workDuration);
          setBreakTime((parseInt(preferences.break_duration) || 5) * 60);
          setLongBreakTime((parseInt(preferences.long_break_duration) || 15) * 60);
          setTimeLeft(workDuration); // Set time left *after* work time is set
          
          setSoundEffectsEnabled(preferences.sound_effects ?? true);
          setAutoBreakEnabled(preferences.auto_break_enabled ?? true);
        }
      } catch (error) {
        console.error('Unexpected error loading preferences:', error);
        setDefaultTimes();
      }
    }

    loadUserPreferences()
  }, [user])

  // Track focus session
  const trackFocusSession = async (sessionType: string, duration: number) => {
    if (!user) return
    
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('updated_at', thirtyMinutesAgo)
      
      const completedTasks = tasks ? tasks.length : 0
      
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
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '00:00'; // Show 00:00 while loading
    if (isNaN(seconds)) return '25:00';
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Switch to next mode
  const switchMode = useCallback((nextMode: TimerMode, autoStart: boolean = false) => {
    setMode(nextMode)
    setIsActive(autoStart)
    
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
      if (soundEffectsEnabled) playStopTone();
      setIsActive(false)
      
      const sessionDuration = mode === 'work' ? WORK_TIME : 
                             mode === 'break' ? BREAK_TIME : LONG_BREAK_TIME
      
      if (mode === 'work' && sessionDuration) {
         trackFocusSession(mode, sessionDuration)
      }
      
      if (mode === 'work') {
        const newSessionsCompleted = sessionsCompleted + 1
        setSessionsCompleted(newSessionsCompleted)
        setTotalSessions(prev => prev + 1)
        
        if (newSessionsCompleted >= SESSIONS_BEFORE_LONG_BREAK) {
          switchMode('longBreak', autoBreakEnabled)
          setSessionsCompleted(0)
        } else {
          switchMode('break', autoBreakEnabled)
        }
      } else {
        switchMode('work', true)
      }
    }
  }, [timeLeft, isActive, mode, sessionsCompleted, switchMode, playStopTone, WORK_TIME, BREAK_TIME, LONG_BREAK_TIME, soundEffectsEnabled, autoBreakEnabled])

  // Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isActive && timeLeft !== null && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prevTime => (prevTime ? prevTime - 1 : 0))
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft])

  // Start/pause timer
  const toggleTimer = () => {
    if (!isActive && soundEffectsEnabled) {
      playStartTone()
    }
    setIsActive(!isActive)
  }

  // Reset timer
  const resetTimer = () => {
    setIsActive(false)
    switchMode(mode, false)
  }

  // Skip session
  const skipSession = () => {
    if (mode === 'work') {
      const newSessionsCompleted = sessionsCompleted + 1
      setSessionsCompleted(newSessionsCompleted)
      setTotalSessions(prev => prev + 1)
      
      if (newSessionsCompleted >= SESSIONS_BEFORE_LONG_BREAK) {
        switchMode('longBreak', autoBreakEnabled)
        setSessionsCompleted(0)
      } else {
        switchMode('break', autoBreakEnabled)
      }
    } else {
      switchMode('work', true)
    }
  }

  // Calculate progress percentage
  const getProgressPercentage = (): number => {
    if (timeLeft === null || WORK_TIME === null || BREAK_TIME === null || LONG_BREAK_TIME === null) return 0;
    
    const totalTime = mode === 'work' ? WORK_TIME : 
                     mode === 'break' ? BREAK_TIME : LONG_BREAK_TIME
    if (totalTime === 0) return 0;
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

  if (timeLeft === null || WORK_TIME === null) {
    return (
      <div style={{
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        borderRadius: '20px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        minHeight: '480px', // Match the height of the full component
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
      margin: '0 auto',
      minHeight: '480px', // Give it a fixed height
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
            onClick={() => switchMode(timerMode, false)} // Don't auto-start on manual switch
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