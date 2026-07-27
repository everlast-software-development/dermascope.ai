# auth.md

This file tells AI agents how to authenticate with DermaScope.ai's one
protected API resource. There is no end-user login anywhere on this site —
every flow below is machine-to-machine: an agent, script, or backend service
acting on behalf of its operator, not a human signing in through a browser.

Everything in this document is self-contained: every endpoint, claim, and
example below is stated directly, with real values, not by reference to
another document. (The same values are *also* published as structured
metadata at `/.well-known/oauth-authorization-server` and
`/.well-known/oauth-protected-resource`, for programmatic cross-checking —
but nothing here depends on fetching those.)

## How an agent registers — overview

1. Obtain an **initial access token** from DermaScope.ai's operator
   (out-of-band — email, a shared secrets manager, etc.). There is no
   open self-service signup: a human decides who gets to hold a credential
   capable of reading Early Access submissions, before anything below is
   automated.
2. `POST` to the **registration endpoint** with that initial access token
   to obtain a `client_id` and `client_secret`.
3. Exchange the `client_id`/`client_secret` for a bearer **access token**
   at the **token endpoint**.
4. Use the access token against the one protected resource,
   `GET /api/admin/submissions`.
5. Optionally revoke the access token (or ask the operator to revoke the
   whole identity) when it's no longer needed.

Each step is specified in full below.

## Registration endpoint (`register_uri`)

```
https://dermascope.ai/agent/identity
```

`POST` requests here, authenticated with an initial access token, create a
new `service_auth` identity and return its credentials. This is the literal
value of `agent_auth.register_uri` (and `agent_auth.identity_endpoint`, the
same endpoint under an alternate name) in the authorization server metadata
— restated here directly so this document stands on its own.

## Supported identity types

| Identity type | Supported | Notes |
|---|---|---|
| `service_auth` | **Yes** | A secret-based credential (`client_id` + `client_secret`), either self-registered via the endpoint above or provisioned directly by the operator. The only method this site offers. |
| `identity_assertion` | No | Would require federating to an external identity provider (ID-JAG). No such provider is integrated. |
| `anonymous` | No | This resource returns applicant PII (Early Access submissions); there is no anonymous-access tier. |

## Supported credential types

| Credential type | Supported | Description |
|---|---|---|
| `client_secret` | **Yes** | An opaque bearer secret string, issued once at registration, paired with a `client_id`. Presented via HTTP Basic auth or as a form field when requesting a token. This is the only credential type this site issues — there is no client certificate, no signed-JWT-assertion credential, and no API-key-only mode. |

## Required claims

**In the registration request** (`POST` to the registration endpoint
above), the request body must include:

| Field | Required | Value |
|---|---|---|
| `identity_type` | **Yes** | Must be the literal string `"service_auth"` — any other value is rejected with `400 unsupported_identity_type`. |
| `client_name` | No | A free-text label for your records (e.g. `"my-agent"`). Defaults to `"unnamed-agent"` if omitted. |

**In the issued access token** (a JWT, signed RS256), the payload always
carries these claims:

| Claim | Meaning | Example |
|---|---|---|
| `iss` | Issuer — always `https://dermascope.ai` | `"https://dermascope.ai"` |
| `sub` | Subject — the `client_id` this token was issued to | `"agt_3f9c2b1a..."` |
| `aud` | Audience — the one protected resource this token is valid for | `"https://dermascope.ai/api/admin"` |
| `scope` | Space-delimited granted scopes | `"admin:submissions:read"` |
| `iat` | Issued-at, Unix timestamp | `1785160403` |
| `exp` | Expiry, Unix timestamp — always `iat + 3600` (1 hour) | `1785164003` |
| `jti` | Unique token ID — used to look it up if revoked (see *Credential revocation flow*) | `"e7f3dab8-..."` |

A client verifying the token independently (rather than calling the
protected resource and trusting its `401`) fetches the public key from
`https://dermascope.ai/.well-known/jwks.json` and checks `iss`, `aud`, and
`exp` match the values above.

## Token endpoint

```
https://dermascope.ai/oauth/token
```

Standard OAuth 2.0 `client_credentials` grant (RFC 6749 §4.4). Accepts
client credentials via HTTP Basic auth or as `client_id`/`client_secret`
form fields. There is no other grant type, no authorization-code/redirect
flow, and no refresh token — request a fresh token from this same endpoint
whenever the current one expires.

## Revocation endpoint

```
https://dermascope.ai/oauth/revoke
```

RFC 7009 token revocation. See *Credential revocation flow* below for the
full request/response and for how to revoke an entire identity (not just
one token).

## Step-by-step registration instructions

**Step 1 — Get an initial access token.** Ask DermaScope.ai's operator for
one. This is the only manual, human-mediated step; everything from Step 2
onward is a normal HTTP call you make yourself.

**Step 2 — Register.** `POST` to the registration endpoint
(`https://dermascope.ai/agent/identity`) with that token in the
`Authorization` header and `{"identity_type":"service_auth"}` (plus an
optional `client_name`) as the JSON body. See the complete example below.

**Step 3 — Store the returned `client_secret` immediately.** It's returned
exactly once, in the Step 2 response, and cannot be retrieved again. If
it's lost, repeat Step 2 to register a new identity (the operator can
revoke the orphaned old one — see *Credential revocation flow*).

**Step 4 — Request an access token.** `POST` to the token endpoint
(`https://dermascope.ai/oauth/token`) with `grant_type=client_credentials`
and the `client_id`/`client_secret` from Step 2/3.

**Step 5 — Call the protected resource.** `GET
https://dermascope.ai/api/admin/submissions` with `Authorization: Bearer
<access_token>` from Step 4.

**Step 6 — Repeat Step 4 when the token expires** (every hour). The
`client_id`/`client_secret` from Step 2/3 don't expire on their own — reuse
them for every new token request.

## Complete example request and response

**Registration** (Step 2):
```
POST /agent/identity HTTP/1.1
Host: dermascope.ai
Authorization: Bearer <initial access token, given to you out-of-band by the operator>
Content-Type: application/json

{"identity_type":"service_auth","client_name":"my-agent"}
```
```
HTTP/1.1 201 Created
Content-Type: application/json

{
  "identity_type": "service_auth",
  "client_id": "agt_3f9c2b1a8e7d4c6f",
  "client_secret": "kQ7n2Z...redacted-42-char-secret...J9pR",
  "scopes": ["admin:submissions:read"]
}
```

**Token request** (Step 4):
```
POST /oauth/token HTTP/1.1
Host: dermascope.ai
Authorization: Basic YWd0XzNmOWMyYjFhOGU3ZDRjNmY6a1E3bjJa...
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjBmZjUzN2NjMWE3NDdjOGQifQ.eyJzY29wZSI6ImFkbWluOnN1Ym1pc3Npb25zOnJlYWQiLCJpYXQiOjE3ODUxNjA0MDMsImV4cCI6MTc4NTE2NDAwMywiYXVkIjoiaHR0cHM6Ly9kZXJtYXNjb3BlLmFpL2FwaS9hZG1pbiIsImlzcyI6Imh0dHBzOi8vZGVybWFzY29wZS5haSIsInN1YiI6ImFndF8zZjljMmIxYThlN2Q0YzZmIiwianRpIjoiZTdmM2RhYjgtMDMzMy00ZmIzLTkxMzctNTBkMmM3ZDY0MmNiIn0.signature-omitted",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "admin:submissions:read"
}
```

**Calling the protected resource** (Step 5):
```
GET /api/admin/submissions HTTP/1.1
Host: dermascope.ai
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "count": 1,
  "submissions": [
    { "timestamp": "2026-07-27T10:15:00.000Z", "name": "Dr. Jane Doe", "email": "jane@clinic.example", "organization": "Example Clinic" }
  ]
}
```
Without a valid bearer token, this same call returns:
```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="admin", error="invalid_request"
Content-Type: application/json

{"error":"invalid_request","error_description":"Missing bearer token."}
```

## Credential revocation flow

**Revoking one access token** (RFC 7009) — useful within that token's
1-hour lifetime, e.g. if it leaked. Requires the same client credentials
that obtained the token:
```
POST /oauth/revoke HTTP/1.1
Host: dermascope.ai
Authorization: Basic YWd0XzNmOWMyYjFhOGU3ZDRjNmY6a1E3bjJa...
Content-Type: application/x-www-form-urlencoded

token=eyJhbGciOiJSUzI1NiIs...
```
```
HTTP/1.1 200 OK
```
(Always `200`, per RFC 7009 §2.2, whether or not the token was found or
already invalid — so this response never confirms whether a given token
value exists.) Once revoked, that specific token immediately fails on the
protected resource with `401 invalid_token`, `error_description: "Token has
been revoked."` — even though it hasn't expired yet.

**Revoking a whole identity** (permanently stopping a `client_id` from ever
obtaining a new token again — not just invalidating one already-issued
token): there is no self-service API endpoint for this. Step by step:
1. Contact DermaScope.ai's operator and give them the `client_id` to revoke.
2. The operator marks that identity `revoked` in the registration store.
3. Every subsequent `POST /oauth/token` request using that `client_id`
   (with any secret) now fails with `401 invalid_client` — permanently,
   not just until a token expires.

Tokens already issued before revocation remain valid until they naturally
expire (≤ 1 hour) unless also individually revoked via the flow above.

## Errors

| Situation | Response |
|---|---|
| `/api/admin/submissions` with no/garbled bearer token | `401 invalid_request` |
| `/api/admin/submissions` with an expired/invalid/wrong-audience/revoked token | `401 invalid_token` |
| Token valid but missing the required scope | `403 insufficient_scope` |
| `/agent/identity` without a valid initial access token | `401 invalid_token` |
| `/agent/identity` with an unsupported `identity_type` | `400 unsupported_identity_type` |
| `/oauth/token` with unknown or wrong client credentials | `401 invalid_client` |
| `/oauth/token` with a `grant_type` other than `client_credentials` | `400 unsupported_grant_type` |

---
Structured metadata (for automated cross-checking, not required reading):
[`/.well-known/oauth-authorization-server`](/.well-known/oauth-authorization-server),
[`/.well-known/oauth-protected-resource`](/.well-known/oauth-protected-resource),
[`/.well-known/jwks.json`](/.well-known/jwks.json),
[`/openapi.yaml`](/openapi.yaml), [`/docs/api.md`](/docs/api.md).
