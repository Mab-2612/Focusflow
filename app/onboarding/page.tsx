// app/onboarding/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  // const supabase = createClient()

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
    padding: '16px'
  }

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    padding: '32px',
    maxWidth: '448px',
    width: '100%',
    textAlign: 'center' as const
  }

  const headerStyle = {
    marginBottom: '32px'
  }

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px'
  }

  const subtitleStyle = {
    color: '#4b5563'
  }

  const googleButtonStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#374151',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '16px'
  }

  const disclaimerStyle = {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginBottom: '24px'
  }

  const formStyle = {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb'
  }

  const inputGroupStyle = {
    marginBottom: '16px',
    textAlign: 'left' as const,
    position: 'relative' as const
  }

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '4px'
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 40px 10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box' as const,
    height: '44px'
  }

  const passwordToggleStyle = {
    position: 'absolute' as const,
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'pointer',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '20px',
    width: '20px'
  }

  const submitButtonStyle = {
    width: '100%',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '16px',
    opacity: isLoading ? 0.7 : 1
  }

  const toggleAuthStyle = {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const
  }

  const linkStyle = {
    color: '#2563eb',
    fontWeight: '500',
    cursor: 'pointer'
  }

  const errorStyle = {
    color: '#ef4444',
    fontSize: '14px',
    marginBottom: '16px'
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      if (isLogin) {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) {
          setError(error.message)
          return
        }
        
        if (data.user) {
          router.push('/dashboard')
        }
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        
        if (error) {
          setError(error.message)
          return
        }
        
        if (data.user) {
          setError('Check your email for the confirmation link.')
          // You might want to automatically sign them in after confirmation
          // or redirect to a confirmation page
        }
      }
    } catch (err) {
      setError('Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) {
        setError(error.message)
        setIsLoading(false)
      }
    } catch (err) {
      setError('Google authentication failed. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Welcome to FocusFlow</h1>
          <p style={subtitleStyle}>Your AI-powered task management assistant</p>
        </div>

        <div>
          <button 
            style={googleButtonStyle} 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <p style={disclaimerStyle}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

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
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>
            
            <div style={inputGroupStyle}>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                minLength={6}
                autoComplete="current-password"
              />
              <button 
                type="button" 
                style={passwordToggleStyle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            
            <button 
              type="submit" 
              style={submitButtonStyle}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
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
        </div>
      </div>
    </div>
  )
}