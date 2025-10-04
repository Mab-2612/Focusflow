"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSpeechRecognition } from './useSpeechRecognition'
import { useGoogleTTS } from './useGoogleTTS'
import { useVoiceAssistant } from './useVoiceAssistant'
import { useAuth } from './useAuth'

export const useGlobalVoice = () => {
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [isAwake, setIsAwake] = useState(false)
  const { user } = useAuth()
  
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
  } = useSpeechRecognition()

  const { speak } = useGoogleTTS()
  const { processVoiceCommand } = useVoiceAssistant()

  // Only activate voice if user is logged in
  useEffect(() => {
    if (!user) {
      setIsVoiceActive(false)
      setIsAwake(false)
      stopListening()
    }
  }, [user, stopListening])

  // Wake word detection
  useEffect(() => {
    if (transcript && !isAwake && user) {
      const lowerTranscript = transcript.toLowerCase()
      const wakeWords = ['focusflow', 'hey focus', 'hello focus', 'wake up', 'assistant']
      
      if (wakeWords.some(word => lowerTranscript.includes(word))) {
        setIsAwake(true)
        speak("Hello! I'm here. How can I help you?")
        startListening()
      }
    }
  }, [transcript, isAwake, user, speak, startListening])

  // Process commands when awake
  useEffect(() => {
    if (isAwake && transcript && !isListening && user) {
      processVoiceCommand(transcript).then(response => {
        if (response !== '[STOPPED]') {
          speak(response)
        }
      })
      setIsAwake(false)
    }
  }, [isAwake, transcript, isListening, user, processVoiceCommand, speak])

  const activateVoice = useCallback(() => {
    if (!user) return
    setIsVoiceActive(true)
    startListening()
  }, [user, startListening])

  const deactivateVoice = useCallback(() => {
    setIsVoiceActive(false)
    setIsAwake(false)
    stopListening()
  }, [stopListening])

  return {
    isVoiceActive,
    isAwake,
    activateVoice,
    deactivateVoice,
    transcript
  }
}