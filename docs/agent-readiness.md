# Agent-readiness — what was implemented, and what wasn't

This documents the response to an "isitagentready.com"-style audit covering
14 checks. Most are genuinely useful for a public marketing site. Three
(OAuth/OIDC discovery, protected-resource metadata, and `auth.md`
agent-registration) initially had nothing real to describe, so a real
protected admin API — and a real, if deliberately narrow, agent-registration
flow — was built to back them instead of publishing fake metadata — see
below. One more (MCP Server Card) still describes infrastructure
DermaScope.ai doesn't have and remains intentionally **not** faked.

## Implemented

| Check | Where |
|---|---|
| `robots.txt` with explicit crawl rules | [`public/robots.txt`](../public/robots.txt) |
| `sitemap.xml`, referenced from robots.txt | [`public/sitemap.xml`](../public/sitemap.xml) |
| `Link` response headers on the homepage | `server.js` → `app.get('/', ...)` |
| AI-crawler `User-agent` rules (GPTBot, ClaudeBot, Google-Extended, …) | [`public/robots.txt`](../public/robots.txt) |
| `Content-Signal` (ai-train / search / ai-input) | [`public/robots.txt`](../public/robots.txt) |
| Markdown for Agents (`Accept: text/markdown` on `/`) | `server.js` → `HOMEPAGE_MARKDOWN` |
| API catalog (RFC 9727) | `server.js` → `GET /.well-known/api-catalog` |
| Agent skills discovery index | `server.js` → `GET /.well-known/agent-skills/index.json`, [`public/.well-known/agent-skills/early-access-request.json`](../public/.well-known/agent-skills/early-access-request.json) |
| WebMCP tool (`navigator.modelContext`) | [`src/lib/webmcp.js`](../src/lib/webmcp.js) |
| OpenAPI spec for the real endpoints | [`public/openapi.yaml`](../public/openapi.yaml) |
| Human API docs | [`public/docs/api.md`](../public/docs/api.md) |
| OAuth 2.0 authorization server (client_credentials, RS256) | `server.js` → `POST /oauth/token`, `GET /.well-known/jwks.json` |
| OAuth 2.0 discovery (RFC 8414) | `server.js` → `GET /.well-known/oauth-authorization-server` |
| OAuth Protected Resource Metadata (RFC 9728) | `server.js` → `GET /.well-known/oauth-protected-resource` |
| The protected resource itself | `server.js` → `GET /api/admin/submissions` — see [`docs/oauth-admin-api.md`](./oauth-admin-api.md) |
| `auth.md` agent-registration metadata | [`public/auth.md`](../public/auth.md) |
| `agent_auth` block (RFC 7591-flavored `service_auth` registration) | `server.js` → `POST /agent/identity`, referenced from `GET /.well-known/oauth-authorization-server` |
| Token revocation (RFC 7009) | `server.js` → `POST /oauth/revoke` |

All of the above describe **real** things: the real `/api/contact` and
`/health` endpoints, and the real Early Access form action. Nothing here
claims a capability the site doesn't have.

**Note on Link headers & Markdown negotiation:** these only fire when the
Express server (`server/server.js`) is serving the built frontend — i.e. in
production, after `npm run build`. In local dev, Vite serves `/` directly and
never reaches this code, so you won't see the effect until you build + run
the Node server (`npm run build && npm start` from the repo, or a deployed
Railway instance).

## OAuth — how "not applicable" became real

The OAuth/OIDC discovery check was raised twice. The first time, the honest
answer was: no protected APIs exist, so publishing `token_endpoint` /
`jwks_uri` values would describe an auth server that doesn't exist — any
agent trying to use them would fail. Rather than leave it there or fake it,
we built the thing the check assumes exists: a real client_credentials OAuth
2.0 authorization server protecting a real endpoint,
`GET /api/admin/submissions` (reads locally-stored Early Access
submissions). See [`docs/oauth-admin-api.md`](./oauth-admin-api.md) for setup.

## auth.md — real, but deliberately narrower than the full spec

The [workos/auth.md](https://github.com/workos/auth.md) protocol this check
references defines three identity types (`service_auth`, `identity_assertion`,
`anonymous`), a device-code-style "claim ceremony" for linking an agent
identity to a human account, and an events/webhook system for revocation
notices. DermaScope.ai only implements **`service_auth`** — a
pre-provisioned or self-registered secret, gated behind an operator-issued
initial access token (see [`docs/oauth-admin-api.md`](./oauth-admin-api.md)).

`identity_assertion` (federated identity via ID-JAG) needs an external
identity-provider relationship this site doesn't have; the claim ceremony and
event webhooks need infrastructure (a device-code UI, a webhook dispatcher)
that doesn't exist either. Rather than stub those out non-functionally, the
`identity_types_supported` field in `agent_auth` lists only `service_auth`,
and `/auth.md` says so explicitly — the same "advertise only what's real"
principle applied throughout this doc.

## Still intentionally skipped

MCP Server Card (`/.well-known/mcp/server-card.json`) — DermaScope.ai runs no
MCP transport. Publishing this would mean inventing an MCP server that
doesn't exist.

**If that changes** (e.g. you stand up an actual MCP server), implementing
the matching discovery document at that point is straightforward — ask again
once the underlying infrastructure exists.

## DNS for AI Discovery (DNS-AID) — action required outside this repo

DNS-AID publishes discovery records under your domain's DNS zone. This
**cannot be done from the codebase** — it requires access to whichever
service manages `dermascope.ai`'s DNS (e.g. Cloudflare, GoDaddy, Namecheap,
Route 53). No such records were published; here's what to add if you want
this:

1. In your DNS provider's dashboard, add an `SVCB` (or `HTTPS`) record:
   - **Name:** `_agents._index.dermascope.ai` (or a specific protocol name,
     e.g. `_a2a._agents.dermascope.ai` for an A2A endpoint)
   - **Priority:** `1`
   - **Target:** `.` (ServiceMode — no separate target host)
   - **Params:** `alpn="h2"` and an `endpoint` param pointing at the actual
     discovery URL, e.g. `endpoint="https://dermascope.ai/.well-known/agent-skills/index.json"`

   Example zone-file syntax:
   ```
   _agents._index.dermascope.ai. 3600 IN SVCB 1 . alpn="h2" endpoint="https://dermascope.ai/.well-known/agent-skills/index.json"
   ```

2. Confirm DNSSEC is enabled on the zone (most registrars have a one-click
   toggle) so resolvers can validate the record hasn't been tampered with.

3. Verify with `dig`:
   ```
   dig SVCB _agents._index.dermascope.ai
   ```

This is still an early/draft spec
(`draft-mozleywilliams-dnsop-dnsaid`) — worth revisiting once it stabilizes
before investing further.
