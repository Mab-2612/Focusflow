//hooks/useNetworkStatus.ts
"use client"

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

export const useNetworkStatus = () => {
  const setOnlineStatus = useAppStore(state => state.setOnlineStatus)

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true)
    const handleOffline = () => setOnlineStatus(false)

    // Set initial status
    setOnlineStatus(navigator.onLine)

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnlineStatus])
}