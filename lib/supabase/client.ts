import { createBrowserClient } from '@supabase/ssr'

// Use a singleton pattern to prevent multiple instances
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (supabaseClient) {
    return supabaseClient
  }
  
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    throw new Error('Supabase client should only be used on the client side')
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  
  return supabaseClient
}

// Export a singleton instance for client-side use
export const supabase = createClient()