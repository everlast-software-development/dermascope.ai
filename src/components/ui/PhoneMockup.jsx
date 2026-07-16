import { useResponsive } from '../../hooks/useResponsive'

// Reusable iPhone mockup. Internal proportions are fixed for a 264px frame, so
// scale the whole thing with a CSS transform when a much larger size is needed.
// Frame finishes — 'graphite' (default) and 'teal' (teal titanium).
const FRAMES = {
  graphite: 'linear-gradient(160deg,#4d585f,#20272b 42%,#39434a)',
  teal: 'linear-gradient(160deg,#6ba0a4,#20454a 44%,#457e83)',
}

export default function PhoneMockup({
  alt = 'DermaScope.ai app',
  width = 264,
  glow = true,
  src = '/phone-report.png',
  frame = 'graphite',
}) {
  const { isMobile, isTablet } = useResponsive()
  // Cap the fixed-px frame so it can never exceed a narrow parent; desktop keeps
  // its exact fixed width (maxWidth stays undefined above 1024px).
  const capWidth = isMobile || isTablet

  return (
    <div style={{ position: 'relative', maxWidth: capWidth ? '100%' : undefined }}>
      {glow && (
        <div
          style={{
            position: 'absolute',
            inset: -50,
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(165,231,248,0.28),transparent 68%)',
            filter: 'blur(14px)',
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          width,
          maxWidth: capWidth ? '100%' : undefined,
          borderRadius: 58,
          padding: 11,
          background: FRAMES[frame] || FRAMES.graphite,
          boxShadow: '0 44px 90px rgba(8,26,32,0.6),inset 0 0 2px rgba(255,255,255,0.5)',
        }}
      >
        <div style={{ position: 'absolute', left: -2, top: 118, width: 3, height: 30, borderRadius: 2, background: '#161c20' }} />
        <div style={{ position: 'absolute', left: -2, top: 164, width: 3, height: 52, borderRadius: 2, background: '#161c20' }} />
        <div style={{ position: 'absolute', left: -2, top: 226, width: 3, height: 52, borderRadius: 2, background: '#161c20' }} />
        <div style={{ position: 'absolute', right: -2, top: 180, width: 3, height: 76, borderRadius: 2, background: '#161c20' }} />
        <div style={{ borderRadius: 48, overflow: 'hidden', background: '#000' }}>
          <img src={src} alt={alt} style={{ width: '100%', display: 'block' }} />
        </div>
      </div>
    </div>
  )
}
