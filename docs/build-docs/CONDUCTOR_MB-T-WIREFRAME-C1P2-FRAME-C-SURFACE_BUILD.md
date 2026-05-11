# MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE — wireframe-author primary list+detail shell mode

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-11
**Authored under:** §3.4 operator-supervised mechanical translation discipline
**Authoring delegate:** T4 (commit-plan-doc) under autonomous max-parallel dispatch 2026-05-11
**Authoring anchor commit (HEAD at authoring time):** `d4b0420`
**Cairn ladder anchor:** v3.5 chrome track per `docs/coordination/v35-operational-readiness-2026-05-10.md` §6.2 "§C.1′ ticket #2"
**Closes:** Audit `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §3 ARCHITECTURAL-MISMATCH (Frame C WIREFRAME-VISION-NOT-SHIPPED row) — partial closure (Frame C now ships; three-region vs frame-switching architectural decision ratified at §A.1.R=(2))
**Depends on (all merged):** §C.1′ ticket #1 Frame Router (`44764fd`); MB-T12 tile-grid (TileGridSessionEntry contract); shell-mode persistence at `frame-mode-state.ts` (`44764fd`); CSS `data-frame-mode` attribute hook at `mount.ts:122-126`. CONDITIONAL on Sub-Q-MBTWBFCS-B: MB-T-HSO-WIRE `swarm-state.md` writer (`8c81188`) if Sub-Q-B=(i) selected.
**Downstream gates:** Audit §3 reclassification (WIREFRAME-VISION-NOT-SHIPPED → SHIPPED); §C.1′ ticket #3 (detail-pane footer actions) depends on this ticket's detail-pane shape; v3.5-alpha chrome track per plan §A.1.R=(2)
**Estimated WB count:** 11-13 (10-WB cairn ladder + 1-3 docs/closure WBs)

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first to understand what is binding vs deferred.
2. Read §3 (GATE sub-arbitrations) — two operator decisions are pre-execution prerequisites for specific WBs (Sub-Q-A → WB9; Sub-Q-B → WB7).
3. Read §4 (WB ladder) for execution order. WBs are construction-order-aware: scaffold → list → selection → detail → wiring → docs.
4. §5-§8 are operational supports — cross-references, self-check, definition-of-done, risk register.

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]` observed in this session via direct source read; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence. Operator-frozen-envelope outcomes are `[KNOWN-OPERATOR-ARBITRATED]` and binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per plan §A.1.R=(2) + audit §3 + dispatch envelope 2026-05-11:

1. Creates NEW `packages/dispatch-workstation/src/frame-c/` directory hosting the Frame-C-surface renderer subsystem. Mirrors the existing `chat-shell/` + `tile-grid/` + `console-panel/` flat-directory convention per CLAUDE.md §3.2.
2. Renders the wireframe-author primary mode (Frame C = list+detail) when `data-frame-mode='C'` is set on the `#shell` DOM node (existing Frame Router CSS hook at `mount.ts:122-126`, shipped `44764fd`). Frame C becomes the visual default shell mode per `frame-mode-state.ts:8` `DEFAULT_MODE: FrameMode = 'C'`.
3. **SessionList** (left column) consumes `TileGridSessionEntry[]` via the existing `tile-grid-app.tsx` state stream (per `tile-grid.tsx:29-52` shape: `name`, `status?`, `branchName?`, `repoName?`, `model?`, `tokensUsed?`, `tokenBudget?`, `cwd?`). Per session: render a list-row with name + status badge + repo/branch + token meter (compact form factor compared to the full tile-grid tile-header).
4. **DetailPane** (right column) renders the currently-selected session's expanded view. Content shape per Sub-Q-MBTWBFCS-B (§3.2).
5. **Selection state** kept in the existing shell-mode-store surface (frame-mode-state.ts extended, OR new sibling state module — operator-flag at WB6). Persists across re-launches per shell-mode persistence precedent.
6. **main.ts wiring**: extend `frame-mode-state.ts` IPC handlers (line 460-468) IF selection state needs main-process persistence, OR keep selection state renderer-side only — Sub-Q-A operator-arbitrated.
7. **Audit §3 reclassification**: this ticket's findings doc (WB11) marks the audit row "Frame C — listview + detail" as SHIPPED (was WIREFRAME-VISION-NOT-SHIPPED). Sibling row "Frame A — fixed 4×4" remains as-is (Frame A toggle behavior is §C.1′ ticket #4 territory).

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify the existing Frame Router IPC contract (`frame-mode:get` + `frame-mode:set` at `main.ts:463-466`). Frame mode is `'A' | 'C'` per `frame-mode-state.ts:5` — this ticket consumes; does not extend the FrameMode enum.
- Does NOT modify MB-T12 tile-grid layout, drag-resize, or detach behavior. Frame C reads `TileGridSessionEntry[]` from the existing state stream but renders a DIFFERENT layout (list+detail) — Frame A continues to use the existing tile-grid mosaic.
- Does NOT modify the shipped `#shell` 3-region DOM layout (kanban webview + tile-grid + chat-region). Frame C re-uses the existing region containers; CSS `data-frame-mode='C'` toggles visibility per §3.3 below.
- Does NOT modify frozen surfaces: `REGISTRY.md` §2, `docs/build-docs/CONDUCTOR_API_CONTRACT.md`, `packages/dispatch-core/src/v3/schema.ts` §1-§13, `WORKSTATION_CONTRACT.md` §6 (located at repo root per actual filesystem; CLAUDE.md §1 cites this path). If Sub-Q-A=(β) is selected, the §6 amendment escalates to operator-arbitrated frozen-contract amendment per CLAUDE.md §2.4.
- Does NOT modify v3.5 plan-doc (`docs/coordination/v35-operational-readiness-2026-05-10.md`). Audit reclassification lives in WB11 findings doc; plan-doc updates remain operator-edit per D-2 plan-doc edit window discipline.
- Does NOT close `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Tier 2 at row 271). Tile reconciliation under external session death is sibling territory; Frame C consumes the same `TileGridSessionEntry[]` stream and inherits whatever state it surfaces.
- Does NOT measure Q-V35-7(a) thresholds. Measurement is dogfood Phase D, downstream of this ticket's merge.
- Does NOT author §C.1′ ticket #3 (detail-pane footer actions). Ticket #3 depends on this ticket's detail-pane shape per plan §6.2.

---

## §2 — Arbitration anchor (operator-frozen 2026-05-11 W3 dispatch)

### §2.1 — §A.1.R=(2) Frame-C-primary + A toggle (binding)

`[KNOWN-OPERATOR-ARBITRATED]`

Per `docs/coordination/v35-operational-readiness-2026-05-10.md` §A.1.R: Frame C is the PRIMARY shell mode showing session-list + detail-pane. Frame A is the toggle alternate (compact tile grid). §C.1 (three-region permanent) and §C.2 (full A/B/C/D) closed as not-selected. The Frame Router (§C.1′ ticket #1, `44764fd`) defaults `FrameMode = 'C'` at `frame-mode-state.ts:8` per this ratification.

This ticket SHIPS Frame C functionally; the Frame Router shipped the toggle UI + persistence. Together they close the audit §3 ARCHITECTURAL-MISMATCH partial.

### §2.2 — Audit §3 + §5.A architectural-mismatch resolution

`[KNOWN-OPERATOR-ARBITRATED]`

Audit row "Frame C — listview + detail (`.listview`, wireframe-recommended primary)" was WIREFRAME-VISION-NOT-SHIPPED at audit time (`docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §3). Resolution per §A.1.R=(2): Frame C ships in this ticket; audit reclassification lands at WB11.

Audit §5.A "Conductor panel container = side-panel or full-height region" ARCHITECTURAL-MISMATCH is sibling territory — Frame C surface lives in the tile-grid region of the existing 3-region shell; chat-region is unaffected. Sub-Q-MBTWBFCS-B may interact with this if (i) is selected (detail-pane reads swarm-state.md which is HSO-internal); otherwise no overlap.

### §2.3 — Construction order (file ownership for parallel-CC discipline)

`[KNOWN per plan §6.2 + §6.3]`

This ticket touches: NEW `frame-c/` directory + extension to `tile-grid-app.tsx` (Sub-Q-A=(α)) OR `main.ts` Frame Router sentinel zone (Sub-Q-A=(β)). File ownership is path-disjoint from MB-T-HSO-WIRE (main.ts MB-T-HSO-WIRE zone) + §C.1′ ticket #4 (tile.tsx tile-internal layout) per plan §6.2 parallel-CC viability row.

---

## §3 — GATE sub-arbitrations REQUIRED before specific WBs

Two operator decisions remain pre-execution prerequisites. Surface at HALT-MBTWBFCS-AUTHORED for operator resolution before WB7 (Sub-Q-B detail-pane content) and before WB9 (Sub-Q-A WORKSTATION_CONTRACT §6 amendment scope).

### §3.1 — Sub-Q-MBTWBFCS-A: WORKSTATION_CONTRACT §6 amendment for Frame-C state IPC

Required before **WB9** (main.ts wiring). Default if unresolved: **(α) renderer-only selection state, no §6 amendment**.

| Option | Mechanism | Frozen-surface touch | Persistence |
|---|---|---|---|
| (α) Renderer-only | Selection state lives in React state inside the new `frame-c/` mount; not persisted across reloads. Frame C re-mounts with no selection on each reload. | NONE — no IPC change | Lost on reload (acceptable per minimum-viable scope) |
| (β) Extend frame-mode-state.ts | Add `selectedSessionName?: string` to the persisted state object; expose via existing `frame-mode:get` + `frame-mode:set` payload OR new `frame-mode:get-selection` + `frame-mode:set-selection` IPC. | YES — `WORKSTATION_CONTRACT.md` §6 amendment if new IPC channels (operator-arbitrated per CLAUDE.md §2.4); NO if payload extension only (additive — operator-arbitratable as minor amendment) | Persists across reloads |
| (γ) Sibling state module | New `frame-c-state.ts` adjacent to `frame-mode-state.ts` with its own IPC pair (`frame-c:get-selection` + `frame-c:set-selection`). Mirrors `splitter-state.ts` + `frame-mode-state.ts` precedent. | YES — `WORKSTATION_CONTRACT.md` §6 amendment for new IPC channels (operator-arbitrated per CLAUDE.md §2.4) | Persists across reloads |

`[MODELED]` Recommend **(α)** for ship-velocity. Selection-state-not-persisted is an honest UX trade-off; wireframe vision (per `wireframes.jsx:570-571` cited in audit §3) does not specify persistence. Filing as Tier 3 followup at WB11 if operator wants persistence post-ship.

Operator decision pending.

### §3.2 — Sub-Q-MBTWBFCS-B: DetailPane content shape

Required before **WB7** (DetailPane component). Default if unresolved: **(i) session-summary text from swarm-state.md**.

| Option | Content source | Dependency | UX |
|---|---|---|---|
| (i) Summary text | Reads `docs/swarm-state.md` (MB-T-HSO-WIRE WB3 swarm-state-writer at `8c81188`); detail-pane shows the section for the selected session (active orchestrator status / standby status / peer summaries). | MB-T-HSO-WIRE WB3 shipped — `[KNOWN]`. Simple file-read at renderer side via existing `workstation:fs-read` IPC (verify channel availability at WB7) OR new minimal IPC if `workstation:fs-read` doesn't exist. | Static snapshot per render; refresh-on-selection-change |
| (ii) Live PTY tail | Detail-pane shows last N (e.g., 200) lines of the selected session's PTY stdout via `consoleController.addStdoutObserver` per-session filter. | MB-T37 console broadcaster — `[KNOWN]`. No new IPC; renderer subscribes via existing `coarchitect:ptyChunk` channel OR new tile-scoped channel. | Live-updating; ring-buffer behavior; matches wireframe `.listview` `.col-detail` "log tail" feel |
| (iii) Hybrid | Tab strip in detail-pane: "Summary" (i source) + "Live" (ii source). Operator selects per session. | Both (i) + (ii) dependencies. | Richest UX; +1-2 WBs |

`[MODELED]` Recommend **(i)** for ship-velocity v1; **(iii) hybrid** is the natural v1.1 follow-on. (ii) live PTY alone is operator-actionable (matches wireframe) but loses the swarm-state context that HSO autonomy already provides. (i) leverages MB-T-HSO-WIRE downstream value directly.

`[KNOWN]` Dependency check: MB-T-HSO-WIRE's `swarm-state.md` writer is shipped at `8c81188` (per `docs/coordination/mb-t-hso-wire-findings-2026-05-11.md` §I commit chain). File path is `docs/swarm-state.md` per main.ts:528 wiring.

Operator decision pending.

---

## §4 — WB ladder

11 WBs baseline (Sub-Q-A=(α) + Sub-Q-B=(i)); 12-13 WBs if Sub-Q-A=(β/γ) or Sub-Q-B=(iii). Construction-order: scaffold → list → selection → detail → wiring → smoke → docs.

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CLAUDE.md §10.5; per-path `git add` per §2.7; push after each cairn-grammar commit per §2.6.

### WB1 — `red(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): probe-MBTWBFCS-01-frame-c-mount`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwbfcs-01-frame-c-mount.spec.tsx` (NEW dir). Asserts: when `data-frame-mode='C'` is set on `#shell` (per Frame Router CSS hook), a new `frame-c/` mount renders into the tile-grid region with a Frame-C-specific root element (e.g., `data-testid="frame-c-root"`). Probe fails RED — `frame-c/` directory does not yet exist.
**Acceptance:** probe RED on import-resolve failure (no `frame-c/mount.tsx`) OR on assertion (no `frame-c-root` rendered).
**Frozen contracts touched:** none — probe-only.

### WB2 — `green(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): scaffold frame-c/ directory + minimal mount.tsx`

**Type:** green
**Scope:** GREEN at NEW `packages/dispatch-workstation/src/frame-c/`:
- `frame-c/mount.tsx` — exports `mountFrameC(root: HTMLElement, props: FrameCMountProps): { dispose(): void }` mirroring `tile-grid/mount.ts` + `chat-shell/mount.ts` factory pattern.
- `frame-c/frame-c-root.tsx` — top-level component with `data-testid="frame-c-root"`; renders two-column layout (`<div data-testid="frame-c-session-list-col" />` + `<div data-testid="frame-c-detail-col" />`) with placeholder content.
- `frame-c/index.ts` — barrel export for the mount factory + types.
**Acceptance:** WB1 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none — new directory, no existing-file modification.
**Build pipeline:** May need new esbuild script at `packages/dispatch-workstation/scripts/build-frame-c.mjs` per CLAUDE.md §3.7 (each renderer surface has its own esbuild script). Flag at HALT-WB2-PRE-COMMIT.

### WB3 — `red(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): probe-MBTWBFCS-02-session-list-renders`

**Type:** red
**Scope:** RED probe at `probe-mbtwbfcs-02-session-list-renders.spec.tsx`. Asserts: when Frame C is mounted with `props.sessions: TileGridSessionEntry[]` of length N, the SessionList component renders N list rows (each with `data-testid="frame-c-session-row-{name}"`). Asserts row content includes session name + status badge + repo/branch when present. Probe fails RED — SessionList component does not yet exist.
**Acceptance:** probe RED. Commit body Q1-Q9.
**Frozen contracts touched:** none.

### WB4 — `green(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): SessionList component`

**Type:** green
**Scope:** GREEN at `frame-c/session-list.tsx`. Consumes `readonly TileGridSessionEntry[]` prop. Renders one row per entry: session name, status badge (mirrors `tile-header.tsx` status-dot semantics), repo name, branch name, token meter (compact form using `tile-header.tsx:139` `tokenBudget` default). Row click handler exposed as `onSelect(sessionName)` callback (selection wiring at WB5+WB6). Compact list-item form factor; NOT the full tile-header chrome.
**Acceptance:** WB3 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none.
**Consumer probes (CLAUDE.md memory):** verify MB-T12 tile-grid-app.tsx still renders correctly when Frame A is active (no regression in tile-mosaic layout). Run tile-grid existing probes per WB4 post-commit.

### WB5 — `red(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): probe-MBTWBFCS-03-selection-state`

**Type:** red
**Scope:** RED probe at `probe-mbtwbfcs-03-selection-state.spec.tsx`. Asserts: clicking a SessionList row updates the selection state visible to DetailPane (asserted by data-testid + selected-state attribute on the clicked row, e.g., `aria-selected="true"`). Selection state shape depends on Sub-Q-A — for (α) renderer-only, the probe asserts React state mutation; for (β/γ) it asserts IPC roundtrip. Probe fails RED — selection wiring absent.
**Acceptance:** probe RED. Commit body Q1-Q9.
**Sub-Q-A blocker:** WB6 cannot proceed until Sub-Q-A resolves the selection-persistence mechanism. Probe shape parameterized accordingly — flag at HALT-WB5-PRE-COMMIT.

### WB6 — `green(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): selection state wiring`

**Type:** green
**Scope:** GREEN at `frame-c/` (and conditionally `main.ts` per Sub-Q-A):
- Sub-Q-A=(α) renderer-only: `frame-c/frame-c-root.tsx` holds `useState<string | null>(selectedSessionName)`; SessionList `onSelect` writes; DetailPane reads via prop.
- Sub-Q-A=(β) extend frame-mode-state: extend persisted state shape; reuse existing `frame-mode:get`/`set` payload OR add minor IPC. Touches `frame-mode-state.ts` + `main.ts` line 463-466 zone.
- Sub-Q-A=(γ) sibling state module: NEW `frame-c-state.ts` + NEW IPC channels. Touches WORKSTATION_CONTRACT.md §6 — REQUIRES operator-arbitrated frozen-contract amendment per CLAUDE.md §2.4 BEFORE WB6 GREEN. Surface at HALT-WB6-PRE-COMMIT.
**Acceptance:** WB5 probe flips RED → GREEN. Commit body Q1-Q9.

### WB7 — `red(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): probe-MBTWBFCS-04-detail-pane-renders`

**Type:** red
**Scope:** RED probe at `probe-mbtwbfcs-04-detail-pane-renders.spec.tsx`. Asserts (per Sub-Q-B):
- (i) summary text — DetailPane displays the swarm-state.md section for selected session (asserted by querying `data-testid="frame-c-detail-summary"` text content includes a known fixture from a mock swarm-state.md). Mock IPC `workstation:fs-read` (or equivalent).
- (ii) live PTY tail — DetailPane subscribes via `coarchitect:ptyChunk` filtered for selected session; asserts chunks appear in ring-buffer order.
- (iii) hybrid — both (i)+(ii) test branches.

Probe fails RED — DetailPane component absent.
**Acceptance:** probe RED with conditions per Sub-Q-B resolution. Commit body Q1-Q9.
**Sub-Q-B blocker:** WB8 cannot proceed until Sub-Q-B resolves. Probe shape parameterized — flag at HALT-WB7-PRE-COMMIT.
**MB-T-HSO-WIRE dependency (Sub-Q-B=(i)/(iii))**: `docs/swarm-state.md` file path must exist post-MB-T-HSO-WIRE merge (confirmed `[KNOWN]` per findings doc).

### WB8 — `green(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): DetailPane component`

**Type:** green
**Scope:** GREEN at `frame-c/detail-pane.tsx`:
- (i) Read swarm-state.md content via existing renderer-accessible IPC (research at WB8 start; either `workstation:fs-read` or expose narrow `workstation:read-swarm-state` IPC if no fs-read exists). Parse the markdown structure to extract the section for selected session. Render with monospace formatting.
- (ii) Subscribe to `coarchitect:ptyChunk` via existing preload contextBridge; filter by selected session name (need to confirm channel filters by session OR add per-session filter at renderer); render as scrollback ring-buffer.
- (iii) Tab strip + both bodies.
**Acceptance:** WB7 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on Sub-Q-B:
- (i) MAY need new minimal IPC `workstation:read-swarm-state` if no existing fs-read IPC — operator-arbitrated `WORKSTATION_CONTRACT.md` §6 amendment per CLAUDE.md §2.4 IF added. Surface at HALT-WB8-PRE-COMMIT.
- (ii) Reuses existing `coarchitect:ptyChunk` (MB-T40 shipped) — no contract touch.

### WB9 — `red(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): probe-MBTWBFCS-05-main-ts-wiring`

**Type:** red
**Scope:** RED probe at `probe-mbtwbfcs-05-main-ts-wiring.spec.tsx`. Source-text inspection of `main.ts`: asserts a NEW sentinel zone `=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE wiring ===` exists; contains the mount-time wiring for the new `frame-c/` surface (`tryAutoMountFrameC()` or equivalent factory call); placed inside the `app.whenReady()` callback after Frame Router header mount.
**Acceptance:** probe RED — sentinel zone absent. Commit body Q1-Q9.

### WB10 — `green(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): main.ts wiring + workstation-shell.html DOM region`

**Type:** green
**Scope:**
- main.ts: NEW sentinel zone `=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE wiring ===` placed AFTER the existing `§C.1′ frame-mode IPC` zone (line 460-468) but inside the same `app.whenReady()` callback. Renderer mount happens via `tile-grid/mount.ts`-style auto-mount in the chat-shell or workstation-shell.html script tag (renderer-side); main.ts wires any IPC that Sub-Q-A=(β/γ) requires.
- workstation-shell.html: Add `<div id="frame-c-root">` region inside the tile-grid region container OR adjacent; CSS `[data-frame-mode='C'] #frame-c-root { display: ... }` toggles visibility per Frame Router pattern (CSS is operator-territory per §C.1′ ticket #1 styling; may need ticket #1 CSS amendment — flag at HALT-WB10-PRE-COMMIT).
- `tile-grid/mount.ts` extension: add `tryAutoMountFrameC()` mirroring `tryAutoMountFrameShellHeader()` at `mount.ts:131-148`; invoked from the same auto-mount block.
**Acceptance:** WB9 probe flips RED → GREEN. Commit body Q1-Q9. SURFACE HALT-WB10-PRE-COMMIT for operator review of: (a) workstation-shell.html DOM region addition; (b) CSS amendment scope if needed (ticket #1 territory); (c) Sub-Q-A=(γ) IPC additions if selected.
**Frozen contracts touched:** conditional on Sub-Q-A=(γ).

### WB11 — `green(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): runtime-launch smoke verification`

**Type:** green (smoke harness)
**Scope:** per CLAUDE.md §4.6:
1. Build fresh (`pnpm --filter dispatch-workstation build`).
2. Launch electron from dist.
3. Observe within ~10s: `WINDOW_READY` sentinel + `data-frame-mode='C'` default + Frame C surface mounts and renders.
4. With ≥1 spawned session: SessionList shows the session; click selects; DetailPane renders selected session's content per Sub-Q-B.
5. Toggle Frame A via FrameShellHeader tab — Frame C hides; tile-grid mosaic shows. Toggle back to Frame C — Frame C re-renders with previous (Sub-Q-A=(α): cleared) or persisted (Sub-Q-A=(β/γ)) selection.
**Acceptance:** all 5 steps verified. Evidence: `docs/coordination/mbtwbfcs-runtime-smoke-2026-05-11.md`.
**Frozen contracts touched:** none.

### WB12 — `docs(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): findings doc + audit reclassification + followup updates`

**Type:** docs
**Scope:** author `docs/coordination/mbtwbfcs-findings-<date>.md` per `mb-t-hso-wire-findings-2026-05-11.md` format anchor: I What Shipped / II Q-disposition / III Architectural deltas / IV Probe distribution / V Architecture notes / VI Documentation drift / VII Consumer non-regression / VIII WB Skip Rationale / IX New Followups Filed / X Open Items.

Followup updates to `docs/FOLLOWUPS.md`:
- File NEW Tier 3 row if Sub-Q-A=(α) selected: `MB-F-FRAME-C-SELECTION-NOT-PERSISTED` — selection state lost on reload; operator-arbitrated re-open if persistence becomes load-bearing.
- File NEW Tier 2 row if Sub-Q-B=(ii) selected: `MB-F-FRAME-C-DETAIL-PANE-NO-SWARM-CONTEXT` — detail pane shows live PTY but no HSO context; consider hybrid follow-on.
- Reference `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Tier 2 at row 271) — Frame C surfaces the same TileGridSessionEntry stream that the audit row tracks; cross-ref only.
- Author audit-reclassification stamp: `wireframe-vs-shipped-audit-2026-05-09.md` §3 "Frame C — listview + detail" row classification flips from WIREFRAME-VISION-NOT-SHIPPED → SHIPPED, with closure SHA reference to this ticket's final WB10/WB11 commit.

**Acceptance:** findings doc + FOLLOWUPS.md updates + audit-reclassification stamp land. Commit body Q1-Q9.
**Frozen contracts touched:** none — docs only.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED by this ticket

| Followup / Row | Tier | Closure path | Closing WB |
|---|---|---|---|
| Audit §3 "Frame C — listview + detail" WIREFRAME-VISION-NOT-SHIPPED | (audit row) | WB1-WB10 implementation; WB11 smoke; WB12 reclassification stamp | WB12 |
| (CONDITIONAL Sub-Q-B=(i)/(iii)) MB-F-FRAME-C-DETAIL-PANE-DATA-SOURCE-CHOICE | (NEW filing in WB12) | WB7 + WB8 implement (i) or (iii) per Sub-Q-B | WB12 |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB2 may discover that the build pipeline (CLAUDE.md §3.7) does not auto-discover new renderer surfaces — new `build-frame-c.mjs` script + `package.json` `build` chain extension required. File Tier 3 followup if discovery is non-obvious.
- WB4 may surface MB-T12 tile-grid coupling that wasn't visible at planning time — e.g., if `TileGridSessionEntry[]` is only accessible from inside `tile-grid-app.tsx` (not exported), refactor scope expands. File Tier 2 followup if so.
- WB6 (Sub-Q-A=(α) renderer-only) may surface the non-persistence UX as load-bearing under realistic operator multi-launch workflows; file Tier 3 follow-on at WB12.
- WB8 (Sub-Q-B=(i)) may discover that `workstation:fs-read` IPC does NOT exist; either narrow new IPC (`workstation:read-swarm-state`) or wider `workstation:fs-read` becomes the choice. Surface at HALT-WB8-PRE-COMMIT.
- WB10 may discover that workstation-shell.html DOM region addition needs ticket #1 CSS coordination — pause if so; coordinate via HALT-WB10-PRE-COMMIT operator surface.
- WB11 smoke may surface MB-T-HSO-WIRE swarm-state.md emptiness when no actions have fired yet — UX implication: detail-pane shows "no swarm state yet" placeholder. File Tier 3 followup for placeholder content guidance.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| §C.1′ ticket #1 Frame Router | `44764fd` | `frame-mode-state.ts` (5-line FrameMode union); `frame-shell-header.tsx` (tab strip); `tile-grid/mount.ts:122-148` (applyFrameMode + tryAutoMountFrameShellHeader pattern); `main.ts:62-68` (imports zone) + `main.ts:460-468` (IPC zone). |
| MB-T12 tile-grid | (MB-T12 commit chain) | `tile-grid/tile-grid.tsx:29-52` (`TileGridSessionEntry` shape); `tile-grid/tile-grid-app.tsx` (state stream + onSpawnResult subscription). |
| MB-T-HSO-WIRE (CONDITIONAL Sub-Q-B=(i)/(iii)) | `c8dd797` (WB14d HEAD post-ticket) + `8c81188` (WB3 swarm-state-writer wired) | `docs/swarm-state.md` file existence + content shape per `swarm-state-writer.ts`. |
| MB-T40 (CONDITIONAL Sub-Q-B=(ii)/(iii)) | `5704dd2` | `pty-stream-relay.ts` + `coarchitect:ptyChunk` channel + preload bridge. |

### §5.4 — Plan-doc anchors (read at WB1 start)

- `docs/coordination/v35-operational-readiness-2026-05-10.md` §A.1.R (Frame-C-primary ratification)
- §6.2 (parallel-track row for this ticket)
- §6.3 (parallel-CC viability + file-ownership disjointness)
- §7.x (risk rows that mention Frame C)
- §8.4 — "Frame C surface ships displaying empty session list (if §C.1′ #2 ships before MB-T-HSO-WIRE)" — note: MB-T-HSO-WIRE is shipped at HEAD `c8dd797`, so this risk is now retired. WB12 findings doc should note retirement.

### §5.5 — Audit-doc anchors (read at WB1 start)

- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §3 (Dim 1 Frame Layout — primary closure target row)
- §5.A (Conductor panel container — adjacent ARCHITECTURAL-MISMATCH, not closed by this ticket)
- §7 (Dim 5 data model — gaps may surface during WB4 SessionList authoring if `TileGridSessionEntry` is missing fields the wireframe assumes)

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

Each cairn-grammar commit body answers all nine questions. Expected shapes per WB type:

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | N/A — observational RED | BEHAVIOR (mount + render via vitest + @testing-library/react) | No — impl absent; probe RED until WB2 | No — probe-only | No | KNOWN/MODELED applied | new test/unit/frame-c/ path-disjoint from T2/T3 territories | N/A | No (HALT auto-ack per op autonomous mode) |
| WB2 GREEN | (see WB1) | BEHAVIOR (real mount → real DOM) | No — impl load-bearing | No | No | KNOWN/MODELED applied | frame-c/ new dir; tile-grid-app.tsx untouched at WB2 | N/A | No |
| WB3-WB8 RED+GREEN | N/A | BEHAVIOR for each | RED → GREEN flip per WB pair | No | conditional on Sub-Q-A=(γ) IPC additions | KNOWN/MODELED applied | per-WB ownership stays within frame-c/ + (optional) frame-mode-state.ts | N/A | No |
| WB9 RED | N/A | BEHAVIOR (source-text inspection of main.ts) | No — sentinel zone absent | No | No (probe-only) | KNOWN/MODELED applied | main.ts read-only at WB9 RED | N/A | No |
| WB10 GREEN | (see WB9) | BEHAVIOR (real main.ts wiring + real workstation-shell.html DOM addition) | No — impl load-bearing | conditional on Sub-Q-A=(γ) | conditional on §6 amendment | KNOWN/MODELED applied | main.ts MB-T-HSO-WIRE / Frame Router zone-disjoint at WB10 zone; coordinate with concurrent sessions if any | N/A | No |
| WB11 smoke | N/A | BEHAVIOR (real electron launch + real DOM + real daemon if HSO-dependent) | No — verifies WB1-WB10 integration | No | No | KNOWN per observed sentinels | none — observational | N/A | No |
| WB12 docs | N/A | N/A | N/A | No — docs/coordination/ + docs/FOLLOWUPS.md edits | No | KNOWN per direct ticket-execution evidence | docs paths disjoint from production | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1-WB10 cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed to origin/main.
2. **`frame-c/` directory shipped**: contains `mount.tsx` factory + `frame-c-root.tsx` two-column shell + `session-list.tsx` + `detail-pane.tsx` + `index.ts` barrel.
3. **Frame Router default mode 'C' renders Frame C functionally**: when workstation launches at default state, operator sees session-list (left) + detail-pane (right) in the tile-grid region; Frame A toggle hides Frame C and shows the tile-grid mosaic.
4. **Selection state works per Sub-Q-A**: clicking a SessionList row updates the DetailPane content; persistence behavior matches Sub-Q-A resolution.
5. **DetailPane content renders per Sub-Q-B**: selected session's content (summary / live / hybrid) appears in the right column.
6. **5-package typecheck CLEAN** per CLAUDE.md §4.4 (one command at a time).
7. **No regression in v3.5 probes** — `probe-mbthsowire-{02,04,06,08,10,12}` + MB-T12 tile-grid probes continue to pass.
8. **WB11 runtime smoke** confirms WINDOW_READY + Frame C mount + selection + DetailPane content + Frame A/C toggle.
9. **WB12 findings doc + FOLLOWUPS.md updates** lands; audit §3 "Frame C — listview + detail" row stamped SHIPPED.
10. **Operator-visible UX**: Frame C as default shell mode does NOT regress operator's ability to launch + use the workstation; if Sub-Q-B=(i) detail-pane shows "no swarm state yet" placeholder when MB-T-HSO-WIRE has not yet produced swarm-state.md, that placeholder is honest UX (not crash).

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `TileGridSessionEntry[]` only accessible via `tile-grid-app.tsx` internal React state — Frame C cannot consume without refactor | `[MODELED-MEDIUM]` (likely some refactor; tile-grid-app.tsx holds state internally per its WB12 wiring) | `[MODELED-MEDIUM]` (+1-2 WBs if SessionList needs its own state-stream subscription) | WB1 reading scope includes `tile-grid-app.tsx` state-stream extraction; if non-trivial refactor needed, surface at HALT-WB3-PRE-COMMIT for operator approval before WB4 |
| Sub-Q-A=(γ) IPC additions trigger WORKSTATION_CONTRACT.md §6 amendment — operator-arbitration required mid-ticket | `[KNOWN]` if (γ) chosen | `[MODELED-MEDIUM]` (separate operator-arbitrated commit per CLAUDE.md §2.4) | Default to (α) renderer-only; only escalate to (β/γ) if persistence is operator-load-bearing per HALT-MBTWBFCS-AUTHORED ack |
| Sub-Q-B=(i)/(iii) depends on swarm-state.md existing — runtime check needed since HSO may not have written yet | `[MODELED-LOW]` (MB-T-HSO-WIRE shipped; swarm-state-writer is wired; first-write happens on first action emission) | `[MODELED-MEDIUM]` (UX: detail-pane shows "no swarm state yet" until first action) | WB8 implements placeholder copy; WB11 smoke verifies placeholder is honest under no-HSO-activity conditions |
| Sub-Q-B=(ii)/(iii) live PTY tail requires per-session `coarchitect:ptyChunk` filter — channel may not filter by session today | `[MODELED-MEDIUM]` (MB-T40 channel is per-PTY-output broadcast; renderer needs session-filter logic) | `[MODELED-MEDIUM]` (filter at renderer is acceptable but high-volume PTY may cause performance issues) | WB7 probe asserts filter behavior; WB8 implements renderer-side filter; performance concerns filed as Tier 3 followup if observed |
| workstation-shell.html DOM region addition (WB10) collides with §C.1′ ticket #1 CSS scope — Frame C visibility CSS lives in ticket #1 territory | `[MODELED-MEDIUM]` | `[MODELED-MEDIUM]` (coordination with ticket #1 CSS surface; may require ticket #1 CSS amendment) | HALT-WB10-PRE-COMMIT surfaces the workstation-shell.html addition for operator review; if CSS amendment needed, scope-clarify before commit |
| Build pipeline (CLAUDE.md §3.7) does NOT auto-discover new renderer surface — `frame-c/` needs new `build-frame-c.mjs` esbuild script + `package.json` extension | `[MODELED-MEDIUM]` (each renderer surface has its own script per §3.7) | `[MODELED-LOW]` (additive build-script; well-precedented; minor scope) | WB2 includes the build-script addition; flag at HALT-WB2-PRE-COMMIT if non-obvious |
| Frame C session-list shows EMPTY at first launch (no sessions spawned yet) under v3.5 HSO-not-yet-active conditions | `[KNOWN]` | `[MODELED-LOW]` (UX: empty list with spawn-button or "no sessions yet" placeholder) | WB4 SessionList renders explicit empty-state copy; matches existing tile-grid empty-state pattern at MB-T12 |
| Frame C is the DEFAULT shell mode (frame-mode-state.ts:8 `DEFAULT_MODE: FrameMode = 'C'`) — first-launch UX risk if Frame C is buggy | `[MODELED-MEDIUM]` (architectural choice locks Frame C in front of operator on every launch) | `[MODELED-HIGH]` (operator UX regression if Frame C crashes at mount or fails to render) | WB11 smoke is load-bearing for this risk; HALT-WB11-PRE-COMMIT can request operator manual smoke OR feature-flag the default switch to Frame A pending WB11 stability |
| `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Tier 2 at row 271) — Frame C inherits TileGridApp's missing daemon SSE subscription | `[KNOWN]` | `[MODELED-LOW]` (SessionList shows stale entries for externally-killed sessions — same as tile-grid today) | Cross-ref in WB12 docs; this ticket does NOT close row 271 |

---

**End of MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE ticket body.**

Pending operator resolutions before execution:
- Sub-Q-MBTWBFCS-A (§3.1) — selection-state persistence mechanism (α renderer-only / β extend frame-mode-state / γ sibling state module)
- Sub-Q-MBTWBFCS-B (§3.2) — DetailPane content shape (i summary / ii live PTY / iii hybrid)

Plus optional flag-at-WB10 question: workstation-shell.html DOM region scope vs §C.1′ ticket #1 CSS coordination.
