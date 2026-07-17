import { Fragment, useRef, useState } from 'react'
import { roleOptions } from '../data'
import { useResponsive } from '../hooks/useResponsive'

// The multi-step "Join Early Access" form, extracted so it can be reused
// verbatim by both the marketing section (DemoForm) and the floating drawer
// (FloatingEarlyAccess). All validation + submit logic lives here — there is
// only ever one copy of this form.

const label = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#2F4148',
  marginBottom: 6,
}

const field = {
  boxSizing: 'border-box',
  width: '100%',
  padding: '12px 15px',
  borderRadius: 12,
  border: '1px solid #DCECEF',
  fontSize: 15,
  color: '#2F4148',
  background: '#FFFFFF',
}

const STEP_LABELS = ['About You', 'Your Practice', 'Your Focus']

// Backend base URL. Empty = same-origin (production single service, and dev via
// the Vite /api proxy). Override with VITE_API_URL for a split deployment.
const API_BASE = import.meta.env.VITE_API_URL || ''

function StepIndicator({ step }) {
  const { isMobile, isTablet } = useResponsive()
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 6 : 12,
        marginBottom: isMobile ? 22 : 30,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        rowGap: isMobile ? 10 : undefined,
      }}
    >
      {STEP_LABELS.map((name, i) => {
        const active = i === step
        const done = i < step
        return (
          <Fragment key={name}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 7 : 10,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: isMobile ? 30 : 34,
                  height: isMobile ? 30 : 34,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 700,
                  border: `1.5px solid ${active ? '#285F66' : done ? '#4C8F88' : '#DCECEF'}`,
                  background: done ? '#4C8F88' : active ? '#285F66' : '#F5FBFD',
                  color: done || active ? '#FFFFFF' : '#7A8B92',
                  transition: 'all .3s',
                  flexShrink: 0,
                }}
              >
                {done ? '✓' : i + 1}
              </span>
              <span
                style={{
                  fontSize: isMobile ? 12 : isTablet ? 13 : 13.5,
                  fontWeight: 600,
                  color: active ? '#1B4754' : '#7A8B92',
                  whiteSpace: 'nowrap',
                }}
              >
                {name}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <span
                style={{
                  flex: 1,
                  minWidth: isMobile ? 10 : undefined,
                  height: 2,
                  borderRadius: 2,
                  background: step > i ? '#4C8F88' : '#DCECEF',
                  transition: 'background .3s',
                }}
              />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

export default function EarlyAccessForm({ onSuccess }) {
  const { isMobile } = useResponsive()
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const nameRef = useRef(null)
  const emailRef = useRef(null)

  const nextStep = () => {
    // Validate contact details before leaving the first step.
    if (step === 0) {
      const n = nameRef.current
      const em = emailRef.current
      if (n && !n.value.trim()) {
        n.reportValidity()
        n.focus()
        return
      }
      if (em && (!em.value.trim() || !em.checkValidity())) {
        em.reportValidity()
        em.focus()
        return
      }
    }
    setStep((s) => Math.min(2, s + 1))
  }
  const backStep = () => setStep((s) => Math.max(0, s - 1))
  const submit = async (e) => {
    e.preventDefault()
    if (sending) return

    // Inputs from earlier steps stay mounted (hidden via display:none), so
    // FormData captures every field regardless of which step is visible.
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries())

    setSending(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(
          (Array.isArray(data.errors) && data.errors.join(' ')) ||
            data.error ||
            'Something went wrong. Please try again.',
        )
      }
      setSubmitted(true)
      if (typeof onSuccess === 'function') onSuccess()
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Could not reach the server. Please check your connection and try again.'
          : err.message,
      )
    } finally {
      setSending(false)
    }
  }

  const respField = isMobile ? { ...field, padding: '13px 15px', fontSize: 16 } : field

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '44px 12px' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(76,143,136,0.14)',
            color: '#4C8F88',
            fontSize: 26,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 22px',
          }}
        >
          ✓
        </div>
        <h3 style={{ margin: '0 0 12px', fontSize: 26, fontWeight: 700, color: '#1B4754' }}>
          Thank you — request received.
        </h3>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: '#7A8B92' }}>
          You're on the list. Our team will contact you shortly to set up your early access.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <StepIndicator step={step} />

      {/* Step 1 — About You */}
      <div style={{ display: step === 0 ? 'block' : 'none' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label htmlFor="ds-name" style={label}>
              Full name
            </label>
            <input
              ref={nameRef}
              id="ds-name"
              name="name"
              type="text"
              required
              placeholder="Dr. Sarah Haddad"
              className="ds-input"
              style={respField}
            />
          </div>
          <div>
            <label htmlFor="ds-email" style={label}>
              Work email
            </label>
            <input
              ref={emailRef}
              id="ds-email"
              name="email"
              type="email"
              required
              placeholder="s.haddad@clinic.com"
              className="ds-input"
              style={respField}
            />
          </div>
        </div>
      </div>

      {/* Step 2 — Your Practice */}
      <div style={{ display: step === 1 ? 'block' : 'none' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label htmlFor="ds-role" style={label}>
              Role
            </label>
            <select id="ds-role" name="role" className="ds-input" style={respField}>
              {roleOptions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ds-org" style={label}>
              Organization
            </label>
            <input
              id="ds-org"
              name="org"
              type="text"
              placeholder="Clinic, hospital, or institution"
              className="ds-input"
              style={respField}
            />
          </div>
        </div>
      </div>

      {/* Step 3 — Your Focus */}
      <div style={{ display: step === 2 ? 'block' : 'none' }}>
        <div>
          <label htmlFor="ds-msg" style={label}>
            What would you like to explore?{' '}
            <span style={{ fontWeight: 400, color: '#7A8B92' }}>(optional)</span>
          </label>
          <textarea
            id="ds-msg"
            name="message"
            rows={4}
            placeholder="Workflows, research use, team size…"
            className="ds-input"
            style={{ ...respField, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
        {step > 0 && (
          <button
            type="button"
            onClick={backStep}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid #DCECEF',
              background: '#FFFFFF',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: '#2F4148',
              fontSize: 15,
              fontWeight: 600,
              padding: isMobile ? '14px 20px' : '14px 26px',
              borderRadius: 999,
              transition: 'border-color .25s',
            }}
          >
            ← Back
          </button>
        )}
        {step < 2 && (
          <button
            type="button"
            onClick={nextStep}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: 'linear-gradient(90deg, #007176, #17C7CC)',
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 700,
              padding: '15px 24px',
              borderRadius: 999,
              transition: 'background .25s',
            }}
          >
            Continue →
          </button>
        )}
        {step === 2 && (
          <button
            type="submit"
            className="ds-submit"
            disabled={sending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              border: 'none',
              cursor: sending ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              background: 'linear-gradient(90deg, #007176, #17C7CC)',
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 700,
              padding: '15px 24px',
              borderRadius: 999,
              opacity: sending ? 0.7 : 1,
            }}
          >
            {sending ? 'Sending…' : 'Join Early Access →'}
          </button>
        )}
      </div>

      {error && (
        <p
          style={{
            margin: '16px 0 0',
            fontSize: 13.5,
            lineHeight: 1.5,
            color: '#C0392B',
            textAlign: 'center',
          }}
          role="alert"
        >
          {error}
        </p>
      )}
      <p
        style={{
          margin: '14px 0 0',
          fontSize: 12.5,
          lineHeight: 1.5,
          color: '#7A8B92',
          textAlign: 'center',
        }}
      >
        No commitment required. Our clinical team will reach out within 2 business days.
      </p>
    </form>
  )
}
