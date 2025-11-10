// app/dashboard/page.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { taskService, Task } from '@/services/taskService'
import { useAuth } from '@/hooks/useAuth'
import { useAnalyticsStore } from '@/lib/analyticsStore'
import { supabase } from '@/lib/supabase/client'

const getUserDisplayName = (user: any) => {
  if (!user) return 'Guest';
  
  const userName = user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   user.user_metadata?.user_name;
  
  if (userName) return userName;
  
  const emailName = user.email?.split('@')[0];
  return emailName || 'User';
};

// Helper to format time
const formatTime = (minutes: number): string => {
  if (isNaN(minutes)) return '0m'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

// FIXED: Added UUID validation function
const isValidUUID = (uuid: string): boolean => {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export default function DashboardPage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  
  const { 
    productivityScore, 
    daily_focus_goal, 
    weeklyTrends 
  } = useAnalyticsStore()

  const [tasks, setTasks] = useState<{
    urgent: Task[]
    important: Task[]
    later: Task[]
  }>({ urgent: [], important: [], later: [] })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [showTaskSections, setShowTaskSections] = useState(true)
  
  const [userStats, setUserStats] = useState({
    totalFocusTime: 0,
    totalSessions: 0,
    tasksCompleted: 0
  })

  const { totalWeekFocus, weeklyGoalInMinutes, goalPercentage } = useMemo(() => {
    const totalWeekFocus = weeklyTrends.reduce((sum, day) => sum + day.focusTime, 0);
    const weeklyGoalInMinutes = (daily_focus_goal || 1) * 60 * 7;
    const percentage = weeklyGoalInMinutes > 0 
      ? Math.min(100, (totalWeekFocus / weeklyGoalInMinutes) * 100)
      : 0;
    return { totalWeekFocus, weeklyGoalInMinutes, goalPercentage: percentage };
  }, [weeklyTrends, daily_focus_goal]);

  // --- Styles ---
  const pageStyle = {
    minHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
    transition: 'background-color 0.3s ease'
  }
  const loadingContainerStyle = {
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
    fontSize: 'var(--font-lg)',
    fontWeight: '700',
    marginBottom: '16px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }
  const focusTextStyle = {
    margin: 0,
    lineHeight: '1.6',
    color: theme === 'dark' ? '#d1d5db' : '#4b5563',
    fontSize: 'var(--font-sm)'
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
    
    // FIXED: Add UUID guard
    if (!isValidUUID(user.id)) {
      console.error("Dashboard: Invalid user ID, aborting stats load.");
      return;
    }

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
          totalFocusTime: Math.round(totalFocusTime / 60), 
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

  // Load tasks
  const loadTasks = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    
    // FIXED: Add UUID guard
    if (!isValidUUID(user.id)) {
      console.error("Dashboard: Invalid user ID, aborting task load.");
      setLoading(false);
      return;
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

      await loadUserStats()

    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, loadUserStats])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // --- Task Handlers ---
  const toggleTaskCompletion = async (taskId: string, completed: boolean) => {
    try {
      setTasks(prev => ({
        urgent: prev.urgent.map(t => t.id === taskId ? { ...t, completed: !completed } : t),
        important: prev.important.map(t => t.id === taskId ? { ...t, completed: !completed } : t),
        later: prev.later.map(t => t.id === taskId ? { ...t, completed: !completed } : t)
      }))

      const result = await taskService.updateTask(taskId, { completed: !completed })
      
      if (!result.data) {
        loadTasks()
      } else {
        if (!completed) {
          loadUserStats()
        }
      }
    } catch (error) {
      console.error('Error updating task:', error)
      loadTasks()
    }
  }

  const confirmDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId)
  }

  const deleteTask = async () => {
    if (!taskToDelete) return
    
    try {
      const success = await taskService.deleteTask(taskToDelete)
      
      if (success) {
        setTasks(prev => ({
          urgent: prev.urgent.filter(t => t.id !== taskToDelete),
          important: prev.important.filter(t => t.id !== taskToDelete),
          later: prev.later.filter(t => t.id !== taskToDelete)
        }))
        loadUserStats()
      } else {
        console.error('Failed to delete task')
        loadTasks()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      loadTasks()
    } finally {
      setTaskToDelete(null)
    }
  }

  const handleTaskAdded = () => {
    setRefreshing(true)
    loadTasks()
  }
  // --- End Task Handlers ---

  if (loading) {
    return (
      <div 
        className="page-container"
        style={pageStyle}
      >
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
    <div style={pageStyle}>
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
          <div className="animate-spin" style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTop: '2px solid white',
            borderRadius: '50%',
          }} />
          Syncing tasks...
        </div>
      )}

      <div className="page-container dashboard-content">
        {/* Welcome Card with Stats */}
        <div style={focusCardStyle}>
          <h2 style={focusTitleStyle}>
            {user ? `🎯 Welcome back, ${getUserDisplayName(user)}!` : 'Welcome to FocusFlow!'}
          </h2>
          <p style={focusTextStyle}>
            {user ? `You have ${tasks.urgent.length} urgent tasks, ${tasks.important.length} important tasks, and ${tasks.later.length} tasks for later.` : 'Please sign in to manage your tasks.'}
          </p>
          
          {/* Quick Stats */}
          {user && (
            <div 
              className="stat-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
                marginTop: '20px',
                padding: '16px',
                backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                borderRadius: '12px'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                  {formatTime(userStats.totalFocusTime)}
                </div>
                <div style={{ fontSize: '12px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                  Total Focus
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-success)' }}>
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
                  color: productivityScore > 80 ? 'var(--accent-success)' : productivityScore > 60 ? 'var(--accent-warning)' : 'var(--accent-danger)' 
                }}>
                  {productivityScore}
                </div>
                <div style={{ fontSize: '12px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                  Score
                </div>
              </div>
            </div>
          )}
          
          {/* Weekly Goal Progress Bar */}
          {user && (
            <div style={{ marginTop: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
                color: theme === 'dark' ? '#d1d5db' : '#4b5563',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <span>Weekly Focus Goal</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                  {formatTime(totalWeekFocus)} / {formatTime(weeklyGoalInMinutes)} 
                  ({Math.round(goalPercentage)}%)
                </span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${goalPercentage}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Toggle Button */}
          {user && (
            <button
              onClick={() => setShowTaskSections(!showTaskSections)}
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
              {showTaskSections ? '▼ Hide Tasks' : '▲ Show Tasks'}
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

        {/* Task Lists (conditionally rendered) */}
        {user && showTaskSections && (
          <div 
            className="dashboard-grid"
            style={tasksGridStyle}
          >
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
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="modal-overlay">
          <div className="chat-confirm-modal">
            <h2 className="chat-confirm-title">Delete Task?</h2>
            <p className="chat-confirm-text">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="chat-confirm-buttons">
              <button
                className="chat-confirm-button chat-confirm-button-cancel"
                onClick={() => setTaskToDelete(null)}
              >
                Cancel
              </button>
              <button
                className="chat-confirm-button chat-confirm-button-danger"
                onClick={deleteTask}
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