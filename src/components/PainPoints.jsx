import Reveal from './Reveal'
import SectionSubtitle from './SectionSubtitle'
import ContainerScroll from './ui/ContainerScroll'
import { painPoints } from '../data'
import { useResponsive } from '../hooks/useResponsive'

const section = {
  background: 'linear-gradient(180deg,#F5FBFD,#F0FAFD)',
  padding: '110px 48px 100px',
  scrollMarginTop: 70,
}

const cardInner = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 36,
  background: 'url("/frame-portrait.webp") center / cover no-repeat, linear-gradient(150deg,#12333B,#1B4754 55%,#20525F)',
  minHeight: 'min(560px, calc(100vh - 180px))',
  display: 'grid',
  gridTemplateColumns: '0.95fr 1.05fr',
  gap: 64,
  alignItems: 'center',
  padding: '64px 72px',
}

const visualPanel = {
  position: 'relative',
  height: '100%',
  minHeight: 380,
  borderRadius: 24,
  border: '1px dashed rgba(165,231,248,0.3)',
  background: 'repeating-linear-gradient(45deg,rgba(165,231,248,0.07) 0 14px,rgba(165,231,248,0.02) 14px 28px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

function StackCard({ item, index, total, isLast, isMobile, isTablet }) {
  const isSmall = isMobile || isTablet

  const cardInnerResponsive = {
    ...cardInner,
    minHeight: isMobile ? 'auto' : isTablet ? 'auto' : cardInner.minHeight,
    gridTemplateColumns: isSmall ? '1fr' : cardInner.gridTemplateColumns,
    gap: isMobile ? 26 : isTablet ? 40 : cardInner.gap,
    padding: isMobile ? '30px 20px' : isTablet ? '48px 44px' : cardInner.padding,
  }

  const visualPanelResponsive = {
    ...visualPanel,
    height: isMobile ? 210 : isTablet ? 320 : visualPanel.height,
    minHeight: isMobile ? 200 : isTablet ? 300 : visualPanel.minHeight,
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 90,
        marginBottom: isLast ? 0 : isMobile ? 28 : 48,
        zIndex: index + 1,
        willChange: 'transform',
      }}
    >
      <div style={cardInnerResponsive}>
        <div
          style={{
            position: 'absolute',
            top: -140,
            right: -100,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(165,231,248,0.14),transparent 65%)',
          }}
        />

        {/* Visual — real image when supplied, otherwise the placeholder */}
        <div
          style={{
            ...visualPanelResponsive,
            ...(item.image
              ? { border: 'none', background: '#12333B', overflow: 'hidden' }
              : null),
          }}
        >
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <span
              style={{
                fontFamily: 'ui-monospace,SFMono-Regular,monospace',
                fontSize: 13,
                color: '#D5E6EB',
                textAlign: 'center',
                padding: '0 28px',
              }}
            >
              [ visual — {item.title.toLowerCase()} ]
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ position: 'relative' }}>
          <SectionSubtitle label="The Clinical Reality" tone="dark" />
          <h3
            style={{
              margin: '0 0 18px',
              fontSize: 'clamp(28px,2.8vw,40px)',
              lineHeight: 1.15,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
            }}
          >
            {item.title}
          </h3>
          <p
            style={{
              margin: '0 0 26px',
              fontSize: 16.5,
              lineHeight: 1.7,
              color: '#D5E6EB',
              maxWidth: 540,
            }}
          >
            {item.body}
          </p>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#A5E7F8',
              marginBottom: 13,
            }}
          >
            {item.tagsLabel}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '11px 24px',
              maxWidth: 560,
            }}
          >
            {item.tags.map((t) => (
              <span
                key={t}
                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: '#D5E6EB' }}
              >
                <span
                  style={{ width: 6, height: 6, borderRadius: '50%', background: '#A5E7F8', flexShrink: 0 }}
                />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PainPoints() {
  const { isMobile, isTablet } = useResponsive()
  const isSmall = isMobile || isTablet

  const sectionResponsive = {
    ...section,
    padding: isMobile ? '64px 20px 60px' : isTablet ? '80px 32px 70px' : section.padding,
  }

  return (
    <section id="challenge" style={sectionResponsive}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ maxWidth: 820, marginBottom: 22 }}>
          <SectionSubtitle label="The Clinical Reality" tone="light" />
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
            Skin Care Is Becoming More Complex—But Clinical Time Isn't.
          </h2>
          <p style={{ margin: 0, fontSize: 17.5, lineHeight: 1.7, color: '#7A8B92' }}>
            Across healthcare, professionals involved in skin assessment face increasing diagnostic
            complexity, growing documentation requirements, and the need for consistent follow-up.
            Whether evaluating suspicious lesions, monitoring treatment outcomes, conducting
            research, or managing clinical workflows, making timely and confident decisions has
            never been more challenging.
          </p>
        </Reveal>

        {/* Full-cover sticky-stacking cards */}
        <div style={{ marginTop: isMobile ? 40 : 64 }}>
          {painPoints.map((item, i) => (
            <StackCard
              key={item.title}
              item={item}
              index={i}
              total={painPoints.length}
              isLast={i === painPoints.length - 1}
              isMobile={isMobile}
              isTablet={isTablet}
            />
          ))}
        </div>

        <Reveal style={{ marginTop: isMobile ? 44 : 64 }}>
          <ContainerScroll>
          <div
            className="ds-why-card"
            style={isSmall ? { gridTemplateColumns: '1fr' } : undefined}
          >
            <div className="ds-why-bg" />

            <div
              className="ds-why-left"
              style={
                isSmall
                  ? { padding: isMobile ? '40px 24px 0' : '48px 40px 0', textAlign: 'center' }
                  : undefined
              }
            >
              <SectionSubtitle label="One Unified Platform" tone="dark" />
              <h3
                style={{
                  margin: '0 0 20px',
                  fontSize: 'clamp(30px,3vw,44px)',
                  lineHeight: 1.1,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                }}
              >
                That's Why We Built DermaScope.ai
              </h3>
              <p
                style={{
                  margin: '0 0 32px',
                  maxWidth: 560,
                  fontSize: 17,
                  lineHeight: 1.7,
                  color: '#D5E6EB',
                }}
              >
                DermaScope.ai brings together AI-powered image analysis, structured clinical
                documentation, longitudinal monitoring, research-ready data, and decision support into
                one unified platform—helping healthcare professionals work with greater confidence,
                consistency, and efficiency while keeping every final clinical decision in human
                hands.
              </p>
              <a
                href="#why"
                className="ds-pill-cta"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(90deg, #007176, #17C7CC)',
                  color: '#FFFFFF',
                  fontSize: 15.5,
                  fontWeight: 700,
                  padding: '14px 28px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}
              >
                See Why DermaScope ↓
              </a>
            </div>

            <div
              className="ds-why-right"
              style={isSmall ? { padding: '12px 0 0', justifyContent: 'center' } : undefined}
            >
              <img
                src="/mobile_mockup_home.png"
                alt="DermaScope.ai mobile app"
                className="ds-why-phone-img"
                style={
                  isSmall
                    ? {
                        width: '100%',
                        maxWidth: isMobile ? 260 : 320,
                        height: 'auto',
                        transform: 'none',
                        margin: '0 auto',
                      }
                    : undefined
                }
              />
            </div>
          </div>
          </ContainerScroll>
        </Reveal>
      </div>
    </section>
  )
}
