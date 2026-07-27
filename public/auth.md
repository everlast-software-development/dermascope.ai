# auth.md

This file tells AI agents how to authenticate with DermaScope.ai's one
protected API resource. There is no end-user login anywhere on this site —
every flow below is machine-to-machine: an agent, script, or backend service
acting on behalf of its operator, not a human signing in through a browser.

## Discover

1. Call the protected resource without a token:
   `GET /api/admin/submissions` → `401`, with a `WWW-Authenticate` header
   naming the resource metadata document (or fetch it directly):
   [`/.well-known/oauth-protected-resource`](/.well-known/oauth-protected-resource).
2. That document names the authorization server. Fetch its metadata:
   [`/.well-known/oauth-authorization-server`](/.well-known/oauth-authorization-server).
3. Read the `agent_auth` block in that response for the registration and
   revocation endpoints used below.

## Pick a method

DermaScope.ai supports exactly one identity type: **`service_auth`** — a
pre-established, secret-based trust relationship between this site's
operator and one specific agent or service.

`identity_assertion` (federated identity via ID-JAG) and `anonymous` access
are **not supported**. This site has no external identity provider
integration and no anonymous-access tier for a resource that returns
applicant PII — advertising those flows would describe infrastructure that
doesn't exist here.

If you don't already hold a `client_id`/`client_secret` pair, you need an
**initial access token** from DermaScope.ai's operator before you can
register (see *Agent Registration*, below). There is no open self-service
signup — a human decides who gets to hold a credential capable of reading
Early Access submissions.

## Agent Registration

This section is the complete, standalone registration flow: everything
needed to go from holding an initial access token to a working, authorized
API call, in one place — no other section of this document is required to
follow it.

**1. Registration endpoint.** DermaScope.ai's registration endpoint is
published as `agent_auth.register_uri` in
[`/.well-known/oauth-authorization-server`](/.well-known/oauth-authorization-server)
— currently `https://dermascope.ai/agent/identity` (the same real endpoint
is also listed there as `agent_auth.identity_endpoint`; both names point at
one endpoint). Registration is **not** open self-service — it requires an
**initial access token** that DermaScope.ai's operator issues to you
out-of-band (email, a shared secrets manager, etc.). A human decides who
gets to register before anything is automated; the registration *call*
itself is fully automated once you hold that token:

```
POST /agent/identity          (this is agent_auth.register_uri)
Authorization: Bearer <initial access token, given to you out-of-band by the operator>
Content-Type: application/json

{ "identity_type": "service_auth", "client_name": "my-agent" }
```

**2. How `client_id` and `client_secret` are obtained.** A successful call
above returns both, directly in the response body — there is no separate
step or endpoint:

```json
{
  "identity_type": "service_auth",
  "client_id": "agt_...",
  "client_secret": "...",
  "scopes": ["admin:submissions:read"]
}
```

`client_secret` is shown exactly once, at registration time, and cannot be
retrieved again afterward. If it's lost, register again (or ask the
operator to revoke the old identity — see *Revocation*, below).

**3. Requesting an OAuth token.** Exchange the `client_id`/`client_secret`
pair from step 2 for a bearer access token via the `token_endpoint` also
published in
[`/.well-known/oauth-authorization-server`](/.well-known/oauth-authorization-server)
— the standard OAuth 2.0 `client_credentials` grant (RFC 6749 §4.4):

```
POST /oauth/token
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

Response:
```json
{ "access_token": "...", "token_type": "Bearer", "expires_in": 3600, "scope": "admin:submissions:read" }
```
DermaScope.ai does not issue identity assertions, so there is no separate
JWT-bearer/ID-JAG exchange step — the token from `/oauth/token` is the final
credential.

**4. Which endpoint the token is used for.** The access token is a bearer
credential for exactly one protected resource:
`GET /api/admin/submissions` (lists Early Access form submissions):

```
GET /api/admin/submissions
Authorization: Bearer <access_token>
```

Tokens expire after 1 hour. There is no refresh token — request a new one
from `/oauth/token` (step 3) with the same `client_id`/`client_secret` when
it expires.

## Errors

| Situation | Response |
|---|---|
| `/api/admin/submissions` with no/garbled bearer token | `401 invalid_request` |
| `/api/admin/submissions` with an expired/invalid/wrong-audience token | `401 invalid_token` |
| Token valid but missing the required scope | `403 insufficient_scope` |
| `/agent/identity` without a valid initial access token | `401 invalid_token` |
| `/agent/identity` with an unsupported `identity_type` | `400 unsupported_identity_type` |
| `/oauth/token` with unknown or wrong client credentials | `401 invalid_client` |
| `/oauth/token` with a `grant_type` other than `client_credentials` | `400 unsupported_grant_type` |

## Revocation

- **Revoke one access token** (RFC 7009):
  ```
  POST /oauth/revoke
  Authorization: Basic base64(client_id:client_secret)
  Content-Type: application/x-www-form-urlencoded

  token=<the access_token to revoke>
  ```
  Only useful within a token's 1-hour lifetime; you must present the same
  client credentials that obtained the token.
- **Revoke a whole identity** (permanently stop a client from getting new
  tokens at all): there is no self-service endpoint for this — contact
  DermaScope.ai's operator.

---
Full technical references: [`/.well-known/oauth-authorization-server`](/.well-known/oauth-authorization-server),
[`/.well-known/oauth-protected-resource`](/.well-known/oauth-protected-resource),
[`/openapi.yaml`](/openapi.yaml), [`/docs/api.md`](/docs/api.md).
