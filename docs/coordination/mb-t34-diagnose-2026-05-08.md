# MB-T34 Phase 1 Diagnose — Anthropic API client (workstation)

**Terminal:** D (parallel-cairn 4-session run, Round 4)
**Date:** 2026-05-08
**Working tree:** `/Users/joshuatseppich/Desktop/Automata/foxworks-dispatch-mbt34` (branch `mbt34-worktree`, clean at session start)
**Origin parity:** HEAD = `c6ee1fa` (Round 3 cleanup); `git log origin/mbt34-worktree..HEAD` empty pre-Phase-1.
**Companion:** `docs/coordination/mb-t34-decisions-2026-05-08.md` (operator-skim review surface; tentative dispositions PENDING markup).

Inventory of the surface, decisions, risks, and ladder shape for MB-T34. Source of truth on dispositions = decisions doc. This file = full prose + verification trail with confidence labels.

---

## I. Ticket scope (operator prompt §2)

> **MB-T34** — Anthropic API client in workstation
> - SSE streaming `/v1/messages` adapter
> - Auth via Max plan keychain reuse (operator-confirmed Q4 = Max plan keychain reuse; key file at `~/.foxworks-dispatch/api-key`)
> - Rate-limit + retry handling
> - Per-message token + cost tracking (feeds MB-T26)
> - **Plan-usage header capture** (load-bearing for MB-T25; Terminal B is depending on the WB1 spike result)
> - ~8-10 WBs

**Acceptance (prompt §2):**
- Live API spike confirms `anthropic-ratelimit-*` headers exposed via @anthropic-ai/sdk@0.92.0 stream response (or surfaces honest finding + workaround).
- API client surface reusable from non-chat-flow callers (MB-T35 will consume).
- Rate-limit + retry tested via fixture stream-events.
- onUsage callback continues to fire correctly for chat flow (no regression to MB-T26).
- Plan-usage header data exposed via callback or accessor for MB-T25 to consume.
- Unit tests for: stream-event parsing, retry logic, rate-limit backoff, header extraction.
- Live API smoke at WB-final: simple "hi" prompt + verify response + usage + headers all captured.

---

## II. Surface inventory (verified via tool reads)

### II-A. Existing client (`packages/dispatch-workstation/src/main/anthropic-client.ts`, 147 lines)

[KNOWN] Single file, exports:
- `CHAT_MODEL = 'claude-sonnet-4-6'` (line 7)
- `MAX_TOKENS = 4096` (line 11; MODELED comment cites MB-S01 ADR avg 438 output tokens, 9× headroom)
- `interface AnthropicErrorInfo { code, message }` (13–16)
- `interface UsageInfo { inputTokens, outputTokens, model }` (31–35) — MB-T26 WB3 (`09b38ce`)
- `class AnthropicChatClient` (43–103) — DI-injected `Pick<Anthropic, 'messages'>` + `systemPrompt`
  - `streamMessage(content, onUsage?)` (49–58) → delegates to `streamMessages`
  - `streamMessages(systemPrompt, messages, onUsage?)` (60–102) → `await client.messages.create({...stream: true})`, iterates `RawMessageStreamEvent`, fires `onUsage` at end-of-stream
- `classifyAnthropicError(error)` (110–133) — covers `RateLimitError`, `AuthenticationError`, `APIConnectionError`, generic `Error`
- `createAnthropicClient(systemPrompt)` (139–146) — factory; reads `process.env['ANTHROPIC_API_KEY']`; returns null if absent

[KNOWN] **Headers are NOT captured today.** The implementation does `await this.client.messages.create({...})` — i.e., it awaits the `APIPromise<Stream<...>>` to extract the `Stream`, discarding the `APIPromise` wrapper. The `withResponse()` seam (which exposes raw `Response.headers`) is therefore unreachable from any current call site. This is the structural gap MB-T34 must close.

[KNOWN] **Auth path is env-var only.** `createAnthropicClient` reads `process.env['ANTHROPIC_API_KEY']`. The MB-T34 prompt §0 directs us to migrate to `~/.foxworks-dispatch/api-key` file-read. Two options for compatibility surface (Q-MBT34-3 below).

[KNOWN] **No retry / no backoff today.** `streamMessages` has zero retry logic — first error from `messages.create` propagates to caller (`coarchitect-ipc.ts`).

### II-B. SDK version + entry shape

[KNOWN] `@anthropic-ai/sdk` is pinned at `^0.92.0` in `packages/dispatch-workstation/package.json`. Resolved version on disk = `0.92.0` (verified by spike, see §V).
[KNOWN] SDK package.json: `"main": "./index.js"`, `"type": "commonjs"`. Default export is `Anthropic`.

### II-C. SDK type contract for stream + headers (read from `.d.ts`)

Reads against `node_modules/@anthropic-ai/sdk/resources/messages/messages.d.ts` (2272 lines) and `core/api-promise.d.ts` + `core/streaming.d.ts`:

[KNOWN] `Messages.create` overload set (messages.d.ts:31-33):
```ts
create(body: MessageCreateParamsNonStreaming, options?): APIPromise<Message>;
create(body: MessageCreateParamsStreaming,  options?): APIPromise<Stream<RawMessageStreamEvent>>;
create(body: MessageCreateParamsBase,        options?): APIPromise<Stream<RawMessageStreamEvent> | Message>;
```

[KNOWN] `APIPromise<T>` (core/api-promise.d.ts:8-48) extends Promise + provides:
- `asResponse(): Promise<Response>` — raw Response, no body parse
- `withResponse(): Promise<{ data: T; response: Response; request_id: string | null | undefined }>` — both parsed value AND raw `Response`

[KNOWN] `Stream<Item>` (core/streaming.d.ts:8-31) — does NOT expose response/headers itself. The ONLY way to reach headers from a stream-create call is `apiPromise.withResponse()` BEFORE awaiting the inner Stream. The `MessageStream` higher-level helper (lib/MessageStream.d.ts) is a separate alternative for non-streaming-iter use cases; not used by the existing chat client and out-of-scope for MB-T34.

[KNOWN] Stream event shapes (messages.d.ts):
- `RawMessageStartEvent` (line 779) `{ message: Message; type: 'message_start' }`
- `RawMessageDeltaEvent` (line 742) `{ delta: Delta; type: 'message_delta'; usage: MessageDeltaUsage }`
- `RawMessageStopEvent` (line 783) `{ type: 'message_stop' }`
- `RawContentBlockStartEvent` (line 730), `RawContentBlockDeltaEvent` (line 725), `RawContentBlockStopEvent` (line 738)
- `RawMessageStreamEvent = ` union of the six (line 786)

[KNOWN] `MessageDeltaUsage` (line 659) carries cumulative `output_tokens: number`, plus nullable `cache_creation_input_tokens`, `cache_read_input_tokens`, `input_tokens`, `server_tool_use`. The existing MB-T26 capture path (`event.usage.output_tokens`) is correct per type contract.

### II-D. MB-T26 onUsage integration (`coarchitect-ipc.ts`)

[MODELED, no source read this session] The MB-T26 sentinel zone in `coarchitect-ipc.ts` adds `captureUsageToLedger(usage)` and wires it to the 3 `streamMessages`/`streamMessage` call sites. From commit `09b38ce` body. **Will read the file before any code edit in WB-N**; for Phase 1 diagnose, this MODELED snapshot is sufficient — the contract surface I'm extending is `UsageInfo` + `onUsage?` signature, not the IPC layer.

### II-E. API key file (`~/.foxworks-dispatch/api-key`)

[KNOWN] File created by operator post-halt; verified via `stat`: 108 bytes, mode 600. Contents NEVER read into chat output. Spike script reads via `fs.readFileSync(...).trim()` and never echoes.

[KNOWN] The directory `~/.foxworks-dispatch/` already contains daemon-managed files (`data.db`, `sessions.json`, `token`, `logs/`, `archive/`). Adding `api-key` does not collide with any existing daemon path.

---

## III. Live-API spike result (load-bearing finding) — [KNOWN]

**Spike script:** `/tmp/mb-t34-spike.cjs` (out-of-worktree, not staged). Reads key from `~/.foxworks-dispatch/api-key`, sends 16-token `claude-haiku-4-5` request via `client.messages.create({...stream: true})`, calls `apiPromise.withResponse()` to capture both Stream + Response, iterates Stream, records all data points to `/tmp/mb-t34-spike-result.json`.

**Spike outcome: SUCCESS — rate-limit headers ARE exposed via `APIPromise.withResponse()`.**

### III-A. Headers captured (13 anthropic-ratelimit headers + 1 request-id + 1 organization-id; values redacted/illustrative)

[KNOWN] Header set (case-insensitive keys; values quoted from a single observed response):
| Header | Example value | Notes |
|---|---|---|
| `anthropic-ratelimit-requests-limit` | `50` | Per-minute request budget |
| `anthropic-ratelimit-requests-remaining` | `49` | Decrements per request |
| `anthropic-ratelimit-requests-reset` | `2026-05-08T02:37:51Z` | ISO-8601 UTC |
| `anthropic-ratelimit-tokens-limit` | `60000` | Combined (input+output) per-minute token bucket |
| `anthropic-ratelimit-tokens-remaining` | `60000` | Decrements per token consumed |
| `anthropic-ratelimit-tokens-reset` | `2026-05-08T02:37:50Z` | ISO-8601 UTC |
| `anthropic-ratelimit-input-tokens-limit` | `50000` | Separate input budget |
| `anthropic-ratelimit-input-tokens-remaining` | `50000` | Separate input remaining |
| `anthropic-ratelimit-input-tokens-reset` | `2026-05-08T02:37:50Z` | Separate input reset |
| `anthropic-ratelimit-output-tokens-limit` | `10000` | Separate output budget |
| `anthropic-ratelimit-output-tokens-remaining` | `10000` | Separate output remaining |
| `anthropic-ratelimit-output-tokens-reset` | `2026-05-08T02:37:50Z` | Separate output reset |
| `anthropic-organization-id` | `<redacted>` | Account identifier |
| `request-id` | `<redacted>` | Per-request id; SDK also surfaces via `withResponse().request_id` |

[KNOWN] **NOT observed:** `retry-after` (only fires on 429; cannot test on success path — will exercise via fixture in WB3), `anthropic-priority-*` (priority-tier-only; this account is not priority tier).

### III-B. Stream event sequence (matches existing client.ts assumption — [KNOWN] confirmed)

[KNOWN] For one 16-token request returning `"Hi! 👋 How can I help you today?"` (8 input, 16 output tokens, model=`claude-haiku-4-5-20251001`), the stream emitted 7 events in this exact order:
```
message_start
content_block_start
content_block_delta
content_block_delta
content_block_stop
message_delta
message_stop
```

[KNOWN] `message_start.message.usage.input_tokens = 8` — fires once at stream open. Consistent with anthropic-client.ts:80 capture path.
[KNOWN] `message_delta.usage.output_tokens = 16` — fires once with the full cumulative output count. Consistent with anthropic-client.ts:85 capture path.
[KNOWN] `message_start.message.usage.cache_read_input_tokens = 0`, `cache_creation_input_tokens = 0` — cache fields are zero (not null/undefined) on a fresh request. Adding cache token capture to `UsageInfo` is a non-breaking extension if MB-T26 wants it.
[KNOWN] `message_start.message.model = 'claude-haiku-4-5-20251001'` — alias `claude-haiku-4-5` resolved to versioned form server-side. Consistent with anthropic-client.ts:81 capture path. Real model identity for cost ledger should use the resolved versioned form.

### III-C. Plan-tier observation — [KNOWN]

[KNOWN] Observed limits (50 req/min · 60K combined tokens · 50K input · 10K output) match Anthropic's documented Tier 1 API rate limits, **NOT** any "Max plan dashboard" tier. There is no `anthropic-plan-*` header in the response.

**Implication for prompt §2 "Max plan keychain reuse":** the operator's intent (clarified by header observation) is keychain-reuse-of-key-storage, NOT a separate Max-plan-dashboard-budget data feed. The standard `anthropic-ratelimit-*` headers ARE the data Terminal B (MB-T25 plan-usage ring) needs. There is no parallel "Max plan budget" data stream to discover.

### III-D. Negative findings — [KNOWN]

[KNOWN] **`retry-after` not observed on 200-OK.** Need fixture replay in WB3 to exercise 429 backoff path.
[KNOWN] **No request-cost header.** Cost is computed client-side from token counts × model price (existing MB-T26 path); no header shortcut.
[KNOWN] **No streaming-mid header refresh.** Headers are captured ONCE at response open. The Stream itself does not surface header updates as it iterates. Plan-usage ring updates require a fresh request (or a separate background-poll path, out-of-scope here).

---

## IV. Open questions (Q-MBT34-N)

| ID | Question | Options | Tentative |
|---|---|---|---|
| **Q-MBT34-1** | File-extend vs new-file for the new API client surface | (a) extend existing `anthropic-client.ts` with sentinel-zoned MB-T34 additions (single file, conductor consumes via existing import path) / (b) new sibling `anthropic-api-client.ts` for non-chat-flow + keep existing AnthropicChatClient as-is / (c) split: extract a low-level `AnthropicAPIClient` that wraps `withResponse()` + headers, and refactor `AnthropicChatClient` to compose it | **(c)** — clean separation: `AnthropicAPIClient` owns transport + headers + retry + key-loading; `AnthropicChatClient` becomes a thin chat-flow wrapper composing `AnthropicAPIClient` (chat-flow signature unchanged ⇒ MB-T26 onUsage non-regression). Operator confirms the refactor scope. |
| **Q-MBT34-2** | Header exposure surface to consumers | (a) attach to `UsageInfo` (extend interface) — couples plan-usage to per-message callback / (b) separate `RateLimitState` accessor (`getRateLimitState(): RateLimitState \| null`) on `AnthropicAPIClient` — last-observed snapshot / (c) separate callback `onRateLimit?(state: RateLimitState)` fired alongside `onUsage` | **(b) + (c)** — accessor for snapshot reads (Terminal B can read at any time), AND callback for push-driven UI updates. Both wire to the same internal `_lastRateLimitState` field. |
| **Q-MBT34-3** | API key source migration | (a) replace env-var lookup entirely — file-only / (b) file-first with env-var fallback / (c) new factory `createAnthropicClientFromKeyFile(systemPrompt)` alongside existing env-var factory | **(b)** — file-first with env-var fallback. Existing chat-flow tests + dev workflows that set `ANTHROPIC_API_KEY` keep working; production path uses file. New factory `loadApiKey(): Promise<string \| null>` is a tiny utility I'll add. |
| **Q-MBT34-4** | Retry policy | (a) exponential backoff on 429 + 5xx with jitter, max 3 retries, respect `retry-after` header / (b) (a) + circuit-breaker after N consecutive failures / (c) operator-pluggable retry policy injected via constructor | **(a)** — match Anthropic recommended pattern. Circuit-breaker is v3.1 polish; pluggable policy is over-engineering for current scope. |
| **Q-MBT34-5** | Where retry logic lives | (a) inside `AnthropicAPIClient.streamMessage` wrapping `messages.create` / (b) external retry decorator class / (c) lean on @anthropic-ai/sdk's built-in retry (verify what it does) | **(a)** with explicit fixture-based test. SDK has built-in retry on transport errors but NOT on 429 stream-mid; we need our own outer retry that re-creates the stream. |
| **Q-MBT34-6** | RateLimitState shape | (a) flat object: `{ requestsRemaining, requestsLimit, requestsReset, tokensRemaining, tokensLimit, tokensReset, inputTokensRemaining, ..., outputTokensRemaining, ..., capturedAt }` / (b) nested: `{ requests: Bucket, tokens: Bucket, inputTokens: Bucket, outputTokens: Bucket, capturedAt }` where `Bucket = { remaining, limit, reset }` / (c) a Map-of-buckets keyed by dimension name | **(b)** — nested gives Terminal B clean field access (`state.tokens.remaining / state.tokens.limit`) for ring rendering. Reset timestamps stored as ISO strings for safe IPC serialization. |
| **Q-MBT34-7** | Test fixture format | (a) hand-written ServerSentEvent-array JSON files in `test/fixtures/anthropic/` / (b) recorded-from-spike SSE bytes (replay) / (c) inline fixture objects in test files | **(a)** — JSON arrays of `RawMessageStreamEvent` shapes are easier to maintain and read than raw SSE bytes; satisfies "test exercises behavior not mocks" because the fixture data IS the behavior under test (parser correctness). The transport seam is still the real `Stream` iterator over a mocked async iterable. |
| **Q-MBT34-8** | WB count | (a) 6 WBs: WB1 RED scaffold + spike confirmed / WB2 stream-event parsing / WB3 retry+backoff / WB4 header extraction / WB5 non-chat-flow surface / WB6 live-API smoke + findings + followups / (b) 8 WBs (split WB2 into parser + integration; split WB5 into client class + factory) / (c) 4 WBs collapsed (WB1 spike+scaffold; WB2 parsing+headers; WB3 retry; WB4 surface+smoke+docs) | **(a)** — 6 WBs. Each WB closes one acceptance criterion. Matches §3 ladder. |
| **Q-MBT34-9** | onUsage backward compat | (a) preserve current signature exactly; emit `cache_*_input_tokens` only via NEW callback `onCacheUsage?` / (b) extend `UsageInfo` additively with optional fields `cacheReadInputTokens?`, `cacheCreationInputTokens?` / (c) leave UsageInfo as-is for this ticket; cache-token capture is MB-T26 v3.1 followup | **(c)** — out-of-scope for MB-T34. MB-T25 needs rate-limit headers; MB-T26 already has token-cost capture. Cache-token enrichment is a separate small ticket if/when it matters. **However**, if a small additive change is operator-acked at HALT 0, I can do (b) in WB2 because the spike confirmed the field is always present. |
| **Q-MBT34-10** | Sentinel zone strategy in `coarchitect-ipc.ts` | (a) leave existing MB-T26 sentinel zone untouched; new MB-T34 zone if any wiring changes / (b) if `streamMessages` signature is non-breaking-additive, no IPC changes needed / (c) if signature changes (e.g., add `onRateLimit?`), a new MB-T34 sentinel zone wraps the additional callback wiring | **(b)** if operator-acks Q-MBT34-2=(b)+(c) — `getRateLimitState()` accessor is a method on AnthropicAPIClient, called by Terminal B's MB-T25 surface independent of chat-flow. Optional `onRateLimit?` callback on `streamMessage` is purely additive; chat-flow can ignore it. **NO** sentinel zone needed in coarchitect-ipc.ts unless Terminal B's wiring requires renderer-side IPC for plan-usage state. **Surface to operator at HALT 0:** if Terminal B intends to read plan-usage state via renderer IPC (not main-process-internal), we'll need a new IPC channel — out-of-scope additive contract change requiring operator arbitration. |
| **Q-MBT34-11** | Live-API smoke test runtime | (a) gated under `RUN_LIVE_API=1` env (skipped by default in CI) / (b) always runs (1-token cost is negligible) / (c) recorded fixture replay only; no live in CI | **(a)** — gated. Avoids burning request budget on every CI run. Operator can manually `RUN_LIVE_API=1 pnpm --filter dispatch-workstation test ...` for confirmation. WB6 ships both gated live-smoke AND fixture-replay coverage. |

---

## V. Risks (R-MBT34-N)

| ID | Risk | Mitigation |
|---|---|---|
| **R-MBT34-1** | `withResponse()` requires NOT awaiting the APIPromise first. A subtle bug: `const stream = await client.messages.create(...)` then trying `(stream as any).withResponse()` does nothing. | Spike confirmed correct call shape: `const apiPromise = client.messages.create(...); const { data: stream, response, request_id } = await apiPromise.withResponse();` Document in code comment. Type system enforces it (Stream has no withResponse method). |
| **R-MBT34-2** | Existing `streamMessages` signature change could regress MB-T26 chat-flow. | Refactor strategy: `AnthropicChatClient.streamMessages` keeps current signature. Internally it composes `AnthropicAPIClient.streamMessage` which exposes the headers seam. MB-T26 onUsage callback path stays identical. Run MB-T26 cost-meter probes (probe-01 + probe-02) as regression suite per prompt §4. |
| **R-MBT34-3** | Retry on stream-mid 429 (not stream-open 429) is hard: the SDK delivers a partial Stream; if it errors mid-iter, we'd need to abandon the stream and retry from message-start. Cumulative usage would double-count. | Document in code: outer retry handles ONLY pre-stream errors (e.g., HTTP-level 429 before message_start). Stream-mid errors propagate to caller; no auto-retry mid-stream. Tested via fixture in WB3. |
| **R-MBT34-4** | Race: rate-limit state captured at response-open, but consumer reads it later via `getRateLimitState()`. Stale data. | Include `capturedAt: string` (ISO timestamp) in RateLimitState. UI consumers (Terminal B's ring) decide staleness threshold. |
| **R-MBT34-5** | API key file might disappear between sessions (operator deletes it). `loadApiKey()` should fail gracefully. | Throw a typed `ApiKeyNotConfiguredError` (extends Error). Factory returns null + logs to main-process console. Existing `createAnthropicClient` env-var-null path is precedent. |
| **R-MBT34-6** | The coordination doc `t26-t27-coord.md` may need an MB-T34 entry if MB-T26's onUsage path changes shape. | Phase 1 MODELED only — MB-T26 sentinel zone in coarchitect-ipc.ts NOT read this session. Will read at WB2. If shape changes, append MB-T34 row to coord doc per prompt §3 WB-final. |
| **R-MBT34-7** | Live-API smoke test could fail if Anthropic API is down (network-hostile CI). | Gate live-smoke with `RUN_LIVE_API=1` (Q-MBT34-11=(a)). WB6 ships both fixture replay AND gated live; only fixture runs in default CI. |
| **R-MBT34-8** | Spike used `claude-haiku-4-5` (cheaper than `claude-sonnet-4-6`); chat-flow uses sonnet. Header shape is independent of model, but worth flagging. | [KNOWN] Headers are response-level not model-specific per spike + Anthropic API docs. WB6 live-smoke uses CHAT_MODEL (`claude-sonnet-4-6`) to confirm parity with chat flow. |
| **R-MBT34-9** | Worktree isolation: I cannot read Terminal B's MB-T25 in-progress branch. Their consumer surface for `RateLimitState` is unverified by me. | Surface RateLimitState shape early via this diagnose doc; Terminal B reads it post-merge. If shape needs adjustment, additive fields (no breaking changes). Operator coordinates via merge-order. |

---

## VI. WB ladder (proposed; depends on Q-MBT34-N dispositions)

Assuming Q-MBT34-1=(c), Q-MBT34-2=(b)+(c), Q-MBT34-3=(b), Q-MBT34-4=(a), Q-MBT34-6=(b), Q-MBT34-7=(a), Q-MBT34-8=(a), Q-MBT34-9=(c), Q-MBT34-11=(a):

- **WB1 — RED scaffold + spike result confirmed in committed form.** Author scaffold for `AnthropicAPIClient` class (low-level), refactor `AnthropicChatClient` to compose it. RED probe files for: stream-event parsing, retry logic, rate-limit backoff, header extraction, key-file loading. All probes RED (impl returns null/throws/incomplete). Add committed copy of spike script as `packages/dispatch-workstation/scripts/mb-t34-spike.cjs` (operator may want to re-run).
- **WB2 — GREEN stream-event parsing.** Implement core stream iterator with `withResponse()` capture; preserve `onUsage` callback contract (MB-T26 non-regression). Probe-01 + probe-02 turn green.
- **WB3 — GREEN retry + exponential backoff.** Implement outer retry wrapper for 429 + 5xx (pre-stream errors only per R-MBT34-3); fixture-based tests for retry-after header respect. Probe-03 + probe-04 turn green.
- **WB4 — GREEN rate-limit header extraction + accessor.** Implement `_lastRateLimitState` field, `getRateLimitState()` accessor, optional `onRateLimit?` callback. RateLimitState shape per Q-MBT34-6=(b). Probe-05 + probe-06 turn green.
- **WB5 — GREEN non-chat-flow caller surface + key-file loader.** Add `loadApiKey()` utility (file-first, env-var fallback per Q-MBT34-3=(b)). Add `createAnthropicAPIClient()` factory for non-chat-flow callers. Refactor `createAnthropicClient` (chat client factory) to compose. Probe-07 + probe-08 turn green.
- **WB6 — GREEN live-API smoke + integration test + findings doc + followups.** Gated live-API smoke (RUN_LIVE_API=1). Author `mb-t34-findings-2026-05-08.md`. Append v3.1 polish to `FOLLOWUPS.md`. Update `t26-t27-coord.md` if needed.

Total: **6 WBs** matching prompt §3 suggested split.

---

## VII. Frozen-territory verification

[KNOWN] Per prompt §5, files MB-T34 will touch (MUST stay in this set):
- `packages/dispatch-workstation/src/main/anthropic-client.ts` (refactor)
- `packages/dispatch-workstation/src/main/anthropic-api-client.ts` (NEW, if Q-MBT34-1=(c) acked)
- `packages/dispatch-workstation/src/main/api-key-loader.ts` (NEW, small utility for Q-MBT34-3=(b))
- `packages/dispatch-workstation/test/unit/anthropic*/` (NEW probe files)
- `packages/dispatch-workstation/test/fixtures/anthropic/` (NEW fixture JSON files)
- `packages/dispatch-workstation/scripts/mb-t34-spike.cjs` (NEW; committed copy of spike script)
- `docs/coordination/mb-t34-*.md` (this file + decisions + findings)
- `docs/FOLLOWUPS.md` (append at WB6)
- `docs/coordination/t26-t27-coord.md` (append MB-T34 row if onUsage path changes — per R-MBT34-6, MODELED unchanged for now)

[KNOWN] Files I will NOT touch:
- `packages/dispatch-core/src/v3/schema.ts` (frozen)
- `packages/dispatch-workstation/src/main/coarchitect-ipc.ts` (only IF Q-MBT34-10=(b) — i.e., signature additive — which preserves existing MB-T26 zone untouched). If signature changes are needed, surface to operator first.
- Any file authored by Terminals A/B/C (worktree isolation — structurally impossible, but if `git status` shows one, halt).

---

## VIII. Cross-session coordination notes

[KNOWN] **Terminal B (MB-T25) is depending on the WB1 spike result.** Spike outcome: **headers ARE exposed**. Terminal B should proceed with full ring widget impl. The data contract Terminal B consumes:
```ts
interface RateLimitBucket {
  readonly remaining: number;
  readonly limit: number;
  readonly reset: string;  // ISO-8601 UTC
}
interface RateLimitState {
  readonly requests: RateLimitBucket;
  readonly tokens: RateLimitBucket;
  readonly inputTokens: RateLimitBucket;
  readonly outputTokens: RateLimitBucket;
  readonly capturedAt: string;  // ISO-8601 UTC
}
```
Accessor: `AnthropicAPIClient.getRateLimitState(): RateLimitState | null` (null until first request completes). Push callback: optional `onRateLimit?(state: RateLimitState)` on streamMessage params.

[KNOWN] **MB-T26 is closed at 53a9fa3.** MB-T34 must not regress chat-flow `onUsage`. Will run MB-T26 cost-meter probes (probe-01 + probe-02) as regression at WB2+.

[KNOWN] **MB-T35 reasoning loop will consume `AnthropicAPIClient`.** Exported surface (post-WB5):
```ts
export class AnthropicAPIClient {
  constructor(client: Anthropic);
  async *streamMessage(params: StreamMessageParams, callbacks?: StreamCallbacks): AsyncIterable<RawMessageStreamEvent>;
  getRateLimitState(): RateLimitState | null;
}
export async function loadApiKey(): Promise<string | null>;
export function createAnthropicAPIClient(): AnthropicAPIClient | null;
```

[KNOWN] **No git fetch / checkout of other branches.** All cross-session coordination via this doc + operator merge.

---

## IX. Confidence summary

| Claim | Label | Source |
|---|---|---|
| @anthropic-ai/sdk@0.92.0 stream-create returns APIPromise<Stream<...>> | [KNOWN] | messages.d.ts:32, spike `result.sdkVersion` |
| `apiPromise.withResponse()` exposes raw `Response` with anthropic-ratelimit-* headers | [KNOWN] | api-promise.d.ts:39, spike `rateLimitHeaderCount=14` |
| Stream event sequence matches existing client.ts assumption | [KNOWN] | spike `streamEventTypes` |
| Cache-token fields present (zero) on first request | [KNOWN] | spike `cacheReadInputTokens=0` |
| No `retry-after` on 200-OK | [KNOWN] | spike (negative finding) |
| No `anthropic-priority-*` on this account tier | [KNOWN] | spike (negative finding); will not test priority-tier behavior |
| Standard `anthropic-ratelimit-*` IS the plan-usage data; no separate "Max plan" header set | [KNOWN] | spike header set + matches Anthropic Tier 1 docs |
| MB-T26 sentinel zone in coarchitect-ipc.ts unchanged-shape under Q-MBT34-2=(b)+(c) | [MODELED] | will read file at WB2 |
| Refactor `AnthropicChatClient` → compose `AnthropicAPIClient` is non-breaking for chat flow | [MODELED] | based on signature preservation; will verify by green tests at WB2 |
| Stream-mid 429 not auto-retried (requires re-emit + double-count avoidance) | [MODELED] | inferred from APIPromise + Stream contract; not exercised in spike |

---

## X. HALT 0 — surface awaiting operator ack

Phase 1 status: **spike complete, headers confirmed, diagnose authored**. Awaiting operator markup of decisions doc on Q-MBT34-1 through Q-MBT34-11 before WB1.

Cross-session signal: **Terminal B (MB-T25) — green light to proceed with full ring widget impl.** Headers are exposed. Data contract above.
