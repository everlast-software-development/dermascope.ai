import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Reveal from './Reveal'
import SectionSubtitle from './SectionSubtitle'
import { steps } from '../data'
import { useResponsive } from '../hooks/useResponsive'

gsap.registerPlugin(ScrollTrigger)

const STEP_SECONDS = 5

const section = {
  position: 'relative',
  background: 'linear-gradient(165deg,#1B4754,#1E4E5C 60%,#255862)',
  overflow: 'hidden',
  scrollMarginTop: 70,
}

function PhoneMockup({ alt, width = 264 }) {
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          inset: -50,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(165,231,248,0.28),transparent 68%)',
          filter: 'blur(14px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width,
          borderRadius: 58,
          padding: 11,
          background: 'linear-gradient(160deg,#4d585f,#20272b 42%,#39434a)',
          boxShadow: '0 44px 90px rgba(8,26,32,0.6),inset 0 0 2px rgba(255,255,255,0.5)',
        }}
      >
        <div style={{ position: 'absolute', left: -2, top: 118, width: 3, height: 30, borderRadius: 2, background: '#161c20' }} />
        <div style={{ position: 'absolute', left: -2, top: 164, width: 3, height: 52, borderRadius: 2, background: '#161c20' }} />
        <div style={{ position: 'absolute', left: -2, top: 226, width: 3, height: 52, borderRadius: 2, background: '#161c20' }} />
        <div style={{ position: 'absolute', right: -2, top: 180, width: 3, height: 76, borderRadius: 2, background: '#161c20' }} />
        <div style={{ borderRadius: 48, overflow: 'hidden', background: '#000' }}>
          <img src="/phone-report.png" alt={alt} style={{ width: '100%', display: 'block' }} />
        </div>
      </div>
    </div>
  )
}

function MediaLayer({ media, active, position, isMobile, phoneWidth }) {
  // Enter from below, exit upward — the current step scales in, the previous
  // one fades + scales down as the story advances.
  const translateY = active ? 0 : position === 'past' ? -50 : 50
  const scale = active ? 1 : 0.92
  const isPhone = media.type === 'phone'
  const isImage = media.type === 'image'

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isImage ? 0 : isPhone ? 0 : isMobile ? 20 : 44,
        transition: 'opacity .55s ease, transform .55s cubic-bezier(.22,.61,.36,1)',
        opacity: active ? 1 : 0,
        transform: `translateY(${translateY}px) scale(${scale})`,
        pointerEvents: active ? 'auto' : 'none',
        willChange: 'opacity, transform',
      }}
    >
      {isImage ? (
        // Round the corners on a wrapper via overflow:hidden (a vector clip that
        // anti-aliases cleanly) rather than border-radius on the <img> itself,
        // which Chrome renders jagged for replaced elements inside a composited
        // (transform/will-change) layer.
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 22,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Frameless: just a soft ambient shadow so the image reads as part of
            // the section, not a card sitting on top of it.
            boxShadow: '0 44px 90px -44px rgba(0,0,0,0.62)',
          }}
        >
          <img
            src={media.src}
            alt={media.alt}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        </div>
      ) : isPhone ? (
        <PhoneMockup alt={media.alt} width={phoneWidth} />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 20,
            border: '1px dashed rgba(165,231,248,0.3)',
            background:
              'repeating-linear-gradient(45deg,rgba(165,231,248,0.07) 0 14px,rgba(165,231,248,0.02) 14px 28px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'ui-monospace,SFMono-Regular,monospace',
              fontSize: 13,
              color: '#D5E6EB',
            }}
          >
            {media.text}
          </span>
        </div>
      )}
    </div>
  )
}

export default function HowItWorks() {
  const { isMobile, isTablet } = useResponsive()
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Pinned scroll-storytelling only where a single viewport can hold the whole
  // scene (desktop, side-by-side). Tablet/mobile/reduced-motion keep the
  // gentle auto-advance so touch scrolling is never hijacked.
  const pinned = !isMobile && !isTablet && !reduce

  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(true)

  const sectionRef = useRef(null)
  const pinRef = useRef(null)
  const stRef = useRef(null)
  const stepRef = useRef(0)
  stepRef.current = step

  // ── Desktop: pin + scrub through the steps with snapping ──────────────
  useEffect(() => {
    if (!pinned) return
    const el = pinRef.current
    if (!el) return
    const N = steps.length

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      // ~0.8 viewport of scroll per transition — enough to feel deliberate,
      // not so much it drags.
      end: () => `+=${Math.round(window.innerHeight * (N - 1) * 0.8)}`,
      pin: true,
      pinSpacing: true,
      scrub: 0.6,
      anticipatePin: 1,
      snap: {
        snapTo: 1 / (N - 1),
        duration: { min: 0.2, max: 0.5 },
        delay: 0.04,
        ease: 'power1.inOut',
      },
      onUpdate: (self) => {
        const idx = Math.min(N - 1, Math.max(0, Math.round(self.progress * (N - 1))))
        if (idx !== stepRef.current) setStep(idx)
      },
    })
    stRef.current = st
    // Recalculate once images/fonts have settled.
    const t = setTimeout(() => ScrollTrigger.refresh(), 200)

    return () => {
      clearTimeout(t)
      st.kill()
      stRef.current = null
    }
  }, [pinned])

  // ── Tablet / mobile / reduced-motion: auto-advance fallback ───────────
  useEffect(() => {
    if (pinned) return
    if (reduce) return
    const inc = 100 / (STEP_SECONDS * 10)
    const timer = setInterval(() => {
      if (!playing || document.hidden) return
      setProgress((p) => {
        if (p >= 100) {
          setStep((s) => (s + 1) % steps.length)
          return 0
        }
        return p + inc
      })
    }, 100)
    return () => clearInterval(timer)
  }, [pinned, playing, reduce])

  // Pause the fallback autoplay when the section is off-screen.
  useEffect(() => {
    if (pinned) return
    const el = sectionRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => setPlaying(entries[0].isIntersecting),
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [pinned])

  // Click a step: on desktop scroll to its pinned position; otherwise jump.
  const jump = (i) => {
    const st = stRef.current
    if (pinned && st) {
      const target = st.start + (i / (steps.length - 1)) * (st.end - st.start)
      window.scrollTo({ top: target, behavior: 'smooth' })
    } else {
      setStep(i)
      setProgress(0)
    }
  }

  const phoneWidth = isMobile ? 300 : isTablet ? 340 : 264
  // Larger, frameless product image (~20-30% bigger than the old card).
  const mediaHeight = isMobile ? 540 : isTablet ? 740 : 'min(720px, 72vh)'

  return (
    <section
      id="how"
      ref={sectionRef}
      style={{ ...section, padding: pinned ? 0 : isMobile ? '64px 20px' : isTablet ? '80px 32px' : '110px 48px' }}
    >
      <div
        style={{
          position: 'absolute',
          top: -160,
          left: -140,
          width: isMobile ? 320 : 520,
          height: isMobile ? 320 : 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(165,231,248,0.14),transparent 65%)',
        }}
      />

      <div
        ref={pinRef}
        style={
          pinned
            ? {
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '96px 48px 54px',
              }
            : undefined
        }
      >
        <div style={{ position: 'relative', width: 'min(1240px, calc(100% - 0px))', maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ maxWidth: 720, marginBottom: pinned ? 34 : isMobile ? 40 : isTablet ? 54 : 70 }}>
            <SectionSubtitle label="How It Works" tone="dark" />
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(34px,3.4vw,50px)',
                lineHeight: 1.12,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#FFFFFF',
              }}
            >
              Simple. Fast. <span style={{ color: '#A5E7F8' }}>AI-Powered.</span>
            </h2>
          </Reveal>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile || isTablet ? '1fr' : '1fr 1fr',
              gap: isMobile ? 32 : isTablet ? 48 : 80,
              alignItems: 'center',
            }}
          >
            {/* Steps */}
            <div style={{ display: 'grid', gap: pinned ? 2 : 8 }}>
              {steps.map((s, i) => {
                const active = i === step
                const done = i < step
                return (
                  <div
                    key={s.title}
                    onClick={() => jump(i)}
                    style={{
                      display: 'flex',
                      gap: 22,
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      padding: pinned ? '11px 18px' : '16px 18px',
                      borderRadius: 18,
                      transition: 'opacity .5s',
                      opacity: active ? 1 : 0.42,
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 17,
                        fontWeight: 700,
                        border: `2px solid ${active ? '#A5E7F8' : done ? '#4C8F88' : 'rgba(213,230,235,0.35)'}`,
                        background: active ? '#A5E7F8' : done ? '#4C8F88' : 'rgba(255,255,255,0.06)',
                        color: active ? '#12333B' : done ? '#FFFFFF' : '#D5E6EB',
                        transition: 'all .4s',
                      }}
                    >
                      {i + 1}
                      <span
                        style={{
                          position: 'absolute',
                          inset: -2,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: done ? '#4C8F88' : 'rgba(255,255,255,0.06)',
                          color: '#FFFFFF',
                          opacity: done ? 1 : 0,
                          transition: 'opacity .3s',
                        }}
                      >
                        ✓
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '2px 0 6px', fontSize: 20, fontWeight: 600, color: '#FFFFFF' }}>
                        {s.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#D5E6EB' }}>
                        {s.body}
                      </p>
                      {!pinned && (
                        <div
                          style={{
                            marginTop: 12,
                            height: 3,
                            borderRadius: 999,
                            background: 'rgba(213,230,235,0.15)',
                            overflow: 'hidden',
                            opacity: active ? 1 : 0,
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              background: '#A5E7F8',
                              borderRadius: 999,
                              width: `${active ? progress : 0}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Media stage — frameless. The image is the hero; a soft teal glow
                sits behind it to integrate with the section (no card/border). */}
            <div
              style={{
                position: 'relative',
                height: mediaHeight,
                aspectRatio: '3 / 4',
                width: 'auto',
                maxWidth: '100%',
                margin: '0 auto',
              }}
            >
              {/* Ambient teal glow behind the product image */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: '118%',
                  height: '104%',
                  transform: 'translate(-50%,-50%)',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(closest-side, rgba(127,216,232,0.22), rgba(76,143,136,0.07) 46%, transparent 74%)',
                  filter: 'blur(34px)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />
              {steps.map((s, i) => (
                <MediaLayer
                  key={s.title}
                  media={s.media}
                  active={i === step}
                  position={i < step ? 'past' : 'future'}
                  isMobile={isMobile}
                  phoneWidth={phoneWidth}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
