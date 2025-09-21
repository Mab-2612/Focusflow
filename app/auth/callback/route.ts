import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle authentication errors
  if (error) {
    console.error('Auth error:', error, errorDescription)
    return NextResponse.redirect(new URL('/onboarding?error=auth_failed', request.url))
  }

  if (code) {
    try {
      const supabase = createClient()
      const { error: supabaseError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (supabaseError) {
        console.error('Supabase auth error:', supabaseError)
        return NextResponse.redirect(new URL('/onboarding?error=auth_failed', request.url))
      }
      
      // Successful authentication
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch (error) {
      console.error('Unexpected auth error:', error)
      return NextResponse.redirect(new URL('/onboarding?error=unexpected', request.url))
    }
  }

  // No code provided, redirect to onboarding
  return NextResponse.redirect(new URL('/onboarding', request.url))
}