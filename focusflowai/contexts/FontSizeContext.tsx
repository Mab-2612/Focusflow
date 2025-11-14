// contexts/FontSizeContext.tsx
"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'

// Define the available font sizes
type FontSize = 'small' | 'default' | 'large'

interface FontSizeContextType {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined)

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [fontSize, setFontSizeState] = useState<FontSize>('default')
  const [mounted, setMounted] = useState(false)

  // On mount, load from localStorage for immediate effect
  useEffect(() => {
    setMounted(true)
    try {
      const savedSize = localStorage.getItem('fontSize') as FontSize
      if (savedSize && ['small', 'default', 'large'].includes(savedSize)) {
        setFontSizeState(savedSize)
      }
    } catch (e) {
      console.error('Error loading fontSize:', e)
    }
  }, [])

  // When user logs in, load their preference from Supabase
  useEffect(() => {
    if (user) {
      loadSizeFromSupabase()
    }
  }, [user])

  // When fontSize changes, apply it to the <html> tag
  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-font-size', fontSize)
    }
  }, [fontSize, mounted])

  const setFontSize = (newSize: FontSize) => {
    setFontSizeState(newSize)
    localStorage.setItem('fontSize', newSize)
    if (user) {
      saveSizeToSupabase(newSize)
    }
  }

  const loadSizeFromSupabase = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single()

      if (data?.preferences?.fontSize) {
        const dbSize = data.preferences.fontSize as FontSize
        if (['small', 'default', 'large'].includes(dbSize)) {
          setFontSizeState(dbSize)
          localStorage.setItem('fontSize', dbSize)
        }
      }
    } catch (error) {
      console.debug('Font size preferences not loaded:', error)
    }
  }

  const saveSizeToSupabase = async (newSize: FontSize) => {
    if (!user) return
    try {
      // First, get existing prefs
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no row
        throw error
      }
      
      const existingPrefs = data?.preferences || {}
      
      // Upsert new font size
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferences: {
            ...existingPrefs,
            fontSize: newSize
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
    } catch (error) {
      console.error('Error saving font size:', error)
    }
  }

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  )
}

export function useFontSize() {
  const context = useContext(FontSizeContext)
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider')
  }
  return context
}