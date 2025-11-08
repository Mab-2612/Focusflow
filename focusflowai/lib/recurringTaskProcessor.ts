//lib/recurringTaskProcessor.ts
import { supabase } from '@/lib/supabase/client'

export const processRecurringTasks = async () => {
  try {
    console.log('Processing recurring tasks...')
    
    // Get all recurring tasks that need new instances
    const { data: recurringTasks, error } = await supabase
      .from('recurring_tasks')
      .select('*')
      .is('end_date', null)
      .or(`end_date.gte.${new Date().toISOString()},end_date.is.null`)
    
    if (error || !recurringTasks) {
      console.error('Error fetching recurring tasks:', error)
      return
    }
    
    console.log(`Found ${recurringTasks.length} recurring tasks to process`)

    for (const task of recurringTasks) {
      // Check if we need to create a new instance based on recurrence pattern
      const shouldCreate = checkRecurrence(task)
      
      if (shouldCreate) {
        console.log(`Creating instance for recurring task: ${task.title}`)
        
        // Create new task instance
        const { error: createError } = await supabase
          .from('tasks')
          .insert([{
            user_id: task.user_id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            recurring_task_id: task.id,
            category_id: task.category_id || null
          }])
        
        if (createError) {
          console.error('Error creating task instance:', createError)
          continue
        }
        
        // Update last processed date
        const { error: updateError } = await supabase
          .from('recurring_tasks')
          .update({ last_processed: new Date().toISOString() })
          .eq('id', task.id)
        
        if (updateError) {
          console.error('Error updating last_processed:', updateError)
        }
      }
    }
    
    console.log('Recurring task processing completed')
  } catch (error) {
    console.error('Error processing recurring tasks:', error)
  }
}

const checkRecurrence = (task: any): boolean => {
  const now = new Date()
  const lastProcessed = task.last_processed ? new Date(task.last_processed) : new Date(task.created_at)
  
  // If never processed, create first instance
  if (!task.last_processed) return true
  
  switch (task.recurrence_pattern) {
    case 'daily':
      return now.getDate() !== lastProcessed.getDate() ||
             now.getMonth() !== lastProcessed.getMonth() ||
             now.getFullYear() !== lastProcessed.getFullYear()
    case 'weekly':
      const daysDiff = Math.floor((now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff >= 7
    case 'monthly':
      return now.getMonth() !== lastProcessed.getMonth() ||
             now.getFullYear() !== lastProcessed.getFullYear()
    case 'custom':
      return task.custom_days && 
             (now.getTime() - lastProcessed.getTime()) >= task.custom_days * 24 * 60 * 60 * 1000
    default:
      return false
  }
}