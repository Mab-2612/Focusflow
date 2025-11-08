"use client"

import { useTheme } from '@/components/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'

export default function GlobalThemeToggle() {
  // FIXED: Removed 'theme' and 'toggleTheme', using 'resolvedTheme' and 'setTheme'
  const { resolvedTheme, setTheme } = useTheme()
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

  // FIXED: Simplified icon and label logic
  const isDark = resolvedTheme === 'dark'
  const nextTheme = isDark ? 'light' : 'dark'
  const icon = isDark ? '🌙' : '☀️'

  if (!isVisible) return null

  return (
    <button
      onClick={() => setTheme(nextTheme)} // FIXED: Directly set the next theme
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        padding: '10px', // Reduced padding
        backgroundColor: resolvedTheme === 'dark' ? '#374151' : '#f3f4f6',
        color: resolvedTheme === 'dark' ? '#f3f4f6' : '#374151',
        border: `1px solid ${resolvedTheme === 'dark' ? '#4b5563' : '#d1d5db'}`,
        borderRadius: '50%', // Make it circular
        cursor: 'pointer',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        transition: 'all 0.3s ease',
        width: '44px', // Compact size
        height: '44px' // Compact size
      }}
      title={`Switch to ${nextTheme} mode`}
    >
      {/* Icon only, label removed */}
      <span>{icon}</span>
    </button>
  )
}