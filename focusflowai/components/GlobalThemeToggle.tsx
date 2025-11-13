// components/GlobalThemeToggle.tsx
"use client"

import { useState, useEffect } from 'react'
import { useTheme } from "@/components/ThemeContext" // This path should be correct now
import { Moon, Sun } from 'lucide-react'

export default function GlobalThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  
  // --- FIX: Add a state to check if the component is mounted ---
  const [isClient, setIsClient] = useState(false)

  // On mount, set isClient to true
  useEffect(() => {
    setIsClient(true)
  }, [])

  const isDark = theme === 'dark'
  const themeIcon = isDark ? <Moon size={20} /> : <Sun size={20} />

  // This style prevents the layout from "jumping" when the icon loads
  const iconWrapperStyle = {
    width: '20px',
    height: '20px',
    display: 'inline-block' // Ensures it lines up like the span
  }

  return (
    <div className="sidebar-theme-toggle">
      <span style={{
        fontSize: 'var(--font-sm)',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* --- FIX: Only render the icon on the client --- */}
        <span style={iconWrapperStyle}>
          {isClient ? themeIcon : null}
        </span>
        Dark Mode
      </span>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={isDark}
          onChange={toggleTheme}
          // Only enable the toggle once the client is loaded
          disabled={!isClient}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
  )
}