"use client"

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/components/ThemeContext'
import { taskService } from '@/services/taskService'
import { supabase } from '@/lib/supabaseClient'

interface ConversationItem {
  type: 'user' | 'assistant'
  message: string
  timestamp: Date
}

interface ConversationContext {
  lastTopic: string
  pendingConfirmation: boolean
  confirmationAction: string | null
  userTasks: any[]
  conversationHistory: string[]
  userMood: string
  storedConversation: ConversationItem[]
}

// Time formatting function
const formatTimeResponse = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, '0');
  
  return `It's ${formattedHours}:${formattedMinutes} ${ampm}`;
};

// Date formatting function
const formatDateResponse = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return `Today is ${date.toLocaleDateString('en-US', options)}`;
};

// Basic command processor
class VoiceCommandProcessor {
  static processBasicCommand(command: string): string | null {
    const lowerCommand = command.toLowerCase().trim();
    
    // Time commands
    if (lowerCommand.includes('time') || lowerCommand.includes('what time')) {
      return formatTimeResponse(new Date());
    }
    
    // Date commands
    if (lowerCommand.includes('date') || lowerCommand.includes('what date') || lowerCommand.includes('today\'s date')) {
      return formatDateResponse(new Date());
    }
    
    // Day command
    if (lowerCommand.includes('what day') || lowerCommand.includes('which day')) {
      const today = new Date();
      const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
      return `Today is ${dayName}`;
    }
    
    // Greetings
    if (lowerCommand.includes('hello') || lowerCommand.includes('hi') || lowerCommand.includes('hey')) {
      const hour = new Date().getHours();
      let timeOfDay = 'day';
      if (hour < 12) timeOfDay = 'morning';
      else if (hour < 17) timeOfDay = 'afternoon';
      else timeOfDay = 'evening';
      return `Good ${timeOfDay}! How can I help you today?`;
    }
    
    // How are you
    if (lowerCommand.includes('how are you') || lowerCommand.includes('how do you do')) {
      return "I'm doing great! Ready to help you be more productive. What can I do for you?";
    }
    
    // Thank you
    if (lowerCommand.includes('thank') || lowerCommand.includes('thanks')) {
      return "You're welcome! Happy to help. Is there anything else you need?";
    }
    
    return null;
  }
}

// Get stored conversation from localStorage
const getStoredConversation = (): ConversationItem[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('focusflow_conversation');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
    }
  } catch (error) {
    console.error('Error loading conversation from storage:', error);
  }
  return [];
};

// Save conversation to localStorage
const saveConversation = (conversation: ConversationItem[]) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('focusflow_conversation', JSON.stringify(conversation));
  } catch (error) {
    console.error('Error saving conversation to storage:', error);
  }
};

let conversationContext: ConversationContext = {
  lastTopic: '',
  pendingConfirmation: false,
  confirmationAction: null,
  userTasks: [],
  conversationHistory: [],
  userMood: 'neutral',
  storedConversation: getStoredConversation()
};

export const useVoiceAssistant = () => {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversation, setConversation] = useState<ConversationItem[]>(conversationContext.storedConversation)

  // Load conversation on mount
  useEffect(() => {
    const stored = getStoredConversation();
    setConversation(stored);
    conversationContext.storedConversation = stored;
  }, []);

  // Save conversation whenever it changes
  useEffect(() => {
    saveConversation(conversation);
    conversationContext.storedConversation = conversation;
  }, [conversation]);

  const addToConversation = useCallback((newItem: ConversationItem) => {
    setConversation(prev => {
      const updated = [...prev, newItem];
      if (updated.length > 50) {
        return updated.slice(-50);
      }
      return updated;
    });
  }, []);

  const clearConversation = useCallback(() => {
    setConversation([]);
    localStorage.removeItem('focusflow_conversation');
    conversationContext.storedConversation = [];
  }, []);

  // Save conversation to database
  const saveConversationToDB = useCallback(async (conversation: ConversationItem[]) => {
    if (!user) return;
    
    try {
      await supabase
        .from('user_conversations')
        .upsert({
          user_id: user.id,
          conversation: JSON.stringify(conversation),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }, [user]);

  const executeTaskOperation = async (action: string, priority?: string): Promise<string> => {
    if (!user) return "Please sign in to manage tasks.";

    try {
      let success = false;
      let message = "";

      switch (action) {
        case 'complete_all':
          success = await taskService.markAllTasksComplete(user.id, priority as any);
          message = success ? 
            `All ${priority ? priority + ' ' : ''}tasks have been marked as completed!` :
            "Failed to complete tasks. Please try again.";
          break;

        case 'delete_all':
          success = await taskService.deleteAllTasks(user.id, priority as any);
          message = success ? 
            `All ${priority ? priority + ' ' : ''}tasks have been deleted!` :
            "Failed to delete tasks. Please try again.";
          break;

        case 'add_task':
          const lastCommand = conversationContext.conversationHistory[conversationContext.conversationHistory.length - 1] || '';
          const taskMatch = lastCommand.match(/(add|create).*task.*?:(.*)/i) || 
                           lastCommand.match(/(add|create).*task.*?(urgent|important|later)?.*?(.+)/i);
          
          if (taskMatch && taskMatch[2]) {
            const taskTitle = taskMatch[2].trim();
            let taskPriority: 'urgent' | 'important' | 'later' = 'important';
            
            if (lastCommand.includes('urgent')) taskPriority = 'urgent';
            if (lastCommand.includes('later')) taskPriority = 'later';

            const result = await taskService.createTask({
              title: taskTitle,
              priority: taskPriority,
              user_id: user.id
            });

            message = result ? 
              `Added "${taskTitle}" as a ${taskPriority} task!` :
              "Failed to add task. Please try again.";
          } else {
            message = "What task would you like me to add? Please say something like 'Add task: Buy groceries'";
          }
          break;
      }

      return message;

    } catch (error) {
      console.error('Task operation error:', error);
      return "Sorry, I encountered an error while handling your tasks.";
    }
  }

  const processVoiceCommand = useCallback(async (command: string): Promise<string> => {
    if (!user) {
      return "Please sign in to use the voice assistant.";
    }

    // Handle immediate stop command
    if (command.toLowerCase().includes('stop')) {
      return "[STOPPED]";
    }

    // Process basic commands first
    const basicResponse = VoiceCommandProcessor.processBasicCommand(command);
    if (basicResponse) {
      return basicResponse;
    }

    setIsProcessing(true);
    
    // Add user message to conversation
    addToConversation({
      type: 'user',
      message: command,
      timestamp: new Date()
    });
    
    conversationContext.conversationHistory.push(command);
    
    // Detect user mood from command
    const lowerCommand = command.toLowerCase();
    if (lowerCommand.includes('again') || lowerCommand.includes('another') || lowerCommand.includes('more')) {
      conversationContext.userMood = 'requesting_more';
    } else if (lowerCommand.includes('please') || lowerCommand.includes('thank')) {
      conversationContext.userMood = 'polite';
    } else if (lowerCommand.includes('urgent') || lowerCommand.includes('now') || lowerCommand.includes('quick')) {
      conversationContext.userMood = 'urgent';
    } else {
      conversationContext.userMood = 'neutral';
    }
    
    try {
      // Handle theme switching
      if (lowerCommand.includes('dark') || lowerCommand.includes('black')) {
        if (theme !== 'dark') {
          toggleTheme();
          return "Switching to dark mode.";
        }
        return "Already in dark mode.";
      }
      
      if (lowerCommand.includes('light') || lowerCommand.includes('white')) {
        if (theme !== 'light') {
          toggleTheme();
          return "Switching to light mode.";
        }
        return "Already in light mode.";
      }

      // Handle task operations directly
      if (lowerCommand.includes('complete all') || lowerCommand.includes('mark all')) {
        const priorityMatch = lowerCommand.match(/(urgent|important|later)/);
        const priority = priorityMatch ? priorityMatch[1] : undefined;
        return await executeTaskOperation('complete_all', priority);
      }

      if (lowerCommand.includes('delete all') || lowerCommand.includes('remove all')) {
        const priorityMatch = lowerCommand.match(/(urgent|important|later)/);
        const priority = priorityMatch ? priorityMatch[1] : undefined;
        return await executeTaskOperation('delete_all', priority);
      }

      if (lowerCommand.includes('add task') || lowerCommand.includes('create task')) {
        return await executeTaskOperation('add_task');
      }

      // For all other commands, use Gemini with full conversation context
      const response = await fetch('/api/voice-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: command,
          userId: user.id,
          context: {
            ...conversationContext,
            fullConversation: conversation.slice(-10)
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      // Update conversation context
      conversationContext.lastTopic = lowerCommand.includes('joke') ? 'joke' : 'general';

      // Save conversation to database
      saveConversationToDB(conversation);

      return data.response;

    } catch (error) {
      console.error('Voice command error:', error);
      return "I apologize, but I'm having some technical difficulties. Please try again.";
    } finally {
      setIsProcessing(false);
    }
  }, [user, theme, toggleTheme, addToConversation, conversation, saveConversationToDB]);

  // SINGLE addAssistantResponse function (no duplicates)
  const addAssistantResponse = useCallback((response: string) => {
    addToConversation({
      type: 'assistant',
      message: response,
      timestamp: new Date()
    });
  }, [addToConversation]);

  return {
    isProcessing,
    processVoiceCommand,
    conversation,
    clearConversation,
    addAssistantResponse
  };
};