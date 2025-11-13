// components/Navbar.tsx
"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import AddTaskModal from './AddTaskModal'
import { Home, Timer, Calendar, MessageSquare, Wind } from 'lucide-react'

interface NavbarProps {
  onTaskAdded?: () => void
}

export default function Navbar({ onTaskAdded }: NavbarProps) {
  const pathname = usePathname()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Define the 5 main nav items
  const navItems = [
    { href: '/dashboard', icon: <Home size={24} />, label: 'Dashboard' },
    { href: '/pomodoro', icon: <Timer size={24} />, label: 'Pomodoro' },
    { href: '/planning', icon: <Calendar size={24} />, label: 'Planning' },
    { href: '/chat', icon: <MessageSquare size={24} />, label: 'Chat' },
    { href: '/calm-mode', icon: <Wind size={24} />, label: 'Calm Mode' },
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
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={item.label}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span className="nav-item-label">{item.label}</span>
              </Link>
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