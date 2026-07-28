'use strict';

const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');
const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const jwt        = require('jsonwebtoken');

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

// Trust the first proxy hop (Railway/Cloudflare terminate TLS upstream) so
// req.secure / req.ip reflect the real client connection — needed to mark
// the operator session cookie Secure correctly and to key login rate-limiting
// by real client IP rather than the proxy's.
app.set('trust proxy', 1);

// ─── Middleware ───────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:4173',  // Vite preview
  'https://dermascope.ai',
  'https://www.dermascope.ai',
];

app.use(express.json());
app.use(express.urlencoded({ extended: false })); // OAuth token requests use form-encoded bodies (RFC 6749 §4.4.2)
app.use(cors({
  origin: ALLOWED_ORIGINS,
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

// ─── Google Sheets (Apps Script Web App) integration ────────────────────────────
// Best-effort mirror of every submission into a Google Sheet, via a deployed
// Google Apps Script Web App (see /google-apps-script for the script + a
// step-by-step deploy guide). This NEVER blocks or fails the request: email is
// the source of truth, so any Sheets error is logged and swallowed. Configure by
// setting GOOGLE_SHEETS_WEBAPP_URL (and, optionally, GOOGLE_SHEETS_SECRET) in the
// server environment. When the URL is absent, the append is simply skipped.
const SHEETS_WEBAPP_URL    = process.env.GOOGLE_SHEETS_WEBAPP_URL || '';
const SHEETS_SHARED_SECRET = process.env.GOOGLE_SHEETS_SECRET || '';

async function appendToGoogleSheet(payload, timestampIso) {
  if (!SHEETS_WEBAPP_URL) {
    console.log('  ℹ  GOOGLE_SHEETS_WEBAPP_URL not set — skipping Google Sheets append');
    return;
  }

  // Guard against a slow/hanging endpoint delaying the user's response.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(SHEETS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow', // Apps Script Web Apps answer via a 302 to script.googleusercontent.com
      signal: controller.signal,
      body: JSON.stringify({
        token:        SHEETS_SHARED_SECRET,
        timestamp:    timestampIso,
        name:         payload.name ?? '',
        title:        payload.title ?? '',
        specialty:    payload.specialty ?? '',
        organization: payload.organization ?? '',
        country:      payload.country ?? '',
        city:         payload.city ?? '',
        email:        payload.email ?? '',
        phone:        payload.phone ?? '',
        interest:     payload.interest ?? '',
        physicians:   payload.physicians ?? '',
        emr:          payload.emr ?? '',
        challenges:   Array.isArray(payload.challenges)
                        ? payload.challenges.join(', ')
                        : (payload.challenges ?? ''),
        consent:      isConsented(payload.consent) ? 'Yes' : 'No',
      }),
    });

    if (!res.ok) {
      console.error(`Google Sheets append failed: HTTP ${res.status}`);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.result !== 'success') {
      console.error('Google Sheets append returned an unexpected response:', JSON.stringify(data));
    } else {
      console.log('  ✓  Submission appended to Google Sheet');
    }
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'request timed out' : err.message;
    console.error('Google Sheets append error:', reason);
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Local submissions store (backs the protected admin API below) ──────────────
// Lightweight JSON-Lines file — no database in this project. Best-effort, mirrors
// the pattern used for Google Sheets: a write failure here is logged and never
// blocks or fails the /api/contact request. NOTE: on Railway (or any host without
// a persistent volume mounted at this path) this file resets on every redeploy —
// Google Sheets remains the durable record; this store only exists to back
// GET /api/admin/submissions for quick programmatic reads. See
// docs/oauth-admin-api.md.
const SUBMISSIONS_DIR  = path.join(__dirname, 'data');
const SUBMISSIONS_FILE = path.join(SUBMISSIONS_DIR, 'submissions.jsonl');

function appendSubmissionRecord(payload, timestampIso) {
  try {
    fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
    const record = {
      timestamp:    timestampIso,
      name:         payload.name ?? '',
      title:        payload.title ?? '',
      specialty:    payload.specialty ?? '',
      organization: payload.organization ?? '',
      country:      payload.country ?? '',
      city:         payload.city ?? '',
      email:        payload.email ?? '',
      phone:        payload.phone ?? '',
      interest:     payload.interest ?? '',
      physicians:   payload.physicians ?? '',
      emr:          payload.emr ?? '',
      challenges:   Array.isArray(payload.challenges) ? payload.challenges : (payload.challenges ? [payload.challenges] : []),
      consent:      isConsented(payload.consent),
    };
    fs.appendFileSync(SUBMISSIONS_FILE, JSON.stringify(record) + '\n');
  } catch (err) {
    console.error('Failed to persist submission record:', err.message);
  }
}

function readSubmissions() {
  try {
    const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
    return raw.split('\n').filter(Boolean).map((line) => JSON.parse(line)).reverse(); // newest first
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Failed to read submissions store:', err.message);
    return [];
  }
}

// ─── OAuth 2.0 authorization server (RFC 6749 / RFC 8414) + auth.md ─────────────
// Two independent ways to get an access token for GET /api/admin/submissions:
//   1. client_credentials (RFC 6749 §4.4) — a static, operator-provisioned
//      client (OAUTH_ADMIN_CLIENT_ID/SECRET). For the operator's own scripts.
//   2. The full canonical auth.md "service_auth" flow (github.com/workos/auth.md,
//      fetched and implemented in full, not summarized): an agent registers
//      with only a login_hint (a human's email), the operator confirms a
//      6-digit code in a browser (the claim ceremony), and the agent then
//      holds a long-lived, service-signed identity_assertion it exchanges for
//      access tokens via the RFC 7523 JWT-bearer grant. This is what makes
//      "service_auth" actually complete per spec — earlier revisions of this
//      endpoint issued a client_secret immediately with no human in the loop,
//      which (correctly) didn't count. Full setup: docs/oauth-admin-api.md.
const ISSUER       = (process.env.SITE_URL || 'https://dermascope.ai').replace(/\/$/, '');
const RESOURCE_URI = `${ISSUER}/api/admin`;
const ADMIN_SCOPE  = 'admin:submissions:read';
const TOKEN_TTL_S  = 3600;
const ASSERTION_TTL_S = 60 * 60 * 24 * 30; // 30 days — the identity_assertion is the durable credential a claimed agent holds; see signing-key persistence note below.

const ADMIN_CLIENT_ID     = process.env.OAUTH_ADMIN_CLIENT_ID || '';
const ADMIN_CLIENT_SECRET = process.env.OAUTH_ADMIN_CLIENT_SECRET || '';

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Accepts client credentials via HTTP Basic auth (preferred, RFC 6749 §2.3.1)
// or client_secret_post (id/secret in the body) — both are advertised in the
// discovery document below.
function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep === -1) return null;
    return { id: decoded.slice(0, sep), secret: decoded.slice(sep + 1) };
  } catch {
    return null;
  }
}

// Signing key: by default generated fresh on every process start (tokens are
// short-lived and reissued on demand, so that's normally fine). But the
// identity_assertion below is deliberately long-lived (30 days) — the whole
// point of the claim ceremony is that a human doesn't repeat it often — so an
// ephemeral key would silently undercut that promise on every redeploy. Set
// OAUTH_SIGNING_PRIVATE_KEY_PEM / OAUTH_SIGNING_PUBLIC_KEY_PEM (see
// .env.example for how to generate them) to persist the key across restarts
// in production; without them, everything still works, but claimed identities
// won't survive a redeploy.
function loadOrGenerateSigningKey() {
  const privPem = process.env.OAUTH_SIGNING_PRIVATE_KEY_PEM;
  const pubPem  = process.env.OAUTH_SIGNING_PUBLIC_KEY_PEM;
  if (privPem && pubPem) {
    try {
      const privateKey = crypto.createPrivateKey(privPem.replace(/\\n/g, '\n'));
      const publicKey  = crypto.createPublicKey(pubPem.replace(/\\n/g, '\n'));
      console.log('  ✓  OAuth signing key loaded from environment (persists across restarts)');
      return { privateKey, publicKey };
    } catch (err) {
      console.error('Failed to parse OAUTH_SIGNING_*_KEY_PEM, falling back to an ephemeral key:', err.message);
    }
  }
  console.log('  ℹ  OAUTH_SIGNING_*_KEY_PEM not set — using an ephemeral signing key for this process. ' +
              'Access tokens AND identity_assertions issued now stop verifying after the next restart. ' +
              'Set these in production — see .env.example / docs/oauth-admin-api.md.');
  return crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
}
const { publicKey: SIGNING_PUBLIC_KEY, privateKey: SIGNING_PRIVATE_KEY } = loadOrGenerateSigningKey();
// Derived from the key itself (not random) so it stays stable across restarts
// when the key is persisted via env vars — a client caching keys by kid
// shouldn't see it change unless the underlying key actually did.
const SIGNING_KID = crypto.createHash('sha256')
  .update(SIGNING_PUBLIC_KEY.export({ type: 'spki', format: 'der' }))
  .digest('hex').slice(0, 16);
const SIGNING_PRIVATE_PEM = SIGNING_PRIVATE_KEY.export({ type: 'pkcs8', format: 'pem' });
const SIGNING_PUBLIC_PEM  = SIGNING_PUBLIC_KEY.export({ type: 'spki', format: 'pem' });
const SIGNING_PUBLIC_JWK  = { ...SIGNING_PUBLIC_KEY.export({ format: 'jwk' }), kid: SIGNING_KID, use: 'sig', alg: 'RS256' };

function signAccessToken(subject, scope) {
  return jwt.sign({ scope }, SIGNING_PRIVATE_PEM, {
    algorithm: 'RS256',
    keyid: SIGNING_KID,
    issuer: ISSUER,
    audience: RESOURCE_URI,
    subject,
    expiresIn: TOKEN_TTL_S,
    jwtid: crypto.randomUUID(),
  });
}

// The identity_assertion's audience is this server's own token endpoint (RFC
// 7523 §3), not the resource — it's presented back to /oauth/token, never to
// /api/admin/submissions directly.
function signIdentityAssertion(reg) {
  // Pre-claim (anonymous, not yet claimed): pre_claim_scopes, always empty.
  // Claimed (either type): post_claim_scopes.
  const scope = (reg.status === 'claimed' ? reg.post_claim_scopes : reg.pre_claim_scopes || []).join(' ');
  return jwt.sign({ scope, login_hint: reg.login_hint }, SIGNING_PRIVATE_PEM, {
    algorithm: 'RS256',
    keyid: SIGNING_KID,
    issuer: ISSUER,
    audience: `${ISSUER}/oauth/token`,
    subject: reg.registration_id,
    expiresIn: ASSERTION_TTL_S,
    jwtid: crypto.randomUUID(),
  });
}

// ─── Token revocation (RFC 7009) ─────────────────────────────────────────────
// In-memory only. When the signing key is ephemeral (see above), a process
// restart already invalidates every previously issued token, so a
// revocation list only needs to outlive the process it was created in. When
// the key IS persisted, this list resets on restart regardless — revoking a
// whole identity (see "Credential revocation flow" in auth.md) survives that
// because it's a flag on the persisted registration record, not this map.
const revokedJtis = new Map(); // jti -> expiry (ms)
function pruneRevoked() {
  const now = Date.now();
  for (const [jti, expiry] of revokedJtis) if (expiry <= now) revokedJtis.delete(jti);
}

// ─── Agent registration store (auth.md "service_auth") ──────────────────────
// One JSON file, one record per registration attempt — no database in this
// project (same pattern as the submissions store above). Gitignored: contains
// login_hint (an email) and secret tokens. Same ephemeral-storage caveat as
// everything else under server/data/ on hosts without a persistent volume.
const REGISTRATIONS_FILE = path.join(SUBMISSIONS_DIR, 'agent-registrations.json');
const USER_CODE_TTL_S     = 600;              // 10 minutes — matches the canonical spec's example
const OUTER_CLAIM_TTL_S   = 60 * 60 * 24;     // 24 hours — outer registration window
const POST_CLAIM_SCOPES   = [ADMIN_SCOPE];

function readRegistrations() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRATIONS_FILE, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Failed to read agent registrations:', err.message);
    return [];
  }
}
function writeRegistrations(regs) {
  fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
  fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(regs, null, 2));
}
function saveRegistration(reg) {
  const regs = readRegistrations();
  const idx = regs.findIndex((r) => r.registration_id === reg.registration_id);
  if (idx === -1) regs.push(reg); else regs[idx] = reg;
  writeRegistrations(regs);
}
function findRegistrationById(id)          { return readRegistrations().find((r) => r.registration_id === id) || null; }
function findRegistrationByClaimToken(t)   { return readRegistrations().find((r) => r.claim_token === t) || null; }
function findRegistrationByAttemptToken(t) { return readRegistrations().find((r) => r.claim_attempt_token === t) || null; }

function genId(prefix) { return `${prefix}_${crypto.randomBytes(12).toString('hex')}`; }
function genUserCode()  { return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0'); }

// Shape borrows from RFC 8628 device authorization (user_code, verification_uri,
// expires_in, interval) with a claim_attempt_token embedded in verification_uri
// so the URL identifies the registration without leaking the user-typed code.
function buildClaimBlock(reg) {
  const returnTo = `/claim?claim_attempt_token=${encodeURIComponent(reg.claim_attempt_token)}`;
  return {
    user_code: reg.user_code,
    expires_in: USER_CODE_TTL_S,
    verification_uri: `${ISSUER}/login?return_to=${encodeURIComponent(returnTo)}`,
    interval: reg.poll_interval,
  };
}

// POST /agent/identity — auth.md "Register" step. Supports two identity
// types, both open (no auth on the call itself) and both gated on the same
// claim ceremony before anything sensitive is granted:
//   · service_auth — you know a human's email; the full claim block (code +
//     verification_uri) comes back immediately (unchanged from before).
//   · anonymous    — you know nothing yet. Returns an immediate pre-claim
//     identity_assertion scoped to NOTHING (pre_claim_scopes is always
//     empty — this resource returns applicant PII, so there is no
//     meaningful "anonymous-usable" scope to grant). Claiming later
//     (POST /agent/identity/claim with an email) upgrades it to
//     post_claim_scopes, exactly like service_auth.
app.post('/agent/identity', (req, res) => {
  const type = req.body && req.body.type;
  if (type !== 'service_auth' && type !== 'anonymous') {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Only {"type":"service_auth"} or {"type":"anonymous"} is supported — no identity_assertion (ID-JAG) registration.',
    });
  }

  let loginHint = null;
  if (type === 'service_auth') {
    loginHint = req.body && req.body.login_hint;
    if (typeof loginHint !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginHint)) {
      return res.status(400).json({ error: 'invalid_request', error_description: '"login_hint" must be a valid email address.' });
    }
  }

  const now = Date.now();
  const reg = {
    registration_id: genId('reg'),
    type,
    login_hint: loginHint, // null for anonymous until claimed
    status: 'pending', // 'pending' | 'claimed' | 'revoked'
    claim_token: genId('clm'),
    // anonymous doesn't start its claim ceremony until POST /agent/identity/claim
    // supplies an email (it has none yet) — no user_code to hand out before then.
    claim_attempt_token: type === 'service_auth' ? genId('cat') : null,
    user_code: type === 'service_auth' ? genUserCode() : null,
    user_code_expires_at: type === 'service_auth' ? now + USER_CODE_TTL_S * 1000 : null,
    code_attempts: 0,
    outer_expires_at: now + OUTER_CLAIM_TTL_S * 1000,
    pre_claim_scopes: [], // always empty — no anonymous-usable access to a PII resource
    post_claim_scopes: POST_CLAIM_SCOPES,
    created_at: new Date(now).toISOString(),
    claimed_at: null,
    claimed_by: null,
    last_poll_at: null,
    poll_interval: 5,
  };
  saveRegistration(reg);

  if (type === 'anonymous') {
    const assertionExpires = new Date(now + ASSERTION_TTL_S * 1000).toISOString();
    return res.status(200).json({
      registration_id: reg.registration_id,
      registration_type: reg.type,
      identity_assertion: signIdentityAssertion(reg), // pre-claim: scope is empty, per pre_claim_scopes
      assertion_expires: assertionExpires,
      pre_claim_scopes: reg.pre_claim_scopes,
      claim_url: `${ISSUER}/agent/identity/claim`,
      claim_token: reg.claim_token,
      claim_token_expires: new Date(reg.outer_expires_at).toISOString(),
      post_claim_scopes: reg.post_claim_scopes,
    });
  }

  res.status(200).json({
    registration_id: reg.registration_id,
    registration_type: reg.type,
    claim_url: `${ISSUER}/agent/identity/claim`,
    claim_token: reg.claim_token,
    claim_token_expires: new Date(reg.outer_expires_at).toISOString(),
    post_claim_scopes: reg.post_claim_scopes,
    claim: buildClaimBlock(reg),
  });
});

// POST /agent/identity/claim — agent-facing. Two uses, same endpoint and
// response shape (per spec):
//   · service_auth — re-mint a fresh user_code if the previous one expired
//     but the outer 24h window is still open.
//   · anonymous — start the claim ceremony for the first time, supplying the
//     human's email now (anonymous registration didn't collect one).
app.post('/agent/identity/claim', (req, res) => {
  const claimToken = req.body && req.body.claim_token;
  const reg = findRegistrationByClaimToken(claimToken);
  if (!reg) {
    return res.status(401).json({ error: 'invalid_claim_token', error_description: 'claim_token is wrong or unknown.' });
  }

  const now = Date.now();
  if (now > reg.outer_expires_at) {
    return res.status(410).json({ error: 'claim_expired', error_description: 'The registration window has closed. Restart at Step 3 (register again).' });
  }
  if (reg.status === 'claimed') {
    return res.status(409).json({ error: 'claimed_or_in_flight', error_description: 'This registration has already been claimed.' });
  }

  if (!reg.login_hint) {
    const email = req.body && req.body.email;
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'invalid_request', error_description: '"email" is required to start the claim ceremony for an anonymous registration.' });
    }
    reg.login_hint = email;
  }

  reg.user_code = genUserCode();
  reg.claim_attempt_token = genId('cat');
  reg.user_code_expires_at = now + USER_CODE_TTL_S * 1000;
  reg.code_attempts = 0;
  saveRegistration(reg);

  res.status(200).json({
    registration_id: reg.registration_id,
    claim_attempt_id: reg.claim_attempt_token,
    status: 'initiated',
    expires_at: new Date(reg.outer_expires_at).toISOString(),
    claim_attempt: buildClaimBlock(reg),
  });
});

// ─── Operator authentication (the human side of the claim ceremony) ─────────
// The one credential this site's operator holds. Set OPERATOR_EMAIL/
// OPERATOR_PASSWORD in the environment — see .env.example. This is this
// site's first-ever login system, built specifically so the claim ceremony
// has a real human to confirm registrations, rather than faking one.
const OPERATOR_EMAIL    = process.env.OPERATOR_EMAIL || '';
const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD || '';
const SESSION_COOKIE    = 'ds_operator_session';
const SESSION_TTL_S     = 60 * 60; // 1 hour

const operatorSessions = new Map(); // sessionId -> expiry (ms)
function pruneSessions() {
  const now = Date.now();
  for (const [id, exp] of operatorSessions) if (exp <= now) operatorSessions.delete(id);
}

const loginAttempts = new Map(); // ip -> { count, lockedUntil }
function isLockedOut(ip) {
  const rec = loginAttempts.get(ip);
  return !!(rec && rec.lockedUntil > Date.now());
}
function recordFailedLogin(ip) {
  const rec = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= 5) {
    rec.lockedUntil = Date.now() + 60_000;
    rec.count = 0;
  }
  loginAttempts.set(ip, rec);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    if (key) out[key] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

function requireOperatorSession(req, res, next) {
  pruneSessions();
  const sessionId = parseCookies(req)[SESSION_COOKIE];
  const expiry = sessionId && operatorSessions.get(sessionId);
  if (!expiry || expiry <= Date.now()) {
    return res.status(401).json({ authenticated: false, error: 'not_authenticated' });
  }
  next();
}

app.post('/api/operator/login', (req, res) => {
  const ip = req.ip;
  if (isLockedOut(ip)) {
    return res.status(429).json({ success: false, error: 'too_many_attempts' });
  }
  if (!OPERATOR_EMAIL || !OPERATOR_PASSWORD) {
    console.error('Operator login rejected: OPERATOR_EMAIL/OPERATOR_PASSWORD are not configured.');
    return res.status(401).json({ success: false, error: 'invalid_credentials' });
  }
  const password = req.body && req.body.password;
  if (typeof password !== 'string' || !timingSafeEqualStr(password, OPERATOR_PASSWORD)) {
    recordFailedLogin(ip);
    return res.status(401).json({ success: false, error: 'invalid_credentials' });
  }
  loginAttempts.delete(ip);

  const sessionId = crypto.randomBytes(24).toString('base64url');
  operatorSessions.set(sessionId, Date.now() + SESSION_TTL_S * 1000);
  res.set('Set-Cookie', `${SESSION_COOKIE}=${sessionId}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_S}; SameSite=Lax${req.secure ? '; Secure' : ''}`);
  res.json({ success: true, email: OPERATOR_EMAIL });
});

app.post('/api/operator/logout', (req, res) => {
  const sessionId = parseCookies(req)[SESSION_COOKIE];
  if (sessionId) operatorSessions.delete(sessionId);
  res.set('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  res.json({ success: true });
});

// Always 200s (never 401) so the frontend can poll this on page load without
// special-casing an error response.
app.get('/api/operator/session', (req, res) => {
  pruneSessions();
  const sessionId = parseCookies(req)[SESSION_COOKIE];
  const expiry = sessionId && operatorSessions.get(sessionId);
  const authenticated = !!(expiry && expiry > Date.now());
  res.json(authenticated ? { authenticated: true, email: OPERATOR_EMAIL } : { authenticated: false });
});

// GET context for the claim page (login_hint, requested scopes) before the
// operator commits to typing a code.
app.get('/api/operator/claim/:attemptToken', requireOperatorSession, (req, res) => {
  const reg = findRegistrationByAttemptToken(req.params.attemptToken);
  if (!reg) return res.status(404).json({ error: 'not_found' });
  res.json({
    login_hint: reg.login_hint,
    scopes: reg.post_claim_scopes,
    status: reg.status,
    code_expires_at: new Date(reg.user_code_expires_at).toISOString(),
  });
});

// POST — the operator's browser submits the user_code here. This is the
// actual authorization decision: confirming this is what makes the
// registration usable at all.
app.post('/api/operator/claim/confirm', requireOperatorSession, (req, res) => {
  const attemptToken = req.body && req.body.claim_attempt_token;
  const userCode = req.body && req.body.user_code;
  const reg = findRegistrationByAttemptToken(attemptToken);
  if (!reg) return res.status(404).json({ success: false, error: 'not_found' });

  const now = Date.now();
  if (now > reg.outer_expires_at) return res.status(410).json({ success: false, error: 'claim_expired' });
  if (reg.status === 'claimed')   return res.status(200).json({ success: true, already_claimed: true });
  if (now > reg.user_code_expires_at) return res.status(400).json({ success: false, error: 'code_expired' });
  if (reg.code_attempts >= 5) return res.status(429).json({ success: false, error: 'too_many_attempts' });

  if (typeof userCode !== 'string' || !timingSafeEqualStr(userCode.trim(), reg.user_code)) {
    reg.code_attempts += 1;
    saveRegistration(reg);
    return res.status(400).json({ success: false, error: 'invalid_code' });
  }

  reg.status = 'claimed';
  reg.claimed_at = new Date(now).toISOString();
  reg.claimed_by = OPERATOR_EMAIL;
  saveRegistration(reg);
  res.json({ success: true });
});

app.post('/oauth/token', (req, res) => {
  const grantType = (req.body && req.body.grant_type) || '';

  // ── client_credentials (RFC 6749 §4.4) — the static operator client ──────
  if (grantType === 'client_credentials') {
    const basic = parseBasicAuth(req.headers.authorization);
    const clientId     = basic ? basic.id     : req.body && req.body.client_id;
    const clientSecret = basic ? basic.secret : req.body && req.body.client_secret;
    const ok = !!(
      ADMIN_CLIENT_ID && ADMIN_CLIENT_SECRET &&
      typeof clientId === 'string' && timingSafeEqualStr(clientId, ADMIN_CLIENT_ID) &&
      typeof clientSecret === 'string' && timingSafeEqualStr(clientSecret, ADMIN_CLIENT_SECRET)
    );
    if (!ok) {
      res.set('WWW-Authenticate', 'Basic realm="oauth"');
      return res.status(401).json({ error: 'invalid_client' });
    }
    return res.json({ access_token: signAccessToken(clientId, ADMIN_SCOPE), token_type: 'Bearer', expires_in: TOKEN_TTL_S, scope: ADMIN_SCOPE });
  }

  // ── urn:workos:agent-auth:grant-type:claim — polling the claim ceremony ──
  if (grantType === 'urn:workos:agent-auth:grant-type:claim') {
    const claimToken = (req.body && req.body.claim_token) || '';
    const reg = findRegistrationByClaimToken(claimToken);
    if (!reg) return res.status(400).json({ error: 'invalid_grant', error_description: 'Unknown claim_token.' });
    if (reg.status === 'revoked') return res.status(400).json({ error: 'invalid_grant', error_description: 'Registration has been revoked.' });

    const now = Date.now();
    if (reg.last_poll_at && now - reg.last_poll_at < reg.poll_interval * 1000) {
      reg.poll_interval += 5; // RFC 8628 §3.5 slow_down backoff
      saveRegistration(reg);
      return res.status(400).json({ error: 'slow_down' });
    }
    reg.last_poll_at = now;

    if (reg.status === 'pending') {
      saveRegistration(reg);
      if (now > reg.user_code_expires_at) return res.status(400).json({ error: 'expired_token' });
      return res.status(400).json({ error: 'authorization_pending' });
    }

    // status === 'claimed'
    saveRegistration(reg);
    const scope = reg.post_claim_scopes.join(' ');
    return res.json({
      access_token: signAccessToken(reg.registration_id, scope),
      token_type: 'Bearer',
      expires_in: TOKEN_TTL_S,
      scope,
      identity_assertion: signIdentityAssertion(reg),
      assertion_expires: new Date(now + ASSERTION_TTL_S * 1000).toISOString(),
    });
  }

  // ── urn:ietf:params:oauth:grant-type:jwt-bearer (RFC 7523) — re-exchange ─
  // the long-lived identity_assertion for a fresh access token, without
  // repeating the claim ceremony.
  if (grantType === 'urn:ietf:params:oauth:grant-type:jwt-bearer') {
    const assertion = (req.body && req.body.assertion) || '';
    let decoded;
    try {
      decoded = jwt.verify(assertion, SIGNING_PUBLIC_PEM, { algorithms: ['RS256'], issuer: ISSUER, audience: `${ISSUER}/oauth/token` });
    } catch (err) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'identity_assertion is invalid or expired. Restart at Step 3 (register again).' });
    }
    const reg = findRegistrationById(decoded.sub);
    if (!reg || reg.status === 'revoked') {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Registration not found or has been revoked.' });
    }
    // Claimed → post_claim_scopes. Still-pending anonymous → pre_claim_scopes
    // (always empty — see /agent/identity). Still-pending service_auth has no
    // valid assertion to present at all (none is issued before claiming).
    if (reg.status !== 'claimed' && reg.type !== 'anonymous') {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Registration has not been claimed yet.' });
    }
    const scope = (reg.status === 'claimed' ? reg.post_claim_scopes : reg.pre_claim_scopes).join(' ');
    return res.json({ access_token: signAccessToken(reg.registration_id, scope), token_type: 'Bearer', expires_in: TOKEN_TTL_S, scope });
  }

  return res.status(400).json({ error: 'unsupported_grant_type' });
});

app.post('/oauth/revoke', (req, res) => {
  const token = (req.body && req.body.token) || '';

  try {
    const decoded = jwt.verify(token, SIGNING_PUBLIC_PEM, { algorithms: ['RS256'], issuer: ISSUER, audience: RESOURCE_URI });

    // The token's `sub` is either the static admin client_id, or a
    // registration_id. Proving ownership differs accordingly: the admin
    // client re-presents its client_secret; a claimed registration
    // re-presents a still-valid identity_assertion for that same subject.
    let credentialsOk = false;
    if (ADMIN_CLIENT_ID && decoded.sub === ADMIN_CLIENT_ID) {
      const basic = parseBasicAuth(req.headers.authorization);
      const clientId     = basic ? basic.id     : req.body && req.body.client_id;
      const clientSecret = basic ? basic.secret : req.body && req.body.client_secret;
      credentialsOk = !!(
        typeof clientId === 'string' && timingSafeEqualStr(clientId, ADMIN_CLIENT_ID) &&
        typeof clientSecret === 'string' && timingSafeEqualStr(clientSecret, ADMIN_CLIENT_SECRET)
      );
    } else {
      try {
        const assertionDecoded = jwt.verify((req.body && req.body.assertion) || '', SIGNING_PUBLIC_PEM, {
          algorithms: ['RS256'], issuer: ISSUER, audience: `${ISSUER}/oauth/token`,
        });
        credentialsOk = assertionDecoded.sub === decoded.sub;
      } catch {
        // not credentialsOk
      }
    }

    if (credentialsOk && decoded.jti) {
      pruneRevoked();
      revokedJtis.set(decoded.jti, decoded.exp * 1000);
    }
  } catch {
    // Invalid/expired/garbled token — RFC 7009 §2.2 says respond 200 anyway,
    // so as not to leak whether a given token value ever existed.
  }

  res.status(200).end();
});

// Shared by both discovery documents below so issuer/token_endpoint/jwks_uri
// are structurally guaranteed to match — not just copy-pasted the same
// string twice.
const TOKEN_ENDPOINT = `${ISSUER}/oauth/token`;
const JWKS_URI       = `${ISSUER}/.well-known/jwks.json`;
const GRANT_TYPES_SUPPORTED = [
  'client_credentials',
  'urn:workos:agent-auth:grant-type:claim',
  'urn:ietf:params:oauth:grant-type:jwt-bearer',
];
const TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED = ['client_secret_basic', 'client_secret_post'];

// RFC 8414. No authorization_endpoint / response_types_supported: there is
// still no browser-redirect OAuth flow — the "human in the loop" here is the
// claim ceremony below (its own bespoke device-code-shaped protocol), not a
// standard OAuth authorization endpoint.
app.get('/.well-known/oauth-authorization-server', (_req, res) => {
  res.type('application/json').json({
    issuer: ISSUER,
    token_endpoint: TOKEN_ENDPOINT,
    token_endpoint_auth_methods_supported: TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED,
    jwks_uri: JWKS_URI,
    grant_types_supported: GRANT_TYPES_SUPPORTED,
    scopes_supported: [ADMIN_SCOPE],
    revocation_endpoint: `${ISSUER}/oauth/revoke`,
    revocation_endpoint_auth_methods_supported: TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED,
    // auth.md (https://github.com/workos/auth.md) agent-registration
    // extension — TWO real, working identity types, both gated by the same
    // claim ceremony before anything sensitive is granted:
    //   · service_auth — register with a human's login_hint; the claim block
    //     (code + verification_uri) comes back immediately.
    //   · anonymous — register with nothing; get an immediate pre-claim
    //     identity_assertion scoped to NOTHING (`anonymous.credential_types_
    //     supported` describes it; `pre_claim_scopes` in the registration
    //     response is always `[]` — this resource returns applicant PII, so
    //     there's no meaningful scope to grant before a human confirms).
    //     Claiming later (POST /agent/identity/claim with an email) upgrades
    //     to the same post_claim_scopes as service_auth.
    // `register_uri`/`revocation_uri`/`credential_types_supported` mirror
    // their `*_endpoint`/`credential_types` counterparts — same real values,
    // extra aliases for checkers that look for either name. Still no
    // `identity_assertion.assertion_types_supported` (ID-JAG): that needs an
    // external identity-provider trust relationship this site doesn't have.
    agent_auth: {
      skill: `${ISSUER}/auth.md`,
      identity_endpoint: `${ISSUER}/agent/identity`,
      register_uri: `${ISSUER}/agent/identity`,
      claim_endpoint: `${ISSUER}/agent/identity/claim`,
      claim_uri: `${ISSUER}/agent/identity/claim`,
      identity_types_supported: ['service_auth', 'anonymous'],
      anonymous: {
        credential_types_supported: ['identity_assertion'],
      },
      credential_types: ['identity_assertion'],
      credential_types_supported: ['identity_assertion'],
      revocation_endpoint: `${ISSUER}/oauth/revoke`,
      revocation_uri: `${ISSUER}/oauth/revoke`,
    },
  });
});

// RFC 9728 — tells a client which authorization server issues tokens accepted
// by the one protected resource on this site.
app.get('/.well-known/oauth-protected-resource', (_req, res) => {
  res.type('application/json').json({
    resource: RESOURCE_URI,
    authorization_servers: [ISSUER],
    scopes_supported: [ADMIN_SCOPE],
    bearer_methods_supported: ['header'],
  });
});

app.get('/.well-known/jwks.json', (_req, res) => {
  res.type('application/json').json({ keys: [SIGNING_PUBLIC_JWK] });
});

// OpenID Provider Metadata (OpenID Connect Discovery 1.0) — NOT a claim that
// this site is a full OpenID Connect Provider. There is no browser login, no
// ID token, no UserInfo endpoint, and no "openid" scope: none of the fields
// below describe user authentication. This document exists because some
// tooling checks /.well-known/openid-configuration by convention before
// falling back to /.well-known/oauth-authorization-server (RFC 8414) — so it
// mirrors that same real metadata under the other well-known name, built
// from the identical ISSUER/TOKEN_ENDPOINT/JWKS_URI constants, rather than
// duplicating (and risking drifting from) those values.
// authorization_endpoint is omitted and response_types_supported is []: for
// the same reason as oauth-authorization-server above, there's no
// browser-redirect flow to advertise one for. subject_types_supported:
// ["public"] and id_token_signing_alg_values_supported: ["RS256"] are
// included because OIDC Discovery lists them as required fields, and are
// honest about what's real (this site's JWTs' `sub` is a direct, non-
// pairwise identifier, and RS256 is the actual signing algorithm) without
// implying ID-token issuance that doesn't happen.
app.get('/.well-known/openid-configuration', (_req, res) => {
  res.type('application/json').json({
    issuer: ISSUER,
    token_endpoint: TOKEN_ENDPOINT,
    token_endpoint_auth_methods_supported: TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED,
    jwks_uri: JWKS_URI,
    grant_types_supported: GRANT_TYPES_SUPPORTED,
    scopes_supported: [ADMIN_SCOPE],
    response_types_supported: [],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    revocation_endpoint: `${ISSUER}/oauth/revoke`,
    revocation_endpoint_auth_methods_supported: TOKEN_ENDPOINT_AUTH_METHODS_SUPPORTED,
  });
});

// ─── HTTP Message Signatures Directory (Web Bot Auth) ────────────────────────
// draft-meunier-http-message-signatures-directory-05: a JWKS naming the keys
// this site uses to SIGN ITS OWN OUTBOUND requests, so a receiving site can
// verify "this really is dermascope.ai" — the opposite direction from
// SIGNING_PUBLIC_JWK above (which verifies tokens THIS site issues to
// callers). This site doesn't sign outbound requests (checked every fetch()
// in this file: one pre-arranged, already-secret-authenticated Google Sheets
// webhook, plus two loopback calls — no outbound crawler/bot traffic of the
// kind Web Bot Auth exists for; see docs/agent-readiness.md). Rather than
// fall through to the SPA's HTML 200 (a real, previously-flagged bug —
// unmatched GET requests hit the catch-all below and got index.html), publish
// the honest answer: a well-formed, empty directory. `keys: []` is valid
// per the JWKS format this draft reuses (RFC 7517 §5) — it declares zero
// signing keys, not a broken/missing endpoint. Revisit if this site ever
// adds real outbound bot/crawler behavior of its own.
app.get('/.well-known/http-message-signatures-directory', (_req, res) => {
  res.type('application/http-message-signatures-directory+json').json({ keys: [] });
});

// RFC 6750 bearer-token check for the admin API.
function requireAdminAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.set('WWW-Authenticate', 'Bearer realm="admin", error="invalid_request"');
    return res.status(401).json({ error: 'invalid_request', error_description: 'Missing bearer token.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, SIGNING_PUBLIC_PEM, {
      algorithms: ['RS256'],
      issuer: ISSUER,
      audience: RESOURCE_URI,
    });
  } catch (err) {
    res.set('WWW-Authenticate', 'Bearer realm="admin", error="invalid_token"');
    return res.status(401).json({ error: 'invalid_token', error_description: err.message });
  }

  if (decoded.jti && revokedJtis.has(decoded.jti)) {
    res.set('WWW-Authenticate', 'Bearer realm="admin", error="invalid_token"');
    return res.status(401).json({ error: 'invalid_token', error_description: 'Token has been revoked.' });
  }

  const scopes = String(decoded.scope || '').split(' ');
  if (!scopes.includes(ADMIN_SCOPE)) {
    res.set('WWW-Authenticate', `Bearer realm="admin", error="insufficient_scope", scope="${ADMIN_SCOPE}"`);
    return res.status(403).json({ error: 'insufficient_scope' });
  }

  req.auth = decoded;
  next();
}

app.get('/api/admin/submissions', requireAdminAuth, (_req, res) => {
  const submissions = readSubmissions();
  res.json({ count: submissions.length, submissions });
});

// ─── MCP server (Streamable HTTP transport, minimal profile) ────────────────────
// A real, working MCP server — not just a card pointing at nothing. Exposes the
// site's two real actions as MCP tools:
//   · submit_early_access_request — no auth (mirrors the public /api/contact form)
//   · list_early_access_submissions — requires a bearer_token argument, obtained
//     the same way any other admin caller gets one (see /auth.md, docs/oauth-admin-api.md)
// Both tool handlers forward to the existing, already-validated/authorized HTTP
// routes above via a local loopback call, so there is exactly one implementation
// of "submit a request" and "list submissions" — the MCP surface never
// duplicates that logic.
//
// Deliberately minimal: single-response JSON per POST (no SSE stream, no
// Mcp-Session-Id) — both are optional per the Streamable HTTP spec for a
// stateless server like this one. GET on the endpoint returns 405, which the
// spec explicitly allows for servers that don't offer a server-initiated stream.
const MCP_ENDPOINT = `${ISSUER}/mcp`;
const MCP_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26'];
const MCP_SERVER_INFO = { name: 'dermascope-early-access', version: '1.0.0' };

const MCP_TOOLS = [
  {
    name: 'submit_early_access_request',
    description: 'Submit a DermaScope.ai Early Access request (clinician sign-up form).',
    inputSchema: {
      type: 'object',
      required: ['name', 'email', 'title', 'specialty', 'organization', 'country', 'city', 'phone', 'interest', 'consent'],
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
        challenges:   { type: 'array', items: { type: 'string' }, description: 'Main challenges to solve (optional)' },
        consent:      { type: 'boolean', description: 'Must be true — consent to be contacted' },
      },
    },
    handler: async (args) => {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args || {}),
      });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    },
  },
  {
    name: 'list_early_access_submissions',
    description:
      'List Early Access submissions (admin). Requires a bearer_token — obtain one via POST /oauth/token first; see /auth.md.',
    inputSchema: {
      type: 'object',
      required: ['bearer_token'],
      properties: {
        bearer_token: { type: 'string', description: 'Access token from POST /oauth/token (admin:submissions:read scope).' },
      },
    },
    handler: async (args) => {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/admin/submissions`, {
        headers: { Authorization: `Bearer ${(args && args.bearer_token) || ''}` },
      });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    },
  },
];

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

app.get('/mcp', (_req, res) => {
  // No server-initiated stream offered — 405 is spec-compliant (Streamable HTTP §Listening).
  res.status(405).json({ error: 'method_not_allowed', error_description: 'This server does not offer a server-initiated SSE stream.' });
});

app.post('/mcp', async (req, res) => {
  // Origin check (DNS-rebinding guard) — browsers set this; non-browser MCP
  // clients (the expected caller here) generally don't, so absence is fine.
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'forbidden_origin' });
  }

  const version = req.headers['mcp-protocol-version'];
  if (version && !MCP_PROTOCOL_VERSIONS.includes(version)) {
    return res.status(400).json({ error: 'unsupported_protocol_version', supported: MCP_PROTOCOL_VERSIONS });
  }

  const msg = req.body;
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') {
    return res.status(400).json(jsonRpcError(null, -32600, 'Invalid Request'));
  }

  // Notifications/responses (no `id`) — per spec, accept with 202 and no body.
  if (msg.id === undefined) {
    return res.status(202).end();
  }

  try {
    switch (msg.method) {
      case 'initialize':
        return res.type('application/json').json({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            protocolVersion: MCP_PROTOCOL_VERSIONS[0],
            capabilities: { tools: {} },
            serverInfo: MCP_SERVER_INFO,
            instructions: 'Two tools: submit_early_access_request (public) and list_early_access_submissions (needs a bearer_token — see /auth.md).',
          },
        });

      case 'tools/list':
        return res.type('application/json').json({
          jsonrpc: '2.0',
          id: msg.id,
          result: { tools: MCP_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) },
        });

      case 'tools/call': {
        const tool = MCP_TOOLS.find((t) => t.name === msg.params?.name);
        if (!tool) return res.type('application/json').json(jsonRpcError(msg.id, -32602, `Unknown tool: ${msg.params?.name}`));

        const outcome = await tool.handler(msg.params?.arguments || {});
        return res.type('application/json').json({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(outcome.body) }],
            isError: outcome.status >= 400,
          },
        });
      }

      default:
        return res.type('application/json').json(jsonRpcError(msg.id, -32601, `Method not found: ${msg.method}`));
    }
  } catch (err) {
    console.error('MCP request error:', err.message);
    return res.type('application/json').json(jsonRpcError(msg.id, -32603, 'Internal error'));
  }
});

// ─── MCP Server Card (SEP-2127) ──────────────────────────────────────────────
// Schema: https://github.com/modelcontextprotocol/experimental-ext-server-card
// (the SEP-2127 reference implementation) — fetched and matched field-for-field
// rather than guessed. Deliberately excludes tool/capability lists: the SEP
// explicitly reserves those for runtime `tools/list`, since a static card can't
// reliably represent a dynamic surface (see the SEP's "Why Exclude Primitives?").
const MCP_SERVER_CARD = {
  $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
  name: 'ai.dermascope/early-access',
  title: 'DermaScope.ai Agent API',
  description: 'MCP tools for DermaScope.ai: submit an Early Access request, or (admin) list submissions.',
  version: MCP_SERVER_INFO.version,
  websiteUrl: ISSUER,
  remotes: [
    {
      type: 'streamable-http',
      url: MCP_ENDPOINT,
      supportedProtocolVersions: MCP_PROTOCOL_VERSIONS,
    },
  ],
};

// Published at the SEP's recommended per-endpoint path...
app.get('/mcp/server-card', (_req, res) => res.type('application/json').json(MCP_SERVER_CARD));
// ...and at the domain well-known path some discovery tooling checks instead.
app.get('/.well-known/mcp/server-card.json', (_req, res) => res.type('application/json').json(MCP_SERVER_CARD));

// Domain-level AI Catalog (per the Server Card spec's discovery mechanism),
// pointing at the one Server Card this domain publishes.
app.get('/.well-known/ai-catalog.json', (_req, res) => {
  res.type('application/ai-catalog+json').json({
    specVersion: '1.0',
    entries: [
      {
        identifier: 'urn:air:dermascope.ai:mcp:early-access',
        type: 'application/mcp-server-card+json',
        url: `${ISSUER}/mcp/server-card`,
      },
    ],
  });
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

  // Mirror the submission into Google Sheets — best-effort, fully guarded, and
  // never able to fail the request (see appendToGoogleSheet above). Runs after
  // the emails so a Sheets outage can never delay or break the email workflow.
  await appendToGoogleSheet(req.body || {}, now.toISOString());

  // Record it locally too, so it shows up in GET /api/admin/submissions.
  // Synchronous and guarded — never able to fail the request either.
  appendSubmissionRecord(req.body || {}, now.toISOString());

  return res.status(200).json({ success: true, message: 'Email sent successfully.' });
});

// ─── Markdown for Agents — homepage digest ───────────────────────────────────
// Hand-authored, kept in sync with the real Hero/section copy (not generated
// from the rendered DOM), served when a request's Accept header asks for
// text/markdown instead of HTML.
const HOMEPAGE_MARKDOWN = `# DermaScope.ai

When Every Detail Matters, AI Sees More. Physicians Decide.

From everyday dermatology to the most challenging and complex skin
conditions, DermaScope.ai transforms clinical images into actionable
intelligence — helping physicians detect critical visual patterns,
prioritize high-risk findings, and make more informed clinical decisions.

Physician-supervised clinical AI.

## Highlights
- 300+ skin conditions supported
- Multi-angle capture — standardized imaging for better AI results
- 95% analysis accuracy — explainable AI findings
- Results in 2–3 minutes

## Sections
- The Clinical Reality
- One Unified Platform
- Why DermaScope.ai
- How It Works
- Who Is DermaScope.ai Built For?
- FAQ
- Get Started — Join Early Access

## Calls to action
- Join Early Access — https://dermascope.ai/#demo
- Watch Video — a "How It Works" walkthrough, opened from the homepage
- Full navigation: Home, Features, How It Works, Clinical Applications, About, Contact

## API
The only backend endpoint is the Early Access submission form:
POST https://dermascope.ai/api/contact — see https://dermascope.ai/docs/api.md
`;

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── API catalog (RFC 9727) ───────────────────────────────────────────────────
// This site has two backend resources: the public POST /api/contact (Early
// Access form) plus /health, and the OAuth-protected GET /api/admin/submissions.
// The catalog below describes only those — it does not claim any broader API
// surface.
app.get('/.well-known/api-catalog', (_req, res) => {
  res.type('application/linkset+json').json({
    linkset: [
      {
        anchor: `${ISSUER}/api/contact`,
        'service-desc': [{ href: `${ISSUER}/openapi.yaml`, type: 'application/yaml' }],
        'service-doc':  [{ href: `${ISSUER}/docs/api.md`, type: 'text/markdown' }],
        status:         [{ href: `${ISSUER}/health`, type: 'application/json' }],
      },
      {
        anchor: RESOURCE_URI,
        'service-desc': [{ href: `${ISSUER}/openapi.yaml`, type: 'application/yaml' }],
        'service-doc':  [{ href: `${ISSUER}/docs/api.md`, type: 'text/markdown' }],
        'protected-resource-metadata': [{ href: `${ISSUER}/.well-known/oauth-protected-resource`, type: 'application/json' }],
      },
    ],
  });
});

// ─── Agent skills discovery index ─────────────────────────────────────────────
// Lists the site's one real, callable action (submitting an Early Access
// request). The sha256 is computed from the referenced file at request time
// so it can never drift out of sync with its content.
const AGENT_SKILLS_DIR = path.join(__dirname, '..', 'public', '.well-known', 'agent-skills');
app.get('/.well-known/agent-skills/index.json', (_req, res) => {
  const skillFile = path.join(AGENT_SKILLS_DIR, 'early-access-request.json');
  let sha256 = null;
  try {
    sha256 = crypto.createHash('sha256').update(fs.readFileSync(skillFile)).digest('hex');
  } catch (err) {
    console.error('agent-skills index: failed to hash skill file:', err.message);
  }
  res.type('application/json').json({
    $schema: 'https://github.com/cloudflare/agent-skills-discovery-rfc',
    skills: [
      {
        name: 'submit-early-access-request',
        type: 'api',
        description: 'Submit a DermaScope.ai Early Access request (clinician sign-up).',
        url: 'https://dermascope.ai/.well-known/agent-skills/early-access-request.json',
        sha256,
      },
    ],
  });
});

// ─── Serve the built frontend (single-service production) ───────────────────────
// When a Vite build exists, serve it as static files and fall back to index.html
// for client-side routing. In dev the frontend is served by Vite instead, so this
// block is simply skipped when dist/ is absent.
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  // Homepage: advertise discovery resources via Link headers (RFC 8288), and
  // honor `Accept: text/markdown` with a hand-authored Markdown digest of the
  // page instead of the HTML shell. Registered ahead of express.static so it
  // takes priority for exactly this one route.
  app.get('/', (req, res, next) => {
    res.set(
      'Link',
      [
        '</.well-known/api-catalog>; rel="api-catalog"',
        '</docs/api.md>; rel="service-doc"',
        '</health>; rel="status"',
      ].join(', '),
    );

    const wantsMarkdown = (req.headers.accept || '').includes('text/markdown');
    if (!wantsMarkdown) return next();

    const markdown = HOMEPAGE_MARKDOWN;
    res
      .type('text/markdown')
      .set('x-markdown-tokens', String(Math.ceil(markdown.length / 4)))
      .send(markdown);
  });

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
