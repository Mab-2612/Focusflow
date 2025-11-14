// app/onboarding/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/components/ThemeContext'
import { Eye, EyeOff, Loader2, Moon, Sun } from 'lucide-react'

export default function OnboardingPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('') // <-- NEW: Confirm password state
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user, loading: authLoading } = useAuth()

  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  // Redirect if user is already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      if (isLogin) {
        // --- Sign In Logic ---
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.user) router.push('/dashboard')
      } else {
        // --- Sign Up Logic ---
        // <-- NEW: Check if passwords match -->
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setIsLoading(false)
          return
        }
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
        if (data.user) setError('Check your email for the confirmation link.')
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim()) return
    
    setResetStatus('sending')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) throw error
      setResetStatus('success')
    } catch (error: any) {
      console.error('Password reset failed:', error)
      setResetStatus('error')
    }
  }

  // --- STYLES ---

  const containerStyle = {
    minHeight: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
    backgroundImage: theme === 'dark' 
      ? 'linear-gradient(135deg, #111827 0%, #1f2937 100%)' 
      : 'linear-gradient(135deg, #f9fafb 0%, #eef2ff 100%)',
    padding: '16px'
  }

  const cardStyle = {
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    padding: '32px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center' as const,
    border: `1px solid var(--border-light)`,
    position: 'relative' as const
  }

  const titleStyle = {
    fontSize: 'var(--font-xl)',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '8px'
  }

  const subtitleStyle = {
    color: 'var(--text-secondary)',
    marginBottom: '32px',
    fontSize: 'var(--font-sm)'
  }

  const formStyle = {
    marginTop: '24px'
  }

  const inputGroupStyle = {
    marginBottom: '16px',
    textAlign: 'left' as const,
    position: 'relative' as const
  }

  const labelStyle = {
    display: 'block',
    fontSize: 'var(--font-sm)',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: '8px'
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: `1px solid var(--border-medium)`,
    borderRadius: 'var(--radius-md)',
    fontSize: '16px',
    boxSizing: 'border-box' as const,
    height: '48px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  const passwordToggleStyle = {
    position: 'absolute' as const,
    right: '12px',
    top: '44px',
    cursor: 'pointer',
    color: 'var(--text-tertiary)', // <-- FIXED: Use CSS variable
    backgroundColor: 'transparent',
    border: 'none',
    padding: '4px'
  }

  const submitButtonStyle = {
    width: '100%',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '16px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isLoading ? 0.7 : 1
  }

  const toggleAuthStyle = {
    fontSize: 'var(--font-sm)',
    color: 'var(--text-tertiary)',
    textAlign: 'center' as const
  }

  const linkStyle = {
    color: 'var(--accent-primary)',
    fontWeight: '500',
    cursor: 'pointer'
  }

  const errorStyle = {
    color: 'var(--accent-danger)',
    backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
    border: `1px solid ${theme === 'dark' ? '#ef4444' : '#fecaca'}`,
    fontSize: 'var(--font-sm)',
    marginBottom: '16px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    textAlign: 'left' as const
  }

  // Loading check
  if (authLoading || user) {
    return (
      <div style={{ ...containerStyle, backgroundColor: 'var(--bg-primary)', minHeight: '100dvh' }}>
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-tertiary)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={titleStyle}>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p style={subtitleStyle}>Sign in to continue to FocusFlow</p>
        </div>

        {/* GOOGLE SIGN-IN COMMENTED OUT
        ...
        */ }

        <div style={formStyle}>
          <form onSubmit={handleEmailSubmit}>
            {error && <div style={errorStyle}>{error}</div>}
            
            <div style={inputGroupStyle}>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            
            <div style={inputGroupStyle}>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{...inputStyle, paddingRight: '48px'}}
                placeholder="••••••••"
                required
                disabled={isLoading}
                minLength={6}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
              <button 
                type="button" 
                style={passwordToggleStyle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* --- NEW: Confirm Password Field --- */}
            {!isLogin && (
              <div style={inputGroupStyle}>
                <label htmlFor="confirm-password" style={labelStyle}>Confirm Password</label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{...inputStyle, paddingRight: '48px'}}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            )}
            
            <button 
              type="submit" 
              style={submitButtonStyle}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
          
          <div style={toggleAuthStyle}>
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span 
                style={linkStyle}
                onClick={() => !isLoading && setIsLogin(!isLogin)}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </span>
            </p>
          </div>

          {/* Password Reset Section */}
          {showResetPassword ? (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              marginTop: '20px',
              border: '1px solid var(--border-light)'
            }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: 'var(--font-base)' }}>
                Reset Password
              </h3>
              
              {resetStatus === 'success' ? (
                <div style={{...errorStyle, color: 'var(--accent-success)', backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4', borderColor: theme === 'dark' ? '#10b981' : '#a7f3d0'}}>
                  ✅ Check your email for a password reset link!
                </div>
              ) : resetStatus === 'error' ? (
                <div style={errorStyle}>
                  ❌ Failed to send reset email. Please try again.
                </div>
              ) : null}
              
              <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label htmlFor="reset-email" style={labelStyle}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="reset-email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="Enter your email"
                    required
                    disabled={resetStatus === 'sending'}
                    autoComplete="email"
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={resetStatus === 'sending' || !resetEmail.trim()}
                    style={{...submitButtonStyle, flex: 1, marginBottom: 0, opacity: (resetStatus === 'sending' || !resetEmail.trim()) ? 0.7 : 1}}
                  >
                    {resetStatus === 'sending' ? <Loader2 size={20} className="animate-spin" /> : 'Send Link'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetPassword(false)
                      setResetStatus('idle')
                      setResetEmail('')
                    }}
                    style={{
                      ...submitButtonStyle,
                      marginBottom: 0,
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-medium)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowResetPassword(true)}
              style={{
                marginTop: '16px',
                padding: '10px 16px',
                backgroundColor: 'transparent',
                color: 'var(--accent-primary)',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'none',
                fontSize: 'var(--font-sm)',
                fontWeight: 500
              }}
            >
              Forgot your password?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}