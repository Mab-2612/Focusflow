// components/AuthGuard.tsx
"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Only check auth after initial load and when not loading
    if (!loading) {
      setIsChecking(false)
      
      // If no user and not on auth pages, redirect to onboarding
      if (!user && pathname !== '/onboarding' && pathname !== '/auth/callback' && !pathname.includes('/debug')) {
        console.log('No user, redirecting to onboarding')
        router.push('/onboarding')
      }
      
      // If user is logged in and on onboarding, redirect to dashboard
      if (user && pathname === '/onboarding') {
        console.log('User found, redirecting to dashboard')
        router.push('/dashboard')
      }
    }
  }, [user, loading, pathname, router])

  // Show loading spinner during initial check
  if (loading || isChecking) {
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
        <p>Loading...</p>
      </div>
    )
  }

  // Allow access to auth pages without user, and other pages with user
  const isAuthPage = pathname === '/onboarding' || pathname === '/auth/callback' || pathname.includes('/debug')
  
  if (!user && !isAuthPage) {
    return null // Will redirect to onboarding
  }

  return <>{children}</>
}