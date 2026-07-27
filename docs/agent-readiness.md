# Agent-readiness — what was implemented, and what wasn't

This documents the response to an "isitagentready.com"-style audit covering
14 checks. Most are genuinely useful for a public marketing site. Four
(OAuth/OIDC discovery, protected-resource metadata, `auth.md`
agent-registration, and the MCP Server Card) initially had nothing real to
describe, so real infrastructure was built to back each one instead of
publishing fake metadata — see below. The one item that genuinely can't be
done from this repo (DNS-AID) is documented separately, with what to paste
where.

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
| Real MCP server (Streamable HTTP, 2 tools) | `server.js` → `POST /mcp` — see [`docs/mcp-server.md`](./mcp-server.md) |
| MCP Server Card (SEP-2127) | `server.js` → `GET /.well-known/mcp/server-card.json`, `GET /mcp/server-card` |
| AI Catalog (domain-level discovery, points at the card) | `server.js` → `GET /.well-known/ai-catalog.json` |

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

## MCP Server Card — built the server, not just the card

Publishing `/.well-known/mcp/server-card.json` on its own would have been
exactly the mistake this doc keeps warning against: a document claiming an
MCP transport exists at a URL that, until this point, didn't answer JSON-RPC
at all. So the actual server got built first — a real `POST /mcp` endpoint
(Streamable HTTP, single-response JSON, no session/SSE since none of that is
required for a stateless 2-tool server) — and the card was generated to
match it, using the *actual* SEP-2127 schema (fetched from the reference
[`experimental-ext-server-card`](https://github.com/modelcontextprotocol/experimental-ext-server-card)
repo, not guessed from the audit's paraphrase — notably, the real schema has
no `serverInfo`/`transport`/`capabilities` fields at the top level the way
the audit's "Fix" text implied; those belong to the live `initialize`
response, not the static card). Full writeup:
[`docs/mcp-server.md`](./mcp-server.md).

## A note on stale findings

One of the re-raised checks — `auth.md exists but agent_auth metadata was
not found` — was already fixed and deployed before this check ran again.
Live verification (`curl https://dermascope.ai/.well-known/oauth-authorization-server`)
confirms the `agent_auth` block is present and correct. If an audit tool
flags something that's demonstrably live, treat it as a caching/timing
false-negative rather than assuming more work is needed — verify against the
real site before re-implementing anything.

## DNS for AI Discovery (DNS-AID) — action required outside this repo

DNS-AID publishes discovery records under your domain's DNS zone. This
**cannot be done from the codebase** — it requires access to whichever
service manages `dermascope.ai`'s DNS (e.g. Cloudflare, GoDaddy, Namecheap,
Route 53). No such records were published. The record syntax below was
corrected against the actual draft
(`draft-mozleywilliams-dnsop-dnsaid`, fetched directly rather than
recalled from memory) — an earlier version of this doc had the label order
backwards (`_agents._index` instead of `_index._agents`) and invented an
`endpoint` SvcParam that isn't part of the spec. Real SvcParams are `alpn`,
`well-known`, `cap`/`cap-sha256`, `policy`, `realm`.

1. In your DNS provider's dashboard, add an `SVCB` record:
   - **Name:** `_index._agents.dermascope.ai` — this is the spec's fixed
     entry-point label (chosen for eventual IANA registration), not a
     placeholder to swap out.
   - **Priority:** `1` (ServiceMode)
   - **Target:** `.` (this domain — no separate host)
   - **Params:** `alpn` names the protocol(s) this domain offers (e.g. `mcp`
     for the MCP server this repo now has, or `a2a` if you add an A2A agent
     later); `well-known` names the RFC 8615 path clients should fetch
     relative to `/.well-known/` on this domain.

   Example zone-file syntax, pointing at the real MCP Server Card this repo
   now serves:
   ```
   _index._agents.dermascope.ai. 3600 IN SVCB 1 . alpn="mcp" well-known="mcp/server-card.json"
   ```
   Multi-protocol domains need one record per protocol (distinct `alpn`
   values), not a comma-separated list in one record.

2. Confirm DNSSEC is enabled on the zone (most registrars have a one-click
   toggle) so resolvers can validate the record hasn't been tampered with.

3. Verify with `dig` (note: many resolvers need `TYPE64` if they don't
   recognize the `SVCB` mnemonic yet):
   ```
   dig SVCB _index._agents.dermascope.ai
   dig TYPE64 _index._agents.dermascope.ai
   ```

This is still an early/draft spec — worth revisiting once it stabilizes
before investing further than the one entry-point record above.
