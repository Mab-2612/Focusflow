//app/pomodoro/page.tsx
"use client"

import PomodoroTimer from '@/components/PomodoroTimer'
import Navbar from '@/components/Navbar'
import { useTheme } from '@/components/ThemeContext'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { Rocket, Coffee, Wind, HelpCircle, Timer } from 'lucide-react'

export default function PomodoroPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [showInstructions, setShowInstructions] = useState(false)
  const instructionsRef = useRef<HTMLDivElement>(null)
  const questionButtonRef = useRef<HTMLButtonElement>(null)

  const [workDuration, setWorkDuration] = useState<number | null>(null)
  const [breakDuration, setBreakDuration] = useState<number | null>(null)
  const [longBreakDuration, setLongBreakDuration] = useState<number | null>(null)

  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) {
        setWorkDuration(25);
        setBreakDuration(5);
        setLongBreakDuration(15);
        return
      }
      
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .single()

        if (data && !error && data.preferences) {
          setWorkDuration(Number(data.preferences.work_duration) || 25)
          setBreakDuration(Number(data.preferences.break_duration) || 5)
          setLongBreakDuration(Number(data.preferences.long_break_duration) || 15)
        } else {
          setWorkDuration(25);
          setBreakDuration(5);
          setLongBreakDuration(15);
        }
      } catch (error) {
        console.error('Error loading preferences for Pomodoro:', error)
        setWorkDuration(25);
        setBreakDuration(5);
        setLongBreakDuration(15);
      }
    }

    loadUserPreferences()
  }, [user])


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        instructionsRef.current && 
        !instructionsRef.current.contains(event.target as Node) &&
        questionButtonRef.current &&
        !questionButtonRef.current.contains(event.target as Node)
      ) {
        setShowInstructions(false)
      }
    }

    if (showInstructions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showInstructions])

  const getInstructionsPosition = () => {
    if (!questionButtonRef.current) return { top: '50%', left: '50%' }

    const rect = questionButtonRef.current.getBoundingClientRect()
    return {
      top: `${rect.bottom + 10}px`,
      right: `${window.innerWidth - rect.right}px`,
      transform: 'none'
    }
  }

  // --- UPDATED: Icon style
  const iconSpanStyle = { 
    display: 'inline-block', 
    verticalAlign: 'middle', 
    marginRight: '8px' 
  }

  return (
    <div 
      className="page-container"
      style={{
        backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        minHeight: 'calc(100vh - 140px)', // 80px nav + 60px header
        paddingTop: '0',
        paddingBottom: '0'
      }}
    >
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <PomodoroTimer />
        
        <button
          ref={questionButtonRef}
          onClick={() => setShowInstructions(!showInstructions)}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
            color: theme === 'dark' ? '#d1d5db' : '#4b5563',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          title="How it works"
        >
          {/* --- UPDATED --- */}
          <HelpCircle size={18} />
        </button>
      </div>
      
      {showInstructions && (
        <div
          ref={instructionsRef}
          style={{
            position: 'fixed',
            ...getInstructionsPosition(),
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            maxWidth: '300px',
            width: '90%',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <h3 style={{ 
            color: theme === 'dark' ? '#d1d5db' : '#374151', 
            marginBottom: '12px',
            fontSize: '16px'
          }}>
            {/* --- UPDATED --- */}
            <span style={iconSpanStyle}><Timer size={16} /></span>
            Your Pomodoro
          </h3>
          <div style={{ 
            color: theme === 'dark' ? '#9ca3af' : '#6b7280', 
            lineHeight: '1.5',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {workDuration === null ? (
              <p>Loading your preferences...</p>
            ) : (
              <>
                <p style={{ margin: '6px 0' }}>
                  <strong>{workDuration} minutes</strong> focused work
                </p>
                <p style={{ margin: '6px 0' }}>
                  <strong>{breakDuration} minutes</strong> short break
                </p>
                <p style={{ margin: '6px 0' }}>
                  <strong>{longBreakDuration} minutes</strong> long break after 4 sessions
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => setShowInstructions(false)}
            style={{
              padding: '8px 16px',
              backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
              color: theme === 'dark' ? '#d1d5db' : '#4b5563',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            Close
          </button>
        </div>
      )}
      
      <Navbar />
    </div>
  )
}