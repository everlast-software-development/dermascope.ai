import * as React from 'react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useResponsive } from '../../hooks/useResponsive'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const cn = (...classes) => classes.filter(Boolean).join(' ')

// -------------------------------------------------------------------------
// Theme-adaptive scoped styles. Tokens are mapped to the DermaScope palette
// so the glass/aurora/grid effects read on the brand's dark teal.
// -------------------------------------------------------------------------
const STYLES = `
.cinematic-footer-wrapper {
  font-family: 'Outfit', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;

  --foreground: #F1F8FA;
  --background: #10303A;
  --primary: #4C8F88;
  --secondary: #285F66;
  --accent: #A5E7F8;
  --destructive: #FF6B6B;
  --border: rgba(213,230,235,0.16);
  --muted-foreground: rgba(213,230,235,0.66);

  --pill-bg-1: color-mix(in oklch, var(--foreground) 4%, transparent);
  --pill-bg-2: color-mix(in oklch, var(--foreground) 1%, transparent);
  --pill-shadow: color-mix(in oklch, var(--background) 50%, transparent);
  --pill-highlight: color-mix(in oklch, var(--foreground) 10%, transparent);
  --pill-inset-shadow: color-mix(in oklch, var(--background) 80%, transparent);
  --pill-border: color-mix(in oklch, var(--foreground) 10%, transparent);

  --pill-bg-1-hover: color-mix(in oklch, var(--foreground) 10%, transparent);
  --pill-bg-2-hover: color-mix(in oklch, var(--foreground) 2%, transparent);
  --pill-border-hover: color-mix(in oklch, var(--accent) 45%, transparent);
  --pill-shadow-hover: color-mix(in oklch, var(--background) 70%, transparent);
  --pill-highlight-hover: color-mix(in oklch, var(--foreground) 20%, transparent);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
}
@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px color-mix(in oklch, var(--destructive) 50%, transparent)); }
  15%, 45% { transform: scale(1.2); filter: drop-shadow(0 0 10px color-mix(in oklch, var(--destructive) 80%, transparent)); }
  30% { transform: scale(1); }
}

.animate-footer-breathe { animation: footer-breathe 8s ease-in-out infinite alternate; }
.animate-footer-heartbeat { animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite; }

.footer-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in oklch, var(--primary) 22%, transparent) 0%,
    color-mix(in oklch, var(--accent) 16%, transparent) 40%,
    transparent 70%
  );
}

.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow:
    0 10px 30px -10px var(--pill-shadow),
    inset 0 1px 1px var(--pill-highlight),
    inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow:
    0 20px 40px -10px var(--pill-shadow-hover),
    inset 0 1px 1px var(--pill-highlight-hover);
  color: var(--foreground);
}

.footer-giant-bg-text {
  font-size: 26vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in oklch, var(--foreground) 6%, transparent);
  background: linear-gradient(180deg, color-mix(in oklch, var(--foreground) 10%, transparent) 0%, transparent 60%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  background: linear-gradient(180deg, var(--foreground) 0%, color-mix(in oklch, var(--foreground) 40%, transparent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 20px color-mix(in oklch, var(--accent) 20%, transparent));
}

.footer-pill-primary { padding: 18px 40px; font-size: 15.5px; }
.footer-pill-secondary { padding: 12px 24px; font-size: 13.5px; }

/* Social media row — circular glassmorphism buttons with a cyan hover glow */
.footer-social {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.footer-social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: background 300ms ease, color 300ms ease, transform 300ms ease, box-shadow 300ms ease, border-color 300ms ease;
}
.footer-social-link:hover,
.footer-social-link:focus-visible {
  background: #0ECAD0;
  border-color: #0ECAD0;
  color: #FFFFFF;
  transform: scale(1.08);
  box-shadow: 0 0 20px rgba(14, 202, 208, 0.35);
  outline: none;
}
@media (max-width: 640px) {
  .footer-social-link {
    width: 44px;
    height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-footer-breathe,
  .animate-footer-heartbeat { animation: none; }
}
`

// -------------------------------------------------------------------------
// Magnetic button primitive (GSAP-driven pointer follow + 3D tilt)
// -------------------------------------------------------------------------
const MagneticButton = React.forwardRef(function MagneticButton(
  { className, children, as: Component = 'button', ...props },
  forwardedRef,
) {
  const localRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const element = localRef.current
    if (!element) return
    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const ctx = gsap.context(() => {
      const handleMouseMove = (e) => {
        const rect = element.getBoundingClientRect()
        const h = rect.width / 2
        const w = rect.height / 2
        const x = e.clientX - rect.left - h
        const y = e.clientY - rect.top - w
        gsap.to(element, {
          x: x * 0.4,
          y: y * 0.4,
          rotationX: -y * 0.15,
          rotationY: x * 0.15,
          scale: 1.05,
          ease: 'power2.out',
          duration: 0.4,
        })
      }
      const handleMouseLeave = () => {
        gsap.to(element, {
          x: 0,
          y: 0,
          rotationX: 0,
          rotationY: 0,
          scale: 1,
          ease: 'elastic.out(1, 0.3)',
          duration: 1.2,
        })
      }
      element.addEventListener('mousemove', handleMouseMove)
      element.addEventListener('mouseleave', handleMouseLeave)
      return () => {
        element.removeEventListener('mousemove', handleMouseMove)
        element.removeEventListener('mouseleave', handleMouseLeave)
      }
    }, element)

    return () => ctx.revert()
  }, [])

  return (
    <Component
      ref={(node) => {
        localRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }}
      className={cn('footer-glass-pill', className)}
      style={{ cursor: 'pointer' }}
      {...props}
    >
      {children}
    </Component>
  )
})

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------
const pillLink = {
  borderRadius: 999,
  color: '#F1F8FA',
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 12,
  textDecoration: 'none',
}
const secondaryPill = {
  borderRadius: 999,
  color: 'rgba(213,230,235,0.66)',
  fontWeight: 500,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
}

export default function CinematicFooter() {
  const wrapperRef = useRef(null)
  const giantTextRef = useRef(null)
  const headingRef = useRef(null)
  const linksRef = useRef(null)
  const { isMobile, isTablet } = useResponsive()

  useEffect(() => {
    if (typeof window === 'undefined' || !wrapperRef.current) return
    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        giantTextRef.current,
        { y: '10vh', scale: 0.8, opacity: 0 },
        {
          y: '0vh',
          scale: 1,
          opacity: 1,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: 'top 80%',
            end: 'bottom bottom',
            scrub: 1,
          },
        },
      )
      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: 'top 40%',
            end: 'bottom bottom',
            scrub: 1,
          },
        },
      )
    }, wrapperRef)

    return () => ctx.revert()
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Curtain-reveal wrapper: clip-path contains the fixed footer to this box. */}
      <div
        ref={wrapperRef}
        style={{
          position: 'relative',
          height: '100vh',
          width: '100%',
          clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)',
        }}
      >
        <footer
          className="cinematic-footer-wrapper"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            display: 'flex',
            /* start below the sticky header */
            height: 'calc(100vh - 60px)',
            width: '100%',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            background: '#10303A',
            color: '#F1F8FA',
          }}
        >
          {/* Ambient aurora + grid */}
          <div
            className="footer-aurora animate-footer-breathe"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              height: '60vh',
              width: '80vw',
              transform: 'translate(-50%,-50%)',
              borderRadius: '50%',
              filter: 'blur(80px)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <div
            className="footer-bg-grid"
            style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
          />

          {/* Giant background wordmark */}
          <div
            ref={giantTextRef}
            className="footer-giant-bg-text"
            style={{
              position: 'absolute',
              bottom: '-5vh',
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              zIndex: 0,
              pointerEvents: 'none',
              userSelect: 'none',
              ...(isMobile ? { fontSize: '22vw' } : isTablet ? { fontSize: '24vw' } : null),
            }}
          >
            DERMASCOPE
          </div>

          {/* Center content */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isMobile ? '0 16px' : '0 24px',
              width: '100%',
              maxWidth: 1024,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <h2
              ref={headingRef}
              className="footer-text-glow"
              style={{
                fontSize: 'clamp(48px,7vw,96px)',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                marginBottom: isMobile ? 28 : isTablet ? 40 : 48,
                textAlign: 'center',
              }}
            >
              Ready to see more?
            </h2>

            <div
              ref={linksRef}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
                <MagneticButton as="a" href="#" className="footer-pill-primary" style={pillLink}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(213,230,235,0.7)' }}>
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.56.04 2.87.67 3.55 1.76-3.13 1.77-2.62 5.92.35 7.14-.65 1.58-1.57 3.1-2.57 4.03zm-3.21-14.7c-.55 1.4-1.89 2.37-3.25 2.28.09-1.5 1.05-2.82 2.38-3.4 1.25-.57 2.66-.41 3.25.04-.15.35-.26.72-.38 1.08z" />
                  </svg>
                  Download iOS
                </MagneticButton>
                <MagneticButton as="a" href="#" className="footer-pill-primary" style={pillLink}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(213,230,235,0.7)' }}>
                    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0222 3.503C15.5902 8.242 13.8533 7.85 12 7.85c-1.8533 0-3.5902.392-5.1369 1.1004L4.841 5.4475a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3436-4.1021-2.6893-7.5743-6.1185-9.4396" />
                  </svg>
                  Download Android
                </MagneticButton>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8 }}>
                <MagneticButton as={Link} to="/privacy-policy" className="footer-pill-secondary" style={secondaryPill}>
                  Privacy Policy
                </MagneticButton>
                <MagneticButton as={Link} to="/delete-account" className="footer-pill-secondary" style={secondaryPill}>
                  Delete Account
                </MagneticButton>
              </div>

              {/* Social media */}
              <nav aria-label="DermaScope.ai social media" className="footer-social" style={{ marginTop: 4 }}>
                <a href="#" aria-label="DermaScope.ai on TikTok" className="footer-social-link">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </a>
                <a href="#" aria-label="DermaScope.ai on Instagram" className="footer-social-link">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a href="#" aria-label="DermaScope.ai on Facebook" className="footer-social-link">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a href="#" aria-label="DermaScope.ai on Snapchat" className="footer-social-link">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.196.031-.39.31-.463.68l-.076.359c-.074.28-.239.51-.51.51h-.061c-.135 0-.329-.031-.6-.075-.404-.075-.959-.149-1.633-.149-.404 0-.809.029-1.229.104-.803.135-1.484.606-2.229 1.121-.914.641-1.859 1.291-3.298 1.291-.045 0-.104-.014-.149-.014h-.135c-1.44 0-2.371-.65-3.284-1.276-.744-.514-1.426-.984-2.229-1.12-.42-.075-.824-.104-1.229-.104-.674 0-1.229.089-1.633.149-.271.044-.465.075-.6.075h-.061c-.271 0-.436-.23-.51-.51l-.075-.359c-.075-.371-.27-.65-.465-.68-1.873-.283-2.906-.703-3.146-1.271-.03-.076-.045-.15-.045-.225-.014-.24.166-.465.42-.509 3.264-.54 4.732-3.879 4.791-4.014l.016-.015c.181-.345.21-.645.12-.869-.196-.449-.884-.674-1.334-.809-.135-.045-.255-.09-.344-.119-.83-.32-1.219-.706-1.213-1.156.015-.396.301-.706.75-.855.135-.06.302-.089.492-.089.121 0 .3.015.465.104.375.181.734.285 1.034.301.196 0 .326-.045.401-.09-.008-.166-.019-.331-.031-.51l-.003-.06c-.104-1.629-.229-3.654.3-4.847C7.858 1.069 11.215.793 12.206.793z" />
                  </svg>
                </a>
              </nav>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              position: 'relative',
              zIndex: 20,
              width: '100%',
              paddingBottom: isMobile ? 24 : 32,
              paddingLeft: isMobile ? 20 : isTablet ? 32 : 48,
              paddingRight: isMobile ? 20 : isTablet ? 32 : 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMobile ? 'center' : 'space-between',
              gap: isMobile ? 16 : 24,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: 420, width: isMobile ? '100%' : undefined, textAlign: isMobile ? 'center' : 'left' }}>
              <div
                style={{
                  color: 'rgba(213,230,235,0.66)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                © 2026 DermaScope.ai — All rights reserved.
              </div>
              <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.5, color: 'rgba(213,230,235,0.5)' }}>
                AI outputs are intended to support — not replace — clinical judgment. Every final
                clinical decision remains in human hands.
              </div>
            </div>

            <div
              className="footer-glass-pill"
              style={{
                padding: '12px 24px',
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'default',
              }}
            >
              <span style={{ color: 'rgba(213,230,235,0.66)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                Crafted with
              </span>
              <span className="animate-footer-heartbeat" style={{ fontSize: 15, color: '#FF6B6B' }}>❤</span>
              <span style={{ color: 'rgba(213,230,235,0.66)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                by
              </span>
              <span style={{ color: '#F1F8FA', fontWeight: 900, fontSize: 12.5, marginLeft: 4 }}>Human Studio Labs</span>
            </div>

            <MagneticButton
              as="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(213,230,235,0.66)',
                border: 'none',
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </MagneticButton>
          </div>
        </footer>
      </div>
    </>
  )
}
