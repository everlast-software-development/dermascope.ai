import { useEffect, useState } from 'react'

const links = [
  { label: 'Home', href: '#top', id: 'top' },
  { label: 'Features', href: '#why', id: 'why' },
  { label: 'How It Works', href: '#how', id: 'how' },
  { label: 'Clinical Applications', href: '#who', id: 'who' },
  { label: 'About', href: '#challenge', id: 'challenge' },
  { label: 'Contact', href: '#demo', id: 'demo' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('top')

  // Scroll state → morph the floating bar (denser glass, shorter).
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20)
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scrollspy → active nav indicator.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const sections = links
      .map((l) => document.getElementById(l.id))
      .filter(Boolean)
    if (!sections.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] },
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  // Lock body scroll while the mobile overlay is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <div className="ds-fn-wrap">
      <nav className={`ds-fn${scrolled ? ' is-scrolled' : ''}`} aria-label="Primary">
        {/* LEFT — logo with glowing accent */}
        <a href="#top" className="ds-fn-logo" aria-label="DermaScope.ai home">
          <span className="ds-fn-logo-glow" aria-hidden="true" />
          <img src="/logo.webp" alt="DermaScope.ai" />
        </a>

        {/* CENTER — navigation links */}
        <div className="ds-fn-links">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`ds-fn-link${active === l.id ? ' is-active' : ''}`}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* RIGHT — actions */}
        <div className="ds-fn-actions">
          <a href="#demo" className="ds-fn-demo">
            Join Early Access
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className={`ds-fn-burger${menuOpen ? ' is-open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Fullscreen glass overlay (mobile) */}
      <div className={`ds-fn-overlay${menuOpen ? ' is-open' : ''}`} role="dialog" aria-modal="true">
        {links.map((l, i) => (
          <a
            key={l.href}
            href={l.href}
            onClick={() => setMenuOpen(false)}
            style={{ transitionDelay: menuOpen ? `${0.08 + i * 0.05}s` : '0s' }}
          >
            {l.label}
          </a>
        ))}
        <div className="ds-fn-overlay-actions">
          <a href="#demo" className="ds-fn-demo" onClick={() => setMenuOpen(false)}>
            Join Early Access
          </a>
        </div>
      </div>
    </div>
  )
}
