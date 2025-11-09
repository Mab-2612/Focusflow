// components/Sidebar.tsx
"use client"

import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { useSound } from '@/contexts/SoundContext'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client' 

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname() 

  const { 
    soundOptions, 
    playSound, 
    selectedSound,
    isLoading: isLoadingSounds,
    initAudio, // FIXED: Get the initAudio function
    isAudioUnlocked // FIXED: Get the unlock state
  } = useSound()

  const [isSoundListOpen, setIsSoundListOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setIsSoundListOpen(false)
    }
  }, [isOpen])

  // FIXED: New click handler for the accordion
  const handleSoundAccordionClick = () => {
    // Always attempt to init audio on click.
    // The initAudio function will handle its own state and not run if already unlocked.
    if (!isAudioUnlocked) {
      initAudio();
    }
    // Toggle the accordion
    setIsSoundListOpen(!isSoundListOpen);
  }

  const handleLinkClick = (path: string) => {
    router.push(path)
    onClose()
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
  })
  
  const soundLoadingStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    fontSize: 'var(--font-sm)',
    color: 'var(--text-tertiary)'
  }

  return (
    <>
      <div 
        className={`sidebar-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">FocusFlow</span>
          <button onClick={onClose} className="sidebar-close-button">×</button>
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
            <button style={navItemStyle('/analytics')} onClick={() => handleLinkClick('/analytics')}>
              📊 Analytics
            </button>
            <button style={navItemStyle('/preferences')} onClick={() => handleLinkClick('/preferences')}>
              ⚙️ Preferences
            </button>
            
            <button 
              className="sidebar-nav-item"
              style={navItemStyle('/calm-mode')} // This style is just for highlight, not function
              onClick={handleSoundAccordionClick} // FIXED: Use new handler
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
                {isLoadingSounds ? (
                  <div style={soundLoadingStyle}>
                    <div className="animate-spin" style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid var(--border-medium)',
                      borderTopColor: 'var(--accent-primary)',
                      borderRadius: '50%'
                    }} />
                    <span>Loading sounds...</span>
                  </div>
                ) : (
                  soundOptions.map(sound => (
                    <button
                      key={sound.id}
                      onClick={() => playSound(sound)}
                      style={soundButtonStyle(sound.id)}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{sound.emoji}</span>
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
                  ))
                )}
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