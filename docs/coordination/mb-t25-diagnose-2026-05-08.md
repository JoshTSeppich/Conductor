# MB-T25 Phase 1 Diagnose — Plan-Usage Ring Widget

**Date:** 2026-05-08
**Session:** Terminal B / mbt25-worktree (Round 4 4-session parallel-cairn run under per-session worktree isolation)
**Operator:** Joshua Seppich (josh@aetherx.io)
**Ticket:** MB-T25 — Plan-usage ring widget + reset-countdown (Anthropic API headers)
**Phase:** 1 (spike + diagnose; pre-WB1)
**HALT 0 status:** authored, not yet acked. **DUAL-CONDITIONAL gate** — needs (a) operator ack on Q-MBT25-1..6 dispositions AND (b) Terminal D's MB-T34 Phase 1 spike outcome (Outcome A vs B).

---

## I. Executive summary

MB-T25 ships a plan-usage ring widget (outer ring = % of plan used; inner dotted ring = time-until-reset, 5-hour cycle) that lands as the **leftmost slot** in the `chat-shell-header-bar` element established by Terminal C's MB-T26 (`09b38ce`). Slot ordering left-to-right: `[plan-usage MB-T25 — this] | [cost-meter MB-T26] | [model-mix MB-T27]` per `docs/coordination/t26-t27-coord.md:78-79`.

**Scope is contingent on Terminal D's MB-T34 Phase 1 spike result:**
- **Outcome A** (Anthropic Max plan emits `anthropic-ratelimit-*` headers under operator's plan tier + SDK 0.92.0 surfaces them to consumers): full scope — live ring widget, real-API integration test, color tinting, reset countdown. 5-WB ladder.
- **Outcome B** (headers not emitted by server under operator's plan tier): contracted scope — placeholder ring shell, ring-math + tinting unit tests, `MB-F-T25-PLAN-USAGE-HEADER-EXPOSURE-DEFERRED` (Tier 2) filed with closure path documented. 4-WB ladder. Outcome classification per CLAUDE.md §2.11: **"Capability enabled with known limitations."**

**Independent verification supplementing Terminal D's spike** ([KNOWN] from direct read of `@anthropic-ai/sdk@0.92.0` `.d.ts` files in main worktree's `node_modules/.pnpm/@anthropic-ai+sdk@0.92.0_zod@4.3.6/...`):
- `MessageStream.response: Response | null | undefined` ([KNOWN], `lib/MessageStream.d.ts:30`) — synchronous getter on stream object after `_connected` callback fires
- `MessageStream.withResponse(): Promise<{ data, response: Response, request_id }>` ([KNOWN], `lib/MessageStream.d.ts:42-46`) — Promise resolving with raw Web `Response` instance (case-insensitive `headers.get(name)` available)
- `APIPromise.asResponse()` and `APIPromise.withResponse()` ([KNOWN], `core/api-promise.d.ts:26,39-43`) — for non-streaming responses

**Therefore SDK exposure of `Response.headers` is [KNOWN] YES.** The Outcome-A-vs-B question collapses entirely to a runtime/server-side question: does the Anthropic API actually emit `anthropic-ratelimit-*` headers under operator's plan tier? **Terminal D's spike is the load-bearing evidence on that.** This Phase 1 diagnose treats SDK exposure as a closed sub-question and defers ONLY the runtime-emission question to D's spike outcome.

---

## II. Surface inventory ([KNOWN] from cover-to-cover reads)

### II.A — `chat-shell.tsx` ([KNOWN] from `packages/dispatch-workstation/src/chat-shell/chat-shell.tsx` 1-184)

- **Sentinel zones:** `MB-T22 header-bar extension point (MB-T26/MB-T27 territory)` zone wraps the reserved zone for additive header-bar slots. Inside it, MB-T26 zone (`a08b406` + `09b38ce` content) authors the `<div data-testid="chat-shell-header-bar">` element + `renderCostMeter?` slot. MB-T27 zone (`7fd7af8`) authors the sibling `renderModelMix?` slot inside the same header-bar div.
- **Slot prop pattern:** each ticket adds an additive `render<Name>?: () => ReactNode` field to `ChatShellProps` interface inside its own sentinel zone, destructures the same name in the function-component arg list, and renders it inside the `chat-shell-header-bar` div via `{renderName ? renderName() : null}`.
- **MB-T26 zone header comment** (lines 52-60 + 116-124) explicitly **authorizes the slot ordering** `[plan-usage MB-T25] | [cost-meter MB-T26] | [model-mix MB-T27]` and explicitly anticipates MB-T25 sibling-zone authorship: line 130 says *"[plan-usage MB-T25 future] | [cost-meter MB-T26] | [model-mix MB-T27]"*.
- **MB-T25 zone insertion location:** my sentinel zone lands **inside** the MB-T26 zone (between `=== BEGIN: MB-T26 cost-meter header-bar element + slot ===` line 125 and the existing `{renderCostMeter ? renderCostMeter() : null}` JSX on line 144), as the **first** slot rendered in the header-bar div. Mirrors MB-T27's pattern of nesting inside MB-T26's zone (MB-T27 is the second slot; mine is the first/leftmost). [MODELED] zone-nesting authorization per the same authorization comment that authorizes MB-T27's nested zone (line 130: explicit slot-ordering reservation includes MB-T25 by name).
- **Slot prop additive surface:** add `renderPlanUsageRing?: () => ReactNode` to `ChatShellProps` interface inside `=== BEGIN: MB-T25 plan-usage slot prop ===` zone (sibling/outer to MB-T26 + MB-T27 slot prop zones inside the MB-T22 header-bar extension point zone). Add the destructure inside `=== BEGIN: MB-T25 plan-usage slot destructure ===` zone in the function-component arg list. Render inside `=== BEGIN: MB-T25 plan-usage slot ===` zone in the JSX, **before** `{renderCostMeter ? renderCostMeter() : null}` on line 144.

### II.B — `mount.ts` ([KNOWN] from `packages/dispatch-workstation/src/chat-shell/mount.ts` 1-299)

- **Slot resolution pattern:** `resolveRenderCostMeter(opts)` (lines 213-221) is the [KNOWN] template:
  1. Explicit `opts.renderCostMeter` → use verbatim (test override path)
  2. `opts.bridge?.onCostUpdate` → build closure that wraps `<CostMeter bridge={{onCostUpdate}}/>`
  3. Neither → return undefined (chat-shell renders empty slot per fallback)
- **MB-T27's pattern** (lines 237-263) extends to peek `window.workstationBridge?.onSpawnResult` (path 2) — useful template if MB-T34 exposes a window-global instead of extending coarchitectBridge.
- **MountChatShellOptions interface:** add `readonly renderPlanUsageRing?: () => ReactNode` inside `=== BEGIN: MB-T25 plan-usage slot option ===` zone (sibling to MB-T26 + MB-T27 slot-option zones).
- **mountChatShell body:** add `const renderPlanUsageRing = resolveRenderPlanUsageRing(opts);` inside `=== BEGIN: MB-T25 plan-usage slot passthrough ===` zone (sibling to MB-T26 + MB-T27 passthrough zones), and extend `root.render(createElement(ChatShell, { tabs, renderCostMeter, renderModelMix, renderPlanUsageRing }))` line 282. **Same nested-inside-MB-T26-zone caveat as MB-T27** — MB-T26's slot-passthrough zone over-wraps `root.render`, so my passthrough lands nested inside it. Track at WB5 followups (mirroring MB-F-T27-WB1-MB-T26-ZONE-NEST Tier 3).
- **`resolveRenderPlanUsageRing(opts)` body:** branches on Outcome A vs B:
  - **Outcome A:** path 2 reads from a NEW bridge surface that Terminal D authors at MB-T34 WB-final. Two structural options for D's API surface (Q-MBT25-2):
    - (a) extend `coarchitectBridge.onPlanUsageUpdate(cb)` (mirrors MB-T26 `onCostUpdate`; D's WB3 adds the `coarchitect:plan-usage-update` IPC channel + `coarchitect:getPlanUsage` initial-fetch invoke; preload.mts gains 1 method)
    - (b) new `window.planUsageBridge` global (separate bridge, doesn't extend coarchitectBridge — same architectural choice as `commitsBridge` per `mount.ts:175-179`)
  - **Outcome B:** path 2 returns undefined (no live data); path 1 (explicit override) supports unit-test injection of mocked data.

### II.C — `preload.mts` ([KNOWN] from `packages/dispatch-workstation/src/main/preload.mts` 1-179)

- **MB-T26 cost-meter bridge** (lines 32-55) is the [KNOWN] template: `onCostUpdate(cb)` immediately invokes `coarchitect:getDailyCost` for initial value, subscribes to `coarchitect:cost-update` webContents.send broadcasts, returns cleanup-fn matching the `onStream*` / `onSpawnResult` / `onTileDetachClosed` pattern.
- **MB-T22 commits-bridge** (lines 162-179) is the [KNOWN] template for "additive surface that doesn't extend coarchitectBridge": separate `window.commitsBridge` global, single method `listCommits`. Architectural choice rationale documented in zone header (lines 170-174): "Commits view has its own bridge to keep concerns separate and to avoid extending the StreamingBridge contract surface that ChatPanel + chat-shell depend on."
- **MB-T25 zone insertion:** depending on Outcome A vs Q-MBT25-2 disposition (push-via-coarchitect vs separate bridge), preload.mts either gains 1 method on coarchitectBridge OR a new `contextBridge.exposeInMainWorld('planUsageBridge', { onPlanUsageUpdate })`. Outcome B does NOT touch preload.mts.

### II.D — `cost-meter.tsx` ([KNOWN] from `packages/dispatch-workstation/src/chat-shell/cost-meter.tsx` 1-71)

This is my **direct visual + structural template** for `plan-usage-ring.tsx`. Pattern:
- `interface CostMeterBridge` with `onCostUpdate(cb): () => void` cleanup-fn
- `interface CostMeterProps` with `bridge?: CostMeterBridge | null`
- `formatCost(totalUsd: number | null): string` pure helper for value-or-placeholder
- `useEffect` subscribes at mount, returns cleanup-fn from bridge to React for unmount
- `useState` holds latest value
- Inline `SLOT_STYLE` CSSProperties (no external CSS file)
- `data-testid` contract documented in file header
- File length: 71 lines including header comment

**My ring-widget translation:** `interface PlanUsageRingBridge` with `onPlanUsageUpdate(cb: (data: PlanUsageData) => void): () => void`; `PlanUsageRing(props)` component subscribes via useEffect, holds `PlanUsageData | null` in useState, renders SVG ring + countdown text. Ring math + tinting + countdown formatting in pure helpers at `ring-helpers.ts` (Q-MBT25-1=a "hand-rolled SVG").

### II.E — `coarchitect-ipc.ts` (out-of-scope read; Terminal D's MB-T34 territory)

Outcome A wires plan-usage capture into Terminal D's MB-T34 API client. Specifically: D extracts `anthropic-ratelimit-*` headers from `MessageStream.response` after `_connected` (or via `await stream.withResponse()`), pushes them into a per-session ledger or transient memory, and broadcasts `coarchitect:plan-usage-update` (or equivalent) via webContents.send. **My WB3 wires the renderer-side subscription against D's exported method shape, which is TBD until D's WB-final.** I do NOT pre-design against speculation; my Q-MBT25-2 disposition surfaces both options (a-coarchitectBridge-extension vs b-separate-bridge) for operator arbitration AT D's WB-final, after D's surface is concrete.

### II.F — `MB-T26 findings doc` ([KNOWN] from `docs/coordination/mb-t26-findings-2026-05-07.md` cover-to-cover)

Direct relevance:
- §III table row "Header-bar visual placement" confirms slot ordering reservation includes MB-T25
- §V incident table — methodology evidence already documented (4 distinct shared-tree failure modes); per-session worktree isolation eliminates all 4 in this Round 4 run
- §VIII methodology incidents — same incidents not relevant to MB-T25 under worktree isolation
- §VI Q-MBT26-5=d push-based design — direct precedent for my Q-MBT25-2 disposition recommendation (push-based via D's exported method, mirrors MB-T26 onCostUpdate pattern)

### II.G — `t26-t27-coord.md` ([KNOWN] from `docs/coordination/t26-t27-coord.md`)

- Line 66 reserves `chat-shell-plan-usage-slot` for MB-T25 with note "TBD | reserved here for forward compatibility"
- Lines 78-79 document the slot ordering visually
- This Phase 1 diagnose **does not amend** t26-t27-coord.md — that doc closed at MB-T27 WB3. A separate `docs/coordination/t25-t34-coord.md` would be appropriate IF cross-session amendment is needed; my read of D's MB-T34 prompt (read-only via §0 verification of D's prompt path) is out-of-scope for this Phase 1.

### II.H — `@anthropic-ai/sdk@0.92.0` `.d.ts` ([KNOWN] from main-worktree pnpm-store install)

- `lib/MessageStream.d.ts:30` `get response(): Response | null | undefined` — synchronous getter
- `lib/MessageStream.d.ts:42-46` `withResponse(): Promise<{ data, response: Response, request_id }>`
- `core/api-promise.d.ts:26` `asResponse(): Promise<Response>`
- `core/api-promise.d.ts:39-43` `withResponse(): Promise<{ data, response: Response, request_id }>`
- `core/error.d.ts:46` `RateLimitError extends APIError<429, Headers>` — confirms Headers type usage
- **No `.d.ts` field directly typing `anthropic-ratelimit-*`.** Headers are accessed via `Response.headers.get(name)` — string-keyed, runtime concern. SDK type system does not enumerate Anthropic's specific header names; this is normal Web Fetch API design.

**Implication:** SDK 0.92.0 does NOT block Outcome A. The blocker (if any) is server-side. Terminal D's spike answers definitively.

### II.I — Existing `anthropic-client.ts` (146 lines, [KNOWN] from grep) does not currently access response headers

`grep -n "withResponse\|asResponse\|\.response\b\|headers"` returned zero hits in `packages/dispatch-workstation/src/main/anthropic-client.ts`. Terminal D's MB-T34 work will add header capture. My ring widget consumes whatever D exports.

---

## III. Q-MBT25-1..6 with tentative dispositions

### Q-MBT25-1 — Ring SVG library: hand-rolled, recharts, d3-arc, or other?

**Tentative disposition: (a) hand-rolled SVG.**

Rationale: ring math is one trig function (`(percentage, radius, strokeWidth) → SVG path string` for an arc) and one CSS-class-or-fill mapping (tinting at thresholds). MB-T26 cost-meter (71 lines total, no chart library) is the established precedent. Adding `recharts` (~80kB minified+gzip) or `d3-arc` (~10kB) bloats the chat-shell renderer bundle for a one-component use. Hand-rolled is testable as a pure function (`ring-helpers.ts` `arcPath(percentage, radius, strokeWidth) → string`) with 100% line coverage.

Risk if disposed (b)/(c)/other: bundle bloat + dependency-drift surface area + harder to unit-test (chart library mocking).

[MODELED] confidence — disposition based on MB-T26 precedent + hand-rolled SVG pattern's simplicity. Surface to operator for explicit ack.

### Q-MBT25-2 — Ring widget data subscription: `bridge.onPlanUsageUpdate` (push-based, mirrors MB-T26) OR `ipcMain.handle` + polling?

**Tentative disposition: (a) push-based via `bridge.onPlanUsageUpdate`, mirrors MB-T26 `onCostUpdate` pattern.**

Rationale:
- MB-T26 Q-MBT26-5 was originally `=c` (polling) and operator re-disposed `=d` (push-based) mid-WB3 after the polling option's surface infeasibility surfaced (`MB-F-T26-Q-DISPOSITION-INFEASIBILITY-ROUND-2`). Same architectural lesson applies pre-emptively here.
- Push-based fires within 5s of API response trivially (acceptance: "Ring updates within 5s of API response containing new headers") — server emits headers, D's API client extracts on each response, broadcasts to all webContents. No polling cadence to tune.
- Push-based aligns with the established `onStream*` / `onSpawnResult` / `onTileDetachClosed` / `onCostUpdate` pattern in preload.mts.

**Sub-question Q-MBT25-2a — surface location:** (a) extend `coarchitectBridge.onPlanUsageUpdate(cb)` (mirrors `onCostUpdate`) OR (b) new `window.planUsageBridge` global (mirrors `commitsBridge` separation).

**Tentative sub-disposition: (a) extend coarchitectBridge.** Plan-usage is per-session conductor traffic — domain-aligned with the existing coarchitectBridge (chat domain). MB-T22 commits-bridge separation rationale was distinct ("Commits view has its own bridge to keep concerns separate"); plan-usage tracks the same Conductor API session that already extends coarchitectBridge for `onCostUpdate`. **Bridge surface is owned by Terminal D's MB-T34 WB-final.** This Phase 1 surfaces both options for operator-D coordination.

[MODELED] confidence — operator arbitrates final shape post-D-WB-final.

### Q-MBT25-3 — Header-bar slot ordering relative to cost-meter + Auto/Ask toggle (Terminal A's MB-T24)?

**Tentative disposition: per established slot-ordering reservation, MB-T25 is leftmost.**

`docs/coordination/t26-t27-coord.md:78-79` documents the order:
```
[ plan-usage ring ]   [ cost-meter ]   [ model-mix ]
   MB-T25 (this)        MB-T26          MB-T27
```

`chat-shell.tsx:130` confirms within the file. Terminal A's MB-T24 Auto/Ask toggle is a NEW slot whose position is operator-arbitrated at A's Phase 1 (Q-MBT24-4 per Round 4 prompt §5). Surface options:
- (i) MB-T24 toggle inserted **before** MB-T25 (leftmost; new ordering: `[Auto/Ask] | [plan-usage] | [cost-meter] | [model-mix]`)
- (ii) MB-T24 toggle inserted **between** MB-T25 and MB-T26 (`[plan-usage] | [Auto/Ask] | [cost-meter] | [model-mix]`)
- (iii) MB-T24 toggle inserted **after** MB-T27 (rightmost; `[plan-usage] | [cost-meter] | [model-mix] | [Auto/Ask]`)
- (iv) MB-T24 toggle inserted **between** MB-T26 and MB-T27 (`[plan-usage] | [cost-meter] | [Auto/Ask] | [model-mix]`)

**My disposition recommendation:** (iii) rightmost — Auto/Ask toggle is a session-control affordance, conceptually distinct from the three observability widgets (plan-usage, cost-meter, model-mix). Visual grouping favors observability-on-left, control-on-right. **Operator arbitrates at A's Phase 1, not mine.** My MB-T25 work is robust to all four orderings — my slot is leftmost regardless of where A lands.

[MODELED] confidence — recommendation only; operator decides.

### Q-MBT25-4 — Placeholder behavior on first load (before any API call observed)?

**Tentative disposition: (a) show empty rings + `—` text in the countdown position.**

Rationale: MB-T26 precedent — `formatCost(null) → '—'` (em-dash). Operators who restart workstation see briefly-empty cost meter before initial-fetch resolves; MB-F-T26-COST-METER-INITIAL-MOUNT-EMPTY-STATE (Tier 3) tracks closure as v3.1 polish. Same UX precedent applies here.

Alternative (b): show 0% rings + "0h 00m" text. Misleads — implies known-zero usage when actually unknown.
Alternative (c): hide ring entirely until first data arrives. Visual instability — header-bar reflows when ring appears, distracting.

[MODELED] confidence — disposition based on MB-T26 precedent.

### Q-MBT25-5 — 5-hour reset cycle: how to compute "time until reset" from headers?

**Tentative disposition (depends on D's spike, but [MODELED] from public Anthropic API behavior):** Anthropic API headers expose reset-timestamp via `anthropic-ratelimit-tokens-reset` (ISO 8601 string). Time-until-reset is computed renderer-side as `Math.max(0, new Date(resetIso).getTime() - Date.now())` ms. Format as `Hh MMm` per acceptance.

**Open dependency:** the exact header field name (`anthropic-ratelimit-tokens-reset` vs `anthropic-ratelimit-requests-reset` vs both) is confirmed by Terminal D's spike. The [MODELED] field name above is from operator's knowledge cutoff Jan 2026 + Anthropic's public docs as known at that time. **Real header field shape becomes [KNOWN] only after D's spike commits.**

Pure-fn signature in `ring-helpers.ts`:
```typescript
export function formatResetCountdown(resetIsoOrEpochMs: string | number, nowMs: number): string;
// Returns "Hh MMm" e.g. "4h 23m"; clamps to "0h 00m" when reset is in the past.
```

[MODELED] confidence on field name; [KNOWN] on format-fn shape.

### Q-MBT25-6 — Contingency: if Outcome B (headers not exposed), confirm followup-only-shell scope or alternative (raw-fetch-alongside-SDK)?

**Tentative disposition: (a) followup-only-shell scope — file `MB-F-T25-PLAN-USAGE-HEADER-EXPOSURE-DEFERRED` (Tier 2) with closure path documented.**

Rationale: raw-fetch-alongside-SDK doubles the API request count per Conductor call (one via SDK, one via raw fetch to read headers) — operationally and economically wasteful. Closure path: SDK upgrade OR Anthropic feature request OR plan-tier upgrade detected at runtime (auto-enable when headers start arriving). Followup body documents all three and lets operator pick at v3.1.

Alternative: would also entertain (b) raw-fetch-alongside-SDK ONLY if operator has strong v3.0 acceptance on live ring rendering. Surface as alternative for operator awareness; recommend (a) for v3.0 ship.

[MODELED] confidence — recommendation pending operator ack.

---

## IV. R-MBT25-1..N risks

### R-MBT25-1 — Cross-session sentinel-zone authorship in `chat-shell.tsx` + `mount.ts` between MB-T25 + MB-T24 (Terminal A)

Both Terminal A (MB-T24 Auto/Ask toggle) and Terminal B (this — MB-T25 plan-usage ring) add header-bar slot props to `chat-shell.tsx` and `mount.ts` MountChatShellOptions interface in parallel. Under per-session worktree isolation (Round 4 §3.12 pivot), both sessions' edits are isolated to their own worktrees; the merge-time integration is operator-side.

**Risk surface:** when operator merges both branches into main, sentinel-zone interleaving order in `chat-shell.tsx` JSX (left-to-right rendering order of slots) is sensitive to which branch lands first. Q-MBT25-3 disposition (i)/(ii)/(iii)/(iv) determines the resolution. Per Q-MBT25-3=iii recommendation, MB-T24 lands rightmost, leaving my MB-T25 zone uncontested as leftmost.

**Mitigation:** (a) my Phase 1 surfaces Q-MBT25-3 explicitly so operator confirms ordering before either branch's WB1; (b) my MB-T25 sentinel-zone authorship targets the SAME nested-inside-MB-T26-zone pattern as MB-T27, leaving plenty of structural room for Terminal A's toggle slot in any of the four ordering options.

[MODELED] confidence — risk mitigated by per-session worktree isolation.

### R-MBT25-2 — Terminal D's MB-T34 WB-final API-client export shape unknown at my Phase 1

D's `onPlanUsageUpdate(cb)` (or equivalent name) shape is TBD until D's WB-final. My WB3 wires against D's exported method.

**Risk:** D's final shape diverges from my [MODELED] expectation (Q-MBT25-2=a) — D ships a separate `planUsageBridge` global, OR a Promise-returning `getPlanUsage()`-style method, OR a stream-event subscription on the existing `onStreamChunk`-family pattern.

**Mitigation:** (a) Q-MBT25-2 disposition surfaces both shape options for operator-D coordination; (b) my `PlanUsageRingBridge` interface in `plan-usage-ring.tsx` is defined narrowly against my consumption pattern — adapter-fn in `mount.ts` `resolveRenderPlanUsageRing` translates D's actual shape to my interface; (c) WB3 GREEN test injects a mock bridge per the explicit-renderPlanUsageRing test-override path, so the renderer is fully testable independent of D's final shape.

[MODELED] confidence — adapter pattern + explicit test-override path are robust to D's choice.

### R-MBT25-3 — Outcome B materializes mid-WB-ladder (after WB1 RED scaffold authored against Outcome A)

If operator confirms Outcome A at HALT 0 but D's live-API smoke at WB-final reveals headers actually NOT emitted under operator's plan tier, mid-ladder pivot to Outcome B is needed.

**Mitigation:** (a) HALT 0 dual-conditional gate explicitly waits for D's spike outcome BEFORE WB1 — pivots are operator-arbitrated at HALT 0, not mid-WB; (b) if D's spike confidence is [MODELED] not [KNOWN] (e.g., header inspection without live-API smoke), I surface this as a sub-question to operator at HALT 0 for explicit risk acceptance; (c) Outcome A WB-ladder includes WB4 "Live integration test + smoke" which IS the [KNOWN] live-API verification — failure at WB4 triggers operator-arbitrated rollback to Outcome B.

[MODELED] confidence — gate discipline + WB4 smoke catch this.

### R-MBT25-4 — `anthropic-ratelimit-*` header field names drift between operator's knowledge cutoff and ship

[MODELED] field names from Jan 2026 cutoff (`anthropic-ratelimit-tokens-reset`, `anthropic-ratelimit-tokens-remaining`, `anthropic-ratelimit-tokens-limit`) may not match what Anthropic's API actually emits today.

**Mitigation:** (a) Terminal D's spike reads the actual headers via `console.log(Object.fromEntries(stream.response.headers.entries()))` in WB1 — converts [MODELED] field names to [KNOWN] from runtime; (b) ring-helpers.ts `formatResetCountdown(reset, now)` and `computePercentageUsed(used, limit)` are signed against neutral arg shapes (number or ISO-string), insensitive to header-name spelling. Header-name → arg translation lives in D's API client, not in my pure helpers; (c) WB4 live-API smoke verifies end-to-end against today's actual server emissions.

[MODELED] confidence — field-name agnosticism in pure helpers + D's spike provides ground truth.

### R-MBT25-5 — DST midnight + 5-hour reset cycle interaction

If a 5-hour reset cycle straddles a DST transition (rare; twice yearly at most), the "hours until reset" computation in `formatResetCountdown` may show 4h or 6h instead of 5h depending on direction. Acceptable for v3.0 — same DST limitation as MB-T26 cost-ledger date-key (R-MBT26-6 ACCEPTED).

**Mitigation:** documented limitation in findings doc. v3.1 polish if operator finds annoying.

[MODELED] confidence — acceptable per MB-T26 precedent.

### R-MBT25-6 — Existing `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` (Tier 2)

CLAUDE.md §4.5 documents this pre-existing failure. WB13 final verification per §4.5 cites as expected pre-existing failure; do NOT re-diagnose per WB.

[KNOWN] — managed per §4.5.

---

## V. Confidence-label inventory

Per CLAUDE.md §2.2, every factual claim carries a confidence label. Phase 1 diagnose summary:

- **[KNOWN]:** SDK 0.92.0 type-shape (.d.ts read); chat-shell.tsx + mount.ts + preload.mts + cost-meter.tsx surface inventories (file reads); MB-T26 findings doc content (file read); FOLLOWUPS.md current state (file read); slot-ordering reservation in chat-shell.tsx + t26-t27-coord.md (file reads); worktree isolation infrastructure (`git worktree list` verified at session start).
- **[MODELED]:** Q-MBT25-1..6 tentative dispositions (rationale-based, awaiting operator ack); Anthropic API server-side header emission under operator's plan tier (awaiting D's spike); `anthropic-ratelimit-*` field name spelling (Jan 2026 cutoff knowledge); 4-vs-5-WB ladder count (depends on Outcome A vs B).
- **[SPECULATIVE]:** none in this Phase 1. All claims are either evidence-based or explicitly modeled with rationale.

---

## VI. Phase 1 → WB1 transition gate

**HALT 0 dual-conditional gate** per Round 4 prompt §4:

1. **Operator ack on Q-MBT25-1..6 dispositions** (or counter-dispositions). Specifically:
   - Q-MBT25-1: hand-rolled SVG (recommended) — confirm or dispose otherwise
   - Q-MBT25-2: push-based via `onPlanUsageUpdate` mirroring MB-T26 (recommended); sub-Q-MBT25-2a coarchitectBridge-extension (recommended) vs separate `planUsageBridge` — confirm or dispose otherwise
   - Q-MBT25-3: MB-T24 toggle slot ordering — operator arbitrates at A's Phase 1, NOT here; my Phase 1 just surfaces options; my slot is leftmost regardless
   - Q-MBT25-4: empty-ring + `—` countdown placeholder (recommended) — confirm or dispose otherwise
   - Q-MBT25-5: header field-name shape — [MODELED] until D's spike; confirm acceptable [MODELED] for Phase 1 transition
   - Q-MBT25-6: followup-only-shell for Outcome B (recommended) vs raw-fetch-alongside-SDK alternative — confirm or dispose otherwise

2. **Operator confirmation of Terminal D's MB-T34 Phase 1 spike outcome:**
   - Outcome A — `anthropic-ratelimit-*` headers emitted by Anthropic API under operator's plan tier; SDK 0.92.0 surfaces via `MessageStream.response.headers.get(name)`. **MY 5-WB ladder.**
   - Outcome B — headers NOT emitted under operator's plan tier (or emitted but stripped by SDK transport). **MY 4-WB ladder; followup-only-shell scope.**

**Both must arrive before WB1.** §3.7 strict halt discipline applies: nothing happens during HALT 0 — no preliminary `plan-usage-ring.tsx` design, no SDK doc prefetching beyond the .d.ts read this Phase 1 already authored, no early sentinel-zone authoring. If wait is productively wasteful, surface to operator with what work would be useful + risks doing/not-doing it.

---

## VII. References

### Phase 1 source reads
- `packages/dispatch-workstation/src/chat-shell/chat-shell.tsx` (1-184)
- `packages/dispatch-workstation/src/chat-shell/mount.ts` (1-299)
- `packages/dispatch-workstation/src/chat-shell/cost-meter.tsx` (1-71) — visual + structural template
- `packages/dispatch-workstation/src/main/preload.mts` (1-179)
- `packages/dispatch-workstation/src/main/anthropic-client.ts` (146 lines, grep-checked for header access)
- `docs/coordination/mb-t26-findings-2026-05-07.md` (cover-to-cover)
- `docs/coordination/t26-t27-coord.md` (lines 66 + 78-79)
- `docs/FOLLOWUPS.md` (relevant rows: 128 MB-T20 PARTIAL-SUPERSEDE, 209-220 MB-T26/T27 family)

### SDK type contract reads (main worktree pnpm-store install)
- `node_modules/.pnpm/@anthropic-ai+sdk@0.92.0_zod@4.3.6/node_modules/@anthropic-ai/sdk/lib/MessageStream.d.ts` (lines 22-46)
- `node_modules/.pnpm/@anthropic-ai+sdk@0.92.0_zod@4.3.6/node_modules/@anthropic-ai/sdk/core/api-promise.d.ts` (lines 8-48)
- `node_modules/.pnpm/@anthropic-ai+sdk@0.92.0_zod@4.3.6/node_modules/@anthropic-ai/sdk/core/error.d.ts:46`
- `node_modules/.pnpm/@anthropic-ai+sdk@0.92.0_zod@4.3.6/node_modules/@anthropic-ai/sdk/resources/messages/messages.d.ts:636-748` (Usage type — for cost capture; not directly relevant to header capture)

### CLAUDE.md sections governing
- §2.1 (anti-fabrication), §2.2 (confidence labels), §2.3 (Cairn commit grammar), §2.4 (self-check Q1-Q9), §2.5 (halt discipline), §2.7 (per-path git add), §2.10 (frozen contracts), §2.11 (outcome classifications), §2.12 (followups over absorption), §3.3 (sentinel-marked regions), §3.6 (test file layout), §4.1 (WB ladder pattern), §4.2 (HALT gates), §4.4 (verification ordering), §4.5 (pre-existing failures), §4.6 (runtime-launch smoke), §7 (communication style), §8/§9 (always/never).

### Round 4 prompt scope governance
- `~/Downloads/round-4-prompts/round-4-prompt-mbt25.md` §0-§9 (worktree state, upstream dependency, cairn methodology, ticket scope, WB ladder, cross-session coordination, frozen-territory verification).

---

**Phase 1 closed at this commit.** Awaiting HALT 0 dual-conditional ack: (1) operator on Q-MBT25-1..6 dispositions + (2) operator confirmation of MB-T34 Phase 1 spike outcome (Outcome A vs B). No further reads, no preliminary authoring, no sentinel-zone work until both gates arrive.
