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

  // Brand font stack: Outfit (brand) with robust, email-safe system fallbacks.
  const FONT = "'Outfit','Segoe UI',Roboto,Helvetica,Arial,sans-serif";

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
    html: `
      <div style="margin:0;padding:0;background:#F4F8F9;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F4F8F9;">New Early Access request from ${escapeHtml(name)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F8F9;">
          <tr>
            <td align="center" style="padding:40px 16px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(18,51,59,0.08);">

                <!-- Logo -->
                <tr>
                  <td align="center" style="padding:46px 40px 0;">
                    <img src="cid:brandlogo" alt="DermaScope.ai" width="180" style="width:180px;max-width:58%;height:auto;display:inline-block;border:0;" />
                  </td>
                </tr>

                <!-- Title + intro + timestamp -->
                <tr>
                  <td align="center" style="padding:26px 40px 0;font-family:${FONT};">
                    <div style="font-size:23px;line-height:1.3;font-weight:700;letter-spacing:-0.01em;color:#12333B;">New Early Access Request</div>
                    <div style="margin-top:10px;font-size:15px;line-height:1.6;color:#5E7178;">A new user has submitted the Join Early Access form.</div>
                    <div style="margin-top:16px;font-size:12px;color:#9AAAB0;letter-spacing:0.3px;">Submitted&nbsp;&middot;&nbsp;${submittedAt} (GST)</div>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding:30px 40px 0;">
                    <div style="height:1px;background:#EAF1F3;font-size:0;line-height:0;">&nbsp;</div>
                  </td>
                </tr>

                <!-- Applicant information -->
                <tr>
                  <td style="padding:26px 40px 0;font-family:${FONT};">
                    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#4C8F88;">Applicant Information</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 40px 0;font-family:${FONT};">${fieldsHtml}
                  </td>
                </tr>

                <!-- Callout -->
                <tr>
                  <td style="padding:30px 40px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF8FB;border-radius:14px;">
                      <tr>
                        <td style="padding:20px 22px;font-family:${FONT};">
                          <div style="font-size:12px;letter-spacing:0.5px;text-transform:uppercase;font-weight:700;color:#1B6E7C;margin-bottom:8px;">Why this matters</div>
                          <div style="font-size:14px;line-height:1.7;color:#4A5E64;">This request was submitted through the DermaScope.ai Early Access program and may represent a potential customer interested in joining the platform.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:34px 40px 42px;text-align:center;font-family:${FONT};">
                    <div style="height:1px;background:#EAF1F3;font-size:0;line-height:0;margin-bottom:26px;">&nbsp;</div>
                    <div style="font-size:12px;color:#8A9BA1;line-height:1.6;">&copy; ${year} DermaScope.ai — All rights reserved.</div>
                    <div style="margin:12px auto 0;max-width:440px;font-size:11.5px;color:#A6B4B9;line-height:1.7;">AI outputs are intended to support — not replace — clinical judgment. Every final clinical decision remains in human hands.</div>
                    <div style="margin-top:16px;font-size:11px;color:#B7C3C7;">Crafted with <span style="color:#E0736E;">&#10084;</span> by Human Studio Labs</div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
  };

  // ── Confirmation email sent TO THE USER ──────────────────────────────────────
  // A calm, premium "we received your request" message. Table-free, icon-free,
  // built from stacked blocks with hairline dividers (Apple / Stripe / Linear feel).
  const nextSteps = [
    'Your request has been received successfully.',
    'Our team will review your submission.',
    'Eligible participants will receive an invitation as Early Access becomes available.',
    'We will contact you using the email you provided.',
  ];
  const highlights = [
    'AI-assisted analysis for 300+ skin conditions',
    'Multi-angle clinical imaging',
    'Structured clinical documentation',
    'Longitudinal patient monitoring',
    'Explainable AI with physician oversight',
  ];
  const dividedList = (items) =>
    items
      .map(
        (t, i) =>
          `<div style="padding:13px 0;font-size:15px;line-height:1.65;color:#3E5257;font-family:${FONT};${i > 0 ? 'border-top:1px solid #EEF3F5;' : ''}">${escapeHtml(t)}</div>`,
      )
      .join('');

  const confirmationMail = {
    from:    `"DermaScope.ai" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: 'Welcome to DermaScope.ai — your Early Access request has been received',
    attachments: [
      { filename: 'logo.png', path: LOGO_PATH, cid: 'brandlogo' },
    ],
    text: `Welcome to DermaScope.ai

Thank you for joining the Early Access program. Your request has been successfully received — you're among the first healthcare professionals interested in experiencing the platform.

What happens next?
${nextSteps.map((s) => `- ${s}`).join('\n')}

Platform highlights
${highlights.map((s) => `- ${s}`).join('\n')}

Thank you for your interest in DermaScope.ai. We look forward to welcoming you to DermaScope.ai.

— The DermaScope.ai Team

© ${year} DermaScope.ai — All rights reserved.
AI outputs are intended to support—not replace—clinical judgment. Every final clinical decision remains in human hands.
Crafted with love by Human Studio Labs`,
    html: `
      <div style="margin:0;padding:0;background:#F4F8F9;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F4F8F9;">Your DermaScope.ai Early Access request has been received.</div>
        <div style="max-width:600px;margin:0 auto;padding:40px 16px;font-family:${FONT};">
          <div style="background:#FFFFFF;border-radius:20px;box-shadow:0 12px 40px rgba(18,51,59,0.08);padding:48px 40px 40px;">

            <!-- Logo -->
            <div style="text-align:center;">
              <img src="cid:brandlogo" alt="DermaScope.ai" width="180" style="width:180px;max-width:58%;height:auto;display:inline-block;border:0;" />
            </div>

            <!-- Title -->
            <div style="text-align:center;margin-top:30px;font-size:24px;line-height:1.3;font-weight:700;letter-spacing:-0.01em;color:#12333B;">Welcome to DermaScope.ai</div>

            <!-- Intro -->
            <div style="text-align:center;margin:16px auto 0;max-width:470px;font-size:15px;line-height:1.75;color:#5E7178;">
              Thank you for joining the Early Access program. Your request has been successfully received — you are among the first healthcare professionals interested in experiencing the platform.
            </div>

            <!-- Divider -->
            <div style="height:1px;background:#EAF1F3;margin:34px 0;font-size:0;line-height:0;">&nbsp;</div>

            <!-- What happens next -->
            <div style="font-size:17px;font-weight:700;letter-spacing:-0.01em;color:#12333B;">What happens next?</div>
            <div style="margin-top:6px;">${dividedList(nextSteps)}</div>

            <!-- Divider -->
            <div style="height:1px;background:#EAF1F3;margin:34px 0;font-size:0;line-height:0;">&nbsp;</div>

            <!-- Platform highlights -->
            <div style="font-size:17px;font-weight:700;letter-spacing:-0.01em;color:#12333B;">Platform highlights</div>
            <div style="margin-top:6px;font-size:14px;line-height:1.7;color:#7A8B92;">A closer look at what DermaScope.ai brings to clinical skin assessment.</div>
            <div style="margin-top:6px;">${dividedList(highlights)}</div>

            <!-- Divider -->
            <div style="height:1px;background:#EAF1F3;margin:34px 0;font-size:0;line-height:0;">&nbsp;</div>

            <!-- Closing -->
            <div style="font-size:15px;line-height:1.75;color:#3E5257;">Thank you for your interest in DermaScope.ai. We look forward to welcoming you to DermaScope.ai.</div>
            <div style="margin-top:18px;font-size:15px;font-weight:600;color:#1B4754;">— The DermaScope.ai Team</div>

            <!-- Footer -->
            <div style="height:1px;background:#EAF1F3;margin:36px 0 24px;font-size:0;line-height:0;">&nbsp;</div>
            <div style="text-align:center;">
              <div style="font-size:12px;color:#8A9BA1;line-height:1.6;">&copy; ${year} DermaScope.ai — All rights reserved.</div>
              <div style="margin:12px auto 0;max-width:450px;font-size:11.5px;color:#A6B4B9;line-height:1.7;">AI outputs are intended to support—not replace—clinical judgment. Every final clinical decision remains in human hands.</div>
              <div style="margin-top:16px;font-size:11px;color:#B7C3C7;">Crafted with <span style="color:#E0736E;">&#10084;</span> by Human Studio Labs</div>
            </div>

          </div>
        </div>
      </div>
    `,
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
