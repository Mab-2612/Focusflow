// components/ui/card.tsx
"use client"

import { useTheme } from '@/components/ThemeContext'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export const Card = ({ children, className = '' }: CardProps) => {
  const { theme } = useTheme()
  
  return (
    <div style={{
      backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
      borderRadius: '12px',
      border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }} className={className}>
      {children}
    </div>
  )
}

export const CardHeader = ({ children, className = '' }: CardProps) => {
  return (
    <div style={{ marginBottom: '16px' }} className={className}>
      {children}
    </div>
  )
}

export const CardTitle = ({ children, className = '' }: CardProps) => {
  const { theme } = useTheme()
  
  return (
    <h3 style={{
      fontSize: '18px',
      fontWeight: '600',
      color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
      margin: '0'
    }} className={className}>
      {children}
    </h3>
  )
}

export const CardContent = ({ children, className = '' }: CardProps) => {
  return (
    <div className={className}>
      {children}
    </div>
  )
}