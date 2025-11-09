// components/GlobalStopButton.tsx
"use client"

import { useSound } from '@/contexts/SoundContext'

export default function GlobalStopButton() {
  const { selectedSound, stopSound } = useSound()

  // If no sound is playing, render nothing
  if (!selectedSound) {
    return null
  }

  // Render the stop button
  return (
    <button
      onClick={stopSound}
      title="Stop Calming Sound"
      style={{
        position: 'fixed',
        bottom: '100px', // Positioned above the navbar
        right: '20px',
        width: '40px',
        height: '40px',
        backgroundColor: '#ef4444', // Red color
        color: 'white',
        border: '2px solid white',
        borderRadius: '50%',
        boxShadow: 'var(--shadow-md)',
        cursor: 'pointer',
        zIndex: 999, // Below sidebar, but above page content
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'pulse 2s infinite'
      }}
    >
      {/* Stop Icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z" />
      </svg>
      
      <style jsx>{`
        @keyframes pulse {
          0% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% { 
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
          100% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
      `}</style>
    </button>
  )
}