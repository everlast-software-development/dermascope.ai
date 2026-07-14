import { useState } from 'react'
import { Camera, ScanFace, Focus } from 'lucide-react'
import Reveal from './Reveal'
import SectionSubtitle from './SectionSubtitle'
import DisplayCards from './ui/DisplayCards'
import {
  angleWhy,
  aiFeatures,
  confidenceTags,
  workflowOutputs,
  monitoringTags,
} from '../data'

// The three standardized capture angles, shown as the Display Cards stack.
const angleCards = [
  {
    icon: <Camera size={22} strokeWidth={1.75} />,
    title: '90° Frontal View',
    description:
      'Direct frontal capture for lesion size, color distribution, and anatomical localization.',
    accent: true,
  },
  {
    icon: <ScanFace size={22} strokeWidth={1.75} />,
    title: '75° Oblique View',
    description:
      'Provides depth perception and lesion border visibility for improved AI interpretation.',
  },
  {
    icon: <Focus size={22} strokeWidth={1.75} />,
    title: '40° Side View',
    description:
      'Captures elevation, contours, and surface texture that may not appear in frontal images.',
  },
]

const section = { background: '#FFFFFF', padding: '110px 48px 40px', scrollMarginTop: 70 }

const numberStyle = {
  fontSize: 56,
  fontWeight: 800,
  color: '#DCECEF',
  lineHeight: 1,
  marginBottom: 14,
}
const h3Style = {
  margin: '0 0 16px',
  fontSize: 31,
  fontWeight: 700,
  letterSpacing: '-0.015em',
  color: '#1B4754',
}
const bodyStyle = { fontSize: 16.5, lineHeight: 1.7, color: '#7A8B92' }
const dashedBox = {
  borderRadius: 24,
  border: '1px dashed #BFDDE4',
  background: 'repeating-linear-gradient(45deg,#EAF5F8 0 14px,#F5FBFD 14px 28px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
const mono = { fontFamily: 'ui-monospace,SFMono-Regular,monospace', fontSize: 13, color: '#7A8B92' }

function Check({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15.5, color: '#2F4148' }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(76,143,136,0.14)',
          color: '#4C8F88',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        ✓
      </span>
      {children}
    </div>
  )
}

// Dot-prefixed list item used for the AI-features and monitoring chips.
function DotItem({ children }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: '#2F4148' }}>
      <span
        style={{ width: 6, height: 6, borderRadius: '50%', background: '#4C8F88', flexShrink: 0 }}
      />
      {children}
    </span>
  )
}

function AngleFeature() {
  return (
    <Reveal style={{ marginBottom: 120 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 72, alignItems: 'center' }}>
        <div>
          <div style={numberStyle}>01</div>
          <h3 style={h3Style}>Multi-Angle Clinical Imaging</h3>
          <p style={{ margin: '0 0 14px', ...bodyStyle }}>
            Capture 3 standardized images from 90°, 75°, and 40° to provide a more complete clinical
            view of the affected area.
          </p>
          <p style={{ margin: '0 0 32px', ...bodyStyle }}>
            Each angle contributes unique visual information that helps the AI generate more reliable
            clinical insights.
          </p>
          <div style={{ display: 'grid', gap: 14, borderTop: '1px solid #DCECEF', paddingTop: 26 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#7A8B92',
              }}
            >
              Why Multiple Angles Matter
            </div>
            {angleWhy.map((w) => (
              <Check key={w}>{w}</Check>
            ))}
          </div>
        </div>

        {/* Right-side visualization: stacked Display Cards over a framed backdrop */}
        <div className="ds-dc-frame">
          <DisplayCards cards={angleCards} />
        </div>
      </div>
    </Reveal>
  )
}

function BeforeAfter() {
  const [slider, setSlider] = useState(56)

  return (
    <Reveal
      style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 0.9fr',
        gap: 72,
        alignItems: 'center',
        marginBottom: 110,
      }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '4/3',
          borderRadius: 24,
          overflow: 'hidden',
          border: '1px solid #DCECEF',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(45deg,#D9EFF4 0 14px,#EAF7FA 14px 28px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ ...mono, fontSize: 12.5, color: '#5F7880' }}>[ follow-up visit — after ]</span>
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(45deg,#EAF5F8 0 14px,#F5FBFD 14px 28px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            clipPath: `inset(0 ${100 - slider}% 0 0)`,
          }}
        >
          <span style={{ ...mono, fontSize: 12.5 }}>[ baseline visit — before ]</span>
        </div>
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 3,
            background: '#285F66',
            left: `${slider}%`,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${slider}%`,
            transform: 'translate(-50%,-50%)',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#285F66',
            color: '#A5E7F8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 6px 18px rgba(27,71,84,0.4)',
            pointerEvents: 'none',
          }}
        >
          ⇔
        </div>
        <span
          style={{
            position: 'absolute',
            top: 14,
            left: 16,
            background: 'rgba(27,71,84,0.85)',
            color: '#FFFFFF',
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            borderRadius: 999,
            padding: '5px 12px',
            pointerEvents: 'none',
          }}
        >
          BEFORE
        </span>
        <span
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            background: 'rgba(76,143,136,0.9)',
            color: '#FFFFFF',
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            borderRadius: 999,
            padding: '5px 12px',
            pointerEvents: 'none',
          }}
        >
          AFTER
        </span>
        <input
          type="range"
          min={4}
          max={96}
          value={slider}
          onChange={(e) => setSlider(Number(e.target.value))}
          aria-label="Compare before and after"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'ew-resize',
            margin: 0,
          }}
        />
      </div>

      <div>
        <div style={numberStyle}>05</div>
        <h3 style={h3Style}>Longitudinal Patient Monitoring</h3>
        <p style={{ margin: '0 0 26px', ...bodyStyle }}>
          Track clinical changes over time using standardized imaging and AI-assisted comparisons.
          Monitor:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', maxWidth: 520 }}>
          {monitoringTags.map((t) => (
            <DotItem key={t}>{t}</DotItem>
          ))}
        </div>
      </div>
    </Reveal>
  )
}

export default function WhyDermaScope() {
  return (
    <section id="why" style={section}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ maxWidth: 860, margin: '0 auto 90px', textAlign: 'center' }}>
          <SectionSubtitle label="Why DermaScope.ai" tone="light" />
          <h2
            style={{
              margin: '0 0 22px',
              fontSize: 'clamp(34px,3.4vw,50px)',
              lineHeight: 1.12,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#1B4754',
            }}
          >
            More Clinical Insight. Greater Confidence. Better Patient Care.
          </h2>
          <p style={{ margin: 0, fontSize: 17.5, lineHeight: 1.7, color: '#7A8B92' }}>
            DermaScope.ai combines standardized clinical imaging with advanced AI analysis to support
            healthcare professionals in evaluating 300+ skin conditions, improving assessment
            consistency, reducing documentation time, and enabling objective longitudinal follow-up.
          </p>
        </Reveal>

        {/* 01 — Multi-angle imaging */}
        <AngleFeature />

        {/* 02 — AI Skin Intelligence */}
        <Reveal
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: 72,
            alignItems: 'center',
            marginBottom: 120,
          }}
        >
          <div style={{ aspectRatio: '4/3', ...dashedBox }}>
            <span style={mono}>[ AI analysis — feature detection overlay ]</span>
          </div>
          <div>
            <div style={numberStyle}>02</div>
            <h3 style={h3Style}>AI Skin Intelligence</h3>
            <p style={{ margin: '0 0 24px', ...bodyStyle }}>
              Designed to assist clinicians in evaluating more than 300 skin conditions, the AI
              analyzes clinically relevant image features including:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 24 }}>
              {aiFeatures.map((f) => (
                <DotItem key={f}>{f}</DotItem>
              ))}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 15.5,
                lineHeight: 1.65,
                color: '#2F4148',
                borderLeft: '3px solid #A5E7F8',
                paddingLeft: 16,
              }}
            >
              The platform generates structured clinical insights to support assessment and
              differential diagnosis—not replace physician expertise.
            </p>
          </div>
        </Reveal>

        {/* 03 — High confidence */}
        <Reveal
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 88,
            alignItems: 'center',
            marginBottom: 120,
            background: 'linear-gradient(140deg,#F5FBFD,#F0FAFD)',
            border: '1px solid #DCECEF',
            borderRadius: 28,
            padding: '64px 80px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 'clamp(96px,10vw,150px)',
                fontWeight: 800,
                lineHeight: 0.95,
                letterSpacing: '-0.04em',
                background: 'linear-gradient(140deg,#285F66,#4C8F88 60%,#6BB8CB)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              95%
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#7A8B92', marginTop: 10 }}>
              image analysis accuracy, up&nbsp;to
            </div>
          </div>
          <div>
            <div style={numberStyle}>03</div>
            <h3 style={h3Style}>High-Confidence AI Support</h3>
            <p style={{ margin: '0 0 22px', maxWidth: 620, ...bodyStyle }}>
              DermaScope.ai delivers up to 95% image analysis accuracy across supported AI workflows
              validated under controlled testing conditions. Every AI-generated result is:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
              {confidenceTags.map((t) => (
                <span
                  key={t}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#FFFFFF',
                    border: '1px solid #DCECEF',
                    borderRadius: 999,
                    padding: '9px 18px',
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: '#1B4754',
                  }}
                >
                  <span style={{ color: '#4C8F88' }}>✓</span>
                  {t}
                </span>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: '#285F66' }}>
              Clinical decisions always remain with the healthcare professional.
            </p>
          </div>
        </Reveal>

        {/* 04 — Structured workflow */}
        <Reveal
          style={{
            display: 'grid',
            gridTemplateColumns: '0.9fr 1.1fr',
            gap: 72,
            alignItems: 'center',
            marginBottom: 120,
          }}
        >
          <div>
            <div style={numberStyle}>04</div>
            <h3 style={h3Style}>Structured Clinical Workflow</h3>
            <p style={{ margin: '0 0 26px', ...bodyStyle }}>
              Transform images into actionable clinical intelligence within minutes. Generate:
            </p>
            <div style={{ display: 'grid', gap: 13 }}>
              {workflowOutputs.map((o, i) => (
                <div
                  key={o}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 16,
                    color: '#2F4148',
                    borderBottom: i < workflowOutputs.length - 1 ? '1px solid #DCECEF' : 'none',
                    paddingBottom: i < workflowOutputs.length - 1 ? 13 : 0,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(76,143,136,0.14)',
                      color: '#4C8F88',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                  {o}
                </div>
              ))}
            </div>
          </div>
          <div style={{ aspectRatio: '4/3', ...dashedBox }}>
            <span style={mono}>[ structured clinical report screenshot ]</span>
          </div>
        </Reveal>

        {/* 05 — Longitudinal monitoring */}
        <BeforeAfter />
      </div>
    </section>
  )
}
