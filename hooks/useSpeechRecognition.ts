"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const recognitionRef = useRef<any>(null)
  const isStartedRef = useRef(false)
  const interimTranscriptRef = useRef('')
  const [isClient, setIsClient] = useState(false)

  // Set client state
  useEffect(() => {
    setIsClient(true)
  }, [])

  const initializeRecognition = useCallback(() => {
    if (!isClient) return null

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.error('Speech Recognition API not supported')
      return null
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      interimTranscriptRef.current = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        } else {
          interimTranscriptRef.current += event.results[i][0].transcript
        }
      }
      
      if (finalTranscript) {
        setTranscript(finalTranscript)
        setIsProcessing(true)
        interimTranscriptRef.current = ''
      }
    }

    recognition.onend = () => {
      isStartedRef.current = false
      setIsListening(false)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      isStartedRef.current = false
      setIsListening(false)
      setIsProcessing(false)
    }

    recognitionRef.current = recognition
    return recognition
  }, [isClient])

  const startListening = useCallback(() => {
    if (isStartedRef.current) return

    const recognition = initializeRecognition()
    if (!recognition) return
    
    try {
      recognition.start()
      isStartedRef.current = true
      setIsListening(true)
      setIsProcessing(false)
      setTranscript('')
    } catch (error) {
      console.error('Failed to start recognition:', error)
    }
  }, [initializeRecognition])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isStartedRef.current) return
    
    try {
      recognitionRef.current.stop()
      isStartedRef.current = false
      setIsListening(false)
      setIsProcessing(false)
      setTranscript('')
      interimTranscriptRef.current = ''
    } catch (error) {
      console.error('Failed to stop recognition:', error)
    }
  }, [])

  // Check for wake words in interim transcript
  const checkWakeWords = useCallback(() => {
    const lowerTranscript = interimTranscriptRef.current.toLowerCase()
    const wakeWords = ['hello', 'hey', 'hi', 'wake up', 'focusflow']
    
    return wakeWords.some(word => lowerTranscript.includes(word))
  }, [])

  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  return {
    transcript,
    isListening,
    isProcessing,
    startListening,
    stopListening,
    setIsProcessing,
    checkWakeWords,
    interimTranscript: interimTranscriptRef.current
  }
}