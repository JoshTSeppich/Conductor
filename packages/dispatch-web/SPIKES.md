# dispatch-web spikes

Consolidated KNOWN facts the production code relies on. Each entry
cites the spike that produced it and the ADR that records the full
reasoning.

## UI-S01 — WebSocket client: preflight + gap-fill + reconnect

Ran `spikes/UI-S01-websocket-client/run.ts` against a throwaway Node
fixture implementing contract §4.5 + §5.1–5.3 shapes plus the token
rejection behavior (§3.1) and CORS headers (throwaway; real daemon
CORS lands in DAEMON-T01/T02).

Drove by the cross-session finding from Session A's DAEMON-S01: the
W3C WebSocket API does not surface HTTP 401 to page JS, so the UI
cannot distinguish "bad token" from "daemon down" via the WebSocket
alone. Both arrive as a generic close/error event.

**KNOWN (observed in spike):**

1. The `ws` Node client fires `close` exactly once per broken
   connection. No `error`-without-`close` anomalies in ~30 kill-cycles.
   A close handler is sufficient for reconnect; error handler may
   no-op.

2. **Preflight pattern is required UI behavior, not optional.** Every
   connection attempt runs `GET /v2/health` (unauth) followed by
   `GET /v2/events?since=<lastTs>` (auth, doubles as gap-fill), in that
   order. Only on both passing does the WebSocket open. Three
   distinguishable outcomes:
   - Health fails → UI state `daemon_down`; schedule backoff; no WS.
   - Health passes, events returns 401 → UI state `auth_failed`;
     **STOP retrying**; operator must reauth (token may have rotated).
   - Both pass → open WS with `?token=<t>`.

3. Client-side dedupe keyed by
   `${timestamp}|${session}|${type}|${stableStringify(data)}`
   suppresses duplicates when (a) `?since=` response overlaps with
   in-flight WS delivery AND (b) server re-delivers on reconnect (worst
   case). S2 and S5 both converge to final-state-exactly-once.

4. Compound backoff with base=1000ms, multiplier=2, cap=30000ms,
   jitter=±25% produces an observed curve matching the target curve
   within jitter bounds. Applies to the full `preflight → WS` unit;
   preflight failure triggers the same backoff as WS close.

5. The `since=` cursor must be the timestamp of the last successfully
   consumed event, NOT the timestamp of the close. Closing before
   applying the last event creates a hole.

6. Fusing preflight-step-2 with gap-fill works: auth check and event
   catchup are the same `GET /v2/events?since=<lastTs>` fetch. A 401
   response is the auth-failed signal; a 2xx response is gap-fill
   payload. Saves one round trip per connection attempt vs. separate
   health+sessions+events sequence.

**MODELED (not verified by this spike; flagged for WEB-T03):**

- Browser-tab suspension behavior. Scenario S3′ uses an explicit
  `client.disconnect()` as a proxy for tab backgrounding — it
  exercises the reconcile path but is not the real browser lifecycle.
  UI-F02 followup: WEB-T03 integration test in a real browser.

- Plaintext `ws://`. Browser production code uses same-origin WS from
  the daemon-served page, so TLS is moot; not exercised.

- High-throughput (>100 ev/s). Fixture uses handfuls of events.
  Followup UI-F03 if real loads exceed.

- Token rotation mid-stream. Spike simulates rotation by fixture
  `setValidToken()` between scenarios; real rotation is
  `POST /v2/auth/rotate` (contract §3.3), which UI-S01 does not call.

**Followups filed:**

- UI-F02 — real-browser backgrounded-tab verification in WEB-T03
- UI-F03 — event batching if high-throughput observed
- UI-F04 — explicit event id in contract (additive) would simplify
  dedupe; currently dedupe uses composite key

See `docs/adr/UI-S01-websocket-client.md` for decision rationale and
observed data.
