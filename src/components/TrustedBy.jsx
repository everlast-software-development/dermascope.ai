// Auto-looping "Trusted by" marquee. The company set is rendered in two
// identical groups; the track animates a -50% translate so the second group
// slides exactly into the first's starting position — a seamless infinite loop.
const companies = ['Everlast Wellness', 'Al Jamila Club', 'Genesis360', 'SkinTrix360']

// repeat within a group so the row fills wide viewports before it loops
const group = [...companies, ...companies, ...companies]

function Group() {
  return (
    <div className="ds-marquee-group" aria-hidden="true">
      {group.map((name, i) => (
        <span className="ds-marquee-item" key={i}>
          {name}
        </span>
      ))}
    </div>
  )
}

export default function TrustedBy() {
  return (
    <section className="ds-trusted" aria-label="Trusted by">
      <p className="ds-trusted-label">Trusted by leading clinics &amp; institutions</p>

      <div className="ds-marquee" role="marquee">
        <div className="ds-marquee-track">
          <Group />
          <Group />
        </div>
      </div>
    </section>
  )
}
