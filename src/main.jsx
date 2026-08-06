import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import { registerWebMcpTools } from './lib/webmcp.js'
import './index.css'

// Secondary routes are only ever needed after a navigation, so they're kept
// out of the homepage's initial bundle and fetched on demand.
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'))
const DeleteAccount = lazy(() => import('./pages/DeleteAccount.jsx'))
const OperatorLogin = lazy(() => import('./pages/OperatorLogin.jsx'))
const OperatorClaim = lazy(() => import('./pages/OperatorClaim.jsx'))

registerWebMcpTools()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
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
