import { useEffect, useRef, useState } from 'react'
import { ScanSearch, Eye, ClipboardCheck, Stethoscope, ShieldCheck } from 'lucide-react'
import { useResponsive } from '../../hooks/useResponsive'
import { confidenceTags } from '../../data'
import './ConfidenceDashboard.css'

// Premium AI confidence dashboard for the High-Confidence AI Support section.
// A depth-blended teal panel (frame-portrait.webp softly overlaid) carries a
// large radial 95% confidence gauge, the clinical trust attributes as animated
// glass cards, and a redesigned physician-control trust banner. All copy is
// kept verbatim — only the presentation is elevated.

const tagIcons = [ScanSearch, Eye, ClipboardCheck, Stethoscope]

function useInView(ref) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true)
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return inView
}

function Gauge({ inView, size }) {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const r = 80
  const C = 2 * Math.PI * r
  const target = 95
  const offset = inView ? C * (1 - target / 100) : C

  const [val, setVal] = useState(reduce ? target : 0)
  useEffect(() => {
    if (!inView || reduce) {
      if (reduce) setVal(target)
      return
    }
    let raf
    const start = performance.now()
    const dur = 1600
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduce])

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="ds-gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A5E7F8" />
            <stop offset="55%" stopColor="#6BB8CB" />
            <stop offset="100%" stopColor="#4C8F88" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(165,231,248,0.16)" strokeWidth="1" strokeDasharray="2 6" />
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="13" />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="url(#ds-gauge)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          style={{
            transition: reduce ? 'none' : 'stroke-dashoffset 1.7s cubic-bezier(.22,.61,.36,1)',
            filter: 'drop-shadow(0 0 6px rgba(165,231,248,0.45))',
          }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(213,230,235,0.6)' }}>up&nbsp;to</span>
        <span style={{ fontSize: size * 0.24, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em', color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>{val}%</span>
        <span style={{ marginTop: 6, maxWidth: size * 0.64, fontSize: 11.5, fontWeight: 500, lineHeight: 1.35, color: 'rgba(213,230,235,0.72)' }}>Image Analysis Accuracy</span>
      </div>
    </div>
  )
}

export default function ConfidenceDashboard() {
  const { isMobile, isTablet } = useResponsive()
  const stack = isMobile || isTablet
  const ref = useRef(null)
  const inView = useInView(ref)
  const gaugeSize = isMobile ? 210 : 260
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Staggered entrance for the trust cards (transform handled on an outer
  // wrapper so it never collides with the hover-lift transform).
  const entrance = (i) =>
    reduce
      ? undefined
      : {
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity .5s ease, transform .5s cubic-bezier(.22,.61,.36,1)',
          transitionDelay: `${0.15 + i * 0.09}s`,
        }

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 32,
        background: 'linear-gradient(150deg,#0C2A31 0%,#12414B 55%,#16515C 100%)',
        border: '1px solid rgba(165,231,248,0.16)',
        boxShadow: '0 44px 96px -36px rgba(11,44,50,0.85), inset 0 1px 0 rgba(255,255,255,0.06)',
        padding: isMobile ? '40px 22px' : isTablet ? '54px 44px' : '72px 76px',
      }}
    >
      {/* frame-portrait as the section background — clearly visible texture,
          held readable by a teal gradient overlay layered on top. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/frame-portrait.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.6,
          WebkitMaskImage: 'radial-gradient(150% 140% at 30% 18%, #000 62%, transparent 100%)',
          maskImage: 'radial-gradient(150% 140% at 30% 18%, #000 62%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
      {/* teal gradient overlay — merges the image with the palette and keeps text contrast */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg, rgba(9,36,43,0.55) 0%, rgba(14,52,60,0.42) 55%, rgba(18,65,75,0.36) 100%)', pointerEvents: 'none' }} />
      {/* premium lighting glows */}
      <div aria-hidden="true" style={{ position: 'absolute', top: -150, right: -110, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle,rgba(165,231,248,0.20),transparent 65%)', pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', bottom: -190, left: -130, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(76,143,136,0.30),transparent 65%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative' }}>
        {/* Top: gauge + copy/attributes */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: stack ? '1fr' : '0.85fr 1.15fr',
            gap: isMobile ? 34 : isTablet ? 44 : 68,
            alignItems: 'center',
          }}
        >
          {/* Confidence indicator — glassmorphism card */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              className="ds-cd-float"
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: isMobile ? '30px 22px' : '40px 30px',
                borderRadius: 28,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 30px 60px -30px rgba(0,0,0,0.6)',
              }}
            >
              <Gauge inView={inView} size={gaugeSize} />
            </div>
          </div>

          {/* Copy + trust attributes */}
          <div>
            <h2 style={{ margin: '0 0 16px', fontSize: isMobile ? 23 : 'clamp(30px,2.6vw,38px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.14, color: '#FFFFFF' }}>
              High-Confidence AI Support
            </h2>
            <p style={{ margin: '0 0 26px', maxWidth: 560, fontSize: 16.5, lineHeight: 1.7, color: 'rgba(221,240,244,0.82)' }}>
              DermaScope.ai delivers up to 95% image analysis accuracy across supported AI workflows
              validated under controlled testing conditions.
            </p>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(213,230,235,0.65)', marginBottom: 16 }}>
              Every AI-generated result is:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {confidenceTags.map((t, i) => {
                const Icon = tagIcons[i] || ShieldCheck
                return (
                  <div key={t} style={entrance(i)}>
                    <div
                      className="ds-cd-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 16,
                        background: 'rgba(255,255,255,0.055)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                      }}
                    >
                      <span
                        className="ds-cd-ico"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 38,
                          height: 38,
                          flexShrink: 0,
                          borderRadius: 11,
                          background: 'linear-gradient(140deg,rgba(165,231,248,0.24),rgba(76,143,136,0.24))',
                          border: '1px solid rgba(165,231,248,0.30)',
                          color: '#A5E7F8',
                        }}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span style={{ fontSize: 14.5, fontWeight: 600, color: '#EAF6F9' }}>{t}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Editorial clinical trust statement — directly beneath the cards,
                within the right column. No card, border, or background. */}
            <p
              style={{
                margin: isMobile ? '30px 0 0' : '46px 0 0',
                display: 'inline-flex',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 9,
                textAlign: 'center',
                fontSize: isMobile ? 16 : 18,
                fontWeight: 500,
                lineHeight: 1.5,
                letterSpacing: '0.01em',
                color: 'rgba(235,246,249,0.94)',
              }}
            >
              <ShieldCheck size={16} strokeWidth={2} color="rgba(165,231,248,0.7)" style={{ flexShrink: 0 }} />
              Clinical decisions always remain with the healthcare professional.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
