"use client"

import { useState } from 'react'
import { taskService } from '@/services/taskService'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'

export default function TestDBPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<string>('Click a button to test')
  const [tasks, setTasks] = useState<any[]>([])

  const testInsert = async () => {
    if (!user) {
      setStatus('Please sign in first')
      return
    }

    try {
      setStatus('Creating test task...')
      const task = await taskService.createTask({
        user_id: user.id,
        title: 'Test Task from Debug Page',
        category: 'urgent'
      })

      if (task) {
        setStatus('✅ Task created successfully!')
      } else {
        setStatus('❌ Failed to create task')
      }
    } catch (error) {
      setStatus('❌ Error: ' + error.message)
    }
  }

  const testQuery = async () => {
    if (!user) {
      setStatus('Please sign in first')
      return
    }

    try {
      setStatus('Querying tasks...')
      const urgentTasks = await taskService.getTasksByCategory(user.id, 'urgent')
      setTasks(urgentTasks)
      setStatus(`✅ Found ${urgentTasks.length} urgent tasks`)
    } catch (error) {
      setStatus('❌ Error: ' + error.message)
    }
  }

  const testRawQuery = async () => {
    if (!user) {
      setStatus('Please sign in first')
      return
    }

    try {
      setStatus('Running raw query...')
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .limit(5)

      if (error) {
        setStatus('❌ Raw query error: ' + error.message)
      } else {
        setTasks(data || [])
        setStatus(`✅ Raw query found ${data?.length || 0} tasks`)
      }
    } catch (error) {
      setStatus('❌ Error: ' + error.message)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Database Test Page</h1>
      <p>User: {user?.email || 'Not signed in'}</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testInsert} style={{ marginRight: '10px', padding: '10px' }}>
          Test Insert
        </button>
        <button onClick={testQuery} style={{ marginRight: '10px', padding: '10px' }}>
          Test Query
        </button>
        <button onClick={testRawQuery} style={{ padding: '10px' }}>
          Test Raw Query
        </button>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <strong>Status:</strong> {status}
      </div>

      {tasks.length > 0 && (
        <div>
          <h2>Tasks:</h2>
          <pre>{JSON.stringify(tasks, null, 2)}</pre>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '5px' }}>
        <h3>Debug Tips:</h3>
        <ul>
          <li>Check if the 'tasks' table exists in your Supabase dashboard</li>
          <li>Verify RLS (Row Level Security) policies allow read/write operations</li>
          <li>Check browser console for detailed error messages</li>
        </ul>
      </div>
    </div>
  )
}