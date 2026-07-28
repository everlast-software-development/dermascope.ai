import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

// The operator's sign-in page — Step 4b of the auth.md claim ceremony.
// Reached via the `verification_uri` an agent hands to the operator after
// registering: /login?return_to=/claim%3Fclaim_attempt_token%3D...
// Single-operator, password-only (there is exactly one account on this site).
export default function OperatorLogin() {
  const params = new URLSearchParams(window.location.search)
  const returnTo = params.get('return_to') || '/claim'

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/operator/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        if (res.status === 429) throw new Error('Too many attempts. Try again in a minute.')
        throw new Error('Incorrect password.')
      }
      window.location.assign(returnTo)
    } catch (err) {
      setError(err.message || 'Sign in failed.')
      setSubmitting(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: "'Poppins', sans-serif",
        background: 'radial-gradient(120% 130% at 25% 10%, #2a636b 0%, #1b4e56 45%, #113b42 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(10px)',
          borderRadius: 20,
          padding: '40px 36px',
          boxShadow: '0 30px 70px -24px rgba(0,0,0,0.5)',
        }}
      >
        <img src="/logo.webp" alt="DermaScope.ai" style={{ height: 30, filter: 'brightness(0) invert(1)', display: 'block', margin: '0 auto 28px' }} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#ffffff', textAlign: 'center' }}>
          Operator sign-in
        </h1>
        <p style={{ margin: '10px 0 26px', fontSize: 13.5, lineHeight: 1.6, color: 'rgba(230,245,248,0.72)', textAlign: 'center' }}>
          An AI agent is asking you to confirm its registration. Sign in to continue.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            required
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.07)',
              color: '#ffffff',
              fontSize: 15,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {error && <div style={{ fontSize: 13, color: '#ff8a8a' }}>{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 6,
              padding: '13px 16px',
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(90deg, #007176, #17C7CC)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 15,
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
