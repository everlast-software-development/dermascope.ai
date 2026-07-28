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

// ─── OAuth 2.0 authorization server (RFC 6749 / RFC 8414) ───────────────────────
// A real, working — not fabricated — authorization server: it protects exactly
// one resource, GET /api/admin/submissions, via the client_credentials grant
// (machine-to-machine; there is no end-user login on this site, so no
// authorization endpoint / redirect-based flow is offered or advertised).
//
// Setup: set OAUTH_ADMIN_CLIENT_ID and OAUTH_ADMIN_CLIENT_SECRET in the server
// environment (see .env.example). Full guide: docs/oauth-admin-api.md.
const ISSUER       = (process.env.SITE_URL || 'https://dermascope.ai').replace(/\/$/, '');
const RESOURCE_URI = `${ISSUER}/api/admin`;
const ADMIN_SCOPE  = 'admin:submissions:read';
const TOKEN_TTL_S  = 3600;

const ADMIN_CLIENT_ID     = process.env.OAUTH_ADMIN_CLIENT_ID || '';
const ADMIN_CLIENT_SECRET = process.env.OAUTH_ADMIN_CLIENT_SECRET || '';

// ─── Dynamic client registration (auth.md "service_auth") ───────────────────
// Beyond the one static admin client above, agents can self-register for a
// client_id/client_secret pair via POST /agent/identity — gated behind an
// "initial access token" (RFC 7591 §3) so registration is still a decision a
// human makes, not an open door onto a resource that returns applicant PII.
// Registered clients are persisted (secret hashed, never stored in plain
// text) to server/data/oauth-clients.json — gitignored, same ephemeral-
// storage caveat as the submissions store. See docs/oauth-admin-api.md.
const REGISTRATION_TOKEN = process.env.OAUTH_REGISTRATION_TOKEN || '';
const CLIENTS_FILE = path.join(SUBMISSIONS_DIR, 'oauth-clients.json');

function hashSecret(secret) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(secret, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifySecret(secret, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const actual = crypto.scryptSync(secret, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}
function readClients() {
  try {
    return JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Failed to read OAuth client registry:', err.message);
    return [];
  }
}
function writeClients(clients) {
  fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2));
}
function findActiveClient(clientId) {
  return readClients().find((c) => c.client_id === clientId && !c.revoked) || null;
}

// Signing key: generated fresh on every process start. Tokens are short-lived
// (1h) and issued on demand, so a key that rotates on restart is fine — any
// tokens signed by a previous instance simply stop verifying, and a client can
// always request a new one. No key material to provision or leak.
const { publicKey: SIGNING_PUBLIC_KEY, privateKey: SIGNING_PRIVATE_KEY } =
  crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const SIGNING_KID        = crypto.randomBytes(8).toString('hex');
const SIGNING_PRIVATE_PEM = SIGNING_PRIVATE_KEY.export({ type: 'pkcs8', format: 'pem' });
const SIGNING_PUBLIC_PEM  = SIGNING_PUBLIC_KEY.export({ type: 'spki', format: 'pem' });
const SIGNING_PUBLIC_JWK  = { ...SIGNING_PUBLIC_KEY.export({ format: 'jwk' }), kid: SIGNING_KID, use: 'sig', alg: 'RS256' };

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

// POST /agent/identity — auth.md "Register" step for the service_auth
// identity type. Requires the operator's initial access token; there is no
// open self-service signup (see comment on REGISTRATION_TOKEN above).
app.post('/agent/identity', (req, res) => {
  const presented = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!REGISTRATION_TOKEN || !presented || !timingSafeEqualStr(presented, REGISTRATION_TOKEN)) {
    res.set('WWW-Authenticate', 'Bearer realm="agent-registration"');
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'A valid initial access token (from DermaScope.ai\'s operator) is required to register.',
    });
  }

  const identityType = (req.body && req.body.identity_type) || '';
  if (identityType !== 'service_auth') {
    return res.status(400).json({
      error: 'unsupported_identity_type',
      error_description: 'Only "service_auth" is supported — no identity_assertion or anonymous registration.',
    });
  }

  const clientName   = (req.body && String(req.body.client_name || '').trim()) || 'unnamed-agent';
  const clientId      = `agt_${crypto.randomBytes(12).toString('hex')}`;
  const clientSecret  = crypto.randomBytes(24).toString('base64url');

  const clients = readClients();
  clients.push({
    client_id: clientId,
    secret_hash: hashSecret(clientSecret),
    client_name: clientName,
    identity_type: 'service_auth',
    scopes: [ADMIN_SCOPE],
    created_at: new Date().toISOString(),
    revoked: false,
  });
  writeClients(clients);

  res.status(201).json({
    identity_type: 'service_auth',
    client_id: clientId,
    client_secret: clientSecret, // shown once — the server never stores or returns it again
    scopes: [ADMIN_SCOPE],
  });
});

app.post('/oauth/token', (req, res) => {
  const grantType = (req.body && req.body.grant_type) || '';
  if (grantType !== 'client_credentials') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  const basic = parseBasicAuth(req.headers.authorization);
  const clientId     = basic ? basic.id     : req.body && req.body.client_id;
  const clientSecret = basic ? basic.secret : req.body && req.body.client_secret;

  let authenticatedClientId = null;
  if (
    ADMIN_CLIENT_ID && ADMIN_CLIENT_SECRET &&
    typeof clientId === 'string' && timingSafeEqualStr(clientId, ADMIN_CLIENT_ID) &&
    typeof clientSecret === 'string' && timingSafeEqualStr(clientSecret, ADMIN_CLIENT_SECRET)
  ) {
    authenticatedClientId = clientId;
  } else if (typeof clientId === 'string' && typeof clientSecret === 'string') {
    const record = findActiveClient(clientId);
    if (record && verifySecret(clientSecret, record.secret_hash)) authenticatedClientId = clientId;
  }

  if (!authenticatedClientId) {
    res.set('WWW-Authenticate', 'Basic realm="oauth"');
    return res.status(401).json({ error: 'invalid_client' });
  }

  const accessToken = jwt.sign({ scope: ADMIN_SCOPE }, SIGNING_PRIVATE_PEM, {
    algorithm: 'RS256',
    keyid: SIGNING_KID,
    issuer: ISSUER,
    audience: RESOURCE_URI,
    subject: authenticatedClientId,
    expiresIn: TOKEN_TTL_S,
    jwtid: crypto.randomUUID(),
  });

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: TOKEN_TTL_S,
    scope: ADMIN_SCOPE,
  });
});

// ─── Token revocation (RFC 7009) ─────────────────────────────────────────────
// In-memory only, by design: the signing key itself rotates every process
// restart (see above), which already invalidates every previously issued
// token — so a revocation list only needs to outlive the process it was
// created in, and tokens are short-lived (1h) besides.
const revokedJtis = new Map(); // jti -> expiry (ms)
function pruneRevoked() {
  const now = Date.now();
  for (const [jti, expiry] of revokedJtis) if (expiry <= now) revokedJtis.delete(jti);
}

app.post('/oauth/revoke', (req, res) => {
  const token = (req.body && req.body.token) || '';
  const basic = parseBasicAuth(req.headers.authorization);
  const clientId     = basic ? basic.id     : req.body && req.body.client_id;
  const clientSecret = basic ? basic.secret : req.body && req.body.client_secret;

  try {
    const decoded = jwt.verify(token, SIGNING_PUBLIC_PEM, { algorithms: ['RS256'], issuer: ISSUER, audience: RESOURCE_URI });

    // Only the client that owns the token (its `sub`) may revoke it, and must
    // re-present valid credentials for that same client.
    let credentialsOk = false;
    if (decoded.sub === clientId && typeof clientId === 'string' && typeof clientSecret === 'string') {
      if (ADMIN_CLIENT_ID && timingSafeEqualStr(clientId, ADMIN_CLIENT_ID) && timingSafeEqualStr(clientSecret, ADMIN_CLIENT_SECRET)) {
        credentialsOk = true;
      } else {
        const record = findActiveClient(clientId);
        credentialsOk = !!(record && verifySecret(clientSecret, record.secret_hash));
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

// RFC 8414 — no authorization_endpoint / response_types_supported: this server
// only supports client_credentials, so it never uses the authorization endpoint
// (both fields are conditionally required by the RFC only when such a flow is
// supported).
app.get('/.well-known/oauth-authorization-server', (_req, res) => {
  res.type('application/json').json({
    issuer: ISSUER,
    token_endpoint: `${ISSUER}/oauth/token`,
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    jwks_uri: `${ISSUER}/.well-known/jwks.json`,
    grant_types_supported: ['client_credentials'],
    scopes_supported: [ADMIN_SCOPE],
    revocation_endpoint: `${ISSUER}/oauth/revoke`,
    revocation_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    // auth.md (https://github.com/workos/auth.md) agent-registration extension.
    // `register_uri`/`identity_endpoint` are the same real endpoint under two
    // names: the canonical spec (fetched in full from github.com/workos/AUTH.md,
    // not summarized) calls it `identity_endpoint`; `register_uri` is kept
    // alongside as an alias since that's the literal name generic "does
    // auth.md exist" checkers tend to look for. Both point at the one real
    // POST /agent/identity route — this isn't two endpoints, just two labels.
    // `credential_types` matches the exact key name isitagentready.com's own
    // auth-md SKILL.md lists; `credential_types_supported` is kept alongside
    // for consistency with this document's other `*_supported` fields (both
    // describe the same one real credential type: client_secret).
    //
    // IMPORTANT — `identity_types_supported: ['service_auth']` is honest about
    // what endpoint exists (POST /agent/identity, gated by an operator-issued
    // initial access token, returns a client_id/client_secret immediately),
    // but does NOT match the canonical auth.md spec's actual `service_auth`
    // shape: the real spec's service_auth takes a `login_hint` (a human
    // user's email, no auth on the call itself) and requires a claim
    // ceremony (`claim_url`/`claim_token`/a `claim` block with `user_code`+
    // `verification_uri`, RFC 8628-style) where a signed-in human confirms a
    // code before any credential is issued. All three of the spec's identity
    // types (service_auth, identity_assertion/ID-JAG, anonymous) model an
    // agent acting on behalf of a human end user who must claim/confirm the
    // registration. This site has no end user in that sense — /api/admin is
    // the operator's own tooling reading the operator's own data — and
    // building a real claim ceremony would mean adding this site's first-ever
    // login system just to satisfy an external checker's expectations for a
    // scenario that doesn't apply here. Decision recorded in
    // docs/agent-readiness.md: keep the real, working, gated-registration
    // endpoint as-is; accept that the "complete registration method" check
    // may not pass, rather than build a fake human-delegation flow with no
    // real human delegator. No `claim_uri`/`events_supported` for the same
    // reason — there is no claim ceremony or revocation-event stream to link.
    agent_auth: {
      skill: `${ISSUER}/auth.md`,
      identity_endpoint: `${ISSUER}/agent/identity`,
      register_uri: `${ISSUER}/agent/identity`,
      identity_types_supported: ['service_auth'],
      credential_types: ['client_secret'],
      credential_types_supported: ['client_secret'],
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
