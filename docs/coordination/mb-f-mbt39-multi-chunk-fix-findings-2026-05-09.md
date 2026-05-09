# MB-F-MBT39-MULTI-CHUNK-FIX Findings — 2026-05-09

**Ticket:** MB-F-MBT39-MULTI-CHUNK-FIX  
**Closes:** `MB-F-MBT39-MULTI-CHUNK-RESPONSE-ACCUMULATION` (Tier 2; load-bearing for production)  
**WB ladder:** WB1 RED (`9256406`) → WB2 GREEN (`bb4c47c`) → WB3 SKIP → WB4 docs  
**Base SHA:** `36ece0d` (MB-T39 WB4; `MB-F-MBT39-MULTI-CHUNK-RESPONSE-ACCUMULATION` filed)  
**Fix SHA:** `bb4c47c`  
**File:** `packages/dispatch-workstation/src/coarchitect/peer-summary-harvester.ts`  
**Spec:** `packages/dispatch-workstation/test/unit/coarchitect/peer-summary-harvester.spec.ts`

---

## I — Architectural Problem

`PeerSummaryHarvester._parseResponse` (pre-fix, `36ece0d`) treated each PTY chunk that arrived while `state === 'AWAITING_RESPONSE'` as a complete response candidate. `jsYaml.load(chunk.trim())` was called on the raw chunk text on every chunk arrival.

In the test harness, YAML responses are delivered as a single `capturedObserver('alpha', fullYamlString)` call — one chunk, complete YAML. All 9 probes passed against this delivery model.

In production, CC CLI PTY output is streamed token-by-token across many small chunks over ~1–2 seconds. A §7 YAML summary arrives as N fragments (individual tokens or line fragments), not as a single complete-response chunk. Each intermediate fragment:
1. Triggers `_parseResponse` synchronously
2. `jsYaml.load(fragment)` fails (incomplete YAML or returns a non-object) OR succeeds but with missing required fields
3. `_emitError` fires → `error:recorded` emitted → `peer.state = 'IDLE'`
4. The peer's `peer:turn-complete` event is permanently lost for this quiescence cycle

Net effect in production: peer turn-complete events never fire; swarm-state is polluted with spurious `error:recorded` events on every quiescence cycle.

This was filed as `MB-F-MBT39-MULTI-CHUNK-RESPONSE-ACCUMULATION` at `36ece0d` with Tier 2 (load-bearing for production) classification.

---

## II — Fix Design: Per-Peer Response Buffer + Inner Quiescence

The fix adds a second, shorter debounce (`inner quiescence`) that fires only after the response buffer has been stable for `responseQuiescenceMs`. Chunks accumulate in a per-peer string buffer; the full buffer is parsed only when inner quiescence fires.

**New fields on `PeerEntry`:**
- `responseBuffer: string` — accumulates PTY chunks while `state === 'AWAITING_RESPONSE'`; reset to `''` on every IDLE transition
- `responseQuiescenceTimer: ReturnType<typeof setTimeout> | null` — fires `_onResponseQuiescence(sessionName)` after `responseQuiescenceMs`; reset on every new chunk in AWAITING_RESPONSE state

**New constructor param on `PeerSummaryHarvesterDeps`:**
- `responseQuiescenceMs?: number` — inner quiescence window; default `500ms` via `?? 500` operator; matches Wave 2 Q-MBT39-2 configurable-default pattern; production-tunable without code change

**New method `_onResponseQuiescence(sessionName)`:**
- Guards on peer existence and `state === 'AWAITING_RESPONSE'` (handles race with TIMEOUT — if TIMEOUT fires first and resets state to IDLE, inner quiescence guard exits cleanly)
- Reads accumulated buffer; clears `peer.responseBuffer` and `peer.responseQuiescenceTimer`
- Calls `_parseResponse(sessionName, peer, accumulatedBuffer)` — existing 3-arg signature preserved; third arg now carries accumulated text rather than a single chunk

**Existing `_parseResponse` extended:**
- After `peer.state = 'IDLE'` transition: defensive clear of `peer.responseBuffer = ''` and `peer.responseQuiescenceTimer` (belt-and-suspenders; `_onResponseQuiescence` already clears before calling)

**TIMEOUT path extended:**
- Before emitting `error:recorded`: clears `peer.responseBuffer = ''` and `responseQuiescenceTimer` if present; prevents orphaned buffer from a partial accumulation cycle from persisting into next AWAITING_RESPONSE entry

**`_clearTimers()` extended:**
- Clears `responseQuiescenceTimer` alongside `quiescenceTimer` and `timeoutTimer`; used by `dispose()` path

---

## III — Q-Gate Dispositions

### Q-MCFIX-1 — Inner-quiescence threshold
**Ratified: (d) configurable; default 500ms.**

`responseQuiescenceMs` constructor param; default `500ms` via `?? 500`. Production-tunable. Test fixture uses `50ms` (`RESPONSE_QUIESCENCE_MS = 50` constant) for fast fake-timer iteration. Rationale: 500ms is shorter than minimum observed thinking pause (Wave 1 SPIKE-HSO-01 evidence) and shorter than outer quiescence (3000ms); aggressive default is safer than conservative — late-arriving chunks can re-accumulate on the next quiescence cycle.

### Q-MCFIX-2 — Premature inner-quiescence semantics
**Ratified: (a) accept premature parse.**

If a peer pauses mid-response longer than `responseQuiescenceMs`, inner quiescence fires on an incomplete buffer. `_parseResponse` runs on partial YAML, fails validation (missing required fields — field-boundary pauses produce valid-but-incomplete YAML objects), emits `error:recorded`, resets to IDLE. Subsequent chunks are treated as a new turn on the next quiescence cycle. Simplest semantics; recoverable; avoids re-buffer complexity. Probe 11 verifies this path.

### Q-MCFIX-3 — Existing probe migration
**Ratified: (a) preserve + `advanceTimersByTime` adapter.**

9 existing probes preserved. `vi.advanceTimersByTime(RESPONSE_QUIESCENCE_MS + 1)` inserted after `capturedObserver?.(...)` YAML delivery calls in probes 04, 05 (sub-cases a+b), and 08. Probes 01, 02, 03, 06, 07, 09 unchanged. New probes 10–13 cover multi-chunk semantics explicitly.

### Q-MCFIX-4 — TURN_INCOMPLETE fast-path
**Ratified: (a) fast-path on exact equality.**

In `_onPtyChunk`, when `state === 'AWAITING_RESPONSE'` AND `peer.responseBuffer === ''` (first chunk in this AWAITING_RESPONSE cycle) AND `chunk.trim() === 'TURN_INCOMPLETE'`: cancel `timeoutTimer`, set `state = 'IDLE'`, return immediately. No buffering; no inner-quiescence wait. The outer `quiescenceTimer` (just reset at the top of `_onPtyChunk`) is intentionally NOT cleared — it continues running so the next natural quiescence cycle can re-harvest the peer. Reduces latency for the most common mid-work response.

### Q-MCFIX-5 — Probe count
**Ratified: (a) 4 new probes (10–13).**

---

## IV — Probe Distribution and RED→GREEN Transitions

### WB1 RED state (13 probes: 10 GREEN, 3 RED)

| Probe | WB1 | Why |
|---|---|---|
| 01–09 | GREEN | Old synchronous `_parseResponse` on every chunk; migration adapter (`advanceTimersByTime`) is a no-op against old code; emitSpy cumulative assertions hold |
| 13 | GREEN | Old synchronous `text === 'TURN_INCOMPLETE'` guard at line 233 happened to handle single-chunk TURN_INCOMPLETE correctly — regression probe (see §V) |
| 10 | RED | Old code calls `_parseResponse` on chunk1 (partial YAML); validation fails on missing `files_touched`; `error:recorded` emitted; `peer:turn-complete` never fires |
| 11 | RED | Old code calls `_parseResponse` synchronously on partial YAML; `error:recorded` emitted before "NOT yet emitted" assertion at line 458 |
| 12 | RED | Old code calls `_parseResponse` on `'TURN'` chunk; `jsYaml.load('TURN')` returns string; not-an-object check → `error:recorded`; `not.toHaveBeenCalledWith('error:recorded')` assertion fails |

### WB2 GREEN state (13/13 GREEN)

Probes 10, 11, 12 transitioned RED→GREEN. Probes 01–09 and 13 remained GREEN. Consumer non-regression: 65/65 across full coarchitect unit suite (7 files).

---

## V — Probe 13 Regression-Probe Pattern

Probe 13 is architecturally significant as a regression probe, not a RED-at-WB1 probe.

At WB1, Probe 13 was GREEN because the old synchronous `_parseResponse` path already handled `'TURN_INCOMPLETE'` correctly (`text === 'TURN_INCOMPLETE'` guard at line 233 → return; no emit; state = IDLE).

At WB2, Probe 13 is GREEN because the fast-path is correctly implemented: single-chunk `'TURN_INCOMPLETE'` triggers immediate IDLE transition without inner-quiescence wait.

**Without fast-path (hypothetical wrong WB2 implementation):** `'TURN_INCOMPLETE'` would be buffered → inner quiescence fires → 50ms later. Then `'new output after TURN_INCOMPLETE'` arrives in AWAITING_RESPONSE → buffer += `'new output'` → inner quiescence reset. At inner-quiescence fire: buffer = `'TURN_INCOMPLETEnew output'` ≠ `'TURN_INCOMPLETE'` → `jsYaml.load` fails → `error:recorded` emitted. Probe 13 assertion `expect(emitSpy).not.toHaveBeenCalledWith('error:recorded', ...)` would fail → Probe 13 goes RED. This is the correct regression gate.

---

## VI — Implementation Deviation: Selective Clearing in Fast-Path

The dispatch §1 pseudocode suggested `this._clearTimers(peer)` in the TURN_INCOMPLETE fast-path. This was adapted to selective clearing: only `timeoutTimer` and (defensively) `responseQuiescenceTimer` are cleared; the outer `quiescenceTimer` is NOT cleared.

**Why:** When a PTY chunk arrives, `_onPtyChunk` resets `peer.quiescenceTimer` at the top (before the AWAITING_RESPONSE branch). If `_clearTimers(peer)` were called in the fast-path, the just-set outer quiescence timer would be cleared. The outer quiescence timer fire is what triggers the next harvest cycle re-entry (`_onQuiescence` → prompt injection). Without it, Probe 03 ("state recovers to IDLE: next quiescence re-fires prompt") and Probe 13 ("outer quiescence re-fires WITHOUT inner-quiescence advance") would fail — both rely on the outer timer continuing after TURN_INCOMPLETE fast-path.

`_clearTimers` is still used by `dispose()` (cleans all timers across all peers) and is extended to include `responseQuiescenceTimer`.

---

## VII — responseBuffer: string vs Set\<ObserverFn\>

Wave 2 (`stdoutObservers`, `streamCloseObservers` in `ConsoleIpcController`) used `Set<ObserverFn>` for fan-out dispatch of multiple observer callback functions. This is architecturally distinct from `responseBuffer: string` — a per-peer text accumulator for sequential PTY chunk concatenation. Different concern; no overlap; no risk of conflation in downstream work.

---

## VIII — WB3 Skip Rationale

The `as any` cast in `makeHarvester()` (`peer-summary-harvester.spec.ts:90`) was added at WB1 to allow `responseQuiescenceMs: RESPONSE_QUIESCENCE_MS` on a deps object whose interface did not yet have the field. After WB2, `PeerSummaryHarvesterDeps` was extended with `responseQuiescenceMs?: number` — the cast is now a no-op. Deferred to a later test-cleanup sweep. Low-value; harmless; filing a followup would add noise.

---

## IX — Cross-Session Coordination: Terminal Z (MB-T40)

Terminal Z (MB-T40) was holding at HALT 0 awaiting this fix. Operator instructed Terminal Z: option (α) — multi-chunk fix ships first, then MB-T40 builds on shared chunk-buffering primitive.

**Coordination note for operator to surface to Terminal Z post-HALT-FINAL:**

> Multi-chunk fix at SHA `bb4c47c`. ChunkAccumulator primitive shape (inline in `peer-summary-harvester.ts`, NOT extracted to shared module):
> - `responseBuffer: string` on `PeerEntry` (text accumulator; resets to `''` on IDLE transition)
> - `responseQuiescenceTimer: ReturnType<typeof setTimeout> | null` on `PeerEntry`
> - `responseQuiescenceMs: number` constructor param (default `500ms` via `?? 500`)
> - `_onResponseQuiescence(sessionName)` method: guards on peer existence + `AWAITING_RESPONSE` state; reads + clears buffer + timer; calls `_parseResponse(sessionName, peer, accumulatedBuffer)` (3-arg, third arg = accumulated text)
> - Fast-path: `peer.responseBuffer === '' && chunk.trim() === 'TURN_INCOMPLETE'` → immediate IDLE; outer quiescence timer preserved (NOT cleared)
>
> MB-T40 chat-panel implementation should mirror this shape inline (in-flight bubble buffer + `outerQuiescenceMs` constructor param + `_onOuterQuiescence` method). If both implementations show genuine duplication after both ship, file `MB-F-CHUNK-ACCUMULATOR-EXTRACTION` at MB-T40 WB4 (Tier 3 refactor toward shared module).

---

## X — New Followups

None. Architecture matched dispatch §1 exactly (modulo selective-clear adaptation in fast-path, methodologically justified in §VI). No unexpected findings during implementation.
