// contexts/SoundContext.tsx
"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { Howl, Howler } from 'howler'

// This interface is for the UI
interface Sound {
  id: string
  name: string
  emoji: string
}

// This internal interface includes the local file path
interface SoundSource extends Sound {
  file: string
}

// FIXED: Define sounds with their local file paths
const localSoundOptions: SoundSource[] = [
  { id: 'rain', name: 'Rain', emoji: '🌧️', file: '/audio/rain.mp3' },
  { id: 'waves', name: 'Waves', emoji: '🌊', file: '/audio/waves.mp3' },
  { id: 'forest', name: 'Forest', emoji: '🌲', file: '/audio/forest.mp3' },
  { id: 'fire', name: 'Fire', emoji: '🔥', file: '/audio/fire.mp3' },
  { id: 'thunder', name: 'Thunder', emoji: '⛈️', file: '/audio/thunder.mp3' },
  { id: 'stream', name: 'Stream', emoji: '💧', file: '/audio/stream.mp3' },
  { id: 'birds', name: 'Birds', emoji: '🐦', file: '/audio/birds.mp3' },
  { id: 'wind', name: 'Wind', emoji: '💨', file: '/audio/wind.mp3' }
];

// Expose only the UI-safe data
const soundOptions: Sound[] = localSoundOptions.map(s => ({
  id: s.id,
  name: s.name,
  emoji: s.emoji
}));

interface SoundContextType {
  selectedSound: string | null
  playSound: (sound: Sound) => void
  stopSound: () => void
  soundOptions: Sound[]
  initAudio: () => void
  isAudioUnlocked: boolean
  soundsLoading: { [id: string]: boolean }
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

export const SoundProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedSound, setSelectedSound] = useState<string | null>(null)
  const soundsRef = useRef<{ [key: string]: Howl }>({})
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false)
  const [preloaded, setPreloaded] = useState(false) // To prevent re-loading
  
  // Set all sounds to loading initially
  const [soundsLoading, setSoundsLoading] = useState<{ [id: string]: boolean }>(
    localSoundOptions.reduce((acc, sound) => {
      acc[sound.id] = true;
      return acc;
    }, {} as { [id: string]: boolean })
  )
  
  // FIXED: This now runs ONLY on your first click
  const initAudio = async () => {
    if (isAudioUnlocked || typeof window === 'undefined') return;

    console.log("Attempting to unlock audio context...");
    setIsAudioUnlocked(true); // Set true immediately

    const silentSound = new Howl({
      src: ['data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'],
      volume: 0,
      onplay: async () => {
        console.log('AudioContext unlocked successfully.');
        
        try {
          const audioContext = Howler.ctx;
          if (audioContext && Howler.masterGain) {
            const compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
            compressor.knee.setValueAtTime(30, audioContext.currentTime);
            compressor.ratio.setValueAtTime(12, audioContext.currentTime);
            compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
            compressor.release.setValueAtTime(0.25, audioContext.currentTime);
            
            // FIXED: GainNode for LOUDNESS (2.0 = 200% volume)
            const gainNode = audioContext.createGain();
            gainNode.gain.setValueAtTime(3.0, audioContext.currentTime);
            
            // Chain: Master -> Compressor -> Gain -> Speakers
            Howler.masterGain.disconnect();
            Howler.masterGain.connect(compressor);
            compressor.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            console.log('Audio boost compressor and 2x gain node attached.');
          }
        } catch (e) {
          console.error('Failed to apply audio effects:', e);
        }
        
        // NOW that audio is unlocked, start preloading
        preloadSounds();
      },
      onplayerror: (id, err) => {
        console.error('Silent sound play error:', err);
         if (!preloaded) {
          preloadSounds(); // Still try to load sounds
        }
      }
    });

    silentSound.play();
  }

  // FIXED: This function now only runs once, after initAudio
  const preloadSounds = () => {
    if (preloaded) return; // Only run once
    setPreloaded(true);
    
    console.log('Preloading all local sounds...');
    
    localSoundOptions.forEach(sound => {
      soundsRef.current[sound.id] = new Howl({
        src: [sound.file],
        loop: true,
        volume: 0.9,
        preload: true,
        onload: () => {
          console.log(`Sound loaded: ${sound.name}`);
          setSoundsLoading(prev => ({ ...prev, [sound.id]: false }));
        },
        onloaderror: (id, err) => {
          console.error(`Howler error loading ${sound.name}:`, err);
          setSoundsLoading(prev => ({ ...prev, [sound.id]: false }));
        }
      });
    });
    console.log('All local sound preloading tasks dispatched.');
  }

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

  const playSound = (sound: Sound, volume: number = 0.9) => {
    if (!isAudioUnlocked) {
      console.warn('Audio not unlocked. Initializing...');
      initAudio();
      return; 
    }
    
    if (soundsLoading[sound.id]) {
      console.log(`${sound.name} is still loading, please wait.`);
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

  return (
    <SoundContext.Provider value={{
      selectedSound,
      playSound,
      stopSound,
      soundOptions,
      initAudio,
      isAudioUnlocked,
      soundsLoading
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