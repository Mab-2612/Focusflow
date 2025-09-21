"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    const getInitialSession = async () => {
      try {
        setLoading(true)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setError(sessionError.message)
          setUser(null)
        } else {
          setUser(session?.user ?? null)
          setError(null)
        }
      } catch (err) {
        setError('Failed to initialize authentication')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading, error }
}