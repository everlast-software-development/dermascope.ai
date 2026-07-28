import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import DeleteAccount from './pages/DeleteAccount.jsx'
import OperatorLogin from './pages/OperatorLogin.jsx'
import OperatorClaim from './pages/OperatorClaim.jsx'
import { registerWebMcpTools } from './lib/webmcp.js'
import './index.css'

registerWebMcpTools()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/delete-account" element={<DeleteAccount />} />
        <Route path="/login" element={<OperatorLogin />} />
        <Route path="/claim" element={<OperatorClaim />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
