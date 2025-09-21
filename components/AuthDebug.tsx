"use client"

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

export default function AuthDebug() {
  const { user, loading } = useAuth()

  useEffect(() => {
    // Log auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event, session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (process.env.NODE_ENV === 'production') {
    return null // Hide in production
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 1000
    }}>
      <div>Auth State: {loading ? 'Loading...' : user ? 'Logged in' : 'Logged out'}</div>
      <div>User: {user?.email}</div>
    </div>
  )
}