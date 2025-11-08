// hooks/useEnhancedSpeechSynthesis.ts
"use client"

import { useState, useRef, useCallback, useEffect } from 'react'

interface VoiceSettings {
  rate?: number
  pitch?: number
  volume?: number
  voice?: SpeechSynthesisVoice
}

export const useEnhancedSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      setAvailableVoices(voices)
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  // Process text to handle emojis and add emotional pauses
  const processText = (text: string): string => {
    // Replace emojis with descriptive text
    const emojiMap: { [key: string]: string } = {
      '😂': ' laughing out loud ',
      '😄': ' smiling ',
      '😊': ' happily ',
      '🥰': ' lovingly ',
      '😍': ' admiringly ',
      '🤩': ' excitedly ',
      '😎': ' coolly ',
      '🥳': ' celebrating ',
      '😢': ' sadly ',
      '😭': ' crying ',
      '😡': ' angrily ',
      '🤯': ' amazingly ',
      '🥺': ' pleadingly ',
      '❤️': ' with love ',
      '🔥': ' on fire ',
      '⭐': ' star ',
      '🎯': ' bullseye ',
      '🚀': ' rocket ',
      '💡': ' lightbulb ',
      '🤖': ' robot ',
      '👏': ' clapping ',
      '🙌': ' raising hands ',
      '👍': ' thumbs up ',
      '👎': ' thumbs down ',
      '💪': ' flexing ',
    }

    let processed = text
    Object.entries(emojiMap).forEach(([emoji, description]) => {
      processed = processed.replace(new RegExp(emoji, 'g'), description)
    })

    // Add pauses for punctuation
    processed = processed
      .replace(/\./g, '. ... ')
      .replace(/\?/g, '? ... ')
      .replace(/!/g, '! ... ')
      .replace(/,/g, ', , ')

    return processed
  }

  const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
    // Prefer Google and natural-sounding voices
    const preferredVoices = availableVoices.filter(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Samantha') ||
      voice.name.includes('Karen') ||
      voice.name.includes('Daniel') ||
      voice.name.includes('Microsoft David') ||
      voice.name.includes('Microsoft Zira')
    )

    return preferredVoices.length > 0 ? preferredVoices[0] : availableVoices[0] || null
  }, [availableVoices])

  const speak = useCallback((text: string, onEnd?: () => void, settings?: VoiceSettings) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported')
      onEnd?.()
      return
    }

    // Stop any current speech
    window.speechSynthesis.cancel()

    const processedText = processText(text)
    const utterance = new SpeechSynthesisUtterance(processedText)
    
    // Apply settings or defaults
    utterance.rate = settings?.rate ?? 1.1 // Slightly faster for more energy
    utterance.pitch = settings?.pitch ?? 1.1 // Slightly higher for more expressiveness
    utterance.volume = settings?.volume ?? 0.9
    
    // Use the best available voice
    const voice = settings?.voice || getBestVoice()
    if (voice) {
      utterance.voice = voice
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      onEnd?.()
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
      onEnd?.()
    }

    synthesisRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [getBestVoice])

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  const setVoice = useCallback((voiceName: string) => {
    const voice = availableVoices.find(v => v.name === voiceName)
    return voice || null
  }, [availableVoices])

  return {
    isSpeaking,
    speak,
    stopSpeaking,
    setVoice,
    availableVoices
  }
}