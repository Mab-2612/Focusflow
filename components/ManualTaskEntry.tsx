//components/ManualTaskEntry
'use client'

import { useState } from 'react'
import { taskService } from '@/services/taskService'
import { useAuth } from '@/hooks/useAuth'

interface ManualTaskEntryProps {
  onTaskAdded: () => void
}

export default function ManualTaskEntry({ onTaskAdded }: ManualTaskEntryProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'urgent' | 'important' | 'later'>('important')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const handleAddTask = async () => {
    if (!title.trim() || !user) {
      setError('Please enter a task title')
      return
    }
    
    setIsAdding(true)
    setError(null)
    
    try {
      const result = await taskService.createTask({
        title: title.trim(),
        user_id: user.id,
        priority: priority
      })
      
      if (!result) {
        setError('Failed to create task. Please try again.')
        return
      }
      
      setTitle('')
      setPriority('important')
      onTaskAdded()
    } catch (error) {
      console.error('Failed to create task:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError(null)
          }}
          placeholder="Enter a new task..."
          style={{
            padding: '12px 16px',
            border: error ? '1px solid #ef4444' : '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '16px'
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
        />
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Priority:</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'urgent' | 'important' | 'later')}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="urgent">🚨 Urgent</option>
            <option value="important">⭐ Important</option>
            <option value="later">📅 Later</option>
          </select>
        </div>
      </div>
      
      <button
        onClick={handleAddTask}
        disabled={isAdding || !title.trim()}
        style={{
          padding: '12px 20px',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600',
          opacity: (isAdding || !title.trim()) ? 0.6 : 1,
          width: '100%'
        }}
      >
        {isAdding ? 'Adding...' : 'Add Task'}
      </button>
      
      {error && (
        <div style={{
          color: '#ef4444',
          fontSize: '14px',
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#fef2f2',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
    </div>
  )
}