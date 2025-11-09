// components/MobileHeader.tsx
"use client"

import { useTheme } from "./ThemeContext"

interface MobileHeaderProps {
  onMenuClick: () => void
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const { theme } = useTheme()

  return (
    <div className="mobile-header">
      <button onClick={onMenuClick} className="mobile-menu-button" title="Open menu">
        {/* Hamburger Icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      
      <span className="mobile-header-title">FocusFlow</span>
      
      {/* Spacer to balance the header */}
      <div style={{ width: '40px' }} />
    </div>
  )
}