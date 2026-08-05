import React, { lazy, Suspense, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import App from './App.jsx'
import { registerWebMcpTools } from './lib/webmcp.js'
import { initAnalytics, trackPageView } from './lib/analytics.js'
import './index.css'

// Secondary routes are only ever needed after a navigation, so they're kept
// out of the homepage's initial bundle and fetched on demand.
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'))
const DeleteAccount = lazy(() => import('./pages/DeleteAccount.jsx'))
const OperatorLogin = lazy(() => import('./pages/OperatorLogin.jsx'))
const OperatorClaim = lazy(() => import('./pages/OperatorClaim.jsx'))

registerWebMcpTools()
initAnalytics()

// Fires a GA4 pageview on the initial load and on every client-side route
// change. Lives inside <BrowserRouter> so it can read the current location,
// but outside <Routes> so one instance covers every route without each page
// needing its own tracking call.
function AnalyticsListener() {
  const location = useLocation()
  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`)
  }, [location.pathname, location.search])
  return null
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AnalyticsListener />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/delete-account" element={<DeleteAccount />} />
          <Route path="/login" element={<OperatorLogin />} />
          <Route path="/claim" element={<OperatorClaim />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
