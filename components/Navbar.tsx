"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import AddTaskModal from './AddTaskModal'

interface NavbarProps {
  onTaskAdded?: () => void
}

export default function Navbar({ onTaskAdded }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isAddHovered, setIsAddHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const navItems = [
    { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/pomodoro', icon: '⏰', label: 'Pomodoro' },
    { href: '/calm-mode', icon: '🧘', label: 'Calm Mode' },
    { href: '/voice-assistant', icon: '🎤', label: 'Voice Assistant' },
    { href: '/profile', icon: '👤', label: 'Profile' },
  ]

  // Optimized navigation with prefetching
  const handleNavigation = (href: string) => {
    router.prefetch(href)
    router.push(href)
  }

  const navStyle = {
    position: 'fixed' as const,
    bottom: isMobile ? '16px' : '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#ffffff',
    borderRadius: isMobile ? '14px' : '16px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    padding: isMobile ? '6px' : '8px',
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '16px' : '24px',
    zIndex: 10,
    transition: 'all 0.3s ease'
  }

  const getNavItemStyle = (isActive: boolean, itemHref: string) => {
    const isHovered = hoveredItem === itemHref;
    return {
      padding: isMobile ? '10px' : '12px',
      borderRadius: isMobile ? '10px' : '12px',
      backgroundColor: isActive ? '#dbeafe' : isHovered ? '#f3f4f6' : 'transparent',
      color: isActive ? '#2563eb' : '#4b5563',
      textDecoration: 'none',
      fontSize: isMobile ? '20px' : '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: isMobile ? '40px' : '48px',
      height: isMobile ? '40px' : '48px',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)'
    }
  }

  const addButtonStyle = {
    padding: isMobile ? '10px' : '12px',
    backgroundColor: isAddHovered ? '#1d4ed8' : '#2563eb',
    color: 'white',
    borderRadius: isMobile ? '10px' : '12px',
    border: 'none',
    cursor: 'pointer',
    fontSize: isMobile ? '20px' : '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: isMobile ? '40px' : '48px',
    height: isMobile ? '40px' : '48px',
    transition: 'all 0.2s ease',
    transform: isAddHovered ? 'scale(1.1)' : 'scale(1)'
  }

  return (
    <>
      <nav style={navStyle}>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <div
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              style={getNavItemStyle(isActive, item.href)}
              title={item.label}
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {item.icon}
            </div>
          )
        })}
        
        <button
          onClick={() => setIsModalOpen(true)}
          style={addButtonStyle}
          title="Add Task"
          onMouseEnter={() => setIsAddHovered(true)}
          onMouseLeave={() => setIsAddHovered(false)}
        >
          +
        </button>
      </nav>

      <AddTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onTaskAdded={() => {
          if (onTaskAdded) {
            onTaskAdded()
          }
        }}
      />
    </>
  )
}