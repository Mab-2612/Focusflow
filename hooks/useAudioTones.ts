"use client"

import { useCallback, useRef } from 'react'

export const useAudioTones = () => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const isAudioAllowedRef = useRef(false)

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  const requestAudioPermission = useCallback(async () => {
    if (isAudioAllowedRef.current) return true
    
    try {
      const context = ensureAudioContext()
      // Resume the context if it's suspended (required after user gesture)
      if (context.state === 'suspended') {
        await context.resume()
      }
      isAudioAllowedRef.current = true
      return true
    } catch (error) {
      console.log('Audio permission denied:', error)
      return false
    }
  }, [ensureAudioContext])

  const playTone = useCallback(async (frequency: number, duration: number, volume = 0.9) => {
    try {
      const hasPermission = await requestAudioPermission()
      if (!hasPermission) return

      const context = ensureAudioContext()
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(volume, context.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)

      oscillator.start(context.currentTime)
      oscillator.stop(context.currentTime + duration)
    } catch (error) {
      console.log('Audio tone error:', error)
    }
  }, [ensureAudioContext, requestAudioPermission]) // ← FIXED: Added closing parenthesis and semicolon

  const playStartTone = useCallback(() => playTone(523.25, 0.9), [playTone])
  const playStopTone = useCallback(() => playTone(392.00, 0.9), [playTone])
  const playErrorTone = useCallback(() => playTone(349.23, 0.9), [playTone])

  return {
    playStartTone,
    playStopTone,
    playErrorTone,
    requestAudioPermission
  }
}