//hooks/useRealtime.ts
"use client"

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { handleTaskChange, handleCategoryChange } from '@/services/taskService'

export const useRealtime = () => {
  const { user } = useAuth()
  const { setTasks, setCategories, isOnline } = useAppStore()

  useEffect(() => {
    if (!user || !isOnline) return

    // Subscribe to tasks changes
    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleTaskChange(payload)
        }
      )
      .subscribe()

    // Subscribe to categories changes
    const categoriesSubscription = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_categories',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleCategoryChange(payload)
        }
      )
      .subscribe()

    return () => {
      tasksSubscription.unsubscribe()
      categoriesSubscription.unsubscribe()
    }
  }, [user, isOnline, setTasks, setCategories])
}