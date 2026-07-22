import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useResponsive } from '../hooks/useResponsive'

// Premium video lightbox. Opens with a soft backdrop-blur + spring-scaled panel,
// autoplays the source (playback initiated by the user's click that opened it,
// so the browser allows it), exposes native controls, and — crucially — pauses
// AND resets the video to the start whenever it closes. Closable via the ✕
// button, a backdrop click, or Escape. Body scroll is locked while open.
export default function VideoModal({ open, onClose, src = '/DermaScope.mp4', title = 'How It Works' }) {
  const { isMobile } = useResponsive()
  const videoRef = useRef(null)
  const closeRef = useRef(null)

  // Play on open; pause + reset on close (the element stays mounted through the
  // exit animation, so this reliably stops audio the instant we start closing).
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (open) {
      try { v.currentTime = 0 } catch {}
      const p = v.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } else {
      v.pause()
      try { v.currentTime = 0 } catch {}
    }
  }, [open])

  // Escape to close + lock body scroll + move focus to the close button.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = requestAnimationFrame(() => closeRef.current && closeRef.current.focus())
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      cancelAnimationFrame(t)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="video-backdrop"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} video`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 16 : 32,
            background: 'rgba(9,30,34,0.62)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            key="video-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'relative',
              width: 'min(1040px, 100%)',
              maxHeight: '86vh',
              aspectRatio: '16 / 9',
            }}
          >
            {/* Close button — above the frame on desktop, inset on mobile */}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close video"
              className="ds-ea-close"
              style={{
                position: 'absolute',
                zIndex: 2,
                top: isMobile ? 10 : -52,
                right: isMobile ? 10 : 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 42,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.28)',
                background: 'rgba(255,255,255,0.14)',
                color: '#FFFFFF',
                cursor: 'pointer',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                transition: 'background .25s ease, transform .25s ease, color .25s ease',
              }}
            >
              <X size={20} strokeWidth={2.2} />
            </button>

            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: isMobile ? 16 : 22,
                overflow: 'hidden',
                background: '#000',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 44px 120px -30px rgba(0,0,0,0.7), 0 8px 30px rgba(0,0,0,0.35)',
              }}
            >
              <video
                ref={videoRef}
                src={src}
                controls
                autoPlay
                playsInline
                preload="metadata"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#000' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
