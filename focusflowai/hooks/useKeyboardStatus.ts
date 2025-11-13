// hooks/useKeyboardStatus.ts
"use client"

import { useState, useEffect } from 'react'

export const useKeyboardStatus = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    // This effect should only run on the client
    if (typeof window === 'undefined') {
      return
    }

    // We'll use the Visual Viewport API, which is designed for this.
    const visualViewport = window.visualViewport
    if (!visualViewport) {
      // Fallback or just return for browsers that don't support it
      return
    }

    // Store the "at-rest" height of the window.
    // We use innerHeight as the stable "full" height.
    const fullHeight = window.innerHeight

    const handleResize = () => {
      // If the visual viewport height is less than 90% of the
      // full window height, we assume the keyboard is open.
      const isKeyboardVisible = visualViewport.height < fullHeight * 0.9
      setIsKeyboardOpen(isKeyboardVisible)
    }

    visualViewport.addEventListener('resize', handleResize)
    return () => visualViewport.removeEventListener('resize', handleResize)

  }, [])

  return { isKeyboardOpen }
}