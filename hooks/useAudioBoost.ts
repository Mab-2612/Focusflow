// hooks/useAudioBoost.ts
"use client"

import { useRef } from 'react'

export const useAudioBoost = () => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)

  const setupAudioBoost = async () => {
    if (typeof window === 'undefined') return null

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      compressorRef.current = audioContextRef.current.createDynamicsCompressor()
      
      // Configure compressor for louder output
      compressorRef.current.threshold.setValueAtTime(-24, audioContextRef.current.currentTime)
      compressorRef.current.knee.setValueAtTime(30, audioContextRef.current.currentTime)
      compressorRef.current.ratio.setValueAtTime(12, audioContextRef.current.currentTime)
      compressorRef.current.attack.setValueAtTime(0.003, audioContextRef.current.currentTime)
      compressorRef.current.release.setValueAtTime(0.25, audioContextRef.current.currentTime)
      
      compressorRef.current.connect(audioContextRef.current.destination)
      return compressorRef.current
    } catch (error) {
      console.error('Audio boost setup failed:', error)
      return null
    }
  }

  const boostAudio = async (howl: Howl) => {
    try {
      const compressor = await setupAudioBoost()
      if (!compressor || !audioContextRef.current) return howl

      // Create a gain node for additional volume boost
      const gainNode = audioContextRef.current.createGain()
      gainNode.gain.setValueAtTime(1.5, audioContextRef.current.currentTime) // 50% boost
      
      // Connect: Howl → Gain → Compressor → Destination
      const source = audioContextRef.current.createMediaElementSource(howl._sounds[0]._node)
      source.connect(gainNode)
      gainNode.connect(compressor)
      
      return howl
    } catch (error) {
      console.error('Audio boost failed:', error)
      return howl
    }
  }

  return { boostAudio }
}