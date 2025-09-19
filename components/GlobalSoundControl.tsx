"use client"

import { useSound } from '@/contexts/SoundContext'
import { useTheme } from '@/components/ThemeContext'
import { useEffect, useRef, useState } from 'react'

export default function GlobalSoundControl() {
  const { 
    isSoundPanelOpen, 
    toggleSoundPanel, 
    selectedSound, 
    stopSound,
    soundOptions,
    playSound
  } = useSound()
  
  const { theme } = useTheme()
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile
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
      if (
        panelRef.current && 
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
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

  // Manage body scroll when panel is open on mobile
  useEffect(() => {
    if (isSoundPanelOpen && isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isSoundPanelOpen, isMobile])

  // Define soundButtonStyle function
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

  // Container styles
  const containerStyle = {
    position: 'fixed' as const,
    top: isMobile ? '10px' : '20px',
    right: isMobile ? '10px' : '20px',
    zIndex: 1000
  }

  // Button styles
  const buttonStyle = {
    padding: '12px',
    backgroundColor: selectedSound ? '#3b82f6' : (theme === 'dark' ? '#374151' : '#ffffff'),
    color: selectedSound ? 'white' : (theme === 'dark' ? '#f3f4f6' : '#374151'),
    border: theme === 'dark' ? '1px solid #4b5563' : '1px solid #d1d5db',
    borderRadius: '50%',
    cursor: 'pointer',
    width: isMobile ? '44px' : '50px',
    height: isMobile ? '44px' : '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: isMobile ? '18px' : '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.2s ease'
  }

  // Panel styles
  const panelStyle = {
    position: isMobile ? 'fixed' as const : 'absolute' as const,
    top: isMobile ? '70px' : '60px',
    right: isMobile ? '10px' : '0',
    left: isMobile ? '10px' : 'auto',
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    minWidth: isMobile ? 'auto' : '200px',
    maxWidth: isMobile ? 'calc(100vw - 20px)' : 'none',
    maxHeight: isMobile ? '60vh' : '400px',
    overflowY: 'auto' as const,
    zIndex: 1001
  }

  // Title styles
  const titleStyle = {
    margin: '0 0 12px 0', 
    fontSize: '16px',
    color: theme === 'dark' ? '#f3f4f6' : '#374151',
    fontWeight: '600'
  }

  return (
    <>
      {/* Main Sound Control Container */}
      <div style={containerStyle}>
        <button 
          ref={buttonRef}
          onClick={toggleSoundPanel}
          style={buttonStyle}
          title={selectedSound ? `Playing: ${selectedSound}` : 'Sound controls'}
        >
          {selectedSound ? '🔊' : '🔇'}
        </button>

        {/* Sound Panel */}
        {isSoundPanelOpen && (
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
                    color: 'rgba(255, 255, 255, 0.8)',
                    animation: 'pulse 1s infinite'
                  }}>
                    ●
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Mobile Backdrop */}
      {isSoundPanelOpen && isMobile && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            display: isMobile ? 'block' : 'none'
          }}
          onClick={toggleSoundPanel}
        />
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .sound-panel {
            position: fixed !important;
            top: 70px !important;
            right: 10px !important;
            left: 10px !important;
            min-width: auto !important;
            max-width: calc(100vw - 20px) !important;
            max-height: 60vh !important;
            z-index: 1001 !important;
          }
        }

        @media (max-width: 480px) {
          .sound-control-button {
            width: 40px !important;
            height: 40px !important;
            font-size: 16px !important;
          }
          
          .sound-panel {
            padding: 12px !important;
            top: 60px !important;
            right: 8px !important;
            left: 8px !important;
            max-width: calc(100vw - 16px) !important;
            max-height: 55vh !important;
          }
        }
      `}</style>
    </>
  )
}