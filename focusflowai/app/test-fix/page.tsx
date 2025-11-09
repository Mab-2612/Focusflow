// app/test-fix/page.tsx
export default function TestFix() {
  return (
    <div style={{ padding: '20px', background: 'green', color: 'white' }}>
      <h1>✅ AUTH GUARD DISABLED - NO REDIRECT LOOP</h1>
      <p>If you see this, we found the problem: AuthGuard</p>
      <p>Timestamp: {Date.now()}</p>
    </div>
  )
}