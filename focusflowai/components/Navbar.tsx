// components/Navbar.tsx
"use client"

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import AddTaskModal from './AddTaskModal'

interface NavbarProps {
  onTaskAdded?: () => void
}

export default function Navbar({ onTaskAdded }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Define the 5 main nav items
  const navItems = [
    { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/pomodoro', icon: '⏱️', label: 'Pomodoro' },
    { href: '/planning', icon: '📅', label: 'Planning' },
    { href: '/chat', icon: '💬', label: 'Chat' },
    { href: '/calm-mode', icon: '🧘', label: 'Calm Mode' },
  ]

  return (
    <>
      <nav className="navbar new-layout">
        {/* Big Add Task Button on the left */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="nav-add-button-left"
          title="Add Task"
        >
          +
        </button>
        
        {/* The 5 main navigation items */}
        <div className="nav-items-main">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <div
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={item.label}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span className="nav-item-label">{item.label}</span>
              </div>
            )
          })}
        </div>
      </nav>

      <AddTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onTaskAdded={() => onTaskAdded?.()}
      />
    </>
  )
}