// services/taskService.ts
import { supabase } from '@/lib/supabase/client'

// Interfaces
export interface Task {
  id: string
  title: string
  description: string | null
  completed: boolean
  completed_at: string | null
  due_date: string | null
  created_at: string
  priority: 'urgent' | 'important' | 'later'
  user_id: string
  category_id: string | null
  recurring_task_id: string | null
}

export interface Category {
  id: string
  name: string
  color: string
  user_id: string
  created_at: string
}

interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

interface TaskChangeCallbacks {
  onTaskChange?: (payload: any) => void
  onCategoryChange?: (payload: any) => void
}

// Helper functions
const handleSupabaseError = (error: any, context: string): string => {
  console.error(`Supabase Error (${context}):`, JSON.stringify(error, null, 2));
  
  if (!error || Object.keys(error).length === 0) return `An unknown error occurred while ${context}.`;

  if (error.code) {
    switch (error.code) {
      case 'PGRST301': return 'Authentication required'
      case 'PGRST302': return 'Invalid authentication credentials'
      case '42501': return 'Insufficient permissions. Please check your database security policies.'
      case '42P01': return 'A required table does not exist.'
      default: return `Database error: ${error.message}`
    }
  }

  return error.message || `An unknown error occurred in ${context}`
}

// Task functions
export const getTasks = async (userId: string): Promise<ServiceResponse<Task[]>> => {
  try {
    if (!userId) return { data: null, error: 'User ID required' }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: handleSupabaseError(error, 'fetching tasks') }
    }

    return { data: data || [], error: null }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'fetching tasks') }
  }
}

export const getTasksByPriority = async (userId: string, priority: 'urgent' | 'important' | 'later'): Promise<ServiceResponse<Task[]>> => {
  try {
    if (!userId) return { data: null, error: 'User ID required' }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('priority', priority)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: handleSupabaseError(error, `fetching ${priority} tasks`) }
    }

    return { data: data || [], error: null }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, `fetching ${priority} tasks`) }
  }
}

export const getTasksByCategory = async (userId: string, categoryId: string): Promise<ServiceResponse<Task[]>> => {
  try {
    if (!userId) return { data: null, error: 'User ID required' }
    if (!categoryId) return { data: null, error: 'Category ID required' }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: handleSupabaseError(error, 'fetching tasks by category') }
    }

    return { data: data || [], error: null }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'fetching tasks by category') }
  }
}

export const createTask = async (task: {
  title: string
  priority: 'urgent' | 'important' | 'later'
  user_id: string
  description?: string
  category_id?: string
  due_date?: string
}): Promise<ServiceResponse<Task>> => {
  try {
    if (!task.user_id) return { data: null, error: 'User ID required' }
    if (!task.title?.trim()) return { data: null, error: 'Task title is required' }

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: task.title.trim(),
        priority: task.priority,
        user_id: task.user_id,
        description: task.description || null,
        category_id: task.category_id || null,
        due_date: task.due_date || null,
        completed: false,
      }])
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error, 'creating task') }
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'creating task') }
  }
}

export const updateTask = async (taskId: string, updates: {
  completed?: boolean
  priority?: 'urgent' | 'important' | 'later'
  title?: string
  description?: string
  category_id?: string | null
  due_date?: string | null
}): Promise<ServiceResponse<boolean>> => {
  try {
    if (!taskId) return { data: null, error: 'Task ID required' }

    const updateData = updates.completed !== undefined 
      ? { 
          ...updates, 
          completed_at: updates.completed ? new Date().toISOString() : null 
        }
      : updates

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)

    if (error) {
      return { data: null, error: handleSupabaseError(error, 'updating task') }
    }

    return { data: true, error: null }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'updating task') }
  }
}

export const deleteTask = async (taskId: string): Promise<ServiceResponse<boolean>> => {
  try {
    if (!taskId) return { data: null, error: 'Task ID required' }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      return { data: null, error: handleSupabaseError(error, 'deleting task') }
    }

    return { data: true, error: null }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'deleting task') }
  }
}

export const markAllTasksComplete = async (userId: string, priority?: 'urgent' | 'important' | 'later'): Promise<ServiceResponse<boolean>> => {
  try {
    if (!userId) return { data: null, error: 'User ID required' }

    let query = supabase
      .from('tasks')
      .update({ 
        completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('completed', false)

    if (priority) {
      query = query.eq('priority', priority)
    }

    const { error } = await query
    
    if (error) {
      return { data: null, error: handleSupabaseError(error, 'marking tasks complete') }
    }
    
    return { data: true, error: null }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'marking tasks complete') }
  }
}

export const deleteAllTasks = async (userId: string, priority?: 'urgent' | 'important' | 'later'): Promise<ServiceResponse<boolean>> => {
  try {
    if (!userId) return { data: null, error: 'User ID required' }

    let query = supabase
      .from('tasks')
      .delete()
      .eq('user_id', userId)

    if (priority) {
      query = query.eq('priority', priority)
    }

    const { error } = await query
    
    if (error) {
      return { data: null, error: handleSupabaseError(error, 'deleting tasks') }
    }
    
    return { data: true, error: null }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'deleting tasks') }
  }
}

// Category functions
export const getCategories = async (userId: string): Promise<ServiceResponse<Category[]>> => {
  try {
    if (!userId) return { data: null, error: 'User ID required' }

    const { data, error } = await supabase
      .from('task_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (error) {
      return { data: null, error: handleSupabaseError(error, 'fetching categories') }
    }

    return { data: data || [], error: null }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'fetching categories') }
  }
}

export const createCategory = async (category: {
  name: string
  color: string
  user_id: string
}): Promise<ServiceResponse<Category>> => {
  try {
    if (!category.user_id) return { data: null, error: 'User ID required' }
    if (!category.name?.trim()) return { data: null, error: 'Category name is required' }

    const { data, error } = await supabase
      .from('task_categories')
      .insert([{
        name: category.name.trim(),
        color: category.color,
        user_id: category.user_id
      }])
      .select()
      .single()

    if (error) {
      return { data: null, error: handleSupabaseError(error, 'creating category') }
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'creating category') }
  }
}

export const deleteCategory = async (categoryId: string): Promise<ServiceResponse<boolean>> => {
  try {
    if (!categoryId) return { data: null, error: 'Category ID required' }

    // Remove category from tasks first
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ category_id: null })
      .eq('category_id', categoryId)

    if (updateError) {
      return { data: null, error: handleSupabaseError(updateError, 'removing category from tasks') }
    }

    // Then delete the category
    const { error: deleteError } = await supabase
      .from('task_categories')
      .delete()
      .eq('id', categoryId)

    if (deleteError) {
      return { data: null, error: handleSupabaseError(deleteError, 'deleting category') }
    }

    return { data: true, error: null }
  } catch (error) {
    return { data: null, error: handleSupabaseError(error, 'deleting category') }
  }
}

// Real-time handlers
let taskChangeCallbacks: TaskChangeCallbacks = {}

export const setTaskChangeCallbacks = (callbacks: TaskChangeCallbacks) => {
  taskChangeCallbacks = callbacks
}

export const handleTaskChange = (payload: any) => {
  if (taskChangeCallbacks.onTaskChange) {
    taskChangeCallbacks.onTaskChange(payload)
  }
}

export const handleCategoryChange = (payload: any) => {
  if (taskChangeCallbacks.onCategoryChange) {
    taskChangeCallbacks.onCategoryChange(payload)
  }
}

// Sync function
export const syncTasks = async (userId: string): Promise<void> => {
  try {
    if (!userId) {
      console.error('User ID required for sync')
      return
    }

    const [tasksResult, categoriesResult] = await Promise.allSettled([
      getTasks(userId),
      getCategories(userId)
    ])
    
    if (tasksResult.status === 'fulfilled' && tasksResult.value.data && taskChangeCallbacks.onTaskChange) {
      taskChangeCallbacks.onTaskChange({
        eventType: 'SYNC',
        new: tasksResult.value.data,
        old: null
      })
    }
    
    if (categoriesResult.status === 'fulfilled' && categoriesResult.value.data && taskChangeCallbacks.onCategoryChange) {
      taskChangeCallbacks.onCategoryChange({
        eventType: 'SYNC',
        new: categoriesResult.value.data,
        old: null
      })
    }
    
  } catch (error) {
    console.error('Error syncing tasks:', error)
  }
}

// Compatibility functions for legacy code
const toggleTaskCompletion = async (taskId: string, currentCompleted: boolean): Promise<boolean> => {
  const result = await updateTask(taskId, { 
    completed: !currentCompleted,
    completed_at: !currentCompleted ? new Date().toISOString() : null
  })
  return result.data || false
}

// Main taskService object (exported at the end to avoid circular dependencies)
export const taskService = {
  // Task functions
  getTasks,
  getTasksByPriority,
  getTasksByCategory,
  createTask,
  updateTask,
  deleteTask,
  markAllTasksComplete,
  deleteAllTasks,
  toggleTaskCompletion,
  
  // Category functions
  getCategories,
  createCategory,
  deleteCategory,
  
  // Real-time handlers
  handleTaskChange,
  handleCategoryChange,
  syncTasks,
  setTaskChangeCallbacks
}