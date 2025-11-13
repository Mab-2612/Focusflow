// components/Sidebar.tsx
"use client"

import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { useSound } from '@/contexts/SoundContext'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client' 
import { useSidebar } from '@/contexts/SidebarContext'
import { 
  User, Bell, BarChart2, Settings, Volume2, Moon, Sun, 
  CloudRain, Waves, Trees, Flame, CloudLightning, Droplet, Bird, Wind,
  ChevronDown, ChevronUp, X, Loader2
} from 'lucide-react'

export default function Sidebar() {
  const { resolvedTheme, setTheme } = useTheme()
  const { user } = useAuth()
  const router = useRouter() // Keep router for sign-out redirect
  const pathname = usePathname() 
  const { isSidebarOpen, toggleSidebar } = useSidebar()

  const { 
    soundOptions, 
    playSound, 
    selectedSound,
    initAudio,
    isAudioUnlocked,
    soundsLoading
  } = useSound()

  const [isSoundListOpen, setIsSoundListOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isClient, setIsClient] = useState(false) // For hydration fix

  // Set isClient to true once the component mounts
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;
    
    const fetchUnreadCount = async () => {
      if (!user) return;
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('user_id', user.id); 
        
      if (error) {
        console.error('Error fetching unread count:', error);
      } else {
        setUnreadCount(count || 0);
      }
    };
    fetchUnreadCount();
    
    // Listen for real-time changes to notifications
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          fetchUnreadCount();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close sound list when sidebar closes
  useEffect(() => {
    if (!isSidebarOpen) {
      setIsSoundListOpen(false)
    }
  }, [isSidebarOpen])

  // --- HANDLERS ---

  const handleSoundAccordionClick = () => {
    if (!isAudioUnlocked) {
      initAudio();
    }
    setIsSoundListOpen(!isSoundListOpen);
  }

  // Simplified link click handler (navigation is done by <Link>)
  const handleLinkClick = () => {
    toggleSidebar()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toggleSidebar(); // Close sidebar
    router.push('/onboarding'); // Redirect to login
  }
  
  // Helper to get the correct sound icon
  const getSoundIcon = (soundId: string) => {
    const props = { size: 20, style: { flexShrink: 0 } }
    switch (soundId) {
      case 'rain': return <CloudRain {...props} />;
      case 'waves': return <Waves {...props} />;
      case 'forest': return <Trees {...props} />;
      case 'fire': return <Flame {...props} />; // Corrected from 'Fire'
      case 'thunder': return <CloudLightning {...props} />;
      case 'stream': return <Droplet {...props} />;
      case 'birds': return <Bird {...props} />;
      case 'wind': return <Wind {...props} />;
      default: return null;
    }
  }

  // --- STYLES & DYNAMIC VARS ---

  // Style for active/inactive navigation links
  const navItemStyle = (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-base)',
    textAlign: 'left' as const,
    position: 'relative' as const,
    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
    fontWeight: isActive ? '600' : '400',
    color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
    textDecoration: 'none' // For Link component
  })

  // Dynamic theme variables for hydration fix
  const isDark = resolvedTheme === 'dark'
  const nextTheme = isDark ? 'light' : 'dark'
  const themeIcon = isDark ? <Moon size={20} /> : <Sun size={20} />
  const themeText = isDark ? "Dark Mode" : "Light Mode"
  
  // Reusable inline spinner
  const inlineSpinner = (
    <Loader2 
      size={16}
      className="animate-spin"
      style={{
        color: 'var(--accent-primary)'
      }} 
    />
  )

  // Wrapper for theme icon to prevent layout shift
  const iconWrapperStyle = {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  }

  return (
    <>
      <div 
        className={`sidebar-backdrop ${isSidebarOpen ? 'open' : ''}`}
        onClick={toggleSidebar}
      />
      
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">FocusFlow</span>
          <button onClick={toggleSidebar} className="sidebar-close-button" title="Close menu">
            <X size={24} />
          </button>
        </div>
        
        <div className="sidebar-content">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
              <div className="sidebar-user-details">
                <span className="sidebar-user-name">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
                <span className="sidebar-user-email">
                  {user.user_metadata?.full_name ? user.email : ''}
                </span>
              </div>
            </div>
          )}

          <nav className="sidebar-nav">
            {/* --- UPDATED: Navigation items are now <Link> components --- */}
            <Link href="/profile" style={navItemStyle(pathname === '/profile')} onClick={handleLinkClick}>
              <User size={20} /> Profile
            </Link>
            
            <Link href="/notifications" style={navItemStyle(pathname === '/notifications')} onClick={handleLinkClick}>
              <Bell size={20} /> Notifications
              {unreadCount > 0 && (
                <span className="sidebar-badge">{unreadCount}</span>
              )}
            </Link>
            
            <Link href="/analytics" style={navItemStyle(pathname === '/analytics')} onClick={handleLinkClick}>
              <BarChart2 size={20} /> Analytics
            </Link>

            <Link href="/preferences" style={navItemStyle(pathname === '/preferences')} onClick={handleLinkClick}>
              <Settings size={20} /> Preferences
            </Link>
            
            {/* This one remains a button because it's an accordion */}
            <button 
              className="sidebar-nav-item"
              style={navItemStyle(pathname === '/calm-mode')}
              onClick={handleSoundAccordionClick}
            >
              <Volume2 size={20} /> Calming Sounds
              <span style={{ 
                marginLeft: 'auto', 
                transform: isSoundListOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                transition: 'transform 0.2s',
                display: 'flex',
                alignItems: 'center'
              }}>
                {isSoundListOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>
            
            {isSoundListOpen && (
              <div style={{
                paddingLeft: '24px', 
                animation: 'fadeIn 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingTop: '8px'
              }}>
                {soundOptions.map(sound => (
                  <button
                    key={sound.id}
                    onClick={() => playSound(sound)}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: selectedSound === sound.id ? 'var(--bg-tertiary)' : 'transparent',
                      color: selectedSound === sound.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      opacity: soundsLoading[sound.id] ? 0.6 : 1,
                    }}
                    disabled={soundsLoading[sound.id]}
                  >
                    {soundsLoading[sound.id] ? inlineSpinner : getSoundIcon(sound.id)}
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 'var(--font-sm)' }}>{sound.name}</span>
                    {selectedSound === sound.id && (
                      <span style={{ 
                        fontSize: '12px',
                        color: 'var(--accent-primary)',
                        animation: 'pulse 1.5s infinite'
                      }}>
                        ●
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </nav>
          
          {/* --- UPDATED: Theme Toggle with Hydration Fix --- */}
          <div className="sidebar-theme-toggle">
            <span style={{
              fontSize: 'var(--font-sm)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              
              {/* Icon Wrapper */}
              <span style={iconWrapperStyle}>
                {isClient ? themeIcon : null}
              </span>
              
              {/* Text Wrapper */}
              <span>
                {isClient ? themeText : "Loading..."}
              </span>
              
            </span>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isDark}
                onChange={() => setTheme(nextTheme)}
                disabled={!isClient}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        {user && (
          <div className="sidebar-footer">
            <button className="sidebar-signout-button" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        )}
      </div>
      
      {/* Styles for new elements */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}