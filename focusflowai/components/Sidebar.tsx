// components/Sidebar.tsx
"use client"

import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { useSound } from '@/contexts/SoundContext'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client' 
import { useSidebar } from '@/contexts/SidebarContext'

export default function Sidebar() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
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

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
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


  useEffect(() => {
    if (!isSidebarOpen) {
      setIsSoundListOpen(false)
    }
  }, [isSidebarOpen])

  const handleSoundAccordionClick = () => {
    if (!isAudioUnlocked) {
      initAudio();
    }
    setIsSoundListOpen(!isSoundListOpen);
  }

  const handleLinkClick = (path: string) => {
    router.push(path)
    toggleSidebar()
  }
  
  const isDark = resolvedTheme === 'dark'
  const nextTheme = isDark ? 'light' : 'dark'
  const themeIcon = isDark ? '🌙' : '☀️'

  const soundButtonStyle = (soundId: string) => ({
    padding: '10px 12px',
    backgroundColor: selectedSound === soundId ? '#3b82f6' : (theme === 'dark' ? '#111827' : '#f9fafb'),
    color: selectedSound === soundId ? 'white' : (theme === 'dark' ? '#f3f4f6' : '#374151'),
    border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    transition: 'all 0.1s ease',
    opacity: soundsLoading[soundId] ? 0.6 : 1,
  })

  const navItemStyle = (path: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-base)',
    color: 'var(--text-primary)',
    textAlign: 'left' as const,
    backgroundColor: pathname === path ? 'var(--bg-tertiary)' : 'transparent',
    fontWeight: pathname === path ? '600' : '400',
    position: 'relative' as const
  })
  
  // FIXED: Restored the spinner's JSX
  const inlineSpinner = (
    <div className="animate-spin" style={{
      width: '16px',
      height: '16px',
      border: '2px solid var(--border-medium)',
      borderTopColor: 'var(--accent-primary)',
      borderRadius: '50%'
    }} />
  )

  return (
    <>
      <div 
        className={`sidebar-backdrop ${isSidebarOpen ? 'open' : ''}`}
        onClick={toggleSidebar}
      />
      
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">FocusFlow</span>
          <button onClick={toggleSidebar} className="sidebar-close-button">×</button>
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
            <button style={navItemStyle('/profile')} onClick={() => handleLinkClick('/profile')}>
              👤 Profile
            </button>
            
            <button style={navItemStyle('/notifications')} onClick={() => handleLinkClick('/notifications')}>
              🔔 Notifications
              {unreadCount > 0 && (
                <span className="sidebar-badge">{unreadCount}</span>
              )}
            </button>
            
            <button style={navItemStyle('/analytics')} onClick={() => handleLinkClick('/analytics')}>
              📊 Analytics
            </button>
            <button style={navItemStyle('/preferences')} onClick={() => handleLinkClick('/preferences')}>
              ⚙️ Preferences
            </button>
            
            <button 
              className="sidebar-nav-item"
              style={navItemStyle('/calm-mode')}
              onClick={handleSoundAccordionClick}
            >
              🔊 Calming Sounds
              <span style={{ 
                marginLeft: 'auto', 
                transform: isSoundListOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                transition: 'transform 0.2s',
                display: 'flex',
                alignItems: 'center'
              }}>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </span>
            </button>
            
            {isSoundListOpen && (
              <div className="sidebar-sound-list">
                {soundOptions.map(sound => (
                  <button
                    key={sound.id}
                    onClick={() => playSound(sound)}
                    style={soundButtonStyle(sound.id)}
                    disabled={soundsLoading[sound.id]}
                  >
                    {soundsLoading[sound.id] ? inlineSpinner : (
                      <span style={{ fontSize: '1.2rem', width: '16px' }}>{sound.emoji}</span>
                    )}
                    <span style={{ flex: 1, textAlign: 'left' }}>{sound.name}</span>
                    {selectedSound === sound.id && (
                      <span style={{ 
                        fontSize: '12px',
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'inherit',
                        animation: 'pulse 1s infinite'
                      }}>
                        ●
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </nav>
          
          <div className="sidebar-theme-toggle">
            <span>{themeIcon} {isDark ? 'Dark' : 'Light'} Mode</span>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isDark}
                onChange={() => setTheme(nextTheme)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        {user && (
          <div className="sidebar-footer">
            <button className="sidebar-signout-button" onClick={() => supabase.auth.signOut()}>
              Sign Out
            </button>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .sidebar-sound-list {
          padding: 8px 12px 12px 12px;
          border-bottom: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: fadeIn 0.3s ease;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  )
}