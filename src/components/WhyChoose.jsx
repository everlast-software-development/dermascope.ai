import { Check } from 'lucide-react'
import Reveal from './Reveal'
import { whyChoose } from '../data'
import { useResponsive } from '../hooks/useResponsive'
import './WhyChoose.css'

const section = { background: 'linear-gradient(180deg,#F5FBFD,#F0FAFD)', padding: '88px 48px' }

// Content mapped from the existing whyChoose benefits (copy unchanged).
// [0] 300+ conditions · [1] multi-angle · [2] 95% accuracy · [3] explainable
// · [4] standardized docs · [5] before/after monitoring
const card1Items = [whyChoose[0], whyChoose[1], whyChoose[4], whyChoose[5]]
const professions = [
  'Dermatologists',
  'GPs',
  'Plastic surgeons',
  'Researchers',
  'Residents',
  'Healthcare organizations',
]

const cardBase = {
  borderRadius: 26,
  background: 'linear-gradient(160deg,#FFFFFF 0%,#F5FBFD 100%)',
  display: 'flex',
  flexDirection: 'column',
}
const cardTitle = {
  margin: 0,
  fontSize: 19,
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: '#1B4754',
}
const accentLine = {
  display: 'block',
  width: 34,
  height: 3,
  borderRadius: 2,
  marginTop: 12,
  marginBottom: 22,
  background: 'linear-gradient(90deg,#007176,#17C7CC)',
}

function CheckItem({ children, isMobile }) {
  return (
    <div
      className="ds-trust-row"
      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: isMobile ? 15 : 15.5, lineHeight: 1.5, color: '#2F4148' }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 23,
          height: 23,
          flexShrink: 0,
          marginTop: 1,
          borderRadius: '50%',
          background: 'rgba(76,143,136,0.14)',
          color: '#3E8A82',
        }}
      >
        <Check size={13} strokeWidth={3} />
      </span>
      {children}
    </div>
  )
}

export default function WhyChoose() {
  const { isMobile, isTablet } = useResponsive()
  const cols = isMobile ? 1 : 3
  const pad = isMobile ? '28px 24px' : '34px 30px'

  return (
    <section
      style={{
        ...section,
        padding: isMobile ? '56px 20px' : isTablet ? '70px 32px' : section.padding,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal style={{ maxWidth: 760, margin: isMobile ? '0 auto 36px' : '0 auto 56px', textAlign: 'center' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 'clamp(28px,3vw,42px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.12,
              color: '#1B4754',
            }}
          >
            Why Healthcare Professionals Choose DermaScope.ai
          </h3>
        </Reveal>

        <Reveal>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: isMobile ? 16 : 22,
              alignItems: 'stretch',
            }}
          >
            {/* Card 1 — Clinical Capabilities */}
            <div className="ds-trust-card" style={{ ...cardBase, padding: pad }}>
              <h4 style={cardTitle}>Clinical Capabilities</h4>
              <span style={accentLine} aria-hidden="true" />
              <div style={{ display: 'grid', gap: 16 }}>
                {card1Items.map((t) => (
                  <CheckItem key={t} isMobile={isMobile}>{t}</CheckItem>
                ))}
              </div>
            </div>

            {/* Card 2 — AI Performance (95% highlight) */}
            <div className="ds-trust-card" style={{ ...cardBase, padding: pad }}>
              <h4 style={cardTitle}>AI Performance</h4>
              <span style={accentLine} aria-hidden="true" />
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7A8B92', marginBottom: 2 }}>
                  Up to
                </div>
                <div
                  style={{
                    fontSize: 'clamp(56px,6vw,74px)',
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    background: 'linear-gradient(135deg,#007176,#17C7CC)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  95%
                </div>
                <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.5, color: '#5B6E74', maxWidth: 260 }}>
                  AI image analysis accuracy on supported workflows
                </div>
              </div>
              <div style={{ borderTop: '1px solid #E4EFF1', paddingTop: 20 }}>
                <CheckItem isMobile={isMobile}>{whyChoose[3]}</CheckItem>
              </div>
            </div>

            {/* Card 3 — Built For (premium text layout, no checklist) */}
            <div className="ds-trust-card" style={{ ...cardBase, padding: pad }}>
              <h4 style={cardTitle}>Built For</h4>
              <span style={accentLine} aria-hidden="true" />
              <div style={{ display: 'grid' }}>
                {professions.map((p, i) => (
                  <div
                    key={p}
                    className="ds-trust-row"
                    style={{
                      padding: '13px 0',
                      borderTop: i === 0 ? 'none' : '1px solid #E9F1F3',
                      fontSize: isMobile ? 16 : 17,
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                      color: '#1B4754',
                    }}
                  >
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full-width editorial disclaimer */}
          <p
            style={{
              margin: isMobile ? '34px auto 0' : '52px auto 0',
              maxWidth: 760,
              textAlign: 'center',
              fontSize: 12.5,
              lineHeight: 1.65,
              color: '#8A9BA1',
            }}
          >
            Performance metrics refer to supported AI image analysis workflows evaluated under
            controlled validation conditions. AI outputs are intended to support—not replace—clinical
            judgment.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
