import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Reveal from './Reveal'
import SectionSubtitle from './SectionSubtitle'
import { faqs } from '../data'
import { useResponsive } from '../hooks/useResponsive'

const EASE = [0.22, 0.61, 0.36, 1]

const section = {
  background: 'linear-gradient(180deg,#F5FBFD,#F0FAFD)',
  scrollMarginTop: 70,
}

// Single-open accordion. `openIndex` starts at 0 so the first answer is visible
// on load; clicking a row toggles it and collapses the others.
function FaqRow({ item, index, open, onToggle, reduce, isMobile }) {
  const [hover, setHover] = useState(false)
  const panelId = `faq-panel-${index}`
  const buttonId = `faq-button-${index}`

  const padX = isMobile ? 18 : 24

  // Minimal card: a single subtle border does the work — no heavy shadows.
  // Border deepens slightly when active, and a touch more on hover.
  const borderColor = open
    ? 'rgba(76,143,136,0.40)'
    : hover
      ? '#CFE3E7'
      : '#E4EFF1'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        transition: 'border-color .25s ease',
        overflow: 'hidden',
      }}
    >
      <h3 style={{ margin: 0 }}>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          style={{
            all: 'unset',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            width: '100%',
            cursor: 'pointer',
            padding: isMobile ? '17px 18px' : '19px 24px',
            fontFamily: 'inherit',
          }}
        >
          <span
            style={{
              fontSize: isMobile ? 15.5 : 17,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              lineHeight: 1.4,
              color: '#1B4754',
            }}
          >
            {item.q}
          </span>
          <ChevronDown
            aria-hidden="true"
            size={19}
            strokeWidth={2.2}
            style={{
              flexShrink: 0,
              color: open ? '#3E8A82' : '#8AA0A7',
              transition: 'color .25s ease, transform .3s cubic-bezier(0.22,0.61,0.36,1)',
              transform: open ? 'rotate(180deg)' : 'none',
            }}
          />
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: `0 ${padX}px ${isMobile ? 18 : 20}px`,
              }}
            >
              {/* Hairline separator between question and answer. */}
              <div
                aria-hidden="true"
                style={{ height: 1, marginBottom: isMobile ? 13 : 15, background: '#EDF3F4' }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: isMobile ? 15 : 15.5,
                  lineHeight: 1.7,
                  color: '#5B6C73',
                }}
              >
                {item.a}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  const { isMobile, isTablet } = useResponsive()
  const reduce = useReducedMotion()
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section
      id="faq"
      style={{
        ...section,
        // Compact top padding; generous bottom leading into the footer.
        padding: isMobile ? '48px 20px 72px' : isTablet ? '60px 32px 90px' : '76px 48px 110px',
      }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        {/* Left-aligned header with the site-wide eyebrow, generous gap to list. */}
        <Reveal style={{ marginBottom: isMobile ? 30 : 40 }}>
          <SectionSubtitle label="FAQ" tone="light" />
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(26px,2.6vw,38px)',
              lineHeight: 1.15,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: '#1B4754',
            }}
          >
            Frequently Asked Questions
          </h2>
          <p
            style={{
              margin: '12px 0 0',
              maxWidth: 560,
              fontSize: isMobile ? 15.5 : 16.5,
              lineHeight: 1.6,
              color: '#5B6C73',
            }}
          >
            Find quick answers to the most common questions about DermaScope.ai.
          </p>
        </Reveal>

        <Reveal>
          <div style={{ display: 'grid', gap: isMobile ? 12 : 14 }}>
            {faqs.map((item, i) => (
              <FaqRow
                key={item.q}
                item={item}
                index={i}
                open={openIndex === i}
                onToggle={() => setOpenIndex((cur) => (cur === i ? -1 : i))}
                reduce={reduce}
                isMobile={isMobile}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
