// contexts/SoundContext.tsx
"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { Howl, Howler } from 'howler'

interface Sound {
  id: string
  name: string
  emoji: string
  freesoundId: number
}

interface SoundContextType {
  selectedSound: string | null
  playSound: (sound: Sound, volume?: number) => void
  stopSound: () => void
  soundOptions: Sound[]
  initAudio: () => void // Expose initAudio
  isLoading: boolean // Expose loading state
  isAudioUnlocked: boolean // Expose unlock state
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

export const SoundProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedSound, setSelectedSound] = useState<string | null>(null)
  const soundsRef = useRef<{ [key: string]: Howl }>({})
  const [preloaded, setPreloaded] = useState(false)
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // This now controls the spinner

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

  const initAudio = async () => {
    // Prevent running if already unlocked or if in the middle of loading
    if (isAudioUnlocked || isLoading || typeof window === 'undefined') return;

    console.log("Attempting to unlock audio context...");
    setIsLoading(true); // FIXED: Set loading to TRUE at the very beginning

    const silentSound = new Howl({
      src: ['data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'],
      volume: 0,
      onplay: async () => {
        console.log('AudioContext unlocked successfully.');
        setIsAudioUnlocked(true);

        try {
          const audioContext = Howler.ctx;
          if (audioContext && Howler.masterGain) {
            const compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
            compressor.knee.setValueAtTime(30, audioContext.currentTime);
            compressor.ratio.setValueAtTime(12, audioContext.currentTime);
            compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
            compressor.release.setValueAtTime(0.25, audioContext.currentTime);
            
            Howler.masterGain.disconnect();
            Howler.masterGain.connect(compressor);
            compressor.connect(audioContext.destination);
            console.log('Audio boost compressor attached.');
          }
        } catch (e) {
          console.error('Failed to apply audio boost:', e);
        }
        
        // Now, preload sounds and wait for them to finish
        await preloadSounds(); 
        setIsLoading(false); // FIXED: Set loading to FALSE only after preloading is done
      },
      onplayerror: async (id, err) => {
        console.error('Silent sound play error:', err);
        if (!isAudioUnlocked) {
           setIsAudioUnlocked(true);
           await preloadSounds();
        }
        setIsLoading(false); // Also set loading to false on error
      }
    });

    silentSound.play();
  }


  const preloadSounds = async () => {
    // Removed !isAudioUnlocked check because initAudio gatekeeps this
    if (preloaded) return 

    const FREESOUND_API_KEY = process.env.NEXT_PUBLIC_FREESOUND_API_KEY
    const FREESOUND_BASE_URL = 'https://freesound.org/apiv2'

    if (!FREESOUND_API_KEY) {
      console.error(
        'Calming Sounds Error: NEXT_PUBLIC_FREESOUND_API_KEY is not set.'
      )
      setPreloaded(true) 
      return
    }

    console.log('Preloading sounds...');
    setPreloaded(true);
    
    const preloadPromises = soundOptions.map(async (sound) => {
      try {
        const response = await fetch(
          `${FREESOUND_BASE_URL}/sounds/${sound.freesoundId}/?fields=previews&token=${FREESOUND_API_KEY}`
        );
        
        if (response.ok) {
          const soundData = await response.json();
          const previewUrl = soundData.previews['preview-hq-mp3'];

          soundsRef.current[sound.id] = new Howl({
            src: [previewUrl],
            loop: true,
            volume: 0.9,
            preload: true,
            onloaderror: (id, err) => {
              console.error(`Howler error loading ${sound.name}:`, err);
            },
            onplayerror: (id, err) => {
              console.error(`Howler error playing ${sound.name}:`, err);
            }
          });
        } else {
          console.error(`Freesound API error for ${sound.name}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Error preloading ${sound.name}:`, error);
      }
    });
    
    await Promise.all(preloadPromises);
    
    console.log('Sounds preloaded.');
  }

  const playSound = (sound: Sound, volume: number = 0.9) => {
    // This function is now safe because the loading spinner in the sidebar
    // will prevent this from being called until isLoading is false.
    if (!isAudioUnlocked) {
      console.warn('Audio not unlocked. This should not happen.');
      initAudio(); // Failsafe
      return; 
    }
    
    if (selectedSound === sound.id) {
      stopSound()
      return
    }

    if (selectedSound && soundsRef.current[selectedSound]) {
      soundsRef.current[selectedSound].stop()
    }

    const howl = soundsRef.current[sound.id]
    if (howl) {
      howl.volume(volume)
      howl.play()
      setSelectedSound(sound.id)
    } else {
      console.warn(`Sound ${sound.name} could not be played. Ref is missing.`);
    }
  }
  
  const stopSound = () => {
    if (selectedSound && soundsRef.current[selectedSound]) {
      soundsRef.current[selectedSound].stop()
      setSelectedSound(null)
    }
  }

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
      selectedSound,
      playSound,
      stopSound,
      soundOptions,
      initAudio,
      preloadSounds, // Exposing this, though it's called internally
      isLoading,
      isAudioUnlocked
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