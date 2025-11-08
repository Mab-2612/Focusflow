"use client"

import { useEffect, useState } from 'react'

export const useMobileLayout = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      setIsMobile(width <= 768)
      setIsTablet(width > 768 && width <= 1024)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  return { isMobile, isTablet }
}

// Mobile-optimized container component
export const MobileContainer = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { isMobile } = useMobileLayout()
  
  return (
    <div 
      className={className}
      style={{
        padding: isMobile ? '16px' : '24px',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}
    >
      {children}
    </div>
  )
}