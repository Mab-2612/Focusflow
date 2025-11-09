// components/GlobalElementsLoader.tsx
"use client"

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'

export default function GlobalElementsLoader() {
  const { user, loading } = useAuth()
  const [elementsReady, setElementsReady] = useState(false)

  useEffect(() => {
    // Wait for auth to load and user to be determined
    if (!loading) {
      // FIXED: Removed the artificial 2-second delay
      // const timer = setTimeout(() => {
      //   setElementsReady(true)
      // }, user ? 2000 : 0)
      
      // return () => clearTimeout(timer)
      
      // Show elements immediately once auth is resolved
      setElementsReady(true)
    }
  }, [user, loading])

  if (loading || !elementsReady) {
    return null
  }

  return null // This component doesn't render anything, just controls timing
}