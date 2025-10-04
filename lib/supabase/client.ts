import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: {
        getItem: (key) => {
          if (typeof window === 'undefined') return null
          return localStorage.getItem(key)
        },
        setItem: (key, value) => {
          if (typeof window === 'undefined') return
          localStorage.setItem(key, value)
        },
        removeItem: (key) => {
          if (typeof window === 'undefined') return
          localStorage.removeItem(key)
        }
      }
    }
  }
)

// Enhanced session helper
export const ensureSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Session error:', error)
      // Try to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError) throw refreshError
      return refreshedSession
    }
    
    return session
  } catch (error) {
    console.error('Session ensure failed:', error)
    return null
  }
}