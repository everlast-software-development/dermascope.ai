import { useEffect, useRef, useState } from 'react'
import { useResponsive } from '../../hooks/useResponsive'

// Display Cards — a fanned, skewed stack of glass cards. Content is passed in
// via `cards`; each entry is { icon, title, description, accent }. Styling lives
// in index.css (.ds-dc-*) so it stays consistent with the rest of the site.
function DisplayCard({ icon, title, description, accent }) {
  return (
    <article className={`ds-dc-card${accent ? ' ds-dc-card--accent' : ''}`}>
      <div className="ds-dc-icon" aria-hidden="true">
        {icon}
      </div>
      <h4 className="ds-dc-title">{title}</h4>
      <p className="ds-dc-desc">{description}</p>
    </article>
  )
}

export default function DisplayCards({ cards = [] }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const { isMobile, isTablet } = useResponsive()

  // Inline overrides win over the .ds-dc-* class values. Desktop (>1024px)
  // leaves these undefined so the CSS-defined fan is untouched. On smaller
  // screens the stack is scaled down and the fan tightened so the third card's
  // offset can never push past a narrow container (no overflow at 360px).
  const stackStyle = isMobile
    ? {
        '--dc-w': 'min(240px, 74vw)',
        '--dc-step-x': 'calc(var(--dc-w) * 0.08)',
        '--dc-step-y': '38px',
        minHeight: 320,
        maxWidth: '100%',
        margin: '0 auto',
      }
    : isTablet
      ? {
          '--dc-w': 'clamp(240px, 32vw, 320px)',
          '--dc-step-x': 'calc(var(--dc-w) * 0.14)',
          '--dc-step-y': '48px',
          minHeight: 400,
          maxWidth: '100%',
        }
      : undefined

  // Fade-up the whole stack when it enters the viewport (reduced-motion safe).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
  }, [])

  return (
    <div ref={ref} className={`ds-dc-stack${visible ? ' ds-visible' : ''}`} style={stackStyle}>
      {cards.map((card, i) => (
        <DisplayCard key={card.title || i} {...card} />
      ))}
    </div>
  )
}
