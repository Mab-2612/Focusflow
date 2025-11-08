// hooks/useSpeechRecognition.ts
"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const isStartedRef = useRef(false)
  const interimTranscriptRef = useRef('')
  const [isClient, setIsClient] = useState(false)
  const noSpeechTimeoutRef = useRef<NodeJS.Timeout>()

  // Set client state
  useEffect(() => {
    setIsClient(true)
  }, [])

  const initializeRecognition = useCallback(() => {
    if (!isClient) return null

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.error('Speech Recognition API not supported')
      setError('Speech recognition not supported in this browser')
      return null
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      // Clear no-speech timeout when speech is detected
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current)
      }
      
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
        setError(null) // Clear any previous errors
      }
    }

    recognition.onend = () => {
      isStartedRef.current = false
      setIsListening(false)
      // Clear timeout on natural end
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      isStartedRef.current = false
      setIsListening(false)
      setIsProcessing(false)
      
      // Handle specific error types
      switch (event.error) {
        case 'no-speech':
          // This is a normal case, not a real error
          setError('no-speech')
          break
        case 'audio-capture':
          setError('Microphone not available')
          break
        case 'not-allowed':
          setError('Microphone permission denied')
          break
        case 'network':
          setError('Network error occurred')
          break
        default:
          setError('Speech recognition error: ' + event.error)
      }
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
      setError(null)
      
      // Set timeout for no-speech detection
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (isStartedRef.current) {
          // This will trigger the 'no-speech' error naturally
          recognition.stop()
        }
      }, 5000) // 5 seconds without speech
      
    } catch (error) {
      console.error('Failed to start recognition:', error)
      setError('Failed to start speech recognition')
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
      
      // Clear timeout when manually stopping
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current)
      }
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current)
      }
    }
  }, [stopListening])

  return {
    transcript,
    isListening,
    isProcessing,
    error,
    startListening,
    stopListening,
    setIsProcessing,
    checkWakeWords,
    interimTranscript: interimTranscriptRef.current
  }
}