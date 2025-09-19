"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        setLoading(true)
        
        // First try to get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error getting session:', sessionError)
          setError(sessionError.message)
          setLoading(false)
          return
        }

        setUser(session?.user ?? null)
        
        // If no session, try to recover from localStorage
        if (!session) {
          const storedSession = localStorage.getItem('supabase.auth.token')
          if (storedSession) {
            try {
              const parsedSession = JSON.parse(storedSession)
              if (parsedSession?.currentSession?.user) {
                setUser(parsedSession.currentSession.user)
              }
            } catch (parseError) {
              console.error('Error parsing stored session:', parseError)
            }
          }
        }
        
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        setError('Failed to initialize authentication')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        setUser(session?.user ?? null)
        setLoading(false)
        
        if (event === 'SIGNED_OUT') {
          // Clear any stored data on sign out
          localStorage.removeItem('supabase.auth.token')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading, error }
}