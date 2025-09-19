// app/profile/page.tsx
"use client"

import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'

interface UserPreferences {
  auto_break_enabled: boolean
  break_duration: number
  work_duration: number
  long_break_duration: number
  notifications_enabled: boolean
  default_view: 'dashboard' | 'voice' | 'pomodoro'
  sound_effects: boolean
}

export default function ProfilePage() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'subscription' | 'analytics'>('profile')
  const [preferences, setPreferences] = useState<UserPreferences>({
    auto_break_enabled: true,
    break_duration: 5,
    work_duration: 25,
    long_break_duration: 15,
    notifications_enabled: true,
    default_view: 'dashboard',
    sound_effects: true
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Theme-aware styles - MOVED TO TOP LEVEL
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
    paddingBottom: '96px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    transition: 'background-color 0.3s ease, color 0.3s ease'
  }

  const contentStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 16px'
  }

  const titleStyle = {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '32px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    transition: 'color 0.3s ease'
  }

  const tabContainerStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
    paddingBottom: '16px'
  }

  const tabStyle = (isActive: boolean) => ({
    padding: '8px 16px',
    backgroundColor: isActive ? (theme === 'dark' ? '#2563eb' : '#3b82f6') : 'transparent',
    color: isActive ? 'white' : (theme === 'dark' ? '#d1d5db' : '#6b7280'),
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  })

  const sectionStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    marginBottom: '24px',
    transition: 'background-color 0.3s ease'
  }

  const sectionTitleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '16px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    transition: 'color 0.3s ease'
  }

  const inputGroupStyle = {
    marginBottom: '16px'
  }

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: theme === 'dark' ? '#d1d5db' : '#374151',
    transition: 'color 0.3s ease'
  }

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid ' + (theme === 'dark' ? '#374151' : '#d1d5db'),
    borderRadius: '12px',
    fontSize: '16px',
    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    transition: 'border-color 0.3s ease, background-color 0.3s ease, color 0.3s ease'
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
    fontWeight: '500',
    transition: 'color 0.3s ease'
  }

  const toggleButtonStyle = (isOn: boolean) => ({
    position: 'relative' as const,
    display: 'inline-flex',
    height: '24px',
    width: '44px',
    alignItems: 'center',
    borderRadius: '12px',
    backgroundColor: isOn ? '#10b981' : (theme === 'dark' ? '#374151' : '#d1d5db'),
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.3s ease'
  })

  const toggleThumbStyle = (isOn: boolean) => ({
    height: '19px',
    width: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transform: isOn ? 'translateX(22px)' : 'translateX(2px)',
    transition: 'transform 0.3s ease'
  })

  const saveButtonStyle = {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    opacity: isSaving ? 0.7 : 1
  }

  useEffect(() => {
    setIsMounted(true)
    if (user) {
      loadUserPreferences()
      loadProfileData()
    }
  }, [user])

  // Helper function to validate UUID format
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  const loadUserPreferences = async () => {
    if (!user) return
    
    try {
      // Validate the user ID is a valid UUID
      if (!isValidUUID(user.id)) {
        console.error('Invalid user ID format:', user.id);
        return;
      }

      console.log('Loading preferences for user ID:', user.id);
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single()
      
      console.log('Query result:', { data, error });
      
      if (error) {
        console.error('Full error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        if (error.code === 'PGRST116') {
          // No preferences found, create default ones
          console.log('No preferences found, creating default...');
          await createDefaultPreferences();
        }
        return;
      }
      
      if (data) {
        // Ensure all numeric values are valid numbers
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
        sound_effects: true
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
        console.log('Default preferences created successfully');
        setPreferences(defaultPreferences);
      } else if (error) {
        console.error('Error creating default preferences:', error);
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
          full_name: profileData.name,
          name: profileData.name 
        }
      });
      
      if (error) {
        console.error('Error updating profile:', error);
        setProfileSaveStatus('error');
      } else {
        console.log('Profile updated successfully');
        setProfileSaveStatus('success');
        setTimeout(() => setProfileSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
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
        console.error('Error saving preferences:', error)
        setSaveStatus('error')
      } else {
        setSaveStatus('success')
        // Clear success message after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    // Ensure numeric values are properly converted
    if (['break_duration', 'work_duration', 'long_break_duration'].includes(key)) {
      value = parseInt(value) || 0
    }
    
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, key: keyof UserPreferences) => {
    const value = e.target.value === '' ? 0 : parseInt(e.target.value)
    handlePreferenceChange(key, isNaN(value) ? 0 : value)
  }

  if (!isMounted) {
    return (
      <div style={containerStyle}>
        <div style={contentStyle}>
          <h1 style={titleStyle}>Profile & Settings</h1>
        </div>
        <Navbar />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <h1 style={titleStyle}>Profile & Settings</h1>
        
        {/* Status Message */}
        {saveStatus === 'success' && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>✓</span>
            Preferences saved successfully!
          </div>
        )}
        
        {saveStatus === 'error' && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            Failed to save preferences. Please try again.
          </div>
        )}

        {/* Tab Navigation */}
        <div style={tabContainerStyle}>
          <button 
            style={tabStyle(activeTab === 'profile')}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            style={tabStyle(activeTab === 'preferences')}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
          <button 
            style={tabStyle(activeTab === 'analytics')}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button 
            style={tabStyle(activeTab === 'subscription')}
            onClick={() => setActiveTab('subscription')}
          >
            Subscription
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Account Information</h2>
            
            {/* Profile Save Status */}
            {profileSaveStatus === 'success' && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>✓</span>
                Profile updated successfully!
              </div>
            )}
            
            {profileSaveStatus === 'error' && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
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
            
            <button 
              onClick={saveProfileData}
              disabled={isSavingProfile}
              style={{
                padding: '12px 24px',
                backgroundColor: isSavingProfile ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {isSavingProfile ? 'Saving...' : 'Save Profile'}
            </button>
            
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
              borderRadius: '8px',
              fontSize: '14px',
              color: theme === 'dark' ? '#d1d5db' : '#6b7280'
            }}>
              <strong>Note:</strong> Changing your email address requires verification. 
              Please contact support if you need to update your email.
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div>
            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Focus Preferences</h2>
              
              <div style={toggleContainerStyle}>
                <span style={toggleLabelStyle}>Auto Start Breaks</span>
                <div className="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="auto-break"
                    checked={preferences.auto_break_enabled}
                    onChange={() => handlePreferenceChange('auto_break_enabled', !preferences.auto_break_enabled)}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>

              <div style={toggleContainerStyle}>
                <span style={toggleLabelStyle}>Sound Effects</span>
                <div className="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="sound-effects"
                    checked={preferences.sound_effects}
                    onChange={() => handlePreferenceChange('sound_effects', !preferences.sound_effects)}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>

              <div style={inputGroupStyle}>
                <label htmlFor="workDuration" style={labelStyle}>Work Duration (minutes)</label>
                <input 
                  type="number" 
                  id="workDuration"
                  value={isNaN(preferences.work_duration) ? '' : preferences.work_duration}
                  onChange={(e) => handleNumberInput(e, 'work_duration')}
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
                  value={isNaN(preferences.break_duration) ? '' : preferences.break_duration}
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
                  value={isNaN(preferences.long_break_duration) ? '' : preferences.long_break_duration}
                  onChange={(e) => handleNumberInput(e, 'long_break_duration')}
                  style={inputStyle}
                  min="5"
                  max="30"
                />
              </div>

              <div style={inputGroupStyle}>
                <label htmlFor="defaultView" style={labelStyle}>Default View</label>
                <select
                  id="defaultView"
                  value={preferences.default_view}
                  onChange={(e) => handlePreferenceChange('default_view', e.target.value)}
                  style={inputStyle}
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="voice">Voice Assistant</option>
                  <option value="pomodoro">Pomodoro Timer</option>
                </select>
              </div>
            </div>

            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Appearance</h2>
              <div style={toggleContainerStyle}>
                <span style={toggleLabelStyle}>
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
                <div className="toggle-switch">
                  <input 
                    type="checkbox" 
                    id="dark-mode"
                    checked={theme === 'dark'}
                    onChange={toggleTheme}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>
            </div>

            <button 
              onClick={savePreferences}
              style={saveButtonStyle}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Productivity Analytics</h2>
            <p style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280', marginBottom: '24px' }}>
              Track your productivity trends and improve your focus habits.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                padding: '16px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>12</div>
                <div style={{ fontSize: '14px', color: theme === 'dark' ? '#d1d5db' : '#6b7280' }}>Focus Sessions</div>
              </div>
              <div style={{
                backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                padding: '16px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>5h 42m</div>
                <div style={{ fontSize: '14px', color: theme === 'dark' ? '#d1d5db' : '#6b7280' }}>Total Focus Time</div>
              </div>
              <div style={{
                backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                padding: '16px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>47%</div>
                <div style={{ fontSize: '14px', color: theme === 'dark' ? '#d1d5db' : '#6b7280' }}>Tasks Completed</div>
              </div>
            </div>
            
            <div style={{
              height: '200px',
              backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }}>
              Weekly Focus Chart (Placeholder)
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Subscription Plan</h2>
            <div style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              borderRadius: '12px',
              padding: '24px',
              color: '#ffffff',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Pro Plan</h3>
              <p style={{ fontSize: '16px', marginBottom: '16px', opacity: '0.9' }}>$9.99/month</p>
              <ul style={{ margin: '16px 0', paddingLeft: '20px', opacity: '0.9' }}>
                <li>Unlimited AI task suggestions</li>
                <li>Advanced focus analytics</li>
                <li>Priority support</li>
                <li>Custom themes</li>
                <li>Export your data</li>
              </ul>
              <button style={{
                marginTop: '16px',
                backgroundColor: '#ffffff',
                color: '#2563eb',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                width: '100%'
              }}>
                Upgrade to Pro
              </button>
            </div>
            
            <div style={{
              backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}>Free Plan</h4>
              <p style={{ margin: '0', color: theme === 'dark' ? '#d1d5db' : '#6b7280', fontSize: '14px' }}>
                Basic task management, limited AI features, and standard analytics.
              </p>
            </div>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  )
}