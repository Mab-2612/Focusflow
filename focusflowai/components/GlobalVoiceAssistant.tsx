// components/GlobalVoiceAssistant.tsx
"use client"

import { useState, useEffect } from 'react'
// import { useGlobalVoice } from '@/hooks/useGlobalVoice' // This hook was not provided, assuming it exists
import { useTheme } from '@/components/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { Mic, Zap, Target } from 'lucide-react' // <-- IMPORT ICONS

// --- MOCK HOOK since useGlobalVoice was not in context ---
const useGlobalVoice = () => {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [transcript, setTranscript] = useState("");

  const activateVoice = () => {
    setIsVoiceActive(true);
    setIsAwake(true); // Mock: auto-awake for demo
    setTranscript("Listening...");
    setTimeout(() => {
      setTranscript("You said: Hello there!");
      setTimeout(() => setIsAwake(false), 2000);
    }, 2000);
  };
  const deactivateVoice = () => {
    setIsVoiceActive(false);
    setIsAwake(false);
    setTranscript("");
  };

  return { isVoiceActive, isAwake, activateVoice, deactivateVoice, transcript };
}
// --- END MOCK HOOK ---

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

  // --- UPDATED: Icon styles
  const iconSpanStyle = (color: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    color: color,
    marginRight: '6px'
  });

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
          animation: isAwake ? 'pulse 2s infinite' : 'none',
          display: 'flex', // <-- ADDED
          alignItems: 'center', // <-- ADDED
          justifyContent: 'center' // <-- ADDED
        }}
        title={isVoiceActive ? 'Stop listening' : 'Start voice assistant'}
      >
        {/* --- UPDATED --- */}
        {isAwake ? <Target size={24} /> : isVoiceActive ? <Zap size={24} /> : <Mic size={24} />}
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
          <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            {/* --- UPDATED --- */}
            {isAwake ? (
              <span style={iconSpanStyle('#10b981')}><Target size={16} /></span>
            ) : (
              <span style={iconSpanStyle('#ef4444')}><Zap size={16} /></span>
            )}
            {isAwake ? 'Awake & Listening' : 'Listening...'}
          </div>
          {transcript && (
            <div style={{ color: theme === 'dark' ? '#d1d5db' : '#6b7280' }}>
              {transcript}
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