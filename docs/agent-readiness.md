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

## A note on stale (and repeated) findings

The check `auth.md exists but agent_auth metadata was not found` was raised
twice. Both times, live verification
(`curl https://dermascope.ai/.well-known/oauth-authorization-server`)
confirmed the `agent_auth` block was already present and correct — not a
deploy-timing fluke, since it stayed correct across two separate checks.

The likely real cause: the checker's own "Fix" text names fields
(`register_uri`, "credential types", "claim/revocation URLs") that don't
match the actual auth.md spec's field names (verified against
[github.com/workos/auth.md](https://github.com/workos/auth.md) —
`identity_endpoint`, `identity_types_supported`, `revocation_endpoint`, no
"credential type" concept at all). A checker doing a literal string search
for its own suggested names would miss a spec-correct implementation using
the real ones. Rather than keep re-verifying the same non-problem, `register_uri`
and `revocation_uri` are now published as aliases of the real
`identity_endpoint`/`revocation_endpoint` (same endpoints, two labels), and
`credential_types_supported: ["client_secret"]` was added — accurate
(service_auth's credential *is* a client_secret) and not previously stated
explicitly. `claim_uri` is still absent: there's still no claim ceremony to
link to (see the `auth.md` section above) — that's a real gap, not a
labeling one, and won't be closed by renaming fields.

If a re-raised finding keeps failing after live verification, suspect the
checker's expectations before assuming the implementation is wrong.

## DNS for AI Discovery (DNS-AID) — the exact records, verified

DNS-AID publishes discovery records under the domain's DNS zone. This
**cannot be done from the codebase** — it requires the Cloudflare dashboard
or API for `dermascope.ai`'s zone (confirmed via `nslookup -type=NS`:
nameservers are `melissa.ns.cloudflare.com` / `ram.ns.cloudflare.com`). No
such records exist yet. Everything below was verified live, against the
current draft (`draft-mozleywilliams-dnsop-dnsaid-**02**`, 27 May 2026 —
fetched fresh; an earlier version of this doc used draft text that has since
been superseded) and against this domain's actual state — nothing here is a
placeholder.

### What actually gets advertised, and why only this

Inspected: API catalog, OAuth server, WebMCP, OpenAPI, agent skills index,
MCP server, auth.md. Only **one** qualifies for a DNS-AID SVCB record: the
**real MCP server at `/mcp`**. Reasoning:

- DNS-AID's `alpn` param advertises *network-reachable agent protocols* —
  something a remote client connects to. MCP is the only thing on this
  domain that is that: a live, tested `POST /mcp` JSON-RPC endpoint (see
  [`docs/mcp-server.md`](./mcp-server.md)).
- **WebMCP is explicitly out of scope** — it's `navigator.modelContext`, a
  browser-side JS API that runs inside a loaded page. There is no server for
  DNS to point at; a remote DNS query can never "connect to" a browser API.
  Advertising it via DNS-AID would be a category error, not just an
  omission.
- API catalog, OpenAPI, the agent skills index, and OAuth discovery aren't
  independent protocols — they're HTTP metadata *about* the one real server,
  already reachable once an agent has found the domain via the record below
  (it points at the MCP Server Card, which is what actually cascades to
  everything else).

### DNSSEC — already done, verified live

```
$ curl -s "https://cloudflare-dns.com/dns-query?name=dermascope.ai&type=DNSKEY" -H "accept: application/dns-json"
→ "AD":true, 2 DNSKEY records (ECDSAP256SHA256)
$ curl -s "https://cloudflare-dns.com/dns-query?name=dermascope.ai&type=DS" -H "accept: application/dns-json"
→ "AD":true, DS record present at the .ai registry
```
The zone is fully signed and validating end-to-end. No action needed here —
don't toggle anything in Cloudflare's DNSSEC settings; it would only risk
breaking a chain that already works.

### The two records

Both target `dermascope.ai.` explicitly — **not** `.` — because the record
owner names below (`_index._agents...`, `_mcp._agents...`) are synthetic
discovery labels, not the real service hostname; per RFC 9460, `.` as
TargetName means "the owner name IS the service," which would be wrong here.
`h2` in `alpn` is verified live (`openssl s_client -alpn h2` against
`dermascope.ai:443` → negotiated), not assumed — Cloudflare's edge does not
advertise `h3` for this zone, so it's deliberately not claimed. `port=443`,
the IPs from `nslookup -type=A` (`104.21.73.104`, `172.67.189.166`), are
Cloudflare's shared anycast addresses for this proxied domain — real right
now, but excluded as `ipv4hint`/`ipv6hint` since they rotate and the
explicit hostname target already resolves them without a hint.

**Record 1 — canonical entry point** (`_index._agents` is the label the
draft names for eventual IANA registration — the primary, spec-preferred
form):

| Field | Value |
|---|---|
| Type | `SVCB` (Cloudflare also accepts `HTTPS` for this rdata shape — either passes isitagentready.com's check, which explicitly accepts both) |
| Name | `_index._agents.dermascope.ai` |
| Priority | `1` |
| Target | `dermascope.ai.` |
| Value | `alpn="mcp,h2" port="443" mandatory="alpn,port"` |

**Record 2 — protocol-scoped label** (the draft calls this form
"redundant, as the protocol is in the alpn" of Record 1 — but it's the exact
shape isitagentready.com's own check example uses, so it's published
alongside Record 1 for compatibility, not instead of it — same real
endpoint, same real capabilities, no new claim):

| Field | Value |
|---|---|
| Type | `SVCB` (or `HTTPS`) |
| Name | `_mcp._agents.dermascope.ai` |
| Priority | `1` |
| Target | `dermascope.ai.` |
| Value | `alpn="mcp,h2" port="443" mandatory="alpn,port"` |

`mandatory=alpn,port` follows the draft's Section 6.3 guidance: list only
the params a client *must* understand to use the record at all.

**Why `well-known` was dropped:** an earlier version of this doc included
`well-known="mcp/server-card.json"`, matching the draft's convention for
pointing at the RFC 8615 path clients should fetch. It was removed after
Cloudflare rejected it as an invalid record value. Checked against the
[IANA SvcParamKey registry](https://www.iana.org/assignments/dns-svcb/dns-svcb.xhtml)
directly: the only registered keys are `mandatory`, `alpn`, `no-default-alpn`,
`port`, `ipv4hint`, `ech`, `ipv6hint`, `dohpath`, `ohttp`,
`tls-supported-groups`, `docpath`, `pvd`, `oots`. `well-known` (along with
`cap`, `cap-sha256`, `policy`, `realm`) is specific to this still-draft
document and hasn't completed IANA registration — Cloudflare's validator
only accepts registered keys, so it rejects the whole value string on sight
of an unrecognized one. Nothing is lost in practice: a client that resolves
`alpn=mcp` already knows, by MCP/SEP-2127 convention, to check
`/.well-known/mcp/server-card.json` — the DNS param was a redundant
optimization, not the only path to it.

### Adding these in Cloudflare

Cloudflare's SVCB/HTTPS record schema is `name` / `type` / `ttl` /
`data.priority` / `data.target` / `data.value` — the "Value" column above
maps directly to `data.value`. In the dashboard: DNS → Records → Add record
→ type `SVCB` (or `HTTPS` if that's what's offered), paste Name/Priority/
Target as shown, and `alpn="mcp,h2" port="443" mandatory="alpn,port"` into
the value field. TTL `3600` (or Cloudflare's "Auto") is fine either way.

### Verify after adding

```bash
dig SVCB _index._agents.dermascope.ai
dig SVCB _mcp._agents.dermascope.ai
# or, if a resolver doesn't know the SVCB mnemonic yet:
dig TYPE64 _index._agents.dermascope.ai
```
Then re-run the isitagentready.com DNS-AID check.
