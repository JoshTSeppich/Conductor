# dispatch-web spikes

This file consolidates KNOWN facts the production code relies on.
Each entry cites the spike that produced it and the ADR that records
the reasoning.

## UI-S01 — WebSocket client reconnect + `GET /v2/events?since=` gap-fill

Ran `spikes/UI-S01-websocket-client/run.ts` against a throwaway fixture
implementing contract §4.5 + §5.1–5.3 shapes. Findings below feed into
WEB-T03 (production WebSocket client) and WEB-T18 (ticker live updates).

**KNOWN** (observed in spike):

1. The `ws` Node client fires `close` exactly once per broken connection
   and never fires it on a healthy connection. No `error`-without-`close`
   anomalies observed. A close handler is sufficient; error handler can
   no-op.

2. Client-side dedupe keyed by
   `${timestamp}|${session}|${type}|${stableStringify(data)}` suppresses
   duplicates when (a) the `?since=` response overlaps with in-flight WS
   delivery AND (b) the server re-delivers on reconnect. Scenarios S2
   and S5 both pass final-state-exactly-once.

3. Gap-fill sequence `close → fetch(?since=lastTs) → apply → open WS →
   dedupe` with the algorithm in `client.ts` restores the per-session
   event stream with zero holes across ≥5 events emitted during the
   disconnect window.

4. Exponential backoff with base=1000ms, multiplier=2, cap=30000ms,
   jitter=±25% produces an observed curve matching the target within
   jitter bounds (operator-acked numbers, see ADR).

5. The `since=` cursor must be the timestamp of the last successfully
   consumed event, NOT the timestamp of the close — closing before the
   last event is applied would create a hole.

**MODELED** (spike did not verify; flagged for WEB-T03 integration):

- Browser-tab suspension behavior is not covered by the Node spike.
  Scenario S3′ exercises the code path with an explicit disconnect,
  which is a proxy, not a substitute. UI-F02 followup will verify in a
  real browser in WEB-T03.

- Spike uses plaintext `ws://`. Browser production code will use the
  same-origin WebSocket from the daemon-served page, so TLS is moot;
  untested but low-risk.

- High-throughput (>100 ev/s) not exercised; the fixture uses scripted
  handfuls of events. If real loads exceed that, batching may be needed.
  UI-F03 followup.

See `docs/adr/UI-S01-websocket-client.md` for the decision record.
