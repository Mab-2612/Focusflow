// hooks/useGoogleTTS.ts
import { useState, useEffect } from 'react'

const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF])/g;
// FIXED: New regex to remove markdown asterisks
const markdownRegex = /\*/g;

export const useGoogleTTS = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      if (availableVoices.length > 0) {
        const googleVoices = availableVoices.filter(voice => 
          voice.name.includes('Google') || voice.lang.startsWith('en')
        )
        setVoices(googleVoices.length > 0 ? googleVoices : availableVoices)
        setIsLoading(false)
      }
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const speak = (
    text: string,
    onEnd: () => void,
    onError: (e: SpeechSynthesisErrorEvent) => void = (e) => console.error("TTS Error", e),
    rate = 1.0,
    pitch = 1.0
  ) => {
    if (isLoading || voices.length === 0) {
      console.warn("TTS is not ready or no voices are available.")
      onError(new SpeechSynthesisErrorEvent('no-voice', { error: 'No voices loaded' }));
      return
    }

    window.speechSynthesis.cancel()
    
    // FIXED: Clean text by removing emojis AND markdown
    const cleanText = text.replace(emojiRegex, '').replace(markdownRegex, '');

    const utterance = new SpeechSynthesisUtterance(cleanText)
    
    const bestVoice = voices.find(v => v.name === 'Google US English') ||
                      voices.find(v => v.lang === 'en-US') ||
                      voices.find(v => v.lang.startsWith('en')) ||
                      voices[0]
                      
    if (!bestVoice) {
      console.error("No suitable voice found.");
      onError(new SpeechSynthesisErrorEvent('no-voice', { error: 'No suitable voice' }));
      return;
    }

    utterance.voice = bestVoice
    utterance.lang = bestVoice.lang
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.onerror = onError
    utterance.onend = onEnd
    
    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
  }

  return { speak, stopSpeaking, isLoading }
}