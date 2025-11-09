//app/profile/page.tsx
"use client"

import { useTheme } from '@/components/ThemeContext'
import Navbar from '@/components/Navbar'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'

export default function ProfilePage() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  
  // Theme-aware styles
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
    fontSize: '16px', // 16px to prevent mobile zoom
    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
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
    opacity: isSavingProfile ? 0.7 : 1,
    width: '100%'
  }

  useEffect(() => {
    setIsMounted(true)
    if (user) {
      loadProfileData()
    }
  }, [user])

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

  if (!isMounted) {
    return (
      <div style={containerStyle}>
        <div className="page-container">
          <h1 style={titleStyle}>Profile</h1>
        </div>
        <Navbar />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div className="page-container">
        <h1 style={titleStyle}>Profile</h1>
        
        {/* Profile Tab Content */}
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
      </div>

      <Navbar />
    </div>
  )
}