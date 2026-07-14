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
  const { name, email, role, org, message } = req.body;

  const errors = validateContact({ name, email });
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const recipient = process.env.EMAIL_TO || 'customer.service@everlastwellness.com';

  const year = new Date().getFullYear();

  // Optional fields — fall back to a dash so the email always reads cleanly.
  const roleText = (role && String(role).trim()) || '—';
  const orgText  = (org  && String(org).trim())  || '—';
  const hasMessage = message && String(message).trim().length > 0;

  const mailOptions = {
    from:    `"DermaScope.ai" <${process.env.EMAIL_USER}>`,
    to:      recipient,
    replyTo: email,
    subject: `New Early-Access Request — ${name}`,
    attachments: [
      { filename: 'logo.png', path: LOGO_PATH, cid: 'brandlogo' },
    ],
    text: `
Name:          ${name}
Email:         ${email}
Role:          ${roleText}
Organization:  ${orgText}

Message:
${hasMessage ? message : 'No message provided.'}
    `.trim(),
    html: `
      <div style="margin:0;padding:32px 12px;background:#F5FBFD;font-family:'Outfit','Helvetica Neue',Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #DCECEF;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(27,71,84,0.10);">
          <!-- Brand accent bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#1B4754,#285F66 55%,#A5E7F8);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header with logo -->
          <tr>
            <td style="padding:38px 40px 26px;text-align:center;background:linear-gradient(180deg,#F5FBFD,#FFFFFF);">
              <img src="cid:brandlogo" alt="DermaScope.ai" style="height:46px;width:auto;" />
              <div style="margin-top:18px;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;color:#285F66;">New Early-Access Request</div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#DCECEF,transparent);font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>

          <!-- Contact details -->
          <tr>
            <td style="padding:26px 40px 6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #EDF4F6;">
                    <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7A8B92;margin-bottom:5px;">Name</div>
                    <div style="font-size:15px;color:#1B4754;font-weight:600;">${escapeHtml(name)}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #EDF4F6;">
                    <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7A8B92;margin-bottom:5px;">Email</div>
                    <div style="font-size:15px;"><a href="mailto:${escapeHtml(email)}" style="color:#285F66;text-decoration:none;font-weight:500;">${escapeHtml(email)}</a></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #EDF4F6;">
                    <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7A8B92;margin-bottom:5px;">Role</div>
                    <div style="font-size:15px;color:#2F4148;">${escapeHtml(roleText)}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;">
                    <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7A8B92;margin-bottom:5px;">Organization</div>
                    <div style="font-size:15px;color:#2F4148;">${escapeHtml(orgText)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding:10px 40px 34px;">
              <div style="padding:22px 24px;background:#F5FBFD;border:1px solid #DCECEF;border-radius:14px;">
                <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7A8B92;margin-bottom:12px;">Message</div>
                <div style="font-size:14.5px;color:${hasMessage ? '#2F4148' : '#9AAAB0'};line-height:1.75;white-space:pre-wrap;">${hasMessage ? escapeHtml(message) : 'No message provided.'}</div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;text-align:center;background:#F5FBFD;border-top:1px solid #DCECEF;">
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#285F66;font-weight:600;margin-bottom:8px;">DermaScope.ai</div>
              <div style="font-size:11px;color:#9AAAB0;letter-spacing:0.4px;line-height:1.6;">
                Physician-supervised clinical AI<br />
                &copy; ${year} DermaScope.ai &middot; Everlast Wellness Medical Center &middot; Abu Dhabi, UAE
              </div>
            </td>
          </tr>
        </table>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: 'Email sent successfully.' });
  } catch (err) {
    console.error('Nodemailer error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to send email. Please try again.' });
  }
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
