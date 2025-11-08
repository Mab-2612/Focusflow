//app/chat/page.tsx
"use client"

import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { useGoogleTTS } from '@/hooks/useGoogleTTS'
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant'
import { useAuth } from '@/hooks/useAuth'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const MAX_MESSAGES = 50; // Set the message limit

export default function ChatPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  
  // --- STATE ---
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTtsEnabled, setIsTtsEnabled] = useState(true) // Voice output toggle

  // --- REFS ---
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // --- HOOKS ---
  const { speak, stopSpeaking } = useGoogleTTS()
  const { processVoiceCommand } = useVoiceAssistant()

  // Add initial welcome message
  useEffect(() => {
    setMessages([]) // Start fresh
  }, [user]) // Re-run if user logs in

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Helper function to add a message and enforce history limit
  const addMessage = (message: Message) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      if (newMessages.length > MAX_MESSAGES) {
        // Remove the oldest message (at index 0)
        return newMessages.slice(newMessages.length - MAX_MESSAGES);
      }
      return newMessages;
    });
  };

  // --- HANDLERS ---
  const handleUserMessage = async (content: string) => {
    if (!content.trim() || isProcessing || !user) return

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content,
      timestamp: new Date()
    }
    
    addMessage(userMessage); // Use the new function
    setInputText('')
    setIsProcessing(true)

    try {
      // Get response from the assistant hook
      const response = await processVoiceCommand(content)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      }
      
      addMessage(assistantMessage); // Use the new function
      
      // Speak the response if TTS is enabled
      if (isTtsEnabled) {
        await speak(response, () => {})
      }

    } catch (error) {
      console.error('Error processing message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }
      addMessage(errorMessage); // Use the new function
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleUserMessage(inputText.trim())
  }

  const toggleTts = () => {
    if (isTtsEnabled) {
      stopSpeaking()
    }
    setIsTtsEnabled(!isTtsEnabled)
  }

  const clearChat = () => {
    // FIXED: Add confirmation prompt
    if (window.confirm("Are you sure you want to clear this conversation?")) {
      setMessages([])
      stopSpeaking()
    }
  }

  // --- STYLES ---
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#0f0f0f' : '#f9fafb', // Lighter dark bg
    paddingBottom: '80px', // Make space for the new nav bar
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh' // Full viewport height
  }

  const headerStyle = {
    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
    borderBottom: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
    padding: '16px 24px',
    paddingTop: 'max(16px, env(safe-area-inset-top))', // Respect notch
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0
  }

  const titleStyle = {
    fontSize: 'var(--font-lg)', // Use fluid typography
    fontWeight: '700',
    color: theme === 'dark' ? '#ffffff' : '#1f2937',
    margin: 0
  }

  const chatContainerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px', // No vertical padding, handled by parent
    width: '100%',
    flex: 1, // Make chat container fill remaining space
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden' // Prevent container from overflowing
  }

  const messagesStyle = {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '20px 4px', // Add a little horizontal padding for bubbles
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  }

  // FIXED: Sleek new input bar styles
  const inputContainerStyle = {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    padding: '16px 0',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
    borderTop: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff', // Match header
  }

  const textInputWrapperStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
    borderRadius: '24px', // Rounded pill shape
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    paddingLeft: '16px',
    paddingRight: '8px',
  }
  
  const textInputStyle = {
    flex: 1,
    padding: '12px 0',
    border: 'none',
    backgroundColor: 'transparent',
    color: theme === 'dark' ? '#ffffff' : '#1f2937',
    fontSize: '16px', // Ensure 16px to prevent mobile zoom
    height: '48px',
    outline: 'none', // Remove outline on focus
  }

  const sendButtonStyle = {
    padding: '8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '50%', // Circular button
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
    opacity: (isProcessing || !inputText.trim()) ? 0.6 : 1,
    transition: 'all 0.2s ease'
  }
  
  const headerButtonStyle = {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  }
  
  // FIXED: Style for the "Clear Chat" button
  const clearButtonStyle = {
    ...headerButtonStyle,
    fontSize: '14px',
    fontWeight: '500',
    color: theme === 'dark' ? '#f87171' : '#ef4444', // Red color
    width: 'auto'
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <button
          onClick={clearChat}
          style={clearButtonStyle}
          title="Clear Chat"
        >
          Clear
        </button>
        <h1 style={titleStyle}>FocusFlow Chat</h1>
        <button
          onClick={toggleTts}
          style={{
            ...headerButtonStyle, 
            color: isTtsEnabled ? (theme === 'dark' ? '#60a5fa' : '#3b82f6') : (theme === 'dark' ? '#9ca3af' : '#6b7280')
          }}
          title={isTtsEnabled ? 'Disable Voice Output' : 'Enable Voice Output'}
        >
          {isTtsEnabled ? '🔊' : '🔇'}
        </button>
      </header>

      {/* Chat Container */}
      <div 
        className="page-container"
        style={chatContainerStyle}
      >
        {/* Messages */}
        <div style={messagesStyle} className="chat-messages">
          
          {/* FIXED: Show welcome message if chat is blank */}
          {messages.length === 0 && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme === 'dark' ? '#4b5563' : '#d1d5db'
            }}>
              <span style={{ fontSize: '64px', marginBottom: '16px' }}>💬</span>
              <h2 style={{ color: theme === 'dark' ? '#f3f4f6' : '#1f2937', fontSize: 'var(--font-lg)', marginBottom: '8px' }}>
                {user ? "Ask me anything!" : "Please Sign In"}
              </h2>
              <p style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 'var(--font-sm)', textAlign: 'center' }}>
                {user ? "I can help you add tasks, navigate the app, or answer questions." : "Sign in to start a conversation."}
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message-bubble ${message.type === 'user' ? 'message-user' : 'message-assistant'}`}
            >
              <div>{message.content}</div>
              <div className="message-timestamp">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* FIXED: New Input Bar Design (Voice Input removed) */}
        <form onSubmit={handleTextSubmit} style={inputContainerStyle}>
          <div style={textInputWrapperStyle}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={user ? "Type your message..." : "Please sign in to chat"}
              style={textInputStyle}
              disabled={isProcessing || !user}
            />
            <button
              type="submit"
              style={sendButtonStyle}
              disabled={!inputText.trim() || isProcessing || !user}
              title="Send Message"
            >
              {isProcessing ? 
                <div 
                  className="animate-spin"
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                  }}
                /> : 
                // FIXED: SVG Send Icon (like the image)
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              }
            </button>
          </div>
        </form>
      </div>

      <Navbar />
    </div>
  )
}