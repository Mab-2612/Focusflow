// app/preferences/page.tsx
"use client"

import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'

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

const DEFAULT_PREFERENCES: UserPreferences = {
  auto_break_enabled: true,
  break_duration: 5,
  work_duration: 25,
  long_break_duration: 15,
  notifications_enabled: true,
  default_view: 'dashboard',
  sound_effects: true,
  dark_mode: false 
}

export default function PreferencesPage() {
  const { theme, toggleTheme, setTheme } = useTheme()
  const { user } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error' | 'reset'>('idle')
  
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // --- Styles (no changes) ---
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    transition: 'background-color 0.3s ease, color 0.3s ease'
  }
  const titleStyle = {
    fontSize: 'var(--font-xl)',
    fontWeight: '700',
    marginBottom: '32px',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  }
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
    fontSize: '16px',
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
    width: '100%'
  }
  const resetButtonStyle = {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: theme === 'dark' ? '#f87171' : '#ef4444',
    border: `1px solid ${theme === 'dark' ? '#f87171' : '#ef4444'}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    opacity: isSaving ? 0.7 : 1,
    width: '100%',
    marginTop: '12px'
  }
  
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  useEffect(() => {
    setIsMounted(true)
    if (user) {
      loadUserPreferences()
    }
  }, [user])

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
      
      if (data && data.preferences) {
        const loadedPreferences = {
          ...DEFAULT_PREFERENCES, 
          ...data.preferences,
          break_duration: Number(data.preferences.break_duration) || DEFAULT_PREFERENCES.break_duration,
          work_duration: Number(data.preferences.work_duration) || DEFAULT_PREFERENCES.work_duration,
          long_break_duration: Number(data.preferences.long_break_duration) || DEFAULT_PREFERENCES.long_break_duration
        }
        setPreferences(loadedPreferences)
      } else {
        await createDefaultPreferences();
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const createDefaultPreferences = async () => {
    if (!user) return
    
    try {
      const prefsToSave = {
        ...DEFAULT_PREFERENCES,
        dark_mode: theme === 'dark'
      }
      setPreferences(prefsToSave);

      await supabase
        .from('user_preferences')
        .insert([{
          user_id: user.id,
          preferences: prefsToSave
        }])
        .select()
        .single()
      
    } catch (error) {
      console.error('Error creating default preferences:', error)
    }
  }

  const savePreferences = async (isReset: boolean = false) => {
    if (!user) return
    
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      let preferencesToSave = {
        ...preferences,
        dark_mode: theme === 'dark'
      }
      
      if (isReset) {
        preferencesToSave = { ...DEFAULT_PREFERENCES, dark_mode: false };
        setPreferences(preferencesToSave);
        setTheme('system');
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferences: preferencesToSave,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
      
      if (error) {
        setSaveStatus('error')
      } else {
        setSaveStatus(isReset ? 'reset' : 'success')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch (error) {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const updatePreferencesInState = (key: keyof UserPreferences, value: any) => {
    setSaveStatus('idle') 
    if (['break_duration', 'work_duration', 'long_break_duration'].includes(key)) {
      value = parseInt(value)
      if (isNaN(value)) value = 0; // Set state to 0 if input is empty
    }
    
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))

    if (key === 'dark_mode') {
      if (value !== (theme === 'dark')) {
        toggleTheme()
      }
    }
  }
  
  const handleResetDefaults = () => {
    setShowResetConfirm(true);
  }

  const handleConfirmReset = () => {
    savePreferences(true);
    setShowResetConfirm(false);
  }

  if (!isMounted) {
    return (
      <div style={containerStyle}>
        <div className="page-container">
          <h1 style={titleStyle}>Preferences</h1>
        </div>
        <Navbar />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div className="page-container">
        <h1 style={titleStyle}>Preferences</h1>
        
        {saveStatus === 'success' && (
          <div style={{ padding: '12px 16px', backgroundColor: '#10b981', color: 'white', borderRadius: '8px', marginBottom: '16px' }}>
            Preferences saved successfully!
          </div>
        )}
        {saveStatus === 'reset' && (
          <div style={{ padding: '12px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '8px', marginBottom: '16px' }}>
            Preferences reset to default and saved.
          </div>
        )}
        {saveStatus === 'error' && (
          <div style={{ padding: '12px 16px', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px', marginBottom: '16px' }}>
            Failed to save preferences. Please try again.
          </div>
        )}

        <div>
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Focus Preferences</h2>
            
            <div style={toggleContainerStyle}>
              <span style={toggleLabelStyle}>Auto Start Breaks</span>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={preferences.auto_break_enabled}
                  onChange={(e) => updatePreferencesInState('auto_break_enabled', e.target.checked)}
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
                  onChange={(e) => updatePreferencesInState('sound_effects', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div style={inputGroupStyle}>
              <label htmlFor="workDuration" style={labelStyle}>Work Duration (minutes)</label>
              <input 
                type="number" 
                id="workDuration"
                // FIXED: Show empty string if value is 0
                value={preferences.work_duration === 0 ? '' : preferences.work_duration}
                onChange={(e) => updatePreferencesInState('work_duration', e.target.value)}
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
                // FIXED: Show empty string if value is 0
                value={preferences.break_duration === 0 ? '' : preferences.break_duration}
                onChange={(e) => updatePreferencesInState('break_duration', e.target.value)}
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
                // FIXED: Show empty string if value is 0
                value={preferences.long_break_duration === 0 ? '' : preferences.long_break_duration}
                onChange={(e) => updatePreferencesInState('long_break_duration', e.target.value)}
                style={inputStyle}
                min="5"
                max="30"
              />
            </div>
          </div>

          <button onClick={() => savePreferences(false)} style={saveButtonStyle} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
          
          <button onClick={handleResetDefaults} style={resetButtonStyle} disabled={isSaving}>
            Reset to Default
          </button>
        </div>
      </div>

      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="chat-confirm-modal">
            <h2 className="chat-confirm-title">Reset Preferences?</h2>
            <p className="chat-confirm-text">
              Are you sure you want to reset all preferences to their defaults? This will be saved immediately.
            </p>
            <div className="chat-confirm-buttons">
              <button
                className="chat-confirm-button chat-confirm-button-cancel"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="chat-confirm-button chat-confirm-button-danger"
                onClick={handleConfirmReset}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  )
}