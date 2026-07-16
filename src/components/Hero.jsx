import { useEffect, useState } from 'react'
import { useResponsive } from '../hooks/useResponsive'
import SectionSubtitle from './SectionSubtitle'
import './Hero.css'

const teal = '#1e8a97'
const iconWrap = {
  width: 44, height: 44, borderRadius: '50%', background: '#ddf2f5',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
}
const card = {
  position: 'absolute', zIndex: 3, display: 'flex', alignItems: 'center', gap: 13,
  padding: '15px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.96)',
  boxShadow: '0 18px 40px rgba(0,15,18,0.35)',
}
const navLink = { color: '#c9e4e9', textDecoration: 'none' }

const navItems = [
  { label: 'Home', href: '#top' },
  { label: 'Features', href: '#why' },
  { label: 'How It Works', href: '#how' },
  { label: 'Clinical Applications', href: '#who' },
  { label: 'About', href: '#challenge' },
  { label: 'Contact', href: '#demo' },
]

// Floating stat cards — content authored once so they can render either as the
// absolutely-positioned desktop cards or as a wrapped static row on small screens.
const statCards = [
  {
    key: '300',
    pos: { top: '6%', left: '2%' },
    float: 'A',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2 2.5 6 10 10l7.5-4L10 2z" fill={teal} /><path d="M2.5 10 10 14l7.5-4M2.5 14 10 18l7.5-4" stroke={teal} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    body: (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 21, fontWeight: 800, color: '#12333a' }}>300+</span>
        <span style={{ fontSize: 12.5, color: '#4d6b72', lineHeight: 1.35 }}>Skin conditions<br />supported</span>
      </span>
    ),
  },
  {
    key: 'multi',
    pos: { alignItems: 'flex-start', top: '46%', left: '-3%', maxWidth: 210, padding: '16px 20px' },
    float: 'B',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="5.5" width="16" height="11" rx="2.5" stroke={teal} strokeWidth="1.6" /><path d="M7 5.5 8.4 3h3.2L13 5.5" stroke={teal} strokeWidth="1.6" strokeLinejoin="round" /><circle cx="10" cy="11" r="3" stroke={teal} strokeWidth="1.6" /></svg>,
    body: (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 15.5, fontWeight: 700, color: '#12333a', lineHeight: 1.3 }}>Multi-angle Capture</span>
        <span style={{ fontSize: 12.5, color: '#4d6b72', lineHeight: 1.4 }}>Standardized imaging for better AI results</span>
      </span>
    ),
  },
  {
    key: '95',
    pos: { top: '15%', right: '0%' },
    float: 'B',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 1.8 3.2 4.4v4.4c0 4.3 2.9 7.6 6.8 9.4 3.9-1.8 6.8-5.1 6.8-9.4V4.4L10 1.8z" stroke={teal} strokeWidth="1.6" strokeLinejoin="round" /><path d="m6.9 9.8 2.1 2.1 4.1-4.2" stroke={teal} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    body: (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 21, fontWeight: 800, color: '#12333a' }}>95%</span>
        <span style={{ fontSize: 12.5, color: '#4d6b72', lineHeight: 1.35 }}>Analysis Accuracy<br />Explainable AI findings</span>
      </span>
    ),
  },
  {
    key: 'results',
    pos: { bottom: '10%', right: '1%' },
    float: 'A',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke={teal} strokeWidth="1.6" /><path d="M10 5.8V10l3 2" stroke={teal} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    body: (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#12333a', lineHeight: 1.25 }}>Results<br />in 2&ndash;3 min</span>
        <span style={{ fontSize: 12.5, color: '#4d6b72', lineHeight: 1.35 }}>Faster insights for<br />better decisions</span>
      </span>
    ),
  },
]

function OrbitDot({ angle }) {
  return (
    <span style={{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%', transform: `translate(-50%, -50%) rotate(${angle}deg)` }}>
      <span style={{ position: 'absolute', top: -5, left: '50%', marginLeft: -5, width: 10, height: 10, borderRadius: '50%', background: '#7fd8e8', boxShadow: '0 0 14px rgba(127,216,232,1)' }} />
    </span>
  )
}

export default function Hero({ showOrbit = true, floatCards = true, marqueeSpeed = 38 }) {
  const { isMobile, isTablet } = useResponsive()
  const stacked = isMobile || isTablet // one-column layout for phones + tablets

  const floatFor = (t) =>
    floatCards && !stacked ? `float${t} ${t === 'A' ? 6 : 7}s ease-in-out infinite` : 'none'
  const logos = ['Genesis360', 'SkinTrix360', 'Everlast Wellness', 'Al Jamila Club']
  const marqueeLogos = [...logos, ...logos, ...logos, ...logos]

  // Sticky header: at the top the bar is transparent glass over the dark hero
  // and the logo is rendered white; once scrolled it gains a solid light
  // background and the logo shows its real (brand) colors.
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll while the mobile overlay is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const linkColor = scrolled ? '#3a5c62' : '#c9e4e9'

  return (
    <header
      id="top"
      style={{
        width: '100%',
        height: stacked ? 'auto' : '100vh',
        minHeight: stacked ? 'auto' : 720,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Poppins', sans-serif",
        background: 'radial-gradient(120% 130% at 25% 10%, #2a636b 0%, #1b4e56 45%, #113b42 100%)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 70% at 78% 45%, rgba(126,216,232,0.10) 0%, rgba(126,216,232,0) 70%)', pointerEvents: 'none' }} />

      {/* Nav — fixed so it sticks across the whole page */}
      <nav style={{ position: 'fixed', top: scrolled ? 12 : 18, left: '50%', transform: 'translateX(-50%)', width: isMobile ? 'calc(100% - 40px)' : isTablet ? 'calc(100% - 64px)' : 'min(1240px, calc(100% - 96px))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: stacked ? '9px 12px 9px 18px' : '10px 14px 10px 22px', borderRadius: 999, background: scrolled ? 'rgba(255,255,255,0.92)' : 'linear-gradient(90deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))', border: scrolled ? '1px solid rgba(15,61,68,0.12)' : '1px solid rgba(255,255,255,0.16)', backdropFilter: 'blur(14px)', boxShadow: scrolled ? '0 12px 34px rgba(0,20,24,0.16)' : '0 10px 30px rgba(0,20,24,0.25)', zIndex: 100, transition: 'top .35s ease, width .35s ease, box-shadow .35s ease, background .35s ease, border-color .35s ease' }}>
        <a href="#top" aria-label="DermaScope.ai home" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.webp" alt="DermaScope.ai" style={{ height: isMobile ? 28 : 34, width: 'auto', display: 'block', filter: scrolled ? 'none' : 'brightness(0) invert(1)', transition: 'filter .35s ease' }} />
        </a>

        {/* Desktop inline links */}
        {!stacked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 14.5 }}>
            {navItems.map((l, i) => (
              <a key={l.href} href={l.href} className="ds-hnav-link" style={{ ...navLink, color: i === 0 ? (scrolled ? '#0f3d44' : '#ffffff') : linkColor, fontWeight: i === 0 ? 500 : 400 }}>{l.label}</a>
            ))}
          </div>
        )}

        {!stacked && (
          <a href="#demo" className="ds-hbtn" style={{ background: 'linear-gradient(90deg, #007176, #17C7CC)', color: '#ffffff', fontWeight: 600, fontSize: 14.5, padding: '11px 22px', borderRadius: 999, boxShadow: '0 6px 18px rgba(0,20,24,0.30)', textDecoration: 'none' }}>Join Early Access</a>
        )}

        {/* Mobile / tablet hamburger */}
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
                  background: scrolled ? '#0f3d44' : '#ffffff',
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

      {/* Fullscreen mobile menu overlay */}
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
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="ds-hnav-link" style={{ color: '#eaf7f9', fontSize: 20, fontWeight: 600, textDecoration: 'none' }}>{l.label}</a>
          ))}
          <a href="#demo" onClick={() => setMenuOpen(false)} className="ds-hbtn" style={{ marginTop: 8, background: 'linear-gradient(90deg, #007176, #17C7CC)', color: '#ffffff', fontWeight: 700, fontSize: 16, padding: '14px 34px', borderRadius: 999, textDecoration: 'none' }}>Join Early Access</a>
        </div>
      )}

      {/* Spacer reserving the fixed nav's footprint so hero content clears it */}
      <div style={{ flex: '0 0 auto', height: stacked ? 84 : 76 }} aria-hidden="true" />

      {/* Hero body */}
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          width: isMobile ? 'calc(100% - 40px)' : isTablet ? 'calc(100% - 64px)' : 'min(1240px, calc(100% - 96px))',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: stacked ? '1fr' : 'minmax(480px, 46%) 1fr',
          alignItems: 'center',
          gap: stacked ? 34 : 24,
          padding: stacked ? '18px 0 40px' : 0,
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: stacked ? 'center' : 'flex-start', textAlign: stacked ? 'center' : 'left', gap: stacked ? 18 : 22, padding: '8px 0' }}>
          <SectionSubtitle label="Physician-supervised clinical AI" tone="dark" style={{ marginBottom: 0 }} />
          <h1 style={{ margin: 0, fontSize: isMobile ? 'clamp(30px, 8.5vw, 42px)' : 'clamp(38px, 3.6vw, 58px)', lineHeight: 1.12, fontWeight: 800, letterSpacing: '-0.5px', color: '#ffffff', textWrap: 'balance' }}>
            When Every Detail Matters,<br />
            <span style={{ color: '#7fd8e8' }}>AI Sees More.</span><br />
            Physicians Decide.
          </h1>
          <p style={{ margin: 0, maxWidth: 560, fontSize: 'clamp(15px, 1.05vw, 17px)', lineHeight: 1.75, color: 'rgba(230,245,248,0.82)', textWrap: 'pretty' }}>
            From everyday dermatology to the most challenging and complex skin conditions, DermaScope.ai transforms clinical images into actionable intelligence&mdash;helping physicians detect critical visual patterns, prioritize high-risk findings, and make more informed clinical decisions.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: stacked ? 'center' : 'flex-start', flexWrap: 'wrap', gap: isMobile ? 14 : 22, marginTop: 4 }}>
            <a href="#demo" className="ds-hbtn" style={{ background: 'linear-gradient(90deg, #007176, #17C7CC)', color: '#ffffff', fontWeight: 600, fontSize: 15.5, padding: '15px 32px', borderRadius: 999, boxShadow: '0 10px 28px rgba(0,20,24,0.35)', textDecoration: 'none' }}>Join Early Access</a>
            <a href="#how" className="ds-hsecondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: '#eaf7f9', fontWeight: 600, fontSize: 15.5, textDecoration: 'none' }}>
              <span className="ds-hplay" style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.25)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="16" viewBox="0 0 14 16" fill="none"><path d="M1 1.8v12.4c0 .8.9 1.3 1.6.9l10-6.2c.6-.4.6-1.4 0-1.8l-10-6.2C1.9.5 1 1 1 1.8z" fill="#7fd8e8" /></svg>
              </span>
              How It Works
            </a>
          </div>
        </div>

        {/* Right: mockup + orbit + floating cards */}
        <div style={{ position: 'relative', height: stacked ? 'auto' : '100%', minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: stacked ? 26 : 0 }}>
          {showOrbit && !stacked && (
            <>
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: '78vh', height: '78vh', maxWidth: 720, maxHeight: 720, border: '1.5px dashed rgba(158,224,236,0.35)', borderRadius: '50%', animation: 'orbitSpin 60s linear infinite' }}>
                <OrbitDot angle={20} />
                <OrbitDot angle={150} />
                <OrbitDot angle={265} />
              </div>
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: '58vh', height: '58vh', maxWidth: 540, maxHeight: 540, border: '1px dashed rgba(158,224,236,0.22)', borderRadius: '50%', animation: 'orbitSpin 45s linear infinite reverse' }}>
                <OrbitDot angle={80} />
                <OrbitDot angle={230} />
              </div>
            </>
          )}

          <img
            src="/hero-mockup.png"
            alt="DermaScope capture angles app screen"
            style={
              stacked
                ? { width: isMobile ? 'min(300px, 82vw)' : 'min(440px, 62vw)', height: 'auto', maxWidth: '100%', position: 'relative', zIndex: 2, filter: 'drop-shadow(0 30px 46px rgba(0,15,18,0.45))' }
                : { height: '96%', maxHeight: 780, width: 'auto', position: 'relative', zIndex: 2, filter: 'drop-shadow(0 40px 60px rgba(0,15,18,0.45))' }
            }
          />

          {stacked ? (
            /* Static wrapped row of stat cards below the mockup */
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, width: '100%', maxWidth: 620 }}>
              {statCards.map((c) => (
                <div key={c.key} style={{ ...card, position: 'static', animation: 'none', alignItems: 'center', maxWidth: 260, flex: '1 1 240px', padding: '14px 18px' }}>
                  <span style={iconWrap}>{c.icon}</span>
                  {c.body}
                </div>
              ))}
            </div>
          ) : (
            statCards.map((c) => (
              <div key={c.key} style={{ ...card, ...c.pos, animation: floatFor(c.float) }}>
                <span style={iconWrap}>{c.icon}</span>
                {c.body}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Trusted by */}
      <div style={{ flex: '0 0 auto', position: 'relative', zIndex: 10, padding: '14px 0 22px', borderTop: '1px solid rgba(255,255,255,0.10)', background: 'rgba(9,38,43,0.35)', backdropFilter: 'blur(6px)' }}>
        <div style={{ textAlign: 'center', fontSize: 12, letterSpacing: 3.5, fontWeight: 600, color: 'rgba(214,238,242,0.65)', textTransform: 'uppercase', marginBottom: 12, padding: '0 16px' }}>Trusted by leading clinics &amp; institutions</div>
        <div style={{ overflow: 'hidden', position: 'relative', WebkitMaskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)', maskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)' }}>
          <div style={{ display: 'flex', gap: isMobile ? 56 : 110, width: 'max-content', alignItems: 'center', animation: `marquee ${marqueeSpeed}s linear infinite` }}>
            {marqueeLogos.map((logo, i) => (
              <span key={i} style={{ fontSize: isMobile ? 16 : 21, fontWeight: 700, color: 'rgba(222,242,246,0.55)', whiteSpace: 'nowrap' }}>{logo}</span>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
