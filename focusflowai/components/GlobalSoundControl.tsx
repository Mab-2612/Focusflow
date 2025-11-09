// components/GlobalSoundControl.tsx
"use client"

import { useSound } from '@/contexts/SoundContext'
import { useTheme } from '@/components/ThemeContext'
import { useEffect, useRef, useState } from 'react'

const useSafeTheme = () => {
  try {
    return useTheme()
  } catch (error) {
    return { theme: 'light' }
  }
}

export default function GlobalSoundControl() {
  const { 
    isSoundPanelOpen, 
    toggleSoundPanel, 
    selectedSound, 
    stopSound,
    soundOptions,
    playSound
  } = useSound()
  
  const { theme } = useSafeTheme()
  const panelRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Don't close if clicking sidebar button
        const sidebarButton = (event.target as HTMLElement).closest('.sidebar-nav-item');
        if (sidebarButton && sidebarButton.textContent?.includes('Calming Sounds')) {
          return;
        }
        toggleSoundPanel()
      }
    }

    if (isSoundPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSoundPanelOpen, toggleSoundPanel])


  const soundButtonStyle = (soundId: string) => ({
    padding: '12px',
    backgroundColor: selectedSound === soundId ? '#3b82f6' : (theme === 'dark' ? '#374151' : '#f9fafb'),
    color: selectedSound === soundId ? 'white' : (theme === 'dark' ? '#f3f4f6' : '#374151'),
    border: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    transition: 'all 0.1s ease',
    transform: selectedSound === soundId ? 'scale(0.98)' : 'scale(1)'
  })
  
  // FIXED: New panel styling
  const panelStyle = {
    position: 'fixed' as const,
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    overflowY: 'auto' as const,
    zIndex: 1002, // Above sidebar backdrop
    animation: 'slide-up-in 0.2s ease-out',
    
    // Mobile: Centered modal
    top: isMobile ? '50%' : '20px',
    left: isMobile ? '50%' : 'auto',
    right: isMobile ? 'auto' : '20px',
    transform: isMobile ? 'translate(-50%, -50%)' : 'none',
    width: isMobile ? 'calc(100vw - 40px)' : '300px',
    maxWidth: isMobile ? '400px' : '300px',
    maxHeight: '60vh',
  }

  const titleStyle = {
    margin: '0 0 12px 0', 
    fontSize: '16px',
    color: theme === 'dark' ? '#f3f4f6' : '#374151',
    fontWeight: '600'
  }
  
  if (!isSoundPanelOpen) return null;

  return (
    <>
      {/* Backdrop for the modal */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1001, // Below panel, above sidebar
        }}
        onClick={toggleSoundPanel}
      />
      
      {/* Sound Panel */}
      <div ref={panelRef} style={panelStyle}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={titleStyle}>
            Calming Sounds
          </h3>
          {selectedSound && (
            <button
              onClick={stopSound}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Stop All
            </button>
          )}
        </div>

        {/* Sound Options */}
        {soundOptions.map(sound => (
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
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  )
}