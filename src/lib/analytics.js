import ReactGA from 'react-ga4'

// Google Analytics 4 measurement ID for the public marketing site.
const MEASUREMENT_ID = 'G-BBNCG8H64D'

let initialized = false
let lastTrackedPage = null

// Starts GA4. Safe to call more than once — only the first call has any
// effect, so components don't need to coordinate who's responsible for
// initialization (guards against React StrictMode's double-invoked effects
// in development as well).
export function initAnalytics() {
  if (initialized) return
  if (typeof window === 'undefined') return
  ReactGA.initialize(MEASUREMENT_ID)
  initialized = true
}

// Records a pageview. Defaults to the current URL, so route-change listeners
// can call it with no arguments. Repeat calls for the same path (e.g. a
// StrictMode double-effect firing back to back) are collapsed into one hit.
export function trackPageView(path) {
  if (!initialized) return
  const page = path ?? `${window.location.pathname}${window.location.search}`
  if (page === lastTrackedPage) return
  lastTrackedPage = page
  ReactGA.send({ hitType: 'pageview', page })
}

// Records a custom event. `category`/`action` are required; `label` is an
// optional third dimension (e.g. which surface a button lives on).
export function trackEvent(category, action, label) {
  if (!initialized) return
  if (!category || !action) return
  ReactGA.event({
    category,
    action,
    ...(label ? { label } : {}),
  })
}
