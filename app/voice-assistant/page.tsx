// app/voice-assistant/page.tsx
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
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Add this helper function to prevent hydration mismatch
const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

// Media query hook for responsiveness
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
};

export default function VoiceAssistantPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const [currentResponse, setCurrentResponse] = useState('')
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [isTextMode, setIsTextMode] = useState(false)
  const conversationEndRef = useRef<HTMLDivElement>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout>()
  const responseTimerRef = useRef<NodeJS.Timeout>()
  const idleTimerRef = useRef<NodeJS.Timeout>()
  const isClient = useIsClient();

  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')

  const {
    transcript,
    isListening,
    isProcessing: isRecognitionProcessing,
    startListening,
    stopListening,
    setIsProcessing: setRecognitionProcessing
  } = useSpeechRecognition()

  const { isSpeaking, speak, stopSpeaking } = useGoogleTTS()
  const { playStartTone, playStopTone } = useAudioTones()
  const { 
    isProcessing: isAssistantProcessing, 
    processVoiceCommand, 
    conversation, 
    clearConversation,
    addAssistantResponse 
  } = useVoiceAssistant()

  // Enhanced wake word detection
  useEffect(() => {
    if (transcript && hasUserInteracted) {
      const lowerTranscript = transcript.toLowerCase();
      const wakeWords = ['hello', 'hey', 'hi', 'focusflow', 'wake up', 'start listening', 'assistant'];
      
      const detectedWakeWord = wakeWords.find(word => 
        lowerTranscript.includes(word) && lowerTranscript.split(' ').length <= 4
      );

      if (detectedWakeWord && !isListening && !isSpeaking && !isAssistantProcessing) {
        console.log('Wake word detected:', detectedWakeWord);
        startListening();
        playStartTone();
        
        // Clear transcript to prevent processing the wake word as a command
        setTimeout(() => {
          setRecognitionProcessing(false);
        }, 100);
      }
    }
  }, [transcript, hasUserInteracted, isListening, isSpeaking, isAssistantProcessing, startListening, playStartTone, setRecognitionProcessing]);

  // Instant interruption handling
  useEffect(() => {
    if (transcript && (isSpeaking || currentResponse)) {
      const lowerTranscript = transcript.toLowerCase();
      
      // Check if user is trying to interrupt
      if (lowerTranscript.includes('stop') || lowerTranscript.includes('cancel') || 
          lowerTranscript.includes('enough') || transcript.length > 5) {
        
        abortEverything();
        
        // If it's not just a stop command, process the new command after a delay
        if (!lowerTranscript.includes('stop') && !lowerTranscript.includes('cancel') && !lowerTranscript.includes('enough')) {
          setTimeout(() => {
            processCommand(transcript);
          }, 300);
        }
      }
    }
  }, [transcript, isSpeaking, currentResponse]);

  // Process commands with 3-second delay
  useEffect(() => {
    if (transcript && isRecognitionProcessing && hasUserInteracted) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      
      silenceTimerRef.current = setTimeout(() => {
        processCommand(transcript);
      }, 3000);
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [transcript, isRecognitionProcessing, hasUserInteracted]);

  // Auto-scroll conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, currentResponse]);

  // Auto-return to idle after 10 seconds of inactivity
  useEffect(() => {
    if (isListening && !isSpeaking && !isAssistantProcessing) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      
      idleTimerRef.current = setTimeout(() => {
        if (isListening && !isSpeaking && !isAssistantProcessing) {
          stopListening()
          playStopTone()
          setRecognitionProcessing(false)
        }
      }, 10000)
    }

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [isListening, isSpeaking, isAssistantProcessing, stopListening, playStopTone, setRecognitionProcessing])

  // Cleanup
  useEffect(() => {
    return () => {
      stopListening()
      stopSpeaking()
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [stopListening, stopSpeaking])

  const processCommand = async (userCommand: string) => {
    const lowerCommand = userCommand.toLowerCase();
    
    // Handle stop command immediately
    if (lowerCommand.includes('stop')) {
      abortEverything();
      return;
    }

    abortEverything();
    
    const response = await processVoiceCommand(userCommand);
    
    // Check if response is stop command
    if (response === '[STOPPED]') {
      abortEverything();
      return;
    }

    let displayedText = '';
    const words = response.split(' ');
    let wordIndex = 0;

    const typeNextWord = () => {
      if (wordIndex < words.length) {
        displayedText += words[wordIndex] + ' ';
        setCurrentResponse(displayedText);
        wordIndex++;
        responseTimerRef.current = setTimeout(typeNextWord, 30);
      } else {
        // Add assistant response to conversation storage
        addAssistantResponse(displayedText);
        setCurrentResponse('');
        
        speak(displayedText, () => {
          setRecognitionProcessing(false);
          // Auto-restart listening after response
          setTimeout(() => {
            if (hasUserInteracted && !isTextMode) {
              startListening();
              playStartTone();
            }
          }, 1000);
        });
      }
    };

    typeNextWord();
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      processCommand(textInput.trim());
      setTextInput('');
    }
  };

  const abortEverything = () => {
    stopSpeaking();
    stopListening();
    setCurrentResponse('');
    setRecognitionProcessing(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    playStopTone();
  };

  const handleButtonClick = async () => {
    if (!hasUserInteracted) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
                setHasUserInteracted(true);
        startListening();
        playStartTone();
      } catch (error) {
        console.error('Microphone permission denied:', error);
        setHasUserInteracted(true); // Enable text mode
      }
      return;
    }

    if (isSpeaking || isAssistantProcessing) {
      abortEverything();
    } else if (isListening) {
      stopListening();
      playStopTone();
    } else {
      startListening();
      playStartTone();
    }
  };

  const toggleInputMode = () => {
    setIsTextMode(!isTextMode);
    if (!isTextMode) {
      abortEverything();
    }
  };

  const clearConversationHandler = () => {
    clearConversation();
    setCurrentResponse('');
  };

  // Don't render anything until client-side to prevent hydration mismatch
  if (!isClient) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme === 'dark' ? '#0f0f0f' : '#ffffff',
        padding: '0',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      }}>
        <Navbar />
      </div>
    );
  }

  // Responsive styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#0f0f0f' : '#ffffff',
    padding: '0',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif'
  }

  const headerStyle = {
    width: '100%',
    padding: isMobile ? '28px 16px' : '24px 20px',
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8f9fa',
    borderBottom: theme === 'dark' ? '1px solid #2a2a2a' : '1px solid #e5e7eb',
    textAlign: 'center' as const,
    minHeight: isMobile ? '100px' : '80px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center'
  }

  const titleStyle = {
    fontSize: isMobile ? '1.6rem' : '1.8rem',
    fontWeight: '700',
    color: theme === 'dark' ? '#ffffff' : '#1f2937',
    margin: '0',
    lineHeight: '1.3'
  }

  const subtitleStyle = {
    fontSize: isMobile ? '0.9rem' : '1rem',
    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
    margin: '8px 0 0 0',
    lineHeight: '1.4'
  }

  const mainContentStyle = {
    width: '100%',
    maxWidth: '800px',
    padding: isMobile ? '16px' : '20px',
    flex: '1',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: isMobile ? '16px' : '20px',
    paddingBottom: isMobile ? '100px' : '80px'
  }

  const conversationStyle = {
    flex: '1',
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
    borderRadius: '12px',
    border: theme === 'dark' ? '1px solid #2a2a2a' : '1px solid #e5e7eb',
    padding: isMobile ? '12px' : '16px',
    minHeight: isMobile ? '250px' : '280px',
    maxHeight: isMobile ? '350px' : '380px',
    overflowY: 'auto' as const
  }

  const inputContainerStyle = {
    display: 'flex',
    gap: isMobile ? '8px' : '12px',
    alignItems: 'center',
    marginTop: 'auto'
  }

  const textInputStyle = {
    flex: '1',
    padding: isMobile ? '14px' : '16px',
    borderRadius: '12px',
    border: theme === 'dark' ? '1px solid #3a3a3a' : '1px solid #d1d5db',
    backgroundColor: theme === 'dark' ? '#2a2a2a' : '#ffffff',
    color: theme === 'dark' ? '#ffffff' : '#1f2937',
    fontSize: isMobile ? '14px' : '16px',
    fontFamily: 'inherit'
  }

  const sendButtonStyle = {
    padding: isMobile ? '14px 20px' : '16px 24px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: 'white',
    cursor: 'pointer',
    fontSize: isMobile ? '14px' : '16px',
    fontWeight: '500'
  }

  const micButtonStyle = (isActive: boolean) => ({
    width: isMobile ? '50px' : '60px',
    height: isMobile ? '50px' : '60px',
    borderRadius: '50%',
    backgroundColor: isActive ? '#ef4444' : '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    transform: isActive ? 'scale(1.1)' : 'scale(1)'
  })

  const messageStyle = (type: 'user' | 'assistant') => ({
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '12px',
    maxWidth: '80%',
    alignSelf: type === 'user' ? 'flex-end' : 'flex-start',
    backgroundColor: type === 'user' 
      ? (theme === 'dark' ? '#2563eb' : '#3b82f6')
      : (theme === 'dark' ? '#2a2a2a' : '#f3f4f6'),
    color: type === 'user' ? 'white' : (theme === 'dark' ? '#ffffff' : '#1f2937'),
    border: type === 'assistant' ? (theme === 'dark' ? '1px solid #3a3a3a' : '1px solid #e5e7eb') : 'none'
  })

  const getButtonState = () => {
    if (!hasUserInteracted) return 'waiting'
    if (isSpeaking) return 'speaking'
    if (isAssistantProcessing || isRecognitionProcessing) return 'processing'
    if (isListening) return 'listening'
    return 'ready'
  }

  const buttonState = getButtonState()

  return (
    <div style={containerStyle}>
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      <header style={headerStyle}>
        <h1 style={titleStyle}>FocusFlow Voice Assistant</h1>
        <p style={subtitleStyle}>Your AI-powered productivity companion</p>
        {/* Always render the clear button but conditionally style it */}
        {conversation.length > 0 && (
        <button
          onClick={clearConversationHandler}
          className="clear-history-btn"
          disabled={false}
        >
          Clear History
        </button>
      )}
      </header>

      <main style={mainContentStyle}>
        {/* Conversation Area */}
        <div style={conversationStyle}>
          {conversation.length === 0 && !currentResponse ? (
            <div style={{ 
              textAlign: 'center', 
              color: theme === 'dark' ? '#6b7280' : '#9ca3af',
              padding: isMobile ? '30px 16px' : '40px 20px'
            }}>
              <div style={{ 
                fontSize: isMobile ? '32px' : '36px', 
                marginBottom: isMobile ? '12px' : '16px' 
              }}>
                🎤
              </div>
              <p style={{ 
                marginBottom: isMobile ? '8px' : '12px', 
                fontSize: isMobile ? '14px' : '16px' 
              }}>
                Start by saying "Hello" or typing a message below
              </p>
              <p style={{ 
                fontSize: isMobile ? '12px' : '14px', 
                opacity: 0.8 
              }}>
                Try: "What can you do?" or "Help me with tasks"
              </p>
            </div>
          ) : (
            <>
              {conversation.map((item, index) => (
                <div key={index} style={messageStyle(item.type)}>
                  {item.message}
                  <div style={{ 
                    fontSize: '10px', 
                    opacity: 0.6, 
                    marginTop: '4px',
                    textAlign: item.type === 'user' ? 'right' : 'left'
                  }}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              
              {currentResponse && (
                <div style={messageStyle('assistant')}>
                  {currentResponse}
                  <span style={{ animation: 'blink 1s infinite' }}>|</span>
                </div>
              )}
            </>
          )}
          
          <div ref={conversationEndRef} />
        </div>

        {/* Input Area */}
        <div style={inputContainerStyle}>
          {isTextMode ? (
            <>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your message here..."
                style={textInputStyle}
                onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit(e)}
              />
              <button
                onClick={handleTextSubmit}
                style={sendButtonStyle}
                disabled={!textInput.trim()}
              >
                Send
              </button>
            </>
          ) : (
            <button
              onClick={handleButtonClick}
              style={micButtonStyle(isListening || isSpeaking)}
              title={buttonState === 'waiting' ? 'Start listening' : 
                     buttonState === 'listening' ? 'Stop listening' : 
                     buttonState === 'speaking' ? 'Stop speaking' : 'Ready'}
            >
              {buttonState === 'processing' ? (
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <span style={{ fontSize: '24px', color: 'white' }}>
                  {buttonState === 'waiting' ? '🎤' : 
                   buttonState === 'speaking' ? '🔇' : '🎤'}
                </span>
              )}
            </button>
          )}

          <button
            onClick={toggleInputMode}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: theme === 'dark' ? '1px solid #3a3a3a' : '1px solid #d1d5db',
              backgroundColor: 'transparent',
              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
              cursor: 'pointer'
            }}
          >
            {isTextMode ? '🎤 Voice' : '⌨️ Text'}
          </button>
        </div>

        {/* Status Indicator */}
        <div style={{
          textAlign: 'center',
          color: theme === 'dark' ? '#6b7280' : '#9ca3af',
          fontSize: '14px'
        }}>
          {buttonState === 'waiting' && 'Click the microphone to start'}
          {buttonState === 'listening' && 'Listening... Speak now'}
          {buttonState === 'processing' && 'Processing your request...'}
          {buttonState === 'speaking' && 'Speaking...'}
          {buttonState === 'ready' && 'Ready to listen'}
        </div>
      </main>

      <Navbar />
    </div>
  )
}