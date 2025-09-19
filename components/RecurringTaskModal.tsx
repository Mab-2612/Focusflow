//components/RecurringTaskModal.tsx
"use client"

import { useState } from 'react'
import { useTheme } from '@/components/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'

interface RecurringTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskAdded: () => void
  defaultTitle?: string
}

type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'custom'

export default function RecurringTaskModal({ 
  isOpen, 
  onClose, 
  onTaskAdded,
  defaultTitle = '' 
}: RecurringTaskModalProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [title, setTitle] = useState(defaultTitle)
  const [priority, setPriority] = useState<'urgent' | 'important' | 'later'>('important')
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('daily')
  const [customDays, setCustomDays] = useState<number>(7)
  const [endDate, setEndDate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim()) return
    
    setIsLoading(true)
    try {
      // Create the recurring task template
      const { data, error } = await supabase
        .from('recurring_tasks')
        .insert([{
          user_id: user.id,
          title: title.trim(),
          priority: priority,
          recurrence_pattern: recurrencePattern,
          custom_days: recurrencePattern === 'custom' ? customDays : null,
          end_date: endDate || null
        }])
        .select()
        .single()
      
      if (data && !error) {
        // Also create the first instance of the task
        await supabase
          .from('tasks')
          .insert([{
            user_id: user.id,
            title: title.trim(),
            priority: priority,
            recurring_task_id: data.id
          }])
        
        setTitle('')
        setPriority('important')
        setRecurrencePattern('daily')
        setCustomDays(7)
        setEndDate('')
        onTaskAdded()
        onClose()
      }
    } catch (error) {
      console.error('Error creating recurring task:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const overlayStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '16px'
  }

  const modalStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto' as const
  }

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  }

  const titleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const closeButtonStyle = {
    padding: '4px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '24px',
    color: theme === 'dark' ? '#9ca3af' : '#6b7280'
  }

  const formStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px'
  }

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: theme === 'dark' ? '#d1d5db' : '#374151'
  }

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
    borderRadius: '12px',
    fontSize: '16px',
    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  }

  const submitButtonStyle = {
    width: '100%',
    backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
    color: 'white',
    padding: '12px',
    borderRadius: '12px',
    border: 'none',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    fontWeight: '500'
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Create Recurring Task</h2>
          <button 
            onClick={onClose}
            style={closeButtonStyle}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div>
            <label htmlFor="title" style={labelStyle}>
              Task Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              placeholder="What needs to be done regularly?"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="priority" style={labelStyle}>
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'urgent' | 'important' | 'later')}
              style={selectStyle}
              disabled={isLoading}
            >
              <option value="urgent">Urgent</option>
              <option value="important">Important</option>
              <option value="later">Later</option>
            </select>
          </div>

          <div>
            <label htmlFor="recurrence" style={labelStyle}>
              Repeats
            </label>
            <select
              id="recurrence"
              value={recurrencePattern}
              onChange={(e) => setRecurrencePattern(e.target.value as RecurrencePattern)}
              style={selectStyle}
              disabled={isLoading}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom (days)</option>
            </select>
          </div>

          {recurrencePattern === 'custom' && (
            <div>
              <label htmlFor="customDays" style={labelStyle}>
                Repeat every (days)
              </label>
              <input
                type="number"
                id="customDays"
                value={customDays}
                onChange={(e) => setCustomDays(parseInt(e.target.value))}
                style={inputStyle}
                min="1"
                max="365"
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label htmlFor="endDate" style={labelStyle}>
              End Date (optional)
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            style={submitButtonStyle}
            disabled={isLoading || !title.trim()}
          >
            {isLoading ? 'Creating...' : 'Create Recurring Task'}
          </button>
        </form>
      </div>
    </div>
  )
}