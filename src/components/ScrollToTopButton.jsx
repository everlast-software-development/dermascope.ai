import { useEffect, useState } from 'react'
import './ScrollToTopButton.css'

// Reveal once the reader is ~400px down, hide again as they come back near the
// top. Two thresholds instead of one so the button can't flicker in/out while
// the viewport hovers around the trigger point.
const SHOW_AT = 400
const HIDE_AT = 200

// Site-wide scroll-to-top FAB. Mounted once at the router level (main.jsx) so
// it rides above every route — it deliberately does NOT live in the footer.
export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      if (frame) return // coalesce bursts of scroll events into one rAF tick
      frame = requestAnimationFrame(() => {
        frame = 0
        const y = window.scrollY
        setVisible((v) => (v ? y > HIDE_AT : y > SHOW_AT))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const scrollToTop = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <div className={`ds-scrolltop${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className="ds-scrolltop-btn"
        // Skipped by the tab order while faded out, so keyboard users never
        // land on an invisible control.
        tabIndex={visible ? 0 : -1}
      >
        <svg className="ds-scrolltop-icon" width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </div>
  )
}
