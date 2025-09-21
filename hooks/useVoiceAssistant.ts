//hooks/useVoiceAssistant.ts
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

// Get stored conversation from localStorage
const getStoredConversation = (): ConversationItem[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('focusflow_conversation');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
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

// Clear old conversations (keep only last 24 hours)
const cleanupOldConversations = () => {
  const conversation = getStoredConversation();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const filtered = conversation.filter(item => 
    new Date(item.timestamp) > twentyFourHoursAgo
  );
  
  if (filtered.length !== conversation.length) {
    saveConversation(filtered);
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
    cleanupOldConversations();
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
      // Keep only last 50 messages to prevent storage overflow
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

  // Save conversation to database (without using hooks)
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

    // Handle clear conversation command
    if (command.toLowerCase().includes('clear conversation') || 
        command.toLowerCase().includes('delete history')) {
      clearConversation();
      return "I've cleared our conversation history.";
    }

    setIsProcessing(true);
    
    // Add user message to conversation
    const userMessage: ConversationItem = {
      type: 'user',
      message: command,
      timestamp: new Date()
    };
    addToConversation(userMessage);
    
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
            fullConversation: conversation.slice(-10) // Send last 10 messages for context
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
  }, [user, theme, toggleTheme, addToConversation, clearConversation, conversation, saveConversationToDB]);

  // Function to add assistant responses to conversation
  const addAssistantResponse = useCallback((response: string) => {
    const assistantMessage: ConversationItem = {
      type: 'assistant',
      message: response,
      timestamp: new Date()
    };
    addToConversation(assistantMessage);
  }, [addToConversation]);

  return {
    isProcessing,
    processVoiceCommand,
    conversation,
    clearConversation,
    addAssistantResponse
  };
};