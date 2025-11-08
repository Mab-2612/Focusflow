// components/GlobalThemeToggle.tsx
"use client"

import { useTheme } from '@/components/ThemeContext'
import { useAuth } from '@/hooks/useAuth'

export default function GlobalThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const { user } = useAuth()
  
  // Directly get theme state
  const isDark = resolvedTheme === 'dark'
  const nextTheme = isDark ? 'light' : 'dark'
  const icon = isDark ? '🌙' : '☀️'

  // Only show if the user is logged in
  if (!user) return null

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '8px', 
        
        // FIXED: Use primary background and light border to blend in
        backgroundColor: 'var(--bg-primary)',
        border: `1px solid var(--border-light)`,
        
        color: resolvedTheme === 'dark' ? '#f3f4f6' : '#374151',
        borderRadius: '50%', // Circular
        cursor: 'pointer',
        fontSize: '20px', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        transition: 'all 0.3s ease',
        width: '40px', // Compact size
        height: '40px' // Compact size
      }}
      title={`Switch to ${nextTheme} mode`}
    >
      <span>{icon}</span>
    </button>
  )
}