// hooks/useVoiceAssistant.ts
"use client"

import { useState } from 'react' // FIXED: Removed the extra period
import { useRouter } from 'next/navigation'
import { chatWithAI, ChatHistoryItem } from '@/lib/genai' // Import new type
import { taskService } from '@/services/taskService'
import { useAuth } from './useAuth'

// Define a simplified history state for this hook
interface Message {
  type: 'user' | 'assistant'
  content: string
}

export const useVoiceAssistant = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [history, setHistory] = useState<Message[]>([])

  const processVoiceCommand = async (command: string): Promise<string> => {
    if (!command.trim()) return ""

    const lowerCommand = command.toLowerCase()
    
    // Add user message to local history
    setHistory(prev => [...prev, { type: 'user', content: command }])

    // --- 1. Intent Recognition (Simple) ---
    
    // Task Creation
    if (lowerCommand.startsWith('add task') || lowerCommand.startsWith('create task')) {
      const title = command.substring(command.indexOf(' ') + 1)
      if (user) {
        await taskService.createTask({
          user_id: user.id,
          title: title,
          priority: 'medium',
          status: 'pending'
        })
        const response = `OK, I've added the task: "${title}".`
        setHistory(prev => [...prev, { type: 'assistant', content: response }])
        return response
      }
    }

    // Navigation
    if (lowerCommand.includes('open dashboard')) {
      router.push('/dashboard')
      return "Opening your dashboard."
    }
    if (lowerCommand.includes('open pomodoro') || lowerCommand.includes('start focus')) {
      router.push('/pomodoro')
      return "Starting a new focus session."
    }
    if (lowerCommand.includes('open planning') || lowerCommand.includes('show my calendar')) {
      router.push('/planning')
      return "Opening your planner."
    }

    // --- 2. General Chat (Gemini) ---
    
    // Convert local history to the format Gemini API needs
    const geminiHistory: ChatHistoryItem[] = history.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }))

    try {
      const response = await chatWithAI(command, geminiHistory)
      // Save AI response to local history
      setHistory(prev => [...prev, { type: 'assistant', content: response }])
      return response
    } catch (error) {
      console.error("Error processing Gemini chat:", error)
      const errorResponse = "I apologize, but I'm having some technical difficulties. Please try again."
      setHistory(prev => [...prev, { type: 'assistant', content: errorResponse }])
      return errorResponse
    }
  }

  return { processVoiceCommand }
}