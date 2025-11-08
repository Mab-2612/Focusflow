//hooks/useAnalyticsRealtime.ts
"use client"

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useAnalyticsStore } from '@/lib/analyticsStore'

export const useAnalyticsRealtime = () => {
  const { user } = useAuth()
  const { addFocusSession, updateDailyStats } = useAnalyticsStore()

  useEffect(() => {
    if (!user) return

    // Subscribe to focus sessions
    const focusSubscription = supabase
      .channel('focus-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'focus_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const session = payload.new
          addFocusSession(session)
          
          // Update daily stats
          const date = new Date(session.created_at).toISOString().split('T')[0]
          updateDailyStats(date, session.duration, session.completed_tasks)
        }
      )
      .subscribe()

    return () => {
      focusSubscription.unsubscribe()
    }
  }, [user, addFocusSession, updateDailyStats])
}