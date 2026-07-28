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
| `agent_auth` block, full canonical `service_auth` flow | `server.js` → `POST /agent/identity`, referenced from `GET /.well-known/oauth-authorization-server` |
| Claim ceremony (RFC 8628-shaped): register → operator confirms a code → claim grant → `identity_assertion` | `server.js` → `POST /agent/identity/claim`, `POST /oauth/token` (`urn:workos:agent-auth:grant-type:claim`) — see [`docs/oauth-admin-api.md`](./oauth-admin-api.md) |
| Operator login (the human side of the claim ceremony — this site's first-ever login system) | `server.js` → `POST /api/operator/login`, [`src/pages/OperatorLogin.jsx`](../src/pages/OperatorLogin.jsx) at `/login` |
| Claim confirmation page | `server.js` → `POST /api/operator/claim/confirm`, [`src/pages/OperatorClaim.jsx`](../src/pages/OperatorClaim.jsx) at `/claim` |
| `identity_assertion` re-exchange (RFC 7523 JWT-bearer) | `server.js` → `POST /oauth/token` (`urn:ietf:params:oauth:grant-type:jwt-bearer`) |
| Token revocation (RFC 7009) | `server.js` → `POST /oauth/revoke` |
| Real MCP server (Streamable HTTP, 2 tools) | `server.js` → `POST /mcp` — see [`docs/mcp-server.md`](./mcp-server.md) |
| MCP Server Card (SEP-2127) | `server.js` → `GET /.well-known/mcp/server-card.json`, `GET /mcp/server-card` |
| AI Catalog (domain-level discovery, points at the card) | `server.js` → `GET /.well-known/ai-catalog.json` |
| OpenID Provider Metadata (discovery-convention alias, not a claim of full OIDC) | `server.js` → `GET /.well-known/openid-configuration` |
| Web Bot Auth: real Ed25519 key, actually signs the one real outbound request | `server.js` → `GET /.well-known/http-message-signatures-directory`, `signOutboundRequest()` used by `appendToGoogleSheet` |

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

## auth.md — the full canonical `service_auth` flow, including the claim ceremony

Earlier revisions of this project implemented `service_auth` as a
Bearer-gated Dynamic Client Registration endpoint (RFC 7591-style) — real,
but not what the spec's `service_auth` actually is (see "A note on stale
findings" below for how that was discovered). That's since been replaced
with the genuine flow from the canonical `AUTH.md` reference
(`github.com/workos/auth.md`, read in full):

- `POST /agent/identity` is now open — no auth on the call, just
  `{"type":"service_auth","login_hint":"<email>"}` — and issues no
  credential by itself.
- The response's `claim` block (`user_code`, `verification_uri`, RFC
  8628 device-code shape) is handed to a human, who confirms it at
  `/claim` — a new page, behind a new `/login` (this site's first-ever
  login system, gated by `OPERATOR_EMAIL`/`OPERATOR_PASSWORD`).
- Only after that confirmation does the agent (polling
  `grant_type=urn:workos:agent-auth:grant-type:claim`) receive an access
  token *and* a service-signed `identity_assertion` (30 days), which it
  re-exchanges for further access tokens via
  `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` (RFC 7523) —
  no more human interaction needed until it expires or is revoked.

`identity_assertion` (federated identity via **ID-JAG**) is still not
implemented — it needs an external identity-provider trust relationship
this site doesn't have, and there's no way to build that "for real" without
an actual IdP partner. Full setup and request/response reference:
[`docs/oauth-admin-api.md`](./oauth-admin-api.md), [`/auth.md`](../public/auth.md).

## Why `anonymous` was added after all

An audit against isitagentready.com's own `auth-md/SKILL.md` (not just the
canonical spec) found the actual reason "no complete registration method
advertised" kept failing even after `service_auth` was implemented
correctly: **the checker's own "Flow Metadata" section never mentions
`service_auth` at all** — it only recognizes three method archetypes
(ID-JAG, verified-email, and `anonymous`) as "complete." `service_auth`
being spec-correct was never going to satisfy a checker whose completeness
rules don't include it.

Once that was confirmed (live requests against every endpoint, cross-
referenced field-by-field against both the canonical spec and the
checker's own SKILL.md — see the git history for the full audit table),
the fix was to add `anonymous` as a genuinely second, working identity
type — not fake metadata pointing at nothing. It reuses the same claim-
ceremony infrastructure `service_auth` already has:

- `POST /agent/identity` with `{"type":"anonymous"}` (no login_hint, no
  auth) returns an immediate `identity_assertion` — but `pre_claim_scopes`
  is hard-coded to `[]`. Exchanging it yields an access token with an
  empty scope, which `GET /api/admin/submissions` rejects with
  `403 insufficient_scope` — verified live. There is still no way to read
  applicant PII without a human confirming a claim.
- The claim ceremony itself (operator login, device-code confirmation,
  post-claim `identity_assertion`) is identical to `service_auth`'s —
  anonymous registration just supplies the human's email later, at
  `POST /agent/identity/claim`, instead of at registration time.

`service_auth` is unchanged and was re-verified end-to-end after this
change (see the diff for the full test log). `identity_types_supported`
now lists both.

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

## `/.well-known/openid-configuration` — a discovery alias, not a claim of full OIDC

This site is an OAuth 2.0 authorization server, not an OpenID Connect
Provider — there's no browser login, no ID token, no UserInfo endpoint, no
"openid" scope. Strict OIDC Discovery requires fields (`authorization_endpoint`
unconditionally, plus `response_types_supported`, `subject_types_supported`,
`id_token_signing_alg_values_supported`) that describe machinery this site
doesn't have.

The endpoint exists anyway because some tooling checks
`/.well-known/openid-configuration` by convention before falling back to
`/.well-known/oauth-authorization-server` (RFC 8414) — so it's published as
an honest *alias*: `issuer`, `token_endpoint`, `jwks_uri`,
`grant_types_supported`, and `token_endpoint_auth_methods_supported` are
built from the exact same `ISSUER`/`TOKEN_ENDPOINT`/`JWKS_URI` constants the
RFC 8414 document uses (`server.js`), so the two can never drift apart —
verified live that both return byte-identical `issuer`/`jwks_uri` values.
`authorization_endpoint` stays omitted (same reasoning as the RFC 8414
document: no browser-redirect flow exists to point one at) and
`response_types_supported` is `[]` rather than fabricating `"code"` support
that isn't real. `subject_types_supported: ["public"]` and
`id_token_signing_alg_values_supported: ["RS256"]` are included to satisfy
OIDC Discovery's schema, and are true statements about this site's real JWTs
(non-pairwise `sub`, RS256 signing) — without claiming those JWTs are OIDC
ID tokens, which they aren't.

## A note on stale (and repeated) findings

The check `auth.md exists but agent_auth metadata was not found` was raised
three times. Live verification
(`curl https://dermascope.ai/.well-known/oauth-authorization-server`)
confirmed the `agent_auth` block was already present each time — not a
deploy-timing fluke. Two rounds of fixes chased field-name and
document-structure theories (adding `register_uri`/`revocation_uri`
aliases, then rewriting `/auth.md` to be self-contained). The check that
finally stuck around — `No complete Auth.md registration method
advertised` — turned out to have a real, different root cause underneath.

**Root cause, found by reading the full canonical reference file**
(`AUTH.md` in [github.com/workos/auth.md](https://github.com/workos/auth.md),
fetched in full — not summarized) **rather than trusting earlier partial
extracts:** this project's `service_auth` doesn't match the spec's
`service_auth`. The real spec's `service_auth` means *"you know a human
user's email, and need that human to complete a claim ceremony"* —
`POST /agent/identity` with `{"type":"service_auth","login_hint":"<email>"}`,
**no auth on the call itself**, and a response containing `claim_url`,
`claim_token`, and a `claim` block (`user_code`, `verification_uri`, RFC
8628 device-code style) that a signed-in human must confirm before any
credential is issued.

What this project actually built is different: `POST /agent/identity`
requires a Bearer *initial access token* (an operator secret, not a human's
email), takes no `login_hint`, and returns a `client_id`/`client_secret`
immediately with no claim step. That's a real, legitimate mechanism — RFC
7591 Dynamic Client Registration gated by an Initial Access Token — but it
isn't the spec's `service_auth`, `identity_assertion`/ID-JAG, or
`anonymous`. **All three of the spec's identity types model an agent acting
on behalf of a human end user who must claim/confirm the registration.**
This site's protected resource (`/api/admin/submissions`) has no end user
in that sense at all — it's the operator's own tooling reading the
operator's own data, with no delegation to model.

**Initial decision (since reversed): don't build a fake claim ceremony.**
Making this check fully "complete" meant adding this site's first-ever login
system purely to model a human "claimant" who wasn't actually part of this
system — a substantial new feature, not a metadata fix. The first pass
through this document accepted the check might not pass rather than build
that.

**The user then explicitly asked for the real thing, in detail** (matching
the canonical spec's exact field names and flow), which changed the
calculus: this was no longer "build fake infrastructure to please a
checker" but "the person who owns this system wants the real feature." So
it got built for real — see the "full canonical `service_auth` flow"
section above for what that involved (an actual operator login, a working
device-code-style claim ceremony, `identity_assertion` issuance and
re-exchange). Tested end-to-end: registration, pending/claimed states,
wrong-password lockout, wrong-code retry limits, `slow_down`/
`expired_token`/`claim_expired` timing edge cases, the jwt-bearer
re-exchange, and the static `client_credentials` client all continuing to
work unmodified.

Also fixed along the way: `agent_auth.credential_types` (isitagentready.com's
SKILL.md lists this exact key — this project had `credential_types_supported`
only, which doesn't match). Both keys are now published, and the value they
describe changed from `["client_secret"]` to `["identity_assertion"]` — the
credential an agent actually ends up holding after the real flow above.

If a re-raised finding keeps failing after live verification, suspect the
checker's expectations (or a genuine architecture mismatch, as above)
before assuming the implementation is wrong.

## Web Bot Auth — a real key, actually used, not a placeholder

This started as an empty directory (`{"keys":[]}`) — an honest statement
that this site didn't sign outbound requests. The user then asked for the
real thing instead: generate a real key, sign a real outbound request with
it, publish the matching public key — no unused keys, no fake metadata.
That's what's implemented now.

**What signs, and why only that.** Checked every outbound HTTP call in
`server.js`: exactly three. `appendToGoogleSheet`'s call to this project's
own Google Apps Script webhook is the one real request to a third party —
**that's the one that's signed.** The other two are loopback calls to
`127.0.0.1` (the MCP tool handlers reaching this same server's own routes)
— signing a request to yourself proves nothing to anyone, so those stay
unsigned. Google's Apps Script doesn't verify Web Bot Auth signatures, but
that's beside the point: the signature is real and independently
verifiable regardless of whether today's one receiver checks it — the same
way a site can correctly adopt a standard before every counterpart does.

**The key.** A persistent Ed25519 keypair (`WEB_BOT_AUTH_PRIVATE_KEY_PEM`/
`PUBLIC_KEY_PEM` in `.env.example`, same load-or-generate-ephemeral pattern
as the OAuth signing key). The published JWKS entry's `kid` is computed as
the actual RFC 7638 / RFC 8037 Appendix A.3 JWK thumbprint (SHA-256 over
`{"crv":"Ed25519","kty":"OKP","x":"<x>"}`, built by hand in that exact
member order — not `JSON.stringify`, whose key order isn't guaranteed to
match) — not an arbitrary ID, so a receiver can compute it independently
from the public key alone and confirm it matches.

**The signature.** Built with the well-tested
[`http-message-signatures`](https://www.npmjs.com/package/http-message-signatures)
library (RFC 9421 canonicalization is genuinely easy to get subtly wrong by
hand — this is the same reasoning that led to using `jsonwebtoken` instead
of hand-rolled JWT signing elsewhere in this project), signing with Node's
built-in `crypto.sign(null, data, key)` for Ed25519. Every required
parameter from
[draft-meunier-web-bot-auth-architecture-05](https://www.ietf.org/archive/id/draft-meunier-web-bot-auth-architecture-05.html)
§4.2 is present: `created`, `expires` (5 minutes — well inside the spec's
24h recommendation), `keyid` (the thumbprint above), `alg="ed25519"`,
`tag="web-bot-auth"` (the literal required value), and a fresh 64-byte
`nonce` per request. Covered components are `@authority` and the
`Signature-Agent` dictionary member (`sig1="https://dermascope.ai"`) — the
exact shape shown in the spec's own Appendix A.2.2 example.

**Verified, not assumed.** Two standalone tests before wiring this in:
(1) sign with a fresh keypair, verify with only the public key, using the
identical library calls and parameter shapes used in `server.js` — passed;
(2) sign a real request, send it over a real `fetch()` to a real local HTTP
listener, read back exactly what the receiver saw on the wire, and verify
*that* — confirming `fetch()`'s own header serialization doesn't corrupt
anything — passed. Full project regression (every other route) confirmed
no breakage.

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
