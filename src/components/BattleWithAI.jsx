import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import SectionSubtitle from './SectionSubtitle'
import { dermCases } from '../data'
import { useResponsive } from '../hooks/useResponsive'

const section = {
  position: 'relative',
  background: 'linear-gradient(165deg,#1B4754,#20525F 60%,#255862)',
  padding: '110px 48px',
  overflow: 'hidden',
  scrollMarginTop: 70,
}

const analysisSteps = [
  'Segmenting lesion region',
  'Analyzing borders, symmetry & texture',
  'Evaluating pigmentation & vascular patterns',
  'Matching against 300+ conditions',
]

const LETTERS = ['A', 'B', 'C', 'D']

// Pick the initial case once, at module scope, so it stays stable across
// StrictMode's double-invoke of the component initializer.
const INITIAL_CASE = Math.floor(Math.random() * dermCases.length)

export default function BattleWithAI() {
  const { isMobile, isTablet } = useResponsive()
  const [caseIdx, setCaseIdx] = useState(INITIAL_CASE)
  const [selected, setSelected] = useState(-1)
  const [phase, setPhase] = useState('pick') // 'pick' | 'ai' | 'res'
  const [aiProg, setAiProg] = useState(0)
  const [youScore, setYouScore] = useState(0)
  const [aiScore, setAiScore] = useState(0)

  const timerRef = useRef(null)
  const scoredRef = useRef(false) // guards the one-time score increment
  useEffect(() => () => clearInterval(timerRef.current), [])

  const c = dermCases[caseIdx]
  const hasPick = selected >= 0

  // Settle the round once the analysis bar fills. Keeping the score update in
  // an effect (not inside the setAiProg updater) means it stays a pure updater
  // and the increment can't double-fire under StrictMode; scoredRef is a belt.
  useEffect(() => {
    if (phase === 'ai' && aiProg >= 100 && !scoredRef.current) {
      scoredRef.current = true
      clearInterval(timerRef.current)
      setPhase('res')
      setAiScore((s) => s + 1)
      setYouScore((s) => s + (selected === c.answer ? 1 : 0))
    }
  }, [phase, aiProg, selected, c.answer])

  const pick = (i) => {
    if (phase !== 'pick') return
    setSelected(i)
  }

  const runAi = () => {
    if (selected < 0 || phase !== 'pick') return
    scoredRef.current = false
    setPhase('ai')
    setAiProg(0)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setAiProg((p) => Math.min(100, p + 2.4))
    }, 65)
  }

  const nextCase = () => {
    setCaseIdx((idx) => (idx + 1 + Math.floor(Math.random() * (dermCases.length - 1))) % dermCases.length)
    setSelected(-1)
    setPhase('pick')
    setAiProg(0)
  }

  const won = selected === c.answer

  // Per-choice styling — mirrors the original's phase-dependent states.
  const choiceStyles = (i) => {
    const sel = i === selected
    const correct = i === c.answer
    const res = phase === 'res'
    let bd = 'rgba(213,230,235,0.25)',
      bg = 'rgba(255,255,255,0.04)',
      color = '#D5E6EB',
      bbg = 'rgba(213,230,235,0.12)',
      bc = '#D5E6EB',
      mark = '',
      markColor = '#A5E7F8'
    if (!res && sel) {
      bd = '#A5E7F8'
      bg = 'rgba(165,231,248,0.12)'
      color = '#FFFFFF'
      bbg = '#A5E7F8'
      bc = '#12333B'
      mark = 'Your pick'
    }
    if (res && correct) {
      bd = '#4C8F88'
      bg = 'rgba(76,143,136,0.22)'
      color = '#FFFFFF'
      bbg = '#4C8F88'
      bc = '#FFFFFF'
      mark = sel ? '✓ Correct — your pick' : '✓ Correct'
    }
    if (res && sel && !correct) {
      bd = '#D84A4A'
      bg = 'rgba(216,74,74,0.14)'
      color = '#FFFFFF'
      bbg = '#D84A4A'
      bc = '#FFFFFF'
      mark = '✗ Your pick'
      markColor = '#F09B9B'
    }
    return { bd, bg, color, bbg, bc, mark, markColor }
  }

  return (
    <section
      id="battle"
      style={{
        ...section,
        padding: isMobile ? '64px 20px' : isTablet ? '80px 32px' : section.padding,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -160,
          right: -140,
          width: isMobile ? 300 : 520,
          height: isMobile ? 300 : 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(165,231,248,0.14),transparent 65%)',
        }}
      />
      <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto' }}>
        <Reveal
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: isMobile ? 20 : isTablet ? 32 : 48,
            marginBottom: isMobile ? 32 : isTablet ? 42 : 56,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: 680 }}>
            <SectionSubtitle label="Live Battle with AI" tone="dark" />
            <h2
              style={{
                margin: '0 0 18px',
                fontSize: 'clamp(34px,3.4vw,50px)',
                lineHeight: 1.12,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#FFFFFF',
              }}
            >
              Can You Beat the AI on <span style={{ color: '#A5E7F8' }}>Hard Cases?</span>
            </h2>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: '#D5E6EB' }}>
              Ten of dermatology's trickiest look-alikes. Pick your diagnosis first — then watch
              DermaScope.ai analyze the same case, live.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                border: '1px solid rgba(165,231,248,0.35)',
                background: 'rgba(165,231,248,0.08)',
                borderRadius: 999,
                padding: '11px 22px',
                fontSize: 15,
                fontWeight: 600,
                color: '#FFFFFF',
              }}
            >
              You&nbsp;
              <span style={{ color: '#A5E7F8', fontSize: 19, fontWeight: 700 }}>{youScore}</span>
              <span style={{ color: 'rgba(213,230,235,0.5)' }}>·</span>
              DermaScope AI&nbsp;
              <span style={{ color: '#A5E7F8', fontSize: 19, fontWeight: 700 }}>{aiScore}</span>
            </div>
          </div>
        </Reveal>

        <Reveal
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile || isTablet ? '1fr' : '0.9fr 1.1fr',
            gap: isMobile ? 28 : isTablet ? 36 : 64,
            alignItems: 'start',
          }}
        >
          {/* Case image */}
          <div
            style={{
              position: 'relative',
              aspectRatio: '1/1',
              width: '100%',
              maxWidth: isMobile ? 360 : isTablet ? 460 : '100%',
              margin: isMobile || isTablet ? '0 auto' : undefined,
              borderRadius: 24,
              overflow: 'hidden',
              border: '1px dashed rgba(165,231,248,0.3)',
              background:
                'repeating-linear-gradient(45deg,rgba(165,231,248,0.07) 0 14px,rgba(165,231,248,0.02) 14px 28px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'ui-monospace,SFMono-Regular,monospace',
                fontSize: 13,
                color: '#D5E6EB',
                padding: '0 32px',
                textAlign: 'center',
              }}
            >
              {c.img}
            </span>
            <span
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                background: 'rgba(27,71,84,0.9)',
                border: '1px solid rgba(165,231,248,0.3)',
                color: '#D5E6EB',
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 999,
                padding: '7px 15px',
              }}
            >
              {c.hint}
            </span>
          </div>

          {/* Question + choices */}
          <div>
            <p
              style={{
                margin: '0 0 24px',
                fontSize: isMobile ? 18 : 20,
                lineHeight: 1.55,
                fontWeight: 500,
                color: '#FFFFFF',
              }}
            >
              {c.title}
            </p>
            <div style={{ display: 'grid', gap: 11 }}>
              {c.opts.map((opt, i) => {
                const s = choiceStyles(i)
                return (
                  <button
                    key={opt}
                    onClick={() => pick(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      width: '100%',
                      textAlign: 'left',
                      cursor: phase === 'pick' ? 'pointer' : 'default',
                      borderRadius: 14,
                      padding: '13px 18px',
                      fontSize: 15.5,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      transition: 'all .3s',
                      border: `1.5px solid ${s.bd}`,
                      background: s.bg,
                      color: s.color,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                        transition: 'all .3s',
                        background: s.bbg,
                        color: s.bc,
                      }}
                    >
                      {LETTERS[i]}
                    </span>
                    <span style={{ flex: 1 }}>{opt}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: s.markColor }}>{s.mark}</span>
                  </button>
                )
              })}
            </div>

            <div style={{ marginTop: 24 }}>
              {phase === 'pick' && (
                <>
                  <button
                    onClick={runAi}
                    style={{
                      width: '100%',
                      border: 'none',
                      fontFamily: 'inherit',
                      fontSize: 16,
                      fontWeight: 700,
                      padding: '15px 24px',
                      borderRadius: 999,
                      transition: 'all .3s',
                      cursor: hasPick ? 'pointer' : 'not-allowed',
                      background: hasPick ? '#A5E7F8' : 'rgba(213,230,235,0.14)',
                      color: hasPick ? '#12333B' : 'rgba(213,230,235,0.55)',
                    }}
                  >
                    Run AI Check ✦
                  </button>
                  <p
                    style={{
                      margin: '12px 0 0',
                      fontSize: 13,
                      color: 'rgba(213,230,235,0.65)',
                      textAlign: 'center',
                    }}
                  >
                    {hasPick
                      ? 'Locked in. Run the AI check to see how you compare.'
                      : 'Pick your diagnosis first — then challenge the AI.'}
                  </p>
                </>
              )}

              {phase === 'ai' && (
                <div
                  style={{
                    border: '1px solid rgba(165,231,248,0.3)',
                    background: 'rgba(165,231,248,0.05)',
                    borderRadius: 18,
                    padding: isMobile ? '20px 18px' : '24px 26px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#A5E7F8',
                      marginBottom: 18,
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: '#A5E7F8',
                        animation: 'dsPulse 1.2s ease-in-out infinite',
                      }}
                    />
                    DermaScope.ai is analyzing…
                  </div>
                  <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                    {analysisSteps.map((label, i) => (
                      <div
                        key={label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          fontSize: 14.5,
                          color: '#D5E6EB',
                          transition: 'opacity .4s',
                          opacity: aiProg >= (i + 1) * 22 ? 1 : 0.25,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#A5E7F8',
                            flexShrink: 0,
                          }}
                        />
                        {label}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 999,
                      background: 'rgba(213,230,235,0.15)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 999,
                        background: '#A5E7F8',
                        width: `${Math.min(100, aiProg)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {phase === 'res' && (
                <div
                  style={{
                    border: '1px solid rgba(165,231,248,0.3)',
                    background: 'rgba(165,231,248,0.05)',
                    borderRadius: 18,
                    padding: isMobile ? '20px 18px' : '26px 28px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: won ? '#A5E7F8' : '#E8B64A',
                      }}
                    >
                      {won ? 'You matched the AI — well spotted' : 'The AI saw it differently'}
                    </div>
                  </div>
                  <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 14 }}>
                    AI diagnosis: <span style={{ color: '#A5E7F8' }}>{c.opts[c.answer]}</span>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: 14.5, lineHeight: 1.65, color: '#D5E6EB' }}>
                    <span style={{ fontWeight: 700, color: '#FFFFFF' }}>Why: </span>
                    {c.why}
                  </p>
                  <p style={{ margin: '0 0 18px', fontSize: 14.5, lineHeight: 1.65, color: '#D5E6EB' }}>
                    <span style={{ fontWeight: 700, color: '#FFFFFF' }}>Why not the others: </span>
                    {c.whyNot}
                  </p>
                  <div
                    style={{
                      borderTop: '1px solid rgba(213,230,235,0.18)',
                      paddingTop: 14,
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'rgba(213,230,235,0.6)',
                        marginBottom: 9,
                      }}
                    >
                      References
                    </div>
                    <div style={{ display: 'grid', gap: 7 }}>
                      {c.refs.map((r) => (
                        <div
                          key={r}
                          style={{
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: 'rgba(213,230,235,0.85)',
                            fontStyle: 'italic',
                          }}
                        >
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={nextCase}
                    className="ds-pill-cta"
                    style={{
                      width: '100%',
                      border: 'none',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      background: '#A5E7F8',
                      color: '#12333B',
                      fontSize: 16,
                      fontWeight: 700,
                      padding: '14px 24px',
                      borderRadius: 999,
                    }}
                  >
                    Next Case →
                  </button>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        <p
          style={{
            margin: isMobile ? '32px 0 0' : '48px 0 0',
            textAlign: 'center',
            fontSize: 12.5,
            color: 'rgba(213,230,235,0.6)',
          }}
        >
          Illustrative interactive demo with mock cases — not medical advice. AI supports, physicians
          decide.
        </p>
      </div>
    </section>
  )
}
