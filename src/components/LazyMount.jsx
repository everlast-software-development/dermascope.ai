import { useEffect, useRef, useState } from 'react'

// Gates mounting (and therefore the underlying dynamic import()) until the
// wrapper scrolls near the viewport. Plain React.lazy() alone starts fetching
// as soon as the tree first renders it, regardless of scroll position — this
// adds a real viewport check so below-the-fold chunks don't compete with the
// hero's critical rendering path on initial load.
export default function LazyMount({ children, rootMargin = '800px 0px' }) {
  const [visible, setVisible] = useState(false)
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
