"use client"

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { taskService, Task } from '@/services/taskService'
import { useAuth } from '@/hooks/useAuth'
import AdvancedAnalyticsDashboard from '@/components/AdvancedAnalyticsDashboard'
import LiveProductivityMetrics from '@/components/LiveProductivityMetrics'
import SimpleAnalyticsDashboard from '@/components/SimpleAnalyticsDashboard'
import { useAnalyticsStore } from '@/lib/analyticsStore'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const { productivityScore, weeklyTrends, focusSessions } = useAnalyticsStore()
  const [tasks, setTasks] = useState<{
    urgent: Task[]
    important: Task[]
    later: Task[]
  }>({ urgent: [], important: [], later: [] })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [userStats, setUserStats] = useState({
    totalFocusTime: 0,
    totalSessions: 0,
    tasksCompleted: 0
  })

  // Theme-aware styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
    paddingBottom: '96px',
    transition: 'background-color 0.3s ease'
  }

  const contentStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 16px'
  }

  const loadingContainerStyle = {
    ...contentStyle,
    textAlign: 'center' as const,
    padding: '100px 16px'
  }

  const focusCardStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    marginBottom: '32px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb'
  }

  const focusTitleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '16px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const focusTextStyle = {
    margin: 0,
    lineHeight: '1.6',
    color: theme === 'dark' ? '#d1d5db' : '#4b5563'
  }

  const tasksGridStyle = {
    display: 'grid',
    gap: '24px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
  }

  const taskCategoryStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb'
  }

  const categoryTitleStyle = (color: string) => ({
    fontWeight: '600',
    fontSize: '18px',
    marginBottom: '16px',
    color: color,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  })

  const taskListStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  }

  const taskItemStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb',
    border: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e5e7eb',
    transition: 'all 0.2s ease',
    gap: '12px'
  }

  const checkboxStyle = {
    height: '20px',
    width: '20px',
    color: '#2563eb',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
    border: theme === 'dark' ? '1px solid #4b5563' : '1px solid #d1d5db',
    flexShrink: 0
  }

  const taskTextStyle = (completed: boolean) => ({
    textDecoration: completed ? 'line-through' : 'none',
    color: completed ? '#9ca3af' : (theme === 'dark' ? '#f3f4f6' : '#374151'),
    flex: 1,
    fontSize: '14px',
    margin: '0'
  })

  const deleteButtonStyle = {
    padding: '6px',
    backgroundColor: 'transparent',
    color: theme === 'dark' ? '#ef4444' : '#dc2626',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    opacity: 0.7,
    transition: 'opacity 0.2s ease',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  const emptyStateStyle = {
    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
    margin: 0,
    fontSize: '14px',
    textAlign: 'center' as const,
    padding: '20px'
  }

  // Load user statistics
  const loadUserStats = useCallback(async () => {
    if (!user) return

    try {
      // Get total focus time and sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('focus_sessions')
        .select('duration, completed_tasks')
        .eq('user_id', user.id)

      if (sessionsData && !sessionsError) {
        const totalFocusTime = sessionsData.reduce((sum, session) => sum + session.duration, 0)
        const tasksCompleted = sessionsData.reduce((sum, session) => sum + session.completed_tasks, 0)
        
        setUserStats({
          totalFocusTime: Math.round(totalFocusTime / 60), // Convert to minutes
          totalSessions: sessionsData.length,
          tasksCompleted
        })
      }

      // Get completed tasks count
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed', true)

      if (tasksData && !tasksError) {
        setUserStats(prev => ({
          ...prev,
          tasksCompleted: tasksData.length
        }))
      }
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }, [user])

  // Load tasks function
  const loadTasks = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    
    try {
      setRefreshing(true)
      const [urgentResult, importantResult, laterResult] = await Promise.all([
        taskService.getTasksByPriority(user.id, 'urgent'),
        taskService.getTasksByPriority(user.id, 'important'),
        taskService.getTasksByPriority(user.id, 'later')
      ])

      setTasks({ 
        urgent: urgentResult.data || [], 
        important: importantResult.data || [], 
        later: laterResult.data || [] 
      })

      // Load user statistics
      await loadUserStats()

    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, loadUserStats])

  // Load tasks on mount and when user changes
  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Toggle task completion
  const toggleTaskCompletion = async (taskId: string, completed: boolean) => {
    try {
      // Optimistic update
      setTasks(prev => ({
        urgent: prev.urgent.map(t => t.id === taskId ? { ...t, completed: !completed } : t),
        important: prev.important.map(t => t.id === taskId ? { ...t, completed: !completed } : t),
        later: prev.later.map(t => t.id === taskId ? { ...t, completed: !completed } : t)
      }))

      // Server update
      const result = await taskService.updateTask(taskId, { completed: !completed })
      
      if (!result.data) {
        // Revert if server update fails
        loadTasks()
      } else {
        // Refresh stats when task is completed
        if (!completed) {
          loadUserStats()
        }
      }
    } catch (error) {
      console.error('Error updating task:', error)
      loadTasks() // Reload to sync with server
    }
  }

  // Delete task function
  const confirmDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId)
  }

  const deleteTask = async () => {
    if (!taskToDelete) return
    
    try {
      const success = await taskService.deleteTask(taskToDelete)
      
      if (success) {
        // Optimistic update - remove from UI immediately
        setTasks(prev => ({
          urgent: prev.urgent.filter(t => t.id !== taskToDelete),
          important: prev.important.filter(t => t.id !== taskToDelete),
          later: prev.later.filter(t => t.id !== taskToDelete)
        }))
        loadUserStats() // Refresh stats
      } else {
        console.error('Failed to delete task')
        loadTasks() // Reload to sync with server
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      loadTasks() // Reload to sync with server
    } finally {
      setTaskToDelete(null)
    }
  }

  // Handle task added from navbar
  const handleTaskAdded = () => {
    setRefreshing(true)
    loadTasks()
  }

  // Format time for display
  const formatTime = (minutes: number): string => {
    if (isNaN(minutes)) return '0m'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  // Loading state
  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingContainerStyle}>
          <div style={{
            fontSize: '24px',
            marginBottom: '16px',
            color: theme === 'dark' ? '#f3f4f6' : '#374151'
          }}>
            ⏳
          </div>
          <p style={{ color: theme === 'dark' ? '#f3f4f6' : '#374151' }}>
            Loading your dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* Refresh indicator */}
      {refreshing && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#2563eb',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          zIndex: 100,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Syncing tasks...
        </div>
      )}

      <div style={contentStyle}>
        {/* Welcome Card with Stats */}
        <div style={focusCardStyle}>
          <h2 style={focusTitleStyle}>
            {user ? `🎯 Welcome back, ${user.email?.split('@')[0]}!` : 'Welcome to FocusFlow!'}
          </h2>
          <p style={focusTextStyle}>
            {user ? `You have ${tasks.urgent.length} urgent tasks, ${tasks.important.length} important tasks, and ${tasks.later.length} tasks for later.` : 'Please sign in to manage your tasks.'}
          </p>
          
          {/* Quick Stats */}
          {user && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginTop: '20px',
              padding: '16px',
              backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
              borderRadius: '12px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                  {formatTime(userStats.totalFocusTime)}
                </div>
                <div style={{ fontSize: '12px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                  Total Focus
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                  {userStats.tasksCompleted}
                </div>
                <div style={{ fontSize: '12px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                  Tasks Done
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#8b5cf6' }}>
                  {userStats.totalSessions}
                </div>
                <div style={{ fontSize: '12px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                  Sessions
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: productivityScore > 80 ? '#10b981' : productivityScore > 60 ? '#f59e0b' : '#ef4444' 
                }}>
                  {productivityScore}
                </div>
                <div style={{ fontSize: '12px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                  Score
                </div>
              </div>
            </div>
          )}
          
          {/* Analytics Toggle Button */}
          {user && (
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                color: theme === 'dark' ? '#d1d5db' : '#4b5563',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {showAnalytics ? '▼ Hide Analytics' : '▲ Show Analytics'}
            </button>
          )}
          
          {!user && (
            <button
              onClick={() => window.location.href = '/onboarding'}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Sign In
            </button>
          )}
        </div>

        {/* Analytics Dashboard */}
        {showAnalytics && user && (
          <>
            <SimpleAnalyticsDashboard />
            <div style={{ margin: '24px 0' }}>
              <LiveProductivityMetrics />
            </div>
            <AdvancedAnalyticsDashboard />
          </>
        )}

        {user ? (
          /* Task Lists */
          <div style={tasksGridStyle}>
            {/* Urgent Tasks */}
            <div style={taskCategoryStyle}>
              <h3 style={categoryTitleStyle('#dc2626')}>
                <span style={{ fontSize: '20px' }}>🔥</span>
                Urgent ({tasks.urgent.length})
              </h3>
              <div style={taskListStyle}>
                {tasks.urgent.map(task => (
                  <div key={task.id} style={taskItemStyle}>
                    <input 
                      type="checkbox" 
                      checked={task.completed}
                      onChange={() => toggleTaskCompletion(task.id, task.completed)}
                      style={checkboxStyle}
                    />
                    <span style={taskTextStyle(task.completed)}>
                      {task.title}
                    </span>
                    <button
                      onClick={() => confirmDeleteTask(task.id)}
                      style={deleteButtonStyle}
                      title="Delete task"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {tasks.urgent.length === 0 && (
                  <p style={emptyStateStyle}>No urgent tasks 🎉</p>
                )}
              </div>
            </div>

            {/* Important Tasks */}
            <div style={taskCategoryStyle}>
              <h3 style={categoryTitleStyle('#ea580c')}>
                <span style={{ fontSize: '20px' }}>⭐</span>
                Important ({tasks.important.length})
              </h3>
              <div style={taskListStyle}>
                {tasks.important.map(task => (
                  <div key={task.id} style={taskItemStyle}>
                    <input 
                      type="checkbox" 
                      checked={task.completed}
                      onChange={() => toggleTaskCompletion(task.id, task.completed)}
                      style={checkboxStyle}
                    />
                    <span style={taskTextStyle(task.completed)}>
                      {task.title}
                    </span>
                    <button
                      onClick={() => confirmDeleteTask(task.id)}
                      style={deleteButtonStyle}
                      title="Delete task"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {tasks.important.length === 0 && (
                  <p style={emptyStateStyle}>No important tasks</p>
                )}
              </div>
            </div>

            {/* Later Tasks */}
            <div style={taskCategoryStyle}>
              <h3 style={categoryTitleStyle('#16a34a')}>
                <span style={{ fontSize: '20px' }}>⏰</span>
                Later ({tasks.later.length})
              </h3>
              <div style={taskListStyle}>
                {tasks.later.map(task => (
                  <div key={task.id} style={taskItemStyle}>
                    <input 
                      type="checkbox" 
                      checked={task.completed}
                      onChange={() => toggleTaskCompletion(task.id, task.completed)}
                      style={checkboxStyle}
                    />
                    <span style={taskTextStyle(task.completed)}>
                      {task.title}
                    </span>
                    <button
                      onClick={() => confirmDeleteTask(task.id)}
                      style={deleteButtonStyle}
                      title="Delete task"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {tasks.later.length === 0 && (
                  <p style={emptyStateStyle}>No tasks for later</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            borderRadius: '16px',
            border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>👋</div>
            <h3 style={{ 
              color: theme === 'dark' ? '#f3f4f6' : '#374151',
              marginBottom: '12px'
            }}>
              Welcome to FocusFlow!
            </h3>
            <p style={{ 
              color: theme === 'dark' ? '#d1d5db' : '#6b7280',
              marginBottom: '24px'
            }}>
              Sign in to start managing your tasks with AI-powered assistance.
            </p>
            <button
              onClick={() => window.location.href = '/onboarding'}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              Get Started
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}>
              Delete Task?
            </h3>
            <p style={{ color: theme === 'dark' ? '#d1d5db' : '#6b7280', marginBottom: '24px' }}>
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setTaskToDelete(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={deleteTask}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar onTaskAdded={handleTaskAdded} />
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}