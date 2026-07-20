import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useResponsive } from '../hooks/useResponsive'
import './Hero.css'

// Reusable site header for sub-pages (e.g. Privacy Policy). Visually identical
// to the Hero's sticky nav in its "scrolled" light state — appropriate here
// since sub-pages sit on a light background from the top. Section links point
// back to the landing page anchors ("/#…").
const navItems = [
  { label: 'Home', href: '/#top' },
  { label: 'Features', href: '/#why' },
  { label: 'How It Works', href: '/#how' },
  { label: 'Clinical Applications', href: '/#who' },
  { label: 'About', href: '/#challenge' },
  { label: 'Contact', href: '/#demo' },
]

export default function SiteHeader() {
  const { isMobile, isTablet } = useResponsive()
  const stacked = isMobile || isTablet
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          width: isMobile ? 'calc(100% - 40px)' : isTablet ? 'calc(100% - 64px)' : 'min(1240px, calc(100% - 96px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          padding: stacked ? '9px 12px 9px 18px' : '10px 14px 10px 22px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(15,61,68,0.12)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 12px 34px rgba(0,20,24,0.16)',
          zIndex: 100,
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <Link to="/" aria-label="DermaScope.ai home" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.webp" alt="DermaScope.ai" style={{ height: isMobile ? 28 : 34, width: 'auto', display: 'block' }} />
        </Link>

        {!stacked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 14.5 }}>
            {navItems.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                className="ds-hnav-link"
                style={{ color: i === 0 ? '#0f3d44' : '#3a5c62', textDecoration: 'none', fontWeight: i === 0 ? 500 : 400 }}
              >
                {l.label}
              </a>
            ))}
          </div>
        )}

        {!stacked && (
          <a
            href="/#demo"
            className="ds-hbtn"
            style={{
              background: 'linear-gradient(90deg, #007176, #17C7CC)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 14.5,
              padding: '11px 22px',
              borderRadius: 999,
              boxShadow: '0 6px 18px rgba(0,20,24,0.30)',
              textDecoration: 'none',
            }}
          >
            Join Early Access
          </a>
        )}

        {stacked && (
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="ds-hburger"
            style={{ display: 'inline-flex', flexDirection: 'column', justifyContent: 'center', gap: 5, width: 44, height: 40, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            {[0, 1, 2].map((n) => (
              <span
                key={n}
                style={{
                  display: 'block',
                  height: 2,
                  width: 24,
                  borderRadius: 2,
                  background: '#0f3d44',
                  transition: 'transform .3s ease, opacity .3s ease',
                  transform: menuOpen
                    ? n === 0
                      ? 'translateY(7px) rotate(45deg)'
                      : n === 2
                        ? 'translateY(-7px) rotate(-45deg)'
                        : 'none'
                    : 'none',
                  opacity: menuOpen && n === 1 ? 0 : 1,
                }}
              />
            ))}
          </button>
        )}
      </nav>

      {stacked && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 26,
            padding: 24,
            background: 'linear-gradient(160deg, rgba(20,60,68,0.98), rgba(11,44,50,0.98))',
            backdropFilter: 'blur(10px)',
            opacity: menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? 'auto' : 'none',
            transition: 'opacity .3s ease',
          }}
        >
          {navItems.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="ds-hnav-link" style={{ color: '#eaf7f9', fontSize: 20, fontWeight: 600, textDecoration: 'none' }}>
              {l.label}
            </a>
          ))}
          <a href="/#demo" onClick={() => setMenuOpen(false)} className="ds-hbtn" style={{ marginTop: 8, background: 'linear-gradient(90deg, #007176, #17C7CC)', color: '#ffffff', fontWeight: 700, fontSize: 16, padding: '14px 34px', borderRadius: 999, textDecoration: 'none' }}>
            Join Early Access
          </a>
        </div>
      )}
    </>
  )
}
