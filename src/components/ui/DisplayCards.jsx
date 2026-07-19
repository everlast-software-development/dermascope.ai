import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useResponsive } from '../../hooks/useResponsive'

// Display Cards — a stacked set of glass cards that rotate like a premium
// carousel: every `interval` ms the front card recedes to the back and the
// others shift forward. The card DESIGN (.ds-dc-* in index.css) is untouched;
// only the stack positions are driven here, via framer-motion springs.
//
// Slot order: 0 = front (largest, nearest, strongest shadow, top z),
// 1 = middle, 2 = back (smallest, furthest, lightest shadow, bottom z).
export default function DisplayCards({ cards = [], interval = 5000 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const [front, setFront] = useState(0)
  const { isMobile, isTablet } = useResponsive()
  const reduce = useReducedMotion()
  const N = cards.length

  // Clicking / tapping a card brings it to the front. `tick` bumps on each
  // click so the auto-rotate timer resets — the chosen card leads for a full
  // interval before rotation resumes.
  const [tick, setTick] = useState(0)
  const bringToFront = (i) => {
    setFront(i)
    setTick((t) => t + 1)
  }

  // Inline overrides win over the .ds-dc-* class values. Desktop leaves --dc-w
  // to the CSS; smaller screens scale the card + fan down (no overflow at 360px).
  const stackStyle = isMobile
    ? { '--dc-w': 'min(240px, 74vw)', minHeight: 320, maxWidth: '100%', margin: '0 auto' }
    : isTablet
      ? { '--dc-w': 'clamp(240px, 32vw, 320px)', minHeight: 400, maxWidth: '100%' }
      : undefined

  // Fade-up the whole stack when it enters the viewport (reduced-motion safe).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduce || !('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true)
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduce])

  // Rotate the stack once it's on screen. Pause when the tab is hidden so it
  // never "catches up" with a burst of rotations.
  useEffect(() => {
    if (reduce || !visible || N < 2) return
    const id = setInterval(() => {
      if (!document.hidden) setFront((f) => (f + 1) % N)
    }, interval)
    return () => clearInterval(id)
  }, [reduce, visible, N, interval, tick])

  // Per-breakpoint fan step (matches the original offsets so spacing is kept).
  const stepX = isMobile ? 8 : isTablet ? 14 : 18 // % of card width
  const stepY = isMobile ? 38 : isTablet ? 48 : 70 // px
  const slots = [
    { x: `${stepX * 2}%`, y: stepY * 2, scale: 1, zIndex: 3, opacity: 1, boxShadow: '0 34px 66px rgba(11,36,44,0.30)' },
    { x: `${stepX}%`, y: stepY, scale: 0.96, zIndex: 2, opacity: 0.92, boxShadow: '0 22px 46px rgba(11,36,44,0.22)' },
    { x: '0%', y: 0, scale: 0.92, zIndex: 1, opacity: 0.8, boxShadow: '0 14px 32px rgba(11,36,44,0.15)' },
  ]

  return (
    <div ref={ref} className={`ds-dc-stack${visible ? ' ds-visible' : ''}`} style={stackStyle}>
      {cards.map((card, i) => {
        const slot = ((i - front) % N + N) % N // 0 front · 1 middle · 2 back
        const s = slots[Math.min(slot, slots.length - 1)]
        return (
          <motion.article
            key={card.title || i}
            className={`ds-dc-card${card.accent ? ' ds-dc-card--accent' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`Bring ${card.title} to front`}
            onClick={() => bringToFront(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                bringToFront(i)
              }
            }}
            // Disable the CSS transition on .ds-dc-card so framer owns motion.
            style={{ zIndex: s.zIndex, transition: 'none', willChange: 'transform', cursor: 'pointer' }}
            initial={false}
            animate={{ x: s.x, y: s.y, scale: s.scale, opacity: s.opacity, boxShadow: s.boxShadow, skewY: -7 }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: 'spring', stiffness: 110, damping: 17, mass: 1 }
            }
          >
            <div className="ds-dc-icon" aria-hidden="true">
              {card.icon}
            </div>
            <h4 className="ds-dc-title">{card.title}</h4>
            <p className="ds-dc-desc">{card.description}</p>
          </motion.article>
        )
      })}
    </div>
  )
}
