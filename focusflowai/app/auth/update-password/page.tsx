// app/auth/update-password/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useTheme } from '@/components/ThemeContext'

export default function UpdatePasswordPage() {
  const { theme } = useTheme()
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Check if we have a valid session for password reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/onboarding?error=invalid_session')
      }
    }
    checkSession()
  }, [router])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
    padding: '20px'
  }

  const cardStyle = {
    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    marginBottom: '16px'
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '24px', 
          color: theme === 'dark' ? '#f3f4f6' : '#1f2937' 
        }}>
          Update Password
        </h1>

        {success ? (
          <div style={{
            padding: '16px',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            ✅ Password updated successfully! Redirecting to dashboard...
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword}>
            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #fecaca'
              }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="new-password" style={{
                display: 'block',
                marginBottom: '8px',
                color: theme === 'dark' ? '#d1d5db' : '#374151',
                fontSize: '14px'
              }}>
                New Password
              </label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={inputStyle}
                placeholder="Enter new password"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" style={{
                display: 'block',
                marginBottom: '8px',
                color: theme === 'dark' ? '#d1d5db' : '#374151',
                fontSize: '14px'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
                placeholder="Confirm new password"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginBottom: '16px'
              }}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/onboarding')}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: 'transparent',
                color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`,
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}