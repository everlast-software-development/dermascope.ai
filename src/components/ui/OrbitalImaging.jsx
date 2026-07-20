import { useRef, useState, useLayoutEffect } from 'react'
import { Camera, Aperture, Box, Sparkles, Check } from 'lucide-react'
import { useResponsive } from '../../hooks/useResponsive'
import './OrbitalImaging.css'

// Three standardized capture angles as cards permanently orbiting an
// "AI Clinical Analysis" core. Desktop uses a pure-CSS rotor (no per-frame JS,
// so no jitter); tablet/mobile fall back to a stacked, non-orbiting layout.
// The whole viz is designed at a fixed pixel size and uniformly scaled to fit
// whatever column width it lives in, so it never overflows or clips.
const NODES = [
  { id: 1, label: '90°', title: '90° Frontal View', desc: 'Direct frontal capture for lesion size, color distribution, and anatomical localization.', Icon: Camera },
  { id: 2, label: '75°', title: '75° Oblique View', desc: 'Provides depth perception and lesion border visibility for improved AI interpretation.', Icon: Aperture },
  { id: 3, label: '40°', title: '40° Side View', desc: 'Captures elevation, contours, and surface texture that may not appear in frontal images.', Icon: Box },
]

// Fixed design size of the desktop orbit. Card centres sit on a circle of
// radius R; footprint is (2R + cardW) x cappedHeight. Two clearances are
// enforced so nothing ever overlaps at any rotation:
//   • card ↔ core: R − cardW/2 ≥ coreRadius + margin (side position is worst).
//   • card ↔ card: centre spacing R·√3 ≈ 371px ≫ cardW.
// The whole thing is then uniformly scaled to fit its column width.
const R = 214
const CARD_W = 262
const CENTER_SIZE = 140
const VIZ_W = 2 * R + CARD_W // 690
const VIZ_H = 576

function AngleCard({ n, compact }) {
  return (
    <div
      style={{
        width: '100%',
        background: '#FFFFFF',
        border: '1px solid #E3EDEF',
        borderRadius: 16,
        padding: compact ? '14px 16px' : '18px 20px',
        boxShadow: '0 20px 44px -24px rgba(16,55,62,0.24)',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: compact ? 34 : 40,
            height: compact ? 34 : 40,
            flexShrink: 0,
            borderRadius: 11,
            background: 'linear-gradient(140deg,rgba(165,231,248,0.5),rgba(76,143,136,0.22))',
            border: '1px solid rgba(76,143,136,0.28)',
            color: '#256E75',
          }}
        >
          <n.Icon size={compact ? 17 : 19} strokeWidth={2} />
        </span>
        <h4 style={{ margin: 0, flex: 1, fontSize: compact ? 15.5 : 17.5, fontWeight: 700, letterSpacing: '-0.01em', color: '#1B4754' }}>{n.title}</h4>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: compact ? '3px 8px' : '4px 10px', borderRadius: 999, fontSize: compact ? 10.5 : 11.5, fontWeight: 600, background: 'rgba(76,143,136,0.12)', border: '1px solid rgba(76,143,136,0.22)', color: '#3E8A82', flexShrink: 0 }}>
          <Check size={compact ? 11 : 12} strokeWidth={3} /> Completed
        </span>
      </div>
      <p style={{ margin: 0, fontSize: compact ? 13.5 : 14.5, lineHeight: 1.55, color: '#6A7C83' }}>{n.desc}</p>
    </div>
  )
}

function Core({ size }) {
  return (
    <div
      className="ds-orbit-core"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        textAlign: 'center',
        background: 'linear-gradient(145deg,#1B4754 0%,#20525F 60%,#255862 100%)',
        border: '1px solid rgba(165,231,248,0.38)',
        color: '#EAF6F9',
      }}
    >
      <Sparkles size={size > 150 ? 28 : 24} strokeWidth={1.9} color="#A5E7F8" />
      <span style={{ fontSize: size > 150 ? 12.5 : 11.5, fontWeight: 700, lineHeight: 1.2, letterSpacing: '0.01em', padding: '0 10px' }}>
        AI Clinical
        <br />
        Analysis
      </span>
    </div>
  )
}

export default function OrbitalImaging() {
  const { isMobile } = useResponsive()
  // Tablet mirrors desktop: it also runs the CSS orbit (which auto-scales to
  // fit its column). Only phones fall back to the stacked, non-orbiting layout.
  const orbit = !isMobile

  // Uniformly scale the fixed-size desktop viz down to fit its column so it can
  // never overflow (ResizeObserver-driven, not per-frame → no jitter).
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    if (!orbit) return
    const el = wrapRef.current
    if (!el) return
    const update = () => setScale(Math.min(1, el.clientWidth / VIZ_W))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [orbit])

  // ── Tablet / mobile: stacked, non-orbiting (all cards visible) ──────────
  if (!orbit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 16 : 20, maxWidth: 380, margin: '0 auto' }}>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div className="ds-orbit-glow" style={{ position: 'absolute', left: '50%', top: '50%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle,rgba(127,216,232,0.35),transparent 62%)', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
          <Core size={isMobile ? 132 : 148} />
        </div>
        {NODES.map((n, i) => (
          <div key={n.id} className="ds-orbit-float" style={{ animationDelay: `${i * 0.8}s`, width: '100%' }}>
            <AngleCard n={n} compact={isMobile} />
          </div>
        ))}
      </div>
    )
  }

  // ── Desktop: CSS-driven orbit, uniformly scaled to fit the column ───────
  return (
    <div ref={wrapRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: VIZ_W * scale, height: VIZ_H * scale }}>
        <div style={{ position: 'relative', width: VIZ_W, height: VIZ_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {/* glow behind the center */}
          <div className="ds-orbit-glow" style={{ position: 'absolute', left: '50%', top: '50%', width: CENTER_SIZE * 2.3, height: CENTER_SIZE * 2.3, borderRadius: '50%', background: 'radial-gradient(circle,rgba(127,216,232,0.32),transparent 60%)', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 0 }} />

          {/* center core */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 2 }}>
            <Core size={CENTER_SIZE} />
          </div>

          {/* rotating group */}
          <div className="ds-orbit-rotor">
            {NODES.map((n, i) => {
              const base = i * 120
              return (
                <div key={n.id} style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, transform: `rotate(${base}deg)` }}>
                  {/* connector line (radial — rotates with the group) */}
                  <div style={{ position: 'absolute', left: -1, top: -R, width: 2, height: R - CENTER_SIZE / 2 + 6, borderRadius: 2, background: 'linear-gradient(to top, rgba(76,143,136,0.15), rgba(127,216,232,0.55))', zIndex: 1 }} />
                  {/* card holder, centered at radius R */}
                  <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(-50%, calc(-50% - ${R}px))`, zIndex: 3 }}>
                    <div className="ds-orbit-counter">
                      <div style={{ transform: `rotate(${-base}deg)` }}>
                        <div className="ds-orbit-float" style={{ width: CARD_W, animationDelay: `${i * 0.8}s` }}>
                          <AngleCard n={n} compact />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
