import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import EarlyAccessForm from './EarlyAccessForm'
import SectionSubtitle from './SectionSubtitle'
import { useResponsive } from '../hooks/useResponsive'

// Persistent glass CTA (left, vertically centered on desktop/tablet; bottom-center
// on phones) that opens the existing Join Early Access form inside a right-side
// sliding drawer. The form itself is the shared EarlyAccessForm — no duplication.
export default function FloatingEarlyAccess() {
  const [open, setOpen] = useState(false)
  const { isMobile, isTablet } = useResponsive()

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Close on Escape + lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  const drawerWidth = isMobile
    ? 'min(420px, 92vw)'
    : isTablet
      ? 'min(440px, 78vw)'
      : 'min(468px, 92vw)'

  return (
    <>
      {/* ── Floating CTA ─────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          // Above page content, but below the Hero's fixed nav (100) and its
          // fullscreen mobile menu overlay (90) so those still cover the pill.
          zIndex: 80,
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
          transition: 'opacity .25s ease',
          ...(isMobile ? { left: 20, bottom: 18 } : { left: 20, bottom: 24 }),
        }}
      >
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Join Early Access"
          className="ds-floating-cta"
          initial={false}
          animate={
            reduce
              ? undefined
              : {
                  y: [0, -6, 0],
                  boxShadow: [
                    '0 12px 30px -6px rgba(14,202,208,0.42), 0 6px 18px rgba(0,20,24,0.28), inset 0 1px 0 rgba(255,255,255,0.4)',
                    '0 18px 42px -6px rgba(14,202,208,0.7), 0 6px 18px rgba(0,20,24,0.28), inset 0 1px 0 rgba(255,255,255,0.5)',
                    '0 12px 30px -6px rgba(14,202,208,0.42), 0 6px 18px rgba(0,20,24,0.28), inset 0 1px 0 rgba(255,255,255,0.4)',
                  ],
                }
          }
          transition={reduce ? undefined : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: isMobile ? '12px 20px' : '14px 22px',
            borderRadius: 999,
            border: 'none',
            background:
              'linear-gradient(135deg, rgba(26,75,83,0.94) 0%, rgba(20,110,124,0.92) 45%, rgba(14,202,208,0.94) 100%)',
            backdropFilter: 'blur(14px) saturate(160%)',
            WebkitBackdropFilter: 'blur(14px) saturate(160%)',
            boxShadow:
              '0 12px 30px -6px rgba(14,202,208,0.42), 0 6px 18px rgba(0,20,24,0.28), inset 0 1px 0 rgba(255,255,255,0.4)',
            color: '#FFFFFF',
            fontFamily: 'inherit',
            fontWeight: 700,
            fontSize: isMobile ? 14 : 14.5,
            letterSpacing: '0.01em',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Sparkles size={18} strokeWidth={2} />
          Join Early Access
        </motion.button>
      </div>

      {/* ── Drawer ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="ea-backdrop"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 300,
                background: 'rgba(9,30,34,0.5)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            />

            <motion.aside
              key="ea-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Join Early Access"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                zIndex: 310,
                height: '100dvh',
                width: drawerWidth,
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'Poppins', sans-serif",
                background:
                  'linear-gradient(160deg, rgba(255,255,255,0.97) 0%, rgba(240,250,253,0.95) 100%)',
                backdropFilter: 'blur(22px) saturate(160%)',
                WebkitBackdropFilter: 'blur(22px) saturate(160%)',
                borderLeft: '1px solid rgba(255,255,255,0.6)',
                borderTopLeftRadius: 28,
                borderBottomLeftRadius: 28,
                boxShadow: '-34px 0 90px -24px rgba(9,30,34,0.55)',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  flex: '0 0 auto',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: isMobile ? '26px 22px 10px' : '32px 32px 12px',
                }}
              >
                <div>
                  <SectionSubtitle label="Get Started" tone="light" style={{ marginBottom: 12 }} />
                  <h2
                    style={{
                      margin: '0 0 8px',
                      fontSize: isMobile ? 25 : 28,
                      lineHeight: 1.15,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      color: '#1B4754',
                    }}
                  >
                    Join Early Access
                  </h2>
                  <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: '#7A8B92' }}>
                    Tell us a little about you — our clinical team will reach out shortly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="ds-ea-close"
                  style={{
                    flex: '0 0 auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    marginTop: 2,
                    borderRadius: '50%',
                    border: '1px solid rgba(40,95,102,0.16)',
                    background: 'rgba(255,255,255,0.7)',
                    color: '#285F66',
                    cursor: 'pointer',
                    transition: 'background .25s ease, transform .25s ease, color .25s ease',
                  }}
                >
                  <X size={19} strokeWidth={2.2} />
                </button>
              </div>

              {/* Scrollable form body */}
              <div
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  padding: isMobile ? '10px 22px 30px' : '12px 32px 36px',
                }}
              >
                <EarlyAccessForm onSuccess={() => {}} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
