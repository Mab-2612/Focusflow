"use client"

import { useState, useEffect } from 'react'
import { useGlobalVoice } from '@/hooks/useGlobalVoice'
import { useTheme } from '@/components/ThemeContext'
import { useAuth } from '@/hooks/useAuth'

export default function GlobalVoiceAssistant() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const { isVoiceActive, isAwake, activateVoice, deactivateVoice, transcript } = useGlobalVoice()
  const [isVisible, setIsVisible] = useState(false)

  // Only show after user is logged in and page is loaded
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 3000) // Show after 3 seconds

      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [user])

  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '100px',
      right: '20px',
      zIndex: 1000
    }}>
      {/* Voice activation button */}
      <button
        onClick={isVoiceActive ? deactivateVoice : activateVoice}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: isAwake ? '#10b981' : isVoiceActive ? '#ef4444' : '#3b82f6',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease',
          animation: isAwake ? 'pulse 2s infinite' : 'none'
        }}
        title={isVoiceActive ? 'Stop listening' : 'Start voice assistant'}
      >
        {isAwake ? '🎯' : isVoiceActive ? '🔴' : '🎤'}
      </button>

      {/* Voice status indicator */}
      {(isVoiceActive || isAwake) && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          right: '0',
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          padding: '12px',
          borderRadius: '12px',
          border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
          minWidth: '200px',
          fontSize: '14px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            {isAwake ? '🟢 Awake & Listening' : '🔴 Listening...'}
          </div>
          {transcript && (
            <div style={{ color: theme === 'dark' ? '#d1d5db' : '#6b7280' }}>
              You said: "{transcript}"
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}