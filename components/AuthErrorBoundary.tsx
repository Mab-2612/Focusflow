//components/AuthErrorBoundary.tsx
"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface AuthErrorBoundaryProps {
  children: React.ReactNode
}

export default function AuthErrorBoundary({ children }: AuthErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleAuthError = (error: any) => {
      console.error('Auth error caught:', error)
      
      // Don't set error for token refresh issues
      if (error?.message?.includes('refresh') || error?.message?.includes('token')) {
        return
      }
      
      setHasError(true)
    }

    // Listen for auth errors
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          setHasError(false) // Reset error on successful refresh
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (hasError) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        margin: '20px'
      }}>
        <h3 style={{ color: '#dc2626', marginBottom: '10px' }}>Authentication Error</h3>
        <p style={{ color: '#7f1d1d', marginBottom: '15px' }}>
          There was an issue with your authentication. Please try signing in again.
        </p>
        <button
          onClick={() => {
            supabase.auth.signOut()
            window.location.reload()
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Sign Out & Retry
        </button>
      </div>
    )
  }

  return <>{children}</>
}