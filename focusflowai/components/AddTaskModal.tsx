//components/AddTaskModal.tsx
"use client"

import { useState } from 'react'
import { taskService } from '@/services/taskService'
import { useAuth } from '@/hooks/useAuth'
import AITaskBreakdown from './AITaskBreakdown'
import TaskCategories from './TaskCategories'

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskAdded: () => void
}

export default function AddTaskModal({ isOpen, onClose, onTaskAdded }: AddTaskModalProps) {
  const { user } = useAuth()
  const [task, setTask] = useState('')
  const [priority, setPriority] = useState<'urgent' | 'important' | 'later'>('important')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedSubtasks, setGeneratedSubtasks] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  if (!isOpen) return null

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
    backgroundColor: '#ffffff',
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
    margin: 0
  }

  const closeButtonStyle = {
    padding: '4px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '24px',
    opacity: loading ? 0.5 : 1
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
    marginBottom: '8px'
  }

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    fontSize: '16px',
    opacity: loading ? 0.7 : 1
  }

  const textareaStyle = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical' as const
  }

  const selectStyle = {
    ...inputStyle,
    cursor: loading ? 'not-allowed' : 'pointer'
  }

  const submitButtonStyle = {
    width: '100%',
    backgroundColor: loading ? '#9ca3af' : '#2563eb',
    color: 'white',
    padding: '12px',
    borderRadius: '12px',
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    fontWeight: '500'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !task.trim() || loading) return
    
    setLoading(true)
    try {
      const result = await taskService.createTask({
        user_id: user.id,
        title: task.trim(),
        description: description.trim() || undefined,
        priority: priority,
        category_id: selectedCategory || undefined
      })

      if (result) {
        // If we have generated subtasks, you could create them here too
        console.log('Generated subtasks available:', generatedSubtasks)
        
        setTask('')
        setDescription('')
        setPriority('important')
        setGeneratedSubtasks([])
        setSelectedCategory(null)
        onTaskAdded()
        onClose()
      }
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setTask('')
      setDescription('')
      setPriority('important')
      setGeneratedSubtasks([])
      setSelectedCategory(null)
      onClose()
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Add New Task</h2>
          <button 
            onClick={handleClose}
            style={closeButtonStyle}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div>
            <label htmlFor="task" style={labelStyle}>
              What do you need to do?
            </label>
            <input
              type="text"
              id="task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              style={inputStyle}
              placeholder="Enter your task title..."
              required
              disabled={loading}
            />
          </div>

          {/* AI Task Breakdown Component */}
          {task.trim() && (
            <AITaskBreakdown 
              taskTitle={task}
              onSubtasksGenerated={setGeneratedSubtasks}
            />
          )}

          <div>
            <label htmlFor="description" style={labelStyle}>
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={textareaStyle}
              placeholder="Add more details about your task..."
              disabled={loading}
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
              disabled={loading}
            >
              <option value="urgent">Urgent</option>
              <option value="important">Important</option>
              <option value="later">Later</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Category (optional)</label>
            <TaskCategories 
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />
          </div>

          <button
            type="submit"
            style={submitButtonStyle}
            disabled={loading || !task.trim()}
          >
            {loading ? 'Creating Task...' : 'Save Task'}
          </button>
        </form>

      </div>
    </div>
  )
}