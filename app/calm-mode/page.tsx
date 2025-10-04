//app/calm-mode/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { Howl } from 'howler'
import Navbar from '@/components/Navbar'
import { useTheme } from '@/components/ThemeContext'

export default function CalmModePage() {
  const { theme } = useTheme()
  
  const [isBreathing, setIsBreathing] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [breathPhase, setBreathPhase] = useState<'in' | 'out' | 'idle'>('idle')
  const [currentAffirmation, setCurrentAffirmation] = useState('')
  const [breathInSound, setBreathInSound] = useState<Howl | null>(null)
  const [breathOutSound, setBreathOutSound] = useState<Howl | null>(null)
  const [countdown, setCountdown] = useState<number>(0)

  const affirmations = [
    "With each breath, I release tension and welcome peace into my mind and body.",
    "I am calm, centered, and fully present in this moment.",
    "My mind is clear, my body is relaxed, and my spirit is at peace.",
    "I breathe in positivity and breathe out negativity.",
    "I am in control of my thoughts and emotions.",
    "Every breath brings me closer to inner peace and clarity.",
    "I release all stress and embrace tranquility.",
    "I am grounded, focused, and at ease with myself.",
    "My breath is my anchor to the present moment.",
    "I welcome serenity and let go of all worries.",
    "I am surrounded by peace and filled with calm energy.",
    "With each exhale, I release what no longer serves me.",
    "I am connected to the rhythm of my breath and the peace within.",
    "My mind is still, my heart is open, and my soul is tranquil.",
    "I choose peace over stress and calm over chaos."
  ]

  // Random affirmation on mount
  useEffect(() => {
    setCurrentAffirmation(affirmations[Math.floor(Math.random() * affirmations.length)])
  }, [])

  // Preload breathing sounds
  useEffect(() => {
    const inSound = new Howl({
      src: ['/audio/breathe-in.mp3'],
      volume: 0.9,
      preload: true
    })
    const outSound = new Howl({
      src: ['/audio/breathe-out.mp3'],
      volume: 0.9,
      preload: true
    })

    setBreathInSound(inSound)
    setBreathOutSound(outSound)

    return () => {
      inSound.unload()
      outSound.unload()
    }
  }, [])

  // Handle start/stop breathing
  const handleBreathingToggle = () => {
    if (isBreathing) {
      setIsBreathing(false)
      setIsStarting(false)
      setCountdown(0)
      setBreathPhase('idle')
    } else {
      setIsStarting(true)
      setCountdown(3)
      
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            setIsStarting(false)
            setIsBreathing(true)
            setBreathPhase('in')
            breathInSound?.play()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  // Breathing cycle
  useEffect(() => {
    let breathInterval: NodeJS.Timeout

    if (isBreathing) {
      breathInterval = setInterval(() => {
        setBreathPhase(prev => {
          const newPhase = prev === 'in' ? 'out' : 'in'
          if (newPhase === 'in') {
            breathInSound?.play()
          } else {
            breathOutSound?.play()
          }
          return newPhase
        })
      }, 4000)
    }

    return () => clearInterval(breathInterval)
  }, [isBreathing, breathInSound, breathOutSound])

  const containerStyle = {
    minHeight: '100vh',
    maxHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
    padding: '24px',
    paddingBottom: '120px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'flex-start',
    transition: 'background-color 0.3s ease'
  }

  const breathingCircleStyle = {
    width: '220px',
    height: '220px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '32px',
    marginTop: '20px',
    transition: 'all 4s ease-in-out',
    transform:
      breathPhase === 'in'
        ? 'scale(0.85)'
        : breathPhase === 'out'
        ? 'scale(1.0)'
        : 'scale(0.95)',
    backgroundColor:
      breathPhase === 'in'
        ? '#3b82f6'
        : breathPhase === 'out'
        ? '#06b6d4'
        : isStarting ? '#9ca3af' : '#3b82f6',
    boxShadow:
      breathPhase === 'in'
        ? '0 0 30px rgba(59, 130, 246, 0.6)'
        : breathPhase === 'out'
        ? '0 0 30px rgba(6, 182, 212, 0.6)'
        : '0 0 15px rgba(156, 163, 175, 0.4)'
  }

  const buttonStyle = {
    padding: '12px 24px',
    backgroundColor: isStarting ? '#9ca3af' : (isBreathing ? '#ef4444' : '#3b82f6'),
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: isStarting ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    marginBottom: '32px',
    transition: 'all 0.2s ease',
    opacity: isStarting ? 0.8 : 1
  }

  const affirmationCardStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center' as const,
    maxWidth: '400px',
    width: '100%',
    marginBottom: '32px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb'
  }

  const titleStyle = {
    fontSize: '2rem',
    marginBottom: '32px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    fontWeight: '600',
    textAlign: 'center' as const,
    marginTop: '20px'
  }

  const countdownStyle = {
    fontSize: '3rem',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    fontWeight: 'bold',
    marginBottom: '20px'
  }

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Calm Mode</h1>

      <div style={breathingCircleStyle}>
        {isStarting ? (
          <span style={countdownStyle}>{countdown}</span>
        ) : breathPhase !== 'idle' ? (
          <span style={{ fontSize: '1.2rem', color: 'white', fontWeight: '500' }}>
            {breathPhase === 'in' ? 'Breathe In' : 'Breathe Out'}
          </span>
        ) : null}
      </div>

      <button 
        onClick={handleBreathingToggle} 
        style={buttonStyle}
        disabled={isStarting}
      >
        {isStarting ? 'Starting...' : (isBreathing ? 'Stop' : 'Start')}
      </button>

      <div style={affirmationCardStyle}>
        <h3 style={{ marginBottom: '16px', color: theme === 'dark' ? '#f3f4f6' : '#374151', fontSize: '1.1rem', fontWeight: '600' }}>
          🌟 Daily Affirmation
        </h3>
        <p style={{ color: theme === 'dark' ? '#d1d5db' : '#6b7280', fontStyle: 'italic', lineHeight: '1.6', margin: 0, minHeight: '60px' }}>
          {currentAffirmation}
        </p>
      </div>

      <Navbar />
    </div>
  )
}