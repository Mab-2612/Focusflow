// components/LayoutClient.tsx
"use client"

import { useTheme } from '@/components/ThemeContext'
import { useSidebar } from '@/contexts/SidebarContext'
import Sidebar from '@/components/Sidebar'
import GlobalSoundControl from '@/components/GlobalSoundControl'
import GlobalElementsLoader from '@/components/GlobalElementsLoader'
import GlobalStopButton from '@/components/GlobalStopButton'
import Navbar from '@/components/Navbar'
import { usePathname } from 'next/navigation'
import { useKeyboardStatus } from '@/hooks/useKeyboardStatus'

const MobileHeader = () => {
  const { toggleSidebar } = useSidebar()
  const { theme } = useTheme()

  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
    borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
    padding: '12px 16px',
    paddingTop: 'max(12px, env(safe-area-inset-top))',
  }

  const titleStyle = {
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  return (
    <header style={headerStyle} className="mobile-header">
      <button 
        onClick={toggleSidebar} 
        className="mobile-menu-button"
        title="Open menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <h1 style={titleStyle} className="mobile-header-title">
        FocusFlow
      </h1>
      <div style={{ width: '40px' }}></div>
    </header>
  )
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isKeyboardOpen } = useKeyboardStatus()
  const isChatPage = pathname === '/chat'
  const showNavbar = !isChatPage || (isChatPage && !isKeyboardOpen)

  return (
    <>
      <GlobalElementsLoader />
      
      {!isChatPage && <MobileHeader />}
      
      <Sidebar />
      <GlobalSoundControl />
      <GlobalStopButton />
      
      {children}
      
      {showNavbar && <Navbar />}
    </>
  )
}