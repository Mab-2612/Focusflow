// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
  }

  try {
    const supabase = createServerSideClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(new URL('/onboarding?error=auth_failed', requestUrl.origin))
    }
    
    return NextResponse.redirect(new URL('/dashboard', 'https://focusflow-flax-two.vercel.app'))
  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return NextResponse.redirect(new URL('/onboarding?error=unexpected', requestUrl.origin))
  }
}