// hooks/useSpeechSynthesis.ts
"use client"

import { useState, useRef, useCallback } from 'react'

export const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      
      // Soothing voice settings
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 0.8
      
      // Try to get a nice voice
      const voices = window.speechSynthesis.getVoices()
      const preferredVoices = voices.filter(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Samantha') ||
        voice.name.includes('Karen') ||
        voice.name.includes('Daniel')
      )
      
      if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0]
      }

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        onEnd?.()
      }
      utterance.onerror = () => setIsSpeaking(false)

      synthesisRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  const setVoice = useCallback((voiceName: string) => {
    // Voice setting is handled in the speak function
  }, [])

  return {
    isSpeaking,
    speak,
    stopSpeaking,
    setVoice
  }
}