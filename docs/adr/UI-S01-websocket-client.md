# ADR UI-S01: WebSocket client — preflight, gap-fill, reconnect

- **Status:** Accepted (spike-verified)
- **Date:** 2026-04-23
- **Session:** B (UI)
- **Ticket:** UI-S01
- **Informs:** WEB-T03 (production WS client), WEB-T18 (ticker live updates),
  all UI surfaces consuming daemon WS

## Context

The web UI (and menu bar, later) consumes the daemon's HTTP API and
WebSocket event stream per `CONDUCTOR_API_CONTRACT.md` §3 (auth), §4.5
(events history), and §5 (WS stream). Three coupled questions needed
spike evidence before WEB-T03 could start red-then-green:

1. How does the `ws` client behave under reconnect cycles?
2. How should the client fill the event gap between close and
   re-open so the per-session `{sha, subject, branch}` reduce state
   (GAP-2 decision) has no holes?
3. How does the client surface authentication failures, given the
   W3C WebSocket API does not expose HTTP 401 to page JS (cross-session
   finding from Session A's `DAEMON-S01` spike — browsers receive a
   generic close event whether the daemon is down or the token is bad)?

## Decision

Every connection attempt runs a **preflight sequence** before opening
the WebSocket. The sequence also doubles as gap-fill.

```
attempt_cycle:
  1. GET /v2/health                       (unauth; status = "daemon_down" if fails)
  2. GET /v2/events?since=<last_ts>       (auth; doubles as gap-fill)
       401       → status = "auth_failed"; STOP retrying (reauth)
       other err → status = "daemon_down"; schedule backoff
       ok        → apply events, advance last_ts
  3. Open WS with ?token=<t>
       close → schedule backoff if not stopped
```

**Backoff is compound** — the retry unit is the full preflight+WS
sequence, not the WS alone. Preflight failure at any stage triggers the
same backoff curve that a WS close does.

**Dedupe key** is
`${timestamp}|${session}|${type}|${stableStringify(data)}`. The server
may re-deliver events via WS on reconnect AND via `?since=` response
during the same cycle — both paths converge to the same deduped state.

**`since=` cursor** is the timestamp of the last successfully consumed
event, NOT the timestamp of the close. Closing before the event
applies would create a hole.

**Production parameters** (operator-acked, load-bearing for WEB-T03):

| Parameter | Value |
|---|---|
| Base delay | 1000 ms |
| Multiplier | 2× |
| Cap | 30000 ms |
| Jitter | ±25% |

## Observations

Ran `packages/dispatch-web/spikes/UI-S01-websocket-client/run.ts`
against a throwaway fixture that implements contract §4.1, §4.5,
§5.1–5.3 shapes plus token rejection and CORS headers (fixture is
thrown away when Session A's real daemon ships).

9/9 scenarios passed. Key findings:

### S1 — transient WS drop (KNOWN)
Fixture closed all WS while HTTP stayed up. Client detected close,
re-entered preflight (which succeeded), reopened WS, received the next
event. Single cycle; no spurious reconnects.

### S2 — gap-fill during disconnect (KNOWN)
5 events emitted during the disconnect window. Client gap-fetched via
`?since=<last_ts>` on reconnect, applied all 5, resumed WS. Final state:
6 unique timestamps, exactly one copy each.

### S3′ — programmatic long-disconnect proxy (KNOWN for programmatic
path; browser-tab suspension remains MODELED)
Called `client.disconnect()` then `client.connect()` with events fired
in between. Gap-fill reconciled cleanly. Real-browser backgrounded-tab
behavior is NOT verified by this spike; UI-F02 tracks WEB-T03
integration test upgrade.

### S4a — backoff distribution (KNOWN, offline)
1000 samples per attempt level, 8 levels. Every sample within the
±25% jitter band. Observed means tracked targets within ±0.5%:

| Attempt | Target | Observed min..max | Mean |
|---|---|---|---|
| 0 | 1000 ms | 751..1250 | 991 |
| 1 | 2000 ms | 1501..2500 | 2009 |
| 2 | 4000 ms | 3001..4997 | 3963 |
| 3 | 8000 ms | 6008..9998 | 7918 |
| 4 | 16000 ms | 12000..19997 | 15933 |
| 5 | 30000 ms (cap) | 22513..37499 | 29919 |
| 6 | 30000 ms (cap) | 22553..37464 | 30029 |
| 7 | 30000 ms (cap) | 22512..37487 | 29926 |

### S4b — online scheduler (KNOWN)
Scaled config (base=200ms / cap=1000ms) for wall-clock runtime; same
curve shape, scaled constants. 5 attempts observed, all within jitter
bounds. Production curve (1s / 30s) is identical shape — S4a exercised
production numbers offline; S4b proves the scheduler actually uses
`computeBackoff()`'s output.

### S5 — dedupe under worst-case replay (KNOWN)
Fixture ran with `replayAllOnConnect=true` — a worst-case simulation of
a server that re-broadcasts the entire event log on every WS connect.
After reconnect, fixture sent `e1, e2` via WS AND the `?since=` fetch
returned them AND the WS-replay fired them again. Final client state:
2 events, exactly one copy each.

### S6a — daemon down (KNOWN)
Preflight step 1 fails (health unreachable). Status transitions
`connecting → daemon_down`. No WS open attempted. Backoff scheduled.

### S6b — token invalid (KNOWN, load-bearing)
Fixture accepted token `correct`; client presented `wrong`. Preflight
step 1 passes, step 2 returns 401. Client transitions `connecting →
auth_failed` and **stops the retry loop** — verified zero additional
attempts over a 1.5s observation window. This is the whole point of
preflight: the WS alone cannot distinguish this case from daemon-down.

### S6c — both preflight pass (KNOWN)
Happy path sanity check. Preflight passes, WS opens, event flows.

## MODELED (not verified by this spike)

- **Browser-tab suspension.** S3′ uses a programmatic disconnect as a
  proxy; real browsers suspend timers and may or may not close the WS
  depending on tab lifecycle state. Verification requires a real
  browser context. UI-F02 followup; WEB-T03 integration test upgrades
  this to KNOWN.
- **Plaintext `ws://`.** Production is served same-origin from the
  daemon; TLS is moot. Not exercised.
- **High-throughput (>100 ev/s).** Spike uses handfuls of events.
  UI-F03 followup if real loads exceed.
- **Token rotation mid-stream.** Contract §3.3 `POST /v2/auth/rotate`
  exists but this spike doesn't exercise it. When the token rotates,
  expectation is preflight step 2 returns 401, auth_failed fires,
  operator re-enters token via UI. Not verified here.
- **CORS in production.** Spike fixture sends
  `Access-Control-Allow-Origin: *` so the spike is self-contained. Real
  daemon CORS config lands in DAEMON-T01 or DAEMON-T02 per Session A.
  UI surfaces consume same-origin if served by daemon; cross-origin
  mode (Vite dev server) needs the daemon to allow the dev origin.

## Consequences

### For WEB-T03 (production WebSocket client)
The spike client at
`packages/dispatch-web/spikes/UI-S01-websocket-client/client.ts`
documents the algorithm. WEB-T03 will TDD the production client
red-then-green against this algorithm, replacing `ws` (Node) with the
browser WebSocket global. Algorithm identical; only the transport
binding differs.

### Required UI behavior (not optional)

1. Preflight sequence before every WS connect or reconnect. Skipping
   preflight and trying WS-first loses the auth-failure signal entirely.
2. `auth_failed` is terminal for the current session — the client must
   NOT auto-reconnect. The UI must prompt operator to re-enter token.
3. `daemon_down` state must be user-visible (e.g., banner "daemon
   unreachable, retrying…") so the operator can distinguish a paused
   UI from a broken one.

### Followups (new, filed this ADR)

- **UI-F02** — verify browser-tab suspension behavior in WEB-T03
  integration test (upgrade S3′ MODELED → KNOWN)
- **UI-F03** — event batching if sustained throughput >100 ev/s is
  observed in practice
- **UI-F04** — propose additive contract change for explicit `event_id`
  field; would simplify dedupe. Not blocking.

### Decisions deferred to WEB-T03
- Observable wrapping (TanStack Query mutation vs. Zustand store vs.
  custom hook) — UI framework concern.
- Connection state surface to React components (hook API shape).
- Token re-entry UX on `auth_failed`.

## Alternatives considered

- **WS-only, no preflight.** Rejected: W3C API makes 401 indistinguishable
  from daemon-down in browser — no way for UI to differentiate.
- **Three-step preflight (health + sessions + events).** Rejected:
  folding step 2 (auth) with gap-fill (events-since) saves one round
  trip per attempt without loss of information — 401 on `/v2/events`
  is the auth signal, same as 401 on `/v2/sessions`.
- **Server-Sent Events.** Contract §5.4 notes SSE was an option;
  WebSocket is contract-frozen. Not revisited here.
- **Explicit `event_id` on the wire.** Would simplify dedupe but needs
  a contract change (`/v2/events` response shape). Filed as UI-F04.

## References

- `CONDUCTOR_API_CONTRACT.md` §3 (auth), §4.1 (health), §4.5 (events),
  §5.1–5.3 (WS)
- Cross-session: Session A's `DAEMON-S01` spike (commit `ee8a47d`)
  observed the W3C-level 401 invisibility; this ADR is the UI-side
  remediation.
- Self-check per contract §10.5: 1 yes · 2 behavior · 3 no · 4 no ·
  5 no · 6 yes · 7 no · 8 n/a · 9 no
- Session B prompt item 8 (UI-per-contract): yes — spike exercises
  §4.1, §4.5, §5.1–5.3 shapes exactly.
