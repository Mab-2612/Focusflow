//app/profile/page.tsx
"use client"

import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { useAnalyticsStore } from '@/lib/analyticsStore'

interface UserPreferences {
  auto_break_enabled: boolean
  break_duration: number
  work_duration: number
  long_break_duration: number
  notifications_enabled: boolean
  default_view: 'dashboard' | 'voice' | 'pomodoro'
  sound_effects: boolean
  dark_mode?: boolean
}

export default function ProfilePage() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'analytics' | 'subscription'>('profile')
  const [preferences, setPreferences] = useState<UserPreferences>({
    auto_break_enabled: true,
    break_duration: 5,
    work_duration: 25,
    long_break_duration: 15,
    notifications_enabled: true,
    default_view: 'dashboard',
    sound_effects: true,
    dark_mode: false
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  
  // Analytics state
  const [focusSessions, setFocusSessions] = useState<any[]>([])
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([])
  const [productivityScore, setProductivityScore] = useState(0)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [totalFocusTime, setTotalFocusTime] = useState(0)
  const [totalTasksCompleted, setTotalTasksCompleted] = useState(0)

  // Theme-aware styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    transition: 'background-color 0.3s ease, color 0.3s ease'
  }

  const titleStyle = {
    fontSize: 'var(--font-xl)', // Use fluid typography
    fontWeight: '700',
    marginBottom: '32px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const tabContainerStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
    paddingBottom: '16px',
    // Allow horizontal scrolling on mobile
    overflowX: 'auto' as const,
    whiteSpace: 'nowrap' as const,
  }

  const tabStyle = (isActive: boolean) => ({
    padding: '8px 16px',
    backgroundColor: isActive ? (theme === 'dark' ? '#2563eb' : '#3b82f6') : 'transparent',
    color: isActive ? 'white' : (theme === 'dark' ? '#d1d5db' : '#6b7280'),
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    flexShrink: 0 // Prevent tabs from shrinking
  })

  const sectionStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    marginBottom: '24px'
  }

  const sectionTitleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '16px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const inputGroupStyle = {
    marginBottom: '16px'
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
    border: '1px solid ' + (theme === 'dark' ? '#374151' : '#d1d5db'),
    borderRadius: '12px',
    fontSize: '16px', // 16px to prevent mobile zoom
    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const toggleContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
    borderRadius: '12px'
  }

  const toggleLabelStyle = {
    color: theme === 'dark' ? '#d1d5db' : '#374151',
    fontSize: '14px',
    fontWeight: '500'
  }

  const saveButtonStyle = {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    opacity: isSaving ? 0.7 : 1,
    width: '100%' // Make button full-width on mobile
  }

  // Analytics styles
  const statCardStyle = {
    backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center' as const
  }

  const statValueStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '8px 0',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }

  const statLabelStyle = {
    fontSize: '14px',
    color: theme === 'dark' ? '#9ca3af' : '#6b7280',
    margin: 0
  }

  const sessionListStyle = {
    maxHeight: '300px',
    overflowY: 'auto' as const
  }

  const sessionItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
    fontSize: '14px'
  }

  // Helper function to validate UUID format
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  useEffect(() => {
    setIsMounted(true)
    if (user) {
      loadUserPreferences()
      loadProfileData()
    }
  }, [user])

  useEffect(() => {
    if (user && activeTab === 'analytics') {
      loadAnalyticsData()
    }
  }, [activeTab, user])

  const loadUserPreferences = async () => {
    if (!user) return
    
    try {
      if (!isValidUUID(user.id)) {
        console.error('Invalid user ID format');
        return;
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          await createDefaultPreferences();
        }
        return;
      }
      
      if (data) {
        const loadedPreferences = {
          ...data.preferences,
          break_duration: Number(data.preferences.break_duration) || 5,
          work_duration: Number(data.preferences.work_duration) || 25,
          long_break_duration: Number(data.preferences.long_break_duration) || 15
        }
        setPreferences(loadedPreferences)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const createDefaultPreferences = async () => {
    if (!user) return
    
    try {
      const defaultPreferences = {
        auto_break_enabled: true,
        break_duration: 5,
        work_duration: 25,
        long_break_duration: 15,
        notifications_enabled: true,
        default_view: 'dashboard',
        sound_effects: true,
        dark_mode: theme === 'dark'
      };

      const { data, error } = await supabase
        .from('user_preferences')
        .insert([{
          user_id: user.id,
          preferences: defaultPreferences
        }])
        .select('preferences')
        .single()
      
      if (data && !error) {
        setPreferences(defaultPreferences);
      }
    } catch (error) {
      console.error('Error creating default preferences:', error)
    }
  }

  const loadProfileData = () => {
    if (!user) return;
    
    setProfileData({
      name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
      email: user.email || ''
    });
  };

  const saveProfileData = async () => {
    if (!user) return;
    
    setIsSavingProfile(true);
    setProfileSaveStatus('idle');
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          full_name: profileData.name.trim(),
          name: profileData.name.trim()
        }
      });
      
      if (error) {
        console.error('Profile update error:', error);
        setProfileSaveStatus('error');
      } else {
        setProfileSaveStatus('success');
        // Update local user metadata
        await supabase.auth.refreshSession();
        setTimeout(() => setProfileSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setProfileSaveStatus('error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return
    
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferences: preferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
      
      if (error) {
        setSaveStatus('error')
      } else {
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch (error) {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreferenceChange = async (key: keyof UserPreferences, value: any) => {
    // Convert numeric values
    if (['break_duration', 'work_duration', 'long_break_duration'].includes(key)) {
      value = parseInt(value) || 0
    }
    
    // Update local state immediately
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))

    // Special handling for theme toggle
    if (key === 'dark_mode') {
      if (value !== (theme === 'dark')) {
        toggleTheme()
      }
    }

    // Save to Supabase with error handling
    if (user) {
      try {
        // Validate user ID
        if (!isValidUUID(user.id)) {
          console.error('Invalid user ID format');
          return;
        }

        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            preferences: {
              ...preferences,
              [key]: value
            },
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })

        if (error) {
          console.error('Error saving preference:', error.message || error);
          // Revert local change
          setPreferences(prev => ({
            ...prev,
            [key]: preferences[key] // Revert to previous value
          }))
        } else {
          setSaveStatus('success')
          setTimeout(() => setSaveStatus('idle'), 2000)
        }
      } catch (error) {
        console.error('Unexpected error saving preference:', error);
        // Revert local change
        setPreferences(prev => ({
          ...prev,
          [key]: preferences[key]
        }))
      }
    }
  }

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, key: keyof UserPreferences) => {
    const value = e.target.value === '' ? 0 : parseInt(e.target.value)
    handlePreferenceChange(key, isNaN(value) ? 0 : value)
  }

  // Analytics functions
  const loadAnalyticsData = async () => {
    if (!user) return
    
    setIsLoadingAnalytics(true)
    try {
      // Load focus sessions
      const { data: sessions, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (sessions && !error) {
        setFocusSessions(sessions)
        
        // Calculate totals
        const totalTime = sessions.reduce((sum, session) => sum + Math.round(session.duration / 60), 0)
        const totalTasks = sessions.reduce((sum, session) => sum + session.completed_tasks, 0)
        
        setTotalFocusTime(totalTime)
        setTotalTasksCompleted(totalTasks)
        
        // Calculate weekly trends
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - i)
          return date.toISOString().split('T')[0]
        }).reverse()

        const weeklyData = last7Days.map(date => {
          const daySessions = sessions.filter(session => 
            new Date(session.created_at).toISOString().split('T')[0] === date
          )
          
          const dayFocus = daySessions.reduce((sum, session) => sum + Math.round(session.duration / 60), 0)
          const dayTasks = daySessions.reduce((sum, session) => sum + session.completed_tasks, 0)
          
          return {
            date,
            focusTime: dayFocus,
            tasksCompleted: dayTasks
          }
        })
        
        setWeeklyTrends(weeklyData)
        
        // Calculate productivity score (simplified)
        const activeDays = last7Days.filter(date => 
          weeklyData.find(day => day.date === date)?.focusTime > 0
        ).length
        
        const consistency = (activeDays / 7) * 40
        const efficiency = Math.min(100, (totalTasks / 20) * 60) // 20 tasks per week target
        setProductivityScore(Math.round(consistency + efficiency))
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  const exportAnalyticsData = () => {
    const csvContent = [
      ['Date', 'Session Type', 'Duration (minutes)', 'Tasks Completed'],
      ...focusSessions.map(session => [
        new Date(session.created_at).toLocaleDateString(),
        session.session_type,
        Math.round(session.duration / 60),
        session.completed_tasks
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `focusflow-analytics-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  if (!isMounted) {
    return (
      <div style={containerStyle}>
        {/* 👇 USE NEW GLOBAL CLASS */}
        <div className="page-container">
          <h1 style={titleStyle}>Profile & Settings</h1>
        </div>
        <Navbar />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* 👇 USE NEW GLOBAL CLASS */}
      <div className="page-container">
        <h1 style={titleStyle}>Profile & Settings</h1>
        
        {/* Status Messages */}
        {saveStatus === 'success' && (
          <div style={{ padding: '12px 16px', backgroundColor: '#10b981', color: 'white', borderRadius: '8px', marginBottom: '16px' }}>
            Preferences saved successfully!
          </div>
        )}
        
        {saveStatus === 'error' && (
          <div style={{ padding: '12px 16px', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px', marginBottom: '16px' }}>
            Failed to save preferences. Please try again.
          </div>
        )}

        {/* Tab Navigation */}
        <div style={tabContainerStyle}>
          <button style={tabStyle(activeTab === 'profile')} onClick={() => setActiveTab('profile')}>
            Profile
          </button>
          <button style={tabStyle(activeTab === 'preferences')} onClick={() => setActiveTab('preferences')}>
            Preferences
          </button>
          <button style={tabStyle(activeTab === 'analytics')} onClick={() => setActiveTab('analytics')}>
            Analytics
          </button>
          <button style={tabStyle(activeTab === 'subscription')} onClick={() => setActiveTab('subscription')}>
            Subscription
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Account Information</h2>
            
            {profileSaveStatus === 'success' && (
              <div style={{ padding: '12px 16px', backgroundColor: '#10b981', color: 'white', borderRadius: '8px', marginBottom: '16px' }}>
                Profile updated successfully!
              </div>
            )}
            
            {profileSaveStatus === 'error' && (
              <div style={{ padding: '12px 16px', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px', marginBottom: '16px' }}>
                Failed to update profile. Please try again.
              </div>
            )}

            <div style={inputGroupStyle}>
              <label htmlFor="name" style={labelStyle}>Name</label>
              <input 
                type="text" 
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                style={inputStyle}
                placeholder="Enter your name"
              />
            </div>
            
            <div style={inputGroupStyle}>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <input 
                type="email" 
                id="email"
                value={profileData.email}
                style={inputStyle}
                disabled
              />
            </div>
            
            <button onClick={saveProfileData} disabled={isSavingProfile} style={saveButtonStyle}>
              {isSavingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div>
            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Focus Preferences</h2>
              
              <div style={toggleContainerStyle}>
                <span style={toggleLabelStyle}>Auto Start Breaks</span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={preferences.auto_break_enabled}
                    onChange={(e) => handlePreferenceChange('auto_break_enabled', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div style={toggleContainerStyle}>
                <span style={toggleLabelStyle}>Sound Effects</span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={preferences.sound_effects}
                    onChange={(e) => handlePreferenceChange('sound_effects', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {/* Fix duration inputs */}
              <div style={inputGroupStyle}>
                <label htmlFor="workDuration" style={labelStyle}>Work Duration (minutes)</label>
                <input 
                  type="number" 
                  id="workDuration"
                  value={preferences.work_duration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 25;
                    handlePreferenceChange('work_duration', value);
                  }}
                  style={inputStyle}
                  min="5"
                  max="60"
                />
              </div>

              <div style={inputGroupStyle}>
                <label htmlFor="breakDuration" style={labelStyle}>Break Duration (minutes)</label>
                <input 
                  type="number" 
                  id="breakDuration"
                  value={preferences.break_duration}
                  onChange={(e) => handleNumberInput(e, 'break_duration')}
                  style={inputStyle}
                  min="1"
                  max="15"
                />
              </div>

              <div style={inputGroupStyle}>
                <label htmlFor="longBreakDuration" style={labelStyle}>Long Break Duration (minutes)</label>
                <input 
                  type="number" 
                  id="longBreakDuration"
                  value={preferences.long_break_duration}
                  onChange={(e) => handleNumberInput(e, 'long_break_duration')}
                  style={inputStyle}
                  min="5"
                  max="30"
                />
              </div>
            </div>

            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Appearance</h2>
              <div style={toggleContainerStyle}>
                <span style={toggleLabelStyle}>
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={theme === 'dark'}
                    onChange={(e) => {
                      toggleTheme();
                      handlePreferenceChange('dark_mode', e.target.checked);
                    }}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <button onClick={savePreferences} style={saveButtonStyle} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Productivity Analytics</h2>
            <p style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280', marginBottom: '24px' }}>
              {isLoadingAnalytics ? 'Loading your productivity data...' : 'Track your productivity trends and improve your focus habits.'}
            </p>
            
            {isLoadingAnalytics ? (
              <div style={{ textAlign: 'center', padding: '40px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                <div style={{ animation: 'spin 1s linear infinite', fontSize: '24px', marginBottom: '16px' }}>⏳</div>
                Loading your productivity data...
              </div>
            ) : (
              <>
                <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={statCardStyle}>
                    <div style={statValueStyle}>{focusSessions.length}</div>
                    <div style={statLabelStyle}>Focus Sessions</div>
                  </div>
                  
                  <div style={statCardStyle}>
                    <div style={statValueStyle}>
                      {Math.floor(totalFocusTime / 60)}h {totalFocusTime % 60}m
                    </div>
                    <div style={statLabelStyle}>Total Focus Time</div>
                  </div>
                  
                  <div style={statCardStyle}>
                    <div style={statValueStyle}>{totalTasksCompleted}</div>
                    <div style={statLabelStyle}>Tasks Completed</div>
                  </div>
                  
                  <div style={statCardStyle}>
                    <div style={{...statValueStyle, color: productivityScore > 80 ? '#10b981' : productivityScore > 60 ? '#f59e0b' : '#ef4444'}}>
                      {productivityScore}
                    </div>
                    <div style={statLabelStyle}>Productivity Score</div>
                  </div>
                </div>

                {/* Weekly Focus Chart */}
                <div style={{ height: '200px', backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                  {weeklyTrends.length > 0 ? (
                    <div style={{ width: '100%', height: '100%' }}>
                      <h4 style={{ marginBottom: '12px', color: theme === 'dark' ? '#f3f4f6' : '#374151' }}>Weekly Focus Time</h4>
                      <div style={{ display: 'flex', alignItems: 'end', gap: '8px', height: '120px' }}>
                        {weeklyTrends.map((day, index) => (
                          <div key={index} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ height: `${Math.min(100, (day.focusTime / 120) * 100)}px`, backgroundColor: '#3b82f6', borderRadius: '4px 4px 0 0', margin: '0 auto', width: '20px' }} />
                            <div style={{ fontSize: '12px', marginTop: '8px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                              {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280', textAlign: 'center', padding: '20px' }}>
                      No focus sessions recorded yet. Start a Pomodoro session to see analytics!
                    </div>
                  )}
                </div>

                {/* Session History */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}>
                    Recent Focus Sessions
                  </h3>
                  <div style={sessionListStyle}>
                    {focusSessions.slice(0, 5).map(session => (
                      <div key={session.id} style={sessionItemStyle}>
                        <span>{new Date(session.created_at).toLocaleDateString()} - {session.session_type}</span>
                        <span>{Math.round(session.duration / 60)}m • {session.completed_tasks} tasks</span>
                      </div>
                    ))}
                    {focusSessions.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                        No focus sessions recorded yet
                      </div>
                    )}
                  </div>
                </div>

                {focusSessions.length > 0 && (
                  <button onClick={exportAnalyticsData} style={{ padding: '10px 16px', backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6', color: theme === 'dark' ? '#d1d5db' : '#374151', border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`, borderRadius: '8px', cursor: 'pointer', marginTop: '16px' }}>
                    📊 Export Analytics Data
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Subscription Plan</h2>
            <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', borderRadius: '12px', padding: '24px', color: '#ffffff', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Pro Plan</h3>
              <p style={{ fontSize: '16px', marginBottom: '16px', opacity: '0.9' }}>$9.99/month</p>
              <ul style={{ margin: '16px 0', paddingLeft: '20px', opacity: '0.9' }}>
                <li>Unlimited AI task suggestions</li>
                <li>Advanced focus analytics</li>
                <li>Priority support</li>
                <li>Custom themes</li>
                <li>Export your data</li>
              </ul>
              <button style={{ marginTop: '16px', backgroundColor: '#ffffff', color: '#2563eb', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', width: '100%' }}>
                Upgrade to Pro
              </button>
            </div>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  )
}