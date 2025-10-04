"use client"

import { useTheme } from '@/components/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'

export default function GlobalThemeToggle() {
  const { theme, resolvedTheme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)

  // Only show after user is logged in
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 3000) // Show after 3 seconds of being logged in

      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [user])

  const getThemeIcon = () => {
    if (theme === 'system') return '🌓'
    return resolvedTheme === 'dark' ? '🌙' : '☀️'
  }

  const getThemeLabel = () => {
    if (theme === 'system') return 'System'
    return resolvedTheme === 'dark' ? 'Dark' : 'Light'
  }

  if (!isVisible) return null

  return (
    <button
      onClick={toggleTheme}
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        padding: '10px 15px',
        backgroundColor: resolvedTheme === 'dark' ? '#374151' : '#f3f4f6',
        color: resolvedTheme === 'dark' ? '#f3f4f6' : '#374151',
        border: `1px solid ${resolvedTheme === 'dark' ? '#4b5563' : '#d1d5db'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 1000,
        transition: 'all 0.3s ease'
      }}
      title={`Theme: ${getThemeLabel()} (Click to cycle)`}
    >
      <span>{getThemeIcon()}</span>
      <span style={{ fontSize: '14px' }}>{getThemeLabel()}</span>
    </button>
  )
}