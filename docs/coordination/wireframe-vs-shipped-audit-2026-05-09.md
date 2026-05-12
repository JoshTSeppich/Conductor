# Wireframe vs Shipped — Codebase Audit

**Date:** 2026-05-10
**Anchored:** HEAD = `5704dd2` (`docs:(MB-T40) WB4 — findings doc + 5 new followup rows; chat-panel PTY refactor closure`)
**Spec sources:**
- Wireframe: `~/Downloads/conductor/project/wireframes.jsx` (601 lines) — operator-confirmed canonical at HALT 0
- Ticket inventory: `~/Downloads/wireframe-tickets-inventory.md` (536 lines) — operator-confirmed canonical at HALT 0
- Shipped code: `packages/dispatch-workstation/src/**`, `packages/dispatch-core/src/**`

**Session type:** Read-only audit (V3.5 Wireframe Audit Probe). No code modifications. No tests. No commits except this document.

**Confidence labels:** [KNOWN] = observed in this session via tool read. [MODELED] = reasoned from observed facts. [SPECULATIVE] = hypothesis without direct evidence.

---

## §0 — Meta-observation: Wireframe Spec Location

**[KNOWN]** The dispatch document (v3.5) referenced wireframes.jsx at `/Users/joshuatseppich/Desktop/Automata/foxworks-dispatch/wireframes.jsx` and `/mnt/project/wireframes.jsx` as canonical sources. Both paths do not exist. The actual files are at `~/Downloads/conductor/project/wireframes.jsx` and `~/Downloads/wireframe-tickets-inventory.md` — outside the repository, not version-controlled alongside the codebase.

**Consequence:** The wireframe spec is not anchored to any git commit in this repo. It is a standalone design artifact with no formal version history tied to the codebase. Any claim that a piece of code "implements wireframe spec X" must be traced to a specific line in the Downloads file, not to a committed path.

**Operator correction:** Canonical paths confirmed at HALT 0 as authoring drift in the dispatch document. Noted here so any future audit can locate the correct source.

---

## §1 — Executive Summary

The wireframe was authored mid-v3 development, concurrent with shipped chrome work. It is best understood as a directional UX vision document rather than the spec the codebase was built against. Shipped three-region shell predates wireframe authoring. Tile-grid foundation predates wireframe authoring. Chat-shell tab-host and multi-tab API shipped concurrent with wireframe authoring.

**Total element count across all six dimensions:** ~110 classified elements.

| Classification | Count (approx) | Primary dimensions |
|---|---|---|
| SHIPPED | ~40 | Dim 3 (Conductor), Dim 6 (Wiring) |
| SHIPPED-BEYOND-WIREFRAME | ~25 | Dim 6 (Wiring), Dim 3, Dim 4 |
| PARTIAL | ~18 | Dim 2 (Tile chrome), Dim 5 (Data model), Dim 6 |
| STUB | ~8 | Dim 2, Dim 5, Dim 6 |
| WIREFRAME-VISION-NOT-SHIPPED | ~20 | Dim 4 (Frame shell), Dim 3, Dim 1 |
| ARCHITECTURAL-MISMATCH | ~12 | Dim 1 (Frame layout), Dim 4, Dim 5 |

**Load-bearing strategic finding:** The wireframe-vs-shipped delta is not a feature-count gap. It is a layout-architecture gap (Dim 1), a data-model gap (Dim 5), and a visual-separation gap (Dim 2). The conductor panel (Dim 3) and wiring substrate (Dim 6) are in near-parity or ahead of wireframe vision. Closing the wireframe gap requires operator decisions on architecture (frame-switching vs three-region) before ticket authoring can proceed.

### §1.A — Honest Framing on Shipped Chrome (Dim 2/5 callout)

Tile headers render shape-correctly: status dot (3 colors), session name, branch label, model chip, token meter bar, footer uptime and cwd path. These components produce a visually plausible tile chrome. **However:** branch defaults to 'main', model chip defaults to 'claude-sonnet-4-6', token meter is always 0, and footer uptime measures time since the tile mounted in the current window — not session spawn time. A reviewer observing the shipped UI must not interpret rendered chrome as evidence of real data flow. The shape is correct; the data is stub.

### §1.B — Bidirectional Chrome Divergence (Dim 2 callout)

Shipped tile chrome and wireframe tile chrome diverge in both directions. Wireframe has elements shipped doesn't: `ctx N%` text, max-plan footer field, visual tile separation (border/radius/gap). Shipped has elements wireframe doesn't: approval-policy picker, autopilot toggle, collapse/expand, detach-to-window. The gap is shape-mismatch, not feature-count. Neither is a strict subset of the other. Closing the gap requires both removing false impressions (no real token data) and adding wireframe-vision elements (tile borders, ctx text).

### §1.C — Conductor Panel Near-Parity (Dim 3 callout)

The Conductor panel is the strongest-parity dimension. Chat tab body (bubbles, quick-pick, spawned-list, input, send), tab-host structure, and commits tab are fully SHIPPED and functional. Gaps are wiring (BUILD.md tab — MB-T23 open; mix-indicator model field unplumbed) and chrome (bypass-perms pill, max-parallel pill, BUILD.md pill near input, Conductor label). These are additive gaps, not structural mismatches. The two ARCHITECTURAL-MISMATCH findings (panel position = bottom strip vs side panel; header-bar layout = flat toolbar vs chead-alongside-tabs) both trace to the Dim 1 three-region architecture decision, not to independent component design choices.

### §1.D — Shell Chrome Predicated on Frame-Switching (Dim 4 callout)

The `#header-bar` contains one button (Spawn). The wireframe toolbar has 7+ elements. This is not an implementation gap — it is an architectural consequence. Every wireframe toolbar element (Load BUILD.md, Pause All, N/M running pill, bypass-perms pill, PlanRing, MixIndicator) is predicated on a frame-switching model (Frames A/B/C/D) and a global session-status surface that do not exist in the shipped three-region shell. The filter row is similarly predicated on session-list metadata (status/repo fields) that are MISSING or STUB in the data model. Before shell chrome tickets can be written, the Dim 1 architecture decision must be made.

### §1.E — Wiring Substrate Beyond Wireframe Scope (Dim 6 callout)

Shipped wiring infrastructure is more sophisticated than wireframe vision. The wireframe is pure in-process React state (MOCK_SESSIONS array). Shipped has: 6 named contextBridge surfaces (coarchitectBridge, shellBridge, workstationBridge, consoleBridge, dispatchModeBridge, commitsBridge), PTY dual-routing (per-tile xterm.js + orchestrator-relay), ask-mode spawn gate with confirmation modal, cost ledger (Anthropic usage → USD via cost-calc.ts), rate-limit header capture (plan-usage ring), and per-session approval-policy round-trip with Zod validation. None of these are specced by the wireframe; all should be preserved in any closure plan.

---

## §2 — Dimension 0: Shell Architecture

**[KNOWN]** Shipped workstation shell is a five-region flex column defined in `packages/dispatch-workstation/src/main/workstation-shell.html`:

```
#shell (flex column, height: 100%)
  #header-bar       36px fixed — spawn button only
  #kanban-region    flex: 1 — dispatch-web kanban webview
  #console-tile-region  flex: 1 1 auto — TileGridApp React root
  #splitter         6px draggable ns-resize divider
  #chat-region      280px (default), operator-resizable
```

**[KNOWN]** This three-region concurrent stack predates wireframe authoring. It is not an implementation of any wireframe Frame (A/B/C/D). All four wireframe Frames assume a mutually-exclusive layout-switching model inside a single `FrameShell` wrapper. Shipped renders all three primary regions simultaneously, always visible (modulo TileGrid returning null when no sessions).

**[KNOWN]** Additional overlaid elements: `#spawn-modal` (spawn form dialog), `#spawn-confirm-modal` (ask-mode gate dialog, MB-T24), `#spawn-result-banner` (spawn feedback toast, fixed top-right). These are functional additions with no wireframe equivalent.

---

## §3 — Dimension 1: Frame Layout

*Sources: `wireframes.jsx:365-575` (Frames A/B/C/D + FrameN design notes), `tile-grid.tsx`, `tile-layout.ts`, `tile-hero-squad-layout.ts`, `tile-grid-state.ts`.*

| Element | Classification | Evidence |
|---|---|---|
| Frame A — dense 4×4 CSS grid (`.grid.grid-4x4`) | ARCHITECTURAL-MISMATCH | Wireframe: `.grid.grid-4x4`, fixed 4×4 CSS class. Shipped: `computeGridLayout(n)` in `tile-layout.ts` — auto-sizes 1×1 to 2×4+overflow based on session count. No `.grid-4x4` class anywhere. Same general concept (multi-session tile grid), different layout model (dynamic vs fixed). [KNOWN — `tile-layout.ts:1-133`] |
| Frame B — hero + squad (`.grid.grid-hero`) | PARTIAL | Shipped: `computeHeroSquadLayout()` in `tile-hero-squad-layout.ts` (hero 75% / squad 25%), `HERO_ROW_SIZE='75%'`. Activation requires operator hand-edit of `tile-grid-state.json` (`heroSessionName` field) + workstation restart. No UI affordance. MB-F-T19-MUTATION-UI (Tier 2, open). [KNOWN — `tile-hero-squad-layout.ts`, `tile-grid-state.ts:readHeroSessionName()` docstring] |
| Frame C — listview + detail (`.listview`, wireframe-recommended primary) | **SHIPPED** (was WIREFRAME-VISION-NOT-SHIPPED at audit-anchor `5704dd2`) | **Closed at `ea11bc7 green(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): WB10 — main.ts wiring sentinel zone + tile-grid/mount.ts tryAutoMountFrameC factory + workstation-shell.html sizing CSS` 2026-05-11** (final WB GREEN landing in 11-WB cairn ladder: WB1 RED `c5f98d5` mount factory probe → WB2 GREEN `2174f3a` scaffold `src/frame-c/` → WB3 RED `42c0f48` SessionList probe → WB4 GREEN `92eb23c` SessionList component → WB5 RED `8f88f7a` selection-state probe (Sub-Q-A=α negative-IPC-absence) → WB6 GREEN `2c55804` controlled-component useState wiring → WB7 RED `2bc5cda` DetailPane + swarm-state.md query probe → WB-§6 contract `0f0e762` consolidated WORKSTATION_CONTRACT.md §6.6 amendment cross-session co-authored with T3 → WB8 GREEN `525c502` DetailPane + workstation:read-swarm-state IPC → WB9 RED `aa18302` main.ts wiring source-text probe → WB10 GREEN `ea11bc7` tryAutoMountFrameC + sizing CSS). Surfaces SHIPPED: (1) `src/frame-c/` directory (5 files: mount.tsx + frame-c-root.tsx + session-list.tsx + detail-pane.tsx + index.ts); (2) renderer-only selection state via `useState` in FrameCRoot per Sub-Q-MBTWBFCS-A=(α) operator pre-arbitration 2026-05-11; (3) DetailPane reads `docs/swarm-state.md` via new `workstation:read-swarm-state` IPC channel + `workstationBridge.readSwarmState()` bridge surface per Sub-Q-MBTWBFCS-B=(i); (4) `<div id="frame-c-root">` DOM region + visibility CSS preserved from §C.1′ `44764fd` (ticket #1 stub) + augmented with sizing CSS (WB10 sentinel zone) for actual render at runtime; (5) `tryAutoMountFrameC()` auto-mount factory in `tile-grid/mount.ts` (renderer-side; bundled into `dist/tile-grid/renderer.js` via esbuild import-graph traversal per CLAUDE.md §3.7 sub-mount convention). Probes: `test/unit/frame-c/probe-mbtwbfcs-{01-05}.spec.tsx` (5 files, 23 it-blocks; 23/23 GREEN at WB11). Runtime-launch smoke: WINDOW_READY sentinel observed in 12s window per CLAUDE.md §4.6; operator-empirical visual verification pending per `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` (Tier 1 at `64d9249`) — structural ship closure per `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` (Tier 1 at `c2abb28`) framing; visual-completeness gap remains for second-order cycle. Findings doc at `docs/coordination/mb-t-wireframe-c1p2-frame-c-surface-findings-2026-05-11.md`. Empty-sessions stub at WB10 per Q-WB10-B=(α); sessions-stream integration deferred via `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` (Tier 2). Original-audit evidence preserved for archaeology: ~~Wireframe `FrameN` design notes (line 546-575): "Ship C (List + Detail) as primary mode." No `.listview` or list+detail layout in shipped code. `grep -rn "listview\|col-list\|col-detail" packages/dispatch-workstation/src/` returns empty.~~ [KNOWN — `src/frame-c/` directory + audit anchor cairn chain] |
| Frame D — ASCII box-drawing (text-only) | WIREFRAME-VISION-NOT-SHIPPED | No ASCII rendering in shipped code. `grep -rn "ascii\|box-draw" packages/dispatch-workstation/src/` returns empty. [KNOWN] |
| Frame switching mechanism (tab router / mode toggle) | WIREFRAME-VISION-NOT-SHIPPED | Wireframe implies mutually-exclusive Frame selection. No frame-switch affordance exists in `workstation-shell.html` or any shipped component. [KNOWN — `workstation-shell.html` read in full] |
| Three-region concurrent stack | ARCHITECTURAL-MISMATCH | Shipped `#shell` renders kanban + tile-grid + chat-region simultaneously and persistently. Wireframe Frames are mutually-exclusive layout modes selected by the operator. Fundamentally different architectural model. [KNOWN — §2] |
| Kanban webview region (`#kanban-region`) | SHIPPED-BEYOND-WIREFRAME | dispatch-web kanban (React kanban board) rendered via `<webview>` in `#kanban-region`. Wireframe has no kanban concept — it uses tiled Pane components as the session display surface. Entirely different session-view paradigm added beyond wireframe scope. [KNOWN — `workstation-shell.html:232-234`] |
| Auto-sizing tile grid (dynamic layout by session count) | SHIPPED-BEYOND-WIREFRAME | `computeGridLayout(n)`: 1→1×1, 2→1×2, 3-4→2×2, 5-6→2×3, 7-8→2×4, 9+→2×4+overflow. Wireframe specifies fixed named frames. Auto-sizing is a shipped architectural choice beyond wireframe scope. [KNOWN — `tile-layout.ts`] |

**Strategic finding (Dim 1):** Closing the frame-layout gap is layout-rearchitecting scope, not component-building scope. Frame C (listview + detail) is the wireframe-recommended primary mode and is entirely absent. Frame A requires a layout-model change (fixed 4×4 vs dynamic auto-sizing). A frame-switching mechanism must be built before any frame-specific chrome makes sense. This is the most consequential architectural gap in the audit.

**§3 amendment 2026-05-11 (post MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB10 `ea11bc7`):** Frame C row (line 92 above) reclassified WIREFRAME-VISION-NOT-SHIPPED → **SHIPPED** at the structural level. Frame-switching mechanism (§C.1′ ticket #1 Frame Router at `44764fd`) already closed the toggle-UI + persistence gap; this ticket's 11-WB cairn ladder closes the Frame-C-functional-surface gap: `src/frame-c/` directory (mount.tsx + frame-c-root.tsx + session-list.tsx + detail-pane.tsx + index.ts) + WB-§6 contract amendment (`0f0e762` consolidated co-authored §6.6 with T3's `frame-c:{diff,merge,focus}` channels) + tile-grid renderer-bundle sub-mount inclusion via esbuild import-graph + workstation-shell.html sizing CSS (WB10 sentinel zone) for actual visible render. Two Dim 1 rows now have explicit SHIPPED-classification cairn-citation paths: Frame C (this amendment); the §C.1′ frame-switching mechanism at `44764fd` (visibility cited inline in Frame C row evidence). Frame A (line 90; ARCHITECTURAL-MISMATCH dynamic-grid-layout) remains open — separate ticket scope. Visual-completeness gap remains per `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` (Tier 1 at `c2abb28`); operator-empirical visual verification pending per `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` (Tier 1 at `64d9249`). Findings doc at `docs/coordination/mb-t-wireframe-c1p2-frame-c-surface-findings-2026-05-11.md`.

---

## §4 — Dimension 2: Tile Chrome

*Sources: `tile.tsx`, `tile-header.tsx`, `tile-footer.tsx`, `color-helpers.ts`, `tile-approval-picker.tsx`, `tile-autopilot-toggle.tsx`, `console-panel.tsx`, `wireframes.jsx:223-248`.*

**Three-tier integration pattern (shipped architectural discipline):**
- **RENDERER-INTEGRATED:** Components defined in tile.tsx/tile-header.tsx; receive data as props; no bridge access. Tier: TileHeader, collapse/expand button, kill button.
- **MOUNTED-VIA-RENDER-PROP:** Constructed by TileGridApp as render-prop closures; bridge references held at TileGridApp level; Tile.tsx is bridge-free. Tier: TileApprovalPicker, TileAutopilotToggle, TileFooter.
- **DECOUPLED:** Architecturally separate; mounted independently; no React props from tile tree. Tier: ConsolePanel (xterm.js).

This pattern is an architectural discipline that should be preserved in any chrome closure work.

### §4.1 — Wireframe Pane Elements vs Shipped

| Element | Classification | Evidence |
|---|---|---|
| **Tile-level visual separation** (border, radius, background, gap between tiles) | **SHIPPED** (was WIREFRAME-VISION-NOT-SHIPPED at audit-anchor `5704dd2`) | **Closed at `510071e green(§B.1): tile visual separation — gap + cell border/radius/background` 2026-05-10 18:31** (audit author cited §10.2 closure-path in commit body — same element, different cross-reference framing within this doc: §4.1 = element classification table, §10.2 = closure-path scoring at line 471). Implementation via INLINE STYLES on a NEW `tile-cell-${name}` wrapper in `tile-grid.tsx:344` (`gap:'4px'`), `:380` (border/borderRadius/background/overflow:hidden on cellStyle), `:391` (`data-testid` wrapper). NOT the workstation-shell.html CSS-class approach proposed at later ticket body `e41c9ea` (that ticket body authored on stale audit premise; CLOSED as SUPERSEDED-BY-PRE-SHIPPING per `MB-F-W3-BATCH-1-STALE-DISPATCH-2026-05-11` row in FOLLOWUPS.md). Probe at `test/unit/tile-grid-grid/probe-04-tile-visual-separation.spec.tsx` 2/2 GREEN at HEAD. Original-audit evidence preserved for archaeology: ~~Wireframe `.pane` has visual chrome separating each tile. Shipped tiles are bare `<div data-testid="tile-{name}">` — no border, no radius, no background. `#tile-grid-root` is `display:block` with no gap. This is the **largest perceptual gap and cheapest to close** (CSS-only). [KNOWN — `workstation-shell.html:63-67`, `tile-grid.tsx`]~~ |
| Status dot | PARTIAL | SHIPPED: inline-style 8×8px circle. Colors: open→green (#10b981), killed→red (#ef4444), idle/detached→gray (#6b7280). Wireframe `dotClass(state)`: maps "ok"/"run"/"warn"/"err"/"idle". **Gap:** yellow is allocated (WARN_HEX='#facc15') but explicitly reserved/unused in v3.0. [KNOWN — `color-helpers.ts:statusDotColor`, comment "yellow reserved"] |
| Session name (tile name) | SHIPPED | `TileHeader` renders session name from `sessionName` prop. Matches wireframe `.name` span. [KNOWN — `tile-header.tsx`] |
| Branch label (`⎇ branchName`) | STUB | Renders `⎇ main` (hardcoded default `branchName='main'`). No IPC channel populates branch from daemon or git. [KNOWN — `tile-header.tsx:default props`] |
| Model chip with color coding | PARTIAL | `modelChipShortcode(sdkName)`: known SDK names → S4.6/O4.6/O4.7·1M/H. Colors: placeholder hex (MB-F-T15-MODEL-CHIP-HEX-COLORS-PLACEHOLDER, Tier 2, open). Chip hidden when sdkName is null or unknown. Default `model='claude-sonnet-4-6'` → always shows S4.6 chip. No real model field from daemon. [KNOWN — `color-helpers.ts`, `tile-header.tsx`] |
| Token meter bar (visual fill) | STUB | Renders 40×6px bar. Fill width = `tokensUsed / tokenBudget`. Defaults: `tokensUsed=0`, `tokenBudget=200_000` → fill always 0%. No data path populates these fields. [KNOWN — `tile-header.tsx:default props`] |
| `ctx N%` text label | **SHIPPED** (was WIREFRAME-VISION-NOT-SHIPPED at audit-anchor `5704dd2`) | **Closed at `bd31b94 green(MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE): WB4 — detail-pane.tsx ctx N% inline text rendering + frame-c-root.tsx tokens prop threading` 2026-05-11** (final WB GREEN landing in 6-WB cairn ladder: WB1 RED `f7b2e70` → WB2 GREEN `d5ba210` session-list.tsx → WB5 RED `e18a5a3` → WB6 GREEN `8205b01` tile-header.tsx → WB3 RED `8b3f356` post-Wave-B-WB8-clearance → WB4 GREEN `bd31b94` detail-pane.tsx + frame-c-root.tsx threading). All three operator-pre-arbitrated wireframe surfaces (Frame C session-list rows + Frame C detail-pane + tile-header per Sub-Q-MBTWTWS-A=(iv) sibling integration) render `ctx N%` inline next to existing content per Sub-Q-MBTWTWS-B=(a). Data path SHIPPED at §C.5 `13b7607` (`tile-token-scraper.ts` → `workstation:tile-token-update` IPC → `TileGridSessionEntry.tokensUsed` / `tokenBudget`); this ticket added the visible-text-rendering subset. Probes: `test/unit/frame-c/probe-mbtwtws-01-session-list-ctx-text.spec.tsx` (5 it-blocks) + `test/unit/frame-c/probe-mbtwtws-02-detail-pane-ctx-text.spec.tsx` (6 it-blocks) + `test/unit/tile-grid-tile/probe-mbtwtws-03-tile-header-ctx-text.spec.tsx` (5 it-blocks) — 16/16 GREEN; consumer non-regression at every WB. Original-audit evidence preserved for archaeology: ~~Wireframe: `ctx {Math.round(s.tokens*100)}%` rendered inline with meter. Shipped: token percentage in `title=` tooltip only; no visible text. [KNOWN — `tile-header.tsx`]~~ |
| Body: terminal tail (compact = last 3 lines) | ARCHITECTURAL-MISMATCH | Wireframe: structured `s.lines` array `{c: CSSclass, t: string}` — pre-classified, rendered with colored spans. Shipped: raw PTY bytes → xterm.js terminal (full ANSI escape code processing). Neither is a subset of the other; they are different rendering models. [KNOWN — `console-panel.tsx`, Dim 5 finding] |
| Footer: ⚠ bypass-perms warning | PARTIAL | `bypassWarning` prop on TileFooter renders ⚠ when true. But prop is never set in TileGridApp's `renderFooterSlot` — no data path delivers bypass-perms status from daemon to TileFooter. Renders as absent in practice. [KNOWN — `tile-footer.tsx`, `tile-grid-app.tsx:318-326`] |
| Footer: cwd / repo path | PARTIAL | `cwd` field from SpawnSessionResult propagates to TileFooter → renders truncated path with title= tooltip. Wireframe shows `·repo` (short repo name, not full path). Cwd ≠ repo name. [KNOWN — `tile-footer.tsx`, `tile-grid-app.tsx:119-124`] |
| Footer: time (uptime) | PARTIAL | `TileFooter` computes uptime from `Date.now()` snapshot at mount with 5s tick. Wireframe: `s.time` is session duration since spawn (HH:MM). Shipped: time since tile mounted in current window — resets on window restart. Semantics differ. [KNOWN — `tile-footer.tsx`] |
| Footer: max-plan | WIREFRAME-VISION-NOT-SHIPPED | Wireframe footer: `{time}·max-plan`. No max-plan field or text in TileFooter. [KNOWN — `tile-footer.tsx:1-109`] |
| Kill button | SHIPPED | Kill button in tile header. `handleKill(name)` → `setSessions(filter)`. [KNOWN — `tile.tsx`, `tile-grid-app.tsx:207-209`] |
| Approval-policy picker | **SHIPPED-BEYOND-WIREFRAME (conditionally hidden under compact mode per `30e362c`)** | **Conditional-hide annotation 2026-05-11 (MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE WB2 `30e362c`):** `tile.tsx` now branches on `frameMode === 'A'` and suppresses the picker-slot closure invocation under compact mode (Sub-Q-MBTWBCTM-A=(i) strict wireframe-alignment). Production-wiring gap: `tile-grid-app.tsx` does NOT yet subscribe to FrameMode → prop undefined in production → full chrome renders unconditionally until `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` closes. Original-audit evidence: ~~`TileApprovalPicker` (tight/medium/loose select). Full daemon round-trip via approval-policy-ipc.ts. Optimistic PUT with rollback. Zod-validated. No wireframe equivalent. [KNOWN — `tile-approval-picker.tsx`]~~ |
| Autopilot toggle | **SHIPPED-BEYOND-WIREFRAME (conditionally hidden under compact mode per `30e362c`)** | **Conditional-hide annotation 2026-05-11 (MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE WB2 `30e362c`):** `tile.tsx` branches on `frameMode === 'A'` and suppresses the autopilot-slot closure invocation under compact mode. Same production-wiring gap as the picker row above; closure of `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` activates end-to-end Frame A behavior. Original-audit evidence: ~~`TileAutopilotToggle` (checkbox/switch). Workstation-side only (`autopilot-state.json`). No daemon route. No wireframe equivalent. [KNOWN — `tile-autopilot-toggle.tsx`]~~ |
| Collapse / expand | **SHIPPED-BEYOND-WIREFRAME (conditionally hidden under compact mode per `30e362c`)** | **Conditional-hide annotation 2026-05-11 (MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE WB2 `30e362c`):** `tile.tsx` wraps the `tile-collapse-btn` element in `{!isCompact && (...)}`. Same production-wiring gap. Original-audit evidence: ~~Collapse button in tile header; persisted via `tile-grid-state.ts`. No wireframe equivalent. [KNOWN — `tile.tsx`, `tile-grid-app.tsx:211-219`]~~ |
| Detach to separate window | **SHIPPED-BEYOND-WIREFRAME (conditionally hidden under compact mode per `30e362c`)** | **Conditional-hide annotation 2026-05-11 (MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE WB2 `30e362c`):** `tile.tsx` wraps the `tile-detach-btn` element in `{!isCompact && (...)}`. Same production-wiring gap. Original-audit evidence: ~~Detach button opens `console-panel.html?session=name` in new BrowserWindow. No wireframe equivalent. [KNOWN — `tile.tsx`, `tile-grid-app.tsx:221-243`]~~ |

**Strategic finding (Dim 2):** Bidirectional asymmetric divergence — neither shipped nor wireframe is a strict subset. The cheapest closure target is tile-level visual separation (CSS-only, single WB). The most consequential data gaps are token meter (no IPC source) and branch label (no IPC source). The three-tier integration pattern is a shipped architectural discipline that must be preserved in any closure ticket.

**§4.1 amendment 2026-05-11 (post MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE WB2 `30e362c`):** Compact-tile-mode component contract shipped — `Tile` branches on `frameMode === 'A'` to suppress the 4 SHIPPED-BEYOND-WIREFRAME chrome rows above (approval-picker, autopilot, collapse, detach) per Sub-Q-MBTWBCTM-A=(i) strict wireframe-alignment. Bidirectional-asymmetric-divergence is **one-half-closed at the Tile component layer**; end-to-end Frame A toggle production behavior requires `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` Tier 2 closure (renderer-side TileGridApp → tile.tsx prop-drill of FrameMode subscription, deferred from `44764fd` Frame Router scope). The three-tier integration discipline is preserved — `Tile` remains RENDERER-INTEGRATED + bridge-free; `frameMode` arrives via prop-drill per Sub-Q-MBTWBCTM-B=(α). Probe-mbtwbctm-01 (4/4 GREEN at `30e362c`) pins the component contract; production end-to-end remains pending.

**§4.1 amendment 2026-05-11 (post MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB4 `bd31b94`):** `ctx N%` text label row (line 124) reclassified WIREFRAME-VISION-NOT-SHIPPED → **SHIPPED** across THREE wireframe surfaces in one ticket per Sub-Q-MBTWTWS-A=(iv) +tile-header sibling integration + Sub-Q-MBTWTWS-B=(a) inline-not-stacked format. Surfaces: (1) Frame C session-list rows render `<span data-testid="frame-c-session-row-ctx-text-{name}">ctx N%</span>` right-aligned via flex `marginLeft:auto`; (2) Frame C detail-pane renders `<span data-testid="frame-c-detail-pane-ctx-text">ctx N%</span>` in a new META_ROW flex wrapper alongside the session-name header; (3) tile-header renders `<span data-testid="tile-header-ctx-text">ctx N%</span>` as a SIBLING of the existing `tile-header-token-meter` div (anti-regression sentinel pinned via probe-mbtwtws-03 Condition 4: MB-T15 meter contract preserved — bar element + fill element + `data-testid`s + fill-width still tracks ratio). Data-source binding: all three surfaces consume `tokensUsed?` / `tokenBudget?` from `TileGridSessionEntry`; detail-pane's binding goes through a new `selectedEntry = sessions.find(s.name === selected)` lookup in FrameCRoot threaded via WB4 prop-extension on DetailPaneProps (`tokensUsed?: number` + `tokenBudget?: number`) per ticket body §8 risk register row 2 anticipated adaptation. Findings doc at `docs/coordination/mbtwtws-findings-2026-05-11.md`. The three-tier integration discipline preserved verbatim — no new IPC channels, no frozen-surface diff, no schema/REGISTRY/CONDUCTOR_API/WORKSTATION_CONTRACT §6 modifications.

---

## §5 — Dimension 3: Conductor Panel

*Sources: `chat-shell.tsx`, `mount.ts`, `chat-panel.tsx`, `commits-tab.tsx`, `cost-meter.tsx`, `dispatch-mode-toggle.tsx`, `plan-usage-ring.tsx`, `mix-indicator.tsx`, `wireframes.jsx:250-333`.*

### §5.A — Container / Region

| Element | Classification | Evidence |
|---|---|---|
| Conductor panel region | ARCHITECTURAL-MISMATCH | Wireframe: side-panel or full-height region. Shipped: `#chat-region` 280px bottom strip in flex column. Traces to Dim 1 three-region architecture. [KNOWN — `workstation-shell.html:80-83`] |
| Conductor label text | WIREFRAME-VISION-NOT-SHIPPED | No "Conductor" label in `chat-shell.tsx` or `mount.ts`. [KNOWN] |

### §5.B — Tab Strip

| Element | Classification | Evidence |
|---|---|---|
| Tab strip structure | SHIPPED | `chat-shell-tab-strip` (role=tablist), chips (role=tab, aria-selected), `chat-shell-tab-content` (role=tabpanel). Controlled/uncontrolled mode. [KNOWN — `chat-shell.tsx:229-244`] |
| Chat tab | SHIPPED | Wired in `mount.ts` resolveTabs() → `<ChatPanel>`. [KNOWN] |
| Commits tab | SHIPPED | Wired in `mount.ts` resolveTabs() → `<CommitsTab>` when bridge supplied. [KNOWN] |
| BUILD.md tab | WIREFRAME-VISION-NOT-SHIPPED | `mount.ts:65`: `// future MB-T23 Tasks tab`. No BUILD.md tab component. MB-T23 open ticket. [KNOWN — `mount.ts` comment] |

### §5.C — Chat Tab Body

| Element | Classification | Evidence |
|---|---|---|
| Message bubbles (assistant left / user right) | SHIPPED | `ChatBubble` role="assistant" → left-aligned, role="user" → right-aligned. Tail-anchor scroll-pin. [KNOWN — `chat-panel.tsx:182-205`] |
| In-progress streaming bubble | SHIPPED-BEYOND-WIREFRAME | `{inProgress && <ChatBubble role="assistant" content={inProgress} />}`. Real-time accumulation. No wireframe loading state. [KNOWN — `chat-panel.tsx:207`] |
| "Thinking…" / "Deliberating…" indicator | SHIPPED-BEYOND-WIREFRAME | 2s delayed "Deliberating…" state. No wireframe equivalent. [KNOWN — `chat-panel.tsx:208-222`] |
| Stream error display | SHIPPED-BEYOND-WIREFRAME | Role=alert div. No wireframe error state. [KNOWN — `chat-panel.tsx:223-240`] |
| Quick-pick buttons after assistant bubbles | SHIPPED | `QuickPickButtons` parsed from QUICK_PICK marker. `onSelect` → `streamingBridge.sendAndStream`. [KNOWN — `chat-panel.tsx:188-201`] |
| "spawned →" inline session list | SHIPPED | `SpawnedList` parsed from `spawned:` marker. [KNOWN — `chat-panel.tsx:189-195`] |
| Text input | SHIPPED | `data-testid="chat-input"`, `placeholder="Type a message…"`. [KNOWN — `chat-panel.tsx:253-268`] |
| Send button | SHIPPED | `data-testid="send-button"`. Disabled when `thinking`. Matches wireframe disabled-during-run. [KNOWN — `chat-panel.tsx:270-286`] |
| "BUILD.md · source of truth" pill near input | WIREFRAME-VISION-NOT-SHIPPED | Wireframe: `<span class="bpill">BUILD.md · source of truth</span>` in input row. Shipped form has no pill element. [KNOWN — `chat-panel.tsx:243-287`] |

### §5.D — Commits Tab Body

| Element | Classification | Evidence |
|---|---|---|
| Today / Yesterday / Older grouping | SHIPPED | Three group sections in `commits-tab.tsx`. [KNOWN] |
| Per-row: short SHA + session attribution + subject | SHIPPED | All three fields per row. Session attribution conditional on commit message format. [KNOWN — `commits-tab.tsx`] |
| Per-row: time-ago | SHIPPED | `formatTimeAgo()` with 60s refresh. [KNOWN] |
| Per-row: diff stats (insertions/deletions) | SHIPPED-BEYOND-WIREFRAME | filesChanged + insertions + deletions per row. Not in wireframe. [KNOWN] |
| Gated on build-doc config | PARTIAL | Returns `{groups:[], error:'No build-doc selected.'}` if `readBuildDocConfig()` returns null. Tab shows error state until operator configures repo via menu. [KNOWN — `commits-ipc.ts:74-80`] |

### §5.E — Header-Bar Slots

| Element | Classification | Evidence |
|---|---|---|
| Header-bar container | ARCHITECTURAL-MISMATCH | Wireframe: elements in `chead` row alongside ctabs. Shipped: `chat-shell-header-bar` (role=toolbar) is a separate div ABOVE the tab strip. [KNOWN — `chat-shell.tsx:170-226`] |
| Auto/Ask mode toggle | SHIPPED | `DispatchModeToggle`: two-button [Auto][Ask], default='ask', persisted. FAR-LEFT slot. [KNOWN — `dispatch-mode-toggle.tsx`] |
| Plan-usage ring | PARTIAL | `PlanUsageRing`: SVG ring, tokens dimension, countdown. Push-based — shows '—' until first rate-limit event. Shape matches wireframe. Data contingent on Conductor API calls. [KNOWN — `plan-usage-ring.tsx`] |
| Cost meter | PARTIAL | `CostMeter`: `$X.XXXX` (4dp). Shows '—' until first update. Wireframe: "conductor api · $0.42 today" (with label prefix, 1dp). Shipped: no label prefix, 4dp. [KNOWN — `cost-meter.tsx`] |
| Model mix indicator | STUB | `MixIndicatorContainer`: chip shapes correct; model field always undefined in production → all counts at 0. MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN (Tier 2). Kill events not propagated — chips never decrement. MB-F-T27-KILL-EVENT-PROPAGATION (Tier 2). [KNOWN — `mix-indicator.tsx:28-38`] |
| bypass-perms pill (conductor header) | WIREFRAME-VISION-NOT-SHIPPED | Not in `ChatShellProps`. Not rendered. [KNOWN — `chat-shell.tsx:46-113`] |
| max-parallel pill | WIREFRAME-VISION-NOT-SHIPPED | Not in `ChatShellProps`. Not rendered. [KNOWN] |

**Summary counts (Dim 3):** 12 SHIPPED · 5 SHIPPED-BEYOND-WIREFRAME · 3 PARTIAL · 1 STUB · 5 WIREFRAME-VISION-NOT-SHIPPED · 2 ARCHITECTURAL-MISMATCH

**Strategic finding (Dim 3):** Strongest-parity dimension. ARCHITECTURAL-MISMATCH findings (container position, header-bar layout) both trace to Dim 1. Chat tab body is functionally complete. BUILD.md tab is the single most impactful gap (MB-T23). Mix-indicator stub is a wiring gap, not a structural gap (MB-F-T27 open).

---

## §6 — Dimension 4: Frame Shell

*Sources: `wireframes.jsx:335-362` (FrameShell), `workstation-shell.html` (750 lines, read in full).*

### §6.A — Title Bar

| Element | Classification | Evidence |
|---|---|---|
| Title bar container | ARCHITECTURAL-MISMATCH | Wireframe: `.titlebar` div in-page with `.traffic` + `.ttl` + `.right`. Shipped: Electron native macOS window frame (OS-rendered, not in HTML). [KNOWN — `workstation-shell.html`] |
| Traffic lights (⬤⬤⬤) | ARCHITECTURAL-MISMATCH | Wireframe: in-page div. Shipped: native Electron window controls. [KNOWN] |
| Window title text | PARTIAL | Wireframe: "Foxworks Workstation — Conductor". Shipped: `<title>Foxworks Workstation</title>` (no "— Conductor" suffix). [KNOWN — `workstation-shell.html:5`] |
| Right-side status text ("tmux · 16 panes · max-plan") | WIREFRAME-VISION-NOT-SHIPPED | No equivalent. No global session count or max-plan display in shipped shell. [KNOWN] |

### §6.B — Toolbar

| Element | Classification | Evidence |
|---|---|---|
| Toolbar container | PARTIAL | `#header-bar` (36px flex, padding 12px) matches wireframe `.toolbar` container shape. Content nearly empty. [KNOWN — `workstation-shell.html:23-32`] |
| Spawn Session button | SHIPPED | `+ Spawn Session` text matches. Styling: wireframe=danger/red; shipped=green (#3a7a3a). Opens spawn modal (beyond wireframe spec). [KNOWN — `workstation-shell.html:230`] |
| Load BUILD.md button | WIREFRAME-VISION-NOT-SHIPPED | Not in `#header-bar`. [KNOWN] |
| Pause All button | WIREFRAME-VISION-NOT-SHIPPED | Not in `#header-bar`. [KNOWN] |
| MixIndicator in toolbar | ARCHITECTURAL-MISMATCH | Wireframe: in FrameShell `.toolbar`. Shipped: in `chat-shell-header-bar` (MB-T27 slot, Conductor panel). Deliberate consolidation into Conductor header-bar. [KNOWN — Dim 3 finding] |
| bypass-perms pill (shell-level) | WIREFRAME-VISION-NOT-SHIPPED | Not in `#header-bar`. (Per-tile bypass-perms exists in TileFooter — not plumbed — but no global shell pill.) [KNOWN] |
| N/M running pill | WIREFRAME-VISION-NOT-SHIPPED | Not in `#header-bar`. No running session count display. [KNOWN] |
| PlanRing in toolbar | ARCHITECTURAL-MISMATCH | Wireframe: in FrameShell `.toolbar`. Shipped: in `chat-shell-header-bar` (MB-T25 slot, Conductor panel). Same deliberate consolidation. [KNOWN — Dim 3 finding] |

### §6.C — Filter Row

| Element | Classification | Evidence |
|---|---|---|
| Filter row container | WIREFRAME-VISION-NOT-SHIPPED | Wireframe: `.filter-row` between toolbar and frame content. No filter row in `workstation-shell.html`. [KNOWN] |
| Status filter select | WIREFRAME-VISION-NOT-SHIPPED | Part of absent filter row. [KNOWN] |
| Repo filter select | WIREFRAME-VISION-NOT-SHIPPED | Part of absent filter row. [KNOWN] |
| Filter Clear button | WIREFRAME-VISION-NOT-SHIPPED | Part of absent filter row. [KNOWN] |

### §6.D — Frame Navigation

| Element | Classification | Evidence |
|---|---|---|
| Frame tab router (A/B/C/D switch) | WIREFRAME-VISION-NOT-SHIPPED | No frame-switch affordance in shipped shell. Three-region layout is fixed. [KNOWN — Dim 1] |
| Frame title / mode indicator | WIREFRAME-VISION-NOT-SHIPPED | Wireframe: `<h2>A · Dense Grid (4×4)</h2>` per frame. No frame title in shipped. [KNOWN — `wireframes.jsx:368`] |

### §6.E — Shipped-Beyond-Wireframe Shell Elements

| Element | Classification | Evidence |
|---|---|---|
| Vertical splitter (#splitter) | SHIPPED-BEYOND-WIREFRAME | 6px ns-resize draggable divider. Full drag logic. Persisted via `shellBridge.saveSplitterPos`. [KNOWN — `workstation-shell.html:69-79`, `412-461`] |
| Spawn result banner | SHIPPED-BEYOND-WIREFRAME | Fixed top-right toast. Success 3s auto-dismiss; error persistent + Dismiss button. [KNOWN — `workstation-shell.html:258-275`] |
| Spawn form modal | SHIPPED-BEYOND-WIREFRAME | Repo path input + Browse… (native dir dialog) + session name + Cancel/Spawn. [KNOWN — `workstation-shell.html:357-397`] |
| Spawn confirm modal (Ask mode) | SHIPPED-BEYOND-WIREFRAME | MB-T24 gate modal. Surfaces when dispatchMode='ask'. Confirm/Cancel → `respondSpawnConfirm`. [KNOWN — `workstation-shell.html:286-355`] |

**Summary counts (Dim 4):** 1 SHIPPED · 4 SHIPPED-BEYOND-WIREFRAME · 2 PARTIAL · 0 STUB · 10 WIREFRAME-VISION-NOT-SHIPPED · 4 ARCHITECTURAL-MISMATCH

**Strategic finding (Dim 4):** Frame shell is the most divergent dimension. Shell chrome is empty by construction. PlanRing and MixIndicator placement in Conductor header-bar vs FrameShell toolbar is a deliberate consolidation decision, not an oversight — both landed with explicit slot-ordering operator arbitrations. Restoring them to a global toolbar would require the Dim 1 frame-switching rearchitecture first.

### §6.F — Frame C Detail-Pane Chrome (post-audit surface; SHIPPED-BEYOND-WIREFRAME)

`[KNOWN — appended 2026-05-11 post-MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS WB7 docs]`

Frame C (shipped at §C.1′ Frame Router `44764fd` + Wave C #2 `frame-c/` scaffold) introduces a renderer surface that did not exist at the 2026-05-09 audit anchor. The detail-pane subsection of Frame C has no wireframe equivalent (wireframe `wireframes.jsx:223-248` shows tile chrome only). New SHIPPED elements catalogued here:

| Element | Classification | Evidence |
|---|---|---|
| Frame C detail-pane host | SHIPPED-BEYOND-WIREFRAME | Wave B WB8 `525c502` shipped `frame-c/detail-pane.tsx` rendering selected session's swarm-state.md content + (Wave C #5 `bd31b94`) `ctx N%` inline text. [KNOWN — `frame-c/detail-pane.tsx`] |
| Detail-pane footer ActionBar (3 buttons: Diff / Merge / Focus) | SHIPPED-BEYOND-WIREFRAME | MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS WB2 `cde9308` shipped `frame-c/action-bar.tsx` RENDERER-INTEGRATED component (bridge-free; callback-prop driven). Three buttons gated on `sessionName !== null` (disabled when no selection). No wireframe equivalent. [KNOWN — `frame-c/action-bar.tsx`] |
| Inline failure-banner (role="alert") | SHIPPED-BEYOND-WIREFRAME | MB-T-WIREFRAME-C1P3 WB6 `cdf05db` extended ActionBar with conditional `failureState` prop + banner DOM (action + error_type + message + optional MergeConflict `<ul><li>` + Dismiss button). Sub-Q-MBTWBDPFA-C=(α) operator-arbitrated 2026-05-11. [KNOWN — `frame-c/action-bar.tsx:renderFailureBanner`] |
| `frame-c:diff` IPC channel | SHIPPED-BEYOND-WIREFRAME | Consolidated §6 amendment `0f0e762`. Renderer: `window.frameCBridge.diff(sessionName)`. Main: `FrameCIpcController.handleDiff` → `git diff main...<branch>` via `child_process`. Discriminated-union result (`DiffResult`). Sub-Q-MBTWBDPFA-B-diff=(i). [KNOWN — `main/frame-c-ipc.ts:handleDiff`, `main/preload.mts:frameCBridge`] |
| `frame-c:merge` IPC channel | SHIPPED-BEYOND-WIREFRAME | Same amendment. `git merge --no-commit --no-ff <branch>` via `child_process`. `MergeResult` discriminated union with `conflictFiles[]` parsed from stdout/stderr. Sub-Q-MBTWBDPFA-B-merge=(i). [KNOWN — `main/frame-c-ipc.ts:handleMerge`] |
| `frame-c:focus` IPC channel | SHIPPED-BEYOND-WIREFRAME | Same amendment. `writeFrameMode('A')` + `webContents.send('frame-c:scroll-to-session', payload)`. Sub-Q-MBTWBDPFA-B-focus=(i). End-to-end Frame A render-coherence pending `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` (Tier 2). [KNOWN — `main/frame-c-ipc.ts:handleFocus`] |
| `frameCBridge` (contextBridge surface) | SHIPPED-BEYOND-WIREFRAME | New top-level `window.frameCBridge` exposing `diff/merge/focus` methods. Per-IPC-family convention (Sub-Q-MBTWBDPFA-D=α); coexists with `workstationBridge.readSwarmState` (Wave B `525c502`). [KNOWN — `main/preload.mts:exposeInMainWorld('frameCBridge')`] |

**Strategic finding (§6.F):** Frame C detail-pane is the cleanest post-audit-anchor surface — its entire chrome ships beyond wireframe vision (wireframe shows only tile chrome at `wireframes.jsx:223-248`; Frame C's two-column session-list + detail-pane structure is post-2026-05-09 design). All shipped elements follow audit §4.1 three-tier integration discipline: component layer is RENDERER-INTEGRATED + bridge-free; bridge access lives at the detail-pane host (production wiring deferred per `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` Tier 2). The discriminated-union result-type pattern (`DiffResult` / `MergeResult` / `FocusResult` on `ok: boolean` tag) extends the prior `WORKSTATION_CONTRACT.md §6.5` typed-error envelope convention with action-specific success-shape fields + error-taxonomy enums.

---

## §7 — Dimension 5: Data Model

*Sources: `dispatch-core/src/v2/schema.ts` (489 lines, FROZEN), `dispatch-core/src/v3/schema.ts` (examined), `tile-grid-app.tsx`, `tile-header.tsx`, `wireframes.jsx:5-118` (MOCK_SESSIONS shape).*

**Wireframe MOCK_SESSIONS shape:** `{ id, name, branch, repo, state, task, tokens (float 0-1), model (S4.6/O4.6/O4.7·1M/H), time (HH:MM), lines: [{c,t}] }`

| Wireframe field | Classification | Shipped equivalent | Evidence |
|---|---|---|---|
| `id` | ARCHITECTURAL-MISMATCH | `sessionName` string (used as primary key in v2 schema and TileGridSessionEntry). No separate UUID. | [KNOWN — `v2/schema.ts`, `TileGridSessionEntry`] |
| `name` | SHIPPED | `SessionSchemaV2.name` (tmux session name). Used as tile display name. | [KNOWN — `v2/schema.ts`, `tile-header.tsx`] |
| `branch` | STUB | `TileGridSessionEntry.branchName` prop exists; defaults to `'main'`. No IPC source. No v2/v3 schema field. | [KNOWN — `tile-header.tsx:default props`, `TileGridSessionEntry`] |
| `repo` | STUB | `TileGridSessionEntry.repoName` prop exists; defaults to `''`. `cwd` is carried from SpawnResult but cwd ≠ repo name. No repo field in v2/v3 schema. | [KNOWN — `tile-header.tsx`, `spawn-handler.ts`] |
| `state` | ARCHITECTURAL-MISMATCH | Three disjoint state systems (see below). No direct mapping to wireframe single `state` field. | [KNOWN — `v2/schema.ts`, `tile-grid-app.tsx`, `color-helpers.ts`] |
| `task` | WIREFRAME-VISION-NOT-SHIPPED | No task/description field in v2 or v3 schema. Not in TileGridSessionEntry. | [KNOWN — schema reads] |
| `tokens` (float 0-1) | ARCHITECTURAL-MISMATCH | `SessionResponseV2.cost_info?.token_count` is an absolute integer — NOT a float ratio. `TileGridSessionEntry.tokensUsed/tokenBudget` exist but default 0/200000 with no IPC source. | [KNOWN — `v2/schema.ts:CostInfoSchema`, `tile-header.tsx:default props`] |
| `model` | STUB | `TileGridSessionEntry.model` prop exists; defaults to `'claude-sonnet-4-6'`. SpawnSessionResult has no model field. No IPC source. | [KNOWN — `spawn-handler.ts:SpawnSessionResult`, `tile-grid-app.tsx:SpawnSuccessReply`] |
| `time` (HH:MM session duration) | STUB | `TileFooter` renders uptime = time since tile mounted in current window (not session spawn time). Semantics differ fundamentally. | [KNOWN — `tile-footer.tsx`] |
| `lines` ([{c,t}] structured tail) | ARCHITECTURAL-MISMATCH | Shipped: raw PTY bytes → xterm.js (binary ANSI). Wireframe: structured line array with CSS class per line. Different rendering model, not a wiring gap. | [KNOWN — `console-panel.tsx`, Dim 6 finding] |

**Three disjoint state systems:**

| System | Values | Authority | Consumer |
|---|---|---|---|
| `SessionSchemaV2.state` | `armed\|paused\|held\|killed` | Daemon (SQLite) | HTTP API; not directly read by workstation renderer |
| `ComputedStatus` (`SessionResponseV2.computed_status`) | `idle\|running\|awaiting_review\|stale` | Daemon (computed from events) | Kanban webview (dispatch-web) |
| `TileStatus` | `idle\|open\|killed\|detached` | Workstation renderer (local state) | TileGridApp, `color-helpers.ts:statusDotColor` |

**[KNOWN]** The wireframe `dotClass(state)` maps `"ok"/"run"/"warn"/"err"/"idle"` — a single five-value enum. None of the three shipped systems map directly onto this enum.

**Data authority tiers:**
- **Daemon-authoritative:** session `state`, `computed_status`, `cost_info.token_count` (absolute integer)
- **Renderer-derived (stub):** `branch` ('main'), `model` ('claude-sonnet-4-6'), `tokensUsed` (0), `tokenBudget` (200000)
- **Workstation-local:** `TileStatus`, autopilot enabled state, dispatch mode
- **Architecturally absent:** `task` field, `tokens` as ratio, session-duration time

**Summary (Dim 5):** 1 SHIPPED · 4 STUB · 4 ARCHITECTURAL-MISMATCH · 1 WIREFRAME-VISION-NOT-SHIPPED

**Strategic finding (Dim 5):** Only `name` is SHIPPED without qualification. Every other MOCK_SESSIONS field is either a stub default or a different architectural concept. The wireframe's implied data model (a single rich session object with all display fields) does not exist in production. Closing data gaps requires field-by-field decisions on sourcing: branch from git, model from spawn, tokens from daemon cost_info (API key required), time from daemon (new field).

---

## §8 — Dimension 6: Wiring & Integration

*Sources: `pty-stream-relay.ts`, `tile-grid-app.tsx`, `preload.mts`, `coarchitect-ipc.ts`, `commits-ipc.ts`, `approval-policy-ipc.ts`, `dispatch-mode-store.ts`, plus all prior reads.*

### §8.A — Spawn Flow

| Step | Classification | Evidence |
|---|---|---|
| Spawn button → modal → `requestSpawn` IPC | SHIPPED | `workstationBridge.requestSpawn` → `ipcRenderer.send('workstation:spawn-requested')`. [KNOWN — `preload.mts:127-128`] |
| Ask-mode gate (spawn-confirm-required → confirm modal → response) | SHIPPED-BEYOND-WIREFRAME | `spawn-ipc.ts` reads `readDispatchMode()` → if 'ask': emits `workstation:spawn-confirm-required` → renderer surfaces `#spawn-confirm-modal` → `respondSpawnConfirm`. [KNOWN — `preload.mts:203-229`] |
| Main → spawn-handler → tmux + daemon | SHIPPED | `SpawnIpcController` → `spawn-handler.ts`. [KNOWN] |
| Spawn result → banner + tile mount | SHIPPED | `onSpawnResult` → `showSpawnResultBanner` + `TileGridApp.setSessions([...current, {name,cwd?}])`. [KNOWN — `tile-grid-app.tsx:152-179`] |

### §8.B — Tile State Lifecycle

| Event | Classification | Evidence |
|---|---|---|
| Spawn → auto-mount | SHIPPED | `onSpawnResult` subscription. Idempotent duplicate guard. [KNOWN — `tile-grid-app.tsx:162-167`] |
| Startup seed from persisted state | SHIPPED-BEYOND-WIREFRAME | `initialSessions` seeded from `tile-grid-state.ts` on startup. [KNOWN] |
| Kill button → tile removal | SHIPPED | `handleKill(name)` → `setSessions(filter)`. [KNOWN] |
| Collapse / detach / swap / resize | SHIPPED-BEYOND-WIREFRAME | All persisted to `tile-grid-state.json`. No wireframe equivalent. [KNOWN] |
| External session death (daemon/tmux kill without kill button) | MISSING | TileGridApp subscribes to `workstation:spawn-result` only — no daemon SSE, no polling. External kills leave stale tiles. **New finding: MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION.** [KNOWN — `tile-grid-app.tsx`: no daemon-sync subscription] |

### §8.C — Console PTY Streaming

| Step | Classification | Evidence |
|---|---|---|
| tmux → daemon ring buffer → `consoleBridge console:stdout-chunk` → ConsolePanel xterm.js | SHIPPED | Per-tile, per-session PTY routing. Each tile has its own xterm.js terminal subscribed to its session. [KNOWN — `preload.mts:240-248`] |
| `{c,t}` structured line array vs raw PTY bytes | ARCHITECTURAL-MISMATCH | See Dim 5 `lines` field finding. [KNOWN] |
| Orchestrator PTY dual-routing (MB-T40) | SHIPPED-BEYOND-WIREFRAME | `pty-stream-relay.ts` intercepts `__orchestrator_active` → ADDITIONALLY routes to `coarchitect:ptyChunk` + `coarchitect:ptyTurnDone`. Per-tile ConsolePanel routing unchanged. [KNOWN — `pty-stream-relay.ts:46-91`] |

### §8.D — Conductor Chat Flow

| Step | Classification | Evidence |
|---|---|---|
| Input → `sendAndStream` → `workstation:session-send-prompt` (orchestrator session) | SHIPPED | `coarchitectBridge.sendAndStream` → `ipcRenderer.invoke('workstation:session-send-prompt', {sessionName:'__orchestrator_active', prompt})`. [KNOWN — `preload.mts:17-21`] |
| Orchestrator stdout → `__orchestrator_active` filter → `coarchitect:ptyChunk` per-chunk | SHIPPED | `pty-stream-relay.ts:48` hardcoded filter. [KNOWN] |
| Renderer accumulates chunks → inProgress bubble | SHIPPED | `onStreamChunk` → `setInProgress(prev => prev + chunk)`. [KNOWN — `chat-panel.tsx:72-83`] |
| Quiescence/ACTION block → `coarchitect:ptyTurnDone` → history push | SHIPPED | 3000ms outer quiescence or ACTION block detection → `setHistory([...prev, {role:'assistant', content:text}])`. [KNOWN — `pty-stream-relay.ts:83-90`, `chat-panel.tsx:85-108`] |
| Stream error path | PARTIAL | `onStreamError` is a no-op stub (A3 ratification: PTY model has no stream error semantics). Errors appear as prolonged silence or quiescence timeout. [KNOWN — `preload.mts:37-40`] |

### §8.E — Quick-pick / Spawned-list

| Step | Classification | Evidence |
|---|---|---|
| `ptyTurnDone` text → `parseQuickPickMarker` + `parseSpawnedMarker` | SHIPPED | Both parsers called on every assistant message. [KNOWN — `chat-panel.tsx:188-189`] |
| `QuickPickButtons.onSelect` → `streamingBridge.sendAndStream` (loop) | SHIPPED | Full round-trip verified. [KNOWN — `chat-panel.tsx:199`] |

### §8.F — Commits Flow

| Step | Classification | Evidence |
|---|---|---|
| Mount → `commitsBridge.listCommits` → `commits:list` IPC | SHIPPED | `ipcRenderer.invoke('commits:list', opts)`. [KNOWN — `preload.mts:289-292`] |
| Main → `readBuildDocConfig` → if repoRoot: `child_process git log` → `CommitGroup[]` | SHIPPED | Full child_process path. No daemon route. [KNOWN — `commits-ipc.ts`] |
| Gate: build-doc config required | PARTIAL | Returns error state if no repoRoot set. [KNOWN — `commits-ipc.ts:74-80`] |

### §8.G — Approval Policy Flow

| Step | Classification | Evidence |
|---|---|---|
| Picker mount → GET → daemon → Zod parse | SHIPPED | `ApprovalPolicyGetResponseSchema` Zod validation. Full round-trip. [KNOWN — `approval-policy-ipc.ts:30-34`] |
| Optimistic PUT + rollback | SHIPPED | [KNOWN — `tile-approval-picker.tsx`] |
| Approval policy as system concept | SHIPPED-BEYOND-WIREFRAME | No wireframe equivalent. |

### §8.H — Autopilot Toggle Flow

| Step | Classification | Evidence |
|---|---|---|
| Toggle → GET/PUT → `AutopilotLoop` (workstation-side, no daemon) | SHIPPED | Workstation-local state only. [KNOWN — `preload.mts:178-191`] |
| Autopilot as system concept | SHIPPED-BEYOND-WIREFRAME | No wireframe equivalent. |

### §8.I — Dispatch Mode Toggle Flow

| Step | Classification | Evidence |
|---|---|---|
| Toggle → `dispatchModeBridge.get/setDispatchMode` → `dispatch-mode-state.json` | SHIPPED | Full persistence chain. [KNOWN — `dispatch-mode-store.ts`] |
| Spawn gate reads mode directly (main-side, no bridge) | SHIPPED | `spawn-ipc.ts` reads `readDispatchMode()` synchronously. Correct architecture. [KNOWN — `coarchitect-ipc.ts:52`] |

### §8.J — Cost Meter Flow

| Step | Classification | Evidence |
|---|---|---|
| Mount → initial `getDailyCost` fetch + `coarchitect:cost-update` subscribe | SHIPPED | Push-based with initial fetch. [KNOWN — `preload.mts:48-62`] |
| Anthropic API call → `captureUsageToLedger` → `computeCost` → `appendCostLedgerEntry` → broadcast | SHIPPED | [KNOWN — `coarchitect-ipc.ts:14-19`] |
| '—' placeholder until first update | PARTIAL | Renders placeholder until first Conductor API call completes. [KNOWN — `cost-meter.tsx`] |

### §8.K — Plan-Usage Ring Flow

| Step | Classification | Evidence |
|---|---|---|
| Mount → `getRateLimitState` fetch + `coarchitect:rate-limit-update` subscribe | SHIPPED | [KNOWN — `preload.mts:79-94`] |
| Anthropic response headers → `captureRateLimitToBroadcast` → broadcast | SHIPPED | [MODELED — `coarchitect-ipc.ts` MB-T34 zone, observed imports] |
| '—' placeholder until first API call | PARTIAL | No synthetic initial state. [KNOWN — `plan-usage-ring.tsx`] |

### §8.L — Mix Indicator Flow

| Step | Classification | Evidence |
|---|---|---|
| `onSpawnResult` subscription → session list with model | STUB | Subscription exists. model field always undefined from SpawnResult. Chips render at 0. MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN (Tier 2, open). [KNOWN — `mix-indicator.tsx:28-38`, `spawn-handler.ts`] |
| Kill event propagation → chip decrement | WIREFRAME-VISION-NOT-SHIPPED | No kill subscription. Chips never decrement. MB-F-T27-KILL-EVENT-PROPAGATION (Tier 2, open). [KNOWN] |

### §8.M — Card Emitter Flow

| Step | Classification | Evidence |
|---|---|---|
| Orchestrator ACTION block → `orchestrator-output-router` → `emitCardEnvelopes` → `cardBridge` → kanban webview | SHIPPED-BEYOND-WIREFRAME | Full orchestrator→kanban pipeline. Wireframe doesn't spec card emitter. [KNOWN — `coarchitect-ipc.ts:30-31`] |

### §8.N — Schema Validation Surface

| Boundary | Classification | Evidence |
|---|---|---|
| Approval policy GET/PUT | SHIPPED | `ApprovalPolicyGetResponseSchema` Zod. [KNOWN] |
| Spawn result | PARTIAL | Custom `isSpawnSuccessReply` type guard, not Zod. [KNOWN — `tile-grid-app.tsx:126-134`] |
| Dispatch mode | PARTIAL | Custom `isDispatchMode` guard. [KNOWN] |
| Cost / rate-limit | PARTIAL | `typeof total === 'number'` / typed as `unknown`. [KNOWN — `preload.mts`] |
| Commits / autopilot | PARTIAL | TypeScript interfaces only; no Zod runtime validation. [KNOWN] |
| IPC boundary uniformity | PARTIAL | No uniform Zod-at-IPC-boundary discipline across all 6 bridges. **New finding: MB-F-AUDIT-IPC-SCHEMA-VALIDATION-UNIFORMITY.** [KNOWN] |

### §8.O — Bridge Architecture Inventory

**[KNOWN]** All renderer↔main communication routes through 6 named contextBridge surfaces in `preload.mts` (293 lines):

| Bridge | Key methods | Primary consumers |
|---|---|---|
| `coarchitectBridge` | fetchHistory, postMessage, sendAndStream, onStream*, onCostUpdate, onRateLimitUpdate, buildDocConfig | ChatPanel, CostMeter, PlanUsageRing |
| `shellBridge` | getSplitterPos, saveSplitterPos | shell JS splitter |
| `workstationBridge` | requestSpawn, onSpawnResult, detachTile, onTileDetachClosed, getSessionApprovalPolicy, putSessionApprovalPolicy, getSessionAutopilotEnabled, setSessionAutopilotEnabled, onSpawnConfirmRequired, respondSpawnConfirm | TileGridApp, TileApprovalPicker, TileAutopilotToggle, shell JS |
| `consoleBridge` | console:stdout-chunk, console:send-stdin, etc. | ConsolePanel |
| `dispatchModeBridge` | getDispatchMode, setDispatchMode | DispatchModeToggle |
| `commitsBridge` | listCommits | CommitsTab |
| `cardBridge` (webview preload, separate) | card envelope methods | dispatch-web kanban |

Wireframe has no bridge concept — it is pure in-process React state. The bridge architecture is the production wiring substrate, invisible to the wireframe model and fully beyond its scope.

### §8.P — Token Meter Wiring (Implied-by-Wireframe)

| Element | Classification | Evidence |
|---|---|---|
| Token float (0-1) → tile header meter fill | IMPLIED-BY-WIREFRAME / MISSING | `tokensUsed/tokenBudget` props exist in `TileGridSessionEntry` but are never populated by any IPC flow. No daemon field returns a context ratio. No IPC channel exists for this. [KNOWN — Dim 5 finding] |

**Summary counts (Dim 6):** 14 SHIPPED · 11 SHIPPED-BEYOND-WIREFRAME · 8 PARTIAL · 2 STUB · 2 MISSING · 1 ARCHITECTURAL-MISMATCH

**Cross-cutting structural observations:**
1. **[KNOWN]** Bridge architecture replaces wireframe's MOCK_SESSIONS in-process model. 6 named surfaces define the renderer↔main contract. This is correct production architecture, not a gap.
2. **[KNOWN]** Two distinct PTY consumers post-MB-T40: per-tile (`consoleBridge console:stdout-chunk`) and orchestrator-relay (`pty-stream-relay.ts __orchestrator_active`). Non-interfering parallel channels.
3. **[MODELED]** Tile lifecycle is spawn-event-driven, not SSE-driven. External state changes from daemon are not reflected without a manual kill button action. Wireframe's static MOCK_SESSIONS implies a synchronized session list; shipped has three disjoint state systems with no automatic reconciliation.
4. **[KNOWN]** Schema validation is inconsistent across IPC boundaries. Approval policy has Zod; other routes use type guards or TypeScript-only assertions. No uniform discipline.

---

## §9 — New Findings Filed During Audit

Two findings surfaced during this audit that are not yet in `docs/FOLLOWUPS.md`. Both require operator decision on priority before filing.

### MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION (Tier 2)

**Body:** `TileGridApp` subscribes to `workstation:spawn-result` events only (`tile-grid-app.tsx:152`). There is no daemon SSE subscription, no polling, and no reconciliation path for sessions that die externally (tmux kill from terminal, daemon restart, `claude` process crash). When a session dies without the operator clicking the kill button in the workstation UI, its tile persists with `TileStatus='open'` until the workstation is restarted. This is a silent state-divergence gap. Closure path: either (a) periodic daemon poll for session list + diff against local state, or (b) daemon SSE event for session death (`session:killed` or equivalent) with IPC forwarding to TileGridApp. Approach (b) requires a new daemon event type — frozen-contract surface consultation needed. **Surfaced from:** Dim 6 §8.B, `tile-grid-app.tsx` read.

### MB-F-AUDIT-IPC-SCHEMA-VALIDATION-UNIFORMITY (Tier 3)

**Body:** IPC boundaries across the 6 contextBridge surfaces use heterogeneous validation strategies: `ApprovalPolicyGetResponseSchema` (Zod, one boundary), `isSpawnSuccessReply`/`isDispatchMode` (custom type guards), `typeof total === 'number'` (ad-hoc typeof checks), and TypeScript-only interface assertions (commits, autopilot). No uniform Zod-at-IPC-boundary discipline exists. Risk: schema drift between main-process and renderer-side types is caught only at compile time or by ad-hoc runtime checks, not by a systematic Zod parse that would surface malformed data with actionable errors. Closure path: systematically add Zod schema parse at the receive side of each `ipcRenderer.invoke` result; derive types from inferred Zod output rather than separate interfaces. Scope: all 6 bridges in `preload.mts`. **Surfaced from:** Dim 6 §8.N.

---

## §10 — Operator Decision Section

For each load-bearing ARCHITECTURAL-MISMATCH or WIREFRAME-VISION-NOT-SHIPPED finding, the operator must decide before tickets can be written. These are not implementation decisions — they are architectural direction decisions.

| # | Wireframe wants | Shipped has | Closure cost | Recommended direction |
|---|---|---|---|---|
| **10.1 Frame layout model** | Frame A/B/C/D mutually-exclusive layout switching; Frame C (listview+detail) as primary | Three-region concurrent stack (kanban + tile-grid + chat). Frame C absent. Frame B dormant (no UI affordance). | **L** (multi-ticket; requires new layout engine, frame-switch UI, frame-specific chrome) | **Accept three-region as v3.5 primary.** File Frame C as v3.6 milestone. File frame-switch mechanism as v3.6 prerequisite. Do not block v3.5 on rearchitecting. |
| **10.2 Tile-level visual separation** | Pane has border/radius/background; tiles are visually distinct | **CLOSED at `510071e` 2026-05-10 — inline-style `gap:'4px'` on grid root + cell wrapper with border/borderRadius/background/overflow:hidden in `tile-grid.tsx:344,380,391`.** Original-audit evidence: ~~Tiles are bare `<div>` — no border, no radius, no background. No gap between tiles.~~ | **S** (CSS-only change in `workstation-shell.html` or `tile-grid.tsx`; single WB) — **DONE single-WB at `510071e`** | ~~**Close before v3.5 ship.** Cheapest closure, largest perceptual gain. No data wiring required — pure CSS.~~ **CLOSED. Cross-ref §4.1 row line 118 for closure details + `MB-F-W3-BATCH-1-STALE-DISPATCH-2026-05-11` for the audit-anchor-drift discoverability finding.** |
| **10.3 BUILD.md tab** | BUILD.md tab in Conductor panel showing task list + state classification | BUILD.md tab absent (`mount.ts:65` comment: "future MB-T23"). MB-T23 open ticket. | **M** (multi-WB; BUILD.md parser MB-T28 + classifier MB-T29 prerequisites; tab body itself is one WB) | **Defer to v3.5.x or v3.6.** Prerequisites MB-T28/T29 are unmerged. Do not block v3.5 ship on BUILD.md tab. |
| **10.4 Shell-level status pills** (bypass-perms, N/M running, max-plan) | Pills in FrameShell toolbar | Not in `#header-bar`. No data source for N/M running or max-plan. | **M-L** (M for bypass-perms; L for running count requires session-list IPC + Dim 5 data model work) | **Defer to v3.6.** Predicated on session-count IPC (new channel needed) and data model decisions. |
| **10.5 Filter row** | Status filter + repo filter + Clear button | Absent. Would require status/repo fields in session data. | **L** (requires data model fields: status is ARCHITECTURAL-MISMATCH, repo is STUB; filter state management; session-list query changes) | **Defer to v3.6.** Predicated on Dim 5 data model decisions and Dim 1 frame-switching. Not meaningful without a session list surface to filter. |
| **10.6 Token meter wiring** | `s.tokens` float 0-1 → tile meter fill + `ctx N%` text | **CLOSED 2026-05-11 (FULL closure across two sub-tickets).** Data-source subset CLOSED at §C.5 `13b7607` 2026-05-10 (PTY-scrape via `tile-token-scraper.ts` → `workstation:tile-token-update` IPC → `TileGridSessionEntry.tokensUsed` / `tokenBudget`; A-W1-2 ratification of PTY-scrape decision). Visible-text-rendering subset CLOSED at MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB4 GREEN `bd31b94` 2026-05-11 (cairn ladder: WB2 GREEN `d5ba210` session-list.tsx + WB6 GREEN `8205b01` tile-header.tsx + WB4 GREEN `bd31b94` detail-pane.tsx + frame-c-root.tsx threading). End-to-end `ctx N%` chain WORKING: scraper updates → IPC → `TileGridSessionEntry` → `SessionList` row + `TileHeader` + `DetailPane` all render inline ctx text. Cross-ref §4.1 line 124 row + `docs/coordination/mbtwtws-findings-2026-05-11.md`. Original-audit evidence: ~~Meter renders at 0 always; no IPC source for token ratio~~. | **M** (need to pick source: daemon `cost_info.token_count` requires context-window-max denominator; autopilot telemetry; new IPC channel; `ctx N%` text is trivial CSS once ratio exists) — **DONE two-WB-chain (§C.5 data path + #5 text rendering)** | ~~**Decision needed before ticket authoring.** Pick token source. Options: (a) `cost_info.token_count / MODEL_CONTEXT_WINDOW` — requires model→context-window lookup table; (b) new daemon field `context_pct`; (c) scrape from PTY output. Surface as separate operator arbitration.~~ **CLOSED. PTY-scrape source ratified by A-W1-2 and shipped at `13b7607`; text-rendering shipped at `bd31b94`.** |
| **10.7 PlanRing / MixIndicator placement** | Both in FrameShell global toolbar | Both in Conductor panel `chat-shell-header-bar` (explicit operator-arbitrated slot ordering) | **S** (move is a CSS/prop change if decided; but logically tied to Dim 1 frame-switching) | **Keep in Conductor header-bar for v3.5.** Moving to global toolbar only makes sense after Dim 1 frame-switching rearchitecture. Current placement is deliberate and well-wired. |
| **10.8 Title bar in-page chrome** | `.titlebar` div with traffic lights, full title, right-side status text | Electron native macOS window frame | **M** (add `titleBarStyle: 'hiddenInset'` or similar Electron config; implement in-page titlebar; reposition `#header-bar` layout; potential electron-specific complexity) | **Defer to v3.5.x.** In-page titlebar is cosmetic but involves Electron config changes with cross-platform implications. "tmux · N panes · max-plan" right-side text requires session-count IPC (Dim 10.4). Not a v3.5 ship gate. |
| **10.9 Window title suffix** | "Foxworks Workstation — Conductor" | "Foxworks Workstation" | **S** (one `mainWindow.setTitle()` call in `main.ts` or `<title>` update) | **Close before v3.5 ship.** Trivial change with correct operator branding signal. |
| **10.10 IPC schema validation uniformity** | (not wireframe-specced) | Heterogeneous guards; only approval-policy has Zod | **M** (add Zod parse to 5 remaining bridge boundaries; create shared schema files; update types to derive from Zod inferred types) | **Tier 3 — defer unless v3.5 sets a schema-discipline ship gate.** File as MB-F-AUDIT-IPC-SCHEMA-VALIDATION-UNIFORMITY. Not a user-facing gap; prioritize after visual/feature gaps. |

---

## §11 — Tally Appendix

Per-dimension classification counts (operator-confirmed at each HALT-DIM gate):

| Dimension | SHIPPED | SHIPPED-BEYOND | PARTIAL | STUB | WIREFRAME-VISION-NOT-SHIPPED | ARCH-MISMATCH |
|---|---|---|---|---|---|---|
| Dim 1 — Frame layout | 0 | 2 | 1 | 0 | 3 | 2 |
| Dim 2 — Tile chrome | 3 | 4 | 5 | 2 | 2 | 1 |
| Dim 3 — Conductor panel | 12 | 5 | 3 | 1 | 5 | 2 |
| Dim 4 — Frame shell | 1 | 4 | 2 | 0 | 10 | 4 |
| Dim 5 — Data model | 1 | 0 | 0 | 4 | 1 | 4 |
| Dim 6 — Wiring | 14 | 11 | 8 | 2 | 2 | 1 |
| **Total** | **31** | **26** | **19** | **9** | **23** | **14** |

*Note: Dim 1/2/5 were ratified using prior vocabulary (MISSING, DIFFERENT-ARCHITECTURE); translated to unified vocabulary here. Dim 3/4/6 used the operator-confirmed five-bucket vocabulary directly.*

**Strongest dimension:** Dim 3 (Conductor panel — 12 SHIPPED, near-parity)
**Most divergent dimension:** Dim 4 (Frame shell — 10 WIREFRAME-VISION-NOT-SHIPPED, 4 ARCHITECTURAL-MISMATCH)
**Most data-model-gap dimension:** Dim 5 (1/10 SHIPPED, 4 STUB, 4 ARCHITECTURAL-MISMATCH)
**Most beyond-wireframe dimension:** Dim 6 (11 SHIPPED-BEYOND-WIREFRAME — wiring substrate)

---

## §12 — v3.5 Ship Recommendation

Three options, for operator arbitration. Read-only audit surfaces evidence; operator decides direction.

### Option A — Ship As-Is + File All Wireframe-Vision Items as v3.6 Followups

**What this means:** v3.5 ships with the current three-region shell, stub chrome data, no tile visual separation, no filter row, no frame-switching. All wireframe-vision items become v3.6 tickets.

**Risk:** Tile chrome looks convincing (correct shapes) but all data is stub. Operator demos could be misleading without explicit disclosure. Tile visual separation gap is immediately perceptible.

**Benefit:** Zero scope delta from current state. Fastest path to ship gate.

### Option B — Close Cheap Cosmetic Gaps Before Ship (Recommended starting point)

**What this means:** ~~Close §10.2 (tile visual separation — CSS, S)~~ **§10.2 CLOSED at `510071e` 2026-05-10 + §10.9 window title suffix CLOSED at `02c4c4a` 2026-05-10 (sibling §B.2 ship)**; optionally `ctx N%` text (requires token ratio decision from §10.6). The original "single-WB changes with no architectural dependency" framing held — §10.2 + §10.9 shipped as single-commit closures on 2026-05-10 (the day after audit anchor `5704dd2` 2026-05-09); audit-doc reflection of these closures lagged ~24 hours and was surfaced at W3 Batch 1 dispatch via stale-dispatch detection. See `MB-F-W3-BATCH-1-STALE-DISPATCH-2026-05-11` row in FOLLOWUPS.md for the discoverability finding + naming-drift mitigation recommendation (GATE W5 audit re-anchor LOAD-BEARING per A-W1-5).

**Effort:** 2-3 WBs total.

**Risk:** Low. CSS-only and one-line title changes are non-breaking.

**Benefit:** Largest perceptual improvement per engineering effort. Tile borders alone close the "are these tiles?" perceptual gap.

### Option C — Close Cheap + At Least One Structural Item

**What this means:** Option B plus one of: BUILD.md tab (MB-T23, M) or shell-level running count pill (M-L). BUILD.md tab has the clearest ticket spec (MB-T23 exists) but requires MB-T28/T29 prerequisites. Shell running count requires a new session-list IPC channel.

**Effort:** 5-10 WBs depending on selection.

**Risk:** BUILD.md tab risks blocking on BUILD.md parser dependencies. Running count requires data model design work.

**Benefit:** Substantially closes the Dim 3 gap (BUILD.md tab) or the Dim 4 gap (running count). Operator should choose one structural item, not both, for v3.5.

---

**Audit discipline verified:** `git status --short` at session end confirms working tree clean except for this findings document. All six dimensions were read-only. No production code was modified. No tests were authored or modified.

**Session:** V3.5 Wireframe Audit Probe, 2026-05-10. Substrate: Claude Sonnet 4.6.
