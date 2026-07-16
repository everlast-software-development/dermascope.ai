// Auto-looping "Trusted by" marquee. The company set is rendered in two
// identical groups; the track animates a -50% translate so the second group
// slides exactly into the first's starting position — a seamless infinite loop.
import { useResponsive } from '../hooks/useResponsive'

const companies = ['Everlast Wellness', 'Al Jamila Club', 'Genesis360', 'SkinTrix360']

// repeat within a group so the row fills wide viewports before it loops
const group = [...companies, ...companies, ...companies]

function Group({ itemStyle }) {
  return (
    <div className="ds-marquee-group" aria-hidden="true">
      {group.map((name, i) => (
        <span className="ds-marquee-item" key={i} style={itemStyle}>
          {name}
        </span>
      ))}
    </div>
  )
}

export default function TrustedBy() {
  const { isMobile, isTablet } = useResponsive()

  // Presentational-only responsive overrides (desktop = undefined → untouched).
  const itemStyle = isMobile
    ? { padding: '0 22px', fontSize: 15 }
    : isTablet
      ? { padding: '0 38px', fontSize: 18 }
      : undefined

  return (
    <section
      className="ds-trusted"
      aria-label="Trusted by"
      style={isMobile ? { padding: '16px 0 18px' } : undefined}
    >
      <p
        className="ds-trusted-label"
        style={isMobile ? { fontSize: 11, letterSpacing: '0.12em', margin: '0 16px 12px' } : undefined}
      >
        Trusted by leading clinics &amp; institutions
      </p>

      <div className="ds-marquee" role="marquee">
        <div className="ds-marquee-track">
          <Group itemStyle={itemStyle} />
          <Group itemStyle={itemStyle} />
        </div>
      </div>
    </section>
  )
}
