import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import SectionSubtitle from './SectionSubtitle'
import { steps } from '../data'
import { useResponsive } from '../hooks/useResponsive'

const STEP_SECONDS = 5

const section = {
  position: 'relative',
  background: 'linear-gradient(165deg,#1B4754,#1E4E5C 60%,#255862)',
  padding: '110px 48px',
  overflow: 'hidden',
  scrollMarginTop: 70,
}

function PhoneMockup({ alt }) {
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
          width: 264,
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

function MediaLayer({ media, active, position, isMobile }) {
  const translateY = active ? 0 : position === 'past' ? -60 : 60
  const isPhone = media.type === 'phone'

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isPhone ? 0 : isMobile ? 20 : 44,
        transition: 'opacity .6s ease,transform .6s ease',
        opacity: active ? 1 : 0,
        transform: `translateY(${translateY}px)`,
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
      {isPhone ? (
        <PhoneMockup alt={media.alt} />
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
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(true)
  const reduceRef = useRef(false)

  // Autoplay progress bar → advance step when full.
  useEffect(() => {
    reduceRef.current =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const inc = 100 / (STEP_SECONDS * 10)
    const timer = setInterval(() => {
      if (!playing || document.hidden || reduceRef.current) return
      setProgress((p) => {
        if (p >= 100) {
          setStep((s) => (s + 1) % steps.length)
          return 0
        }
        return p + inc
      })
    }, 100)
    return () => clearInterval(timer)
  }, [playing])

  // Only autoplay while the section is on screen.
  const sectionRef = useRef(null)
  useEffect(() => {
    const el = sectionRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => setPlaying(entries[0].isIntersecting),
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const jump = (i) => {
    setStep(i)
    setProgress(0)
  }

  return (
    <section
      id="how"
      ref={sectionRef}
      style={{
        ...section,
        padding: isMobile ? '64px 20px' : isTablet ? '80px 32px' : section.padding,
      }}
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
      <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ maxWidth: 720, marginBottom: isMobile ? 40 : isTablet ? 54 : 70 }}>
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
          <div style={{ display: 'grid', gap: 8 }}>
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
                    padding: '16px 18px',
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
                  </div>
                </div>
              )
            })}
          </div>

          {/* Media panel */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: isMobile ? 440 : isTablet ? 560 : 680,
              borderRadius: 28,
              border: '1px solid rgba(165,231,248,0.18)',
              background: 'rgba(255,255,255,0.03)',
              overflow: 'hidden',
            }}
          >
            {steps.map((s, i) => (
              <MediaLayer
                key={s.title}
                media={s.media}
                active={i === step}
                position={i < step ? 'past' : 'future'}
                isMobile={isMobile}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
