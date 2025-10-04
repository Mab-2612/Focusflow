
"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useGoogleTTS } from '@/hooks/useGoogleTTS'
import { useAudioTones } from '@/hooks/useAudioTones'
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant'
import { useAuth } from '@/hooks/useAuth'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  
  // State management
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle')

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout>()
  const inactivityTimerRef = useRef<NodeJS.Timeout>()

  // Hooks
  const {
    transcript,
    isListening: speechListening,
    startListening,
    stopListening,
  } = useSpeechRecognition()

  const { speak, stopSpeaking } = useGoogleTTS()
  const { playStartTone, playStopTone } = useAudioTones()
  const { processVoiceCommand } = useVoiceAssistant()

  // Auto-start listening when page loads (if user is logged in)
  useEffect(() => {
    if (user) {
      // Auto-start listening after 2 seconds
      const timer = setTimeout(() => {
        startAutoListening()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [user])

  // Auto-stop after 10 seconds of inactivity
  useEffect(() => {
    if (isListening) {
      // Clear any existing timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
      
      // Set new timer for 10 seconds
      inactivityTimerRef.current = setTimeout(() => {
        if (isListening) {
          stopAutoListening()
          // Add a message indicating auto-stop
          const autoStopMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: "I stopped listening due to inactivity. Click the microphone to start again.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, autoStopMessage])
        }
      }, 10000) // 10 seconds
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [isListening, transcript])

  // Handle speech recognition results
  useEffect(() => {
    if (transcript && isListening) {
      // Reset inactivity timer when speech is detected
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = setTimeout(() => {
          stopAutoListening()
        }, 10000)
      }
      
      // Clear previous silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
      
      // Set new timer to process command after 1.5 seconds of silence
      silenceTimerRef.current = setTimeout(() => {
        handleUserMessage(transcript)
      }, 1500)
    }
  }, [transcript, isListening])

  const startAutoListening = () => {
    startListening()
    setIsListening(true)
    setConnectionStatus('listening')
    playStartTone()
    
    // Add welcome message if first time
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'assistant',
        content: "Hello! I'm listening. You can speak now or type your message.",
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }

  const stopAutoListening = () => {
    stopListening()
    setIsListening(false)
    setConnectionStatus('idle')
    playStopTone()
    
    // Clear timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
  }

  const handleUserMessage = async (content: string) => {
    if (!content.trim()) return

    // Stop listening while processing
    stopAutoListening()

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsProcessing(true)
    setConnectionStatus('processing')

    try {
      const response = await processVoiceCommand(content)
      
      if (response && response !== '[STOPPED]') {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response,
          timestamp: new Date()
        }
        
        setMessages(prev => [...prev, assistantMessage])
        setConnectionStatus('speaking')
        
        await speak(response, () => {
          setIsSpeaking(false)
          setConnectionStatus('idle')
          // Auto-restart listening after response
          setTimeout(() => {
            startAutoListening()
          }, 1000)
        })
        setIsSpeaking(true)
      }
    } catch (error) {
      console.error('Error processing message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setConnectionStatus('idle')
      // Auto-restart listening after error
      setTimeout(() => {
        startAutoListening()
      }, 1000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputText.trim()) {
      handleUserMessage(inputText.trim())
    }
  }

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening()
      setIsListening(false)
      setConnectionStatus('idle')
      playStopTone()
    } else {
      startListening()
      setIsListening(true)
      setConnectionStatus('listening')
      playStartTone()
    }
  }

  const clearChat = () => {
    setMessages([])
    stopSpeaking()
    stopListening()
    setIsListening(false)
    setConnectionStatus('idle')
  }

  // Theme-aware styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#0f0f0f' : '#ffffff',
    paddingBottom: '120px'
  }

  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8f9fa',
    borderBottom: theme === 'dark' ? '1px solid #2a2a2a' : '1px solid #e5e7eb',
    padding: '20px',
    textAlign: 'center' as const
  }

  const titleStyle = {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: theme === 'dark' ? '#ffffff' : '#1f2937',
    margin: '0'
  }

  const subtitleStyle = {
    fontSize: '1rem',
    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
    margin: '8px 0 0 0'
  }

  const chatContainerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    height: 'calc(100vh - 200px)',
    display: 'flex',
    flexDirection: 'column' as const
  }

  const messagesStyle = {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '10px',
    marginBottom: '20px'
  }

  const messageStyle = (type: 'user' | 'assistant') => ({
    backgroundColor: type === 'user' 
      ? (theme === 'dark' ? '#2563eb' : '#3b82f6')
      : (theme === 'dark' ? '#2a2a2a' : '#f3f4f6'),
    color: type === 'user' ? 'white' : (theme === 'dark' ? '#ffffff' : '#1f2937'),
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '12px',
    maxWidth: '70%',
    alignSelf: type === 'user' ? 'flex-end' : 'flex-start',
    border: type === 'assistant' ? `1px solid ${theme === 'dark' ? '#3a3a3a' : '#e5e7eb'}` : 'none'
  })

  const inputContainerStyle = {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  }

  const textInputStyle = {
    flex: 1,
    padding: '12px 16px',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
    borderRadius: '12px',
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    color: theme === 'dark' ? '#ffffff' : '#1f2937',
    fontSize: '16px'
  }

  const voiceButtonStyle = {
    padding: '12px',
    backgroundColor: isListening ? '#ef4444' : '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px'
  }

  const sendButtonStyle = {
    padding: '12px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px'
  }

  const statusStyle = {
    textAlign: 'center' as const,
    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
    fontSize: '14px',
    marginTop: '10px'
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'listening': return '🎤 Listening... Speak now'
      case 'processing': return '⏳ Processing your message...'
      case 'speaking': return '🔊 Speaking...'
      default: return '💬 Ready to chat'
    }
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <h1 style={titleStyle}>FocusFlow Chat</h1>
        <p style={subtitleStyle}>Your AI productivity assistant - Voice and text chat</p>
      </header>

      {/* Chat Container */}
      <div style={chatContainerStyle}>
        {/* Messages */}
        <div style={messagesStyle}>
          {messages.map((message) => (
            <div key={message.id} style={messageStyle(message.type)}>
              <div>{message.content}</div>
              <div style={{
                fontSize: '12px',
                opacity: 0.7,
                marginTop: '8px',
                textAlign: message.type === 'user' ? 'right' : 'left'
              }}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleTextSubmit} style={inputContainerStyle}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message or use voice..."
            style={textInputStyle}
            disabled={isProcessing}
          />
          
          <button
            type="button"
            onClick={toggleVoiceInput}
            style={voiceButtonStyle}
            disabled={isProcessing}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? '🛑' : '🎤'}
          </button>
          
          <button
            type="submit"
            style={sendButtonStyle}
            disabled={!inputText.trim() || isProcessing}
          >
            Send
          </button>
        </form>

        {/* Status */}
        <div style={statusStyle}>
          {getStatusText()}
        </div>

        {/* Clear Chat Button */}
        {messages.length > 1 && (
          <button
            onClick={clearChat}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
              border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Clear Chat
          </button>
        )}
      </div>

      <Navbar />
    </div>
  )
}