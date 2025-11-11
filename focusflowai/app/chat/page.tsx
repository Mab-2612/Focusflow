//app/chat/page.tsx
"use client"

import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { useGoogleTTS } from '@/hooks/useGoogleTTS'
import { useAuth } from '@/hooks/useAuth'
import { useSidebar } from '@/contexts/SidebarContext'
import { supabase } from '@/lib/supabase/client'
import { type User } from '@supabase/supabase-js'

interface Message {
  id: string
  role: 'user' | 'assistant' // Changed from 'type' to 'role'
  content: string
  timestamp: Date
}

const MAX_MESSAGES = 100; // Updated limit

export default function ChatPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const { toggleSidebar } = useSidebar()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTtsEnabled, setIsTtsEnabled] = useState(true) 
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null); 

  const { speak, stopSpeaking } = useGoogleTTS()
  
  // --- DATA FETCHING & REALTIME ---

  // Fetch initial chat history from database
  const fetchHistory = async (currentUser: User) => {
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(MAX_MESSAGES); // Get the 100 most recent

    if (error) {
      console.error('Error fetching chat history:', error);
    } else if (data) {
      // Map to local state format and reverse to show oldest first
      const formattedMessages = data.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at)
      })).reverse(); // Reverse to get chronological order
      setMessages(formattedMessages);
    }
    setIsLoadingHistory(false);
  };

  // Load history on user load
  useEffect(() => {
    if (user) {
      fetchHistory(user);
    } else {
      setMessages([]); // Clear messages if no user
      setIsLoadingHistory(false);
    }
  }, [user]);

  // Real-time subscription for cross-device sync
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:chat_messages')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages', 
          filter: `user_id=eq.${user.id}` 
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Add the new message to state, but check for duplicates
          setMessages(prev => {
            // Check if message ID already exists
            if (prev.find(msg => msg.id === newMessage.id)) {
              return prev;
            }
            // Add the new message
            return [
              ...prev,
              {
                id: newMessage.id,
                role: newMessage.role,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at)
              }
            ].slice(-MAX_MESSAGES); // Enforce max length
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages]);
  
  // Auto-focus input
  useEffect(() => {
    if (!isProcessing) {
      inputRef.current?.focus();
    }
  }, [isProcessing]);


  // --- HANDLERS ---

  const handleUserMessage = async (content: string) => {
    if (!content.trim() || isProcessing || !user) return

    setInputText('')
    setIsProcessing(true)
    
    // Optimistically add user message to UI
    const tempId = `temp_${Date.now()}`
    const userMessage: Message = {
      id: tempId,
      role: 'user',
      content: content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage].slice(-MAX_MESSAGES));

    try {
      // Send to API route (which saves both user & assistant messages)
      const response = await fetch('/api/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, user_id: user.id })
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const { response: assistantResponse } = await response.json();
      
      // Speak the response if TTS is enabled
      if (isTtsEnabled) {
        await speak(assistantResponse, () => {})
      }
      
      // Remove the optimistic message.
      // The realtime subscription will add *both* the real user message
      // and the assistant message from the database.
      setMessages(prev => prev.filter(msg => msg.id !== tempId));

    } catch (error) {
      console.error('Error processing message:', error)
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      // Show an error message
      const errorMessage: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage].slice(-MAX_MESSAGES));
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
  
  // Updated to delete from Supabase
  const handleConfirmClear = async () => {
    if (!user) return;
    
    // Optimistically clear UI
    setMessages([])
    setShowClearConfirm(false);
    stopSpeaking()

    // Call database deletion
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Error clearing chat history:', error);
      // If delete fails, reload the history
      fetchHistory(user);
    }
  }

  // --- STYLES ---
  const containerStyle = {
    // This class handles the 100dvh height
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
    flex: 1, // Let this grow
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden' // Hide overflow
  }

  const messagesStyle = {
    // This class handles scrolling
    paddingTop: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  }

  const floatingInputContainerStyle = {
    position: 'fixed' as const,
    bottom: '80px', // Sits above the 80px navbar
    left: '0',
    right: '0',
    padding: '16px 24px 8px 24px', // Less bottom padding
    paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
    backgroundColor: 'var(--bg-primary)',
    background: `linear-gradient(to top, var(--bg-primary) 70%, transparent 100%)`,
    zIndex: 999 // Below navbar, above content
  }

  const textInputWrapperStyle = {
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
  
  // FIXED: Style for sticky clear button
  const clearChatContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    paddingBottom: '8px',
    maxWidth: '800px',
    margin: '0 auto'
  }

  const clearChatButtonStyle = {
    fontSize: '12px',
    fontWeight: '500',
    color: theme === 'dark' ? '#f87171' : '#ef4444', 
    width: 'auto',
    padding: '4px 12px',
    border: `1px solid var(--border-light)`,
    borderRadius: '6px',
    backgroundColor: 'var(--bg-tertiary)'
  }

  return (
    // FIXED: Use className for layout
    <div style={containerStyle} className="chat-page-container">
      <header style={headerStyle} className="mobile-header">
        
        <button onClick={toggleSidebar} className="mobile-menu-button" title="Open menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
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
        style={chatContainerStyle}
        // FIXED: Remove className="page-container"
      >
        {/* Messages */}
        <div style={messagesStyle} className="chat-messages-wrapper">
          
          {(isLoadingHistory && messages.length === 0) && (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px' }}>
              <div className="animate-spin" style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              Loading chat history...
            </div>
          )}

          {(!isLoadingHistory && messages.length === 0) && (
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
              className={`message-bubble ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}
            >
              <div>{message.content}</div>
              <div className="message-timestamp">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Input Bar */}
      <div style={floatingInputContainerStyle}>
        {/* FIXED: Added sticky clear button */}
        {messages.length > 0 && (
          <div style={clearChatContainerStyle}>
            <button
              onClick={clearChat}
              style={clearChatButtonStyle}
              title="Clear Chat"
            >
              Clear Conversation
            </button>
          </div>
        )}
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