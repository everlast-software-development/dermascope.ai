import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Sparkles, Play, Layers, ShieldCheck, Clock } from 'lucide-react'
import TrustedBy from './TrustedBy'

const header = {
  position: 'relative',
  background: 'linear-gradient(165deg,#1B4754 0%,#20525F 55%,#285F66 100%)',
  overflow: 'hidden',
  // The hero content and the "Trusted by" strip share a single viewport: the
  // header is a STRICT full-height box (not just a floor) so the strip is always
  // pinned to the bottom of the first screen — the grid flexes to fill what's
  // left above it. `dvh` tracks the real visible height; a px floor keeps it
  // usable on very short screens.
  display: 'flex',
  flexDirection: 'column',
  height: 'max(660px, 100dvh)',
}

const grid = {
  position: 'relative',
  width: '100%',
  maxWidth: 1240,
  margin: '0 auto',
  padding: '118px 48px 0',
  display: 'grid',
  gridTemplateColumns: '1.02fr 0.98fr',
  gap: 48,
  alignItems: 'stretch',
  // Grow to fill the viewport height above the trusted strip.
  flex: '1 1 auto',
  minHeight: 0,
}

export default function Hero() {
  const leftRef = useRef(null)

  useEffect(() => {
    const el = leftRef.current
    if (!el) return
    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const ctx = gsap.context(() => {
      gsap.from(el.children, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.1,
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <header id="top" style={header}>
      {/* ambient glows */}
      <div
        style={{
          position: 'absolute',
          top: -180,
          right: -120,
          width: 620,
          height: 620,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(165,231,248,0.22),transparent 65%)',
          animation: 'dsDrift 14s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -260,
          left: -160,
          width: 560,
          height: 560,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(76,143,136,0.35),transparent 65%)',
        }}
      />

      <div style={grid}>
        {/* ───────── LEFT — content ───────── */}
        <div
          ref={leftRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingBottom: 40,
          }}
        >
          {/* Subtitle — glass pill */}
          <span className="ds-hero2-chip">
            <Sparkles size={15} strokeWidth={2.2} />
            Physician-supervised clinical AI
          </span>

          {/* Title */}
          <h1
            style={{
              margin: '22px 0 24px',
              fontSize: 'clamp(44px,4.6vw,68px)',
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: '-0.028em',
              color: '#FFFFFF',
            }}
          >
            When Every Detail Matters,
            <br />
            <span style={{ color: '#A5E7F8' }}>AI Sees More.</span> Physicians Decide.
          </h1>

          {/* Description */}
          <p
            style={{
              margin: '0 0 38px',
              maxWidth: 560,
              fontSize: 18,
              lineHeight: 1.65,
              fontWeight: 300,
              color: '#D5E6EB',
            }}
          >
            From everyday dermatology to the most challenging and complex skin conditions,
            DermaScope.ai transforms clinical images into actionable intelligence—helping physicians
            detect critical visual patterns, prioritize high-risk findings, and make more informed
            clinical decisions.
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <a
              href="#demo"
              className="ds-cta-primary"
              style={{
                background: '#A5E7F8',
                color: '#12333B',
                fontSize: 16,
                fontWeight: 700,
                padding: '16px 34px',
                borderRadius: 999,
                boxShadow: '0 8px 30px rgba(165,231,248,0.35)',
              }}
            >
              Join Early Access
            </a>

            <a href="#how" className="ds-hero2-secondary">
              <span className="ds-hero2-play">
                <Play size={15} strokeWidth={2.6} fill="currentColor" />
              </span>
              How It Works
            </a>
          </div>
        </div>

        {/* ───────── RIGHT — hand mockup + glass cards ───────── */}
        <div className="ds-hero2-stage">
          {/* soft halo behind the device */}
          <div className="ds-hero2-halo" aria-hidden="true" />

          <img
            src="/mobile_hero_hand_mockup.png"
            alt="DermaScope.ai skin-capture app held in hand"
            className="ds-hero2-hand"
          />

          {/* Card 1 — conditions stat (upper-left) */}
          <div className="ds-gcard ds-gcard--stat">
            <span className="ds-gcard-ico ds-gcard-ico--accent">
              <Layers size={18} strokeWidth={2.2} />
            </span>
            <div>
              <div className="ds-gcard-num">300+</div>
              <div className="ds-gcard-s">skin conditions supported</div>
            </div>
          </div>

          {/* Card 2 — analysis accuracy (right edge) */}
          <div className="ds-gcard ds-gcard--accuracy">
            <span className="ds-gcard-ico">
              <ShieldCheck size={18} strokeWidth={2.2} />
            </span>
            <div>
              <div className="ds-gcard-t">95% analysis accuracy</div>
              <div className="ds-gcard-s">Explainable AI findings</div>
            </div>
          </div>

          {/* Card 3 — results pill (bottom-right) */}
          <div className="ds-gcard ds-gcard--pill">
            <span className="ds-gcard-pill-ico">
              <Clock size={17} strokeWidth={2.4} />
            </span>
            <div>
              <div className="ds-gcard-pill-t">Results</div>
              <div className="ds-gcard-pill-s">in 2–3 min</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trusted-by strip — shares the hero viewport at the bottom */}
      <TrustedBy />
    </header>
  )
}
