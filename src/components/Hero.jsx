import { useEffect, useState } from 'react'
import { useResponsive } from '../hooks/useResponsive'
import SectionSubtitle from './SectionSubtitle'
import './Hero.css'

const teal = '#1e8a97'
const iconWrap = {
  width: 44, height: 44, borderRadius: '50%', background: '#ddf2f5',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
}
// Compact icon badge for the mobile 2×2 stat-card grid.
const iconWrapSm = {
  width: 36, height: 36, borderRadius: '50%', background: '#ddf2f5',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
}
const card = {
  position: 'absolute', zIndex: 3, display: 'flex', alignItems: 'center', gap: 13,
  padding: '15px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.96)',
  boxShadow: '0 18px 40px rgba(0,15,18,0.35)',
}
const navLink = { color: '#c9e4e9', textDecoration: 'none' }

// Mobile + tablet keep the desktop concept: the same four cards float at the
// phone's corners. The inner card is scaled per breakpoint so its baked-in type
// shrinks with it, and scales toward its anchoring corner so it hugs the edge
// (never overflowing the stage or colliding with the opposite card).
const floatCardBase = {
  display: 'flex', alignItems: 'center', gap: 9,
  padding: '10px 12px', borderRadius: 14,
  background: 'rgba(255,255,255,0.96)',
  boxShadow: '0 14px 32px rgba(0,15,18,0.30)',
  maxWidth: 168,
}
const floatCornerPos = {
  '300': { top: 0, left: 0, origin: 'top left', float: 'A' },
  '95': { top: 0, right: 0, origin: 'top right', float: 'B' },
  'multi': { bottom: 0, left: 0, origin: 'bottom left', float: 'B' },
  'results': { bottom: 0, right: 0, origin: 'bottom right', float: 'A' },
}

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
  const stacked = isMobile || isTablet // phones + tablets drop the desktop's full-height column

  const floatFor = (t) =>
    floatCards && !stacked ? `float${t} ${t === 'A' ? 6 : 7}s ease-in-out infinite` : 'none'

  // Mobile + tablet reuse the desktop composition: four cards floating at the
  // phone's corners, scaled to the smaller stage. Same float animation as desktop.
  const floatingCards = (scale) =>
    statCards.map((c) => {
      const p = floatCornerPos[c.key]
      return (
        <div
          key={c.key}
          style={{
            position: 'absolute',
            top: p.top,
            bottom: p.bottom,
            left: p.left,
            right: p.right,
            zIndex: 4,
            animation: floatCards ? `float${p.float} ${p.float === 'A' ? 6 : 7}s ease-in-out infinite` : 'none',
          }}
        >
          <div style={{ ...floatCardBase, transform: `scale(${scale})`, transformOrigin: p.origin }}>
            <span style={iconWrapSm}>{c.icon}</span>
            {c.body}
          </div>
        </div>
      )
    })

  // Rotating dashed rings behind the device — the desktop's orbit, sized for the stage.
  const orbitRings = (outer, inner) =>
    showOrbit ? (
      <>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: outer, height: outer, border: '1.5px dashed rgba(158,224,236,0.28)', borderRadius: '50%', animation: 'orbitSpin 60s linear infinite', pointerEvents: 'none', zIndex: 0 }}>
          <OrbitDot angle={20} />
          <OrbitDot angle={150} />
          <OrbitDot angle={265} />
        </div>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: inner, height: inner, border: '1px dashed rgba(158,224,236,0.2)', borderRadius: '50%', animation: 'orbitSpin 45s linear infinite reverse', pointerEvents: 'none', zIndex: 0 }}>
          <OrbitDot angle={80} />
          <OrbitDot angle={230} />
        </div>
      </>
    ) : null

  const logos = [
    { color: '/gents-club.png', mono: '/gents-club-mono.png', alt: 'Gents Facial Club' },
    { color: '/EWMC-Logo-1.png', mono: '/EWMC-Logo-1-mono.png', alt: 'Everlast Wellness Medical Center' },
    { color: '/alraha-logo.webp', mono: '/alraha-logo-mono.png', alt: 'Alraha Medical Center' },
    { color: '/aljameelaclub-dark-logo.webp', mono: '/aljameelaclub-dark-logo-mono.png', alt: 'Al Jameela Facial Club' },
  ]
  // Seamless marquee: the track is TWO identical halves, each the logo list
  // repeated enough to comfortably exceed any viewport. translate3d(-50%) then
  // shifts by exactly one half, so the reset lands off-screen with no gap and
  // no visible jump. Duration scales with the half width to hold a constant speed.
  const marqueeReps = 4
  const marqueeHalf = Array.from({ length: marqueeReps }, () => logos).flat()
  const marqueeLogos = [...marqueeHalf, ...marqueeHalf]
  const marqueeDuration = (marqueeSpeed * marqueeReps) / 2

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
      <div style={{ flex: '0 0 auto', height: isMobile ? 70 : isTablet ? 80 : 76 }} aria-hidden="true" />

      {/* Hero body */}
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          width: isMobile ? 'calc(100% - 40px)' : isTablet ? 'calc(100% - 64px)' : 'min(1240px, calc(100% - 96px))',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: isMobile ? 24 : isTablet ? 34 : 0,
          padding: isMobile ? '8px 0 28px' : isTablet ? '20px 0 36px' : 0,
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Copy + primary visual.
            Desktop & tablet: two columns (text | phone composition).
            Mobile: single centered column (phone composition below the copy). */}
        <div
          style={{
            display: isMobile ? 'flex' : 'grid',
            flexDirection: isMobile ? 'column' : undefined,
            gridTemplateColumns: isTablet ? '0.92fr 1.08fr' : 'minmax(480px, 46%) 1fr',
            alignItems: 'center',
            gap: isMobile ? 22 : isTablet ? 40 : 24,
            height: stacked ? 'auto' : '100%',
            minHeight: 0,
          }}
        >
          {/* Left — copy */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start', textAlign: isMobile ? 'center' : 'left', gap: isMobile ? 16 : isTablet ? 20 : 22, padding: '8px 0' }}>
            <SectionSubtitle label="Physician-supervised clinical AI" tone="dark" style={{ marginBottom: 0 }} />
            <h1 style={{ margin: 0, fontSize: isMobile ? 'clamp(28px, 8vw, 38px)' : isTablet ? 'clamp(34px, 4.6vw, 46px)' : 'clamp(38px, 3.6vw, 58px)', lineHeight: 1.12, fontWeight: 800, letterSpacing: '-0.5px', color: '#ffffff', textWrap: 'balance' }}>
              When Every Detail Matters,<br />
              <span style={{ color: '#7fd8e8' }}>AI Sees More.</span><br />
              Physicians Decide.
            </h1>
            <p style={{ margin: 0, maxWidth: 560, fontSize: 'clamp(15px, 1.05vw, 17px)', lineHeight: 1.7, color: 'rgba(230,245,248,0.82)', textWrap: 'pretty' }}>
              From everyday dermatology to the most challenging and complex skin conditions, DermaScope.ai transforms clinical images into actionable intelligence&mdash;helping physicians detect critical visual patterns, prioritize high-risk findings, and make more informed clinical decisions.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap', gap: isMobile ? 14 : 22, marginTop: 4 }}>
              <a href="#demo" className="ds-hbtn" style={{ background: 'linear-gradient(90deg, #007176, #17C7CC)', color: '#ffffff', fontWeight: 600, fontSize: 15.5, padding: '15px 32px', borderRadius: 999, boxShadow: '0 10px 28px rgba(0,20,24,0.35)', textDecoration: 'none' }}>Join Early Access</a>
              <a href="#how" className="ds-hsecondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: '#eaf7f9', fontWeight: 600, fontSize: 15.5, textDecoration: 'none' }}>
                <span className="ds-hplay" style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.25)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="16" viewBox="0 0 14 16" fill="none"><path d="M1 1.8v12.4c0 .8.9 1.3 1.6.9l10-6.2c.6-.4.6-1.4 0-1.8l-10-6.2C1.9.5 1 1 1 1.8z" fill="#7fd8e8" /></svg>
                </span>
                How It Works
              </a>
            </div>
          </div>

          {/* Right visual */}
          {!stacked ? (
            /* DESKTOP — tall mockup, orbit rings, absolutely-positioned floating cards (unchanged) */
            <div style={{ position: 'relative', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {showOrbit && (
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
                src="/hero-mockup.webp"
                alt="DermaScope capture angles app screen"
                style={{ height: '96%', maxHeight: 780, width: 'auto', position: 'relative', zIndex: 2, filter: 'drop-shadow(0 40px 60px rgba(0,15,18,0.45))' }}
              />

              {statCards.map((c) => (
                <div key={c.key} style={{ ...card, ...c.pos, animation: floatFor(c.float) }}>
                  <span style={iconWrap}>{c.icon}</span>
                  {c.body}
                </div>
              ))}
            </div>
          ) : isTablet ? (
            /* TABLET — same composition as desktop: big phone with the 4 cards floating
               at its corners + orbit rings. Larger cards than mobile. */
            <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {orbitRings('min(46vw, 420px)', 'min(35vw, 320px)')}
              <img
                src="/hero-mockup.webp"
                alt="DermaScope capture angles app screen"
                style={{ width: 'min(340px, 44vw)', height: 'auto', maxWidth: '100%', position: 'relative', zIndex: 2, filter: 'drop-shadow(0 30px 52px rgba(0,15,18,0.45))' }}
              />
              {floatingCards(0.88)}
            </div>
          ) : (
            /* MOBILE — phone is the focal point (~80vw); the 4 cards float at its corners
               + orbit rings. Same premium composition as desktop, scaled down. */
            <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {orbitRings('min(84vw, 330px)', 'min(64vw, 250px)')}
              <img
                src="/hero-mockup.webp"
                alt="DermaScope capture angles app screen"
                style={{ width: 'min(300px, 80vw)', height: 'auto', maxWidth: '100%', position: 'relative', zIndex: 2, filter: 'drop-shadow(0 26px 44px rgba(0,15,18,0.45))' }}
              />
              {floatingCards(0.7)}
            </div>
          )}
        </div>
      </div>

      {/* ── "Trusted by leading clinics & institutions" logo strip ─────────────
          TEMPORARILY DISABLED — intentionally hidden for now. Do NOT delete.
          To re-enable, simply uncomment the block below. It's a `flex: 0 0 auto`
          sibling, so keeping it commented leaves no empty space in the hero.
          (Marquee styling lives in .ds-trust-* in Hero.css; logos come from the
          `logos` array. On hover the whole band flips to a light, full-colour
          state.) */}
      {/*
      <div className="ds-trust-section" style={{ flex: '0 0 auto', position: 'relative', zIndex: 10, padding: '14px 0 22px' }}>
        <div className="ds-trust-title" style={{ textAlign: 'center', fontSize: 12, letterSpacing: 3.5, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12, padding: '0 16px' }}>Trusted by leading clinics &amp; institutions</div>
        <div style={{ overflow: 'hidden', position: 'relative', WebkitMaskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)', maskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)' }}>
          <div style={{ display: 'flex', gap: isMobile ? 56 : 110, width: 'max-content', alignItems: 'center', animation: `marquee ${marqueeDuration}s linear infinite`, willChange: 'transform', backfaceVisibility: 'hidden' }}>
            {marqueeLogos.map((logo, i) => (
              <span key={i} className="ds-trust-logo" style={{ height: isMobile ? 26 : 36, flexShrink: 0 }}>
                <img
                  src={logo.color}
                  alt={logo.alt}
                  draggable={false}
                  className="ds-trust-logo-img"
                  style={{ maxWidth: isMobile ? 118 : 164 }}
                />
                <img src={logo.mono} alt="" aria-hidden="true" draggable={false} className="ds-trust-logo-img ds-trust-logo-mono" />
              </span>
            ))}
          </div>
        </div>
      </div>
      */}
    </header>
  )
}
