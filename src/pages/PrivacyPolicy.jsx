import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import SiteHeader from '../components/SiteHeader'
import SectionSubtitle from '../components/SectionSubtitle'
import CinematicFooter from '../components/ui/CinematicFooter'
import { useResponsive } from '../hooks/useResponsive'
import './PrivacyPolicy.css'

const LAST_UPDATED = 'July 19, 2026'

// Inline link helpers (styled via .ds-legal-body a).
const Ext = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
)
const Mail = ({ addr = 'info@dermascope.ai', children }) => <a href={`mailto:${addr}`}>{children}</a>

// ── Privacy Policy content ───────────────────────────────────────────────
// Each section: { id, title, body:[...] } where a block is a string (paragraph),
// { p } (rich-text paragraph), { sub } (bold sub-heading), or { list } (bullets).
const sections = [
  {
    id: 'who-we-are',
    title: 'Who We Are',
    body: [
      { p: <><strong>Data controller:</strong> Human Studio Labs</> },
      { p: <><strong>Privacy contact:</strong> <Mail>info@dermascope.ai</Mail></> },
    ],
  },
  {
    id: 'data-we-collect',
    title: 'Data We Collect',
    body: [
      'We collect the following categories of information when you use DermaScope AI:',
      { sub: 'Account and profile data' },
      {
        list: [
          'Full name and email address',
          'Profile photo, when provided through Google Sign-In or Apple Sign-In',
          'Basic profile details you provide, such as your gender and date of birth (age)',
          'Authentication identifiers from Firebase Auth (email, Google, or Apple sign-in)',
        ],
      },
      { sub: 'Skin images and analysis data' },
      {
        list: [
          'Photographs of your skin captured through the in-app camera or uploaded from your device photo library',
          'Limited profile context (such as your age and gender) that accompanies an image to improve analysis quality',
          'AI-generated analysis results and follow-up history associated with those images',
        ],
      },
      'These images may reveal information about your health and are treated as sensitive data under applicable privacy laws.',
      { sub: 'Device and technical data' },
      {
        list: [
          'Device type, operating system, and app version',
          'IP address and general location derived from IP (country/region level)',
          'Crash logs and diagnostic data to maintain app stability',
        ],
      },
      { sub: 'Usage data' },
      {
        list: [
          'Features used, session duration, and interaction patterns within the app',
          'Timestamps of analyses and account activity',
        ],
      },
    ],
  },
  {
    id: 'how-we-use',
    title: 'How We Use Your Data',
    body: [
      'We use the information we collect to:',
      {
        list: [
          'Provide AI-assisted skin analysis and display results to you',
          <>Transmit your skin images and limited profile context (age and gender) to our third-party AI provider, <strong>OpenAI</strong>, so it can generate your analysis results</>,
          'Create and maintain your user account and authentication',
          'Store your analysis history and enable progress tracking over time',
          'Improve the accuracy, safety, and performance of the Service',
          'Monitor for fraud, abuse, and security incidents',
          'Respond to your support requests and legal inquiries',
          'Comply with applicable laws and regulatory obligations',
        ],
      },
      { p: <>We do <strong>not</strong> sell your personal data or use your skin images for advertising purposes.</> },
    ],
  },
  {
    id: 'images-processing',
    title: 'How Skin Images Are Processed and Stored',
    body: [
      'When you capture or upload a skin image, it is transmitted securely over HTTPS to our backend servers. Our servers then send the image, together with limited profile context (your age and gender), to our third-party AI provider (OpenAI) to generate the analysis. Images are stored in encrypted cloud storage for as long as your account remains active, so you can access your analysis history and track changes over time.',
      'Images are not permanently deleted immediately after a single analysis — they are retained in your account until you delete them individually or request full account deletion.',
      {
        p: (
          <>
            When you delete your account (see <Link to="/delete-account">Delete Account</Link>), all skin images, analysis
            results, and associated data are permanently deleted from our production systems within <strong>30 days</strong> of
            a verified deletion request. Encrypted backup copies, if any, are purged within an additional 30 days.
          </>
        ),
      },
    ],
  },
  {
    id: 'third-parties',
    title: 'Third Parties We Share Data With',
    body: [
      'We share data only with service providers that help us operate DermaScope AI, and only to the extent necessary:',
      {
        list: [
          <>
            <strong>Google Firebase</strong> — user authentication (email, Google Sign-In, Apple Sign-In). Google's privacy
            policy applies to authentication data they process:{' '}
            <Ext href="https://firebase.google.com/support/privacy">firebase.google.com/support/privacy</Ext>
          </>,
          <>
            <strong>Cloud hosting and storage providers</strong> — secure storage and processing of skin images and account
            data on encrypted servers
          </>,
          <>
            <strong>OpenAI (a third-party AI service provider — OpenAI, L.L.C.)</strong> — we send your skin images together
            with limited profile context (your age and gender) to OpenAI's API so it can generate your AI analysis. We use
            OpenAI's API (business) offering, under which <strong>your data is not used to train OpenAI's models</strong> and
            is retained by OpenAI only transiently to process the request and for limited abuse-monitoring, after which it is
            deleted. OpenAI is contractually required to protect this data at a level consistent with this policy. OpenAI's
            privacy policy is available at{' '}
            <Ext href="https://openai.com/policies/privacy-policy">openai.com/policies/privacy-policy</Ext> and its API
            data-usage terms at{' '}
            <Ext href="https://openai.com/policies/api-data-usage-policies">openai.com/policies/api-data-usage-policies</Ext>.
          </>,
        ],
      },
      'We require all service providers to protect your data under contractual obligations consistent with this policy. We do not sell, rent, or trade your personal information to third parties for their marketing purposes.',
    ],
  },
  {
    id: 'ai-consent',
    title: 'Your Consent to AI Processing',
    body: [
      {
        p: (
          <>
            Before your skin images are sent for AI analysis for the first time, the app presents a clear disclosure
            identifying the data that will be shared (your skin photos and basic profile details such as age and gender), the
            recipients (our servers and our third-party AI provider, OpenAI), and the purpose (to generate your AI insights),
            and asks for your explicit permission. Your images are not sent for analysis unless you agree. You can withdraw
            your consent at any time by discontinuing use of the analysis feature and requesting deletion of your data at{' '}
            <Mail>info@dermascope.ai</Mail>.
          </>
        ),
      },
    ],
  },
  {
    id: 'retention',
    title: 'Data Retention',
    body: [
      {
        list: [
          <><strong>Account and profile data:</strong> retained for the life of your account, plus up to 30 days after a verified deletion request</>,
          <><strong>Skin images and analysis history:</strong> retained for the life of your account, plus up to 30 days after a verified deletion request</>,
          <><strong>Usage and analytics data:</strong> retained for up to 90 days</>,
          <><strong>Security and audit logs:</strong> retained for up to 12 months for fraud prevention, security monitoring, and legal compliance</>,
        ],
      },
      'We may retain certain information longer where required by law (for example, tax or regulatory obligations), but such data is limited to what is legally necessary and is not used for any other purpose.',
    ],
  },
  {
    id: 'security',
    title: 'Security Measures',
    body: [
      'We implement technical and organizational measures to protect your data, including:',
      {
        list: [
          'Encryption in transit (TLS/HTTPS) for all data transmitted between your device, our servers, and our AI provider',
          'Encryption at rest for stored skin images and account data',
          'Secure authentication token handling via Firebase Auth',
          'Role-based access controls limiting employee access to production data',
          'Regular security monitoring and incident response procedures',
        ],
      },
      {
        p: (
          <>
            No method of transmission or storage is 100% secure. If you believe your account has been compromised, contact us
            immediately at <Mail>info@dermascope.ai</Mail>.
          </>
        ),
      },
    ],
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    body: [
      'Depending on your location, you may have the right to access, correct, delete, or restrict processing of your personal data, and to receive a copy of data you have provided to us.',
      'To exercise these rights:',
      {
        list: [
          <><strong>Delete your account and all data:</strong> visit our <Link to="/delete-account">Account Deletion page</Link> or email <Mail>info@dermascope.ai</Mail></>,
          <><strong>Access or correct your data:</strong> email <Mail>info@dermascope.ai</Mail> from the email address associated with your account</>,
          <><strong>Withdraw consent:</strong> you may stop using the Service and request deletion at any time</>,
        ],
      },
      'We will respond to verified requests within 30 days. We may need to verify your identity before processing a request.',
    ],
  },
  {
    id: 'children',
    title: "Children's Privacy",
    body: [
      {
        p: (
          <>
            DermaScope AI is not intended for individuals under the age of <strong>16</strong>. We do not knowingly collect
            personal information or skin images from children under 16. If you believe a child under 16 has provided us with
            personal data, please contact us at <Mail>info@dermascope.ai</Mail> and we will promptly delete that information.
          </>
        ),
      },
    ],
  },
  {
    id: 'international',
    title: 'International Data Transfers',
    body: [
      'Your data may be processed and stored on servers located in the United States, the European Union, or other countries where our service providers (including OpenAI) operate. When data is transferred internationally, we implement appropriate safeguards — such as standard contractual clauses or equivalent mechanisms — to ensure your data receives a level of protection consistent with this policy.',
    ],
  },
  {
    id: 'medical-disclaimer',
    title: 'Medical Disclaimer',
    body: [
      'DermaScope AI provides AI-generated information for general informational and educational purposes only. It is not a medical device, is not regulated or cleared by any health authority, and does not provide a medical diagnosis or treatment. The Service is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare professional with any questions about a skin concern, and never disregard professional medical advice because of information provided by the Service.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. When we make material changes, we will update the "Last updated" date at the top of this page and, where appropriate, notify you through the app or by email. Your continued use of DermaScope AI after changes take effect constitutes acceptance of the updated policy.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    body: [
      'For privacy questions, data access requests, or to exercise your rights, contact us at:',
      { p: <><strong>Human Studio Labs</strong><br />Email: <Mail>info@dermascope.ai</Mail></> },
    ],
  },
]

// Shared subtle branded backdrop (radial washes + faint medical dot mesh).
const pageBg = {
  background: '#FFFFFF',
  backgroundImage:
    'radial-gradient(85% 55% at 12% 0%, rgba(165,231,248,0.2), rgba(165,231,248,0) 55%),' +
    'radial-gradient(75% 55% at 100% 8%, rgba(76,143,136,0.12), rgba(76,143,136,0) 55%),' +
    'radial-gradient(rgba(40,95,102,0.05) 1px, transparent 1.6px)',
  backgroundSize: 'auto, auto, 26px 26px',
}

function Block({ block }) {
  if (typeof block === 'string') return <p>{block}</p>
  if (block.sub) return <div className="ds-legal-subhead">{block.sub}</div>
  if (block.p) return <p>{block.p}</p>
  if (block.list) {
    return (
      <ul>
        {block.list.map((li, i) => (
          <li key={i}>{li}</li>
        ))}
      </ul>
    )
  }
  return null
}

export default function PrivacyPolicy() {
  const { isMobile, isTablet } = useResponsive()
  const showToc = !isMobile
  const [activeId, setActiveId] = useState(sections[0].id)

  // Set the browser-tab title for this route, restoring it on unmount.
  useEffect(() => {
    const previous = document.title
    document.title = 'Privacy Policy — DermaScope.ai'
    return () => {
      document.title = previous
    }
  }, [])

  // Land at the top (or at a hash target) when the page mounts.
  useEffect(() => {
    const hash = window.location.hash?.slice(1)
    if (hash) {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView()
        return
      }
    }
    window.scrollTo(0, 0)
  }, [])

  // Scroll-spy: highlight the TOC entry for the section currently in view.
  useEffect(() => {
    if (!showToc || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-120px 0px -65% 0px', threshold: 0 },
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [showToc])

  return (
    <div style={{ ...pageBg, minHeight: '100vh' }}>
      <SiteHeader />

      <main
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: isMobile ? '112px 20px 72px' : isTablet ? '132px 32px 96px' : '150px 48px 120px',
        }}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <header style={{ maxWidth: 780, marginBottom: isMobile ? 44 : 64 }}>
          <SectionSubtitle label="Legal" tone="light" />
          <h1
            style={{
              margin: '0 0 18px',
              fontSize: 'clamp(36px,4.4vw,58px)',
              lineHeight: 1.08,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#1B4754',
            }}
          >
            Privacy Policy
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 14px',
                borderRadius: 999,
                background: 'rgba(76,143,136,0.1)',
                border: '1px solid rgba(76,143,136,0.22)',
                color: '#3E8A82',
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={16} strokeWidth={2.2} />
              Last Updated: {LAST_UPDATED}
            </span>
          </div>
          <p style={{ margin: '22px 0 0', fontSize: 17, lineHeight: 1.7, color: '#5C7077', maxWidth: 700 }}>
            This Privacy Policy describes how Human Studio Labs ("we," "us," or "our") collects, uses,
            stores, and protects information when you use the DermaScope AI mobile application and related
            services (collectively, the "Service"). Because DermaScope AI processes photographs of your skin
            for AI-assisted analysis, we treat your data — especially skin images — as sensitive
            health-related information.
          </p>
        </header>

        {/* ── Content: sticky TOC + premium section cards ───────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: showToc ? (isTablet ? '220px 1fr' : '260px 1fr') : '1fr',
            gap: isTablet ? 40 : 56,
            alignItems: 'start',
          }}
        >
          {showToc && (
            <nav
              aria-label="On this page"
              style={{ position: 'sticky', top: 104, alignSelf: 'start', display: 'grid', gap: 2 }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#7A8B92',
                  padding: '0 14px 10px',
                }}
              >
                On this page
              </div>
              {sections.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`ds-toc-link${activeId === s.id ? ' is-active' : ''}`}
                >
                  {String(i + 1).padStart(2, '0')}. {s.title}
                </a>
              ))}
            </nav>
          )}

          <div style={{ display: 'grid', gap: isMobile ? 20 : 26 }}>
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                className="ds-legal-card"
                style={{
                  scrollMarginTop: 104,
                  background: 'rgba(255,255,255,0.72)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(27,71,84,0.09)',
                  borderRadius: 24,
                  boxShadow: '0 18px 46px -28px rgba(16,55,62,0.3)',
                  padding: isMobile ? '26px 22px' : isTablet ? '32px 30px' : '40px 44px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18 }}>
                  <span
                    style={{
                      fontSize: isMobile ? 15 : 16,
                      fontWeight: 800,
                      color: '#A9C6CC',
                      lineHeight: 1,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: isMobile ? 21 : 25,
                      fontWeight: 700,
                      letterSpacing: '-0.015em',
                      color: '#1B4754',
                    }}
                  >
                    {s.title}
                  </h2>
                </div>
                <div className="ds-legal-body">
                  {s.body.map((block, bi) => (
                    <Block key={bi} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <CinematicFooter />
    </div>
  )
}
