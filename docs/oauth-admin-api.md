# OAuth 2.0 admin API — setup guide

A real, working OAuth 2.0 authorization server, built into `server/server.js`.
It protects exactly one resource: `GET /api/admin/submissions`, which lists
Early Access form submissions (newest first) so you (or a script/tool) can
read them without opening Google Sheets.

- **Grant type:** `client_credentials` only (machine-to-machine — there's no
  end-user login on this site, so there's no authorization-code/redirect flow).
- **Token format:** RS256-signed JWT, 1 hour lifetime.
- **Scope:** `admin:submissions:read`.

## 1. Set the client credentials

In [`server/.env`](../server/.env) (local) or your Railway service's
**Variables** tab (production):

```env
SITE_URL=https://dermascope.ai
OAUTH_ADMIN_CLIENT_ID=admin-dashboard
OAUTH_ADMIN_CLIENT_SECRET=<generate a long random secret>
```

Generate a secret with:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

If these two variables are left empty, the admin API is effectively disabled
— `/oauth/token` always returns `401 invalid_client`. Nothing else on the
site is affected either way.

Restart the server after setting these.

## 2. Get an access token

```bash
curl -s -X POST https://dermascope.ai/oauth/token \
  -u "admin-dashboard:<your-secret>" \
  -d "grant_type=client_credentials"
```

Response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "admin:submissions:read"
}
```

(You can also send `client_id`/`client_secret` as form fields instead of
`-u`/Basic auth — both are supported.)

## 3. Call the protected endpoint

```bash
curl -s https://dermascope.ai/api/admin/submissions \
  -H "Authorization: Bearer <access_token>"
```

```json
{
  "count": 2,
  "submissions": [
    { "timestamp": "2026-07-27T10:15:00.000Z", "name": "Dr. Jane Doe", "email": "jane@clinic.example", "...": "..." }
  ]
}
```

Without a token, or with an expired/invalid one, you get `401` with a
`WWW-Authenticate: Bearer ...` header describing why (RFC 6750).

## Discovery documents (for agents/tools, not humans)

- `GET /.well-known/oauth-authorization-server` — issuer, token endpoint, JWKS URI, supported grant types (RFC 8414).
- `GET /.well-known/oauth-protected-resource` — which authorization server issues tokens for this resource (RFC 9728).
- `GET /.well-known/jwks.json` — the current public key, for verifying tokens independently.

## How it works (and its limits)

- **Signing key** is a fresh 2048-bit RSA keypair generated in memory each
  time the server process starts (`server.js`, near the top of the OAuth
  section). Tokens are short-lived, so a key that rotates on restart is fine
  — a client just requests a fresh token. There's no key file to provision,
  back up, or leak.
- **Submissions storage** is a local JSON-Lines file,
  `server/data/submissions.jsonl` (gitignored — it contains applicant PII).
  Every successful `/api/contact` POST appends a line here, in addition to
  the existing email + Google Sheets flow. **On Railway (or any host without
  a persistent volume mounted at `server/data/`), this file resets on every
  redeploy.** Google Sheets remains the durable record; this store exists
  only so the admin API has something real to read without you having to
  wire up a full database. If you need this to survive redeploys, either
  attach a persistent volume at that path, or swap `readSubmissions()` /
  `appendSubmissionRecord()` in `server.js` for a real datastore.
- **Two ways to get a client**: the one static `OAUTH_ADMIN_CLIENT_ID` /
  `OAUTH_ADMIN_CLIENT_SECRET` pair above, or dynamic self-registration (below)
  for additional callers — both work interchangeably with `POST /oauth/token`.

## Rotating the static client secret

Generate a new one (see step 1), update the environment variable, and
restart. Any tokens already issued keep working until they expire (≤1h) —
old and new secrets aren't both valid at once, so time this during a low-
traffic window if that matters to you.

## Letting other agents/tools self-register (auth.md)

If you want to hand out access without sharing your one static secret with
every caller, set an "initial access token" and let callers self-register a
client of their own:

```env
OAUTH_REGISTRATION_TOKEN=<generate a long random secret — same command as above>
```

Give that value out-of-band (not over an insecure channel) to whichever
agent/service you're authorizing. They then follow the flow documented in
[`/auth.md`](../public/auth.md) — the agent-facing version of this guide:

```bash
curl -s -X POST https://dermascope.ai/agent/identity \
  -H "Authorization: Bearer <OAUTH_REGISTRATION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"identity_type":"service_auth","client_name":"my-agent"}'
```

Returns a `client_id`/`client_secret` pair (secret shown once) that works
with `POST /oauth/token` exactly like the static pair. Registered clients are
stored in `server/data/oauth-clients.json` (gitignored; secrets are hashed
with scrypt, never stored in plain text) — subject to the same
ephemeral-storage caveat as the submissions file above.

**Revoking a self-registered client entirely** (not just one token) has no
API endpoint today — remove its entry from `server/data/oauth-clients.json`
(or set its `"revoked": true`) and restart, or edit the file directly if your
deploy has a persistent volume. Revoking a single access token before it
expires uses `POST /oauth/revoke` (RFC 7009) — see `/auth.md` for the exact
request shape.

Leave `OAUTH_REGISTRATION_TOKEN` empty to disable self-registration
entirely; the static client keeps working regardless.
