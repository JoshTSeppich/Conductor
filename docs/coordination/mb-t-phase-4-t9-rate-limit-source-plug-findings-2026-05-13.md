# MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG — Findings (2026-05-13)

**Session**: `c5-ticket-wb1` (Round 11 §3.9 Wave 5 continuation)
**Companion**: `docs/coordination/coord-phase4-t9plug-2026-05-13.md`
**Ticket body**: `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG_BUILD.md` (`0068a7e`)

---

## §I — §2.11 outcome classification

**"Capability enabled with known limitations"** — honest framing per CLAUDE.md §2.11.

c5 ships source-side production wiring:
- `parseAnthropicRateLimitHeaders` pure-fn (header → `RateLimitState`).
- `createCoarchitectRateLimitSource` factory implementing `RateLimitSource` interface with deps-injection seams + silent-degradation error handling.
- 30/30 probe conditions GREEN (13 parser + 17 factory).

Full Tier-2 closure of `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED` (proposed at T9 findings §VII row 1, pending operator stamp) requires the downstream 1-line plug at `coarchitect-ipc.ts:95` — OUT of c5 territory per manifest. See §VII below for exact diff.

Honest [MODELED] assumption surface — Anthropic API response header shape + endpoint behavior — gates the [MODELED] → [KNOWN] flip at runtime per CLAUDE.md §2.8 spike-required external-API discipline. Operator runtime-verifies post-plug.

## §II — WB ladder

| WB | SHA | Type | Description |
|---|---|---|---|
| WB1 | `0068a7e` | docs | ticket body authored (Sub-Qs + scope + plan + §2.11 framing) |
| WB2 | `bf8a099` | red | parseAnthropicRateLimitHeaders probe (13 conditions) |
| WB3 | `9fb49ba` | green | parseAnthropicRateLimitHeaders impl (rate-limit-source.ts) |
| WB4 | `a951acc` | red | createCoarchitectRateLimitSource probe (17 conditions) |
| WB5 | `50de357` | green | createCoarchitectRateLimitSource impl (coarchitect-rate-limit-source.ts) |
| WB-final | this commit | docs | findings + coord + ADR-MBTPHASE4-T9PLUG-A |

Cairn-grammar commits: 4 (2 red + 2 green). Housekeeping: 2 (ticket body + WB-final docs). Per-path `git commit -- <pathspec>` discipline applied to all 6 commits per Wave 2 Phase 1 reinforcement (d) carried forward.

## §III — Architecture (post-c5)

```
┌──────────────────────────────────────────────────────────────────────┐
│ src/main/                                                            │
│                                                                      │
│   rate-limit-source.ts (c5 — pure-fn)                                │
│     parseAnthropicRateLimitHeaders(headers: Headers)                 │
│       → RateLimitState | null                                        │
│                                                                      │
│   coarchitect-rate-limit-source.ts (c5 — factory)                    │
│     createCoarchitectRateLimitSource({ apiKey, fetchFn?, …})         │
│       → RateLimitSource                                              │
│         start(): immediate fetch + scheduled interval (idempotent)   │
│         stop(): clear interval                                       │
│         onState(cb): subscribe with dispose                          │
│                                                                      │
│   rate-limit-aggregator.ts (FORBIDDEN to c5 — read-only consult)     │
│     RateLimitSource interface (type-import)                          │
│     createRateLimitAggregator({ source }): RateLimitAggregator       │
│     createNullRateLimitSource(): RateLimitSource    ← current plug   │
│                                                                      │
│   coarchitect-ipc.ts (FORBIDDEN to c5 — downstream plug-point)       │
│     export const rateLimitAggregator = createRateLimitAggregator({   │
│       source: createNullRateLimitSource(),    ← plug-here at :95     │
│     });                                                              │
│     ipcMain.handle('coarchitect:getRateLimitState', () =>            │
│       rateLimitAggregator.getLatestState());                         │
│     rateLimitAggregator.onUpdate((state) => {                        │
│       for (const wc of allWebContents.getAllWebContents())           │
│         wc.send('coarchitect:rate-limit-update', state);             │
│     });                                                              │
└──────────────────────────────────────────────────────────────────────┘
```

The aggregator is the load-bearing seam (T9 ADR-MBTWFT9-A `(f)` skeleton). c5 ships the source module that production substitutes for `createNullRateLimitSource()` at the construction site.

## §IV — ADR-MBTPHASE4-T9PLUG-A — Source path selection (operator-arbitrated via dispatch)

**Decision:** **(a) workstation-direct Anthropic API ping** — RATIFIED via Round 11 Wave 5 dispatch wording "coarchitect-rate-limit-source production wiring".

**Context:**
T9 ADR-MBTWFT9-A enumerated four paths:
- (a) workstation-direct Anthropic ping (RECEIVES THIS RATIFICATION)
- (b) daemon-side ping (FORBIDDEN by c5 manifest; defers post-§6.6 amendment)
- (c-monthly) PTY-scrape `/cost` for monthly Max-window reset (DIFFERENT semantics from weekly rate-limit-window; deferred)
- (d) accept-STUB indefinitely (declined; (a) is the closure)

**Decision drivers:**
- Operator dispatch wording strongly implied (a) via the "coarchitect-rate-limit-source" naming convention (coarchitect was the historical owner of Anthropic API surface in workstation pre-HSO-WIRE WB14a).
- Path (a) is the lowest-scope viable closure (no daemon work; no §6.6 amendment; no PTY-scraper).
- Path (a) requires an API key in workstation env — `ANTHROPIC_API_KEY` per Sub-Q-T9PLUG-C=(i). Persistence UI (operator-config) deferred to `MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING` Tier 2 (T9 findings §VII row 2).

**Consequences:**
- c5 ships production source module ready to plug at coarchitect-ipc.ts:95.
- 1-line plug + 1-line `start()` invocation are downstream chore-commits (OUT of c5 territory; §VII enumerates).
- Operator runtime-verifies Anthropic API endpoint header behavior per CLAUDE.md §2.8 — c5 [MODELED] assumptions tested at plug-time.
- If runtime reveals GET `/v1/models` does NOT return `anthropic-ratelimit-*` headers, operator flips to (α) POST `/v1/messages` via `endpointUrl` deps override (no code change).

## §V — Sub-Q resolutions (defaults ratified)

| Sub-Q | Decision | Rationale |
|---|---|---|
| T9PLUG-A | (a) workstation-direct ping | Dispatch ratification; lowest-scope; ADR-MBTPHASE4-T9PLUG-A |
| T9PLUG-B | (β) GET /v1/models | Zero-cost endpoint; `[MODELED]` rate-limit headers; `endpointUrl` override for runtime escalation |
| T9PLUG-C | (i) env var ANTHROPIC_API_KEY | Minimum-scope ship; persistence UI deferred to Tier 2 followup |
| T9PLUG-D | (β) 60s poll | RATIFIES ADR-MBTWFT9-C; matches countdown minute-granularity display |
| T9PLUG-E | (i) silent-degradation | Aggregator preserves last-good across transient failures; matches T9 (f) graceful-degradation |

All five Sub-Qs receive `[MODELED]` default ratification under the operator's `[KNOWN-OPERATOR-ARBITRATED-via-dispatch]` direction. Runtime-spike confirms or RESHAPEs at plug-time.

## §VI — Honest [MODELED] assumption surface

Carried forward for operator runtime-verify per CLAUDE.md §2.8:

| Assumption | Confidence | Verification path |
|---|---|---|
| Anthropic API returns `anthropic-ratelimit-{requests,tokens,input-tokens,output-tokens}-{limit,remaining,reset}` response headers | `[MODELED-MEDIUM]` per public docs | Runtime: operator inspects DevTools Network panel after plug; if shape differs, `parseAnthropicRateLimitHeaders` triple-map adjustable in 4 rows |
| GET `/v1/models` attaches these headers (vs POST `/v1/messages` only) | `[MODELED-MEDIUM]` | Runtime: same as above. If absent, flip via `endpointUrl` deps to (α) POST `/v1/messages` minimal-tokens. |
| `x-api-key` + `anthropic-version: 2023-06-01` are the documented auth + version headers | `[MODELED]` per public docs | Runtime: 401 on plug → re-verify; 1-line code change if Bearer auth required |
| `reset` value is ISO 8601 datetime string (vs epoch ms number) | `[MODELED]` per consumer-side `RateLimitDimension.reset: string \| number` accepting both | Either form acceptable to consumer; no risk |
| 1440 calls/day to `/v1/models` is within Anthropic Free-tier quota | `[MODELED]` | Runtime: operator monitors response 429 frequency; lower `pollIntervalMs` if exceeded |

If any assumption FALSIFIES at runtime, the deps-injection design lets operator adjust at plug-time WITHOUT modifying the c5 source modules.

## §VII — Downstream plug instructions (chore-commit OUT of c5 territory)

**Step 1**: Edit `packages/dispatch-workstation/src/main/coarchitect-ipc.ts`:

```diff
 import {
   createRateLimitAggregator,
-  createNullRateLimitSource,
 } from './rate-limit-aggregator.js';
+import { createCoarchitectRateLimitSource } from './coarchitect-rate-limit-source.js';

 // ...

 export const rateLimitAggregator = createRateLimitAggregator({
-  source: createNullRateLimitSource(),
+  source: createCoarchitectRateLimitSource({
+    apiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
+  }),
 });
```

**Step 2**: Add `rateLimitAggregator.start()` call in `packages/dispatch-workstation/src/main/main.ts` post-app-ready (after `registerIpcHandlers()` call site):

```typescript
import { rateLimitAggregator } from './coarchitect-ipc.js';

// ... existing main.ts startup wiring ...

rateLimitAggregator.start();
```

**Step 3**: Set `ANTHROPIC_API_KEY` env var at workstation launch (operator-managed).

**Step 4**: Operator runtime-verify:
- DevTools Network panel: observe GET `https://api.anthropic.com/v1/models` every 60s.
- Inspect response headers for `anthropic-ratelimit-*`.
- IPC handler: `await window.coarchitectBridge.getRateLimitState()` returns non-null after first success.
- PlanTimerText UI: countdown text flips from `Max plan resets in —` to `Max plan resets in Xh Ym`.

**If runtime FALSIFIES `[MODELED]` assumptions** (per §VI):
- Headers missing → flip `endpointUrl` to `https://api.anthropic.com/v1/messages` (and the source updates to a POST with minimal-token body — requires small code edit OR alternative source).
- 401 → check API key valid; verify x-api-key vs Bearer Authorization.
- Quota exceeded → raise `pollIntervalMs` (e.g., to 300000 for 5-minute cadence).

## §VIII — FOLLOWUPS surface (operator stamp required — manifest excludes FOLLOWUPS.md)

Surfaced for operator-arbitrated FOLLOWUPS.md edits post-c5-ship:

| Row | Status | Discoverability anchor |
|---|---|---|
| `MB-F-T9-RATE-LIMIT-AGGREGATOR-SOURCE-DEFERRED` (Tier 2) | **ANCHOR-CLOSURE** — c5 ships source module; full closure pending downstream 1-line plug | this findings doc + ticket body + WB5 GREEN @ `50de357` |
| `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2, FOLLOWUPS.md:274) | **PARTIAL — SOURCE ARM ANCHOR-CLOSURE** (infrastructure arm closed at T9 WB6 `afd3778`) | this findings doc + T9 findings 2026-05-12 §VII |
| `MB-F-WORKSTATION-ANTHROPIC-API-KEY-PROVISIONING` (Tier 2 proposed at T9 findings §VII row 2) | **REAFFIRMED OPEN** — c5 consumes env var; persistence UI deferred | T9 findings + this findings §V Sub-Q-T9PLUG-C |
| `MB-F-T9-RATE-LIMIT-MODELED-API-CONTRACT` (NEW, Tier 3) | **PROPOSED** — operator runtime-spike pending per CLAUDE.md §2.8; verify Anthropic API header shape + endpoint behavior at plug-time. Closure: runtime-evidence captured → flip [MODELED] → [KNOWN] in c5 module docstrings. Discoverability: this findings §VI. | this commit |

## §IX — Test pattern reuse: deps-injected fetch + scheduler

The fakes pattern in `probe-mbtphase4-t9plug-02-source.spec.ts` is reusable for any future external-API source module under CLAUDE.md §2.8 discipline:

```typescript
function makeSchedulerFakes() {
  let scheduledCallback: (() => void) | null = null;
  const setIntervalFn = vi.fn((cb, _ms) => {
    scheduledCallback = cb;
    return Symbol('handle');
  });
  const clearIntervalFn = vi.fn(() => { scheduledCallback = null; });
  return { setIntervalFn, clearIntervalFn, fireTick() { scheduledCallback?.(); } };
}

const fetchFn = vi.fn()
  .mockResolvedValueOnce(makeOkResponse(FIRST_HEADERS))
  .mockResolvedValueOnce(makeOkResponse(SECOND_HEADERS));

const source = createX({ fetchFn, ...makeSchedulerFakes() });
source.start();
await vi.waitFor(() => expect(cb).toHaveBeenCalledTimes(1));
fakes.fireTick();
await vi.waitFor(() => expect(cb).toHaveBeenCalledTimes(2));
```

5-pattern surface covered:
1. Auth header propagation (verify request shape)
2. Success → emission
3. Error status code → silent no-emission
4. Network rejection → silent no-emission + no throw
5. Scheduler-driven tick → re-emission

This is forward-propagation memory for future `MB-T-PHASE-4-COST-METER-*-SOURCE` or similar external-API source tickets in Phase 4-Wave-N.

## §X — Operator next steps

1. **Operator FOLLOWUPS stamp** (manifest excludes FOLLOWUPS.md from c5; operator-direct edit): apply §VIII row table.
2. **Downstream session OR operator-direct plug** (out of c5 territory): execute §VII steps 1-3.
3. **Operator runtime-spike at plug-time** per CLAUDE.md §2.8: verify §VI assumption surface; ADR-MBTPHASE4-T9PLUG-A → ratified or reshaped.
4. **Audit reclassification** (manifest excludes audit doc): `wireframe-vs-shipped-audit-2026-05-09.md` §10.7 row PlanRing placement → from `SHIPPED-with-architectural-seam-and-deferred-source` to `SHIPPED-with-real-rate-limit-source` post-plug + runtime-verify.

---

End of findings.
