// components/AITaskBreakdown
"use client"

import { useState } from 'react'
import { generateSubtasks } from '@/lib/genai'
import { Bot, AlertTriangle, Loader2 } from 'lucide-react' // <-- IMPORT ICONS

interface AITaskBreakdownProps {
  taskTitle: string
  onSubtasksGenerated: (subtasks: string[]) => void
}

export default function AITaskBreakdown({ taskTitle, onSubtasksGenerated }: AITaskBreakdownProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSubtasks, setGeneratedSubtasks] = useState<string[]>([])
  const [error, setError] = useState<string>('')

  const handleGenerateSubtasks = async () => {
    if (!taskTitle || !taskTitle.trim()) {
      setError('Please enter a task title first')
      return
    }

    setIsGenerating(true)
    setError('')
    
    try {
      console.log('🔄 Generating subtasks for:', taskTitle)
      const subtasks = await generateSubtasks(taskTitle)
      
      setGeneratedSubtasks(subtasks)
      onSubtasksGenerated(subtasks)
      
      console.log('✅ Subtasks generated:', subtasks)
    } catch (error) {
      console.error('❌ Failed to generate subtasks:', error)
      setError('Failed to generate subtasks. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const clearSubtasks = () => {
    setGeneratedSubtasks([])
    setError('')
    onSubtasksGenerated([])
  }

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      padding: '16px',
      margin: '16px 0',
      border: '1px solid #e9ecef'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          display: 'flex', // <-- ADDED
          alignItems: 'center', // <-- ADDED
          gap: '8px' // <-- ADDED
        }}>
          {/* --- UPDATED --- */}
          <Bot size={18} />
          AI Task Breakdown
        </h3>
        
        <button
          onClick={handleGenerateSubtasks}
          disabled={isGenerating || !taskTitle || !taskTitle.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: isGenerating ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isGenerating || !taskTitle ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {isGenerating ? 'Generating...' : 'Suggest Subtasks'}
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '12px',
          fontSize: '14px',
          display: 'flex', // <-- ADDED
          alignItems: 'center', // <-- ADDED
          gap: '8px' // <-- ADDED
        }}>
          {/* --- UPDATED --- */}
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {generatedSubtasks.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Suggested Subtasks:
            </h4>
            
            <button
              onClick={clearSubtasks}
              style={{
                padding: '4px 8px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear
            </button>
          </div>

          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            listStyleType: 'disc'
          }}>
            {generatedSubtasks.map((subtask, index) => (
              <li key={index} style={{
                marginBottom: '6px',
                fontSize: '14px',
                color: '#4b5563',
                lineHeight: '1.4'
              }}>
                {subtask}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isGenerating && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#6b7280',
          fontSize: '14px',
          marginTop: '8px'
        }}>
          {/* --- UPDATED --- */}
          <Loader2 size={16} className="animate-spin" />
          AI is thinking...
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}