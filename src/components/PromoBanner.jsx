import { useResponsive } from '../hooks/useResponsive'

// Full-bleed promo banner that sits directly above the footer: logo + oversized
// headline + supporting copy + pill CTA on the left, a single device-mockup
// hero image on the right, over a brand-teal field with faint angular shapes.

// Single flattened device composite (desktop + tablet + phone already
// rendered together in the artwork itself), replacing the previous separately
// drawn Laptop/Tablet/Phone chassis cluster.
const DEVICES_SHOT = '/devicesmockup.webp'

// Reads as a continuation of the Hero: the same radial geometry
// (120% 130% at 25% 10%) and the same three-stop structure, lifted a few steps
// brighter so the field feels more inviting without going pale. The stops stay
// dark enough that white copy over the left side holds well past 4.5:1.
const CTA_BASE = 'radial-gradient(120% 130% at 25% 10%, #31707a 0%, #1f5762 45%, #123f48 100%)'

// Light diffusion rather than glow effects — four wide, low-opacity radials,
// topmost first. Every colour is already in the site's palette: the #15C1C6
// accent, the #A5E7F8 pale cyan, and the Hero's own #7ED8E8 wash.
const CTA_GLOW =
  'radial-gradient(58% 68% at 80% 40%, rgba(21,193,198,0.18) 0%, rgba(21,193,198,0) 70%),' +
  'radial-gradient(52% 48% at 62% 0%, rgba(165,231,248,0.12) 0%, rgba(165,231,248,0) 74%),' +
  'radial-gradient(60% 70% at 78% 45%, rgba(126,216,232,0.10) 0%, rgba(126,216,232,0) 70%),' +
  // keeps the lower-left anchored so the field has depth instead of flattening,
  // and protects contrast under the copy and badges
  'radial-gradient(66% 58% at 6% 98%, rgba(6,22,28,0.24) 0%, rgba(6,22,28,0) 72%)'

const bannerBg = {
  position: 'relative',
  overflow: 'hidden',
  background: CTA_BASE,
}

const heroGlowLayer = {
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  background: CTA_GLOW,
}

// Faint angular facets for depth. clip-path polygons rather than any image, so
// they cost nothing and scale to any width. Lightened slightly now that the
// field is the Hero's deep teal rather than a mid tone.
const facets = [
  { clip: 'polygon(0 0, 42% 0, 0 78%)', bg: 'rgba(255,255,255,0.035)' },
  { clip: 'polygon(0 26%, 30% 0, 34% 100%, 0 100%)', bg: 'rgba(255,255,255,0.022)' },
  { clip: 'polygon(64% 0, 100% 0, 100% 46%)', bg: 'rgba(255,255,255,0.028)' },
  { clip: 'polygon(52% 100%, 100% 62%, 100% 100%)', bg: 'rgba(6,22,28,0.16)' },
]

// Official store badges, used as-is. Apple's SVG has no padding; Google's PNG
// ships with ~16% clear space baked in, which would render it visibly smaller at
// the same height — so that padding is trimmed and the clear space is provided by
// the flex gap instead. Aspect ratios below are the assets' own.
const BADGES = [
  {
    src: '/app-store-badge-dark.svg',
    alt: 'Download on the App Store',
    ratio: 119.66407 / 40,
    href: 'https://apps.apple.com/app/id6787643958',
  },
  {
    src: '/google-play-badge-dark.png',
    alt: 'Get it on Google Play',
    ratio: 550 / 154,
    href: 'https://play.google.com/store/apps/details?id=com.dermascopeai.app',
  },
]

// Scoped, self-contained styles — the same pattern CinematicFooter uses — so the
// badge pill lives here rather than in the global stylesheet.
//
// The glass pill mirrors .footer-glass-pill: a barely-there translucent fill, a
// 1px low-opacity border, a backdrop blur, and — the part that actually makes it
// read as glass rather than a flat panel — the paired inset highlight along the
// top edge and inset shade along the bottom.
const BADGE_CSS = `
.ds-store-badge{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  box-sizing:border-box;
  flex:0 0 auto;
  padding:10px 18px;
  border-radius:999px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.12);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
  box-shadow:
    0 10px 30px rgba(0,0,0,0.18),
    inset 0 1px 1px rgba(255,255,255,0.10),
    inset 0 -1px 2px rgba(6,22,28,0.30);
  transition:transform 250ms ease,border-color 250ms ease,background 250ms ease,box-shadow 250ms ease;
}
.ds-store-badge:hover{
  transform:translateY(-2px) scale(1.02);
  border-color:rgba(255,255,255,0.22);
  background:rgba(255,255,255,0.06);
  box-shadow:
    0 16px 36px rgba(0,0,0,0.24),
    inset 0 1px 1px rgba(255,255,255,0.16),
    inset 0 -1px 2px rgba(6,22,28,0.30);
}
.ds-store-badge:focus-visible{outline:2px solid #A5E7F8;outline-offset:3px}
@media (prefers-reduced-motion: reduce){
.ds-store-badge{transition:none}
.ds-store-badge:hover{transform:none}
}
`

export default function PromoBanner() {
  const { isMobile, isTablet } = useResponsive()
  const stacked = isMobile || isTablet
  // Apple's artwork is aspect 2.99 and Google's is 3.57, so letting the pills
  // size to their contents makes them different widths. Instead both pills get
  // identical fixed dimensions and each badge is centred inside via
  // object-fit: contain — same rendered height, own aspect ratio, no distortion.
  // pillW is chosen to clear the wider (Google) artwork at each breakpoint; on
  // mobile two pills plus the gap still fit the 350px column (165·2 + 12 = 342).
  const badgeH = isMobile ? 30 : isTablet ? 38 : 40
  const pillW = isMobile ? 165 : isTablet ? 210 : 220
  const pillH = badgeH + 22 // 10px padding top and bottom + 1px border each side
  const badgeGap = isMobile ? 12 : 16

  return (
    <section
      id="promo"
      aria-label="Get DermaScope.ai"
      style={{
        ...bannerBg,
        padding: isMobile ? '56px 20px 60px' : isTablet ? '68px 32px 72px' : '84px 48px 88px',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: BADGE_CSS }} />
      {/* Hero's cyan glow, laid over its base gradient */}
      <div aria-hidden="true" style={heroGlowLayer} />
      {facets.map((f, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            clipPath: f.clip,
            background: f.bg,
          }}
        />
      ))}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          // Wider than the 1240 used elsewhere so the headline can settle into
          // two balanced lines instead of breaking every couple of words, and
          // wider still than before so the device mockup has real room to be
          // the section's hero visual rather than a small floating image.
          maxWidth: 1520,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: stacked ? '1fr' : '0.72fr 1fr',
          gap: isMobile ? 44 : isTablet ? 52 : 64,
          alignItems: 'center',
        }}
      >
        {/* ── Left: logo, headline, copy, CTA ── */}
        <div style={{ textAlign: stacked ? 'center' : 'left' }}>
          <img
            src="/logo.webp"
            alt="DermaScope.ai"
            width={509}
            height={110}
            loading="lazy"
            style={{
              height: isMobile ? 34 : 44,
              width: 'auto',
              display: 'block',
              margin: stacked ? '0 auto 24px' : '0 0 26px',
              filter: 'brightness(0) invert(1)',
            }}
          />

          <h2
            style={{
              margin: '0 0 20px',
              // Capped lower than before so the line stays impactful but fits two
              // lines in the column; `balance` keeps those two lines even.
              fontSize: isMobile ? 'clamp(30px,8.2vw,37px)' : 'clamp(36px,3.5vw,50px)',
              lineHeight: 1.1,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#FFFFFF',
              textWrap: 'balance',
            }}
          >
            Ready to Experience Smarter Dermatology?
          </h2>

          <p
            style={{
              margin: stacked ? '0 auto 34px' : '0 0 36px',
              // Wider so the copy settles into 2–3 comfortable lines.
              maxWidth: 640,
              fontSize: isMobile ? 16 : 17,
              lineHeight: 1.72,
              textWrap: 'pretty',
              // Held higher than the usual 0.86 because the teal field is lighter
              // than the violet it replaced — keeps body copy above 4.5:1.
              color: 'rgba(255,255,255,0.94)',
            }}
          >
            Download <strong style={{ fontWeight: 700, color: '#FFFFFF' }}>DermaScope.ai</strong>{' '}
            today and bring AI-powered clinical imaging, standardized documentation, and intelligent
            skin analysis into your daily practice.
          </p>

          {/* Official store badges, matched to the same rendered height. */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: badgeGap,
              justifyContent: stacked ? 'center' : 'flex-start',
            }}
          >
            {BADGES.map((b) => (
              <a
                key={b.src}
                href={b.href}
                target="_blank"
                rel="noopener noreferrer"
                className="ds-store-badge"
                style={{ width: pillW, height: pillH }}
              >
                <img
                  src={b.src}
                  alt={b.alt}
                  loading="lazy"
                  decoding="async"
                  width={Math.round(badgeH * b.ratio)}
                  height={badgeH}
                  // Full-width box with `contain`: the artwork keeps its own
                  // aspect ratio, renders at exactly badgeH tall, and centres
                  // itself — so both pills match without either badge stretching.
                  style={{ width: '100%', height: badgeH, objectFit: 'contain', display: 'block' }}
                />
              </a>
            ))}
          </div>
        </div>

        {/* ── Right: device-mockup hero image ──
            No forced aspect-ratio box: the asset is pre-trimmed to its own
            content bounds, so sizing it by width and letting height follow
            (`height: auto`) shows it at its true proportions with zero
            letterboxing, and the grid's `alignItems: center` centers it
            vertically against the left column. `justifyContent: center` plus
            a maxWidth well inside the column keeps it clear of the section's
            top/right edges at every breakpoint. */}
        <div
          aria-hidden="true"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={DEVICES_SHOT}
            alt=""
            loading="lazy"
            decoding="async"
            style={{
              width: '100%',
              maxWidth: 900,
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      </div>
    </section>
  )
}
