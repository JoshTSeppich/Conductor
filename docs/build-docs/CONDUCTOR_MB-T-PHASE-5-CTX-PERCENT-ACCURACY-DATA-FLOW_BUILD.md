# MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW — Per-tile ctx% accuracy (tokensUsed source + tokenBudget source + compaction-aware reconciliation)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW (SPECULATIVE Phase 5 forward-positioning)
**Date authored:** 2026-05-13
**Authored under:** §3.4 operator-supervised mechanical translation discipline (full-build-mode dispatch §3.2) + Round 11 §3.9 Wave 5 SPECULATIVE dispatch (territory manifest `t6-phase5-ctx-percent.txt`; SESSION-`t6-ticket-body-0905-phase5-ctx-percent`; operator-acknowledged speculative-revision risk per Wave 5 STATUS FRAMING)
**Authoring delegate:** SESSION-`t6-ticket-body-0905-phase5-ctx-percent` (Opus 4.7) under orchestrator gen-4 Round 11 cascade — prior ladders COMPLETE: MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β (`40fde1e`), MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH (`87c04b6`), MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW body+decisions (`b76ed51`).
**Authoring anchor commit (HEAD at authoring time):** post-`b76ed51` (T10 SPECULATIVE Phase 4 ticket body landed Wave 2; T-PHASE-5 is Wave 5 forward-position).
**Cairn ladder anchor:** Wireframe inventory bullets per `docs/coordination/full-build-mode-dispatch.md` §1: "Ctx N% (token consumption)" appears in BOTH left-rail tile + right-pane header. Phase 5 forward-position — Wave 5 cohort speculative ticket-body authoring.

**SPECULATIVE Phase-5 status:** `[SPECULATIVE per Round 11 §3.9 Wave 5 STATUS FRAMING]` Phase 4 + Phase 5 visual-verification not yet triggered. Operator explicitly accepts revision-cost via Round 11 Wave 5 cascade. Post-Phase-4 + Post-Phase-5 evidence may RATIFY / RESHAPE / DISCARD this ticket. Treat scope as plausible, not committed.

**Closes / advances (target rows):**
- **NEW followup target** (to be filed at WB-final docs IF this ticket dispatches): `MB-F-PHASE-5-CTX-PERCENT-TOKENBUDGET-1M-VARIANT-COVERAGE` — Tier 2 candidate; `[KNOWN]` per direct source read of `packages/dispatch-workstation/src/tile-grid/model-context-windows.ts`: lookup table covers `claude-sonnet-4-6` / `claude-opus-4-7` / `claude-haiku-4-5-20251001` all at 200_000; `O4.7·1M` variant (per CLAUDE.md ModelHint enum `'O4.7·1M'`) NOT covered → falls through to DEFAULT_CONTEXT_WINDOW=200_000 → ctx% denominator inaccurate by ~5x for 1M-context sessions.
- **NEW followup target**: `MB-F-PHASE-5-CTX-PERCENT-TOKENSUSED-PTY-SCRAPE-ACCURACY` — Tier 3 candidate; PTY-scrape regex `/([0-9]+) tokens/g` per `tile-token-scraper.ts` captures CC CLI status-bar text but `[SPECULATIVE]` whether the number matches Anthropic API's input-token count semantics (input vs. input+output; pre-compaction vs. post-compaction).
- **NEW followup target**: `MB-F-PHASE-5-CTX-PERCENT-COMPACTION-AWARE-ACCOUNTING` — Tier 2 candidate; CC CLI emits compaction events (operator-observable in CC stdout); tokensUsed reading is monotonic over PTY scrape but actual context shrinks post-compaction → displayed ratio over-states real context consumption.
- **NEW followup target**: `MB-F-PHASE-5-CTX-PERCENT-RENDER-SITE-RECONCILIATION` — Tier 3 candidate; 3 separate render sites compute ratio from same source pair (tile-header.tsx Frame A, session-list.tsx Frame C row, terminal-header-bar.tsx Frame C right-pane) — duplication risk + single source-of-truth opportunity.
- Audit `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` (if relevant row exists) — advances ctx% row from SHIPPED-with-stub-lookup → SHIPPED-with-accuracy-verified-source.

**Depends on (all merged at HEAD post-`b76ed51`):**
- MB-T-WIREFRAME-T1-SESSION-DATA-FLOW (`4414ef9` per T1 ticket body anchor) — sessions stream surface; `TileGridSessionEntry.tokensUsed` + `tokenBudget` field path; T1 §C.5 tile-token-scraper precedent (PTY-scrape pattern).
- MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE (per `tile-header.tsx:129` + `session-list.tsx:175` MB-T-WIREFRAME-C5 sentinel zones) — shipped ctx N% inline label rendering at 3 sites; consumer surface stable; T-PHASE-5 changes upstream data source not the rendering.
- MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE (per `terminal-header-bar.tsx:11-24`) — TerminalHeaderBar right cluster ctx N% pill shipped; consumer surface stable.
- §C.5 PTY-scrape infrastructure (`tile-token-scraper.ts` `13b7607` anchor; SPIKE at `ef2dd3d` ANSI-strip + regex) — workstation-internal PTY pattern operative.
- `model-context-windows.ts` static lookup module (§C.5 WB4 per file comment) — current tokenBudget source-of-truth.
- Sibling T8 (`155933f`) + T9 (`afd3778`) data-flow tickets — architectural pattern reference (aggregator + emission channel + accuracy-driven Sub-Q decomposition).

**Downstream gates:**
- Future MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION (per T8 ticket body §1.2 cross-ref) — if Sub-Q-T-PHASE-5-A=(γ) daemon-aggregator selected, T-PHASE-5 piggy-backs on daemon cost-info integration roadmap.
- Future BypassPermsIndicator + MaxParallelCounter (T10 forward-position) — sibling Phase 4/5 forward-positioned tickets; T-PHASE-5 path-disjoint at file level.
- Anti-fabrication-driven escalation: `[SPECULATIVE]` — if Phase 4 dogfood surfaces ctx% drift visibility (e.g., operator says "this ratio looks wrong"), promotes T-PHASE-5 priority within Phase 5 wave.

**Estimated WB count:** 8-10 baseline (8 WB default path; +1-2 if Sub-Q-T-PHASE-5-A=(γ) daemon-aggregator triggered OR Sub-Q-D=(ii) compaction-event subscription triggered).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first to bind vs deferred work.
2. Read §3 (Sub-Q gate arbitrations) — five operator decisions parameterize WB scope; defaults `[MODELED]` recommendations.
3. Read §4 (WB ladder) for execution order. WBs are construction-order-aware: probe-then-impl per cairn discipline.
4. §5-§9 are operational supports — cross-refs, self-check expectations, definition of done, risk register, anti-fabrication audit.

Confidence labels per CLAUDE.md §2.2: `[KNOWN]` observed in this session via direct source read at HEAD post-`b76ed51`; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence — binding for Phase-5 forward-positioned claims per Round 11 §3.9 Wave 5 STATUS FRAMING.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-PRE-ARBITRATED]` per Round 11 §3.9 Wave 5 dispatch territory manifest:

1. **Advances ctx% accuracy across all three render sites** without modifying the rendering surface itself.
   - `[KNOWN]` per direct source read: ctx% shipped at 3 sites (Frame A `tile-header.tsx:217-222`; Frame C `session-list.tsx:175-258`; Frame C right-pane `terminal-header-bar.tsx:11-24`).
   - `[KNOWN]` formula: `Math.round((tokensUsed / tokenBudget) * 100)` consumed via `TileGridSessionEntry.tokensUsed` + `tokenBudget` field pair.
   - T-PHASE-5 changes UPSTREAM `tokensUsed` + `tokenBudget` data sources per Sub-Q resolutions; downstream rendering untouched.

2. **tokensUsed source-of-truth per Sub-Q-T-PHASE-5-A**:
   - (α) RATIFY PTY-scrape regex (current; `tile-token-scraper.ts` `13b7607`).
   - (β) Anthropic API response-headers piggyback (per-CC-API-call usage tokens; CC CLI may surface in stdout).
   - (γ) Daemon-side aggregator via `/v2/sessions` cost_info `token_count` (mirror T8 cost-meter Sub-Q-T8-A=(c) pattern).
   - (δ) Hybrid (α + β/γ for cross-validation; PTY-scrape primary + API-header secondary).

3. **tokenBudget source-of-truth per Sub-Q-T-PHASE-5-B**:
   - (α) RATIFY static lookup (`model-context-windows.ts`; current).
   - (β) Extended static lookup adding `O4.7·1M` variant entry (1_000_000) + any future model coverage — minimal scope; closes `MB-F-PHASE-5-CTX-PERCENT-TOKENBUDGET-1M-VARIANT-COVERAGE` directly.
   - (γ) Operator-configured per-session override (mirror T10 Sub-Q-T10-B=(β) settings-file pattern).
   - (δ) Dynamic discovery from Anthropic API model-info endpoint (if/when Anthropic exposes); `[SPECULATIVE]`.

4. **1M variant coverage per Sub-Q-T-PHASE-5-C** (orthogonal to B):
   - (i) Treat as Sub-Q-B sub-bullet (no separate Sub-Q) — fold into B=(β).
   - (ii) Independent fix at WB2 GREEN: add `'O4.7·1M': 1_000_000` to lookup PLUS ensure spawn-handler propagates model variant to `TileGridSessionEntry.model` (depends on `MB-T-PHASE-4-MODEL-SOURCE-WIRING` per phase-4-rev-2 roadmap §1.1).

5. **Compaction-aware accounting per Sub-Q-T-PHASE-5-D**:
   - (α) Defer (current PTY-scrape regex extracts last-seen "N tokens" — monotonic-by-construction; compaction-reset shows as drop on next status-bar render; acceptable v1).
   - (β) Subscribe to CC CLI compaction events via NEW PTY-pattern in `tile-token-scraper.ts` — emit `tokensUsed-reset` signal on compaction.
   - (γ) Per-session usage ledger reset (workstation-internal state tracking cumulative usage minus compaction-recovered context).

6. **Render-site reconciliation per Sub-Q-T-PHASE-5-E**:
   - (α) Accept duplication (3 sites compute ratio independently from shared field pair; if field pair authoritative, computed ratio coherent).
   - (β) Extract `computeCtxPercent(entry: TileGridSessionEntry): number` helper to `packages/dispatch-workstation/src/frame-c/ctx-percent.ts` (NEW); 3 sites consume helper — single source-of-truth for the FORMULA.

7. **Audit reclassification + FOLLOWUPS rows**: WB-final docs file the 4 NEW followup target rows enumerated above; cross-reference T1 §C.5 + T2 terminal-header-bar + MB-T-WIREFRAME-C5 lineage.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-PRE-ARBITRATED]` constraints:

- Does NOT modify `tile-header.tsx`, `session-list.tsx`, or `terminal-header-bar.tsx` rendering surfaces — consumer-stable per existing MB-T-WIREFRAME-C5 ship.
- Does NOT modify `TileGridSessionEntry` schema field NAMES (`tokensUsed`, `tokenBudget`); only the data WIRING into these fields changes.
- Does NOT close `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (Tier 2; sibling T8/T9/T10 arms); orthogonal territory.
- Does NOT modify frozen surfaces unless Sub-Q-T-PHASE-5-A=(γ) daemon-aggregator selected OR new IPC introduced (then `WORKSTATION_CONTRACT.md` §6.6 amendment scope surfaces at HALT-WB-PRE-COMMIT per CLAUDE.md §2.4).
- Does NOT modify v2/v3 schemas; v2 `cost_info.token_count` field is FROZEN per CLAUDE.md §1 — T-PHASE-5 consumes existing shape per Sub-Q-A=(γ).
- Does NOT introduce electron-store; persistence (if Sub-Q-B=(γ) settings-file selected) mirrors `splitter-state.ts` raw-fs pattern per CLAUDE.md §3.5.
- Does NOT modify CC CLI emission patterns (operator-side / upstream); workstation must adapt to existing CC stdout.
- Does NOT advance `MB-T-PHASE-4-MODEL-SOURCE-WIRING` (Phase 4 rev-2 roadmap §1.1) closure in full — only consumes whatever model-source surface that ticket ships; Sub-Q-T-PHASE-5-C=(ii) cross-dep noted but T-PHASE-5 ships independent of model-source ticket execution.
- Does NOT touch Frame C action-bar / kill-IPC / detail-pane HYBRID / chat-shell bottom-rail — strictly ctx% data territory.
- Does NOT add new Anthropic API integration in workstation-direct path (Sub-Q-A=(β) is `[SPECULATIVE]` and CONDITIONAL — execution-phase spike required first).

---

## §2 — Arbitration anchor (operator-frozen via Round 11 §3.9 Wave 5 dispatch + Phase 5 forward-positioning)

### §2.1 — Round 11 §3.9 Wave 5 dispatch enumeration (binding)

`[KNOWN-OPERATOR-PRE-ARBITRATED]`

Per dispatch-queue-current.md row for `t6-ticket-body-0905` Wave 5:
> **MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW** ticket body forward-position (anticipated Phase 5 gap; per-tile ctx% accuracy)

`[KNOWN-OPERATOR-PRE-ARBITRATED]` constraints derived from dispatch frame:
- Scope = ctx% accuracy data flow (NOT visual, NOT new component).
- Phase = 5 (forward-positioned ahead of Phase 4 completion; SPECULATIVE STATUS).
- Sibling precedent = T1 SESSION-DATA-FLOW + T8 COST-METER + T9 PLAN-TIMER — read as architectural pattern reference, not direct closure targets.

### §2.2 — Anti-fabrication source-of-truth findings (`[KNOWN]` direct-read evidence)

`[KNOWN]` per direct read of HEAD-post-`b76ed51` source:

1. **Three ctx% render sites:**
   - `packages/dispatch-workstation/src/tile-grid/tile-header.tsx:217-222` — `<span data-testid="tile-header-ctx-text">ctx {Math.round(tokenRatio * 100)}%</span>` (Frame A; MB-T-WIREFRAME-C5 WB6 sentinel).
   - `packages/dispatch-workstation/src/frame-c/session-list.tsx:175-258` — per-row ctx N% label (MB-T-WIREFRAME-C5 WB2 sentinel); guards `tokenBudget undefined/0` to avoid NaN.
   - `packages/dispatch-workstation/src/frame-c/terminal-header-bar.tsx:11-24` — right-cluster ctx N% pill (Frame C right-pane); computed `Math.round((tokensUsed / tokenBudget) * 100)`.

2. **tokensUsed source (current):** `packages/dispatch-workstation/src/main/tile-token-scraper.ts` §C.5 WB2 GREEN — PTY-broadcaster observer; ANSI-strip via `ANSI_CSI_RE`; extract via `TOKEN_RE = /([0-9]+) tokens/g`; last-match wins; debounced 500ms per session; emits via `workstation:tile-token-update` IPC. SPIKE anchor `ef2dd3d` verified regex against tmux capture-pane decoded output.

3. **tokenBudget source (current):** `packages/dispatch-workstation/src/tile-grid/model-context-windows.ts` §C.5 WB4 — static lookup `MODEL_CONTEXT_WINDOWS: Record<string, number> = { 'claude-sonnet-4-6': 200_000, 'claude-opus-4-7': 200_000, 'claude-haiku-4-5-20251001': 200_000 }`; DEFAULT_CONTEXT_WINDOW=200_000 fallback. `[KNOWN]` accuracy gap: `O4.7·1M` ModelHint variant (per CLAUDE.md project ModelHint enum) NOT in lookup → falls through to 200_000 → ratio under-states 1M-context capacity by 5x.

4. **Comment trail anchoring `tokenBudget ≠ context-window` distinction:** `packages/dispatch-workstation/src/frame-c/model-badge.ts:23-24` notes: "(no `tokenBudget` ≠ context-window distinction at v3.0 ship). When a future cycle adds context-window metadata, this module's switch..." — confirms forward-positioning territory for T-PHASE-5.

5. **Phase 4 rev-2 roadmap silence on ctx%:** `[KNOWN]` `grep "ctx" docs/coordination/phase-4-tier-1-roadmap-rev-2-2026-05-12.md` returns NO ctx% rows. Confirms T-PHASE-5 is genuinely Phase 5 forward-position (not pre-empting Phase 4 candidate).

### §2.3 — Visual-comparison gate (dispatch §3.5)

`[KNOWN-OPERATOR-ARBITRATED]`

Per full-build-mode dispatch §3.5: `green:wiring` AUTO-ACK requires headless screenshot generation OR operator-manual-screenshot fallback. T-PHASE-5 is data-flow (NOT visual); WB-final smoke per CLAUDE.md §4.6 verifies that ctx% renders with corrected ratios across all 3 sites post-Sub-Q-A/B resolution. Per MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING (`030c2d6`) maturity at execution time, operator-manual-screenshot fallback may or may not apply.

### §2.4 — Frozen-contract amendment scoping (binding pattern)

`[KNOWN-OPERATOR-ARBITRATED]`

Per dispatch §3.3: NEW IPC channels require `WORKSTATION_CONTRACT.md` §6.6 amendment per CLAUDE.md §2.4 (operator-arbitrated separate `contract:` commit). T-PHASE-5 default Sub-Q recommendations minimize new-channel introductions (Sub-Q-A=(α) RATIFY PTY-scrape; Sub-Q-B=(β) extended-static-lookup; Sub-Q-E=(β) helper extraction). Non-default selections (Sub-Q-A=(γ) daemon-aggregator) escalate amendment scope (mirror T8 Sub-Q-T8-A=(c) precedent; reuses existing `workstation:tile-token-update` channel rather than introducing new).

### §2.5 — Construction order (file ownership for parallel-CC discipline)

`[KNOWN per Round 11 §3.9 Wave 5 manifest + this ticket §5.3]`

T-PHASE-5 ticket-body-authoring territory (WRITE per manifest):
- `docs/build-docs/CONDUCTOR_MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW_BUILD.md` (this ticket body)
- `docs/coordination/mb-t-phase-5-ctx-percent-accuracy-decisions-2026-05-13.md` (Sub-Q resolutions when operator acks)
- `docs/coordination/coord-phase5-ctx-percent-2026-05-13.md` (coord note for downstream execution-dispatch coordination)

T-PHASE-5 execution-phase territory (NOT in current ticket-body-authoring manifest; surfaces at execution-phase dispatch):
- MOD `packages/dispatch-workstation/src/tile-grid/model-context-windows.ts` (Sub-Q-B=(β) extended-static-lookup adds `'O4.7·1M'` entry)
- CONDITIONAL NEW `packages/dispatch-workstation/src/frame-c/ctx-percent.ts` (Sub-Q-E=(β) helper extraction)
- CONDITIONAL MOD `packages/dispatch-workstation/src/main/tile-token-scraper.ts` (Sub-Q-D=(β) compaction-event subscription)
- CONDITIONAL NEW `packages/dispatch-workstation/src/main/ctx-percent-aggregator.ts` (Sub-Q-A=(γ) daemon-aggregator path)
- CONDITIONAL MOD `WORKSTATION_CONTRACT.md` §6.6 (amendment if Sub-Q-A=(γ) new-IPC; separate `contract:` commit per CLAUDE.md §2.4)
- WB-final NEW `docs/coordination/mb-t-phase-5-ctx-percent-findings-<date>.md`
- WB-final MOD `docs/FOLLOWUPS.md` (file 4 NEW followup rows enumerated in `Closes / advances`)

`[KNOWN]` per Round 11 §3.9.A manifest enforcement: this ticket-body authoring DOES NOT touch any execution-phase file. Execution-phase territory boundaries surface at the execution-dispatch cycle.

Path-disjoint from co-active sub-sessions per dispatch-queue Wave 5 (lines per dispatch-queue):
- Other Wave 5 sessions (see dispatch-queue): path-disjoint from T-PHASE-5 by manifest construction.
- Sibling forward-position ticket-body sessions (T10 Wave 2 already shipped at `b76ed51`): completed; territory free.

Path-overlap risk (execution-phase only):
- `tile-token-scraper.ts` is touched by T-PHASE-5 (Sub-Q-D=(β)) IF compaction-event subscription selected. No other sibling session currently editing this file.
- `model-context-windows.ts` is small (~17 lines); T-PHASE-5 Sub-Q-B=(β) appends one entry. Low collision risk.
- 3 ctx% render-site files: NOT touched by T-PHASE-5 (consumer-stable per §1.2).

---

## §3 — Sub-Q gate arbitrations REQUIRED before specific WBs

Five operator decisions parameterize WB scope. Surface at HALT-TICKET-BODY-PRE-COMMIT for batch resolution. Defaults if unresolved are `[MODELED]` recommendations.

### §3.1 — Sub-Q-T-PHASE-5-A: tokensUsed source-of-truth

Required before **WB2** (source probe) + **WB3** (impl). Default if unresolved: **(α) RATIFY PTY-scrape (current `tile-token-scraper.ts`)**.

`[KNOWN]` per direct-read of `tile-token-scraper.ts`:
- PTY-broadcaster observer pattern (mirrors `IConsoleBroadcaster` injection).
- ANSI-strip regex `ANSI_CSI_RE` per ECMA-48 CSI sequences (SGR, cursor, erase).
- Token extraction regex `TOKEN_RE = /([0-9]+) tokens/g` — last-match wins.
- 500ms per-session debounce matching MB-T39 inner-quiescence.
- SPIKE anchor `ef2dd3d` verified against tmux capture-pane.

| Option | Mechanism | Frozen-surface touch | Accuracy characteristic |
|---|---|---|---|
| (α) RATIFY PTY-scrape (recommended) | No change to source pipeline; explicit re-ratification per Phase 5 evidence-driven dispatch. | NONE | Inherits PTY-scrape limitations: format-drift risk, ANSI-edge-case risk, but token count IS what CC displays to operator. |
| (β) Anthropic API response-headers piggyback | If CC CLI surfaces API response headers in stdout (`anthropic-ratelimit-input-tokens-*` or per-response `usage.input_tokens`), parse via NEW PTY-pattern in `tile-token-scraper.ts`. **SPIKE-FIRST** per CLAUDE.md §2.8 — visibility `[SPECULATIVE]`. | NONE direct | Higher accuracy if visible: API-authoritative; matches Anthropic's input-token definition. |
| (γ) Daemon-side aggregator | NEW `main/ctx-percent-aggregator.ts` polls daemon `/v2/sessions` cost_info `token_count` field (already in v2 schema; FROZEN); workstation aggregates per-session for ctx% denominator. Mirror T8 cost-meter Sub-Q-T8-A=(c) pattern. | NONE (reuses existing daemon endpoint + existing IPC broadcast channel) | Daemon-authoritative; depends on daemon `token_count` semantics (input-vs-total). |
| (δ) Hybrid (α + β/γ cross-validation) | PTY-scrape primary; API-header secondary; emit warning if drift >10% between sources. | NONE if both reuse existing channels | Highest confidence; +2 WBs implementation. |

`[MODELED]` Recommend **(α) RATIFY** for ship-velocity + matches actual operator-observable (PTY-scrape count IS what CC shows operator). Rationale: ctx% accuracy is ABOUT the displayed-ratio matching operator's expectation; if CC displays "N tokens" then ctx% formula consuming that N matches operator's mental model. Higher-fidelity sources (β/γ) are admissible if Phase 4+ dogfood surfaces drift between displayed-CC count vs API-actual count.

Operator decision pending.

### §3.2 — Sub-Q-T-PHASE-5-B: tokenBudget source-of-truth

Required before **WB2** (source probe) + **WB3** (impl). Default if unresolved: **(β) Extended static lookup adding `O4.7·1M` variant**.

`[KNOWN]` per direct-read of `model-context-windows.ts`:
- Static lookup module (~17 lines).
- Three entries: `claude-sonnet-4-6` / `claude-opus-4-7` / `claude-haiku-4-5-20251001` all at 200_000.
- DEFAULT_CONTEXT_WINDOW = 200_000 fallback for unrecognized model strings.

`[KNOWN]` accuracy gap: per CLAUDE.md ModelHint enum (`'S4.6' | 'O4.6' | 'O4.7·1M' | 'H'`), `O4.7·1M` is a 1M-context variant. Current lookup does NOT distinguish; 1M-variant sessions display ctx% over 200k denominator → over-states ratio by ~5x. Comment trail at `model-badge.ts:23-24` confirms forward-positioning territory.

| Option | Mechanism | Coverage scope | Effort |
|---|---|---|---|
| (α) RATIFY static lookup (current) | No change; accept 1M variant under-represented. Honest "200k default" stance. | 3 models @ 200k | ZERO |
| (β) Extended static lookup (recommended) | Add `'O4.7·1M': 1_000_000` (and `'claude-opus-4-7-1m'` model-string variant if backend uses different ID); preserve fallback to 200_000. Single-file edit (`model-context-windows.ts`). | 4 models incl. 1M variant | LOW (1 row addition + 1 RED/GREEN probe pair) |
| (γ) Operator-configured per-session override | NEW settings file (`splitter-state.ts` pattern); operator may override `tokenBudget` per session-name. Forward-compat for custom context-window scenarios. | Operator-extensible | MEDIUM (35-line state module + read at consumer sites) |
| (δ) Dynamic discovery via Anthropic API model-info endpoint | `[SPECULATIVE]` — assumes Anthropic exposes model context-window in a callable endpoint. SPIKE required. | Future-proof | HIGH (spike + new HTTP wiring + secret management) |

`[MODELED]` Recommend **(β)** for ship-velocity + smallest-bounded-scope + closes the `[KNOWN]` 1M-variant gap directly. Rationale: 1M-variant under-representation is the ONE concrete accuracy gap surfaced by direct source read; static lookup extension is a 1-line code change + 1 RED/GREEN probe pair; ZERO frozen-surface touch. (α) RATIFY is honest if operator prefers to defer until Anthropic exposes model-info API. (γ) per-session override is forward-compat but introduces UX surface that exceeds anti-fabrication anchor (no operator-load-bearing custom-context-window scenarios observed at HEAD). (δ) requires API integration + secret-mgmt complexity.

Operator decision pending.

### §3.3 — Sub-Q-T-PHASE-5-C: 1M variant coverage (orthogonal to B)

Required before **WB2** (model-source probe) + **WB3** (impl). Default if unresolved: **(i) Fold into Sub-Q-B=(β) — no separate Sub-Q**.

`[KNOWN]` per CLAUDE.md project ModelHint enum + `frame-c/model-badge.ts` switch statement: `'O4.7·1M'` is a recognized badge but no underlying `TileGridSessionEntry.model` propagation distinguishes it from regular `'O4.7'` at spawn-handler level (per Phase 4 rev-2 roadmap §1.1 `MB-T-PHASE-4-MODEL-SOURCE-WIRING` row noting `TileGridSessionEntry.model` is STUB at HEAD).

| Option | Coverage path | Cross-ticket dep |
|---|---|---|
| (i) Fold into Sub-Q-B (recommended) | Sub-Q-B=(β) adds `'O4.7·1M'` lookup entry; closure complete WITHIN this ticket. | NONE — model-source-wiring closure is separate ticket; T-PHASE-5 ships the lookup-entry side regardless. |
| (ii) Cross-dep on MB-T-PHASE-4-MODEL-SOURCE-WIRING | Defer T-PHASE-5 1M coverage until MB-T-PHASE-4-MODEL-SOURCE-WIRING ships `TileGridSessionEntry.model` propagation; THEN T-PHASE-5 extends lookup. | YES — serialize on Phase 4 model-source ticket. |
| (iii) Spike Anthropic model-info API for dynamic 1M detection | `[SPECULATIVE]` — depends on Anthropic API surfacing model context-window info. Defer to Sub-Q-B=(δ) integration. | NONE direct; opens Anthropic API integration. |

`[MODELED]` Recommend **(i)**. Rationale: the 1M lookup-entry side is ZERO-cost workstation-internal addition (1 row in `model-context-windows.ts`); it ships independently of upstream model-source-wiring AS LONG AS the model string when present matches the lookup key. Phase 4 model-source-wiring may populate `model: 'O4.7·1M'` or `'claude-opus-4-7-1m'` (backend-actual ID); T-PHASE-5 WB2 reading scope verifies the actual string used and adjusts lookup key.

Operator decision pending.

### §3.4 — Sub-Q-T-PHASE-5-D: Compaction-aware accounting

Required before **WB4** (probe) + **WB5** (impl). Default if unresolved: **(α) Defer (PTY-scrape last-match-wins is monotonic-by-construction; compaction-reset shows naturally on next status-bar render)**.

`[KNOWN]` per `tile-token-scraper.ts:24-37`: `extractLastTokenCount` returns LAST match of `/([0-9]+) tokens/g`; if compaction happens and CC re-renders status bar with smaller number, last-match-wins reflects the post-compaction count. `[SPECULATIVE]` — depends on CC CLI actually re-rendering status bar after compaction; some CLI behaviors may retain old number until next API call.

| Option | Mechanism | Accuracy under compaction | Effort |
|---|---|---|---|
| (α) Defer (recommended) | No change; PTY-scrape regex last-match-wins handles compaction-reset on next render. | Accurate post-CC-re-render. Brief lag possible (next API call). | ZERO |
| (β) Compaction-event PTY subscription | NEW regex pattern in `tile-token-scraper.ts` for compaction markers (CC CLI may emit `"Compacting context"` or similar — SPIKE first); on match, emit `tokensUsed-reset` signal. | Tight tracking of compaction transitions. | MEDIUM (+1-2 WBs; spike + regex + state machine) |
| (γ) Per-session usage ledger | Workstation-internal cumulative state tracking; reset on compaction signal. | Most accurate; survives PTY chunk loss. | HIGH (+2-3 WBs; new state module + lifecycle hooks) |

`[MODELED]` Recommend **(α) defer** — last-match-wins regex semantics already handle the common compaction-reset path (CC re-renders status bar with smaller number; T-PHASE-5 captures new value). (β) is the natural escalation IF Phase 5 dogfood surfaces accuracy gaps post-compaction; file `MB-F-PHASE-5-CTX-PERCENT-COMPACTION-AWARE-ACCOUNTING` Tier 2 at WB-final docs for forward-propagation. (γ) is over-scope without dogfood evidence.

Operator decision pending.

### §3.5 — Sub-Q-T-PHASE-5-E: Render-site reconciliation

Required before **WB6** (helper probe) + **WB7** (impl). Default if unresolved: **(β) Extract `computeCtxPercent` helper for single formula source-of-truth**.

`[KNOWN]` per direct read of 3 render sites:
- `tile-header.tsx:217-222` computes inline `Math.round(tokenRatio * 100)` where `tokenRatio = tokensUsed / tokenBudget`.
- `session-list.tsx:258` computes inline `Math.round((tokensUsed / tokenBudget) * 100)` with `undefined/0` guard.
- `terminal-header-bar.tsx:11` computes inline same formula.

Duplication risk: if formula needs refinement (e.g., add 0.5% rounding, or apply ceiling for 99% display under near-100%), 3 sites must edit in lock-step.

| Option | Mechanism | Coupling reduction | Effort |
|---|---|---|---|
| (α) Accept duplication | No change; 3 sites compute independently. | NONE — but formula is simple; drift risk low. | ZERO |
| (β) Extract `computeCtxPercent` helper (recommended) | NEW `packages/dispatch-workstation/src/frame-c/ctx-percent.ts` exporting `computeCtxPercent({tokensUsed, tokenBudget}): number` with single guard + rounding semantics. 3 sites import + consume. | Single source-of-truth for formula. | LOW (NEW small file + 3 import edits) |
| (γ) Move ratio to `TileGridSessionEntry.ctxPercent: number` precomputed | Workstation precomputes ratio per session-state update; renderer sites read precomputed field. | Removes ratio computation from renderer; centralizes upstream. | MEDIUM (state-flow change + precompute site) |

`[MODELED]` Recommend **(β) helper extraction** for ship-velocity + single-source-of-truth without state-flow surgery. Rationale: 3 sites already share field pair `tokensUsed`/`tokenBudget`; helper extraction is the smallest refactor that eliminates formula-drift risk. (α) accept-duplication is honest "ZERO cost" stance but file `MB-F-PHASE-5-CTX-PERCENT-RENDER-SITE-RECONCILIATION` Tier 3 if operator prefers. (γ) precomputed field is over-scope; field-pair pattern is already operator-mental-model-aligned.

Operator decision pending.

---

## §4 — WB ladder

8 WBs baseline (defaults Sub-Q-A=α + B=β + C=i + D=α + E=β); 9-10 WBs if alternates selected (e.g., Sub-Q-A=(γ) daemon-aggregator triggers +1 WB; Sub-Q-D=(β) compaction-event triggers +1 WB).

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CONDUCTOR_API_CONTRACT.md §10.5; per-path `git add` per CLAUDE.md §2.7; pathspec-on-commit form per `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` Tier 1 closure path α; push after each cairn-grammar commit per §2.6.

**T6 α + β gates operative this ticket** per `0d71590` §C envelope amendment: each `green:wiring` commit MUST (1) declare a fingerprint set in commit body §F-Fingerprints; (2) run `pnpm --filter dispatch-workstation verify:build-freshness`; (3) run `pnpm --filter dispatch-workstation verify:bundle-fingerprint --fingerprint <s1> ...` per affected dist artifact.

### WB1 — `red(MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW): probe-mbtphase5ctx-01-model-context-windows-1m-variant`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/tile-grid/probe-mbtphase5ctx-01-model-context-windows-1m-variant.spec.ts` (or appropriate test dir). Asserts (Sub-Q-B=(β) default path):
- `getContextWindow('claude-sonnet-4-6')` returns 200_000.
- `getContextWindow('claude-opus-4-7')` returns 200_000.
- `getContextWindow('O4.7·1M')` returns 1_000_000 (NEW — fails RED at current lookup).
- `getContextWindow('unknown-future-model')` returns 200_000 (DEFAULT_CONTEXT_WINDOW preserved).

Probe fails RED — current lookup returns 200_000 for `O4.7·1M`. WB2 GREEN adds entry.
**Acceptance:** probe RED. Commit body Q1-Q9. §F-Fingerprints: N/A (RED).

### WB2 — `green(MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW): model-context-windows.ts 1M variant entry`

**Type:** green
**Scope:** GREEN at MOD `packages/dispatch-workstation/src/tile-grid/model-context-windows.ts`:
- Add `'O4.7·1M': 1_000_000` entry to `MODEL_CONTEXT_WINDOWS` record.
- **CONDITIONAL** (per WB1 reading scope): if Phase 4 model-source-wiring uses a different model string (e.g., `'claude-opus-4-7-1m'`), add that variant too as alias.
- DEFAULT_CONTEXT_WINDOW=200_000 unchanged.

**Acceptance:** WB1 RED → GREEN. Commit body Q1-Q9. §F-Fingerprints: `O4.7·1M`, `1_000_000` (or `1000000` after minify).

### WB3 — `red(MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW): probe-mbtphase5ctx-02-compute-ctx-percent-helper`

**Type:** red
**Scope:** RED probe at `probe-mbtphase5ctx-02-compute-ctx-percent-helper.spec.ts`. Asserts (Sub-Q-E=(β) default path):
- `computeCtxPercent({tokensUsed: 100000, tokenBudget: 200000})` returns 50.
- `computeCtxPercent({tokensUsed: 0, tokenBudget: 200000})` returns 0.
- `computeCtxPercent({tokensUsed: 500000, tokenBudget: 1000000})` returns 50 (1M variant).
- `computeCtxPercent({tokensUsed: 100, tokenBudget: 0})` returns 0 (guard against div-by-zero; matches session-list.tsx guard).
- `computeCtxPercent({tokensUsed: 100, tokenBudget: undefined as any})` returns 0 (guard against undefined).

Probe fails RED — helper module absent.
**Acceptance:** probe RED.

### WB4 — `green(MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW): ctx-percent.ts helper + 3-site consumer migration`

**Type:** green
**Scope:** GREEN at NEW `packages/dispatch-workstation/src/frame-c/ctx-percent.ts`:
- `computeCtxPercent({tokensUsed, tokenBudget}): number` — pure fn; div-by-zero + undefined guard; Math.round to integer.

MOD 3 render-site files to import + consume helper:
- `packages/dispatch-workstation/src/tile-grid/tile-header.tsx` — replace inline `Math.round(tokenRatio * 100)` with helper call.
- `packages/dispatch-workstation/src/frame-c/session-list.tsx` — replace inline computation at line 258 with helper call.
- `packages/dispatch-workstation/src/frame-c/terminal-header-bar.tsx` — replace inline computation at line 11 with helper call.

**Acceptance:** WB3 RED → GREEN. Commit body Q1-Q9. §F-Fingerprints: `computeCtxPercent`, `ctx-percent.ts` filename.

### WB5 — `red(MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW): probe-mbtphase5ctx-03-3-render-sites-coherence`

**Type:** red
**Scope:** RED probe at `probe-mbtphase5ctx-03-3-render-sites-coherence.spec.tsx`. Asserts:
- With mocked session entry `{tokensUsed: 100000, tokenBudget: 200000}`:
  - `tile-header.tsx` renders `ctx 50%` via testid `tile-header-ctx-text`.
  - `session-list.tsx` per-row ctx N% renders `50%`.
  - `terminal-header-bar.tsx` right-cluster pill renders `ctx 50%`.
- With 1M variant `{tokensUsed: 500000, tokenBudget: 1000000}`: all 3 sites render `ctx 50%`.
- With degenerate `{tokensUsed: 100, tokenBudget: undefined}`: all 3 sites render `ctx 0%` (guard coherence).

Probe fails RED until WB4 migration completes; once GREEN, verifies coherence across all 3 sites.
**Acceptance:** probe RED → GREEN at WB4 close.

### WB6 — `green(MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW): verify Sub-Q-A=(α) PTY-scrape coverage acceptance`

**Type:** green (acceptance + ratification)
**Scope:** GREEN — explicit acceptance test for Sub-Q-A=(α) RATIFY-PTY-scrape. Authors `probe-mbtphase5ctx-04-pty-scrape-ratification.spec.ts`:
- Mocked PTY chunk includes `"42 tokens"` status-bar text → `extractLastTokenCount` returns 42.
- Mocked PTY chunk includes ANSI escapes around the count → ANSI-strip + extract returns 42.
- Mocked compaction sequence: first chunk has `"150000 tokens"`, second chunk has `"15000 tokens"` (compaction-reset) → last-match-wins returns 15000.

These RATIFY current `tile-token-scraper.ts` behavior under Sub-Q-A=(α) without modification; provides regression-test surface for future PTY-scrape edits.

**Acceptance:** probes pass; no impl change required.

### WB7 — `green(MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW): runtime-launch smoke + α/β verification`

**Type:** green (smoke harness)
**Scope:** per CLAUDE.md §4.6 + T6 α/β envelope:
1. Build dispatch-core + dispatch-workstation.
2. Verify α PASS via `pnpm --filter dispatch-workstation verify:build-freshness`.
3. Verify β PASS via `pnpm --filter dispatch-workstation verify:bundle-fingerprint --dist-path dist/tile-grid/renderer.js --fingerprint "computeCtxPercent" --fingerprint "O4.7·1M"` (or appropriate dist target per where the helper bundles).
4. Launch electron from dist; observe `WINDOW_READY` within ~10s.
5. With mocked TileGridSessionEntry having 1M model variant, observe ctx% renders correct ratio.

**Acceptance:** smoke evidence at `docs/coordination/mb-t-phase-5-ctx-percent-runtime-smoke-<date>.md`.

### WB8 — `docs(MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW): findings doc + FOLLOWUPS new rows`

**Type:** docs
**Scope:** author `docs/coordination/mb-t-phase-5-ctx-percent-findings-<date>.md`.

Followup updates to `docs/FOLLOWUPS.md`:
- File NEW Tier 2 `MB-F-PHASE-5-CTX-PERCENT-COMPACTION-AWARE-ACCOUNTING` (Sub-Q-D=(β/γ) deferral; closure path enumerated).
- File NEW Tier 3 `MB-F-PHASE-5-CTX-PERCENT-TOKENSUSED-PTY-SCRAPE-ACCURACY` (Sub-Q-A=(α) RATIFY assumption surfaced; PTY-scrape drift risk).
- File CLOSED-OR-ADVANCED `MB-F-PHASE-5-CTX-PERCENT-TOKENBUDGET-1M-VARIANT-COVERAGE` per WB2 ship (or partial-close if backend-actual model string differs from `'O4.7·1M'`).
- File NEW Tier 3 `MB-F-PHASE-5-CTX-PERCENT-RENDER-SITE-RECONCILIATION` per WB4 ship (CLOSED if Sub-Q-E=(β) selected; OPEN if Sub-Q-E=(α) accept-duplication).

**Acceptance:** findings doc + FOLLOWUPS new rows land. Commit body Q1-Q9.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED or filed by this ticket

| Followup / Row | Tier | Closure path | WB |
|---|---|---|---|
| `MB-F-PHASE-5-CTX-PERCENT-TOKENBUDGET-1M-VARIANT-COVERAGE` (NEW) | Tier 2 | Sub-Q-B=(β) WB2 GREEN | WB2 close / WB8 stamp |
| `MB-F-PHASE-5-CTX-PERCENT-RENDER-SITE-RECONCILIATION` (NEW) | Tier 3 | Sub-Q-E=(β) WB4 GREEN | WB4 close / WB8 stamp |
| `MB-F-PHASE-5-CTX-PERCENT-COMPACTION-AWARE-ACCOUNTING` (NEW) | Tier 2 | Sub-Q-D=(β/γ) deferred | WB8 forward-propagation filing |
| `MB-F-PHASE-5-CTX-PERCENT-TOKENSUSED-PTY-SCRAPE-ACCURACY` (NEW) | Tier 3 | Sub-Q-A=(α) RATIFY assumption + dogfood drift trigger | WB8 forward-propagation filing |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB1 may discover that Phase 4 model-source-wiring uses a different backend model string for 1M variant (e.g., `'claude-opus-4-7-1m'`) — file Tier 3 followup for lookup-key alignment.
- WB4 may discover that `terminal-header-bar.tsx` import path requires preload bridge update OR that the import crosses package boundary (frame-c → tile-grid territory) — coordinate via execution-phase WB1 reading scope.
- WB5 may surface React component rendering test setup quirks for happy-dom environment — matches T5 WB5 + T1 ladder precedent.
- WB7 smoke may surface bundling drift if `ctx-percent.ts` lands in `frame-c/` but renderer tile-header.tsx (in tile-grid/) imports across — verify auto-discovery per Wave B `2174f3a` bundled-via-tile-grid precedent.

### §5.3 — Related shipped tickets (read-required at execution-phase WB1 start)

| Ticket | Anchor | Read scope at execution-phase WB1 |
|---|---|---|
| MB-T-WIREFRAME-T1-SESSION-DATA-FLOW | `4414ef9` | sessions stream surface + `TileGridSessionEntry.tokensUsed`/`tokenBudget` field shape |
| MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE | `tile-header.tsx:129` + `session-list.tsx:175` sentinel zones | 3 ctx% render-site contract surface |
| MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE | `terminal-header-bar.tsx:11-24` | Frame C right-pane ctx% pill consumer |
| §C.5 PTY-scrape | `13b7607` + SPIKE `ef2dd3d` | `tile-token-scraper.ts` ANSI-strip + regex + 500ms debounce pattern |
| `model-context-windows.ts` | §C.5 WB4 | current 3-entry lookup; T-PHASE-5 extends |
| MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW | `155933f` | Sub-Q-A=(γ) daemon-aggregator pattern reference (NOT default path) |
| MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW | `afd3778` | source-of-truth Sub-Q decomposition reference |
| MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β | `40fde1e` | T6 α + β envelope operative per WB |

### §5.4 — Plan-doc anchors (read at execution-phase WB1 start)

- `docs/coordination/full-build-mode-dispatch.md` §1 wireframe-inventory ("Ctx N% token consumption" in left-rail + right-pane)
- `docs/coordination/phase-4-tier-1-roadmap-rev-2-2026-05-12.md` — NO ctx% row confirmed; T-PHASE-5 is genuine Phase 5 forward-position
- `docs/coordination/orchestrator-state-current.md` §8 auto-ack scope (α + β PASS conditions per T6 envelope)

### §5.5 — Anti-fabrication source-of-truth verification (`[KNOWN]`)

Every accuracy gap claim in §1 + §2.2 cites direct source read:
- ctx% 3 render sites: `tile-header.tsx:217-222`, `session-list.tsx:175-258`, `terminal-header-bar.tsx:11-24`
- Formula: `Math.round((tokensUsed / tokenBudget) * 100)` — verified at all 3 sites
- tokensUsed source: `tile-token-scraper.ts` §C.5 WB2 GREEN; PTY-scrape regex `/([0-9]+) tokens/g`; SPIKE `ef2dd3d`
- tokenBudget source: `model-context-windows.ts` §C.5 WB4; 3-entry lookup all at 200_000
- 1M variant gap: ModelHint enum `'O4.7·1M'` per CLAUDE.md project context; NOT in lookup → DEFAULT 200_000
- Comment trail confirming forward-positioning: `model-badge.ts:23-24` "(no tokenBudget ≠ context-window distinction at v3.0 ship)"
- Phase 4 rev-2 roadmap silence: grep "ctx" returns no rows

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

Each cairn-grammar commit body answers all nine questions. Expected shapes per WB type:

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | N/A — observational RED | BEHAVIOR (real getContextWindow call) | No — entry absent | No — probe-only | No | KNOWN/MODELED | new test path | N/A | No |
| WB2 GREEN | N/A — 1-line lookup-table addition is mechanical | BEHAVIOR (real getContextWindow call) | No — entry load-bearing | No | No (workstation-internal lookup; not frozen contract) | KNOWN/MODELED | model-context-windows.ts MOD; small file; low collision risk | N/A | No |
| WB3 RED | N/A | BEHAVIOR (real computeCtxPercent calls) | No — function absent | No — probe-only | No | KNOWN/MODELED | new probe | N/A | No |
| WB4 GREEN | spike-equivalent: helper extraction pattern is mechanical refactor | BEHAVIOR (real React render + 3-site coherence) | No — function load-bearing; 3 sites consume | No | No | KNOWN/MODELED | 3 render-site MODs + 1 NEW helper; coordinate with sibling sessions editing same files at execution dispatch | N/A | No |
| WB5 RED | N/A | BEHAVIOR (real React render via @testing-library/react + happy-dom) | No — coherence assertions depend on WB4 impl | No | No | KNOWN/MODELED | new probe | N/A | No |
| WB6 GREEN | N/A — ratification probe of existing impl | BEHAVIOR (real PTY-scrape regex execution) | No — ratification only | No | No | KNOWN/MODELED | new probe; no impl change | N/A | No |
| WB7 smoke | N/A | BEHAVIOR (real electron launch + α/β verify) | No — verifies WB1-WB6 integration | No | No | KNOWN per observed sentinels | none — observational | N/A | No |
| WB8 docs | N/A | N/A | N/A | No — docs/coordination/ + docs/FOLLOWUPS.md edits | No | KNOWN per direct ticket-execution evidence | pathspec-on-commit per MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION Tier 1 | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1-WB6 cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed to origin/main per CLAUDE.md §2.6.
2. **`model-context-windows.ts` extended with 1M variant entry** (Sub-Q-B=(β)): `'O4.7·1M': 1_000_000` (and any backend-string alias verified at WB1 reading scope).
3. **`computeCtxPercent` helper shipped** at `frame-c/ctx-percent.ts` (Sub-Q-E=(β)); div-by-zero + undefined guarded; rounds to integer.
4. **3 render sites consume helper**: `tile-header.tsx` + `session-list.tsx` + `terminal-header-bar.tsx` all import + use `computeCtxPercent`.
5. **5-package typecheck CLEAN** per CLAUDE.md §4.4.
6. **No regression in pre-existing baseline failures** per CLAUDE.md §4.5; PTY-scrape ratification probes (WB6) pass.
7. **WB7 runtime-launch smoke** confirms WINDOW_READY + 1M-variant ctx% renders correct ratio + α/β PASS.
8. **WB8 findings doc + FOLLOWUPS rows** land (4 NEW rows enumerated §5.1).
9. **Methodology-incident-free across WB1-WB8**: no anti-fabrication violations; no `git add -A`; pathspec-on-commit form applied throughout.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backend model-string for 1M variant differs from `'O4.7·1M'` ModelHint badge string (e.g., `'claude-opus-4-7-1m'`) | `[MODELED-MEDIUM]` | `[MODELED-MEDIUM]` (lookup miss; 1M variant defaults to 200_000) | WB1 reading scope verifies actual `TileGridSessionEntry.model` string at HEAD; WB2 adds whichever variant matches |
| `MB-T-PHASE-4-MODEL-SOURCE-WIRING` (Phase 4 rev-2 roadmap §1.1) STUB at execution time means no session populates 1M variant model string anyway → T-PHASE-5 1M fix is dormant until Phase 4 ships | `[KNOWN per phase-4-rev-2 §1.1]` | `[MODELED-LOW]` (T-PHASE-5 ships correct lookup; activation gated by Phase 4) | Document cross-dep in WB8 findings; close `MB-F-PHASE-5-CTX-PERCENT-TOKENBUDGET-1M-VARIANT-COVERAGE` as ADVANCED (not CLOSED) if Phase 4 dep pending |
| Helper extraction at WB4 introduces cross-package import (`frame-c/ctx-percent.ts` imported by `tile-grid/tile-header.tsx`) — coupling Frame C → tile-grid direction | `[MODELED-MEDIUM]` | `[MODELED-MEDIUM]` (existing precedent allows this; Frame C bundled via tile-grid renderer) | Verify at WB1 reading scope; alternative: place helper at workspace-shared location like `tile-grid/ctx-percent.ts` |
| Sub-Q-A=(α) RATIFY-PTY-scrape later discovered inaccurate vs Anthropic API definition under Phase 5 dogfood | `[SPECULATIVE]` | `[MODELED-MEDIUM]` (operator-load-bearing accuracy gap if drift visible) | File `MB-F-PHASE-5-CTX-PERCENT-TOKENSUSED-PTY-SCRAPE-ACCURACY` Tier 3 at WB8; escalate to Sub-Q-A=(β/γ) if dogfood shows drift |
| Sub-Q-D=(α) defer-compaction misses real accuracy gap if CC CLI doesn't re-render status bar post-compaction | `[SPECULATIVE]` | `[MODELED-MEDIUM]` | File `MB-F-PHASE-5-CTX-PERCENT-COMPACTION-AWARE-ACCOUNTING` Tier 2 at WB8; escalate to Sub-Q-D=(β) if dogfood evidence triggers |
| Round 11 §3.9 Wave 5 SPECULATIVE: Phase 4 dogfood may DISCARD this ticket if ctx% accuracy not surfaced as operator-load-bearing | `[KNOWN per dispatch STATUS FRAMING]` | `[MODELED-MEDIUM]` (8-WB equivalent scope discard) | Operator explicitly accepts revision-cost per Wave 5 dispatch; sub-Q resolutions at HALT-TICKET-BODY-PRE-COMMIT preserve operator pre-arbitration anchors |
| Cross-session staging contamination per Round 11 §3.9 stress regime | `[MODELED-MEDIUM]` | `[MODELED-HIGH]` (commit attribution + sibling work co-pollution risk) | **MANDATORY pathspec-on-commit form** per closure path α at EVERY WB commit (precedent: T5 12-WB pristine + T10 2-file pristine) |
| T6 α gate concurrent-push false STALE (`MB-F-METHODOLOGY-α-OVER-CONSERVATIVE-CONCURRENT-PUSH` Tier 3) | `[KNOWN]` | `[MODELED-LOW]` | Apply §8.α step 4 — investigate small-delta STALE before treating as blocker |

---

## §9 — Anti-fabrication audit

`[KNOWN per Round 11 §3.9 anti-fabrication check]`:
1. ctx% render at 3 sites — verified by `grep "ctx N\|ctx-percent" packages/dispatch-workstation/src/` returning 8 hits across `tile-header.tsx`, `session-list.tsx`, `terminal-header-bar.tsx`, `model-badge.ts`, `frame-c-root.tsx`.
2. Formula `Math.round((tokensUsed / tokenBudget) * 100)` — verified by `sed -n '210,240p' tile-header.tsx` showing `ctx {Math.round(tokenRatio * 100)}%` and grep at session-list.tsx:258.
3. tokensUsed source — `head -50 tile-token-scraper.ts` confirming `TOKEN_RE = /([0-9]+) tokens/g` + ANSI-strip + SPIKE `ef2dd3d` reference.
4. tokenBudget source — `head -50 model-context-windows.ts` confirming 3-entry lookup at 200_000 + DEFAULT 200_000.
5. 1M variant gap — CLAUDE.md project ModelHint enum confirms `'O4.7·1M'` is recognized badge; lookup does NOT have entry → DEFAULT applies → ratio under-states by 5x for 1M sessions.
6. Phase 4 rev-2 roadmap silence — `grep "ctx" phase-4-tier-1-roadmap-rev-2-2026-05-12.md` returns NO ctx% rows; confirms T-PHASE-5 is genuine Phase 5 forward-position.

`[SPECULATIVE]` per dispatch STATUS FRAMING:
- Phase 4 + Phase 5 visual-verification not yet triggered.
- Operator-load-bearing-ness of ctx% accuracy depends on dogfood evidence.
- Anthropic API tokensUsed semantics drift vs PTY-scrape regex is hypothesis without measurement.

`[MODELED]` recommendations cited at every Sub-Q with rationale chain anchored to `[KNOWN]` facts.

---

**End of MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW ticket body.**

Pending operator resolutions before execution dispatch:
- Sub-Q-T-PHASE-5-A (§3.1) — tokensUsed source (α RATIFY PTY-scrape (RECOMMENDED) / β API-headers / γ daemon / δ hybrid)
- Sub-Q-T-PHASE-5-B (§3.2) — tokenBudget source (α RATIFY static / β extended-static (RECOMMENDED) / γ operator-config / δ dynamic-discovery)
- Sub-Q-T-PHASE-5-C (§3.3) — 1M variant coverage (i fold into B (RECOMMENDED) / ii cross-dep Phase 4 / iii spike model-info API)
- Sub-Q-T-PHASE-5-D (§3.4) — compaction-aware accounting (α defer (RECOMMENDED) / β event subscription / γ ledger)
- Sub-Q-T-PHASE-5-E (§3.5) — render-site reconciliation (α accept-duplication / β helper extraction (RECOMMENDED) / γ precomputed field)

Plus conditional **HALT-WB-PRE-COMMIT** operator wording-review of `WORKSTATION_CONTRACT.md` §6.6 amendment IF Sub-Q-T-PHASE-5-A=(γ) daemon-aggregator selected.

`[KNOWN per Round 11 §3.9 Wave 5 STATUS FRAMING]`: SPECULATIVE Phase 5 forward-positioning; revision-cost explicitly accepted by operator. Post-Phase-4 + Post-Phase-5 evidence may RATIFY / RESHAPE / DISCARD.
