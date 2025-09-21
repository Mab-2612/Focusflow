//app/pomodoro/page.tsx
"use client"

import PomodoroTimer from '@/components/PomodoroTimer'
import Navbar from '@/components/Navbar'
import { useTheme } from '@/components/ThemeContext'
import { useState, useEffect, useRef } from 'react'

export default function PomodoroPage() {
  const { theme } = useTheme()
  const [showInstructions, setShowInstructions] = useState(false)
  const instructionsRef = useRef<HTMLDivElement>(null)
  const questionButtonRef = useRef<HTMLButtonElement>(null)

  // Close instructions when clicking outside
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

  // Calculate position for instructions popover
  const getInstructionsPosition = () => {
    if (!questionButtonRef.current) return { top: '50%', left: '50%' }

    const rect = questionButtonRef.current.getBoundingClientRect()
    return {
      top: `${rect.bottom + 10}px`,
      right: `${window.innerWidth - rect.right}px`,
      transform: 'none'
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
      padding: '24px',
      paddingBottom: '120px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        marginBottom: '40px',
        color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
        fontWeight: '600',
        textAlign: 'center'
      }}>
        Pomodoro Timer
      </h1>
      
      {/* Timer Container with Question Mark */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <PomodoroTimer />
        
        {/* Minimal Question Mark Button - INSIDE timer container */}
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
          ?
        </button>
      </div>
      
      {/* Instructions Popover */}
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
            🍅 Pomodoro Technique
          </h3>
          <div style={{ 
            color: theme === 'dark' ? '#9ca3af' : '#6b7280', 
            lineHeight: '1.5',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            <p style={{ margin: '6px 0' }}>
              <strong>25 minutes</strong> focused work
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>5 minutes</strong> short break
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>15 minutes</strong> long break after 4 sessions
            </p>
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