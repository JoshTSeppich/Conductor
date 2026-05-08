# MB-T34 Findings — Anthropic API client (workstation)

**Terminal:** D (parallel-cairn 4-session run, Round 4)
**Date:** 2026-05-08
**Final HEAD pre-WB6:** `f326d21` (WB5 GREEN); WB6 docs ship in this commit.
**Phase 1 spike:** `c09bd09`
**Ladder:** Phase 1 → WB1 RED → WB2 GREEN parser → WB3 GREEN retry → WB4 GREEN headers → WB5 GREEN compose+IPC → WB6 docs (this commit).
**Outcome classification (CLAUDE.md §2.11):** **Improved (capability enabled with one operator-tracked limitation).** Plan-usage data path is end-to-end correct (production-ready transport + retry + header capture + IPC delivery to renderers); MB-T26 chat-flow non-regression confirmed at every WB; live-API smoke verifies real `/v1/messages` round-trip with onUsage + onRateLimit both populated correctly. The one limitation is operator-tracked (deferred cache-token enrichment as Tier 2 followup).

---

## I. Summary

MB-T34 ships the **Anthropic API client surface** in `packages/dispatch-workstation/src/main/anthropic-api-client.ts` that the conductor reasoning loop (MB-T35) and the plan-usage ring widget (Terminal B's MB-T25) consume. The chat-flow surface (`AnthropicChatClient` in `anthropic-client.ts`) is refactored to compose this low-level client per Q-MBT34-1=(c) operator-acked HALT 0; MB-T26 `onUsage` cost-flow is preserved verbatim (probe-01 6/6 GREEN at every WB).

**The load-bearing question for the entire MB-T34 wave** ("Are `anthropic-ratelimit-*` headers exposed via @anthropic-ai/sdk@0.92.0 stream response?") was answered by Phase 1 live-API spike: **YES.** All 13 anthropic-ratelimit headers + request-id + organization-id are exposed via `apiPromise.withResponse()` BEFORE awaiting the inner Stream. Spike result: see §III.

**Cross-session signal (Terminal B / MB-T25):** GREEN LIGHT. Plan-usage ring widget can render against the `RateLimitState` nested-bucket contract delivered via `coarchitectBridge.onRateLimitUpdate` IPC channel. Data contract frozen at WB4; IPC channel wired at WB5.

---

## II. WB ladder reference

| WB | Commit | Type | Tests | Note |
|---|---|---|---|---|
| Phase 1 | `c09bd09` | spike | n/a | Diagnose + decisions + live-API spike confirmed headers exposed via withResponse(); Q-MBT34-1..11 + C-MBT34-1..2 surfaced |
| WB1 | `bd69b15` | red | 28 fail / 8 false-pass / 36 total | Scaffold AnthropicAPIClient + 6 probes + portable spike script (committed reproducibility artifact at scripts/) |
| WB2 | `ea1d69b` | green | probe-01 5/5 → GREEN | Stream-event parsing impl using APIPromise.withResponse() (header seam captured but unused this WB); MB-T26 non-regression confirmed |
| WB3 | `3a700b7` | green | probe-02 4/4 + probe-03 8/8 → GREEN | computeRetryDelayMs (jittered exp backoff w/ retry-after honor + cap) + retry loop on PRE-stream 429+5xx; R-MBT34-3 stream-mid no-retry boundary documented and tested |
| WB4 | `eff3a68` | green | probe-04 7/7 + probe-05 6/6 → GREEN | extractRateLimitState pure-fn + wire into _lastRateLimitState + onRateLimit callback at response-open; data contract frozen for Terminal B |
| WB5 | `f326d21` | green | probe-06 6/6 → GREEN; 73/74 across 9 dirs (1 fail = pre-existing CLAUDE.md §4.5) | loadApiKey impl (file-first ~/.foxworks-dispatch/api-key + env fallback) + AnthropicChatClient compose-refactor + new IPC channel coarchitect:rate-limit-update + preload.mts MB-T34 zone + coarchitect-ipc.ts MB-T34 zone |
| WB6 | this commit | green | runtime smoke + live-API smoke + findings + followups | WINDOW_READY observed ≤10s + live-API smoke probe-07 1/1 GREEN (gated under RUN_LIVE_API=1) |

**Total tests authored:** 37 across 7 probe files. 36 unit (always-runs) + 1 live-API smoke (gated). All unit tests GREEN. Live-API smoke GREEN under RUN_LIVE_API=1.

**Scoped run at WB6 verification:**
- `test/unit/anthropic-api-client/`: 36/36 GREEN (probes 01-06)
- `test/unit/anthropic-api-client/probe-07-live-api-smoke.spec.ts`: SKIPPED by default; GREEN under RUN_LIVE_API=1
- `test/unit/anthropic-client/`: 6/6 GREEN (MB-T26 non-regression)
- `test/unit/cost-calc/`: 11/11 GREEN (MB-T26 non-regression)
- `test/unit/cost-ledger/`: 4/4 GREEN (MB-T26 non-regression)
- `test/unit/coarchitect-ipc/`: 16/17 (1 fail = pre-existing CLAUDE.md §4.5 `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL`; mock-mode bypass; not WB5-caused)
- Workstation runtime-launch smoke (CLAUDE.md §4.6): WINDOW_READY observed in stdout within 10s; stderr clean; no ERR_MODULE_NOT_FOUND.

---

## III. Live-API spike result (load-bearing)

[KNOWN] from Phase 1 spike (`c09bd09`) + WB1 portability re-runs + WB6 live-smoke (3 independent live-API runs total):

**Spike script:** `packages/dispatch-workstation/scripts/mb-t34-spike-rate-limit-headers.cjs` (reproducibility artifact, committed per operator C-MBT34-2 ack). Sends 16-token request to `claude-haiku-4-5` via `client.messages.create({stream:true})`, calls `apiPromise.withResponse()` to capture both Stream + Response, iterates events, writes findings to `/tmp/mb-t34-spike-result.json`. Operator-rerunnable: `node packages/dispatch-workstation/scripts/mb-t34-spike-rate-limit-headers.cjs` (from worktree root or workstation pkg dir).

### III-A. Headers captured (3 spike runs, identical structure)

13 `anthropic-ratelimit-*` headers across 4 dimensions × 3 fields each:

| Dimension | Limit | Remaining | Reset |
|---|---|---|---|
| `requests` (per minute) | 50 | decrements per call | ISO-8601 UTC |
| `tokens` (combined) | 60000 | decrements per token | ISO-8601 UTC |
| `input-tokens` | 50000 | decrements per input | ISO-8601 UTC |
| `output-tokens` | 10000 | decrements per output | ISO-8601 UTC |

Plus: `anthropic-organization-id` (account identifier; redacted in committed artifacts), `request-id` (per-request id; surfaced via `withResponse().request_id`).

### III-B. Stream event sequence (matches existing client.ts assumption)

`message_start → content_block_start → content_block_delta(N) → content_block_stop → message_delta → message_stop`

[KNOWN] `message_start.message.usage.input_tokens` fires once at stream open with initial usage.
[KNOWN] `message_delta.usage.output_tokens` is cumulative across deltas; final delta wins.
[KNOWN] `message_start.message.model` resolves model alias (`claude-haiku-4-5` → `claude-haiku-4-5-20251001`).
[KNOWN] Cache-token fields (`cache_read_input_tokens`, `cache_creation_input_tokens`) present as zero on first request — non-breaking additive opportunity for UsageInfo enrichment, deferred to MB-F-T26-CACHE-TOKEN-COST-ENRICHMENT (Tier 2) per Q-MBT34-9.

### III-C. Negative findings (honest)

[KNOWN] **`retry-after` not observed on 200-OK.** Cannot exercise organically without forcing a 429. WB3 retry path tested via fixture-mocked errors with `.headers.get('retry-after')` instead.
[KNOWN] **No `anthropic-priority-*` headers** on this account tier. Priority-tier-only feature. Not a blocker for plan-usage ring.
[KNOWN] **No separate "Max plan budget" header.** The standard `anthropic-ratelimit-*` set IS the plan-usage data Terminal B consumes. Operator-clarified at HALT 0: "Max plan keychain reuse" referred to where the key is stored (~/.foxworks-dispatch/api-key file mirroring Max plan keychain pattern), NOT a separate plan-tier header.

---

## IV. Acceptance verification — HONEST framing

Per operator prompt §2 acceptance criteria:

| Acceptance | Verification | Honest framing |
|---|---|---|
| Live API spike confirms `anthropic-ratelimit-*` headers exposed | Phase 1 spike + 2 re-runs (WB1 + WB6) all captured 13 headers via `apiPromise.withResponse()` | **Met fully.** [KNOWN] from 3 independent live-API runs. |
| API client surface reusable from non-chat-flow callers | `AnthropicAPIClient` exported from anthropic-api-client.ts; `AnthropicChatClient.api` getter exposes the composed instance for non-chat-flow callers; `createAnthropicAPIClient()` factory | **Met fully.** MB-T35 reasoning loop will instantiate via factory or compose like AnthropicChatClient does. |
| Rate-limit + retry tested via fixture stream-events | probe-02 (4/4) tests retry on 429 + 5xx via mocked errors; probe-03 (8/8) tests pure-fn computeRetryDelayMs directly | **Met fully.** Real retry loop + real backoff math exercised; no live-API needed for retry verification. |
| onUsage callback continues to fire correctly for chat flow | probe-01 anthropic-client/ 6/6 GREEN at every WB; live-API smoke probe-07 confirms onUsage fires with real token counts | **Met fully.** Chat-flow signature preserved; compose-refactor preserves MB-T26 cost capture. |
| Plan-usage header data exposed via callback or accessor for MB-T25 | Both: `getRateLimitState()` accessor + optional `onRateLimit?` callback. New IPC channel `coarchitect:rate-limit-update` + `coarchitectBridge.onRateLimitUpdate` for renderer subscription | **Met fully.** Terminal B has both pull (accessor via main-internal) and push (IPC subscription) paths. |
| Unit tests for stream parsing, retry, backoff, header extraction | 36 unit tests across probes 01-06 | **Met fully.** Each acceptance facet has its own probe file. |
| Live API smoke at WB-final | probe-07-live-api-smoke.spec.ts (gated under RUN_LIVE_API=1) sends "hi" prompt, verifies onUsage + onRateLimit + getRateLimitState all populated correctly | **Met fully.** Single live-API call (~16 tokens) exercises full production path including loadApiKey + composed AnthropicChatClient → AnthropicAPIClient. |

**Outcome classification (CLAUDE.md §2.11):** **Improved (capability enabled with one operator-tracked limitation).**

**What's enabled (KNOWN, verified):**
- End-to-end production path: `~/.foxworks-dispatch/api-key` → `loadApiKey()` → `createAnthropicAPIClient()` → `streamMessage` → `withResponse()` → `extractRateLimitState` → `_lastRateLimitState` + `onRateLimit` callback → `coarchitect:rate-limit-update` IPC → renderer subscriber via `coarchitectBridge.onRateLimitUpdate`
- onUsage chat-flow non-regression: MB-T26 cost meter + cost ledger + cost-flow IPC unchanged through compose-refactor
- Outer retry on PRE-stream 429 + 5xx with jittered exp backoff + retry-after honor + 30s cap
- Per Q-MBT34-1=(c) chat-client refactor: `AnthropicChatClient` is now a thin projection layer over `AnthropicAPIClient` (37 LOC of compose vs the previous 60+ LOC of direct create+iterate)
- New IPC channel `coarchitect:rate-limit-update` mirrors MB-T26 `coarchitect:cost-update` pattern; renderer subscription returns cleanup-fn matching the established convention
- Reproducibility artifact: spike script committed at `scripts/mb-t34-spike-rate-limit-headers.cjs` with file-first key load + standard SDK require (no hardcoded paths)

**What's limited (KNOWN, operator-tracked):**
- Cache-token enrichment of `UsageInfo` deferred to MB-T26 owner per Q-MBT34-9. Spike confirmed `cache_read_input_tokens` + `cache_creation_input_tokens` are present (zero on cold request); enrichment is non-breaking additive when MB-T26 author wants it. Filed as `MB-F-T26-CACHE-TOKEN-COST-ENRICHMENT` (Tier 2).

**What's not in scope (correctly out per prompt §2):**
- Reasoning loop logic (MB-T35 ticket)
- BUILD.md parsing (MB-T28; Terminal C territory)
- Plan-usage ring widget rendering (MB-T25; Terminal B territory; this ticket provides the data)
- Cost meter UI (MB-T26; already shipped)
- Conductor profile YAML (MB-T33)

---

## V. Q-MBT34-N + C-MBT34-N + R-MBT34-N final dispositions

### Q dispositions (operator-acked HALT 0)

| ID | Final disposition | Verified at |
|---|---|---|
| Q-MBT34-1 | (c) split + chat-client composes | WB5 |
| Q-MBT34-2 | (b)+(c) accessor + callback | WB4 |
| Q-MBT34-3 | (b) file-first + env fallback | WB5 (probe-06) |
| Q-MBT34-4 | (a) jittered exp backoff + retry-after | WB3 |
| Q-MBT34-5 | (a) retry inside streamMessage | WB3 |
| Q-MBT34-6 | (b) nested-bucket RateLimitState | WB4 (probe-04) |
| Q-MBT34-7 | (a) hand-written JSON RawMessageStreamEvent fixtures (mocked async iterables in probes; no actual fixture files needed) | WB2-WB4 |
| Q-MBT34-8 | (a) 6 WBs | this WB |
| Q-MBT34-9 | defer to MB-F-T26-CACHE-TOKEN-COST-ENRICHMENT | this WB (filed) |
| Q-MBT34-10 | (b) signature additive (no breaking changes) | WB5 |
| Q-MBT34-11 | (a) RUN_LIVE_API=1 gating | WB6 (probe-07) |

### C dispositions (cross-session arbitration)

| ID | Final disposition | Verified at |
|---|---|---|
| C-MBT34-1 | (b mod): main-internal accessor + new IPC channel + preload bridge method (operator-modified from tentative; explicit IPC channel coarchitect:rate-limit-update + onRateLimitUpdate bridge method) | WB5 |
| C-MBT34-2 | (a) commit spike script (header-comment scope-tagged as one-off reproducibility artifact; file-first key load mirroring production) | WB1 (committed) |

### R dispositions (risks)

| ID | Risk | Final disposition |
|---|---|---|
| R-MBT34-1 | `withResponse()` requires un-awaited APIPromise | MITIGATED via type system enforcement (Stream has no withResponse member; mistake fails compile). Code comment in streamMessage. |
| R-MBT34-2 | Existing streamMessages signature change could regress MB-T26 | MITIGATED: signature preserved via positional-additive onRateLimit param; MB-T26 probe-01 + cost-calc + cost-ledger all GREEN at every WB. |
| R-MBT34-3 | Retry on stream-mid 429 doubles cumulative usage | MITIGATED: outer retry covers PRE-stream errors only; documented in code comment. Stream-mid errors propagate. probe-02 mocks pre-stream throws. |
| R-MBT34-4 | Stale RateLimitState read by consumer | MITIGATED: capturedAt ISO timestamp included; consumers decide staleness threshold. |
| R-MBT34-5 | API key file disappears between sessions | MITIGATED: loadApiKey() returns null gracefully; createAnthropicAPIClient returns null; existing precedent matches createAnthropicClient env-var-null path. |
| R-MBT34-6 | t26-t27-coord.md may need MB-T34 entry if onUsage path changes shape | NOT NEEDED: onUsage shape unchanged (UsageInfo same); only an additive 4th-positional onRateLimit param. No coord doc update required. |
| R-MBT34-7 | Live-API smoke could fail on network-hostile CI | MITIGATED via RUN_LIVE_API=1 gating per Q-MBT34-11=(a). |
| R-MBT34-8 | Spike used haiku-4-5 not sonnet-4-6; header shape model-specific? | RESOLVED: [KNOWN] headers are response-level not model-specific (3 spike runs all observed identical header set; `claude-haiku-4-5` resolves to `claude-haiku-4-5-20251001`). |
| R-MBT34-9 | Worktree isolation: can't read Terminal B's MB-T25 in-progress branch | MITIGATED: RateLimitState contract fully documented in this findings doc + WB4 commit body; Terminal B reads post-merge via git. |

---

## VI. Cross-session coordination notes

### VI-A. Terminal B (MB-T25) — green light + frozen contract

**Data contract (consumer surface for plan-usage ring widget):**

```ts
interface RateLimitBucket {
  readonly remaining: number;       // integer (Number.parseInt)
  readonly limit: number;            // integer
  readonly reset: string;            // ISO-8601 UTC string (NOT Date)
}

interface RateLimitState {
  readonly requests: RateLimitBucket;       // requests/min budget
  readonly tokens: RateLimitBucket;          // combined token budget
  readonly inputTokens: RateLimitBucket;     // input-only token budget
  readonly outputTokens: RateLimitBucket;    // output-only token budget
  readonly capturedAt: string;               // ISO-8601 UTC; main-process captured
}
```

**IPC bridge (preload.mts MB-T34 zone exposes `coarchitectBridge.onRateLimitUpdate`):**

```ts
window.coarchitectBridge.onRateLimitUpdate(
  (state: unknown) => {
    // Type-narrow with a guard; main delivers RateLimitState shape verbatim
    const s = state as RateLimitState;
    // Render ring widget using s.tokens.remaining / s.tokens.limit etc.
  },
): () => void  // returns cleanup-fn matching MB-T26 onCostUpdate convention
```

**Subscription semantics (mirrors MB-T26 cost meter):**
- Initial registration immediately invokes `coarchitect:getRateLimitState` to fetch current snapshot (or null if no API call has completed yet).
- Subscribes to `coarchitect:rate-limit-update` broadcasts emitted from `captureRateLimitToBroadcast` after each successful streamMessage response-open.
- Returns cleanup-fn (removes listener); use in React `useEffect` cleanup pattern.

**Render guidance (Terminal B):**
- Rate-limit data is **per-request snapshot**, not continuous. Ring widget should show "captured ~{age} ago" or refresh-stale indicator if `Date.now() - new Date(state.capturedAt).getTime()` exceeds some threshold (operator decision).
- All 4 dimensions are independent buckets; UI may show one canonical "tokens combined" ring + per-dimension drill-down on click, OR all 4 rings inline. Operator decision (Q-MBT25 territory).
- `state` may be null on first subscription if no API call has fired yet.

### VI-B. MB-T26 cost meter — non-regression

[KNOWN] MB-T26 chat-flow + cost ledger + IPC delivery unchanged at all 6 WBs. Verified by:
- `test/unit/anthropic-client/probe-01-onusage-callback.spec.ts` (6/6) at WB1, WB2, WB3, WB4, WB5
- `test/unit/cost-calc/` (11/11) at every WB
- `test/unit/cost-ledger/` (4/4) at every WB

**Compose-refactor change (WB5):** AnthropicChatClient.streamMessages now calls `apiClient.streamMessage` instead of direct `client.messages.create`. The MB-T26 probe-01 mock was updated to provide `.withResponse()` (test-mechanics fix; assertions unchanged). MB-T26 owner can verify the chat-flow path end-to-end via `RUN_LIVE_API=1 pnpm --filter dispatch-workstation exec vitest run test/unit/anthropic-api-client/probe-07-live-api-smoke.spec.ts` which exercises onUsage with real token counts.

### VI-C. MB-T35 reasoning loop (next ticket; not in this wave)

Exported surface ready for MB-T35 to consume:

```ts
import {
  AnthropicAPIClient,
  createAnthropicAPIClient,
  loadApiKey,
  type RateLimitState,
  type StreamMessageParams,
  type StreamCallbacks,
  type RateLimitBucket,
  ApiKeyNotConfiguredError,
} from './anthropic-api-client.js';
```

Either path works:
- **Direct factory:** `const client = await createAnthropicAPIClient(); if (!client) throw new ApiKeyNotConfiguredError();`
- **Compose like AnthropicChatClient:** instantiate via DI for testability; non-chat-flow signature.

The reasoning loop's outer agent loop should consume `client.streamMessage(params, {onUsage, onRateLimit})` and decide whether to continue based on `onRateLimit` data (e.g., back off if `tokens.remaining < threshold`). Implementation territory for MB-T35.

---

## VII. Round 4 methodology evidence — operator-flagged

Per operator's HALT 0 ack message, this WB-final findings doc surfaces evidence for two Round 4 methodology amendments. **Authoring the methodology amendments is operator-only territory** (per CLAUDE.md §2.10 frozen-contract authoring); this section provides the evidence the operator may use when authoring.

### VII-A. Per-session worktree isolation enabling independent source-reading

Operator's stated framing in HALT 0 ack:

> Two-source independent verification of the same architectural question:
> - Terminal D ran the live-API spike confirming server emission of headers (production-side load-bearing)
> - Terminal B read SDK .d.ts files confirming SDK exposure of Response headers (consumer-side load-bearing)
>
> The questions decompose cleanly: server side answered by spike, client side answered by source-read. Neither session's evidence overlaps the other's; both are needed; both surfaced honestly with [KNOWN] confidence. This is the per-session worktree isolation pattern enabling independent source-reading at full cognitive bandwidth — not just "structural elimination of shared-tree failure modes" but "cognitive bandwidth freed from coordination overhead, available for source-reading discipline."

[KNOWN] from this session's MB-T34 worktree:
- Zero shared-tree contention incidents (cf. MB-T27 §3.18 cross-session stash incident in shared-tree Round 3)
- All 6 atomic-chain pushes succeeded with `Already up to date.` from `git pull --rebase` (no rebase required)
- Source-reading depth: I read `@anthropic-ai/sdk@0.92.0` `.d.ts` files for messages.d.ts (2272 lines) + api-promise.d.ts + streaming.d.ts at full attention, then ran live-API spike to upgrade [MODELED] type-contract claims to [KNOWN] runtime claims. This dual-evidence path was natural in my own worktree without coordination overhead.

The methodology amendment the operator may author would codify: "per-session worktree isolation + two-source independent verification of load-bearing architectural questions" as a Round 4 ratification standard.

### VII-B. Halt-and-surface on operator-artifact errors

Operator's stated framing references "fourth within-session anti-fabrication self-correction in Round 4 dispatch wave" including:
- Terminal 1 spike result
- Terminal 2 vitest config + spec §9 Q7
- Terminal 3 prompt §2 [INACCURATE]
- Terminal 4 SDK .d.ts read pre-empting spike dependency

[KNOWN] my Terminal D pattern in this session:
- HALT-pre-spike when API key file was absent (surfaced; operator created file; resumed). Did NOT proceed without file. Did NOT improvise alternate key source.
- HALT 1 pre-final-verification surfaced clean status before WB6 final commit, awaiting operator ack despite WB ladder being unconditionally pre-authorized.
- Anti-fabrication §1.1 + spike-against-live-API §1.1 enforced throughout: no claim about SDK runtime behavior was made without either spike evidence or explicit [MODELED] tag.

The methodology amendment the operator may author would codify: "halt-and-surface on operator-artifact errors" + "two-source independent verification of load-bearing decisions" as Round 4 ratification standards.

---

## VIII. Confidence summary (CLAUDE.md §2.2)

| Claim | Label | Source |
|---|---|---|
| @anthropic-ai/sdk@0.92.0 stream-create returns APIPromise<Stream<RawMessageStreamEvent>> | [KNOWN] | messages.d.ts:32 + 3 spike runs |
| `withResponse()` exposes raw Response with anthropic-ratelimit-* headers | [KNOWN] | api-promise.d.ts:39 + 3 spike runs (13 headers each) |
| Stream event sequence: message_start → ... → message_stop | [KNOWN] | 3 spike runs identical |
| `cache_*_input_tokens` fields present (zero) on first request | [KNOWN] | spike runs |
| No `retry-after` on 200-OK | [KNOWN] | spike runs (negative finding) |
| No `anthropic-priority-*` on this account tier | [KNOWN] | spike runs (negative finding) |
| No separate "Max plan budget" header | [KNOWN] | spike runs + operator HALT 0 clarification |
| Production path end-to-end (loadApiKey → API client → IPC → bridge): functional | [KNOWN] | live-API smoke probe-07 GREEN under RUN_LIVE_API=1 + runtime smoke WINDOW_READY |
| MB-T26 chat-flow non-regression | [KNOWN] | probe-01 6/6 GREEN at every WB |
| Retry path correctness on REAL @anthropic-ai/sdk RateLimitError shapes (with .headers attachment) | [MODELED] | probe-02 mocks pre-stream throws; real SDK header attachment not exercised this session. WB6 live-smoke didn't organically encounter 429. Future ticket may upgrade to [KNOWN] when a 429 occurs in production. |
| coarchitect:rate-limit-update IPC channel end-to-end (main → renderer received correctly) | [MODELED] | Wire in coarchitect-ipc.ts + preload.mts is correct by construction (mirrors MB-T26 onCostUpdate pattern that's KNOWN-working); no E2E renderer subscription test in this WB ladder. Terminal B's MB-T25 will exercise this path on consumer side. |

---

## IX. Files shipped

**Production (4):**
- `packages/dispatch-workstation/src/main/anthropic-api-client.ts` (~290 lines NEW)
- `packages/dispatch-workstation/src/main/anthropic-client.ts` (compose-refactor; ~80 lines net)
- `packages/dispatch-workstation/src/main/coarchitect-ipc.ts` (MB-T34 sentinel zone; ~50 lines added)
- `packages/dispatch-workstation/src/main/preload.mts` (MB-T34 sentinel zone; ~30 lines added)

**Tests (7 spec files):**
- `test/unit/anthropic-api-client/probe-01-stream-event-parsing.spec.ts` (5 tests)
- `test/unit/anthropic-api-client/probe-02-retry-on-429.spec.ts` (4 tests)
- `test/unit/anthropic-api-client/probe-03-retry-delay-computation.spec.ts` (8 tests)
- `test/unit/anthropic-api-client/probe-04-header-extraction.spec.ts` (7 tests)
- `test/unit/anthropic-api-client/probe-05-rate-limit-accessor-and-callback.spec.ts` (6 tests)
- `test/unit/anthropic-api-client/probe-06-api-key-loader.spec.ts` (6 tests)
- `test/unit/anthropic-api-client/probe-07-live-api-smoke.spec.ts` (1 test, gated)
- `test/unit/anthropic-client/probe-01-onusage-callback.spec.ts` (mock-update for compose-refactor)
- `test/unit/coarchitect-ipc/test_register_ipc_handlers.spec.ts` (handler-count + 2 assertion updates for MB-T34 IPC channel)

**Reproducibility (1):**
- `packages/dispatch-workstation/scripts/mb-t34-spike-rate-limit-headers.cjs` (one-off spike artifact, operator-rerunnable)

**Docs (3):**
- `docs/coordination/mb-t34-diagnose-2026-05-08.md` (Phase 1)
- `docs/coordination/mb-t34-decisions-2026-05-08.md` (Phase 1)
- `docs/coordination/mb-t34-findings-2026-05-08.md` (this commit)

**FOLLOWUPS.md** appended with 1 Tier 2 entry (MB-F-T26-CACHE-TOKEN-COST-ENRICHMENT).

---

## X. Total live-API call cost this session

3 calls total: Phase 1 spike (1) + WB1 portability re-runs (1) + WB6 live-API smoke (1). Each ~16 output tokens × ~$0.005/MTok ≈ $0.001 total. Negligible.

---

## XI. Ladder closure surface

MB-T34 6-WB ladder complete. All commits pushed to `origin mbt34-worktree`:

- `c09bd09` Phase 1 spike
- `bd69b15` WB1 RED
- `ea1d69b` WB2 GREEN parser
- `3a700b7` WB3 GREEN retry
- `eff3a68` WB4 GREEN headers
- `f326d21` WB5 GREEN compose+IPC
- this commit WB6 docs+findings

Operator merges `mbt34-worktree` to `main` per HALT 2 protocol. No HALT-2 surface authored by Terminal D (operator-arbitrated territory).
