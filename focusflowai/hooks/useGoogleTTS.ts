// hooks/useGoogleTTS.ts
"use client"

import { useState, useCallback, useRef } from 'react'

export const useGoogleTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    if (!text || text === '[STOPPED]' || text.trim() === '' || typeof window === 'undefined') {
      onEnd?.();
      return;
    }

    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported in this browser.');
      onEnd?.();
      return;
    }

    // Stop any current speech
    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Basic configuration
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      
      // Try to find a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || 
                             voices.find(v => v.lang.startsWith('en-US')) || 
                             voices.find(v => v.lang.startsWith('en'));
                             
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
        onEnd?.();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setIsSpeaking(false);
        utteranceRef.current = null;
        onEnd?.();
      };
      
      window.speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('TTS error:', error)
      setIsSpeaking(false)
      onEnd?.();
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (utteranceRef.current) {
      utteranceRef.current.onend = null; // Prevent onEnd from firing
    }
    setIsSpeaking(false)
  }, [])

  return {
    isSpeaking,
    speak,
    stopSpeaking
  }
}