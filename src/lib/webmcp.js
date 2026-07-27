// WebMCP (https://webmachinelearning.github.io/webmcp/) — exposes the site's
// one real user action, submitting an Early Access request, as a tool an
// in-browser AI agent can call directly via navigator.modelContext. This is a
// thin wrapper around the exact same POST /api/contact endpoint the
// EarlyAccessForm UI uses (see EarlyAccessForm.jsx) — no separate code path,
// no fabricated capability.
const API_BASE = import.meta.env.VITE_API_URL || ''

const REQUIRED_FIELDS = [
  'name', 'email', 'title', 'specialty', 'organization',
  'country', 'city', 'phone', 'interest',
]

function validate(input) {
  const errors = []
  for (const field of REQUIRED_FIELDS) {
    if (!input || typeof input[field] !== 'string' || !input[field].trim()) {
      errors.push(`"${field}" is required.`)
    }
  }
  if (!input || input.consent !== true) {
    errors.push('"consent" must be true.')
  }
  return errors
}

async function submitEarlyAccessRequest(input) {
  const errors = validate(input)
  if (errors.length) {
    return { success: false, errors }
  }

  const res = await fetch(`${API_BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))
  return { success: res.ok && !!data.success, ...data }
}

export function registerWebMcpTools() {
  if (typeof navigator === 'undefined' || !navigator.modelContext?.provideContext) return

  navigator.modelContext.provideContext({
    tools: [
      {
        name: 'submit_early_access_request',
        description:
          'Submit a DermaScope.ai Early Access request on behalf of the user (clinician sign-up form).',
        inputSchema: {
          type: 'object',
          required: [...REQUIRED_FIELDS, 'consent'],
          properties: {
            name:         { type: 'string', minLength: 2, description: 'Full name' },
            email:        { type: 'string', format: 'email' },
            title:        { type: 'string', description: 'Professional title' },
            specialty:    { type: 'string', description: 'Clinical specialty' },
            organization: { type: 'string', description: 'Clinic / hospital / organization' },
            country:      { type: 'string' },
            city:         { type: 'string' },
            phone:        { type: 'string', description: 'Mobile / WhatsApp number' },
            interest:     { type: 'string', description: 'Type of interest' },
            physicians:   { type: 'string', description: 'Physicians in organization (optional)' },
            emr:          { type: 'string', description: 'Current EMR / HIS (optional)' },
            challenges: {
              type: 'array',
              items: { type: 'string' },
              description: 'Main challenges to solve (optional)',
            },
            consent: { type: 'boolean', description: 'Must be true — consent to be contacted' },
          },
        },
        execute: submitEarlyAccessRequest,
      },
    ],
  })
}
