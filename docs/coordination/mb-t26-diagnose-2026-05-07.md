# MB-T26 Phase 1 Diagnose — Cost Meter (Conductor API spend)

**Session:** Terminal C (parallel-cairn 4-session run)
**Date:** 2026-05-07
**Pre-diagnose HEAD:** `934c0a8`
**Working tree:** clean
**Parallel-cairn context:** Terminal A (MB-T21 Chat tab), Terminal B (MB-T22 Commits tab), Terminal D (MB-T27 model mix)

---

## I. Ticket scope (operator-given)

MB-T26 — Cost meter for Conductor's own /v1/messages spend (separate from
spawned CC plan usage). Reads usage from /v1/messages response usage field
(input/output tokens), multiplies by published rates per model, displays
today's running total. Out of scope: historical charts, per-feature
breakdown, budget alerts beyond visual. Acceptance: cost updates on each
conductor API call; reset at midnight local; per-model rate table
operator-editable in profile; unit tests for cost calc.

---

## II. Surface inventory — files in path of work

| File | Role | Currently |
|---|---|---|
| `packages/dispatch-workstation/src/chat-shell/chat-shell.tsx` | Family-B tab-host shell | [KNOWN] 41 LOC; `chat-shell-root` → `chat-shell-tab-strip` (tablist) + `chat-shell-tab-content` (tabpanel). NO header-bar element exists. Single hard-coded Chat tab (aria-selected="true"). |
| `packages/dispatch-workstation/src/chat-shell/mount.ts` | Mount adapter | [KNOWN] 99 LOC; `mountChatShell({rootElementId, bridge, renderChatTab})`. Bridge is `CoarchitectBridge extends StreamingBridge`. Auto-mount block gates on `window.coarchitectBridge`. |
| `packages/dispatch-workstation/src/main/anthropic-client.ts` | Anthropic SDK wrapper | [KNOWN] 99 LOC; `streamMessages` returns `AsyncIterable<string>` — yields ONLY text deltas (`content_block_delta.text_delta`). Usage events (`message_start`, `message_delta` with usage) are silently discarded. `CHAT_MODEL = 'claude-sonnet-4-6'` hardcoded. `MAX_TOKENS = 4096`. |
| `packages/dispatch-workstation/src/main/coarchitect-ipc.ts` | Streaming IPC handler | [KNOWN] handles `coarchitect:sendAndStream` → calls `chatClient.streamMessages(...)` → forwards chunks via `coarchitect:streamChunk`. Mock path bypasses real API. |
| `packages/dispatch-workstation/src/main/preload.mts` | contextBridge surface | [KNOWN] frozen-feel territory (UNCHANGED across MB-T20). Adding cost-bridge methods here likely needs operator confirmation. |
| `packages/dispatch-workstation/src/main/main.ts` | Electron main entry | [KNOWN] sentinel-zoned per CLAUDE.md §3.3. New MB-T26 zone needed if main.ts touches required. |
| `packages/dispatch-workstation/src/main/workstation-shell.html` | Shell HTML | [KNOWN] line 251-253: `#chat-region` is `<div style="height:280px"><div id="root"></div></div>`. The page-level `#header-bar` (line 229) is the workstation top bar (Spawn button) — NOT the chat-shell header. |

**Frozen-contract territory (NEVER touched):**
v3 schema, `CONDUCTOR_API_CONTRACT.md`, `WORKSTATION_CONTRACT.md`,
`REGISTRY.md`, `CONDUCTOR_V3_RESCOPE.md`, `coarchitect/chat-panel.tsx`
(Q-MBT20-3 wrap discipline), `preload.mts` (Q-MBT20-5).

---

## III. Q-MBT26-N — operator questions with proposed dispositions

### Q-MBT26-1 — chat-shell header bar shape (CRITICAL — must resolve before WB1)

The ticket prompt says "between plan-usage ring slot and model mix slot per wireframe." This implies a **header bar above the tab-strip with named slots**.

But the existing followup `MB-F-T20-FAMILY-B-ADDITIONAL-TABS` (Tier 2, in `docs/FOLLOWUPS.md` line 128) explicitly says: *"MB-T22 (Commits tab), MB-T23 (Tasks tab), **MB-T24..T27 (toggles + meters) add additional tabs**."*

These are **inconsistent interpretations** of T24-T27.

**Options:**
- **(a) Header-bar slot model** — Add NEW `chat-shell-header-bar` element above the tab-strip. Cost-meter is a render-prop slot (`renderCostMeter`) plumbed top-down via `ChatShellProps`. Plan-usage ring slot (MB-T25) and model-mix slot (MB-T27 — Terminal D) are sibling slots. Mirrors the tile-grid `renderPickerSlot` / `renderAutopilotSlot` / `renderFooterSlot` pattern (MB-T16/T17/T18). **Supersedes the "additional tabs" interpretation in MB-F-T20-FAMILY-B-ADDITIONAL-TABS — that followup needs amendment if (a) confirmed.**
- **(b) Tab model** — Cost meter is its own tab in the tab-strip, requires multi-tab state machine landing first as a Family-B prerequisite. Inconsistent with "between … slot and … slot" wording in the ticket prompt.
- **(c) Inline-in-tab-strip model** — Cost meter is a chip rendered inside the tab-strip on the right side, no separate header bar. Compromise: no new container, but no clean slot precedent either.

**Recommend (a)** — matches the operator-given ticket-prompt language ("slot"), aligns with the established render-prop slot precedent (MB-T16/T17/T18), and gives Terminal D (MB-T27) a clean independent slot to land model-mix without re-touching the same element.

### Q-MBT26-2 — per-model rate table location

Ticket acceptance: "per-model rate table operator-editable in profile."

**Options:**
- **(a) Hardcoded constants for v3.0 + TODO followup linking to MB-T33** — `cost-calc.ts` defines `MODEL_RATES: Record<string, {input_per_mtok, output_per_mtok}>` const map. Initial entries: `claude-sonnet-4-6` (Conductor's current model per `anthropic-client.ts:7`). Followup `MB-F-T26-RATE-TABLE-PROFILE-MIGRATION` filed for MB-T33 profile system to consume.
- **(b) Defer cost meter entirely until MB-T33 ships profile system.** Punts the ticket.

**Recommend (a)** — consistent with operator's ticket-prompt note ("hardcoded constants for v3.0 (recommend hardcoded with TODO followup)"). v3.0 ships with one model anyway (`CHAT_MODEL = 'claude-sonnet-4-6'`), so a one-entry rate map is honest minimum.

### Q-MBT26-3 — usage capture site

`AnthropicChatClient.streamMessages` (lines 34-54 of `anthropic-client.ts`) returns `AsyncIterable<string>` — yielding only text deltas. The Anthropic SDK stream emits `message_start` (with `usage.input_tokens`) and `message_delta` (with `usage.output_tokens`) events that the current iterable silently discards.

**Options:**
- **(a) Refactor streamMessages public API** — change return type to also expose usage (e.g. yield `{type: 'text'|'usage', ...}` discriminated union). Touches consumer at coarchitect-ipc.ts:218.
- **(b) Side-channel via `MessageStream` listener** — instead of `messages.create({stream:true})` returning the raw iterable, use the SDK's `messages.stream()` API which returns a `MessageStream` with event emitters (`.on('message')` after final). Capture usage off the side; existing string-iterable consumers unchanged. Requires a small refactor inside AnthropicChatClient but keeps public API.
- **(c) Capture usage in coarchitect-ipc.ts after iteration** — pass a `onUsage(usage)` callback into streamMessages; AnthropicChatClient invokes it from inside the for-await loop when a `message_delta` event is observed.

**Recommend (c)** — least invasive; AnthropicChatClient signature gains one optional callback param; coarchitect-ipc.ts wires the callback to a cost-ledger writer in main-process. Mock path can simulate the callback for tests.

### Q-MBT26-4 — cost ledger storage

Ticket says "displays today's running total" + "reset at midnight local time." Mid-day persistence required (survive app restart); cross-day persistence NOT required (midnight reset).

**Options:**
- **(a) Date-keyed JSON ledger in userData** — `<userData>/conductor-cost-ledger.json` keyed by `YYYY-MM-DD` (local TZ). Each conductor API call appends `{timestamp, model, input_tokens, output_tokens, cost_usd}` under today's key. Today's total = sum of today's entries. Mirrors `splitter-state.ts` raw-fs pattern per CLAUDE.md §3.5. No long-lived timer required; midnight reset is a function of which date-key the next call writes under.
- **(b) In-memory only** — simpler; lost on restart. Operator sees today's total reset to $0 every time the app restarts mid-day. Not ideal.
- **(c) Daemon-side endpoint + SQLite** — multi-process safe but adds daemon territory + SQLite migration; over-scoped for cost-meter scope per ticket prompt.

**Recommend (a)** — date-keyed ledger is robust, restart-safe, mirrors established workstation persistence pattern, and naturally implements the midnight-reset acceptance criterion without a timer.

### Q-MBT26-5 — bridge channel for cost data

Cost meter renderer needs today's total. Cost data is captured main-process side.

**Options:**
- **(a) Extend `coarchitectBridge` with `getDailyCost()` + `onCostUpdate(callback)`** — symmetric with existing chat IPC pattern (`fetchHistory` + `onStreamChunk`). Requires preload.mts edit (frozen-feel territory).
- **(b) New `costMeterBridge`** — separate contextBridge entry. Still requires preload.mts edit.
- **(c) Polling via existing `coarchitect:` IPC** — renderer polls a new `coarchitect:getDailyCost` request handler every N seconds; no new bridge surface. preload.mts UNCHANGED.

**Recommend (c)** — preserves preload.mts's MB-T20 invariant ("preload.mts UNCHANGED"); polling cadence (e.g. 2s) is acceptable for a cost meter (not real-time critical). If push-based update later wanted, file followup. **Sub-question Q-MBT26-5b: if (c), what poll interval?** Recommend 2000ms (matches typical UI refresh cadence; operator can amend).

### Q-MBT26-6 — cross-session coordination with Terminal D (MB-T27 model mix)

Both T26 and T27 land slots in the chat-shell header-bar (assuming Q-MBT26-1=a). chat-shell.tsx is shared.

**Options:**
- **(a) Sequence: Terminal C goes first** — Terminal C lands `chat-shell-header-bar` element + cost-meter slot prop. Terminal D adds model-mix slot prop to the existing element. Cross-session note filed at `docs/coordination/t26-t27-coord.md` listing the slot-prop names + ordering invariant.
- **(b) Sequence: Terminal D goes first** — symmetric mirror; same outcome.
- **(c) Each session adds independent slot via stable contract** — both sessions edit chat-shell.tsx in parallel, relying on per-path git add + rebase discipline. Higher conflict risk.

**Recommend (a)** — Terminal C (this session) goes first since the methodology guidance says "If you and Terminal D both need to touch chat-shell.tsx, coordinate via cross-session note OR sequence one after the other." Will file `docs/coordination/t26-t27-coord.md` at WB1 documenting the slot-prop names so Terminal D can land their slot without re-reading my entire diff.

### Q-MBT26-7 — midnight reset implementation

**Options:**
- **(a) Date-key based** — derived from Q-MBT26-4=a. Today's date-key = `new Date().toLocaleDateString('en-CA')` (yields YYYY-MM-DD in local TZ). At midnight, the next call's date-key changes; today's total naturally resets.
- **(b) Timer-based** — schedule a `setTimeout` for next midnight; on fire, zero out and re-schedule. Doesn't survive app restart cleanly.

**Recommend (a)** — falls out of (Q-MBT26-4=a) for free.

### Q-MBT26-8 — WB ladder shape

Ticket prompt says "Realistic ladder: 3-4 WBs."

**Options:**
- **(a) 3 WBs**: WB1 red (cost-calc unit + slot render tests) → WB2 green (cost-calc impl + bridge wiring + chat-shell-header-bar element + slot integration) → WB3 docs.
- **(b) 4 WBs**: WB1 red (cost-calc unit tests) → WB2 green (cost-calc impl + ledger) → WB3 green (chat-shell-header-bar element + cost-meter slot integration + bridge wiring) → WB4 docs.

**Recommend (b)** — separates pure-fn cost-calc (unit-testable in isolation) from the renderer/IPC integration. Cleaner red/green cycles; easier operator review per WB.

### Q-MBT26-9 — does this ticket modify MB-F-T20-FAMILY-B-ADDITIONAL-TABS?

If Q-MBT26-1=a (header-bar slot model), then `MB-F-T20-FAMILY-B-ADDITIONAL-TABS` (line 128 of FOLLOWUPS.md) is **partially incorrect** — its claim that "MB-T24..T27 (toggles + meters) add additional tabs" needs amendment to "MB-T24..T27 add header-bar slots; multi-tab state machine remains a separate Family-B item only if MB-T22/T23 land as tabs."

**Options:**
- **(a) Amend the followup body at WB4 (docs commit)** — note partial-supersede + the new interpretation.
- **(b) File a new followup `MB-F-T26-FAMILY-B-FOLLOWUP-AMEND` referencing the supersede.** Cleaner audit trail.
- **(c) No action; operator decides at MB-T22 whether tabs vs slots applies.**

**Recommend (a)** — minimal new entries; surface the disambiguation in the docs commit alongside the WB ladder findings.

---

## IV. R-MBT26-N — risks identified

| ID | Risk | Mitigation |
|---|---|---|
| R-MBT26-1 | chat-shell.tsx shared with Terminal D (MB-T27) | Sequence Terminal C first per Q-MBT26-6=a; cross-session coord doc at WB1 |
| R-MBT26-2 | preload.mts is frozen-feel territory (UNCHANGED across MB-T20) | Polling-based bridge per Q-MBT26-5=c keeps preload.mts UNCHANGED |
| R-MBT26-3 | Anthropic SDK stream usage events vary in shape across SDK versions | Capture via the SDK's documented `message_delta.usage` contract; spike + ADR if behavior diverges from docs (CLAUDE.md §2.8) |
| R-MBT26-4 | Mock path (`MB_MOCK_ANTHROPIC=1`) bypasses real API — no usage events | Mock streamChunks emits a synthetic usage callback for tests |
| R-MBT26-5 | Cost-calc rate table will become stale if Anthropic changes published rates | Hardcoded rates with TODO followup linking to MB-T33 profile system per Q-MBT26-2=a |
| R-MBT26-6 | Local TZ midnight is operator-machine-local — not stable across DST transitions | Q-MBT26-7=a date-key derives from operator's local date; DST transition either gives a 23h or 25h day (acceptable; documented limitation) |
| R-MBT26-7 | Cost ledger file could grow unbounded if not pruned | Prune entries older than 7 days at write-time; documented in cost-calc module |
| R-MBT26-8 | Runtime smoke required if main.ts touched (CLAUDE.md §4.6) | If Q-MBT26-5=c keeps main.ts UNCHANGED, smoke not required. If main.ts touched, run smoke before WB4 |

---

## V. Cross-session shared-file map

| File | Sessions touching | Coordination |
|---|---|---|
| `chat-shell/chat-shell.tsx` | Terminal C (T26), Terminal D (T27) | Sequence: T26 lands header-bar element + cost-meter slot prop; T27 adds model-mix slot prop. Cross-session note at WB1. |
| `docs/FOLLOWUPS.md` | T21/T22/T26/T27 all append | Per-path git add only; append-only-to-end discipline; no edits to other-session entries |
| `tsconfig.json` | T26 may need to add chat-shell-header-bar files (already covered by `"src/chat-shell"` glob) | Likely no edit needed |
| `package.json` | T26 may add no new build script if header-bar lives inside existing chat-shell bundle | Likely no edit needed |
| `main.ts` | UNTOUCHED by T26 if Q-MBT26-5=c (polling) | Avoid sentinel-zone churn |
| `preload.mts` | UNTOUCHED by T26 if Q-MBT26-5=c | Frozen-feel preserved |

---

## VI. Frozen-contract verification

**Verified UNTOUCHED in this diagnose:**
- `dispatch-core/src/v3/schema.ts` — no schema additions needed (cost data is workstation-internal)
- `CONDUCTOR_API_CONTRACT.md` — no API contract changes
- `WORKSTATION_CONTRACT.md` — IPC adds use existing `coarchitect:` channel (Q-MBT26-5=c handler-only)
- `REGISTRY.md` — N/A
- `coarchitect/chat-panel.tsx` — wrapped, not modified (Q-MBT20-3 discipline preserved)

If Q-MBT26-5=a/b chosen instead (preload.mts edit), surface for operator arbitration before commit. **Not recommended.**

---

## VII. Tentative WB ladder (pending Q-MBT26-N answers)

Assuming **Q-MBT26-1=a, Q-MBT26-2=a, Q-MBT26-3=c, Q-MBT26-4=a, Q-MBT26-5=c, Q-MBT26-6=a, Q-MBT26-7=a, Q-MBT26-8=b**:

| WB | Type | Scope | Test count (target) |
|---|---|---|---|
| WB1 | red | Scaffold `src/main/cost-calc.ts` + `src/main/cost-ledger.ts` + scaffold `src/chat-shell/cost-meter.tsx` slot component (stub return null); `test/unit/cost-calc/probe-01-rate-multiplication.spec.ts` (failing); cross-session coord doc at `docs/coordination/t26-t27-coord.md` | ~5 red |
| WB2 | green | cost-calc impl: `MODEL_RATES` const + `computeCost(model, input_tokens, output_tokens)` pure fn; cost-ledger impl: read/write/append/today's-total + 7-day prune; tests pass | ~8-10 green |
| WB3 | green | chat-shell-header-bar element + `renderCostMeter` slot prop in ChatShellProps; CostMeter component (polls coarchitectBridge.getDailyCost via new `coarchitect:getDailyCost` IPC handler); coarchitect-ipc.ts wires onUsage callback into chatClient.streamMessages → cost-ledger.append; chat-shell render tests + integration probe-02 + handler unit test | ~6-8 green |
| WB4 | docs | findings doc at `docs/coordination/mb-t26-findings-2026-05-07.md`; FOLLOWUPS.md amendment to MB-F-T20-FAMILY-B-ADDITIONAL-TABS per Q-MBT26-9=a; new followups for rate-table-profile-migration + any other findings | n/a |

**Estimated total tests authored:** ~19-23.

**Runtime smoke required?** Only if main.ts touches. Q-MBT26-5=c does not touch main.ts → likely **no smoke required for this ticket**. If WB3 reveals main.ts is needed, run smoke before WB4.

---

## VIII. Methodology compliance

- Per-path git add discipline planned at every commit (CLAUDE.md §2.7)
- Atomic-chain commit pattern per ticket prompt (pull → add → diff-verify → commit → push → log-empty)
- Self-check Q1-Q9 in every cairn-grammar commit body
- Per-WB push verification (CLAUDE.md §2.6)
- HALT 0 surface (this doc) before WB1
- Per-3-WB status surface to operator (after WB3)
- HALT 1 before WB4 docs
- HALT 2 — none planned (no main.ts touch → no merge-to-main arbitration needed; standard origin/main per WB)
- Pre-existing test failures (CLAUDE.md §4.5) NOT re-diagnosed per WB; noted in WB4 findings only
- Frozen contracts UNCHANGED throughout

---

## IX. Surface to operator (HALT 0)

**Critical operator decisions before WB1:**

1. **Q-MBT26-1** — header-bar slot model (recommend a) vs tab model (b) vs inline (c). **This decision shapes all subsequent WBs.**
2. **Q-MBT26-2** — hardcoded rates + TODO (recommend a) vs defer until MB-T33 (b)
3. **Q-MBT26-3** — usage capture site: recommend (c) onUsage callback in AnthropicChatClient signature
4. **Q-MBT26-4** — date-keyed JSON ledger in userData (recommend a)
5. **Q-MBT26-5** — polling via coarchitect IPC handler keeps preload.mts UNCHANGED (recommend c)
6. **Q-MBT26-6** — Terminal C goes first; cross-session coord doc (recommend a)
7. **Q-MBT26-7** — date-key derived midnight reset (recommend a; falls out of Q-MBT26-4=a)
8. **Q-MBT26-8** — 4 WBs (recommend b)
9. **Q-MBT26-9** — amend MB-F-T20-FAMILY-B-ADDITIONAL-TABS body at WB4 (recommend a)

**Confidence:** all Q-MBT26-N dispositions are [MODELED] from observed code state + ticket prompt language. None are [KNOWN] until operator confirms. Q-MBT26-1 specifically carries operator-arbitration weight because its (a) interpretation supersedes a previously-filed Tier 2 followup body.

**Awaiting operator ack before WB1 red.**
