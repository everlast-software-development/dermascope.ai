import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Microscope,
  Stethoscope,
  Syringe,
  GraduationCap,
  Building2,
  ClipboardList,
  AlertTriangle,
  Check,
  ArrowRight,
  ArrowDown,
} from 'lucide-react'
import Reveal from './Reveal'
import SectionSubtitle from './SectionSubtitle'
import { personas } from '../data'
import { useResponsive } from '../hooks/useResponsive'
import './WhoItsFor.css'

// Premium icon + short subtitle per persona (index-aligned with `personas`).
const personaMeta = [
  { Icon: Microscope, subtitle: 'Specialist diagnostic support' },
  { Icon: Stethoscope, subtitle: 'Primary-care confidence' },
  { Icon: Syringe, subtitle: 'Outcomes & healing tracking' },
  { Icon: GraduationCap, subtitle: 'Research-ready datasets' },
  { Icon: Building2, subtitle: 'Standardized care at scale' },
  { Icon: ClipboardList, subtitle: 'Operational efficiency' },
]

const EASE = [0.22, 0.61, 0.36, 1]
const NOOP = { hidden: { opacity: 1 }, visible: { opacity: 1 } }

const section = {
  background: '#FFFFFF',
  // Subtle branded backdrop: two soft radial washes + a faint medical dot mesh.
  backgroundImage:
    'radial-gradient(90% 55% at 12% 0%, rgba(165,231,248,0.18), rgba(165,231,248,0) 55%),' +
    'radial-gradient(80% 60% at 100% 100%, rgba(76,143,136,0.12), rgba(76,143,136,0) 55%),' +
    'radial-gradient(rgba(40,95,102,0.05) 1px, transparent 1.6px)',
  backgroundSize: 'auto, auto, 26px 26px',
  scrollMarginTop: 70,
}

const labelBase = { fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }

export default function WhoItsFor() {
  const [persona, setPersona] = useState(0)
  const p = personas[persona]
  const { isMobile, isTablet } = useResponsive()
  const reduce = useReducedMotion()

  // ── Entrance orchestration ────────────────────────────────────────────
  // Pairs stagger down the list; inside each pair the challenge enters first,
  // then the connector draws, then the solution — reading as a workflow.
  const flowWrap = { hidden: {}, visible: { transition: { staggerChildren: reduce ? 0 : 0.14, delayChildren: reduce ? 0 : 0.08 } } }
  const pairV = { hidden: {}, visible: { transition: { staggerChildren: reduce ? 0 : 0.09 } } }
  const connWrap = { hidden: {}, visible: { transition: { staggerChildren: reduce ? 0 : 0.05 } } }
  const cIn = reduce
    ? NOOP
    : isMobile
      ? { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } } }
      : { hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0, transition: { duration: 0.34, ease: EASE } } }
  const sIn = reduce
    ? NOOP
    : isMobile
      ? { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } } }
      : { hidden: { opacity: 0, x: 16 }, visible: { opacity: 1, x: 0, transition: { duration: 0.34, ease: EASE } } }
  const lineV = reduce
    ? NOOP
    : isMobile
      ? { hidden: { scaleY: 0, opacity: 0 }, visible: { scaleY: 1, opacity: 1, transition: { duration: 0.3, ease: EASE } } }
      : { hidden: { scaleX: 0, opacity: 0 }, visible: { scaleX: 1, opacity: 1, transition: { duration: 0.3, ease: EASE } } }
  const arrowV = reduce
    ? NOOP
    : { hidden: { opacity: 0, scale: 0.6 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: EASE } } }

  const flowCols = isTablet ? 'minmax(0,1fr) 58px minmax(0,1fr)' : 'minmax(0,1fr) 88px minmax(0,1fr)'

  const iconBadge = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: 12,
    background: active
      ? 'rgba(165,231,248,0.18)'
      : 'linear-gradient(140deg,rgba(165,231,248,0.45),rgba(76,143,136,0.16))',
    border: `1px solid ${active ? 'rgba(165,231,248,0.4)' : 'rgba(76,143,136,0.18)'}`,
    color: active ? '#A5E7F8' : '#256E75',
    transition: 'background .3s ease, color .3s ease, border-color .3s ease',
  })

  const flowBadge = (teal) => ({
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: 10,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: teal ? 'rgba(76,143,136,0.14)' : 'rgba(232,182,74,0.15)',
    color: teal ? '#3E8A82' : '#C4881F',
    border: `1px solid ${teal ? 'rgba(76,143,136,0.24)' : 'rgba(232,182,74,0.28)'}`,
  })
  const challengeText = { fontSize: 15, lineHeight: 1.4, color: '#5B6C73', fontWeight: 500 }
  const solutionText = { fontSize: 15, lineHeight: 1.4, color: '#1B4754', fontWeight: 600 }

  const pairStyle = isMobile
    ? { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px 14px', borderRadius: 16 }
    : { display: 'grid', gridTemplateColumns: flowCols, alignItems: 'center', padding: '12px 14px', borderRadius: 16 }

  return (
    <section
      id="who"
      style={{
        ...section,
        padding: isMobile ? '64px 20px 72px' : isTablet ? '84px 32px 90px' : '110px 48px 120px',
      }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ maxWidth: 760, marginBottom: isMobile ? 36 : isTablet ? 48 : 60 }}>
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : isTablet ? '262px 1fr' : '320px 1fr',
            gap: isMobile ? 26 : isTablet ? 44 : 80,
            alignItems: 'start',
          }}
        >
          {/* ── Left: persona selector (vertical list / mobile swipe carousel) ── */}
          <div
            className={isMobile ? 'ds-persona-scroll' : undefined}
            style={
              isMobile
                ? {
                    display: 'flex',
                    gap: 12,
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    margin: '0 -20px',
                    padding: '4px 20px 12px',
                    WebkitOverflowScrolling: 'touch',
                  }
                : {
                    display: 'grid',
                    gap: 10,
                    position: isTablet ? 'static' : 'sticky',
                    top: 96,
                    alignSelf: 'start',
                  }
            }
          >
            {personas.map((opt, i) => {
              const { Icon, subtitle } = personaMeta[i]
              const active = i === persona
              return (
                <button
                  key={opt.tab}
                  onClick={() => setPersona(i)}
                  aria-pressed={active}
                  className="ds-persona-card"
                  style={{
                    position: 'relative',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 16,
                    padding: '13px 16px',
                    border: `1px solid ${active ? 'transparent' : 'rgba(27,71,84,0.06)'}`,
                    background: active ? 'transparent' : 'rgba(255,255,255,0.5)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    boxShadow: active
                      ? '0 26px 56px -28px rgba(23,199,204,0.5)'
                      : '0 8px 26px -22px rgba(16,55,62,0.28)',
                    minWidth: isMobile ? 236 : undefined,
                    flex: isMobile ? '0 0 auto' : undefined,
                    scrollSnapAlign: isMobile ? 'start' : undefined,
                    overflow: 'hidden',
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="ds-persona-active"
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 34 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 16,
                        background: 'linear-gradient(135deg,#1B4754,#20525F 60%,#255862)',
                        boxShadow: 'inset 0 0 0 1px rgba(165,231,248,0.2), 0 0 50px -4px rgba(23,199,204,0.55)',
                      }}
                    >
                      <motion.span
                        initial={reduce ? false : { scaleY: 0, opacity: 0 }}
                        animate={{ scaleY: 1, opacity: 1 }}
                        transition={{ duration: 0.32, ease: EASE }}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 11,
                          bottom: 11,
                          width: 3,
                          borderRadius: '0 3px 3px 0',
                          background: 'linear-gradient(180deg,#7FD8E8,#17C7CC)',
                          boxShadow: '0 0 12px rgba(127,216,232,0.85)',
                          transformOrigin: 'center',
                        }}
                      />
                    </motion.div>
                  )}
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="ds-persona-icon" style={iconBadge(active)}>
                      <Icon size={19} strokeWidth={1.9} />
                    </span>
                    <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2, color: active ? '#FFFFFF' : '#1B4754' }}>
                        {opt.tab}
                      </span>
                      <span style={{ fontSize: 12, lineHeight: 1.3, color: active ? 'rgba(213,230,235,0.82)' : '#7A8B92' }}>
                        {subtitle}
                      </span>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Right: Challenge → Solution workflow ── */}
          <div style={{ position: 'relative' }}>
            <div
              className="ds-who-glow"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                top: isMobile ? 40 : 60,
                width: 'min(760px, 96%)',
                height: 480,
                transform: 'translateX(-50%)',
                background: 'radial-gradient(circle, rgba(127,216,232,0.16), rgba(76,143,136,0.05) 45%, transparent 70%)',
                filter: 'blur(24px)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />

            <motion.h3
              key={`h-${persona}`}
              initial={reduce ? false : { opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
              style={{
                position: 'relative',
                zIndex: 1,
                margin: isMobile ? '2px 0 22px' : '0 0 26px',
                fontSize: isMobile ? 20 : 25,
                fontWeight: 700,
                letterSpacing: '-0.015em',
                color: '#1B4754',
              }}
            >
              {p.heading}
            </motion.h3>

            <div className={reduce ? undefined : 'ds-who-float'} style={{ position: 'relative', zIndex: 1 }}>
              {/* Column labels — communicate "Clinical Problem → AI Solution" */}
              {!isMobile && (
                <div style={{ display: 'grid', gridTemplateColumns: flowCols, alignItems: 'center', padding: '0 14px', marginBottom: 12 }}>
                  <span style={{ ...labelBase, color: '#B07C1E', paddingLeft: 44 }}>Clinical Challenge</span>
                  <span aria-hidden="true" />
                  <span style={{ ...labelBase, color: '#3E8A82', paddingLeft: 44 }}>How DermaScope.ai Helps</span>
                </div>
              )}

              {/* The pairs */}
              <motion.div
                key={`flow-${persona}`}
                variants={flowWrap}
                initial="hidden"
                animate="visible"
                style={{ display: 'grid', gap: isMobile ? 16 : 6 }}
              >
                {p.challenges.map((c, i) => (
                  <motion.div key={c} variants={pairV} className="ds-flow-pair" style={pairStyle}>
                    {/* Challenge */}
                    <motion.div variants={cIn} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="ds-flow-badge" style={flowBadge(false)}>
                        <AlertTriangle size={15} strokeWidth={2.3} />
                      </span>
                      <span style={challengeText}>{c}</span>
                    </motion.div>

                    {/* Connector */}
                    <motion.div variants={connWrap} style={isMobile ? { width: '100%' } : {}}>
                      {isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 32 }}>
                          <motion.span
                            variants={lineV}
                            style={{ width: 2, height: 20, borderRadius: 2, background: 'linear-gradient(180deg, rgba(232,182,74,0.55), rgba(76,143,136,0.7))', transformOrigin: 'top center' }}
                          />
                          <motion.span variants={arrowV} style={{ display: 'flex', color: '#3E8A82' }}>
                            <ArrowDown size={15} strokeWidth={2.4} />
                          </motion.span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%' }}>
                          <motion.span
                            variants={lineV}
                            style={{ flex: 1, height: 2, borderRadius: 2, background: 'linear-gradient(90deg, rgba(232,182,74,0.5), rgba(76,143,136,0.7))', transformOrigin: 'left center' }}
                          />
                          <motion.span variants={arrowV} style={{ display: 'flex', color: '#3E8A82' }}>
                            <ArrowRight size={16} strokeWidth={2.4} />
                          </motion.span>
                        </div>
                      )}
                    </motion.div>

                    {/* Solution */}
                    <motion.div variants={sIn} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="ds-flow-badge" style={flowBadge(true)}>
                        <Check size={16} strokeWidth={3} />
                      </span>
                      <span style={solutionText}>{p.helps[i]}</span>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
