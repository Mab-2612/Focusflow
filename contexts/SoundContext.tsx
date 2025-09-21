// contexts/SoundContext,tsx
"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { Howl } from 'howler'

interface Sound {
  id: string
  name: string
  emoji: string
  freesoundId: number
}

interface SoundContextType {
  isSoundPanelOpen: boolean
  toggleSoundPanel: () => void
  selectedSound: string | null
  playSound: (sound: Sound) => void
  stopSound: () => void
  soundOptions: Sound[]
  preloadSounds: () => void
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

export const SoundProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSoundPanelOpen, setIsSoundPanelOpen] = useState(false)
  const [selectedSound, setSelectedSound] = useState<string | null>(null)
  const soundsRef = useRef<{ [key: string]: Howl }>({})
  const [preloaded, setPreloaded] = useState(false)

  const soundOptions: Sound[] = [
    { id: 'rain', name: 'Rain', emoji: '🌧️', freesoundId: 826231 },
    { id: 'waves', name: 'Waves', emoji: '🌊', freesoundId: 824876 },
    { id: 'forest', name: 'Forest', emoji: '🌲', freesoundId: 823247 },
    { id: 'fire', name: 'Fire', emoji: '🔥', freesoundId: 819492 },
    { id: 'thunder', name: 'Thunder', emoji: '⛈️', freesoundId: 823513 },
    { id: 'stream', name: 'Stream', emoji: '💧', freesoundId: 825932 },
    { id: 'birds', name: 'Birds', emoji: '🐦', freesoundId: 825281 },
    { id: 'wind', name: 'Wind', emoji: '💨', freesoundId: 825411 }
  ]

  // Preload all sounds on mount
  const preloadSounds = async () => {
    if (preloaded) return

    const FREESOUND_API_KEY = process.env.NEXT_PUBLIC_FREESOUND_API_KEY
    const FREESOUND_BASE_URL = 'https://freesound.org/apiv2'

    for (const sound of soundOptions) {
      try {
        const response = await fetch(
          `${FREESOUND_BASE_URL}/sounds/${sound.freesoundId}/?fields=previews&token=${FREESOUND_API_KEY}`
        )
        
        if (response.ok) {
          const soundData = await response.json()
          const previewUrl = soundData.previews['preview-hq-mp3']

          soundsRef.current[sound.id] = new Howl({
            src: [previewUrl],
            loop: true,
            volume: 0.4,
            preload: true
          })
        }
      } catch (error) {
        console.error(`Error preloading ${sound.name}:`, error)
      }
    }
    setPreloaded(true)
  }

  const toggleSoundPanel = () => {
    setIsSoundPanelOpen(prev => !prev)
  }

  const playSound = (sound: Sound) => {
    // If clicking the same sound, toggle it off
    if (selectedSound === sound.id) {
      stopSound()
      return
    }

    // Stop current sound if any
    if (selectedSound && soundsRef.current[selectedSound]) {
      soundsRef.current[selectedSound].stop()
    }

    // Play new sound (should be preloaded)
    const howl = soundsRef.current[sound.id]
    if (howl) {
      howl.play()
      setSelectedSound(sound.id)
    } else {
      console.warn(`Sound ${sound.name} not preloaded yet`)
    }
  }

  const stopSound = () => {
    if (selectedSound && soundsRef.current[selectedSound]) {
      soundsRef.current[selectedSound].stop()
      setSelectedSound(null)
    }
  }

  // Preload sounds on mount
  useEffect(() => {
    preloadSounds()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(soundsRef.current).forEach(sound => {
        if (sound) {
          sound.stop()
          sound.unload()
        }
      })
    }
  }, [])

  return (
    <SoundContext.Provider value={{
      isSoundPanelOpen,
      toggleSoundPanel,
      selectedSound,
      playSound,
      stopSound,
      soundOptions,
      preloadSounds
    }}>
      {children}
    </SoundContext.Provider>
  )
}

export const useSound = () => {
  const context = useContext(SoundContext)
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider')
  }
  return context
}