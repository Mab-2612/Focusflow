// components/ClientLayout.tsx
"use client"

import { useEffect } from 'react'
import { processRecurringTasks } from '@/lib/recurringTaskProcessor'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Process recurring tasks once per day
    const checkRecurringTasks = () => {
      const lastProcessed = localStorage.getItem('lastRecurringTaskCheck')
      const today = new Date().toDateString()
      
      if (lastProcessed !== today) {
        processRecurringTasks()
        localStorage.setItem('lastRecurringTaskCheck', today)
      }
    }
    
    checkRecurringTasks()
  }, [])

  return <>{children}</>
}