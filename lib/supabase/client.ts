//lib/supabase/client.ts
// import { createBrowserClient } from '@supabase/ssr'

// Use a singleton pattern to prevent multiple instances
// let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

// export function createClient() {
//   if (supabaseClient) {
//     return supabaseClient
//   }
  
//   supabaseClient = createBrowserClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//   )
  
//   return supabaseClient
// }

// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        headers: {
          'X-Client-Info': 'focusflow-app'
        }
      },
      // Suppress verbose logs
      logger: {
        log: () => {},
        error: console.error,
      }
    }
  )
}