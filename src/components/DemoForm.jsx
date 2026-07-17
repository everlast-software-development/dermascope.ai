import Reveal from './Reveal'
import SectionSubtitle from './SectionSubtitle'
import EarlyAccessForm from './EarlyAccessForm'
import { useResponsive } from '../hooks/useResponsive'

const section = {
  background: 'linear-gradient(180deg,#F0FAFD,#F5FBFD)',
  padding: '110px 48px',
  scrollMarginTop: 70,
}

export default function DemoForm() {
  const { isMobile, isTablet } = useResponsive()

  return (
    <section
      id="demo"
      style={{
        ...section,
        padding: isMobile ? '48px 20px' : isTablet ? '72px 32px' : section.padding,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: isMobile || isTablet ? '1fr' : '1fr 1fr',
          gap: isMobile ? 36 : isTablet ? 52 : 88,
          alignItems: 'center',
        }}
      >
        <Reveal>
          <SectionSubtitle label="Get Started" tone="light" />
          <h2
            style={{
              margin: '0 0 22px',
              fontSize: 'clamp(34px,3.4vw,48px)',
              lineHeight: 1.12,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#1B4754',
            }}
          >
            Ready to Transform Skin Care with AI?
          </h2>
          <p style={{ margin: '0 0 18px', fontSize: 17, lineHeight: 1.7, color: '#7A8B92' }}>
            Join healthcare professionals, clinics, researchers, and institutions using AI-powered
            clinical intelligence to improve skin assessment, documentation, treatment monitoring, and
            patient outcomes.
          </p>
          <p style={{ margin: '0 0 30px', fontSize: 17, lineHeight: 1.7, color: '#7A8B92' }}>
            Whether you're a dermatologist, GP, plastic surgeon, resident, researcher, or healthcare
            organization, DermaScope.ai is built to support smarter, faster, and more confident
            clinical decisions.
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              borderLeft: '3px solid #A5E7F8',
              paddingLeft: 16,
              fontSize: 17,
              fontWeight: 600,
              color: '#285F66',
            }}
          >
            Be Among the First to Experience DermaScope.ai
          </div>
        </Reveal>

        <Reveal
          style={{
            background: '#FFFFFF',
            border: '1px solid #DCECEF',
            borderRadius: 26,
            padding: isMobile ? '28px 22px' : isTablet ? '36px 34px' : '40px 44px',
            boxShadow: '0 24px 60px rgba(27,71,84,0.08)',
          }}
        >
          <EarlyAccessForm />
        </Reveal>
      </div>
    </section>
  )
}
