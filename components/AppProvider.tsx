//components/AppProvider.tsx
"use client"

import { useEffect } from 'react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useRealtime } from '@/hooks/useRealtime'
import { useAnalyticsRealtime } from '@/hooks/useAnalyticsRealtime'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { syncTasks } from '@/services/taskService'
import { useAnalyticsStore } from '@/lib/analyticsStore'
import { useAppStore } from '@/lib/store' // Add this import
import { setTaskChangeCallbacks } from '@/services/taskService' // Add this import
import { supabase } from '@/lib/supabase/client'

export default function AppProvider({ children }: { children: React.ReactNode }) {
  useNetworkStatus()
  useRealtime()
  useAnalyticsRealtime()
  useNotifications() // Add notifications
  const { user } = useAuth()
  const { calculateProductivityScore } = useAnalyticsStore()
  const { setTasks, setCategories } = useAppStore()

  // Initialize the callbacks
  useEffect(() => {
    setTaskChangeCallbacks({
      onTaskChange: (payload) => {
        const { tasks } = useAppStore.getState()
        // Handle task changes
        switch (payload.eventType) {
          case 'INSERT':
            setTasks([...tasks, payload.new])
            break
          case 'UPDATE':
            setTasks(tasks.map(task => 
              task.id === payload.new.id ? { ...task, ...payload.new } : task
            ))
            break
          case 'DELETE':
            setTasks(tasks.filter(task => task.id !== payload.old.id))
            break
        }
      },
      onCategoryChange: (payload) => {
        const { categories } = useAppStore.getState()
        // Handle category changes
        switch (payload.eventType) {
          case 'INSERT':
            setCategories([...categories, payload.new])
            break
          case 'UPDATE':
            setCategories(categories.map(category => 
              category.id === payload.new.id ? { ...category, ...payload.new } : category
            ))
            break
          case 'DELETE':
            setCategories(categories.filter(category => category.id !== payload.old.id))
            break
        }
      }
    })
  }, [setTasks, setCategories])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [])

  // Initial data sync
  useEffect(() => {
    if (user) {
      syncTasks(user.id)
      calculateProductivityScore()
    }
  }, [user, calculateProductivityScore])

  return <>{children}</>
}