import * as React from 'react'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const cn = (...classes) => classes.filter(Boolean).join(' ')

// -------------------------------------------------------------------------
// Theme-adaptive scoped styles. Tokens are mapped to the DermaScope palette
// so the glass/aurora/grid effects read on the brand's dark teal.
// -------------------------------------------------------------------------
const STYLES = `
.cinematic-footer-wrapper {
  font-family: 'Outfit', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;

  --foreground: #F1F8FA;
  --background: #10303A;
  --primary: #4C8F88;
  --secondary: #285F66;
  --accent: #A5E7F8;
  --destructive: #FF6B6B;
  --border: rgba(213,230,235,0.16);
  --muted-foreground: rgba(213,230,235,0.66);

  --pill-bg-1: color-mix(in oklch, var(--foreground) 4%, transparent);
  --pill-bg-2: color-mix(in oklch, var(--foreground) 1%, transparent);
  --pill-shadow: color-mix(in oklch, var(--background) 50%, transparent);
  --pill-highlight: color-mix(in oklch, var(--foreground) 10%, transparent);
  --pill-inset-shadow: color-mix(in oklch, var(--background) 80%, transparent);
  --pill-border: color-mix(in oklch, var(--foreground) 10%, transparent);

  --pill-bg-1-hover: color-mix(in oklch, var(--foreground) 10%, transparent);
  --pill-bg-2-hover: color-mix(in oklch, var(--foreground) 2%, transparent);
  --pill-border-hover: color-mix(in oklch, var(--accent) 45%, transparent);
  --pill-shadow-hover: color-mix(in oklch, var(--background) 70%, transparent);
  --pill-highlight-hover: color-mix(in oklch, var(--foreground) 20%, transparent);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
}
@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px color-mix(in oklch, var(--destructive) 50%, transparent)); }
  15%, 45% { transform: scale(1.2); filter: drop-shadow(0 0 10px color-mix(in oklch, var(--destructive) 80%, transparent)); }
  30% { transform: scale(1); }
}

.animate-footer-breathe { animation: footer-breathe 8s ease-in-out infinite alternate; }
.animate-footer-scroll-marquee { animation: footer-scroll-marquee 40s linear infinite; }
.animate-footer-heartbeat { animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite; }

.footer-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in oklch, var(--primary) 22%, transparent) 0%,
    color-mix(in oklch, var(--accent) 16%, transparent) 40%,
    transparent 70%
  );
}

.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow:
    0 10px 30px -10px var(--pill-shadow),
    inset 0 1px 1px var(--pill-highlight),
    inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow:
    0 20px 40px -10px var(--pill-shadow-hover),
    inset 0 1px 1px var(--pill-highlight-hover);
  color: var(--foreground);
}

.footer-giant-bg-text {
  font-size: 26vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in oklch, var(--foreground) 6%, transparent);
  background: linear-gradient(180deg, color-mix(in oklch, var(--foreground) 10%, transparent) 0%, transparent 60%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  background: linear-gradient(180deg, var(--foreground) 0%, color-mix(in oklch, var(--foreground) 40%, transparent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 20px color-mix(in oklch, var(--accent) 20%, transparent));
}

.footer-pill-primary { padding: 18px 40px; font-size: 15.5px; }
.footer-pill-secondary { padding: 12px 24px; font-size: 13.5px; }

@media (prefers-reduced-motion: reduce) {
  .animate-footer-breathe,
  .animate-footer-scroll-marquee,
  .animate-footer-heartbeat { animation: none; }
}
`

// -------------------------------------------------------------------------
// Magnetic button primitive (GSAP-driven pointer follow + 3D tilt)
// -------------------------------------------------------------------------
const MagneticButton = React.forwardRef(function MagneticButton(
  { className, children, as: Component = 'button', ...props },
  forwardedRef,
) {
  const localRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const element = localRef.current
    if (!element) return
    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const ctx = gsap.context(() => {
      const handleMouseMove = (e) => {
        const rect = element.getBoundingClientRect()
        const h = rect.width / 2
        const w = rect.height / 2
        const x = e.clientX - rect.left - h
        const y = e.clientY - rect.top - w
        gsap.to(element, {
          x: x * 0.4,
          y: y * 0.4,
          rotationX: -y * 0.15,
          rotationY: x * 0.15,
          scale: 1.05,
          ease: 'power2.out',
          duration: 0.4,
        })
      }
      const handleMouseLeave = () => {
        gsap.to(element, {
          x: 0,
          y: 0,
          rotationX: 0,
          rotationY: 0,
          scale: 1,
          ease: 'elastic.out(1, 0.3)',
          duration: 1.2,
        })
      }
      element.addEventListener('mousemove', handleMouseMove)
      element.addEventListener('mouseleave', handleMouseLeave)
      return () => {
        element.removeEventListener('mousemove', handleMouseMove)
        element.removeEventListener('mouseleave', handleMouseLeave)
      }
    }, element)

    return () => ctx.revert()
  }, [])

  return (
    <Component
      ref={(node) => {
        localRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }}
      className={cn('footer-glass-pill', className)}
      style={{ cursor: 'pointer' }}
      {...props}
    >
      {children}
    </Component>
  )
})

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------
const MARQUEE_PHRASES = [
  'Physician-Supervised AI',
  '300+ Skin Conditions',
  'Multi-Angle Imaging',
  'Explainable AI',
  'Longitudinal Monitoring',
  'Standardized Documentation',
]

const MarqueeItem = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 48, padding: '0 24px' }}>
    {MARQUEE_PHRASES.map((p, i) => (
      <React.Fragment key={p}>
        <span>{p}</span>
        <span style={{ color: i % 2 === 0 ? 'rgba(165,231,248,0.6)' : 'rgba(76,143,136,0.7)' }}>✦</span>
      </React.Fragment>
    ))}
  </div>
)

const pillLink = {
  borderRadius: 999,
  color: '#F1F8FA',
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 12,
  textDecoration: 'none',
}
const secondaryPill = {
  borderRadius: 999,
  color: 'rgba(213,230,235,0.66)',
  fontWeight: 500,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
}

export default function CinematicFooter() {
  const wrapperRef = useRef(null)
  const giantTextRef = useRef(null)
  const headingRef = useRef(null)
  const linksRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !wrapperRef.current) return
    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        giantTextRef.current,
        { y: '10vh', scale: 0.8, opacity: 0 },
        {
          y: '0vh',
          scale: 1,
          opacity: 1,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: 'top 80%',
            end: 'bottom bottom',
            scrub: 1,
          },
        },
      )
      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: 'top 40%',
            end: 'bottom bottom',
            scrub: 1,
          },
        },
      )
    }, wrapperRef)

    return () => ctx.revert()
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Curtain-reveal wrapper: clip-path contains the fixed footer to this box. */}
      <div
        ref={wrapperRef}
        style={{
          position: 'relative',
          height: '100vh',
          width: '100%',
          clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)',
        }}
      >
        <footer
          className="cinematic-footer-wrapper"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            display: 'flex',
            /* start below the sticky header so the marquee isn't tucked under it */
            height: 'calc(100vh - 60px)',
            width: '100%',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            background: '#10303A',
            color: '#F1F8FA',
          }}
        >
          {/* Ambient aurora + grid */}
          <div
            className="footer-aurora animate-footer-breathe"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              height: '60vh',
              width: '80vw',
              transform: 'translate(-50%,-50%)',
              borderRadius: '50%',
              filter: 'blur(80px)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <div
            className="footer-bg-grid"
            style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
          />

          {/* Giant background wordmark */}
          <div
            ref={giantTextRef}
            className="footer-giant-bg-text"
            style={{
              position: 'absolute',
              bottom: '-5vh',
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              zIndex: 0,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            DERMASCOPE
          </div>

          {/* Diagonal marquee */}
          <div
            style={{
              position: 'absolute',
              top: 64,
              left: 0,
              width: '100%',
              overflow: 'hidden',
              borderTop: '1px solid rgba(213,230,235,0.16)',
              borderBottom: '1px solid rgba(213,230,235,0.16)',
              background: 'rgba(16,48,58,0.6)',
              backdropFilter: 'blur(10px)',
              padding: '16px 0',
              zIndex: 10,
              transform: 'rotate(-2deg) scale(1.1)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
            }}
          >
            <div
              className="animate-footer-scroll-marquee"
              style={{
                display: 'flex',
                width: 'max-content',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.3em',
                color: 'rgba(213,230,235,0.66)',
                textTransform: 'uppercase',
              }}
            >
              <MarqueeItem />
              <MarqueeItem />
            </div>
          </div>

          {/* Center content */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 24px',
              marginTop: 80,
              width: '100%',
              maxWidth: 1024,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <h2
              ref={headingRef}
              className="footer-text-glow"
              style={{
                fontSize: 'clamp(48px,7vw,96px)',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                marginBottom: 48,
                textAlign: 'center',
              }}
            >
              Ready to see more?
            </h2>

            <div
              ref={linksRef}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
                <MagneticButton as="a" href="#" className="footer-pill-primary" style={pillLink}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(213,230,235,0.7)' }}>
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.56.04 2.87.67 3.55 1.76-3.13 1.77-2.62 5.92.35 7.14-.65 1.58-1.57 3.1-2.57 4.03zm-3.21-14.7c-.55 1.4-1.89 2.37-3.25 2.28.09-1.5 1.05-2.82 2.38-3.4 1.25-.57 2.66-.41 3.25.04-.15.35-.26.72-.38 1.08z" />
                  </svg>
                  Download iOS
                </MagneticButton>
                <MagneticButton as="a" href="#" className="footer-pill-primary" style={pillLink}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(213,230,235,0.7)' }}>
                    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0222 3.503C15.5902 8.242 13.8533 7.85 12 7.85c-1.8533 0-3.5902.392-5.1369 1.1004L4.841 5.4475a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3436-4.1021-2.6893-7.5743-6.1185-9.4396" />
                  </svg>
                  Download Android
                </MagneticButton>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8 }}>
                <MagneticButton as="a" href="#" className="footer-pill-secondary" style={secondaryPill}>
                  Privacy Policy
                </MagneticButton>
                <MagneticButton as="a" href="#" className="footer-pill-secondary" style={secondaryPill}>
                  Terms of Service
                </MagneticButton>
                <MagneticButton as="a" href="#" className="footer-pill-secondary" style={secondaryPill}>
                  Support
                </MagneticButton>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              position: 'relative',
              zIndex: 20,
              width: '100%',
              paddingBottom: 32,
              paddingLeft: 48,
              paddingRight: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: 420 }}>
              <div
                style={{
                  color: 'rgba(213,230,235,0.66)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                © 2026 DermaScope.ai — All rights reserved.
              </div>
              <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.5, color: 'rgba(213,230,235,0.5)' }}>
                AI outputs are intended to support — not replace — clinical judgment. Every final
                clinical decision remains in human hands.
              </div>
            </div>

            <div
              className="footer-glass-pill"
              style={{
                padding: '12px 24px',
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'default',
              }}
            >
              <span style={{ color: 'rgba(213,230,235,0.66)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                Crafted with
              </span>
              <span className="animate-footer-heartbeat" style={{ fontSize: 15, color: '#FF6B6B' }}>❤</span>
              <span style={{ color: 'rgba(213,230,235,0.66)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                by
              </span>
              <span style={{ color: '#F1F8FA', fontWeight: 900, fontSize: 12.5, marginLeft: 4 }}>Human Studio Labs</span>
            </div>

            <MagneticButton
              as="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(213,230,235,0.66)',
                border: 'none',
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </MagneticButton>
          </div>
        </footer>
      </div>
    </>
  )
}
