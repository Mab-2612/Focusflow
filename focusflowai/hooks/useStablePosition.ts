//hooks/useStablePosition.ts
"use client"

import { useState, useEffect } from 'react'

export const useStablePosition = (ref: React.RefObject<HTMLElement>, isOpen: boolean) => {
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 10,
        left: rect.left + window.scrollX
      })
    }
  }, [isOpen, ref])

  return position
}