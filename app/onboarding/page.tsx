// Add these state variables to your OnboardingPage component
const [showResetPassword, setShowResetPassword] = useState(false)
const [resetEmail, setResetEmail] = useState('')
const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

// Add the password reset function
const handlePasswordReset = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!resetEmail.trim()) return
  
  setResetStatus('sending')
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    
    if (error) {
      console.error('Password reset error:', error)
      setResetStatus('error')
    } else {
      setResetStatus('success')
    }
  } catch (error) {
    console.error('Password reset failed:', error)
    setResetStatus('error')
  }
}

// Add this to your form section, below the login form
{showResetPassword ? (
  <div style={{
    backgroundColor: theme === 'dark' ? '#1f2937' : '#f9fafb',
    padding: '20px',
    borderRadius: '12px',
    marginTop: '20px',
    border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
  }}>
    <h3 style={{ marginBottom: '16px', color: theme === 'dark' ? '#f3f4f6' : '#374151' }}>
      Reset Password
    </h3>
    
    {resetStatus === 'success' ? (
      <div style={{
        padding: '12px',
        backgroundColor: '#10b981',
        color: 'white',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        ✅ Check your email for a password reset link!
      </div>
    ) : resetStatus === 'error' ? (
      <div style={{
        padding: '12px',
        backgroundColor: '#ef4444',
        color: 'white',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
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
        />
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="submit"
          disabled={resetStatus === 'sending' || !resetEmail.trim()}
          style={{
            padding: '10px 16px',
            backgroundColor: resetStatus === 'sending' ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: resetStatus === 'sending' ? 'not-allowed' : 'pointer',
            flex: 1
          }}
        >
          {resetStatus === 'sending' ? 'Sending...' : 'Send Reset Link'}
        </button>
        
        <button
          type="button"
          onClick={() => {
            setShowResetPassword(false)
            setResetStatus('idle')
            setResetEmail('')
          }}
          style={{
            padding: '10px 16px',
            backgroundColor: 'transparent',
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
            border: `1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}`,
            borderRadius: '8px',
            cursor: 'pointer'
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
      color: theme === 'dark' ? '#60a5fa' : '#3b82f6',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'underline',
      fontSize: '14px'
    }}
  >
    Forgot your password?
  </button>
)}