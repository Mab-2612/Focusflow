// components/MobileHeader.tsx
"use client"

import { useTheme } from "./ThemeContext"
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext' // Import new hook

// Remove onMenuClick prop
export default function MobileHeader() {
  const { theme } = useTheme()
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar() // Get function from context

  const pageTitles: { [key: string]: string } = {
    '/dashboard': 'FocusFlow',
    '/pomodoro': 'Pomodoro Timer',
    '/planning': 'Planning & Calendar',
    '/chat': 'FocusFlow Chat',
    '/calm-mode': 'Calm Mode'
  };

  const title = pageTitles[pathname] || 'FocusFlow';

  return (
    <div className="mobile-header">
      {/* FIXED: Use toggleSidebar from context */}
      <button onClick={toggleSidebar} className="mobile-menu-button" title="Open menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      
      <span className="mobile-header-title">{title}</span>
      
      <div style={{ width: '40px' }} />
    </div>
  )
}