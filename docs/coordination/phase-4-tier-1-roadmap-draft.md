# PROVISIONAL — Phase 4 Tier 1 Ticket Roadmap (Draft)

**Status:** **PROVISIONAL** — pre-Phase-3-evidence. Revised post-Phase-3 once operator visual-verification surfaces residual gaps against the canonical wireframe target.
**Authored:** 2026-05-12 by P3 sub-session (`verify-chat-mount-1319`) under operator directive WORKSTREAM P3 (full-build-mode dispatch `4f0bbde` Round 9 parallelization).
**Goal:** minimize Phase 3 → Phase 4 lag time by pre-positioning Tier 1 ticket candidates anchored to **observable gaps** (no speculation-from-imagination per anti-fabrication §2.1). Every row cites a commit SHA / file path / FOLLOWUPS row / wireframe-target element. Speculative claims explicitly `[SPECULATIVE]`-labeled per CLAUDE.md §2.2.

**Forward-positioning, NOT final scoping.** Phase 3 operator screenshot evidence will RATIFY / RESHAPE / DISCARD rows. Treat this doc as a draft inventory of *plausible* tickets — not a commit-to-ship list.

---

## §0 — Reading protocol

1. §1 enumerates roadmap candidates organized by Phase 1 dispatch dimension (data-flow / methodology / visual polish / real-data accuracy / BUILD.md).
2. §2 lists explicitly-RULED-OUT items (closed by Phase 1 batch landings; do not re-author).
3. §3 lists Phase-3-entry preconditions (what evidence triggers which row's promotion to Phase 4 dispatch).
4. §4 lists parallelization partners (path-disjoint clusters for Phase 4 spawning).

Confidence labels per CLAUDE.md §2.2:
- `[KNOWN]` — direct observation of code/commit/followup row at HEAD `1685769` (T7 WB7 RED tip per git log at author time)
- `[MODELED]` — reasoned from Phase 1 findings docs + ticket bodies + Sub-Q deferrals
- `[SPECULATIVE]` — hypothesis without direct evidence; awaits Phase 3 visual verification

---

## §1 — Roadmap candidates

### §1.1 — Data-flow integration depth (T1 + T2 + T3 Sub-Q deferrals)

#### MB-T-PHASE-4-MODEL-SOURCE-WIRING

**Goal:** Populate `TileGridSessionEntry.model` from spawn-handler so renderer model-badge reflects actual session model rather than empty-fallback.

**Scope:** `[KNOWN]` T1 findings III.A row 2 documents `modelToLabel`/`modelToFamily` SHIPPED at renderer (commits `1b2c7a5` + `77deec0`); data-source STUB remains — `TileGridSessionEntry.model` defaults to `undefined`. Closure: modify `packages/dispatch-workstation/src/main/spawn-handler.ts` to thread CC spawn-result model string into `SpawnSessionResult.model`; propagate through `workstation:onSpawnResult` IPC payload (mirrors MB-T18 cwd propagation pattern at `cwd?: string` field per `frame-c-root.tsx:73` in current detail-pane integration). FrameCRoot + TileGridApp consume new field; SessionList already renders the badge when populated.

**Est WBs:** 4-6 (1 spike on CC spawn-result model field availability + 2 RED/GREEN spawn-handler extension + 1 RED/GREEN propagation + 1 docs).

**Parallelization candidates:** path-disjoint from MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE (sibling spawn-handler extension); coordinate via shared sentinel zone in spawn-handler.

**Preconditions:** none from Phase 1 (T1 + T3 LANDED). Could ship pre-Phase-3 if operator prioritizes.

**Anchor evidence:** T1 findings doc `docs/coordination/mbtwt1-findings-2026-05-12.md` §III.A row 2; T7 commit `77deec0` (per-family color coding shipped consuming this stubbed field); FOLLOWUPS row referenced via T1 follow-on filings.

---

#### MB-T-PHASE-4-STATUS-DERIVATION-FROM-PTY

**Goal:** Populate `'error'` / `'warning'` `TileStatus` values from real PTY signals so SessionList status dots reflect session health.

**Scope:** `[KNOWN]` T1 Sub-Q-C=(i) operator-acked extended `TileStatus` enum with `'error' | 'warning'` (commit `4051789`) BUT renderer-derived PTY-tail sentinel detection was explicitly out-of-scope per ticket body §1.2. Status dot color mapping shipped via `frame-c/status-color.ts`; values NEVER POPULATED at runtime. Closure: new sibling to `tile-token-scraper.ts` — `tile-status-scraper.ts` — that observes PTY chunks for `^Error:|Exception:|panic:` etc. patterns and emits `workstation:tile-status-update` IPC. Renderer subscription updates `TileGridSessionEntry.status` per session. `[MODELED]` Likely reuses `IConsoleBroadcaster` injection pattern from `tile-token-scraper.ts:registerTileTokenScraper`.

**Est WBs:** 6-8 (1 spike on PTY-sentinel patterns + 2 RED/GREEN scraper + 1 RED/GREEN IPC channel + 1 RED/GREEN renderer subscription + 1 docs). May require `WORKSTATION_CONTRACT.md` §6 amendment for new IPC channel — HALT-PRE-COMMIT-OPERATOR-ARBITRATION.

**Parallelization candidates:** path-disjoint from MB-T-PHASE-4-MODEL-SOURCE-WIRING + MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE; could spawn in parallel with both.

**Preconditions:** `[SPECULATIVE]` Phase 3 visual-diff may surface this as priority if green-only dot rendering looks demonstrably wrong vs wireframe target.

**Anchor evidence:** T1 findings doc §III.A row 1 ("Status DISPLAY is shipped; status DERIVATION from PTY signals is gap"); commit `4051789` (status-color.ts mapping) + `e339297` (probe-mbtwt1-03 conditions); §C.5 `13b7607` (tile-token-scraper.ts precedent pattern).

---

#### MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE

**Goal:** Replace mount-time uptime with true session-spawn-time so toggle/relaunch doesn't reset the displayed counter.

**Scope:** `[KNOWN]` T1 Sub-Q-D=(i) shipped renderer-internal mount-time uptime (commits `89d2ca1` + `1e10afc`) — semantics ≠ session-spawn-time per T1 findings. `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` Tier 3 filed with closure path (iii) ALREADY ENUMERATED: add `spawnedAtMs: number` field to `SpawnSessionResult` (sibling to MB-T18 cwd propagation); workstation-internal per §2.10; renderer reads via `TileGridSessionEntry`-extension.

**Est WBs:** 3-5 (1 RED/GREEN spawn-handler add `spawnedAtMs` + 1 RED/GREEN propagate through IPC + 1 RED/GREEN SessionList consume + 1 docs).

**Parallelization candidates:** sibling to MB-T-PHASE-4-MODEL-SOURCE-WIRING (both extend `SpawnSessionResult`); coordinate sentinel zone OR merge into single ticket "MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS" — recommend single-bundle to minimize duplicate cycles.

**Preconditions:** none.

**Anchor evidence:** `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` Tier 3 (filed in T1 findings doc §III.B); T1 findings §III.A row 3.

---

#### MB-T-PHASE-4-T2-HEADER-DATA-PATH

**Goal:** Replace `uptime —` + `plan —` placeholder text in TerminalHeaderBar with real data.

**Scope:** `[KNOWN]` T2 Sub-Q-C=(γ) operator-acked defer-with-placeholders (commit `fc6737f` + ticket body `30ab109`). `MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH` Tier 2 filed. Closure: thread `spawnedAtMs` (sibling to MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE) AND surface plan-name from existing rate-limit-state (T4 `PlanTimerText` pattern at `4dc4f32` already consumes `onRateLimitUpdate` — may have plan-name accessor).

**Est WBs:** 3-4 (1 RED/GREEN uptime wiring — depends on MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE; 1 RED/GREEN plan-name wiring; 1 docs).

**Parallelization candidates:** DEPENDS ON MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE; serialize.

**Preconditions:** MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE must ship first.

**Anchor evidence:** `MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH` Tier 2 (T2 findings §III); T2 findings doc `mb-t-wireframe-t2-findings-2026-05-12.md`; T4 commit `4dc4f32` (`PlanTimerText` + rate-limit-state precedent).

---

#### MB-T-PHASE-4-FILTER-STATE-PERSISTENCE

**Goal:** Persist Frame C filter state across Frame A↔C toggle + workstation re-launch.

**Scope:** `[KNOWN]` T1 Sub-Q-E=(α) operator-acked renderer-only useState (commit `ead45f9`). `MB-F-FRAME-C-FILTER-STATE-NOT-PERSISTED-2026-05-12` Tier 3 filed with closure path (β) ENUMERATED: NEW `main/frame-c-filter-state.ts` (mirror of `splitter-state.ts` 35-line pattern per CLAUDE.md §3.5) + NEW IPC `frame-c:get-filter-state` + `frame-c:set-filter-state`. **Requires `WORKSTATION_CONTRACT.md` §6 amendment per CLAUDE.md §2.4** — HALT-PRE-COMMIT-OPERATOR-ARBITRATION.

**Est WBs:** 4-6 (1 spike/ADR for IPC shape + 1 RED/GREEN state file + 1 RED/GREEN IPC handler + 1 RED/GREEN renderer wiring + §6 amendment commit + 1 docs).

**Parallelization candidates:** path-disjoint from data-flow tickets; coordinate §6 amendment with other Phase 4 IPC tickets (MB-T-PHASE-4-STATUS-DERIVATION-FROM-PTY if that path needs IPC too).

**Preconditions:** operator §6 amendment arbitration required.

**Anchor evidence:** `MB-F-FRAME-C-FILTER-STATE-NOT-PERSISTED-2026-05-12` Tier 3 (T1 findings §III.B); commit `ead45f9` (filter-bar component); `splitter-state.ts` precedent per CLAUDE.md §3.5.

---

#### MB-T-PHASE-4-SPAWN-MODE-FIELD

**Goal:** Add `spawnMode?: 'auto' | 'ask'` to `TileGridSessionEntry` so T3's `BypassPermsIndicator` reflects actual session bypass state.

**Scope:** `[KNOWN]` T3 Sub-Q-E=(ii) operator-acked spawnMode-per-session at commit `e713cbd`; FrameCRoot threads `spawnMode={undefined}` ship-shy (fallback (b)) because the `TileGridSessionEntry.spawnMode` field is absent. `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` Tier 2 filed. Closure: extend `TileGridSessionEntry` type in `tile-grid/tile-grid.tsx`; populate from `SpawnSessionRequest` at spawn-handler.ts.

**Est WBs:** 3-4 (1 RED/GREEN type extension + 1 RED/GREEN spawn-handler thread + 1 RED/GREEN renderer consume + 1 docs).

**Parallelization candidates:** sibling to MB-T-PHASE-4-MODEL-SOURCE-WIRING + MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE — STRONG candidate for single-bundle MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS ticket (3 field-extensions, 1 cycle).

**Preconditions:** none.

**Anchor evidence:** `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` Tier 2 (T3 findings §I); T3 commit `e713cbd` (WB8 spawnMode prop ship-shy default).

---

#### MB-T-PHASE-4-LOOKUP-SESSION-CLOSURE

**Goal:** Replace `lookupSession` STUB in `frame-c-ipc.ts` so diff/merge/focus actions resolve session paths instead of surfacing `SessionNotFound` failure banner under realistic dogfood.

**Scope:** `[KNOWN]` `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` Tier 2 (FOLLOWUPS.md row 329) remains OPEN per T3 Sub-Q-F=(ii) defer-to-separate-ticket disposition. Closure: integrate with daemon `/v2/sessions` GET endpoint OR workstation-side session-registry (mirrors MB-T8 onboarding project-list pattern).

**Est WBs:** 5-8 (1 spike on daemon vs workstation source + 1 RED/GREEN registry consumer + 2 RED/GREEN diff/merge/focus integration tests + 1 docs).

**Parallelization candidates:** path-disjoint from data-flow tickets; coordinate with MB-T-PHASE-4-FRAME-C-FOCUS-CONSUMER (downstream).

**Preconditions:** `[SPECULATIVE]` Phase 3 dogfood will surface SessionNotFound banner visibility — likely high-priority promote if visible to operator.

**Anchor evidence:** `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` Tier 2 (FOLLOWUPS.md row 329); T3 findings §I row 6 (Sub-Q-F=ii defer); T3 ticket body §III.

---

#### MB-T-PHASE-4-FRAME-C-FOCUS-CONSUMER

**Goal:** Implement consumer for `frame-c:scroll-to-session` IPC event so the focus action actually scrolls tile-grid to the session.

**Scope:** `[KNOWN]` T3 Sub-Q-D=(ii) operator-acked defer-to-T1-sibling. Bridge call shipped; `ipcRenderer.on('frame-c:scroll-to-session', ...)` in tile-grid renderer is missing. `MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` Tier 3 filed.

**Est WBs:** 2-3 (1 RED/GREEN tile-grid-app subscription + scrollIntoView + 1 RED/GREEN renderer-integration test + 1 docs).

**Parallelization candidates:** path-disjoint; smallest of the data-flow tickets — good fit for a low-context follow-on session.

**Preconditions:** none (additive consumer; bridge emitter already shipped).

**Anchor evidence:** `MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` Tier 3 (T3 findings §I row 4).

---

#### MB-T-PHASE-4-TOOL-PARSE-CC-FORMAT-DRIFT

**Goal:** Replace brittle regex-on-PTY-lines tool-indicator parser with a more robust source (CC's structured event stream, sidecar JSON, etc.).

**Scope:** `[KNOWN]` T2 Sub-Q-B=(i) operator-acked regex defaults (commit `0914bc6`). `MB-F-T2-TOOL-PARSE-REGEX-BRITTLE-CC-FORMAT-DRIFT` Tier 2 filed. `[SPECULATIVE]` Closure depends on whether CC exposes a structured tool-event channel — spike required.

**Est WBs:** 5-8 (1 spike on CC tool-event source availability + 2-3 RED/GREEN swap-parser-implementation + 1 docs). **HARD ESCALATION** if CC doesn't expose structured events — would defer to upstream CC fix.

**Parallelization candidates:** path-disjoint from other Phase 4 tickets; T2-internal change.

**Preconditions:** `[SPECULATIVE]` Phase 3 likely surfaces this only if a CC version-bump introduces format drift; until then, regex works.

**Anchor evidence:** `MB-F-T2-TOOL-PARSE-REGEX-BRITTLE-CC-FORMAT-DRIFT` Tier 2 (T2 findings); commit `0914bc6` (tool-indicator-parser).

---

#### MB-T-PHASE-4-EXTERNAL-SESSION-DEATH-RECONCILIATION

**Goal:** Daemon-SSE subscription so Frame C SessionList reconciles externally-killed sessions instead of showing stale entries.

**Scope:** `[KNOWN]` `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` Tier 2 (FOLLOWUPS.md row 271). Frame C inherits TileGridApp's missing daemon-SSE subscription per T1 findings cross-ref. Closure: `[MODELED]` add daemon-SSE consumer in `workstationBridge.onSessionEvent` (sibling to `onSpawnResult`).

**Est WBs:** 5-7 (1 spike on daemon SSE event shape + 2 RED/GREEN bridge extension + 2 RED/GREEN consumer wiring + §6 amendment + 1 docs). **§6 amendment required**.

**Parallelization candidates:** path-disjoint from spawn-result extensions; coordinate §6 amendment.

**Preconditions:** operator §6 amendment arbitration.

**Anchor evidence:** `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` Tier 2 (FOLLOWUPS.md row 271); T1 findings §III.B cross-ref.

---

### §1.2 — Methodology infrastructure (T6 γ/δ/ε)

#### ~~MB-T-PHASE-4-METHODOLOGY-γ-HEADLESS-SCREENSHOT~~ — SUPERSEDED PRE-PHASE-4

**Status:** `[KNOWN]` SUPERSEDED — concurrent P1 sub-session authored `MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING` ticket body at `030c2d6` (landed 2026-05-12 during this roadmap-authoring window). That ticket explicitly closes `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` (FOLLOWUPS.md:335) as its primary closure target and the full γ scope (headless electron + screenshot capture + image-diff pipeline + auto-ack §C extension).

**Implication:** γ closure is no longer a Phase 4 candidate — it is in current Phase 1+ cascade. If the P1 ticket ships pre-Phase-3, the γ row above is RULED OUT (moved to §2). If P1 ticket lands post-Phase-3, it may overlap with Phase 4 Wave 1 — coordinate scope at Phase 3 entry.

**Anchor evidence:** `030c2d6 docs(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): authored ticket body per P1 dispatch (γ closure-path scope; FOLLOWUPS row 335 closure target; expanded §C ticket-body auto-ack)`.

---

#### MB-T-PHASE-4-METHODOLOGY-δ-DOM-PROBES

**Goal:** Ship DOM-based runtime probes so CI catches "shipped but doesn't render" failure modes in tests rather than operator screenshots.

**Scope:** `[MODELED]` From `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` closure path δ. Likely closure: extend β bundle-inclusion verification with a DOM-mount-and-query phase using happy-dom/jsdom against the bundled `renderer.js`. Detects mount-resolve-but-doesn't-render gaps that β only catches as fingerprint-present.

**Est WBs:** 6-9 (1 spike on bundled-renderer-in-jsdom harness + 3 RED/GREEN DOM-probe lib + 2 RED/GREEN §C integration + 1 docs).

**Parallelization candidates:** path-disjoint from γ; could ship in parallel.

**Preconditions:** none.

**Anchor evidence:** `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` (`230cb6c`) closure path δ; T6 findings §III.A architectural delta 2 ("Auto-ack §C envelope evolved... Sub-sessions invoking GREEN auto-ack inherit the new gates").

---

#### MB-T-PHASE-4-METHODOLOGY-ε-VISUAL-DIFF

**Goal:** Automated wireframe-vs-shipped image diff so visual regressions are caught in CI rather than operator screenshots.

**Scope:** `[MODELED]` From `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` closure path ε. Depends on γ headless-screenshot pipeline AND canonical wireframe target image being committed (`docs/coordination/wireframe-target-2026-05-11.png` per dispatch §0).

**Est WBs:** 5-8 (1 spike on image-diff library + 2 RED/GREEN diff pipeline + 2 RED/GREEN tolerance calibration + 1 docs).

**Parallelization candidates:** DEPENDS ON γ; serialize.

**Preconditions:** γ headless-screenshot pipeline shipped (via the concurrently-authored `MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING` `030c2d6` if it lands pre-Phase-4); canonical wireframe target image committed to repo.

**Anchor evidence:** `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` (`230cb6c`) closure path ε.

---

### §1.3 — Visual polish completeness (residual after T7)

#### MB-T-PHASE-4-T7-RESIDUAL-VISUAL-GAPS

**Goal:** Close residual visual gaps surfaced by Phase 3 operator screenshot diff against canonical wireframe target.

**Scope:** `[SPECULATIVE]` Cannot enumerate concrete sub-items pre-Phase-3. Likely candidates `[SPECULATIVE]` based on dispatch §0 inventory + current T7 in-flight WB ladder:
- Tile-grid sticky-note paper texture (T7 WB4 shipped subtle bg; full texture may need refinement)
- Bottom rail layout precision vs wireframe spacing/proportion
- Filter dropdown styling fidelity (T7 WB7 in flight at HEAD `1685769`)
- Header bar typography density (T2 TerminalHeaderBar at `fc6737f` + T7 untouched)
- Status indicator dot rendering precision (color values currently placeholder per T7 WB2 `02c0807`)
- Model badge color refinement (T7 WB6 shipped Sub-Q-C=i defaults; operator visual-diff may refine per `MB-T-WIREFRAME-T7-VISUAL-POLISH` §3.1 HALT-T7-FINAL-PRE-PUSH)

**Est WBs:** `[SPECULATIVE]` 4-12 depending on Phase 3 finding count; recommend SINGLE follow-on ticket if ≤4 items OR PER-ITEM tickets if scope-divergent.

**Parallelization candidates:** [SPECULATIVE] depends on finding clusters.

**Preconditions:** Phase 3 operator screenshot evidence; T7 ladder COMPLETE.

**Anchor evidence:** dispatch §0 + §2 T7 workstream; T7 ticket body `8f5beac` HALT-T7-FINAL-PRE-PUSH operator-visual-diff gate (placeholder hex values cited at commit messages `be24ed8` + `77deec0`).

---

### §1.4 — Real-data accuracy (T4 cost/plan tracking)

#### MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION

**Goal:** `[SPECULATIVE]` Verify cost meter aggregates correctly per session AND surface per-session cost breakdown if currently global-only.

**Scope:** `[SPECULATIVE]` T4 WB8 shipped `BottomRailCostMeter` (commit `edb0fba`) consuming `onCostUpdate`. `[MODELED]` Likely aggregates daemon cost-info events; per-session attribution accuracy needs Phase-3 validation.

**Est WBs:** `[SPECULATIVE]` 3-6 if attribution exists but inaccurate; 6-10 if attribution absent and needs new IPC.

**Parallelization candidates:** sibling to MB-T-PHASE-4-PLAN-TIMER-ACCURACY; T4-territory cluster.

**Preconditions:** Phase 3 dogfood evidence on aggregation correctness.

**Anchor evidence:** T4 commit `edb0fba` (BottomRailCostMeter); dispatch §0 P3 "Cost meter accuracy" bullet.

---

#### MB-T-PHASE-4-PLAN-TIMER-RESET-COUNTDOWN-ACCURACY

**Goal:** `[SPECULATIVE]` Verify plan-timer reset countdown matches actual rate-limit expiry; refine if drift observed.

**Scope:** `[KNOWN]` T4 WB10 shipped `PlanTimerText` consuming `onRateLimitUpdate` (commit `4dc4f32`). `[SPECULATIVE]` Real-data validation per dispatch §0 P3 — depends on whether daemon's rate-limit-state field accuracy matches wireframe expectation `Max plan resets in 2h 47m` precision.

**Est WBs:** `[SPECULATIVE]` 2-5 depending on whether refinement is renderer-only or requires daemon-side rate-limit fidelity work.

**Parallelization candidates:** sibling to MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION.

**Preconditions:** Phase 3 dogfood evidence.

**Anchor evidence:** T4 commit `4dc4f32` (PlanTimerText + RateLimitState investigation); dispatch §0 P3 "Plan timer accuracy" bullet.

---

### §1.5 — BUILD.md fixtures + spawn-loop end-to-end (post-T5)

#### MB-T-PHASE-4-BUILD-MD-REAL-FIXTURE-CYCLE

**Goal:** `[SPECULATIVE]` Verify T5 BUILD.md parser + dispatch-loop against real repo BUILD.md fixtures (not synthetic) and confirm spawn-loop trigger end-to-end (BUILD.md ready-task → spawn-handler invocation → tile-grid mount).

**Scope:** `[KNOWN]` T5 ladder in flight at HEAD `1685769` — WB1-WB9 commits show parser + service + ipc + dispatch-loop + status-line shipped (commits `90b4f45` through `d0faf11`). `[SPECULATIVE]` Real-fixture validation is a likely Phase 4 gap if T5's WB ladder uses synthetic fixtures only.

**Est WBs:** `[SPECULATIVE]` 3-6 (1 spike on real-repo BUILD.md inventory + 1 RED/GREEN fixture set + 1 RED/GREEN end-to-end spawn-loop probe + 1 docs).

**Parallelization candidates:** path-disjoint from data-flow + methodology tickets.

**Preconditions:** T5 ladder COMPLETE (currently in flight); Phase 3 dogfood evidence on real-BUILD.md behavior.

**Anchor evidence:** T5 ticket body `c92f750`; T5 WB ladder commits `90b4f45` → `0e86966` → `6d5cf61` → `f9672ad` → `85c4491` → `5c53b04` → `2937170` → `4655a0e` → `d0faf11`; dispatch §0 P3 "BUILD.md parser (T5 ladder produces parser; Phase 4 may need real BUILD.md fixtures + spawn-loop trigger verification)".

---

## §2 — Explicitly RULED OUT (closed by Phase 1)

The following candidates from earlier roadmap brainstorming are RULED OUT — already shipped or actively shipping:

- **Session data flow renderer-side state binding** — CLOSED by T1 batch (`a8cd71d` WB4; `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` Tier 2 closure stamp).
- **Build-freshness gate (α)** — CLOSED by T6 WB2 (`e271329`).
- **Bundle-inclusion verification (β)** — CLOSED by T6 WB4 (`54d5b58`).
- **Auto-ack envelope §C extension for α + β** — CLOSED by T6 WB5 (`0d71590`).
- **TerminalStream + ToolIndicatorStrip + DetailPane HYBRID integration** — CLOSED by T2 batch (WB1-WB13 `fcf0c65` → `143b31d`).
- **ActionBar kill/diff/merge/focus + bypass-perms indicator + source label** — CLOSED by T3 batch (WB1-WB8 `5565a60` → `e713cbd`).
- **Frame C session-list status colors + model badge + uptime + filter bar** — CLOSED by T1 batch (WB5-WB11 `e339297` → `ead45f9`).
- **Bottom rail Conductor brand + max-parallel counter + cost meter + plan timer + bypass-perms indicator + BUILD.md tab placeholder + ChatTab/CommitsTab/BUILD.md tab switcher** — CLOSED by T4 batch (WB1-WB13 `bbf4a86` → `7abb649`).
- **Methodology γ headless-screenshot pipeline** — SUPERSEDED PRE-PHASE-4 by `030c2d6` `MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING` ticket body (P1 sub-session concurrent authoring; expanded §C auto-ack covers ticket-body landings). The §1.2 row above is preserved in struck-through form for archaeology.

Do not re-author any of the above as Phase 4 candidates.

---

## §3 — Phase-3-entry preconditions (promotion gates)

What Phase 3 evidence triggers WHICH Phase 4 row promotion to dispatch:

| Trigger | Rows promoted |
|---|---|
| Operator screenshot shows model badges empty/missing for active sessions | MB-T-PHASE-4-MODEL-SOURCE-WIRING |
| Operator screenshot shows status dots stuck on green for sessions with visible errors | MB-T-PHASE-4-STATUS-DERIVATION-FROM-PTY |
| Operator screenshot shows uptime reset after Frame toggle (or operator notices semantic drift) | MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE (+ MB-T-PHASE-4-T2-HEADER-DATA-PATH downstream) |
| Operator screenshot shows TerminalHeaderBar literal `uptime —` / `plan —` placeholders prominently | MB-T-PHASE-4-T2-HEADER-DATA-PATH |
| Operator complaint about filter state loss across Frame A↔C toggle | MB-T-PHASE-4-FILTER-STATE-PERSISTENCE |
| Operator screenshot shows BypassPermsIndicator never visible (always ship-shy) | MB-T-PHASE-4-SPAWN-MODE-FIELD |
| Operator dogfood surfaces `SessionNotFound` banner under realistic diff/merge/focus click | MB-T-PHASE-4-LOOKUP-SESSION-CLOSURE |
| Operator clicks focus action, no scroll-to-session occurs in tile-grid | MB-T-PHASE-4-FRAME-C-FOCUS-CONSUMER |
| Operator screenshot shows stale entries for externally-killed sessions | MB-T-PHASE-4-EXTERNAL-SESSION-DEATH-RECONCILIATION |
| Operator requests visual-diff auto-ack to remove manual screenshot bottleneck | ~~MB-T-PHASE-4-METHODOLOGY-γ-HEADLESS-SCREENSHOT~~ (SUPERSEDED — `030c2d6` ticket already authored) — promotion of MB-T-PHASE-4-METHODOLOGY-ε-VISUAL-DIFF once γ ships |
| Operator CI requirement for catch-shipped-but-not-rendered gap | MB-T-PHASE-4-METHODOLOGY-δ-DOM-PROBES |
| Operator visual-diff vs canonical wireframe target shows specific visual-polish gaps | MB-T-PHASE-4-T7-RESIDUAL-VISUAL-GAPS (sub-rows enumerated by operator) |
| Operator dogfood surfaces cost-meter inaccuracy or plan-timer drift | MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION + MB-T-PHASE-4-PLAN-TIMER-RESET-COUNTDOWN-ACCURACY |
| Operator surfaces BUILD.md-driven spawn-loop failure under real repo | MB-T-PHASE-4-BUILD-MD-REAL-FIXTURE-CYCLE |

---

## §4 — Parallelization clusters (Phase 4 spawn plan)

Recommended cluster decomposition for Phase 4 parallel dispatch (path-disjoint at file level):

**Cluster A — Spawn-handler field extensions (single bundled ticket recommended):**
- MB-T-PHASE-4-MODEL-SOURCE-WIRING
- MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE
- MB-T-PHASE-4-SPAWN-MODE-FIELD
- **Recommend:** single ticket "MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS" — 3 field-extensions, 6-8 WBs, single spawn-handler sentinel zone, single TileGridSessionEntry type extension cycle.

**Cluster B — IPC-amendment-requiring tickets (serialize on §6 amendment cycles):**
- MB-T-PHASE-4-STATUS-DERIVATION-FROM-PTY (`workstation:tile-status-update`)
- MB-T-PHASE-4-FILTER-STATE-PERSISTENCE (`frame-c:get-filter-state` + `frame-c:set-filter-state`)
- MB-T-PHASE-4-EXTERNAL-SESSION-DEATH-RECONCILIATION (daemon-SSE bridge `workstationBridge.onSessionEvent`)
- **Recommend:** bundle §6 amendment authoring into ONE operator-arbitrated commit covering all 3 channels; per-ticket implementation parallel after amendment lands.

**Cluster C — Renderer-only consumer additions (path-disjoint):**
- MB-T-PHASE-4-LOOKUP-SESSION-CLOSURE (frame-c-ipc.ts lookupSession; depends on Cluster B daemon-SSE OR alternative source)
- MB-T-PHASE-4-FRAME-C-FOCUS-CONSUMER (tile-grid-app subscription)
- MB-T-PHASE-4-T2-HEADER-DATA-PATH (depends on Cluster A spawnedAtMs)

**Cluster D — Methodology infrastructure (path-disjoint silo):**
- ~~MB-T-PHASE-4-METHODOLOGY-γ-HEADLESS-SCREENSHOT~~ SUPERSEDED by `030c2d6` MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING (pre-Phase-4 closure)
- MB-T-PHASE-4-METHODOLOGY-δ-DOM-PROBES
- MB-T-PHASE-4-METHODOLOGY-ε-VISUAL-DIFF (DEPENDS ON γ shipping; γ now in concurrent dispatch cycle, not Phase 4)

**Cluster E — Visual polish residual (single follow-on or per-item depending on Phase 3 finding count):**
- MB-T-PHASE-4-T7-RESIDUAL-VISUAL-GAPS

**Cluster F — Validation-driven (depends on Phase 3 dogfood evidence):**
- MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION
- MB-T-PHASE-4-PLAN-TIMER-RESET-COUNTDOWN-ACCURACY
- MB-T-PHASE-4-BUILD-MD-REAL-FIXTURE-CYCLE
- MB-T-PHASE-4-TOOL-PARSE-CC-FORMAT-DRIFT

**Suggested Phase 4 wave order** `[SPECULATIVE]` (operator may reshape):

1. **Phase 4 Wave 1** (4-6 concurrent): Cluster A bundle + Cluster C (3 tickets if Cluster A lands first) + Cluster D γ (path-disjoint methodology)
2. **Phase 4 Wave 2**: Cluster B (after §6 amendment) + Cluster D δ
3. **Phase 4 Wave 3**: Cluster E + Cluster F + Cluster D ε

---

## §5 — Open questions for operator (Phase 3 entry)

`[SPECULATIVE]` — items requiring operator decision before Phase 4 spawn:

1. **Bundle vs split for Cluster A** — single MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS (3 fields, 1 cycle) OR 3 separate tickets (1 field each, 3 cycles)?
2. **§6 amendment bundling for Cluster B** — single amendment commit for 3 channels OR per-ticket amendments?
3. **MB-T-PHASE-4-T7-RESIDUAL-VISUAL-GAPS scope** — single roll-up ticket OR per-item (after Phase 3 finding count is known)?
4. **MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION + MB-T-PHASE-4-PLAN-TIMER-RESET-COUNTDOWN-ACCURACY priority** — Phase 4 or deferred to v3.5.x polish window?
5. **MB-T-PHASE-4-TOOL-PARSE-CC-FORMAT-DRIFT trigger** — author proactively or wait for actual CC format-drift incident?

---

## §6 — Anti-fabrication audit

`[KNOWN]` — every ticket row above cites at least one of: commit SHA, FOLLOWUPS row ID, findings doc section, dispatch document line. Rows with `[SPECULATIVE]` scope explicitly mark speculation; rows with `[MODELED]` claims explicitly note the model. No ticket row invents a gap without a concrete anchor.

`[KNOWN]` — Phase 4 row count: 14 candidates after γ supersession (9 data-flow + 2 methodology δ/ε + 1 visual-polish + 2 real-data + 1 BUILD.md fixture). γ was 15th; now SUPERSEDED PRE-PHASE-4 by `030c2d6` concurrent authoring. Plus 1 Cluster A bundling recommendation = 15 distinct dispatch units.

`[MODELED]` — Phase 4 calendar estimate: 4-6 weeks at full-parallel intensity (15 tickets × 4-8 WBs avg = 60-120 WBs total; at 8-12 WBs/day across 4-6 concurrent sub-sessions = 5-15 work-days × 1.4 calendar conversion ≈ 1-3 weeks for the bulk + 1-3 weeks for sequential dependencies). Compare to full-build-mode dispatch §6 estimate "2-4 weeks at current cadence under maximum parallel intensity" — consistent within order-of-magnitude.

`[SPECULATIVE]` — Phase 4 ratification rate: speculative claim that ≥80% of these candidates will be RATIFIED by Phase 3 evidence (the remaining ≤20% RESHAPED or DISCARDED). No prior calibration data for this estimate; provided as planning hint, not commitment.

---

## §7 — Provenance + signing

**Authored by:** P3 sub-session (`verify-chat-mount-1319`) under orchestrator-2026-05-12-0953 (gen-4) dispatch /tmp/dispatch-p3.txt (Workstream P3 of Max-parallel Round 9 cascade).
**Authority:** operator full-build-mode dispatch §3.2 mechanical-translation framing — sub-session may draft Phase 4 candidate inventory; HALT-TICKET-BODY-PRE-COMMIT applies for any individual ticket body authoring (not this roadmap meta-doc).
**Anti-fabrication:** CLAUDE.md §2.1 enforced; every claim cite-anchored OR explicitly speculation-labeled.
**Status:** PROVISIONAL — revised post-Phase-3 visual-verification evidence.

---

**End of PROVISIONAL Phase 4 Tier 1 ticket roadmap (draft).**
