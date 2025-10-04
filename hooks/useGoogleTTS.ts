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

  // Fallback to browser speech synthesis
  const fallbackSpeak = (text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not available');
      onEnd?.();
      return;
    }

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
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

      // Check if response is OK
      if (!response.ok) {
        throw new Error(`TTS API returned ${response.status}`);
      }

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
          // Try fallback
          fallbackSpeak(text, onEnd);
        }
        
        await audio.play().catch((error) => {
          console.error('Audio play failed:', error);
          setIsSpeaking(false)
          onEnd?.()
          // Try fallback
          fallbackSpeak(text, onEnd);
        })
      } else {
        console.error('TTS API failed:', data.error);
        // Use fallback
        fallbackSpeak(text, onEnd);
      }

    } catch (error) {
      console.error('TTS error, using fallback:', error)
      setIsSpeaking(false)
      // Use browser fallback
      fallbackSpeak(text, onEnd);
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    // Stop Google TTS
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    // Stop browser synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false)
  }, [])

  return {
    isSpeaking,
    speak,
    stopSpeaking
  }
}