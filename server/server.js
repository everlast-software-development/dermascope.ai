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
  return `
    <div style="margin:0;padding:0;background:#EAF3F7;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EAF3F7;">${preheader}</div>
      <div style="max-width:600px;margin:0 auto;padding:34px 16px;font-family:${FONT};">
        <div style="border-radius:24px;overflow:hidden;box-shadow:0 22px 60px rgba(18,51,59,0.12);">

          <!-- Frosted-glass header: soft blue gradient + gentle top glow -->
          <div style="background-color:#E7F2F8;background-image:radial-gradient(120% 150% at 50% 0%, #F7FBFD 0%, #E8F3F9 55%, #D9EDF6 100%);padding:52px 40px;text-align:center;border-bottom:1px solid rgba(27,71,84,0.08);">
            <img src="cid:brandlogo" alt="DermaScope.ai" width="188" style="width:188px;max-width:62%;height:auto;display:inline-block;border:0;" />
          </div>

          <!-- Body -->
          <div style="background:#FFFFFF;padding:46px 44px 48px;">${body}
          </div>

          <!-- Smooth white → navy transition -->
          <div style="height:40px;background-color:#143741;background-image:linear-gradient(180deg,#FFFFFF 0%, #143741 100%);font-size:0;line-height:0;">&nbsp;</div>

          <!-- Soft navy footer -->
          <div style="background-color:#143741;background-image:linear-gradient(180deg,#143741 0%, #0E2A31 100%);padding:8px 40px 46px;text-align:center;">
            <div style="font-size:12px;line-height:1.6;color:rgba(233,244,247,0.74);font-family:${FONT};">&copy; ${year} DermaScope.ai — All rights reserved.</div>
            <div style="margin:12px auto 0;max-width:460px;font-size:11.5px;line-height:1.75;color:rgba(233,244,247,0.5);font-family:${FONT};">AI outputs are intended to support&mdash;not replace&mdash;clinical judgment. Every final clinical decision remains in human hands.</div>
          </div>

        </div>
      </div>
    </div>`;
}

// ─── Validate contact payload ─────────────────────────────────────────────────
// Matches the early-access form: name + email are required; role, org and
// message are optional.
function validateContact({ name, email }) {
  const errors = [];
  if (!name  || typeof name  !== 'string' || name.trim().length < 2) errors.push('Please enter your full name.');
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please enter a valid email address.');
  return errors;
}

// ─── POST /api/contact ────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email } = req.body;

  const errors = validateContact({ name, email });
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
    email:        { label: 'Email Address', isEmail: true },
    org:          { label: 'Clinic / Organization' },
    organization: { label: 'Clinic / Organization' },
    company:      { label: 'Clinic / Organization' },
    role:         { label: 'Role' },
    country:      { label: 'Country' },
    phone:        { label: 'Phone' },
    message:      { label: 'Additional Notes' },
    notes:        { label: 'Additional Notes' },
  };
  const FIELD_ORDER = ['name', 'email', 'org', 'organization', 'company', 'role', 'country', 'phone', 'message', 'notes'];

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
    if (raw == null || String(raw).trim() === '') return;
    const meta = FIELD_META[key] || { label: prettify(key) };
    fields.push({
      label: meta.label,
      value: String(raw).trim(),
      isEmail: !!meta.isEmail,
    });
    used.add(key);
  };
  FIELD_ORDER.forEach(addField);        // preferred fields, in order
  Object.keys(body).forEach(addField);  // then any additional submitted fields

  // Each field is rendered like a read-only premium form input: an uppercase
  // muted label above a soft, borderless rounded value block. No tables, icons,
  // dividers or cards. Multi-line values expand naturally (like a textarea).
  const fieldsHtml = fields.map((f, i) => {
    const inner = f.isEmail
      ? `<a href="mailto:${escapeHtml(f.value)}" style="color:#1B4754;text-decoration:none;">${escapeHtml(f.value)}</a>`
      : escapeHtml(f.value);
    const mb = i === fields.length - 1 ? '0' : '24px';
    return `
              <div style="margin:0 0 ${mb};">
                <div style="font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#8A9BA1;font-weight:600;margin:0 0 9px;font-family:${FONT};">${escapeHtml(f.label)}</div>
                <div style="background:#F5F9FC;border-radius:14px;padding:15px 18px;font-size:16px;color:#1B4754;font-weight:500;line-height:1.6;white-space:pre-wrap;word-break:break-word;overflow-wrap:break-word;font-family:${FONT};">${inner}</div>
              </div>`;
  }).join('');

  const fieldsText = fields.map((f) => `${f.label}: ${f.value}`).join('\n');

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
              <div style="font-size:23px;line-height:1.3;font-weight:700;letter-spacing:-0.015em;color:#12333B;">New Early Access Request</div>
              <div style="margin-top:10px;font-size:15px;line-height:1.6;color:#5E7178;">A new user has submitted the Join Early Access form.</div>
              <div style="margin-top:16px;font-size:12px;color:#9AAAB0;letter-spacing:0.3px;">Submitted&nbsp;&middot;&nbsp;${submittedAt} (GST)</div>
            </div>

            <div style="height:1px;background:#EAF1F3;margin:32px 0;font-size:0;line-height:0;">&nbsp;</div>

            <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#4C8F88;font-family:${FONT};">Applicant Information</div>
            <div style="margin-top:16px;">${fieldsHtml}
            </div>

            <div style="margin-top:30px;background:#EEF8FB;border-radius:14px;padding:20px 22px;">
              <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;font-weight:700;color:#1B6E7C;margin-bottom:8px;font-family:${FONT};">Why this matters</div>
              <div style="font-size:14px;line-height:1.7;color:#4A5E64;font-family:${FONT};">This request was submitted through the DermaScope.ai Early Access program and may represent a potential customer interested in joining the platform.</div>
            </div>`,
    }),
  };

  // ── Confirmation email sent TO THE USER ──────────────────────────────────────
  // A calm, premium "we received your request" message that mirrors the landing
  // page: centered card, soft shadow, a subtle brand separator and one clear CTA.
  // Table-free, icon-free, emoji-free.
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
    html: emailLayout({
      preheader: 'We’ve received your DermaScope.ai Early Access request.',
      body: `
            <div style="text-align:center;font-size:25px;line-height:1.3;font-weight:700;letter-spacing:-0.015em;color:#12333B;">Welcome to DermaScope.ai</div>

            <div style="width:46px;height:3px;border-radius:3px;background:#A5E7F8;margin:22px auto 0;font-size:0;line-height:0;">&nbsp;</div>

            <div style="text-align:center;margin:28px auto 0;max-width:456px;font-size:15.5px;line-height:1.8;color:#5E7178;">
              Thank you for joining our Early Access program. We&rsquo;ve successfully received your request.
              <br /><br />
              Our team will review your submission and will contact you as soon as Early Access becomes available.
            </div>

            <div style="text-align:center;margin-top:38px;">
              <a href="${SITE_URL}" target="_blank" style="display:inline-block;background:#285F66;color:#FFFFFF;font-size:15px;font-weight:600;line-height:1;text-decoration:none;padding:16px 36px;border-radius:999px;letter-spacing:0.01em;font-family:${FONT};">Visit DermaScope.ai</a>
            </div>`,
    }),
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
