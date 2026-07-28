# OAuth 2.0 admin API — setup guide

A real, working OAuth 2.0 authorization server, built into `server/server.js`.
It protects exactly one resource: `GET /api/admin/submissions`, which lists
Early Access form submissions (newest first). There are two independent ways
to get an access token for it:

1. **`client_credentials`** — a static, operator-provisioned pair, for your
   own scripts/tools. Set up once, works forever.
2. **The full auth.md `service_auth` flow** — for third-party AI agents. An
   agent registers with just an email, you (the operator) confirm a 6-digit
   code in your browser, and the agent then holds a long-lived credential it
   re-exchanges for access tokens without bothering you again. This is the
   real, complete flow from [github.com/workos/auth.md](https://github.com/workos/auth.md)
   — see [`/auth.md`](../public/auth.md) for the agent-facing walkthrough.

- **Token format:** RS256-signed JWT, 1 hour lifetime.
- **Scope:** `admin:submissions:read`.

## Option 1 — your own scripts (client_credentials)

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

If these two variables are left empty, this specific grant is disabled —
`client_credentials` requests always return `401 invalid_client`. The
`service_auth` flow (Option 2) is unaffected either way.

```bash
curl -s -X POST https://dermascope.ai/oauth/token \
  -u "admin-dashboard:<your-secret>" \
  -d "grant_type=client_credentials"
```
```json
{ "access_token": "eyJhbGciOiJSUzI1NiIs...", "token_type": "Bearer", "expires_in": 3600, "scope": "admin:submissions:read" }
```

```bash
curl -s https://dermascope.ai/api/admin/submissions -H "Authorization: Bearer <access_token>"
```
```json
{ "count": 2, "submissions": [ { "timestamp": "2026-07-27T10:15:00.000Z", "name": "Dr. Jane Doe", "email": "jane@clinic.example" } ] }
```

**Rotating the secret:** generate a new one, update the env var, restart.
Tokens already issued keep working until they expire (≤1h) — old and new
secrets aren't both valid at once.

## Option 2 — third-party agents (the auth.md claim ceremony)

This is what makes `service_auth` real per spec: registration needs only an
email, and nothing is granted until you personally confirm it.

### One-time setup

```env
OPERATOR_EMAIL=you@dermascope.ai
OPERATOR_PASSWORD=<a real password — this is a real login>
```

This is the site's one login, used only to reach the confirmation page at
`/claim`. Without these two variables set, `/agent/identity` still accepts
registrations, but nobody can ever confirm them (`/login` will reject every
password attempt) — effectively the flow just times out after 24h.

**Also set (strongly recommended in production):**
```env
OAUTH_SIGNING_PRIVATE_KEY_PEM=...
OAUTH_SIGNING_PUBLIC_KEY_PEM=...
```
Without these, the signing key is regenerated fresh on every process
restart. Access tokens don't care (they're reissued on demand), but an
agent's `identity_assertion` — the whole point of which is to *not* repeat
the claim ceremony for 30 days — silently stops verifying on the very next
redeploy if the key isn't persisted. Generate a pair:
```bash
node -e "const{privateKey,publicKey}=require('crypto').generateKeyPairSync('rsa',{modulusLength:2048});console.log('OAUTH_SIGNING_PRIVATE_KEY_PEM='+privateKey.export({type:'pkcs8',format:'pem'}).trim().replace(/\n/g,'\\n'));console.log('OAUTH_SIGNING_PUBLIC_KEY_PEM='+publicKey.export({type:'spki',format:'pem'}).trim().replace(/\n/g,'\\n'));"
```
Paste both output lines into your environment as-is (the `\n` sequences are
literal — the server un-escapes them on load).

### What happens, end to end

1. An agent (or you, testing) registers:
   ```bash
   curl -s -X POST https://dermascope.ai/agent/identity \
     -H "Content-Type: application/json" \
     -d '{"type":"service_auth","login_hint":"you@dermascope.ai"}'
   ```
   Returns `claim_token` (the agent keeps this) and a `claim` block with a
   `user_code` and a `verification_uri`.
2. The agent hands you the `verification_uri` + `user_code`.
3. You open the link, sign in with `OPERATOR_PASSWORD` at `/login`, land on
   `/claim`, see which agent is registering (`login_hint`) and what it wants
   (`post_claim_scopes`), and type the code.
4. The agent (which has been polling `POST /oauth/token` with
   `grant_type=urn:workos:agent-auth:grant-type:claim`) gets back an
   `access_token` **and** an `identity_assertion` (valid 30 days).
5. From then on, the agent exchanges the cached `identity_assertion` for
   fresh access tokens via `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`
   — no more human interaction needed until the assertion expires or you
   revoke it.

Full request/response shapes, error codes, and the re-exchange/revocation
steps: [`/auth.md`](../public/auth.md).

### Revoking a claimed agent entirely

No self-service endpoint (by design — same reasoning as everywhere else in
this project: don't build more automation than the trust model calls for).
Manually: open `server/data/agent-registrations.json`, find the entry by
`registration_id`, set `"status": "revoked"`, save. Every subsequent
claim-grant or jwt-bearer request for that registration then fails with
`invalid_grant`, permanently — access tokens already issued still expire
naturally within the hour regardless.

## Security notes

- **Login rate-limiting:** 5 wrong `OPERATOR_PASSWORD` attempts locks that IP
  out of `/login` for 60 seconds.
- **Code guessing:** 5 wrong `user_code` attempts on a single registration
  permanently exhausts that code (`too_many_attempts`) — the agent has to
  call `/agent/identity/claim` for a fresh one.
- **Session cookie** (`ds_operator_session`) is `HttpOnly`, `SameSite=Lax`,
  1 hour, and `Secure` automatically when served over HTTPS (the app trusts
  the first proxy hop so this works correctly behind Railway/Cloudflare).
- **Storage:** `server/data/agent-registrations.json` holds `login_hint`
  (an email) and secret tokens — gitignored, same ephemeral-storage caveat
  as `submissions.jsonl` (resets on redeploy without a persistent volume).

## Discovery documents (for agents/tools, not humans)

- `GET /.well-known/oauth-authorization-server` — issuer, `token_endpoint`, `jwks_uri`, all three `grant_types_supported`, and the `agent_auth` block (RFC 8414 + auth.md extension).
- `GET /.well-known/oauth-protected-resource` — which authorization server issues tokens for this resource (RFC 9728).
- `GET /.well-known/jwks.json` — the current public key, for verifying tokens/assertions independently.
