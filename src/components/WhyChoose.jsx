import Reveal from './Reveal'
import { whyChoose } from '../data'

const section = { background: 'linear-gradient(180deg,#F5FBFD,#F0FAFD)', padding: '88px 48px' }

const rowBase = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 14,
  fontSize: 16.5,
  lineHeight: 1.5,
  color: '#2F4148',
  padding: '16px 0',
  borderTop: '1px solid #DCECEF',
}

export default function WhyChoose() {
  return (
    <section style={section}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal>
          <h3
            style={{
              margin: '0 0 40px',
              fontSize: 'clamp(26px,2.4vw,34px)',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: '#1B4754',
              maxWidth: 640,
            }}
          >
            Why Healthcare Professionals Choose DermaScope.ai
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 64px' }}>
            {whyChoose.map((c) => (
              <div key={c} style={rowBase}>
                <span style={{ color: '#4C8F88', fontWeight: 700, flexShrink: 0 }}>✔</span>
                {c}
              </div>
            ))}
            <div
              style={{
                ...rowBase,
                borderBottom: '1px solid #DCECEF',
                gridColumn: '1 / -1',
              }}
            >
              <span style={{ color: '#4C8F88', fontWeight: 700, flexShrink: 0 }}>✔</span>
              Built for dermatologists, GPs, plastic surgeons, researchers, residents, and healthcare
              organizations
            </div>
          </div>

          <p
            style={{
              margin: '26px 0 0',
              fontSize: 13.5,
              lineHeight: 1.6,
              color: '#7A8B92',
              maxWidth: 760,
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
