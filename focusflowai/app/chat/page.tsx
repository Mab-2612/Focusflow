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

const MAX_MESSAGES = 50; 

export default function ChatPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  
  // --- STATE ---
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTtsEnabled, setIsTtsEnabled] = useState(true) 
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // --- REFS ---
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null); 

  // --- HOOKS ---
  const { speak, stopSpeaking } = useGoogleTTS()
  const { processVoiceCommand } = useVoiceAssistant() // FIXED: Removed underscore
  
  const CHAT_HISTORY_KEY = user ? `chatHistory_${user.id}` : null;

  // Load chat history from sessionStorage
  useEffect(() => {
    if (CHAT_HISTORY_KEY) {
      const storedHistory = sessionStorage.getItem(CHAT_HISTORY_KEY);
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory).map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp) 
        }));
        setMessages(parsedHistory);
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [CHAT_HISTORY_KEY]);

  // Save chat history to sessionStorage
  useEffect(() => {
    if (CHAT_HISTORY_KEY) {
      if (messages.length > 0) {
        sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      } else {
        sessionStorage.removeItem(CHAT_HISTORY_KEY);
      }
    }
  }, [messages, CHAT_HISTORY_KEY]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Auto-focus input on page load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Re-focus input after assistant finishes replying
  useEffect(() => {
    if (!isProcessing) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100); // Small delay to ensure UI is ready
      return () => clearTimeout(timer);
    }
  }, [isProcessing]);


  // --- HANDLERS ---
  const addMessage = (message: Message) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      if (newMessages.length > MAX_MESSAGES) {
        return newMessages.slice(newMessages.length - MAX_MESSAGES);
      }
      return newMessages;
    });
  };

  const handleUserMessage = async (content: string) => {
    if (!content.trim() || isProcessing || !user) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content,
      timestamp: new Date()
    }
    
    addMessage(userMessage);
    setInputText('')
    setIsProcessing(true)

    // Re-focus input immediately after send for mobile keyboard
    inputRef.current?.focus();

    try {
      const response = await processVoiceCommand(content)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      }
      
      addMessage(assistantMessage); 
      
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
      addMessage(errorMessage);
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
    setShowClearConfirm(true);
  }
  
  const handleConfirmClear = () => {
    setMessages([])
    if (CHAT_HISTORY_KEY) {
      sessionStorage.removeItem(CHAT_HISTORY_KEY);
    }
    stopSpeaking()
    setShowClearConfirm(false);
  }

  // --- STYLES ---
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)', 
  }

  const headerStyle = {
    backgroundColor: 'var(--bg-primary)',
    borderBottom: `1px solid var(--border-light)`,
    padding: '16px 24px',
    paddingTop: 'max(16px, env(safe-area-inset-top))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0
  }

  const titleStyle = {
    fontSize: 'var(--font-lg)',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
    textAlign: 'center' as const,
    flex: 1, 
  }

  const chatContainerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px',
    width: '100%',
  }

  const messagesStyle = {
    paddingTop: '20px',
    paddingBottom: '200px', // Space for both input and navbar
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  }

  const floatingInputContainerStyle = {
    position: 'fixed' as const,
    bottom: '80px', // Sits just above the 80px navbar
    left: '0',
    right: '0',
    padding: '16px 24px',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
    backgroundColor: 'var(--bg-primary)',
    background: `linear-gradient(to top, var(--bg-primary) 70%, transparent 100%)`,
  }

  const textInputWrapperStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    border: `1px solid var(--border-light)`,
    borderRadius: '24px', 
    backgroundColor: 'var(--bg-secondary)', 
    paddingLeft: '16px',
    paddingRight: '6px',
    minHeight: '48px', 
    maxWidth: '800px',
    margin: '0 auto', 
    boxShadow: 'var(--shadow-md)',
  }
  
  const textInputStyle = {
    flex: 1,
    padding: '12px 0',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '16px',
    outline: 'none', 
  }

  const sendButtonStyle = {
    padding: '8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '50%', 
    cursor: 'pointer',
    width: '40px', 
    height: '40px', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px', 
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
    flexShrink: 0 
  }
  
  const clearChatButtonStyle = {
    fontSize: '12px',
    fontWeight: '500',
    color: theme === 'dark' ? '#f87171' : '#ef4444', 
    width: 'auto',
    padding: '4px 12px',
    border: `1px solid var(--border-light)`,
    borderRadius: '6px',
    backgroundColor: 'var(--bg-tertiary)',
    margin: '0 auto', 
    display: 'block',
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
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

        <h1 style={titleStyle}>FocusFlow Chat</h1>
        
        <div style={{ ...headerButtonStyle, visibility: 'hidden', pointerEvents: 'none' }} />
      </header>

      {/* Chat Container */}
      <div 
        className="page-container"
        style={chatContainerStyle}
      >
        {/* Messages */}
        <div style={messagesStyle} className="chat-messages">
          
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
              <h2 style={{ color: 'var(--text-primary)', fontSize: 'var(--font-lg)', marginBottom: '8px' }}>
                {user ? "Ask me anything!" : "Please Sign In"}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', textAlign: 'center' }}>
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

          {/* Clear Chat Button (now inside message area) */}
          {messages.length > 0 && (
            <div style={{ paddingTop: '8px', paddingBottom: '8px' }}>
              <button
                onClick={clearChat}
                style={clearChatButtonStyle}
                title="Clear Chat"
              >
                Clear Conversation
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Input Bar */}
      <div style={floatingInputContainerStyle}>
        <form onSubmit={handleTextSubmit}>
          <div style={textInputWrapperStyle}>
            <input
              type="text"
              ref={inputRef} 
              autoFocus={true} 
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
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                  }}
                /> : 
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              }
            </button>
          </div>
        </form>
      </div>
      
      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="chat-confirm-modal">
            <h2 className="chat-confirm-title">Clear Conversation?</h2>
            <p className="chat-confirm-text">
              Are you sure you want to delete all messages? This action cannot be undone.
            </p>
            <div className="chat-confirm-buttons">
              <button
                className="chat-confirm-button chat-confirm-button-cancel"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="chat-confirm-button chat-confirm-button-danger"
                onClick={handleConfirmClear}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  )
}