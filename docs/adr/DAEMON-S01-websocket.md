# DAEMON-S01 — WebSocket library

**Status:** KNOWN (spike passed 2026-04-23)
**Scope:** Phase 2 daemon WebSocket event stream per CONDUCTOR_API_CONTRACT.md §5
**Spike script:** `packages/dispatch-daemon/spikes/DAEMON-S01-websocket.ts`
**Depends on:** DAEMON-S05 (Fastify chosen as HTTP server library)

## Decision

**Use `@fastify/websocket` ^11 (wrapping `ws` ^8) as the daemon's WebSocket surface.**

## Rationale

Given the S05 decision to use Fastify, `@fastify/websocket` is the natural pick: it composes cleanly with the existing Fastify app (same hooks, same auth flow, same lifecycle) and is maintained by the Fastify org. No friction observed in the spike.

`socket.io` was not tested. It would add protocol complexity (custom framing, rooms, namespaces) that v2's simple "push JSON events" use case does not need. Rejected on YAGNI grounds.

Native `ws` without Fastify integration would have worked, but would have required a separate HTTP server instance or manual upgrade-request routing. Unnecessary complexity once Fastify is already in the stack.

## Probes and results

All 5 probes pass against `@fastify/websocket` 11.x + `ws` 8.x on Node 20, darwin arm64:

| ID | Probe | Result |
|---|---|---|
| P1 | Connect with correct query-string token → upgrade succeeds | ✓ |
| P2 | Connect with WRONG token → upgrade rejected pre-101 with HTTP 401 | ✓ (status=401 visible to client) |
| P3 | Connect with NO token → upgrade rejected with HTTP 401 | ✓ (status=401) |
| P4 | Server pushes 3 events (contract §5.2 shape) → client receives in order | ✓ (types order preserved, shape valid) |
| P5 | Server detects client hangup within 1s | ✓ (1ms observed) |

## Patterns locked in by this spike

### Upgrade-handshake auth via Fastify `onRequest` hook (contract §5.1)

```ts
app.addHook('onRequest', async (request, reply) => {
  const pathOnly = request.url.split('?')[0];
  if (pathOnly !== '/v2/events/stream') return;
  const url = new URL(request.url, 'http://localhost');
  const token = url.searchParams.get('token');
  if (token !== expectedToken) {
    reply.code(401).send({ error: 'Invalid or missing token' });
  }
});
```

The hook fires BEFORE the WS upgrade completes. When `reply.code(401).send(...)` is called, Fastify responds with HTTP 401 and the upgrade never transitions to the 101 Switching Protocols state. On the client side (`ws`), this surfaces as the `unexpected-response` event carrying the HTTP 401 response — usable by client code for reauth prompting.

**Uniformity with HTTP auth (from S05):** the same `onRequest` hook handles both HTTP token-header auth (per-header) and WebSocket token-query-string auth (per-path-check). In the production daemon, one consolidated hook will branch by path: `/v2/events/stream` checks query string, all non-`/v2/health` paths check header.

### Route registration

```ts
app.get('/v2/events/stream', { websocket: true }, (socket) => {
  // socket is a ws.WebSocket instance
  socket.send(JSON.stringify(event));
  socket.on('close', () => { /* cleanup */ });
});
```

The `{ websocket: true }` option signals the plugin to upgrade the request. Handler signature: `(socket: WebSocket) => void`. No return value needed.

### Server-side disconnect detection

`socket.on('close', ...)` fires ~immediately (1ms observed) when the client hangs up cleanly. Suitable for tearing down per-session watcher subscriptions when a UI disconnects.

### Event shape emission (contract §5.2)

Events are JSON-stringified and sent via `socket.send(...)`. All messages follow the frozen shape `{type, timestamp, session, data}`. The spike verified shape validation client-side; in production the daemon should emit this shape from a single `emit()` helper that guarantees the invariant.

## Tradeoffs and gotchas

- **Rejection visibility in browsers:** `ws`'s `unexpected-response` event gives Node clients clean access to the HTTP status. Browsers do NOT expose the rejection status to page JS when a WebSocket upgrade fails — the browser just fires `error`. Session B's web UI will therefore need a workaround for distinguishing "daemon down" from "token invalid" — probably a preflight `fetch('/v2/health')` with the token in the header before opening the WS, so a 401 surfaces via the HTTP side first. **Flagged for cross-session coordination** alongside the CORS followup.
- **Query-string token in URL:** tokens appear in server access logs and in `/proc/net/tcp` for any process on the host. Acceptable for localhost-only (v2 threat model assumes same-host attacker is out of scope). If the threat model expands, consider post-upgrade auth (client sends first message as `{type: 'auth', token: '...'}` and server closes on mismatch).
- **Backpressure:** `socket.send()` in `ws` is non-blocking and can buffer unbounded. If a daemon emits faster than a slow client consumes, memory grows. Not observed as a problem at v2's expected event rate (few events per second at most). Followup: consider setting a bounded buffer or using `socket.bufferedAmount` for flow control once real-world usage surfaces pressure.
- **Reconnect semantics:** per §5.1 surface MODELED default, daemon does NOT buffer events for disconnected clients. Client handles gap-fill via `GET /v2/events?since=<last_seen>`. This spike verified the disconnect detection; buffering policy is upstream (daemon logic, not library).

## Cross-session impacts

**Session B (Conductor UI):**
1. **Browser WebSocket error opacity** (tradeoff #1 above) — Session B's web UI cannot distinguish 401 from "daemon down" via WebSocket alone. Recommended workaround: preflight `fetch('/v2/health')` + `fetch` to one auth-gated endpoint with the token to verify auth before opening WS. Will flag at ticket decomposition.
2. **CORS followup from S05** applies to the WS path too — although WS itself isn't CORS-restricted, the preflight pattern above will use HTTP fetch and require CORS configuration.

## Followups (not blocking, file for ticket phase)

1. **Consolidated onRequest hook** covering both HTTP-header and WS-query-string auth in production daemon code (ticket DAEMON-T01 or DAEMON-T02).
2. **Event emit helper** that enforces contract §5.2 shape at type-check time and at runtime. Prevents drift.
3. **Backpressure policy** — document or enforce a bounded buffer, or monitor `socket.bufferedAmount`. Tickets that emit frequently should revisit.
4. **Cross-session client error-handling docs** — write a short README for Session B's WS consumer covering preflight, disconnect/reconnect, and gap-fill via `/v2/events?since=`.

## Provenance

- Contract §5.1 — WebSocket endpoint `/v2/events/stream`, query-string token auth
- Contract §5.2 — frozen event message shape `{type, timestamp, session, data}`
- Contract §5.3 — event types used in spike (`handoff_written`, `commit_landed`, `state_changed`)
- Contract §5.4 — WebSocket vs SSE rationale (MODELED; no change needed from this spike)
- DAEMON-S05 ADR — Fastify choice, from which `@fastify/websocket` follows
- §5.1 surface MODELED default — reconnect + gap-fill via `/v2/events?since=` (unchanged, still MODELED until client implementation spikes)
