# auth.md

You are an agent. DermaScope.ai supports **agentic registration**: discover → register → claim → exchange for an access_token → call the API → handle revocation. This is the complete, real, working flow — every endpoint and example below is live on this domain, not illustrative.

There is exactly one protected resource on this site: `GET /api/admin/submissions` (Early Access form submissions). There is exactly one identity type: **`service_auth`**.

## Step 1 — Discover

The 401 response from the protected resource carries a `WWW-Authenticate` header naming the resource metadata:
```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://dermascope.ai/.well-known/oauth-protected-resource"
```

### 1a. Fetch the Protected Resource Metadata
```http
GET /.well-known/oauth-protected-resource
```
```json
{
  "resource": "https://dermascope.ai/api/admin",
  "authorization_servers": ["https://dermascope.ai"],
  "scopes_supported": ["admin:submissions:read"],
  "bearer_methods_supported": ["header"]
}
```

### 1b. Fetch the Authorization Server metadata
```http
GET https://dermascope.ai/.well-known/oauth-authorization-server
```
```json
{
  "issuer": "https://dermascope.ai",
  "token_endpoint": "https://dermascope.ai/oauth/token",
  "jwks_uri": "https://dermascope.ai/.well-known/jwks.json",
  "grant_types_supported": [
    "client_credentials",
    "urn:workos:agent-auth:grant-type:claim",
    "urn:ietf:params:oauth:grant-type:jwt-bearer"
  ],
  "scopes_supported": ["admin:submissions:read"],
  "revocation_endpoint": "https://dermascope.ai/oauth/revoke",
  "agent_auth": {
    "skill": "https://dermascope.ai/auth.md",
    "identity_endpoint": "https://dermascope.ai/agent/identity",
    "register_uri": "https://dermascope.ai/agent/identity",
    "claim_endpoint": "https://dermascope.ai/agent/identity/claim",
    "claim_uri": "https://dermascope.ai/agent/identity/claim",
    "identity_types_supported": ["service_auth"],
    "credential_types": ["identity_assertion"],
    "revocation_endpoint": "https://dermascope.ai/oauth/revoke",
    "revocation_uri": "https://dermascope.ai/oauth/revoke"
  }
}
```

- `agent_auth.identity_endpoint` (`register_uri` is the same endpoint, alternate name) — where you POST to register (Step 2).
- `agent_auth.claim_endpoint` (`claim_uri`, same endpoint) — where you re-mint a `user_code` if the current one expires (Step 3c).
- `agent_auth.identity_types_supported` — `["service_auth"]` only. This site has no external identity-provider relationship (no `identity_assertion`/ID-JAG) and no anonymous-access tier for a resource returning applicant PII — both are correctly absent, not omitted by mistake.
- `agent_auth.credential_types` — `["identity_assertion"]`: the credential you end up holding after a successful claim (Step 4) is a service-signed JWT, not a client_secret.
- `token_endpoint` / `revocation_endpoint` — standard RFC 8414 / RFC 7009 fields, used in Steps 5, 6, and Revocation.

## Step 2 — Register

```http
POST /agent/identity
Content-Type: application/json

{ "type": "service_auth", "login_hint": "you@example.com" }
```

`login_hint` is the email of the human who will confirm this registration — DermaScope.ai's operator. The call itself needs no authentication; nothing sensitive is granted here.

Response (`200`):
```json
{
  "registration_id": "reg_ad146cc59c07cf24713cdefa",
  "registration_type": "service_auth",
  "claim_url": "https://dermascope.ai/agent/identity/claim",
  "claim_token": "clm_c992a5313c4d1b6364001fce",
  "claim_token_expires": "2026-07-29T07:46:22.072Z",
  "post_claim_scopes": ["admin:submissions:read"],
  "claim": {
    "user_code": "449073",
    "expires_in": 600,
    "verification_uri": "https://dermascope.ai/login?return_to=%2Fclaim%3Fclaim_attempt_token%3Dcat_bb7a18e2dc01ae014fe99110",
    "interval": 5
  }
}
```

`claim_token` is yours to hold (used for polling in Step 3) — never show it to the human. `claim.user_code` is what you hand to the human — never poll with it. `claim_token_expires` is the outer 24-hour window for the whole registration; `claim.expires_in` (600s) is just the current `user_code`'s window, which you can refresh (Step 3c) as many times as needed within the outer window.

## Step 3 — Claim ceremony

The end goal: a signed-in human confirms the `user_code` you hand them. The shape (`user_code`, `verification_uri`, `expires_in`, `interval`) borrows from RFC 8628 device authorization.

### 3a. Hand off to the human

Surface `claim.verification_uri` and `claim.user_code` together:

> Open this link, sign in, and enter this code: **449073**
> https://dermascope.ai/login?return_to=...

They will: open the link, sign in as DermaScope.ai's operator, land on a page confirming which agent registered (`login_hint`) and what it's requesting (`post_claim_scopes`), type the code, and submit.

### 3b. Poll for completion

Poll `token_endpoint` with the profile-specific claim grant:
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:workos:agent-auth:grant-type:claim&claim_token=clm_c992a5313c4d1b6364001fce
```

While waiting:
```json
{ "error": "authorization_pending" }
```
On success — a standard token response, plus the `identity_assertion` extension:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "admin:submissions:read",
  "identity_assertion": "eyJhbGciOiJSUzI1NiIs...",
  "assertion_expires": "2026-08-27T07:47:12.000Z"
}
```
Use `access_token` immediately (Step 5). Cache `identity_assertion` — it's valid 30 days and is what you re-exchange for fresh access tokens without repeating this ceremony (Step 4).

Honor `interval` (5s): polling faster returns `{"error":"slow_down"}`, and each `slow_down` adds 5s to the required interval.

### 3c. If the code expires before the human finishes

```json
{ "error": "expired_token" }
```
Call `claim_endpoint` with the same `claim_token` to mint a fresh code (works any time within the 24-hour outer window):
```http
POST /agent/identity/claim
Content-Type: application/json

{ "claim_token": "clm_c992a5313c4d1b6364001fce" }
```
```json
{
  "registration_id": "reg_ad146cc59c07cf24713cdefa",
  "claim_attempt_id": "cat_...",
  "status": "initiated",
  "expires_at": "2026-07-29T07:46:22.072Z",
  "claim_attempt": { "user_code": "281905", "expires_in": 600, "verification_uri": "https://dermascope.ai/login?...", "interval": 5 }
}
```
Hand the new `user_code`/`verification_uri` to the human and resume polling (3b). If the 24-hour outer window has closed instead, this returns `410 claim_expired` — restart at Step 2.

## Step 4 — Re-exchange the identity_assertion

Once claimed, don't repeat Steps 2–3 for every new access token — exchange the cached `identity_assertion` via the RFC 7523 JWT-bearer grant:
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=eyJhbGciOiJSUzI1NiIs...
```
```json
{ "access_token": "eyJhbGciOiJSUzI1NiIs...", "token_type": "Bearer", "expires_in": 3600, "scope": "admin:submissions:read" }
```
If this returns `invalid_grant`, the assertion expired or the registration was revoked — restart at Step 2.

## Step 5 — Use the access_token

```http
GET /api/admin/submissions
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```
```json
{ "count": 1, "submissions": [ { "timestamp": "2026-07-27T10:15:00.000Z", "name": "Dr. Jane Doe", "email": "jane@clinic.example" } ] }
```
Tokens expire after 1 hour. Re-run Step 4 with the same `identity_assertion` for a new one — there is no separate refresh_token; the assertion replaces it.

## Errors

| Code | Where | What to do |
|---|---|---|
| `invalid_request` | `/agent/identity` | Body isn't `{"type":"service_auth","login_hint":"<email>"}`. Fix and retry. |
| `invalid_claim_token` | `/agent/identity/claim` | `claim_token` wrong or unknown. Restart at Step 2. |
| `claim_expired` (410) | `/agent/identity/claim` | The 24h outer window closed before the human finished. Restart at Step 2. |
| `claimed_or_in_flight` (409) | `/agent/identity/claim` | Already claimed — go straight to Step 4. |
| `authorization_pending` | `/oauth/token` (claim grant) | Human hasn't confirmed yet. Keep polling at `interval`. |
| `expired_token` | `/oauth/token` (claim grant) | Current `user_code` expired. Call `/agent/identity/claim` for a fresh one (Step 3c). |
| `slow_down` | `/oauth/token` (claim grant) | Polling too fast. Add 5s to `interval` and retry. |
| `invalid_grant` | `/oauth/token` (jwt-bearer) | `identity_assertion` expired/revoked. Restart at Step 2. |
| `invalid_client` | `/oauth/token` (client_credentials) | Not relevant to agents — this grant is for DermaScope.ai's own operator tooling only. |
| `unsupported_grant_type` | `/oauth/token` | `grant_type` isn't one of the three listed in discovery. |
| `invalid_request` / `invalid_token` / `insufficient_scope` | `/api/admin/submissions` | Missing, expired, or under-scoped bearer token. |

## Revocation

- **One access token** (RFC 7009): `POST /oauth/revoke` with `token=<access_token>` and, in the body, the still-valid `identity_assertion` for that same registration as proof of ownership:
  ```http
  POST /oauth/revoke
  Content-Type: application/x-www-form-urlencoded

  token=<access_token>&assertion=<identity_assertion>
  ```
  Always responds `200`, whether or not the token existed (RFC 7009 §2.2 — never confirms a token's existence).
- **The whole identity** (stop it from ever getting a new access token again, not just one token): there is no self-service endpoint. Contact DermaScope.ai's operator with the `registration_id`; they mark it revoked. Every subsequent claim-grant or jwt-bearer exchange for that registration then fails with `invalid_grant`, permanently.

---
Machine-readable references: [`/.well-known/oauth-authorization-server`](/.well-known/oauth-authorization-server), [`/.well-known/oauth-protected-resource`](/.well-known/oauth-protected-resource), [`/.well-known/jwks.json`](/.well-known/jwks.json), [`/openapi.yaml`](/openapi.yaml).
