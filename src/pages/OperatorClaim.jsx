import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const ERROR_COPY = {
  invalid_code: 'That code doesn’t match. Double-check it and try again.',
  code_expired: 'This code has expired. Ask the agent to request a new one.',
  claim_expired: 'This registration has expired. Ask the agent to register again.',
  too_many_attempts: 'Too many incorrect attempts. Ask the agent to request a new code.',
  not_found: 'This registration link isn’t valid — it may have already expired.',
}

// The claim confirmation page — Step 4b/4c of the auth.md claim ceremony.
// Reached after signing in at /login, via ?claim_attempt_token=... embedded
// in the verification_uri the agent handed to the operator. Confirming the
// code here is the actual authorization decision: it's what turns a pending
// registration into a claimed one an agent can get access tokens for.
export default function OperatorClaim() {
  const params = new URLSearchParams(window.location.search)
  const attemptToken = params.get('claim_attempt_token') || ''

  const [phase, setPhase] = useState('loading') // loading | ready | confirmed | error
  const [context, setContext] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const sessionRes = await fetch(`${API_BASE}/api/operator/session`).then((r) => r.json()).catch(() => ({ authenticated: false }))
      if (cancelled) return
      if (!sessionRes.authenticated) {
        const here = window.location.pathname + window.location.search
        window.location.assign(`/login?return_to=${encodeURIComponent(here)}`)
        return
      }

      const ctxRes = await fetch(`${API_BASE}/api/operator/claim/${encodeURIComponent(attemptToken)}`)
      const ctx = await ctxRes.json().catch(() => ({}))
      if (cancelled) return
      if (!ctxRes.ok) {
        setError(ERROR_COPY.not_found)
        setPhase('error')
        return
      }
      if (ctx.status === 'claimed') {
        setPhase('confirmed')
        return
      }
      setContext(ctx)
      setPhase('ready')
    }

    if (!attemptToken) {
      setError(ERROR_COPY.not_found)
      setPhase('error')
    } else {
      load()
    }

    return () => { cancelled = true }
  }, [attemptToken])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/operator/claim/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_attempt_token: attemptToken, user_code: code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        setError(ERROR_COPY[data.error] || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      setPhase('confirmed')
    } catch {
      setError('Network error — please try again.')
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
          maxWidth: 420,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(10px)',
          borderRadius: 20,
          padding: '40px 36px',
          boxShadow: '0 30px 70px -24px rgba(0,0,0,0.5)',
          textAlign: 'center',
        }}
      >
        <img src="/logo.webp" alt="DermaScope.ai" width={509} height={110} style={{ height: 30, width: 'auto', filter: 'brightness(0) invert(1)', display: 'block', margin: '0 auto 28px' }} />

        {phase === 'loading' && (
          <p style={{ color: 'rgba(230,245,248,0.72)', fontSize: 14 }}>Loading…</p>
        )}

        {phase === 'error' && (
          <>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#ffffff' }}>Can&rsquo;t confirm this registration</h1>
            <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.6, color: '#ff8a8a' }}>{error}</p>
          </>
        )}

        {phase === 'confirmed' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✓</div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#ffffff' }}>Registration confirmed</h1>
            <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.6, color: 'rgba(230,245,248,0.78)' }}>
              You can close this page and return to your agent — it will pick up automatically.
            </p>
          </>
        )}

        {phase === 'ready' && context && (
          <>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#ffffff' }}>Confirm agent registration</h1>
            <p style={{ margin: '14px 0 22px', fontSize: 13.5, lineHeight: 1.7, color: 'rgba(230,245,248,0.75)' }}>
              An agent registered with <strong style={{ color: '#7fd8e8' }}>{context.login_hint}</strong>, requesting:
              <br />
              <code style={{ color: '#7fd8e8' }}>{(context.scopes || []).join(', ')}</code>
              <br />
              Enter the 6-digit code it gave you to confirm.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                aria-label="6-digit confirmation code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.07)',
                  color: '#ffffff',
                  fontSize: 22,
                  letterSpacing: 8,
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {error && <div style={{ fontSize: 13, color: '#ff8a8a' }}>{error}</div>}
              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                style={{
                  marginTop: 6,
                  padding: '13px 16px',
                  borderRadius: 999,
                  border: 'none',
                  background: 'linear-gradient(90deg, #007176, #17C7CC)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: submitting || code.length !== 6 ? 'default' : 'pointer',
                  opacity: submitting || code.length !== 6 ? 0.6 : 1,
                }}
              >
                {submitting ? 'Confirming…' : 'Confirm'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
