# Agent-readiness — what was implemented, and what wasn't

This documents the response to an "isitagentready.com"-style audit covering
14 checks. Most are genuinely useful for a public marketing site; four
describe infrastructure (OAuth, MCP, agent-registration) that DermaScope.ai
doesn't have — those were intentionally **not** faked, for reasons explained
below.

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
| OpenAPI spec for the one real endpoint | [`public/openapi.yaml`](../public/openapi.yaml) |
| Human API docs | [`public/docs/api.md`](../public/docs/api.md) |

All of the above describe **real** things: the real `/api/contact` and
`/health` endpoints, and the real Early Access form action. Nothing here
claims a capability the site doesn't have.

**Note on Link headers & Markdown negotiation:** these only fire when the
Express server (`server/server.js`) is serving the built frontend — i.e. in
production, after `npm run build`. In local dev, Vite serves `/` directly and
never reaches this code, so you won't see the effect until you build + run
the Node server (`npm run build && npm start` from the repo, or a deployed
Railway instance).

## Intentionally skipped

These four checks assume an OAuth server, an MCP server, or an
agent-registration flow. DermaScope.ai has none of that — no user accounts,
no login, no token-issuing server, no MCP server. Publishing metadata for
them would mean inventing `authorization_endpoint` / `token_endpoint` /
`jwks_uri` values that don't back anything real. Any agent that tried to use
them would fail, and a human auditor reading them would be misled into
thinking auth/MCP infrastructure exists here.

- `/.well-known/oauth-authorization-server` or `/.well-known/openid-configuration`
- `/.well-known/oauth-protected-resource`
- `/auth.md`
- MCP Server Card (`/.well-known/mcp/server-card.json`)

**If any of these become real** (e.g. you add user accounts behind OAuth, or
stand up an actual MCP server), implementing the matching discovery document
at that point is straightforward — ask again once the underlying
infrastructure exists.

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
