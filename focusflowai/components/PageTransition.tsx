//components/PageTransition.tsx
"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [transitionStage, setTransitionStage] = useState('fadeIn')

  useEffect(() => {
    if (children !== displayChildren) {
      setTransitionStage('fadeOut')
    }
  }, [children, displayChildren])

  useEffect(() => {
    if (transitionStage === 'fadeOut') {
      const timer = setTimeout(() => {
        setDisplayChildren(children)
        setTransitionStage('fadeIn')
      }, 150) // Short transition duration

      return () => clearTimeout(timer)
    }
  }, [transitionStage, children])

  return (
    <div
      style={{
        opacity: transitionStage === 'fadeIn' ? 1 : 0,
        transition: 'opacity 0.15s ease-in-out',
        minHeight: '100vh'
      }}
    >
      {displayChildren}
    </div>
  )
}