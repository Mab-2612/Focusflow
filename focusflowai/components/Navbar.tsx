// components/Navbar.tsx
"use client"

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import AddTaskModal from './AddTaskModal'
import { useSound } from '@/contexts/SoundContext' // Import useSound

interface NavbarProps {
  onTaskAdded?: () => void
}

export default function Navbar({ onTaskAdded }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { toggleSoundPanel } = useSound() // Get the function to open the sound panel
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLDivElement>(null)

  // Define all possible nav items with standard emojis
  const navItems = [
    { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/pomodoro', icon: '⏱️', label: 'Pomodoro' },
    { href: '/planning', icon: '📅', label: 'Planning' },
    { href: '/chat', icon: '💬', label: 'Chat' },
    { href: '/calm-mode', icon: '🧘', label: 'Calm Mode' },
    { href: '/profile', icon: '👤', label: 'Profile' },
  ]

  // --- MOBILE-FIRST LAYOUT ---
  // A sleek 5-item bar: [Dashboard] [Pomodoro] [FAB] [Planning] [More...]
  const mobileNavItemsLeft = navItems.filter(item => 
    item.href === '/dashboard' || item.href === '/pomodoro'
  );

  const mobileNavItemsRight = navItems.filter(item => 
    item.href === '/planning'
  );

  // Items that go into the "More" menu
  const moreNavItems = navItems.filter(item => 
    item.href === '/chat' || item.href === '/calm-mode' || item.href === '/profile'
  );

  // --- DESKTOP LAYOUT ---
  // All items are shown on the desktop "dock".
  const allNavItems = navItems;

  // Close "More" menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moreMenuRef.current && 
        !moreMenuRef.current.contains(event.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(event.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moreMenuRef, moreButtonRef]);

  // Close "More" menu when route changes
  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [pathname]);


  return (
    <>
      <nav className="navbar">
        {/* --- Mobile Layout (2 items + FAB + 2 items) --- */}
        <div className="nav-items-mobile">
          {mobileNavItemsLeft.map((item) => {
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

        <button
          onClick={() => setIsModalOpen(true)}
          className="nav-add-button"
          title="Add Task"
        >
          +
        </button>
        
        <div className="nav-items-mobile">
          {mobileNavItemsRight.map((item) => {
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
          {/* "More" Button */}
          <div
            ref={moreButtonRef}
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`nav-item ${isMoreMenuOpen ? 'active' : ''} ${moreNavItems.some(item => item.href === pathname) ? 'active' : ''}`}
            title="More"
          >
            <span className="nav-item-icon" style={{fontSize: '28px', lineHeight: '1'}}>...</span>
            <span className="nav-item-label">More</span>
          </div>
        </div>

        {/* --- Desktop Layout (All 6 items + FAB) --- */}
        <div className="nav-items-desktop">
          {allNavItems.map((item) => {
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

      {/* --- "More" Menu Pop-up --- */}
      {isMoreMenuOpen && (
        <>
          <div className="more-menu-backdrop" onClick={() => setIsMoreMenuOpen(false)} />
          <div className="more-menu" ref={moreMenuRef}>
            {moreNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="more-menu-item"
                  style={{ 
                    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)'
                  }}
                >
                  <span className="more-menu-item-icon" style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </a>
              )
            })}
            
            {/* FIXED: Added Calming Sounds button here */}
            <a
              onClick={toggleSoundPanel}
              className="more-menu-item"
            >
              <span className="more-menu-item-icon">🔊</span>
              <span>Calming Sounds</span>
            </a>
          </div>
        </>
      )}

      {/* This style block is necessary to hide/show the correct layout 
        based on the media queries in globals.css 
      */}
      <style jsx>{`
        .nav-items-desktop {
          display: none; /* Hidden by default (mobile-first) */
          gap: 8px; /* Tighter gap for desktop */
        }
        .nav-items-mobile {
          display: contents; /* Act as direct children of the flex container */
        }
        
        @media (min-width: 768px) {
          .nav-items-desktop {
            display: flex; /* Show on desktop */
          }
          .nav-items-mobile {
            display: none; /* Hide on desktop */
          }
          .navbar {
            gap: 8px; /* Tighter gap for desktop */
          }
        }
      `}</style>

      <AddTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onTaskAdded={() => onTaskAdded?.()}
      />
    </>
  )
}