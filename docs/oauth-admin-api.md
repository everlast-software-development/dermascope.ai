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
- **One client only.** There's a single `OAUTH_ADMIN_CLIENT_ID` /
  `OAUTH_ADMIN_CLIENT_SECRET` pair. If you need multiple distinct callers with
  different scopes, extend the client lookup in `POST /oauth/token` to check
  against a small list/map instead of one pair.

## Rotating the client secret

Generate a new one (see step 1), update the environment variable, and
restart. Any tokens already issued keep working until they expire (≤1h) —
old and new secrets aren't both valid at once, so time this during a low-
traffic window if that matters to you.
