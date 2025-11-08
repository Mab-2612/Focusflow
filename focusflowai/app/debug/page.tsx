"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export default function DebugPage() {
  const { user, loading } = useAuth()
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [envVars, setEnvVars] = useState<any>({})

  useEffect(() => {
    // Check environment variables (client-side accessible ones)
    setEnvVars({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      currentHost: window.location.host
    })

    // Check current session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSessionInfo(session)
    }
    
    checkSession()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Info</h1>
      
      <h2>Auth State</h2>
      <pre>
        User: {JSON.stringify(user, null, 2)}
        Loading: {loading}
      </pre>

      <h2>Session Info</h2>
      <pre>{JSON.stringify(sessionInfo, null, 2)}</pre>

      <h2>Environment Variables</h2>
      <pre>{JSON.stringify(envVars, null, 2)}</pre>

      <h2>Local Storage</h2>
      <pre>
        {Object.entries(localStorage)
          .filter(([key]) => key.includes('supabase') || key.includes('auth'))
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')}
      </pre>

      <button onClick={() => {
        supabase.auth.signOut()
        window.location.reload()
      }}>
        Sign Out & Refresh
      </button>
    </div>
  )
}