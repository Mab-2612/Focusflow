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

  // Updated nav items with Planning page
  const navItems = [
    { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/pomodoro', icon: '⏰', label: 'Pomodoro' },
    { href: '/calm-mode', icon: '🧘', label: 'Calm Mode' },
    { href: '/chat', icon: '💬', label: 'Chat' }, // Changed from voice-assistant to chat
    { href: '/planning', icon: '📅', label: 'Planning' }, // Added planning page
    { href: '/profile', icon: '👤', label: 'Profile' },
  ]

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
    gap: isMobile ? '12px' : '16px',
    zIndex: 10,
  }

  const getNavItemStyle = (isActive: boolean) => ({
    padding: isMobile ? '10px' : '12px',
    borderRadius: isMobile ? '10px' : '12px',
    backgroundColor: isActive ? '#dbeafe' : 'transparent',
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
  })

  const addButtonStyle = {
    padding: isMobile ? '10px' : '12px',
    backgroundColor: '#2563eb',
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
  }

  return (
    <>
      <nav style={navStyle}>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <div
              key={item.href}
              onClick={() => router.push(item.href)}
              style={getNavItemStyle(isActive)}
              title={item.label}
            >
              {item.icon}
            </div>
          )
        })}
        
        <button
          onClick={() => setIsModalOpen(true)}
          style={addButtonStyle}
          title="Add Task"
        >
          +
        </button>
      </nav>

      <AddTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onTaskAdded={() => onTaskAdded?.()}
      />
    </>
  )
}