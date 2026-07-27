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
register (see *Register*, below). There is no open self-service signup — a
human decides who gets to hold a credential capable of reading Early Access
submissions.

## Register

```
POST /agent/identity
Authorization: Bearer <initial access token, given to you out-of-band>
Content-Type: application/json

{ "identity_type": "service_auth", "client_name": "my-agent" }
```

Response (`201`):
```json
{
  "identity_type": "service_auth",
  "client_id": "agt_...",
  "client_secret": "...",
  "scopes": ["admin:submissions:read"]
}
```

`client_secret` is returned exactly once — store it now. It cannot be
recovered later; if it's lost, register again (or ask the operator to
revoke the old identity — see *Revocation*).

## Exchange for an access token

```
POST /oauth/token
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

Response: a bearer `access_token` (1 hour lifetime, scope
`admin:submissions:read`). This is the standard OAuth 2.0
`client_credentials` grant (RFC 6749 §4.4) — DermaScope.ai does not issue
identity assertions, so there is no separate JWT-bearer/ID-JAG exchange step.

## Use the access_token

```
GET /api/admin/submissions
Authorization: Bearer <access_token>
```

Tokens expire after 1 hour. Request a new one from `/oauth/token` when it
does — client_credentials doesn't use refresh tokens; just re-authenticate
with the same `client_id`/`client_secret`.

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
