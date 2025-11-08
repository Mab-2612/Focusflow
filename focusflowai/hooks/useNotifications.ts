//hooks/useNotifications.ts
"use client"

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/lib/store'

export const useNotifications = () => {
  const { user } = useAuth()
  const { isOnline } = useAppStore()

  useEffect(() => {
    if (!user || !isOnline) return

    // Subscribe to task notifications
    const taskNotification = supabase
      .channel('task-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          showNotification('Task updated', `Task ${getActionText(payload.eventType)}`);
        }
      )
      .subscribe()

    return () => {
      taskNotification.unsubscribe()
    }
  }, [user, isOnline])

  const showNotification = (title: string, message: string) => {
    // Check if browser notifications are supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message })
    }
    
    // Also show in-app notification
    console.log(`Notification: ${title} - ${message}`)
    // You can implement a toast notification system here
  }

  const getActionText = (eventType: string) => {
    switch (eventType) {
      case 'INSERT': return 'created'
      case 'UPDATE': return 'updated'
      case 'DELETE': return 'deleted'
      default: return 'modified'
    }
  }
}