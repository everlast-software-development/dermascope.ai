import { useState } from 'react'
import Reveal from './Reveal'
import SectionSubtitle from './SectionSubtitle'
import { personas } from '../data'

const section = { background: '#FFFFFF', padding: '110px 48px 120px', scrollMarginTop: 70 }

const colLabel = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: 18,
}
const listItem = { display: 'flex', gap: 12, fontSize: 15.5, lineHeight: 1.55, color: '#2F4148' }

export default function WhoItsFor() {
  const [persona, setPersona] = useState(0)
  const p = personas[persona]

  return (
    <section id="who" style={section}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ maxWidth: 760, marginBottom: 64 }}>
          <SectionSubtitle label="Who Is DermaScope.ai Built For?" tone="light" />
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(34px,3.4vw,50px)',
              lineHeight: 1.12,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#1B4754',
            }}
          >
            One Intelligent Platform. Multiple Clinical Workflows.
          </h2>
        </Reveal>

        <Reveal style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 64, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 6, position: 'sticky', top: 96 }}>
            {personas.map((opt, i) => (
              <button
                key={opt.tab}
                onClick={() => setPersona(i)}
                style={{
                  textAlign: 'left',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  borderRadius: 14,
                  padding: '15px 20px',
                  fontSize: 16.5,
                  fontWeight: 600,
                  transition: 'all .3s',
                  background: i === persona ? '#1B4754' : 'transparent',
                  color: i === persona ? '#FFFFFF' : '#2F4148',
                }}
              >
                {opt.tab}
              </button>
            ))}
          </div>

          <div style={{ minHeight: 480, borderLeft: '1px solid #DCECEF', paddingLeft: 64 }}>
            <h3 style={{ margin: '0 0 34px', fontSize: 27, fontWeight: 700, color: '#1B4754' }}>
              {p.heading}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
              <div>
                <div style={{ ...colLabel, color: '#7A8B92' }}>Challenges</div>
                <div style={{ display: 'grid', gap: 14 }}>
                  {p.challenges.map((c) => (
                    <div key={c} style={listItem}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#E8B64A',
                          flexShrink: 0,
                          marginTop: 7,
                        }}
                      />
                      {c}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ ...colLabel, color: '#4C8F88' }}>How DermaScope.ai Helps</div>
                <div style={{ display: 'grid', gap: 14 }}>
                  {p.helps.map((h) => (
                    <div key={h} style={listItem}>
                      <span style={{ color: '#4C8F88', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {h}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
