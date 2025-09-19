import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

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

// Callback interface for real-time updates
interface TaskChangeCallbacks {
  onTaskChange?: (payload: any) => void
  onCategoryChange?: (payload: any) => void
}

let taskChangeCallbacks: TaskChangeCallbacks = {}

export const setTaskChangeCallbacks = (callbacks: TaskChangeCallbacks) => {
  taskChangeCallbacks = callbacks
}

// Get all tasks for a user
export const getTasks = async (userId: string): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
}

// Get tasks by priority
export const getTasksByPriority = async (userId: string, priority: 'urgent' | 'important' | 'later'): Promise<Task[]> => {
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
    console.error('Error fetching tasks by priority:', error)
    return []
  }
}

// Get tasks by category
export const getTasksByCategory = async (userId: string, categoryId: string): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks by category:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching tasks by category:', error)
    return []
  }
}

// Create a new task
export const createTask = async (task: {
  title: string
  priority: 'urgent' | 'important' | 'later'
  user_id: string
  description?: string
  category_id?: string
  due_date?: string
}): Promise<Task | null> => {
  try {
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
      console.error('Error creating task:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating task:', error)
    return null
  }
}

// Update a task
export const updateTask = async (taskId: string, updates: {
  completed?: boolean
  priority?: 'urgent' | 'important' | 'later'
  title?: string
  description?: string
  category_id?: string | null
  due_date?: string | null
}): Promise<boolean> => {
  try {
    // If marking as completed, set completed_at timestamp
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
      console.error('Error updating task:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating task:', error)
    return false
  }
}

// Delete a task
export const deleteTask = async (taskId: string): Promise<boolean> => {
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
    console.error('Error deleting task:', error)
    return false
  }
}

// Mark all tasks as complete
export const markAllTasksComplete = async (userId: string, priority?: 'urgent' | 'important' | 'later'): Promise<boolean> => {
  try {
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
      console.error('Error marking tasks complete:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error marking tasks complete:', error)
    return false
  }
}

// Delete all tasks
export const deleteAllTasks = async (userId: string, priority?: 'urgent' | 'important' | 'later'): Promise<boolean> => {
  try {
    let query = supabase
      .from('tasks')
      .delete()
      .eq('user_id', userId)

    if (priority) {
      query = query.eq('priority', priority)
    }

    const { error } = await query
    
    if (error) {
      console.error('Error deleting tasks:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error deleting tasks:', error)
    return false
  }
}

// Toggle task completion
export const toggleTaskCompletion = async (taskId: string, currentCompleted: boolean): Promise<boolean> => {
  return updateTask(taskId, { 
    completed: !currentCompleted,
    completed_at: !currentCompleted ? new Date().toISOString() : null
  })
}

// Get user categories
export const getCategories = async (userId: string): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from('task_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

// Create a new category
export const createCategory = async (category: {
  name: string
  color: string
  user_id: string
}): Promise<Category | null> => {
  try {
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
      console.error('Error creating category:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating category:', error)
    return null
  }
}

// Delete a category
export const deleteCategory = async (categoryId: string): Promise<boolean> => {
  try {
    // First, remove category from all tasks
    await supabase
      .from('tasks')
      .update({ category_id: null })
      .eq('category_id', categoryId)

    // Then delete the category
    const { error } = await supabase
      .from('task_categories')
      .delete()
      .eq('id', categoryId)

    if (error) {
      console.error('Error deleting category:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting category:', error)
    return false
  }
}

// Real-time event handlers
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

// Sync local state with server
export const syncTasks = async (userId: string): Promise<void> => {
  try {
    const [tasks, categories] = await Promise.all([
      getTasks(userId),
      getCategories(userId)
    ])
    
    // Update Zustand store via callbacks
    if (taskChangeCallbacks.onTaskChange) {
      taskChangeCallbacks.onTaskChange({
        eventType: 'SYNC',
        new: tasks,
        old: null
      })
    }
    
    if (taskChangeCallbacks.onCategoryChange) {
      taskChangeCallbacks.onCategoryChange({
        eventType: 'SYNC',
        new: categories,
        old: null
      })
    }
    
  } catch (error) {
    console.error('Error syncing tasks:', error)
  }
}

// Track task completion for analytics
export const trackTaskCompletion = async (taskId: string, completed: boolean) => {
  try {
    // Update task completion status
    await updateTask(taskId, { completed })
    
    // If task is being completed, log it for analytics
    if (completed) {
      const today = new Date().toISOString().split('T')[0]
      
      // Import analytics store only when needed to avoid circular dependencies
      const { useAnalyticsStore } = await import('@/lib/analyticsStore')
      const { dailyStats, updateDailyStats } = useAnalyticsStore.getState()
      const current = dailyStats[today] || { focusTime: 0, tasksCompleted: 0 }
      
      updateDailyStats(today, current.focusTime, current.tasksCompleted + 1)
    }
  } catch (error) {
    console.error('Error tracking task completion:', error)
  }
}

// Update the updateTask function to use tracking
export const updateTaskWithTracking = async (taskId: string, updates: {
  completed?: boolean
  priority?: 'urgent' | 'important' | 'later'
  title?: string
  description?: string
  category_id?: string | null
  due_date?: string | null
}): Promise<boolean> => {
  try {
    // If marking as completed, track it
    if (updates.completed !== undefined) {
      await trackTaskCompletion(taskId, updates.completed)
    }

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)

    return !error
  } catch (error) {
    console.error('Error updating task:', error)
    return false
  }
}

// Task service object
export const taskService = {
  getTasks,
  getTasksByPriority,
  getTasksByCategory,
  createTask,
  updateTask: updateTaskWithTracking,
  deleteTask,
  toggleTaskCompletion,
  markAllTasksComplete,
  deleteAllTasks,
  getCategories,
  createCategory,
  deleteCategory,
  handleTaskChange,
  handleCategoryChange,
  syncTasks,
  setTaskChangeCallbacks
}