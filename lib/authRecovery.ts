// lib/authRecovery.ts
import { supabase } from './supabaseClient'

let refreshAttempts = 0
const MAX_REFRESH_ATTEMPTS = 3

export const recoverAuthSession = async () => {
  if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
    console.log('Max refresh attempts reached, signing out')
    await supabase.auth.signOut()
    refreshAttempts = 0
    return false
  }

  try {
    refreshAttempts++
    console.log(`Attempting auth recovery (attempt ${refreshAttempts})`)
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }
    
    if (session) {
      console.log('Auth recovery successful')
      refreshAttempts = 0
      return true
    }
    
    return false
  } catch (error) {
    console.error('Auth recovery failed:', error)
    return false
  }
}

// Call this when you detect auth errors
export const handleAuthError = async (error: any) => {
  if (error?.message?.includes('refresh') || error?.message?.includes('token')) {
    return await recoverAuthSession()
  }
  return false
}