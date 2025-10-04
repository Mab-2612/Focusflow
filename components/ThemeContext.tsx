"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system'
  resolvedTheme: 'light' | 'dark'
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system')
  const [mounted, setMounted] = useState(false)

  // Get system theme
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme

  useEffect(() => {
    setMounted(true)
    
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system'
    setThemeState(savedTheme)
    
    // Load from Supabase if user is logged in
    loadThemeFromSupabase()
  }, [user])

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
      
      // Update meta theme color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#111827' : '#ffffff')
      }
    }
  }, [resolvedTheme, mounted])

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    saveThemeToSupabase(newTheme)
  }

  const toggleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['system', 'light', 'dark']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const loadThemeFromSupabase = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single()

      if (data && data.preferences?.theme) {
        setThemeState(data.preferences.theme)
        localStorage.setItem('theme', data.preferences.theme)
      }
    } catch (error) {
      console.error('Error loading theme from Supabase:', error)
    }
  }

  const saveThemeToSupabase = async (newTheme: 'light' | 'dark' | 'system') => {
    if (!user) return
    
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferences: {
            theme: newTheme,
            dark_mode: resolvedTheme === 'dark'
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
    } catch (error) {
      console.error('Error saving theme to Supabase:', error)
    }
  }

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      document.documentElement.classList.toggle('dark', getSystemTheme() === 'dark')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}