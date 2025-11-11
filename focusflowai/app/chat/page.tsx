//app/chat/page.tsx
"use client"

import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar' // This should be removed if it's in layout.tsx
import { useGoogleTTS } from '@/hooks/useGoogleTTS'
import { useAuth } from '@/hooks/useAuth'
import { useSidebar } from '@/contexts/SidebarContext'
import { supabase } from '@/lib/supabase/client'
import { type User } from '@supabase/supabase-js'

// --- Types ---
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  messageId: string | null;
  messageContent: string;
  messageRole: 'user' | 'assistant';
}

const MAX_MESSAGES = 100;

// --- Helper Functions ---
function parseMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\* (.*$)/gm, '<ul><li>$1</li></ul>')
    .replace(/<\/ul>\n<ul>/gm, '')
}

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
  
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    messageId: null,
    messageContent: '',
    messageRole: 'user'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null); 
  const tempMessageIdRef = useRef<string | null>(null);

  const { speak, stopSpeaking } = useGoogleTTS()
  
  // --- DATA FETCHING & REALTIME ---

  const fetchHistory = async (currentUser: User) => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(MAX_MESSAGES);

      if (error) {
        console.error('Error fetching chat history:', error);
      } else if (data) {
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at)
        })).reverse();
        setMessages(formattedMessages);
      }
    } catch (e) {
      console.error('Catastrophic error fetching history:', e);
    } finally {
      // FIXED: This ensures the loading screen *always* goes away
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory(user);
    } else {
      setMessages([]);
      setIsLoadingHistory(false);
    }
  }, [user]);

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
          setMessages(prev => {
            if (prev.find(msg => msg.id === newMessage.id)) return prev;

            if (newMessage.role === 'user' && tempMessageIdRef.current && prev.find(m => m.id === tempMessageIdRef.current)) {
              return prev.map(msg => 
                msg.id === tempMessageIdRef.current
                  ? {
                      id: newMessage.id,
                      role: newMessage.role,
                      content: newMessage.content,
                      timestamp: new Date(newMessage.created_at)
                    }
                  : msg
              );
            } else {
              return [
                ...prev,
                {
                  id: newMessage.id,
                  role: newMessage.role,
                  content: newMessage.content,
                  timestamp: new Date(newMessage.created_at)
                }
              ].slice(-MAX_MESSAGES);
            }
          });
          
          if (newMessage.role === 'user') {
            tempMessageIdRef.current = null;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages]);
  
  useEffect(() => {
    if (!isProcessing) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isProcessing, messages]);
  
  useEffect(() => {
    const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
    if (contextMenu.visible) {
      window.addEventListener('click', handleClick);
    }
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  // --- HANDLERS ---
  const addMessage = (message: Message) => {
    setMessages(prev => {
      return [...prev, message].slice(-MAX_MESSAGES);
    });
  };

  const handleUserMessage = async (content: string) => {
    if (!content.trim() || isProcessing || !user) return

    setInputText('')
    setIsProcessing(true)
    
    tempMessageIdRef.current = `temp_${Date.now()}`
    const userMessage: Message = {
      id: tempMessageIdRef.current,
      role: 'user',
      content: content,
      timestamp: new Date()
    }
    addMessage(userMessage);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const response = await fetch('/api/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: content, 
          user_id: user.id,
          timezone: timezone
        })
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'API request failed');
      }
      
      const assistantResponse = result.response;
      
      if (isTtsEnabled) {
        await speak(assistantResponse, () => {})
      }
      
      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date()
      };
      addMessage(aiMessage);

    } catch (error) {
      console.error('Error processing message:', error)
      if (tempMessageIdRef.current) {
        setMessages(prev => prev.filter(msg => msg.id !== tempMessageIdRef.current));
        tempMessageIdRef.current = null;
      }
      const errorMessage: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
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
  
  const handleConfirmClear = async () => {
    if (!user) return;
    setMessages([])
    setShowClearConfirm(false);
    stopSpeaking()
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id);
    if (error) {
      console.error('Error clearing chat history:', error);
      fetchHistory(user);
    }
  }
  
  const handleShowMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      messageId: message.id,
      messageContent: message.content,
      messageRole: message.role
    });
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(contextMenu.messageContent);
  };
  const handleEdit = () => {
    setInputText(contextMenu.messageContent);
    inputRef.current?.focus();
  };

  // --- STYLES ---
  const containerStyle = {
    backgroundColor: 'var(--bg-primary)',
  }
  const headerStyle = {
    backgroundColor: 'var(--bg-primary)',
    borderBottom: `1px solid var(--border-light)`,
    padding: '12px 16px',
    paddingTop: 'max(12px, env(safe-area-inset-top))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0
  }
  const titleStyle = {
    fontSize: 'var(--font-lg)',
    fontWeight: '600',
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
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden'
  }
  const messagesStyle = {
    paddingTop: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  }
  const floatingInputContainerStyle = {
    position: 'sticky' as const,
    bottom: '80px',
    left: '0',
    right: '0',
    padding: '16px 24px 8px 24px',
    paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
    backgroundColor: 'var(--bg-primary)',
    background: `linear-gradient(to top, var(--bg-primary) 80px, transparent 100%)`,
    zIndex: 999,
    flexShrink: 0
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
  const clearChatContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    paddingBottom: '12px',
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
  const contextMenuStyle = {
    position: 'fixed' as const,
    top: `${contextMenu.y}px`,
    left: `${contextMenu.x}px`,
    zIndex: 1012,
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-light)',
    padding: '8px',
    animation: 'fadeIn 0.1s ease-out'
  }

  return (
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

      <div 
        className="page-container chat-messages-wrapper"
        style={chatContainerStyle}
      >
        <div style={messagesStyle} >
          
          {(isLoadingHistory && messages.length === 0) && (
            <div className="chat-welcome-message">
              <div className="animate-spin" style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              Loading chat history...
            </div>
          )}

          {(!isLoadingHistory && messages.length === 0) && (
            <div className="chat-welcome-message">
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
              onContextMenu={(e) => handleShowMenu(e, message)}
            >
              <div 
                className="chat-message-content" 
                dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }} 
              />
              <div className="message-timestamp">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div style={floatingInputContainerStyle}> 
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
      
      {contextMenu.visible && (
        <div style={contextMenuStyle}>
          <button className="context-menu-button" onClick={handleCopy}>
            Copy Text
          </button>
          {contextMenu.messageRole === 'user' && (
            <button className="context-menu-button" onClick={handleEdit}>
              Edit & Resend
            </button>
          )}
        </div>
      )}

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

      {/* Navbar is in layout.tsx */}
    </div>
  )
}