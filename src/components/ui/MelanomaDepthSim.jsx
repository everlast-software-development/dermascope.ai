import { useMemo, useState } from 'react'

// Interactive Breslow-depth melanoma simulation used as the "02 — AI Skin
// Intelligence" visual. Drag the slider to grow the simulated tumour through the
// skin layers; staging + clinical implication update live. Educational only.

const stageInfo = (d) => {
  if (d <= 0) return { label: 'In situ (Stage 0)', bg: '#e2f4f0', color: '#1d7a6e', note: 'Confined to epidermis — surgical excision usually curative.' }
  if (d <= 1) return { label: 'T1 · Stage I', bg: '#e3f2f7', color: '#1e6f8a', note: 'Thin melanoma — wide local excision; sentinel node biopsy considered from 0.8 mm.' }
  if (d <= 2) return { label: 'T2 · Stage I–II', bg: '#fdf3dd', color: '#9a6b12', note: 'Intermediate thickness — wide excision plus sentinel lymph node biopsy.' }
  if (d <= 4) return { label: 'T3 · Stage II', bg: '#fdeadd', color: '#a3541c', note: 'Thicker melanoma — excision with wider margins; nodal staging and imaging.' }
  return { label: 'T4 · Stage II–III', bg: '#fbe3e3', color: '#a32626', note: 'Deep invasion — multidisciplinary care; adjuvant therapy often discussed.' }
}

function makePools() {
  let s = 42
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296)
  const nests = Array.from({ length: 85 }, () => {
    const cy = rand() * 293 + 4
    const spread = 55 + cy * 0.55
    const cx = Math.min(468, Math.max(12, 240 + (rand() - 0.5) * 2 * spread))
    const rx = 2.6 + rand() * 5.8
    const ry = rx * 0.77
    const o = 0.55 + rand() * 0.4
    return { cx, cy, rx, ry, fill: `hsl(${(322 + rand() * 28).toFixed(1)}, 55%, 14%)`, o, icx: cx - rx * 0.28, icy: cy - ry * 0.3, irx: rx * 0.32, iry: ry * 0.29, io: o * 0.6 }
  })
  const sats = Array.from({ length: 8 }, () => ({ dx: (rand() - 0.5) * 24, dy: rand() * 12, r: 1.4 + rand() * 0.9 }))
  return { nests, sats }
}

const layerLabel = {
  position: 'absolute', left: 0, right: 0, display: 'flex', padding: '0 12px',
  fontSize: 10, fontWeight: 600, color: 'rgba(18,51,58,0.7)', pointerEvents: 'none',
}
const pill = { borderRadius: 5, background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(3px)', padding: '2px 7px' }
const pillNum = { ...pill, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }

export default function MelanomaDepthSim() {
  const [depth, setDepth] = useState(0)
  const pools = useMemo(makePools, [])
  const d = depth
  const stage = stageInfo(d)
  const y = d * 60
  const w = 36 + d * 9.6
  const domeS = 1 + d / 5
  const tumorPath = d > 0
    ? `M ${240 - w} 2.4 C ${240 - w * 1.1} ${y * 0.45}, ${240 - w * 0.34} ${y * 0.98}, 240 ${y} C ${240 + w * 0.34} ${y * 0.98}, ${240 + w * 1.1} ${y * 0.45}, ${240 + w} 2.4 Z`
    : ''
  const nests = d > 0 ? pools.nests.filter((n) => n.cy < y - 2) : []
  const sats = d >= 4 ? pools.sats.map((sp) => ({ cx: 240 + sp.dx, cy: y - sp.dy, r: sp.r })) : []

  return (
    <div style={{ borderRadius: 20, border: '1px solid #dfeef1', background: '#ffffff', boxShadow: '0 16px 40px rgba(16,55,62,0.08)', padding: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 1.8, color: '#7a8b92', fontWeight: 500 }}>Simulated Breslow depth</p>
          <p style={{ margin: '4px 0 0', fontSize: 38, fontWeight: 700, letterSpacing: '-0.5px', color: '#12333a', fontVariantNumeric: 'tabular-nums' }}>
            {d.toFixed(2)} <span style={{ fontSize: 19, color: '#7a8b92', fontWeight: 500 }}>mm</span>
          </p>
        </div>
        <span style={{ borderRadius: 999, padding: '6px 14px', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, background: stage.bg, color: stage.color, whiteSpace: 'nowrap' }}>{stage.label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input type="range" min="0" max="5" step="0.05" value={depth} onChange={(e) => setDepth(parseFloat(e.target.value))} aria-label="Simulated melanoma depth in millimeters" style={{ width: '100%', accentColor: '#1e8a97', cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#7a8b92', fontVariantNumeric: 'tabular-nums' }}>
          <span>0 mm · in situ</span><span>1 mm</span><span>2 mm</span><span>3 mm</span><span>4 mm</span><span>5+ mm</span>
        </div>
      </div>
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: 14, border: '1px solid #dfeef1', height: 300 }}>
        <svg viewBox="0 0 480 300" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="ds-epi" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#fef3c7" /><stop offset="100%" stopColor="#fcd9b6" /></linearGradient>
            <linearGradient id="ds-pap" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#fcd9b6" /><stop offset="100%" stopColor="#f5c19a" /></linearGradient>
            <linearGradient id="ds-ret" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#f0b591" /><stop offset="100%" stopColor="#e8a07a" /></linearGradient>
            <linearGradient id="ds-fat" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#facfb1" /><stop offset="100%" stopColor="#f5dcc0" /></linearGradient>
            <radialGradient id="ds-dome" cx="0.5" cy="0.8" r="0.6"><stop offset="0%" stopColor="#3a1a14" /><stop offset="60%" stopColor="#1f0a08" /><stop offset="100%" stopColor="#120504" /></radialGradient>
            <radialGradient id="ds-tumor" cx="0.5" cy="0" r="1"><stop offset="0%" stopColor="#3d1410" stopOpacity="0.95" /><stop offset="60%" stopColor="#1c0807" stopOpacity="0.9" /><stop offset="100%" stopColor="#0c0303" stopOpacity="0.85" /></radialGradient>
            <pattern id="ds-coll" width="14" height="6" patternUnits="userSpaceOnUse"><path d="M0 3 Q 3.5 0 7 3 T 14 3" stroke="#c47a55" strokeWidth="0.5" fill="none" opacity="0.35" /></pattern>
            <pattern id="ds-fatp" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="5" fill="#fff3e0" stroke="#e3b48a" strokeWidth="0.7" /><circle cx="16" cy="14" r="6" fill="#fff3e0" stroke="#e3b48a" strokeWidth="0.7" /></pattern>
          </defs>
          <rect x="0" y="0" width="480" height="6" fill="url(#ds-epi)" />
          <rect x="0" y="6" width="480" height="24" fill="url(#ds-pap)" />
          <rect x="0" y="30" width="480" height="150" fill="url(#ds-ret)" />
          <rect x="0" y="180" width="480" height="120" fill="url(#ds-fat)" />
          <rect x="0" y="6" width="480" height="174" fill="url(#ds-coll)" />
          <rect x="0" y="180" width="480" height="120" fill="url(#ds-fatp)" opacity="0.55" />
          <line x1="0" y1="6" x2="480" y2="6" stroke="#a45a3a" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.6" />
          {tumorPath && <path d={tumorPath} fill="url(#ds-tumor)" opacity="0.92" />}
          <ellipse cx="240" cy={-4.8 * domeS} rx={38.4 * domeS} ry={32 * domeS} fill="url(#ds-dome)" />
          <ellipse cx="240" cy="3.3" rx={w} ry="3.3" fill="#2a0e0a" opacity="0.85" />
          {nests.map((n, i) => (
            <g key={i}>
              <ellipse cx={n.cx} cy={n.cy} rx={n.rx} ry={n.ry} fill={n.fill} opacity={n.o} />
              <ellipse cx={n.icx} cy={n.icy} rx={n.irx} ry={n.iry} fill="#000" opacity={n.io} />
            </g>
          ))}
          {sats.map((sp, i) => (
            <circle key={i} cx={sp.cx} cy={sp.cy} r={sp.r} fill="#1a0606" opacity="0.85" />
          ))}
          <line x1="0" y1={y} x2="480" y2={y} stroke="#d64545" strokeWidth="1.5" strokeDasharray="5 3" />
        </svg>
        <div style={{ ...layerLabel, top: 3, alignItems: 'flex-start' }}><span style={pill}>Epidermis</span><span style={pillNum}>0.1 mm</span></div>
        <div style={{ ...layerLabel, top: 26, alignItems: 'flex-start' }}><span style={pill}>Papillary dermis</span><span style={pillNum}>0.4 mm</span></div>
        <div style={{ ...layerLabel, top: 30, height: 150, alignItems: 'center' }}><span style={pill}>Reticular dermis</span><span style={pillNum}>2.5 mm</span></div>
        <div style={{ ...layerLabel, top: 180, height: 120, alignItems: 'center' }}><span style={pill}>Subcutaneous fat</span><span style={pillNum}>2.0 mm</span></div>
        <span style={{ position: 'absolute', right: 10, top: y, transform: 'translateY(-50%)', borderRadius: 6, background: '#d64545', padding: '3px 9px', fontSize: 10, fontWeight: 700, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>{d.toFixed(2)} mm</span>
      </div>
      <div style={{ borderRadius: 12, background: '#ecf6f8', padding: '14px 16px' }}>
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: '#1e8a97' }}>Clinical implication</p>
        <p style={{ margin: '5px 0 0', fontSize: 14, lineHeight: 1.55, color: '#2f4148' }}>{stage.note}</p>
      </div>
      <p style={{ margin: 0, fontSize: 10.5, lineHeight: 1.5, color: '#7a8b92' }}>Educational simulation. Real staging requires histopathology and is performed by a qualified dermatologist or oncologist.</p>
    </div>
  )
}
