// lib/gemini.ts
import { supabase } from '@/lib/supabaseClient'

export interface Task {
  id: string
  user_id: string
  title: string
  priority: 'urgent' | 'important' | 'later'
  completed: boolean
  due_date?: string
  created_at: string
  updated_at: string
}

export const generateSubtasks = async (taskTitle: string): Promise<string[]> => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  
  if (!apiKey) {
    console.warn('Google API key not configured. Using fallback subtasks.');
    return generateFallbackSubtasks(taskTitle);
  }

  try {
    // Use the working model
    const modelName = "gemini-1.5-flash-latest";
    console.log('🤖 Generating subtasks for:', taskTitle);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Break down the task "${taskTitle}" into 3-5 specific, actionable subtasks. Return only a bulleted list without any additional text or explanations.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      console.log('✅ AI generated subtasks:', text);
      return parseSubtasksFromResponse(text);
    } else {
      console.warn('API response not OK, using fallback');
      return generateFallbackSubtasks(taskTitle);
    }
    
  } catch (error) {
    console.error('Gemini API error, using fallback:', error);
    return generateFallbackSubtasks(taskTitle);
  }
};

const generateFallbackSubtasks = (taskTitle: string): string[] => {
  console.log('🔄 Using fallback subtasks for:', taskTitle);
  
  const lowerTitle = taskTitle.toLowerCase();
  
  // Task-type specific suggestions
  if (lowerTitle.includes('write') || lowerTitle.includes('article') || lowerTitle.includes('blog')) {
    return [
      'Research the topic',
      'Create an outline',
      'Write first draft',
      'Edit and revise',
      'Add visuals and format'
    ];
  }
  
  if (lowerTitle.includes('code') || lowerTitle.includes('program') || lowerTitle.includes('develop')) {
    return [
      'Set up development environment',
      'Plan architecture and components',
      'Write initial implementation',
      'Test functionality',
      'Debug and optimize'
    ];
  }
  
  if (lowerTitle.includes('study') || lowerTitle.includes('learn') || lowerTitle.includes('research')) {
    return [
      'Gather study materials',
      'Create study plan',
      'Take notes and summarize',
      'Practice and apply knowledge',
      'Review and test understanding'
    ];
  }

  if (lowerTitle.includes('clean') || lowerTitle.includes('organize')) {
    return [
      'Gather cleaning supplies',
      'Declutter the area',
      'Deep clean surfaces',
      'Organize items properly',
      'Dispose of trash and recycling'
    ];
  }

  // Generic fallback for any task
  return [
    'Research and gather information',
    'Plan and organize approach',
    'Execute the main work',
    'Review and refine results',
    'Complete and document'
  ];
};

const parseSubtasksFromResponse = (text: string): string[] => {
  try {
    // Parse bullet points (•, -, *) or numbered lists
    return text.split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return (
          trimmed.startsWith('• ') ||
          trimmed.startsWith('- ') ||
          trimmed.startsWith('* ') ||
          trimmed.match(/^\d+\.\s/) ||
          trimmed.match(/^\[[\w ]+\]\s/)
        );
      })
      .map(line => {
        // Remove bullets, numbers, or brackets
        return line.trim()
          .replace(/^[•\-*]\s+/, '')
          .replace(/^\d+\.\s+/, '')
          .replace(/^\[[\w ]+\]\s+/, '');
      })
      .filter(line => line.length > 0)
      .slice(0, 5); // Limit to 5 subtasks
  } catch (error) {
    console.error('Error parsing AI response, using fallback:', error);
    return generateFallbackSubtasks('');
  }
};

// Export the task service functions
export const taskService = {
  getTasksByPriority: async (userId: string, priority: string): Promise<Task[]> => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('priority', priority)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching tasks by priority:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Unexpected error:', error)
      return []
    }
  },

  createTask: async (task: {
    user_id: string
    title: string
    description?: string
    priority: 'urgent' | 'important' | 'later'
    due_date?: string
  }): Promise<Task | null> => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([task])
        .select()
        .single()
      
      if (error) {
        console.error('Error creating task:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Unexpected error:', error)
      return null
    }
  },

  updateTask: async (taskId: string, updates: Partial<{
    title: string
    description: string
    priority: 'urgent' | 'important' | 'later'
    completed: boolean
    due_date: string
  }>): Promise<Task | null> => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating task:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Unexpected error:', error)
      return null
    }
  },

  deleteTask: async (taskId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
      
      if (error) {
        console.error('Error deleting task:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('Unexpected error:', error)
      return false
    }
  }
};