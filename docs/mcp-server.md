# MCP server — what it is and how to connect

A real, working MCP server (not just a discovery card), built into
`server/server.js`. It exposes DermaScope.ai's two real actions as MCP tools
over the Streamable HTTP transport.

- **Endpoint:** `POST /mcp` (JSON-RPC 2.0). `GET /mcp` returns `405` — this
  server doesn't offer a server-initiated SSE stream (optional per spec).
- **Discovery:** `/.well-known/mcp/server-card.json` (also served at
  `/mcp/server-card`), and a domain-level
  [`/.well-known/ai-catalog.json`](https://github.com/Agent-Card/ai-catalog)
  pointing at it. All three are defined in `server/server.js`.
- **Tools:**
  - `submit_early_access_request` — no auth. Forwards to the same
    `POST /api/contact` the website's form uses.
  - `list_early_access_submissions` — needs a `bearer_token` argument.
    Forwards to `GET /api/admin/submissions`. Get a token the same way any
    other admin caller does — see [`docs/oauth-admin-api.md`](./oauth-admin-api.md)
    or [`/auth.md`](../public/auth.md).

## Try it with curl

```bash
# Handshake
curl -s -X POST https://dermascope.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# List tools
curl -s -X POST https://dermascope.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call the public tool
curl -s -X POST https://dermascope.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{
        "name":"submit_early_access_request",
        "arguments":{"name":"Dr. Jane Doe","email":"jane@clinic.example","title":"Dermatologist","specialty":"Dermatology","organization":"Example Clinic","country":"United Arab Emirates","city":"Dubai","phone":"+971500000000","interest":"Clinic","consent":true}
      }}'

# Call the admin tool (get a token first — see docs/oauth-admin-api.md)
curl -s -X POST https://dermascope.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{
        "name":"list_early_access_submissions",
        "arguments":{"bearer_token":"<access_token from /oauth/token>"}
      }}'
```

## Design decisions worth knowing

- **No session management.** `Mcp-Session-Id` is optional per the Streamable
  HTTP spec for a stateless server, and this one is stateless — every
  `tools/call` independently forwards to (and is authorized by) the existing
  HTTP endpoints. There's nothing server-side to key a session to.
- **No SSE.** Every response is a single `Content-Type: application/json`
  reply, which the spec explicitly allows as an alternative to opening an SSE
  stream. Simpler, and this server never needs to push unsolicited messages.
- **Origin check.** `POST /mcp` rejects requests carrying an `Origin` header
  outside `ALLOWED_ORIGINS` (the same list CORS uses), per the transport
  spec's DNS-rebinding guidance. Most non-browser MCP clients don't send an
  `Origin` header at all, so this only affects browser-based callers.
- **`bearer_token` as a tool argument, not transport-level auth.** MCP has no
  standard way to say "this tool needs scope X, that one doesn't" at the
  transport layer — and this server has exactly one tool that needs auth and
  one that doesn't. Rather than gate the whole `/mcp` endpoint behind OAuth
  (which would also block the public submission tool), the admin tool takes
  the token as an argument and forwards it to the real, already-tested
  `requireAdminAuth` middleware on `/api/admin/submissions`. One
  authorization implementation, not two.
- **Server Card omits tools/capabilities.** [SEP-2127](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127)
  (the card's spec) deliberately excludes primitive lists from the static
  card — a server's tools can vary by session/auth/config, so clients must
  always confirm via `tools/list` at connect time rather than trust a cached
  document. The card here only advertises identity and the transport
  endpoint, matching that guidance.
