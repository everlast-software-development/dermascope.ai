# DermaScope.ai API

DermaScope.ai does not expose a general-purpose public API. The one
programmatic endpoint on this domain powers the **Early Access** form on the
homepage.

Machine-readable spec: [`/openapi.yaml`](/openapi.yaml)
Catalog entry: [`/.well-known/api-catalog`](/.well-known/api-catalog)

## `POST /api/contact`

Submits an Early Access request. Required fields: `name`, `email`, `title`,
`specialty`, `organization`, `country`, `city`, `phone`, `interest`,
`consent` (must be `true`). Optional: `physicians`, `emr`, `challenges`
(array).

On success the server sends an internal notification email, a confirmation
email to the applicant, and best-effort mirrors the submission to a Google
Sheet (see `/google-apps-script/README.md` in the source repo).

```json
{
  "name": "Dr. Jane Doe",
  "email": "jane@clinic.example",
  "title": "Dermatologist",
  "specialty": "Dermatology",
  "organization": "Example Clinic",
  "country": "United Arab Emirates",
  "city": "Dubai",
  "phone": "+971500000000",
  "interest": "Clinic",
  "consent": true
}
```

Response: `{ "success": true, "message": "Email sent successfully." }`

## `GET /health`

Liveness check. Response: `{ "status": "ok" }`

## `GET /api/admin/submissions` (OAuth-protected)

Lists Early Access submissions, newest first. Requires a bearer token from
`POST /oauth/token` (client_credentials grant) with the
`admin:submissions:read` scope. Discovery metadata:
[`/.well-known/oauth-authorization-server`](/.well-known/oauth-authorization-server),
[`/.well-known/oauth-protected-resource`](/.well-known/oauth-protected-resource).

**Agents:** the full authenticate-as-yourself walkthrough (register → get a
token → call the endpoint → revoke) is [`/auth.md`](/auth.md). Full setup
guide for the site operator: `docs/oauth-admin-api.md` in the source repo.
