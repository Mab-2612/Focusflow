"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true)
      
      // First try to get the current session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (session) {
        // We have a session, allow access
        setIsChecking(false)
        return
      }
      
      // No session, check if we're already on onboarding page to avoid loop
      const currentPath = window.location.pathname
      if (currentPath !== '/onboarding' && currentPath !== '/auth/callback') {
        router.push('/onboarding')
      }
      
      setIsChecking(false)
    }

    // Only check if not already loading
    if (!loading) {
      checkAuth()
    }
  }, [user, loading, router])

  // Show loading spinner only if we're still checking
  if (isChecking || loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #f3f4f6',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p>Checking authentication...</p>
      </div>
    )
  }

  // If no user and we're not on onboarding, we'll be redirected by the useEffect
  if (!user && window.location.pathname !== '/onboarding') {
    return null // Will redirect to onboarding
  }

  return <>{children}</>
}