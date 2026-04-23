# DAEMON-S05 — HTTP server library

**Status:** KNOWN (spike passed 2026-04-23)
**Scope:** Phase 2 daemon HTTP surface per CONDUCTOR_API_CONTRACT.md §3 (auth) + §4 (REST endpoints)
**Spike script:** `packages/dispatch-daemon/spikes/DAEMON-S05-http-server.ts`

## Decision

**Use Fastify 5.x as the daemon's HTTP server library.**

## Rationale

Fastify was the operator-biased preference pending spike evidence. The spike confirmed clean usability for all the patterns the contract requires:

- **Token-header middleware via `onRequest` hook** — 5 lines of code, straightforward path-based bypass for `/v2/health`
- **Path parameter routing** — standard `/v2/sessions/:name` syntax, resolves via `request.params`
- **JSON body parsing** — native, no extra plugin, no explicit configuration
- **Custom error status codes with JSON body** — `reply.code(N).send({error: '...'})` is the one-liner pattern the contract's MODELED error shape expects
- **Default 404** for unknown routes — no additional middleware needed
- **Clean shutdown** — `await app.close()` completes promptly; suitable for launchd lifecycle (DAEMON-S04)

Fastify 5 is also positioned well for later phases: it composes with `@fastify/websocket` for DAEMON-S01 (contract §5 WebSocket), and integrates with Zod via `fastify-type-provider-zod` if we later want schema-driven routes. Neither of those is in scope for S05 — noted as optional future paths.

Express would have worked equivalently; the spike wasn't a forced choice. Fastify's advantages (built-in JSON schema support, Zod integration path, better perf at default config) didn't create friction in this spike, so the bias-toward-Fastify recommendation holds.

Native `node:http` was not tested in-depth. It would have worked but would have required hand-rolling path-param routing and body parsing — unnecessary friction for a greenfield daemon when Fastify's dependency weight is small.

## Probes and results

All 9 probes pass against Fastify 5 on Node 20, darwin arm64:

| ID | Probe | Result |
|---|---|---|
| P1 | `GET /v2/health` (no auth) → 200 with `{status, version, uptime_seconds}` | ✓ |
| P2 | Auth-gated path without `X-Conductor-Token` → 401 + `{"error": ...}` | ✓ |
| P3 | Auth-gated path with WRONG token → 401 | ✓ |
| P4 | Auth-gated path with correct token → 200, path param `:name` resolves | ✓ |
| P5 | `POST /v2/sessions` with JSON body → 201 + echoed body | ✓ |
| P6 | `POST` with missing required field → 422 + `{"error": ...}` | ✓ |
| P7 | `PATCH` returning 409 → contract-mandated killed-record error body verbatim | ✓ |
| P8 | `GET` unknown route → 404 | ✓ |
| P9 | `app.close()` returns cleanly | ✓ |

## Patterns locked in by this spike

### Auth middleware (contract §3.1)

```ts
app.addHook('onRequest', async (request, reply) => {
  const pathOnly = request.url.split('?')[0];
  if (pathOnly === '/v2/health') {
    return; // §4.1: no auth required for health
  }
  const token = request.headers['x-conductor-token'];
  if (token !== expectedToken) {
    reply.code(401).send({ error: 'Invalid or missing X-Conductor-Token' });
  }
});
```

`onRequest` fires before route handlers for all requests. Bypass for `/v2/health` is path-prefix-matched (`split('?')[0]` handles any querystring, though health shouldn't receive one). Token comparison is constant-time-naive (simple `!==`); timing-attack hardening is out of scope for v2 against a localhost-only attacker model.

### Error response convention (MODELED per §5.1 surface, KNOWN after this spike)

All error responses use JSON body `{"error": "<human message>"}`. Verified for 401, 404, 409, and 422. Applies to all daemon error paths unless a specific endpoint needs additional fields (in which case those are additive per contract §2).

### Path param routing (contract §4.2, §4.3)

`/v2/sessions/:name` syntax resolves via `request.params.name`. Confirmed for both GET and PATCH.

### Killed-record 409 error body (Blocker 3, operator-specified)

Verbatim: `{"error": "Session name in use (killed record exists). Pick a new name."}`. Used when `POST /v2/sessions` attempts to create a session whose name matches an existing killed-state record. Locked from contract arbitration.

## Tradeoffs and gotchas

- **Fastify startup cost:** `app.listen({ port: 0 })` + first request completed in well under 100ms in the spike. Not a concern for a daemon that starts once per login.
- **ESM/NodeNext compat:** Fastify 5 supports ESM; `import Fastify from 'fastify'` works under `"type": "module"` + `"moduleResolution": "NodeNext"`. No config friction.
- **Logger off by default in spike:** `Fastify({ logger: false })` silences the default per-request log. Production daemon will want logger on with a pino transport, writing to `~/.foxworks-dispatch/logs/daemon.log`. Config path to sort out at ticket implementation time.
- **Fastify body-parser defaults:** JSON is parsed automatically for `Content-Type: application/json`. Other content types would 415. Contract §4 only uses JSON so this is fine.
- **CORS:** not tested in spike. Session B's web UI running on a different localhost port may need CORS headers. Either enable via `@fastify/cors` at ticket time, or expect UI to same-origin via daemon-served static files. Flagged as followup.

## Followups (not blocking, file for ticket phase)

1. **Logger configuration** — Pino via Fastify's built-in logger field, with rotation. Ticket: DAEMON-T01.
2. **CORS policy for Session B's web UI** — decision deferred to ticket time; either `@fastify/cors` with `localhost:*` origin, or same-origin via static file serving.
3. **Zod integration via `fastify-type-provider-zod`** — optional. Benefits: schema-driven routes validate against SessionSchemaV2 automatically. Cost: additional dep. Decide at ticket time based on whether hand-rolled Zod validation in handlers feels painful.
4. **Timing-attack hardening on token compare** — `crypto.timingSafeEqual` instead of `!==`. Low priority for localhost-only; add if the attack model ever expands.

## Provenance

- Contract §3.1 — `X-Conductor-Token` header pattern
- Contract §3.4 — KNOWN confidence on token pattern; no pattern-level spike needed (this spike verifies the LIBRARY-level integration, not the pattern itself)
- Contract §4.1 — `/v2/health` no-auth carve-out
- Contract §4.2, §4.3 — path param routes
- Contract §5.1 surface — MODELED error body `{"error": "..."}` (converted to KNOWN by this spike)
- Operator Blocker 3 arbitration — killed-record 409 error body verbatim
