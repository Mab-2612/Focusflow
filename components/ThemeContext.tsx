"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'

interface ThemeContextType {
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load theme from localStorage first
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light'
    setTheme(savedTheme)
    
    // Then try to load from Supabase if user is logged in
    loadThemeFromSupabase()
  }, [user])

  const loadThemeFromSupabase = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single()

      if (data && data.preferences?.dark_mode !== undefined) {
        const themePreference = data.preferences.dark_mode ? 'dark' : 'light'
        setTheme(themePreference)
        localStorage.setItem('theme', themePreference)
      }
    } catch (error) {
      console.error('Error loading theme from Supabase:', error)
    }
  }

  const saveThemeToSupabase = async (newTheme: 'light' | 'dark') => {
    if (!user) return
    
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferences: {
            dark_mode: newTheme === 'dark'
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
    } catch (error) {
      console.error('Error saving theme to Supabase:', error)
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    
    // Save to Supabase
    saveThemeToSupabase(newTheme)
  }

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  }, [theme, mounted])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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