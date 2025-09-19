// hooks/useGoogleTTS.ts - NO FALLBACK VERSION
"use client"

import { useState, useCallback, useRef } from 'react'

export const useGoogleTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    try {
      const byteCharacters = atob(base64)
      const byteNumbers = new Array(byteCharacters.length)
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      
      const byteArray = new Uint8Array(byteNumbers)
      return new Blob([byteArray], { type: mimeType })
    } catch (error) {
      console.error('Base64 conversion error:', error)
      throw new Error('Invalid base64 audio data')
    }
  }

  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    if (!text || text === '[STOPPED]' || text.trim() === '') {
      onEnd?.();
      return;
    }

    try {
      setIsSpeaking(true)
      
      // Stop any current speech
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: text,
          emotion: 'default'
        })
      })

      const data = await response.json()

      if (data.success && data.audioContent) {
        const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3')
        const audioUrl = URL.createObjectURL(audioBlob)
        
        const audio = new Audio(audioUrl)
        audioRef.current = audio
        
        audio.onended = () => {
          setIsSpeaking(false)
          onEnd?.()
          URL.revokeObjectURL(audioUrl)
        }
        
        audio.onerror = () => {
          console.error('Audio playback error');
          setIsSpeaking(false)
          onEnd?.()
          URL.revokeObjectURL(audioUrl)
          // NO FALLBACK - just stop
        }
        
        await audio.play().catch((error) => {
          console.error('Audio play failed:', error);
          setIsSpeaking(false)
          onEnd?.()
          // NO FALLBACK - just stop
        })
      } else {
        console.error('TTS API failed');
        setIsSpeaking(false)
        onEnd?.()
        // NO FALLBACK - just stop
      }

    } catch (error) {
      console.error('TTS error:', error)
      setIsSpeaking(false)
      onEnd?.()
      // NO FALLBACK - just stop
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  return {
    isSpeaking,
    speak,
    stopSpeaking
  }
}