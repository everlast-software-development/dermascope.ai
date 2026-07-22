import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown, Search } from 'lucide-react'
import {
  usePhoneInput,
  defaultCountries,
  parseCountry,
  FlagImage,
} from 'react-international-phone'
import 'react-international-phone/style.css'
import { challengeOptions } from '../data'
import { useResponsive, useMediaQuery } from '../hooks/useResponsive'

// The multi-step "Join Early Access" form, extracted so it can be reused
// verbatim by both the marketing section (DemoForm) and the floating drawer
// (FloatingEarlyAccess). All validation + submit logic lives here — there is
// only ever one copy of this form.
//
// Fully controlled (single `form` state object) because several inputs are
// custom widgets — a searchable country combobox, a phone country-code
// selector and multi-select challenge pills — that can't be captured by a
// plain <form> FormData sweep.
//
// Country data + flags + phone formatting come from `react-international-phone`
// (usePhoneInput + FlagImage). FlagImage renders real SVG flags from a CDN, so
// flags display correctly on every platform — including Windows, where the
// emoji regional-indicator flags would otherwise fall back to letter pairs.

// Parse the library's country table once; drives both the country field and
// the phone country-code selector. Shape: { name, iso2, dialCode, format, … }.
const ALL_COUNTRIES = defaultCountries.map(parseCountry)
const findByIso = (iso) => ALL_COUNTRIES.find((c) => c.iso2 === iso)

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

const errText = {
  margin: '6px 2px 0',
  fontSize: 12.5,
  lineHeight: 1.45,
  color: '#C0392B',
}

const STEP_LABELS = ['About You', 'Contact Information', 'Practice Information']
// Descriptive subtitles shown under the mobile step heading (below the rail).
const STEP_SUBTITLES = [
  'Tell us about yourself.',
  'How can we reach you?',
  'Help us understand your practice.',
]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Backend base URL. Empty = same-origin (production single service, and dev via
// the Vite /api proxy). Override with VITE_API_URL for a split deployment.
const API_BASE = import.meta.env.VITE_API_URL || ''

const INITIAL = {
  name: '',
  title: '',
  specialty: '',
  organization: '',
  countryIso: '',
  city: '',
  email: '',
  phone: '', // E.164, e.g. "+971501234567"
  phoneDial: '', // dial code (no +) of the phone's selected country
  interest: '',
  physicians: '',
  emr: '',
  challenges: [],
  consent: false,
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const { isMobile, isTablet } = useResponsive()
  // Mobile (≤768px) gets a compact numbers-only rail with the step title moved
  // out to a section heading below. Desktop layout is left untouched.
  const isNarrow = useMediaQuery('(max-width: 768px)')

  if (isNarrow) {
    return (
      <div style={{ marginBottom: 28 }}>
        {/* Compact single-row rail — numbers only, never wraps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
          {STEP_LABELS.map((name, i) => {
            const active = i === step
            const done = i < step
            return (
              <Fragment key={name}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                    border: done ? 'none' : `1.5px solid ${active ? '#285F66' : '#DCECEF'}`,
                    background: done ? '#4C8F88' : active ? '#285F66' : '#FFFFFF',
                    color: done || active ? '#FFFFFF' : '#7A8B92',
                    boxShadow: active ? '0 4px 12px -4px rgba(40,95,102,0.5)' : 'none',
                    transition: 'all .3s',
                  }}
                >
                  {done ? <Check size={15} strokeWidth={3} /> : i + 1}
                </span>
                {i < STEP_LABELS.length - 1 && (
                  <span
                    style={{
                      flex: 1,
                      minWidth: 14,
                      height: 2,
                      borderRadius: 2,
                      background: '#E3EEF0',
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        height: '100%',
                        width: step > i ? '100%' : '0%',
                        borderRadius: 2,
                        background: '#4C8F88',
                        transition: 'width .4s cubic-bezier(0.22,1,0.36,1)',
                      }}
                    />
                  </span>
                )}
              </Fragment>
            )
          })}
        </div>

        {/* Step title + subtitle as a section heading, below the rail */}
        <div style={{ marginTop: 18 }}>
          <h3
            style={{
              margin: '0 0 5px',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: '#1B4754',
              textAlign: 'left',
            }}
          >
            {STEP_LABELS[step]}
          </h3>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#7A8B92', textAlign: 'left' }}>
            {STEP_SUBTITLES[step]}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 6 : 10,
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
                gap: isMobile ? 7 : 9,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: isMobile ? 28 : 32,
                  height: isMobile ? 28 : 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? 12.5 : 13.5,
                  fontWeight: 700,
                  border: `1.5px solid ${active ? '#285F66' : done ? '#4C8F88' : '#DCECEF'}`,
                  background: done ? '#4C8F88' : active ? '#285F66' : '#F5FBFD',
                  color: done || active ? '#FFFFFF' : '#7A8B92',
                  transition: 'all .3s',
                  flexShrink: 0,
                }}
              >
                {done ? <Check size={15} strokeWidth={3} /> : i + 1}
              </span>
              <span
                style={{
                  fontSize: isMobile ? 11.5 : isTablet ? 12 : 12.5,
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

// ── Field label with required (*) / optional markers ────────────────────────────
function FieldLabel({ htmlFor, children, required, optional }) {
  return (
    <label htmlFor={htmlFor} style={label}>
      {children}
      {required && (
        <span aria-hidden="true" style={{ color: '#C0392B', marginLeft: 3 }}>
          *
        </span>
      )}
      {optional && (
        <span style={{ fontWeight: 400, color: '#7A8B92', marginLeft: 6 }}>(optional)</span>
      )}
    </label>
  )
}

function ErrorText({ id, children }) {
  if (!children) return null
  return (
    <p id={id} role="alert" style={errText}>
      {children}
    </p>
  )
}

function Flag({ iso2, size }) {
  return (
    <FlagImage
      iso2={iso2}
      size={size}
      style={{ width: size, height: size, borderRadius: 3, display: 'block', flexShrink: 0 }}
    />
  )
}

// ── Text field with (*) label, inline error + error styling ───────────────────
function TextField({ id, fid, labelText, value, onChange, errors, respField, type = 'text', ...rest }) {
  const errKey = id
  const err = errors[errKey]
  return (
    <div>
      <FieldLabel htmlFor={fid(id)} required>
        {labelText}
      </FieldLabel>
      <input
        id={fid(id)}
        type={type}
        value={value}
        onChange={(e) => onChange(errKey, e.target.value)}
        aria-required="true"
        aria-invalid={!!err}
        aria-describedby={err ? fid(`${id}-err`) : undefined}
        className="ds-input"
        style={{ ...respField, ...(err ? { border: '1px solid #E3A79E' } : null) }}
        {...rest}
      />
      <ErrorText id={fid(`${id}-err`)}>{err}</ErrorText>
    </div>
  )
}

// ── Searchable country / dial-code combobox (FlagImage + name + dial) ───────────
// mode 'country' → flag + full name, full width.
// mode 'dial'    → flag + dial code, compact trigger (paired with phone input).
// Searchable by country name AND dialing code; full keyboard support.
function CountrySearchSelect({
  id,
  value, // selected iso2
  onChange, // (iso2) => void
  mode = 'country',
  placeholder,
  invalid,
  ariaLabel,
  describedBy,
  respField,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const listId = `${id}-list`

  const selected = value ? findByIso(value) : null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ALL_COUNTRIES
    const digits = q.replace(/\D/g, '')
    return ALL_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || (digits && c.dialCode.includes(digits)),
    )
  }, [query])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // Focus the search box when the panel opens.
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[active]
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const openPanel = () => {
    setQuery('')
    const idx = selected ? ALL_COUNTRIES.findIndex((c) => c.iso2 === selected.iso2) : 0
    setActive(idx > 0 ? idx : 0)
    setOpen(true)
  }

  const pick = (c) => {
    onChange(c.iso2)
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(filtered.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[active]) pick(filtered[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  const triggerBase = {
    ...respField,
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'inherit',
    ...(invalid ? { border: '1px solid #E3A79E' } : null),
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="ds-input"
        style={
          mode === 'dial'
            ? { ...triggerBase, width: 'auto', minWidth: 104, paddingRight: 12, flexShrink: 0 }
            : triggerBase
        }
      >
        {selected ? (
          <>
            <Flag iso2={selected.iso2} size={20} />
            <span style={{ color: '#2F4148', fontWeight: mode === 'dial' ? 600 : 500 }}>
              {mode === 'dial' ? `+${selected.dialCode}` : selected.name}
            </span>
          </>
        ) : (
          <span style={{ color: '#9AA9AF' }}>{placeholder}</span>
        )}
        <ChevronDown
          size={17}
          strokeWidth={2}
          style={{
            marginLeft: 'auto',
            color: '#7A8B92',
            flexShrink: 0,
            transition: 'transform .2s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 60,
              width: mode === 'dial' ? 300 : '100%',
              maxWidth: mode === 'dial' ? '86vw' : undefined,
              background: '#FFFFFF',
              border: '1px solid #DCECEF',
              borderRadius: 14,
              boxShadow: '0 18px 44px -14px rgba(27,71,84,0.28)',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'relative', padding: 8, borderBottom: '1px solid #EEF5F7' }}>
              <Search
                size={16}
                strokeWidth={2}
                style={{
                  position: 'absolute',
                  left: 18,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9AA9AF',
                  pointerEvents: 'none',
                }}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onKeyDown}
                placeholder="Search by country or code…"
                aria-label="Search by country name or dialing code"
                aria-autocomplete="list"
                aria-controls={listId}
                className="ds-input"
                style={{ ...field, padding: '10px 12px 10px 34px', fontSize: 14.5 }}
              />
            </div>
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 6,
                maxHeight: 236,
                overflowY: 'auto',
              }}
            >
              {filtered.length === 0 && (
                <li style={{ padding: '12px 14px', color: '#9AA9AF', fontSize: 14 }}>
                  No matches found
                </li>
              )}
              {filtered.map((c, i) => {
                const isSel = selected && selected.iso2 === c.iso2
                const isActive = i === active
                return (
                  <li
                    key={c.iso2}
                    role="option"
                    aria-selected={isSel || false}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(c)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      borderRadius: 9,
                      cursor: 'pointer',
                      background: isActive ? '#F0FAFD' : 'transparent',
                      color: '#2F4148',
                      fontSize: 14.5,
                    }}
                  >
                    <Flag iso2={c.iso2} size={20} />
                    <span style={{ flex: 1, fontWeight: isSel ? 600 : 400 }}>{c.name}</span>
                    <span style={{ color: '#7A8B92', fontSize: 13.5, fontWeight: 500 }}>
                      +{c.dialCode}
                    </span>
                    {isSel && <Check size={15} strokeWidth={2.5} style={{ color: '#4C8F88' }} />}
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Phone field — react-international-phone engine + searchable selector ────────
// The country selector and the number input are two visually distinct fields
// (separate rounded boxes with a gap). The library handles dial-code prefill,
// live formatting and country guessing; the flag is always in sync.
function PhoneField({ id, phoneId, phone, defaultCountryIso, onPhoneChange, invalid, describedBy, respField }) {
  const inputRef = useRef(null)
  const { inputValue, country, setCountry, handlePhoneValueChange } = usePhoneInput({
    defaultCountry: defaultCountryIso || 'ae',
    value: phone,
    countries: defaultCountries,
    inputRef,
    // The country selector owns the flag + dial code; the input holds only the
    // national number (no duplicated "+971" prefix). `data.phone` is still the
    // full E.164 value for submission.
    disableDialCodeAndPrefix: true,
    onChange: (data) => onPhoneChange(data.phone, data.country.dialCode),
  })

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <CountrySearchSelect
        id={id}
        mode="dial"
        value={country.iso2}
        onChange={(iso) => setCountry(iso, { focusOnInput: true })}
        placeholder="Code"
        invalid={invalid}
        ariaLabel="Phone country code"
        respField={respField}
      />
      <input
        id={phoneId}
        ref={inputRef}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="Phone number"
        value={inputValue}
        onChange={handlePhoneValueChange}
        aria-required="true"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="ds-input"
        style={{
          ...respField,
          flex: 1,
          minWidth: 0,
          ...(invalid ? { border: '1px solid #E3A79E' } : null),
        }}
      />
    </div>
  )
}

// ── Main form ───────────────────────────────────────────────────────────────
export default function EarlyAccessForm({ onSuccess }) {
  const { isMobile } = useResponsive()
  const reduceMotion = useReducedMotion()
  const uid = useId()
  const fid = (n) => `${uid}-${n}`

  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [form, setForm] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const setField = (name, val) => {
    setForm((f) => ({ ...f, [name]: val }))
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }))
  }

  const onPhoneChange = (phone, phoneDial) => {
    setForm((f) => ({ ...f, phone, phoneDial }))
    if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }))
  }

  const toggleChallenge = (c) => {
    setForm((f) => ({
      ...f,
      challenges: f.challenges.includes(c)
        ? f.challenges.filter((x) => x !== c)
        : [...f.challenges, c],
    }))
  }

  const validateStep = (s) => {
    const e = {}
    if (s === 0) {
      if (form.name.trim().length < 2) e.name = 'Please enter your full name.'
      if (!form.title.trim()) e.title = 'Please enter your professional title.'
      if (!form.specialty.trim()) e.specialty = 'Please enter your specialty.'
      if (!form.organization.trim())
        e.organization = 'Please enter your clinic, hospital, or organization.'
      if (!form.countryIso) e.countryIso = 'Please select your country.'
      if (!form.city.trim()) e.city = 'Please enter your city.'
    } else if (s === 1) {
      if (!EMAIL_RE.test(form.email.trim())) e.email = 'Please enter a valid email address.'
      const digits = form.phone.replace(/\D/g, '')
      const national = digits.slice((form.phoneDial || '').length)
      if (national.length < 4) e.phone = 'Please enter a valid phone number.'
    } else if (s === 2) {
      if (!form.interest.trim()) e.interest = 'Please enter your type of interest.'
      if (!form.consent) e.consent = 'Please confirm your consent to continue.'
    }
    return e
  }

  const focusFirstError = (e) => {
    const first = Object.keys(e).find((k) => e[k])
    if (!first) return
    const el = document.getElementById(fid(first))
    if (el) {
      el.focus()
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }

  const nextStep = () => {
    const e = validateStep(step)
    setErrors(e)
    if (Object.keys(e).some((k) => e[k])) {
      focusFirstError(e)
      return
    }
    setDir(1)
    setStep((s) => Math.min(2, s + 1))
  }

  const backStep = () => {
    setDir(-1)
    setStep((s) => Math.max(0, s - 1))
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (sending) return

    const e = validateStep(2)
    setErrors(e)
    if (Object.keys(e).some((k) => e[k])) {
      focusFirstError(e)
      return
    }

    const country = findByIso(form.countryIso)
    const payload = {
      name: form.name.trim(),
      title: form.title.trim(),
      specialty: form.specialty.trim(),
      organization: form.organization.trim(),
      country: country ? country.name : '',
      city: form.city.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      interest: form.interest.trim(),
      physicians: form.physicians ? String(form.physicians).trim() : '',
      emr: form.emr.trim(),
      challenges: form.challenges, // array of selected challenge labels
      consent: form.consent, // boolean
    }

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

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: 'center', padding: '40px 8px' }}
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: 'rgba(76,143,136,0.14)',
            color: '#4C8F88',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <Check size={32} strokeWidth={2.6} />
        </motion.div>
        <h3 style={{ margin: '0 0 12px', fontSize: 25, fontWeight: 700, color: '#1B4754' }}>
          You're on the early access list
        </h3>
        <p
          style={{
            margin: '0 auto',
            maxWidth: 420,
            fontSize: 15.5,
            lineHeight: 1.7,
            color: '#7A8B92',
          }}
        >
          Thank you for your interest in DermaScope.ai. We've received your details and sent a
          confirmation to your email. Our clinical team will reach out within 2 business days to set
          up your access.
        </p>
      </motion.div>
    )
  }

  // Step transition variants (respect reduced-motion).
  const offset = reduceMotion ? 0 : 26
  const variants = {
    enter: { opacity: 0, x: dir * offset },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: dir * -offset },
  }

  return (
    <form onSubmit={submit} noValidate>
      <StepIndicator step={step} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ── Step 1 — About You ─────────────────────────────────────── */}
          {step === 0 && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <FieldLabel htmlFor={fid('name')} required>
                  Full Name
                </FieldLabel>
                <input
                  id={fid('name')}
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? fid('name-err') : undefined}
                  className="ds-input"
                  style={{ ...respField, ...(errors.name ? { border: '1px solid #E3A79E' } : null) }}
                />
                <ErrorText id={fid('name-err')}>{errors.name}</ErrorText>
              </div>

              <TextField
                id="title"
                fid={fid}
                labelText="Professional Title"
                value={form.title}
                onChange={setField}
                errors={errors}
                respField={respField}
                autoComplete="organization-title"
              />

              <TextField
                id="specialty"
                fid={fid}
                labelText="Specialty"
                value={form.specialty}
                onChange={setField}
                errors={errors}
                respField={respField}
              />

              <div>
                <FieldLabel htmlFor={fid('organization')} required>
                  Clinic / Hospital / Organization
                </FieldLabel>
                <input
                  id={fid('organization')}
                  type="text"
                  autoComplete="organization"
                  value={form.organization}
                  onChange={(e) => setField('organization', e.target.value)}
                  aria-required="true"
                  aria-invalid={!!errors.organization}
                  aria-describedby={errors.organization ? fid('organization-err') : undefined}
                  className="ds-input"
                  style={{
                    ...respField,
                    ...(errors.organization ? { border: '1px solid #E3A79E' } : null),
                  }}
                />
                <ErrorText id={fid('organization-err')}>{errors.organization}</ErrorText>
              </div>

              <div>
                <FieldLabel htmlFor={fid('countryIso')} required>
                  Country
                </FieldLabel>
                <CountrySearchSelect
                  id={fid('countryIso')}
                  mode="country"
                  value={form.countryIso}
                  onChange={(iso) => setField('countryIso', iso)}
                  placeholder="Select your country"
                  invalid={!!errors.countryIso}
                  ariaLabel="Country"
                  describedBy={errors.countryIso ? fid('countryIso-err') : undefined}
                  respField={respField}
                />
                <ErrorText id={fid('countryIso-err')}>{errors.countryIso}</ErrorText>
              </div>

              <div>
                <FieldLabel htmlFor={fid('city')} required>
                  City
                </FieldLabel>
                <input
                  id={fid('city')}
                  type="text"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  aria-required="true"
                  aria-invalid={!!errors.city}
                  aria-describedby={errors.city ? fid('city-err') : undefined}
                  className="ds-input"
                  style={{ ...respField, ...(errors.city ? { border: '1px solid #E3A79E' } : null) }}
                />
                <ErrorText id={fid('city-err')}>{errors.city}</ErrorText>
              </div>
            </div>
          )}

          {/* ── Step 2 — Contact Information ────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <FieldLabel htmlFor={fid('email')} required>
                  Email Address
                </FieldLabel>
                <input
                  id={fid('email')}
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  aria-required="true"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? fid('email-err') : undefined}
                  className="ds-input"
                  style={{ ...respField, ...(errors.email ? { border: '1px solid #E3A79E' } : null) }}
                />
                <ErrorText id={fid('email-err')}>{errors.email}</ErrorText>
              </div>

              <div>
                <FieldLabel htmlFor={fid('phone')} required>
                  Mobile / WhatsApp
                </FieldLabel>
                <PhoneField
                  id={fid('phoneCountry')}
                  phoneId={fid('phone')}
                  phone={form.phone}
                  defaultCountryIso={form.countryIso}
                  onPhoneChange={onPhoneChange}
                  invalid={!!errors.phone}
                  describedBy={errors.phone ? fid('phone-err') : undefined}
                  respField={respField}
                />
                <ErrorText id={fid('phone-err')}>{errors.phone}</ErrorText>
              </div>
            </div>
          )}

          {/* ── Step 3 — Practice Information ───────────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'grid', gap: 18 }}>
              <TextField
                id="interest"
                fid={fid}
                labelText="Type of Interest"
                value={form.interest}
                onChange={setField}
                errors={errors}
                respField={respField}
              />

              <div>
                <FieldLabel htmlFor={fid('physicians')} optional>
                  Physicians in Organization
                </FieldLabel>
                <input
                  id={fid('physicians')}
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.physicians}
                  onChange={(e) => setField('physicians', e.target.value)}
                  className="ds-input"
                  style={respField}
                />
              </div>

              <div>
                <FieldLabel htmlFor={fid('emr')} optional>
                  Current EMR / HIS
                </FieldLabel>
                <input
                  id={fid('emr')}
                  type="text"
                  value={form.emr}
                  onChange={(e) => setField('emr', e.target.value)}
                  className="ds-input"
                  style={respField}
                />
              </div>

              <div>
                <span style={{ ...label, marginBottom: 10 }}>
                  Main Challenge to Solve
                  <span style={{ fontWeight: 400, color: '#7A8B92', marginLeft: 6 }}>
                    (select all that apply)
                  </span>
                </span>
                <div
                  role="group"
                  aria-label="Main challenge to solve"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: 10,
                  }}
                >
                  {challengeOptions.map((c) => {
                    const selected = form.challenges.includes(c)
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleChallenge(c)}
                        className="ds-pill"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          textAlign: 'left',
                          padding: '12px 14px',
                          borderRadius: 12,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 14,
                          fontWeight: 600,
                          lineHeight: 1.25,
                          border: `1.5px solid ${selected ? '#4C8F88' : '#DCECEF'}`,
                          background: selected ? 'rgba(76,143,136,0.08)' : '#FFFFFF',
                          color: selected ? '#1B4754' : '#2F4148',
                          transition: 'border-color .2s, background .2s, color .2s',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            flexShrink: 0,
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1.5px solid ${selected ? '#4C8F88' : '#CBDDE1'}`,
                            background: selected ? '#4C8F88' : '#FFFFFF',
                            color: '#FFFFFF',
                            transition: 'all .2s',
                          }}
                        >
                          {selected && <Check size={13} strokeWidth={3} />}
                        </span>
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Consent — a distinct legal section, set apart from the
                  selectable challenge cards above by a divider + its own
                  subtle bordered container, a standard checkbox and small
                  helper-text styling. */}
              <div style={{ marginTop: 8, paddingTop: 22, borderTop: '1px solid #EAF2F4' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 11,
                    padding: isMobile ? '13px 14px' : '14px 16px',
                    borderRadius: 10,
                    border: `1px solid ${errors.consent ? '#E3A79E' : '#E4EEF0'}`,
                    background: '#FAFCFD',
                  }}
                >
                  <input
                    id={fid('consent')}
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => setField('consent', e.target.checked)}
                    aria-required="true"
                    aria-invalid={!!errors.consent}
                    aria-describedby={errors.consent ? fid('consent-err') : undefined}
                    style={{
                      flexShrink: 0,
                      width: 16,
                      height: 16,
                      marginTop: 2,
                      accentColor: '#285F66',
                      cursor: 'pointer',
                    }}
                  />
                  <label
                    htmlFor={fid('consent')}
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.6,
                      color: '#7A8B92',
                      cursor: 'pointer',
                    }}
                  >
                    I agree to be contacted regarding DermaScope.ai updates, early access
                    opportunities, and launch announcements.
                    <span aria-hidden="true" style={{ color: '#C0392B', marginLeft: 3 }}>
                      *
                    </span>
                  </label>
                </div>
                <ErrorText id={fid('consent-err')}>{errors.consent}</ErrorText>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
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
            className="ds-form-cta"
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
            }}
          >
            <span className="ds-cta-label">
              Continue
              <span className="ds-cta-arrow" aria-hidden="true">
                →
              </span>
            </span>
          </button>
        )}
        {step === 2 && (
          <button
            type="submit"
            className="ds-form-cta"
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
              opacity: sending ? 0.75 : 1,
            }}
          >
            <span className="ds-cta-label">
              {sending ? (
                <>
                  <span className="ds-spinner" aria-hidden="true" />
                  Submitting…
                </>
              ) : (
                <>
                  Join Early Access
                  <span className="ds-cta-arrow" aria-hidden="true">
                    →
                  </span>
                </>
              )}
            </span>
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
    </form>
  )
}
