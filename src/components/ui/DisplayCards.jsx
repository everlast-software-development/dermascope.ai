import { useEffect, useRef, useState } from 'react'

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
    <div ref={ref} className={`ds-dc-stack${visible ? ' ds-visible' : ''}`}>
      {cards.map((card, i) => (
        <DisplayCard key={card.title || i} {...card} />
      ))}
    </div>
  )
}
