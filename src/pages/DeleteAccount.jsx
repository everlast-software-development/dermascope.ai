import { useEffect } from 'react'
import { UserX, Trash2, Archive, Clock, Mail } from 'lucide-react'
import SiteHeader from '../components/SiteHeader'
import SectionSubtitle from '../components/SectionSubtitle'
import CinematicFooter from '../components/ui/CinematicFooter'
import { useResponsive } from '../hooks/useResponsive'
import './PrivacyPolicy.css'

const SUPPORT_EMAIL = 'info@dermascope.ai'
const DELETE_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Account%20Deletion%20Request`

// Shared subtle branded backdrop (radial washes + faint medical dot mesh),
// identical to the Privacy Policy page for visual consistency.
const pageBg = {
  background: '#FFFFFF',
  backgroundImage:
    'radial-gradient(85% 55% at 12% 0%, rgba(165,231,248,0.2), rgba(165,231,248,0) 55%),' +
    'radial-gradient(75% 55% at 100% 8%, rgba(76,143,136,0.12), rgba(76,143,136,0) 55%),' +
    'radial-gradient(rgba(40,95,102,0.05) 1px, transparent 1.6px)',
  backgroundSize: 'auto, auto, 26px 26px',
}

const sections = [
  {
    id: 'requesting-deletion',
    icon: UserX,
    title: 'Requesting Account Deletion',
    body: [
      'You can request deletion of your DermaScope AI account and all associated data at any time — including if you have already uninstalled the app. This page is publicly accessible and does not require you to be logged in.',
    ],
  },
  {
    id: 'what-gets-deleted',
    icon: Trash2,
    title: 'What Gets Deleted',
    body: [
      'When your deletion request is processed, we permanently remove:',
      {
        list: [
          'Your user account and authentication credentials',
          'Your profile information (name, email, profile photo)',
          'All skin images you captured or uploaded',
          'All AI analysis results and clinical history associated with your account',
          'Usage data linked to your account',
        ],
      },
    ],
  },
  {
    id: 'what-may-be-retained',
    icon: Archive,
    title: 'What May Be Retained',
    body: [
      'We do not retain your personal data or skin images after account deletion is complete. Limited anonymized or aggregated data that cannot identify you may be kept for service improvement and security analytics.',
      'We may retain certain records where required by applicable law — for example, transaction records for tax or regulatory compliance — but such data is restricted to what is legally necessary, is not used for any other purpose, and is deleted when the legal retention period expires (typically up to 7 years for financial records, if applicable).',
    ],
  },
  {
    id: 'deletion-timeline',
    icon: Clock,
    title: 'Deletion Timeline',
    body: [
      'After we verify your identity, account deletion is completed within 30 days. You will receive an email confirmation at the address associated with your account once deletion is finished.',
    ],
  },
]

function Block({ block }) {
  if (typeof block === 'string') return <p>{block}</p>
  if (block.list) {
    return (
      <ul>
        {block.list.map((li) => (
          <li key={li}>{li}</li>
        ))}
      </ul>
    )
  }
  return null
}

export default function DeleteAccount() {
  const { isMobile, isTablet } = useResponsive()

  useEffect(() => {
    const previous = document.title
    document.title = 'Delete Account — DermaScope.ai'
    return () => {
      document.title = previous
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const cardBase = {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(27,71,84,0.09)',
    borderRadius: 24,
    boxShadow: '0 18px 46px -28px rgba(16,55,62,0.3)',
    padding: isMobile ? '26px 22px' : isTablet ? '32px 30px' : '38px 40px',
  }
  const iconBadge = (warn) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 13,
    background: warn
      ? 'rgba(232,182,74,0.16)'
      : 'linear-gradient(140deg,rgba(165,231,248,0.5),rgba(76,143,136,0.2))',
    border: `1px solid ${warn ? 'rgba(232,182,74,0.32)' : 'rgba(76,143,136,0.22)'}`,
    color: warn ? '#C4881F' : '#256E75',
  })

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
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          {/* ── Hero ─────────────────────────────────────────────────── */}
          <header style={{ marginBottom: isMobile ? 44 : 64 }}>
            <SectionSubtitle label="Account Management" tone="light" />
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
              Delete Your Account
            </h1>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.7, color: '#5C7077', maxWidth: 700 }}>
              Request permanent deletion of your account, profile, skin images, and analysis history.
            </p>
          </header>

          {/* ── Content cards ────────────────────────────────────────── */}
          <div style={{ display: 'grid', gap: isMobile ? 18 : 22 }}>
            {sections.map((s) => {
              const Icon = s.icon
              return (
                <section key={s.id} id={s.id} className="ds-legal-card" style={cardBase}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <span style={iconBadge(false)}>
                      <Icon size={21} strokeWidth={2} />
                    </span>
                    <h2 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 700, letterSpacing: '-0.015em', color: '#1B4754' }}>
                      {s.title}
                    </h2>
                  </div>
                  <div className="ds-legal-body">
                    {s.body.map((block, bi) => (
                      <Block key={bi} block={block} />
                    ))}
                  </div>
                </section>
              )
            })}

            {/* Contact card — prominent */}
            <section
              id="contact"
              style={{
                marginTop: isMobile ? 8 : 14,
                borderRadius: 26,
                padding: isMobile ? '30px 24px' : '44px 48px',
                background: 'linear-gradient(150deg,#173F49 0%,#1B4754 55%,#20525F 100%)',
                border: '1px solid rgba(165,231,248,0.2)',
                boxShadow: '0 30px 70px -34px rgba(6,22,28,0.6)',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  background: 'rgba(165,231,248,0.14)',
                  border: '1px solid rgba(165,231,248,0.3)',
                  color: '#A5E7F8',
                  marginBottom: 18,
                }}
              >
                <Mail size={24} strokeWidth={2} />
              </span>
              <h2 style={{ margin: '0 0 12px', fontSize: isMobile ? 23 : 28, fontWeight: 700, letterSpacing: '-0.015em', color: '#FFFFFF' }}>
                Need to Delete Your Account?
              </h2>
              <p style={{ margin: '0 auto 8px', maxWidth: 560, fontSize: 16, lineHeight: 1.7, color: 'rgba(213,230,235,0.86)' }}>
                Email us from the address associated with your DermaScope AI account and include
                “Account Deletion Request” in the subject line. We’ll respond within 30 days.
              </p>
              <a
                href={DELETE_MAILTO}
                style={{ display: 'inline-block', marginBottom: 26, fontSize: 17.5, fontWeight: 700, color: '#A5E7F8', textDecoration: 'none' }}
              >
                {SUPPORT_EMAIL}
              </a>
              <div>
                <a
                  href={DELETE_MAILTO}
                  className="ds-hbtn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'linear-gradient(90deg, #007176, #17C7CC)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 15.5,
                    padding: '15px 34px',
                    borderRadius: 999,
                    boxShadow: '0 14px 34px -12px rgba(23,199,204,0.6)',
                    textDecoration: 'none',
                  }}
                >
                  <Mail size={18} strokeWidth={2.2} />
                  Contact Support
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>

      <CinematicFooter />
    </div>
  )
}
