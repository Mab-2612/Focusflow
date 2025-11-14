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
import { useAuth } from '@/hooks/useAuth' 
import { Loader2 } from 'lucide-react' 

// --- Re-usable Mobile Header ---
const MobileHeader = () => {
  const { toggleSidebar } = useSidebar()
  const { theme } = useTheme()
  const pathname = usePathname() // Get pathname here

  // --- ADDED: Page title logic ---
  const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/pomodoro': 'Pomodoro Timer',
    '/planning': 'Planning',
    '/calm-mode': 'Calm Mode',
    '/profile': 'Profile',
    '/preferences': 'Preferences',
    '/analytics': 'Analytics',
    '/notifications': 'Notifications'
  };

  const title = pageTitles[pathname] || 'FocusFlow'; // Fallback
  // --- END: Page title logic ---

  const headerStyle = {
    backgroundColor: 'var(--bg-primary)',
    borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
    padding: '12px 16px',
    paddingTop: 'max(12px, env(safe-area-inset-top))',
  }

  const titleStyle = {
    color: 'var(--text-primary)',
    fontSize: 'var(--font-lg)', // Use CSS variable
    fontWeight: '600',
    // --- ADDED: Prevent title from wrapping ---
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const
  }

  return (
    <header style={headerStyle} className="mobile-header">
      {pathname !== '/onboarding' && (
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
      )}
      {pathname === '/onboarding' && <div style={{ width: '40px' }} />}

      <h1 style={titleStyle} className="mobile-header-title">
        {title} {/* <-- FIXED: Use dynamic title */}
      </h1>
      <div style={{ width: '40px' }}></div>
    </header>
  )
}

// --- Full Screen Loader ---
const FullScreenLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    height: '100dvh',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)'
  }}>
    <Loader2 size={32} className="animate-spin" />
  </div>
);

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isKeyboardOpen } = useKeyboardStatus()
  const { user, loading } = useAuth() 

  const isChatPage = pathname === '/chat'
  
  const isAuthPage = pathname === '/onboarding' || 
                   pathname === '/auth/callback' || 
                   pathname === '/auth/update-password';

  const showNavbar = user && (!isChatPage || (isChatPage && !isKeyboardOpen))

  if (loading) {
    return <FullScreenLoader />;
  }

  // --- Stricter layout for non-authenticated users ---
  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        height: '100dvh', 
        backgroundColor: 'var(--bg-primary)'
      }}>
        <GlobalElementsLoader />
        {pathname === '/onboarding' && <MobileHeader />}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children} 
        </div>
      </div>
    );
  }

  // --- LOGGED IN state ---
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