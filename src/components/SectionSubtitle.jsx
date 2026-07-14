import { useEffect, useRef, useState } from 'react'

// Minimal section subtitle: accent dot ── line ── uppercase text.
// Animates in when scrolled into view (dot fades first, line grows, text
// slides in from the left). tone flips accent/text colour for contrast:
// 'dark' over dark backgrounds, 'light' over light ones.
export default function SectionSubtitle({ label, tone = 'dark', style }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      setInView(true)
      return
    }
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
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
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ marginBottom: 24, ...style }}>
      <span className={`ds-sub ds-sub--${tone}${inView ? ' is-in' : ''}`}>
        <span className="ds-sub-dot" aria-hidden="true" />
        <span className="ds-sub-line" aria-hidden="true" />
        <span className="ds-sub-text">{label}</span>
      </span>
    </div>
  )
}
