import { useEffect, useRef, useState } from 'react'

// Gates mounting (and therefore the underlying dynamic import()) until the
// wrapper scrolls near the viewport. Plain React.lazy() alone starts fetching
// as soon as the tree first renders it, regardless of scroll position — this
// adds a real viewport check so below-the-fold chunks don't compete with the
// hero's critical rendering path on initial load.

// A deep link (/#early-access) has to reach a section that viewport gating would
// never mount: while the visitor sits at the top of a cold load, the target is
// far outside the observer's band, so it stays unmounted and there is nothing to
// scroll to. Captured once at boot so later in-page anchor clicks don't trip it.
const DEEP_LINKED = typeof window !== 'undefined' && window.location.hash.length > 1

export default function LazyMount({ children, rootMargin = '800px 0px' }) {
  // Deep-linked loads trade the first-paint saving for actually being able to
  // reach the anchor; plain "/" entries keep the full optimization.
  const [visible, setVisible] = useState(DEEP_LINKED)
  const ref = useRef(null)

  useEffect(() => {
    if (visible) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, rootMargin])

  return <div ref={ref}>{visible ? children : null}</div>
}
