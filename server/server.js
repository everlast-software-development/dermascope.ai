'use strict';

const path       = require('path');
const fs         = require('fs');
const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');

// Load .env from the server folder regardless of the working directory (so it
// works whether started from repo root `npm start` or from server/). In Railway
// production there is no .env file — variables come from the dashboard instead.
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Brand logo shipped inline with each email (referenced via cid:brandlogo).
// PNG, not WebP: email clients (Outlook especially) don't render WebP and
// composite its transparency onto black.
const LOGO_PATH = path.join(__dirname, '..', 'public', 'logo-email.png');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:4173',  // Vite preview
    'https://dermascope.ai',
    'https://www.dermascope.ai',
  ],
  methods: ['POST'],
}));

// ─── Nodemailer transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((err) => {
  if (err) console.error('SMTP connection error:', err.message);
  else console.log('  ✓  SMTP connected and ready');
});

// ─── Shared email design system ───────────────────────────────────────────────
// Brand font stack: Outfit (brand) with robust, email-safe system fallbacks.
const FONT = "'Outfit','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// One premium shell every DermaScope.ai email is poured into, so the internal
// notification and the user confirmation share the exact same design language:
//   · a light frosted-glass header — a soft radial blue gradient with a gentle
//     top glow and a hairline bottom border (true backdrop-blur isn't supported
//     in email, so the frosted feel is built from the gradient + glow);
//   · a clean white body with generous spacing;
//   · a soft-navy footer with a smooth white→navy fade above it.
// Table-free; every gradient carries a `background-color` fallback for Outlook.
function emailLayout({ preheader = '', body = '' }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light" />
<title>DermaScope.ai</title>
<style>
  body { margin:0; padding:0; background:#EBF2F6; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
  a { text-decoration:none; }
  .dsa-cta { transition: background-color .2s ease, box-shadow .2s ease, transform .2s ease; }
  .dsa-cta:hover { background-color:#21525A !important; box-shadow:0 16px 32px -12px rgba(18,51,59,0.55) !important; transform:translateY(-1px); }
  @media only screen and (max-width:640px) {
    .dsa-pad { padding-left:28px !important; padding-right:28px !important; }
    .dsa-head { padding-top:46px !important; padding-bottom:34px !important; }
    .dsa-foot { padding-top:40px !important; padding-bottom:44px !important; }
    .dsa-h1 { font-size:26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#EBF2F6;font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EBF2F6;">${preheader}</div>
  <div style="width:100%;background:#EBF2F6;padding:40px 16px;">
    <div class="dsa-card" style="max-width:620px;margin:0 auto;background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 30px 70px -24px rgba(18,51,59,0.22);">

      <!-- Header — soft light blue that blends down into the white body -->
      <div class="dsa-head" style="background-color:#E5F1F8;background-image:linear-gradient(180deg,#E3F0F8 0%, #F1F8FC 60%, #FFFFFF 100%);padding:60px 48px 42px;text-align:center;">
        <img src="cid:brandlogo" alt="DermaScope.ai" width="200" style="width:200px;max-width:66%;height:auto;display:inline-block;border:0;" />
      </div>

      <!-- Body -->
      <div class="dsa-pad" style="padding:14px 52px 48px;">${body}
      </div>

      <!-- Footer — same light blue, blending up from the white body to frame it -->
      <div class="dsa-pad dsa-foot" style="background-color:#E5F1F8;background-image:linear-gradient(180deg,#FFFFFF 0%, #F1F8FC 44%, #E3F0F8 100%);padding:48px 52px 54px;text-align:center;">
        <div style="font-size:13px;line-height:1.7;color:#51636B;font-family:${FONT};">&copy; ${year} DermaScope.ai — All rights reserved.</div>
        <div style="margin:14px auto 0;max-width:440px;font-size:12.5px;line-height:1.8;color:#7C8D94;font-family:${FONT};">AI outputs are intended to support&mdash;not replace&mdash;clinical judgment. Every final clinical decision remains in human hands.</div>
      </div>

    </div>
  </div>
</body>
</html>`;
}

// ─── Validate contact payload ─────────────────────────────────────────────────
// Mirrors the early-access form's required fields (client validates first; the
// server is the backstop). Practice-information fields (physicians, emr,
// challenges) remain optional.
function isConsented(v) {
  return v === true || (typeof v === 'string' && ['true', 'yes', 'on', '1'].includes(v.trim().toLowerCase()));
}

function validateContact(b) {
  const errors = [];
  const req = (v) => typeof v === 'string' && v.trim().length > 0;
  if (!b.name || typeof b.name !== 'string' || b.name.trim().length < 2) errors.push('Please enter your full name.');
  if (!b.email || typeof b.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) errors.push('Please enter a valid email address.');
  if (!req(b.title))        errors.push('Please enter your professional title.');
  if (!req(b.specialty))    errors.push('Please enter your specialty.');
  if (!req(b.organization)) errors.push('Please enter your clinic, hospital, or organization.');
  if (!req(b.country))      errors.push('Please select your country.');
  if (!req(b.city))         errors.push('Please enter your city.');
  if (!req(b.phone))        errors.push('Please enter your mobile / WhatsApp number.');
  if (!req(b.interest))     errors.push('Please enter your type of interest.');
  if (!isConsented(b.consent)) errors.push('Please confirm your consent to be contacted.');
  return errors;
}

// ─── POST /api/contact ────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email } = req.body;

  const errors = validateContact(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const recipient = process.env.EMAIL_TO || 'customer.service@everlastwellness.com';

  const now = new Date();
  const year = now.getFullYear();
  const submittedAt = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Dubai',
  }).format(now);

  // Build the applicant fields dynamically so EVERY submitted field is shown —
  // including any the form adds later. Known keys get a friendly label + icon
  // and a sensible order; unknown keys are included with a prettified label.
  const FIELD_META = {
    name:         { label: 'Full Name' },
    title:        { label: 'Professional Title' },
    specialty:    { label: 'Specialty' },
    org:          { label: 'Clinic / Hospital / Organization' },
    organization: { label: 'Clinic / Hospital / Organization' },
    company:      { label: 'Clinic / Hospital / Organization' },
    role:         { label: 'Role' },
    country:      { label: 'Country' },
    city:         { label: 'City' },
    email:        { label: 'Email Address', isEmail: true },
    phone:        { label: 'Mobile / WhatsApp' },
    interest:     { label: 'Type of Interest' },
    physicians:   { label: 'Physicians in Organization' },
    emr:          { label: 'Current EMR / HIS' },
    challenges:   { label: 'Main Challenge to Solve', type: 'list' },
    consent:      { label: 'Consent', type: 'boolean' },
    message:      { label: 'Additional Notes' },
    notes:        { label: 'Additional Notes' },
  };
  const FIELD_ORDER = [
    'name', 'title', 'specialty', 'organization', 'org', 'company', 'role', 'country', 'city',
    'email', 'phone', 'interest', 'physicians', 'emr', 'challenges', 'message', 'notes', 'consent',
  ];

  const prettify = (key) =>
    key.replace(/[_-]+/g, ' ')
       .replace(/([a-z])([A-Z])/g, '$1 $2')
       .replace(/\b\w/g, (c) => c.toUpperCase());

  const body = req.body || {};
  const used = new Set();
  const fields = [];
  const addField = (key) => {
    if (used.has(key)) return;
    const raw = body[key];
    const meta = FIELD_META[key] || { label: prettify(key) };
    const type = meta.type || (meta.isEmail ? 'email' : 'text');

    // Consent — always shown as an explicit Yes / No (skip only if absent).
    if (type === 'boolean') {
      if (raw === undefined) return;
      used.add(key);
      fields.push({ label: meta.label, type: 'boolean', value: isConsented(raw) ? 'Yes' : 'No' });
      return;
    }

    // Multi-select (e.g. Main Challenge to Solve) — rendered as a bulleted list.
    if (type === 'list') {
      const items = (Array.isArray(raw) ? raw : String(raw ?? '').split(','))
        .map((s) => String(s).trim())
        .filter(Boolean);
      if (items.length === 0) return; // optional — skip when nothing selected
      used.add(key);
      fields.push({ label: meta.label, type: 'list', items });
      return;
    }

    // Plain text / email.
    if (raw == null || String(raw).trim() === '') return;
    used.add(key);
    fields.push({ label: meta.label, type, value: String(raw).trim() });
  };
  FIELD_ORDER.forEach(addField);        // preferred fields, in order
  Object.keys(body).forEach(addField);  // then any additional submitted fields

  // Each field is rendered like a read-only premium form input: an uppercase
  // muted label above a soft, borderless rounded value block. No tables, icons,
  // dividers or cards. Multi-line values expand naturally (like a textarea).
  const fieldsHtml = fields.map((f, i) => {
    let inner;
    if (f.type === 'list') {
      inner = f.items.map((it, j) =>
        `<div style="display:flex;align-items:flex-start;gap:11px;${j === f.items.length - 1 ? '' : 'margin:0 0 10px;'}">
                  <span style="flex:0 0 auto;margin-top:9px;width:6px;height:6px;border-radius:50%;background:#4C8F88;"></span>
                  <span>${escapeHtml(it)}</span>
                </div>`).join('');
    } else if (f.type === 'boolean') {
      const yes = f.value === 'Yes';
      inner = `<span style="font-weight:700;color:${yes ? '#1B6E7C' : '#C0392B'};">${escapeHtml(f.value)}</span>`;
    } else if (f.type === 'email') {
      inner = `<a href="mailto:${escapeHtml(f.value)}" style="color:#1B4754;text-decoration:none;">${escapeHtml(f.value)}</a>`;
    } else {
      inner = escapeHtml(f.value);
    }
    const mb = i === fields.length - 1 ? '0' : '26px';
    return `
              <div style="margin:0 0 ${mb};">
                <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#7A8B92;font-weight:600;margin:0 0 10px;font-family:${FONT};">${escapeHtml(f.label)}</div>
                <div style="background:#F4F9FC;border-radius:14px;padding:17px 20px;font-size:16.5px;color:#243746;font-weight:500;line-height:1.65;white-space:pre-wrap;word-break:break-word;overflow-wrap:break-word;font-family:${FONT};">${inner}</div>
              </div>`;
  }).join('');

  const fieldsText = fields.map((f) => {
    if (f.type === 'list') return `${f.label}:\n${f.items.map((it) => `  • ${it}`).join('\n')}`;
    return `${f.label}: ${f.value}`;
  }).join('\n');

  const mailOptions = {
    from:    `"DermaScope.ai" <${process.env.EMAIL_USER}>`,
    to:      recipient,
    replyTo: email,
    subject: `New Early-Access Request — ${name}`,
    attachments: [
      { filename: 'logo.png', path: LOGO_PATH, cid: 'brandlogo' },
    ],
    text: `New Early Access Request
A new user has submitted the Join Early Access form.
Submitted: ${submittedAt} (GST)

${fieldsText}

Why this matters
This request was submitted through the DermaScope.ai Early Access program and may represent a potential customer interested in joining the platform.

© ${year} DermaScope.ai — All rights reserved.`,
    html: emailLayout({
      preheader: `New Early Access request from ${escapeHtml(name)}`,
      body: `
            <div style="text-align:center;">
              <div class="dsa-h1" style="font-size:28px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:#12333B;">New Early Access Request</div>
              <div style="margin-top:14px;font-size:16px;line-height:1.7;color:#4A5E64;">A new user has submitted the Join Early Access form.</div>
              <div style="margin-top:18px;font-size:12.5px;color:#98A8AE;letter-spacing:0.3px;">Submitted&nbsp;&middot;&nbsp;${submittedAt} (GST)</div>
            </div>

            <div style="height:1px;background:#EAF1F3;margin:38px 0;font-size:0;line-height:0;">&nbsp;</div>

            <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#4C8F88;font-family:${FONT};">Applicant Information</div>
            <div style="margin-top:20px;">${fieldsHtml}
            </div>

            <div style="margin-top:36px;background:#EDF7FB;border-radius:16px;padding:24px 26px;">
              <div style="font-size:12.5px;letter-spacing:0.6px;text-transform:uppercase;font-weight:700;color:#1B6E7C;margin-bottom:10px;font-family:${FONT};">Why this matters</div>
              <div style="font-size:15px;line-height:1.75;color:#3A4E54;font-family:${FONT};">This request was submitted through the DermaScope.ai Early Access program and may represent a potential customer interested in joining the platform.</div>
            </div>`,
    }),
  };

  // ── Confirmation email sent TO THE USER ──────────────────────────────────────
  // A fully standalone template (independent of the admin notification /
  // emailLayout): a clean WHITE page with one centered white card set off by a
  // soft shadow + rounded corners, generous whitespace, logo → welcome → short
  // message → a single primary CTA → footer. Minimal, premium, table/icon-free.
  const SITE_URL = process.env.SITE_URL || 'https://dermascope.ai';

  const confirmationMail = {
    from:    `"DermaScope.ai" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: 'Welcome to DermaScope.ai — your Early Access request has been received',
    attachments: [
      { filename: 'logo.png', path: LOGO_PATH, cid: 'brandlogo' },
    ],
    text: `Welcome to DermaScope.ai

Thank you for joining our Early Access program. We've successfully received your request.

Our team will review your submission and will contact you as soon as Early Access becomes available.

Visit DermaScope.ai: ${SITE_URL}

© ${year} DermaScope.ai — All rights reserved.
AI outputs are intended to support—not replace—clinical judgment. Every final clinical decision remains in human hands.`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light" />
<title>Welcome to DermaScope.ai</title>
<style>
  body { margin:0; padding:0; background:#FFFFFF; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
  a { text-decoration:none; }
  .dsc-cta { transition: background-color .2s ease, box-shadow .2s ease, transform .2s ease; }
  .dsc-cta:hover { background-color:#21525A !important; box-shadow:0 16px 32px -12px rgba(18,51,59,0.55) !important; transform:translateY(-1px); }
  @media only screen and (max-width:640px) {
    .dsc-wrap { padding:36px 18px !important; }
    .dsc-card { padding:40px 28px 34px !important; }
    .dsc-h1 { font-size:26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#FFFFFF;">We&rsquo;ve received your DermaScope.ai Early Access request.</div>
  <div class="dsc-wrap" style="width:100%;background:#FFFFFF;padding:64px 24px;">

    <!-- Single centered white card, set off from the white page by a soft shadow -->
    <div class="dsc-card" style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:22px;overflow:hidden;box-shadow:0 14px 48px -12px rgba(18,51,59,0.18);padding:56px 56px 44px;text-align:center;">

      <img src="cid:brandlogo" alt="DermaScope.ai" width="190" style="width:190px;max-width:60%;height:auto;display:inline-block;border:0;" />

      <div class="dsc-h1" style="margin-top:40px;font-size:30px;line-height:1.22;font-weight:700;letter-spacing:-0.022em;color:#12333B;">Welcome to DermaScope.ai</div>

      <div style="width:48px;height:3px;border-radius:3px;background:#A5E7F8;margin:24px auto 0;font-size:0;line-height:0;">&nbsp;</div>

      <div style="margin:30px auto 0;max-width:452px;font-size:16.5px;line-height:1.85;color:#243746;">
        Thank you for joining our Early Access program. We&rsquo;ve successfully received your request.
        <br /><br />
        Our team will review your submission and will be in touch as soon as Early Access becomes available.
      </div>

      <div style="margin-top:40px;">
        <a class="dsc-cta" href="${SITE_URL}" target="_blank" style="display:inline-block;background-color:#285F66;color:#FFFFFF;font-size:16px;font-weight:700;line-height:1;text-decoration:none;padding:18px 44px;border-radius:999px;letter-spacing:0.01em;font-family:${FONT};box-shadow:0 12px 26px -12px rgba(27,71,84,0.5);">Visit DermaScope.ai</a>
      </div>

      <div style="height:1px;background:#EAF1F4;margin:46px 0 0;font-size:0;line-height:0;">&nbsp;</div>
      <div style="padding-top:28px;">
        <div style="font-size:12.5px;line-height:1.7;color:#8496A0;">&copy; ${year} DermaScope.ai — All rights reserved.</div>
        <div style="margin:12px auto 0;max-width:430px;font-size:11.5px;line-height:1.8;color:#9FADB4;">AI outputs are intended to support&mdash;not replace&mdash;clinical judgment. Every final clinical decision remains in human hands.</div>
      </div>

    </div>
  </div>
</body>
</html>`,
  };

  try {
    // Internal notification is the critical send — its failure fails the request.
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Nodemailer error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to send email. Please try again.' });
  }

  // Confirmation to the user is best-effort — never blocks the submission.
  try {
    await transporter.sendMail(confirmationMail);
  } catch (err) {
    console.error('Confirmation email error:', err.message);
  }

  return res.status(200).json({ success: true, message: 'Email sent successfully.' });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Serve the built frontend (single-service production) ───────────────────────
// When a Vite build exists, serve it as static files and fall back to index.html
// for client-side routing. In dev the frontend is served by Vite instead, so this
// block is simply skipped when dist/ is absent.
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  console.log('  ✓  Serving frontend build from /dist');
} else {
  console.log('  ℹ  No /dist build found — API-only mode (run "npm run build" for production)');
}

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ✦  DermaScope.ai server running at http://localhost:${PORT}\n`);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
}
