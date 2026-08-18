import { useEffect } from 'react'

// Makes deep links like /#early-access land on their section on a cold first
// load, which the browser's native hash scroll cannot do here: every section
// below the hero is code-split behind LazyMount, so the target element does not
// exist yet when the browser looks for it, and the page just stays at the top.
//
// Landing there once isn't enough either — two things move the page afterwards:
//   * sections mounting above the target keep changing its offset as their
//     chunks resolve (and GSAP pinning adds spacers on top of that), and
//   * ScrollTrigger.refresh() saves the scroll position, jumps to 0 to measure,
//     then restores what it saved — so a scroll that lands mid-refresh gets
//     reverted to the stale offset.
//
// So this holds the anchor rather than firing once: it re-scrolls whenever the
// section drifts away from where it came to rest, until the position has been
// stable for `stableMs` with the document fully loaded. Any real user input
// releases it immediately, so it never fights someone scrolling on their own.
//
// Mount-only by design: in-page anchor clicks are left to the native smooth
// scrolling from `scroll-behavior: smooth` in index.css.
export function useHashScroll({ stableMs = 600, findTimeoutMs = 15000, holdTimeoutMs = 12000 } = {}) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return undefined

    // Own the scroll for this load: on a reload with a hash the browser would
    // otherwise restore its remembered offset and fight the anchor.
    const canRestore = 'scrollRestoration' in window.history
    const prevRestoration = canRestore ? window.history.scrollRestoration : null
    if (canRestore) window.history.scrollRestoration = 'manual'

    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown']
    const start = performance.now()
    let frame = 0
    // Where the section sits once scrolled into place — its own scrollMarginTop
    // for a normal page, or short of it when the page can't scroll that far.
    let restTop = null
    let firstAnchor = 0
    let lastCorrection = 0
    let released = false

    const release = () => {
      if (released) return
      released = true
      cancelAnimationFrame(frame)
      if (canRestore) window.history.scrollRestoration = prevRestoration
      events.forEach((e) => window.removeEventListener(e, release))
    }

    const tick = () => {
      if (released) return
      const el = document.getElementById(id)
      if (el) {
        const top = el.getBoundingClientRect().top
        // First sighting, or something moved us off the anchor — re-assert it.
        if (restTop === null || Math.abs(top - restTop) > 2) {
          // A deep link should land on the section, not animate down to it. An
          // explicit `behavior` also overrides the global smooth scrolling.
          el.scrollIntoView({ behavior: 'auto', block: 'start' })
          restTop = el.getBoundingClientRect().top
          lastCorrection = performance.now()
          if (!firstAnchor) firstAnchor = lastCorrection
        }
      }
      const now = performance.now()
      // Done once the anchor has held still with the document fully loaded —
      // the timeouts are only backstops for a target that never appears or a
      // page that never stops moving, not the mechanism.
      const settled =
        restTop !== null && document.readyState === 'complete' && now - lastCorrection > stableMs
      const gaveUp = firstAnchor
        ? now - firstAnchor > holdTimeoutMs
        : now - start > findTimeoutMs
      if (settled || gaveUp) release()
      else frame = requestAnimationFrame(tick)
    }

    events.forEach((e) => window.addEventListener(e, release, { passive: true }))
    frame = requestAnimationFrame(tick)

    return release
  }, [stableMs, findTimeoutMs, holdTimeoutMs])
}
