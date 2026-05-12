# MB-T-WIREFRAME-T1-SESSION-DATA-FLOW — Frame C left-rail data integration (sessions stream + model + status + uptime + filter + selection)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-12
**Authored under:** §3.4 operator-supervised mechanical translation discipline (full-build-mode dispatch §3.2)
**Authoring delegate:** T1 sub-session (gen-3 orchestrator dispatch, Round 9 of cairn-under-stress)
**Authoring anchor commit (HEAD at authoring time):** `8eab991`
**Cairn ladder anchor:** full-build-mode dispatch §2 workstream T1 (Session data flow — left rail population)
**Closes / advances:**
- `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` (Tier 2, `docs/FOLLOWUPS.md:327` — filed at `e2688fa`) — **primary closure target** (Sub-Q-T1-A → WB4-WB5 sessions-stream wiring closes this row).
- Audit `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §7 Dim 5 data-model rows: advances `branch` (STUB → SHIPPED-conditional-on-Sub-Q-T1-B), `model` (STUB → SHIPPED-conditional-on-Sub-Q-T1-B), `state` (ARCHITECTURAL-MISMATCH → partial-mapped-via-Sub-Q-T1-C), `time` (STUB → SHIPPED-conditional-on-Sub-Q-T1-D).
- Audit §10.5 "Filter row" row (`docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md:498`): advances from "Defer to v3.6" to SHIPPED (filter UI + logic; status/repo enum scoping per Sub-Q-T1-C resolution).
- Full-build-mode dispatch §2 T1 enumeration items 1-6 (all six bullets).

**Depends on (all merged):**
- MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE (Wave B, final WB10 GREEN at `ea11bc7`; full ladder a1f7a03→ea11bc7) — Frame C surface + SessionList component + FrameCRoot selection state baseline.
- MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE (Wave C #5 WB4 at `bd31b94`) — `ctx N%` text rendering already shipped on Frame C session rows + DetailPane.
- MB-T12 tile-grid (final at `MB-T12` chain) — `TileGridSessionEntry` shape + `tile-grid-app.tsx` state stream + `workstationBridge.onSpawnResult` subscription model.
- `§C.5` `tile-token-scraper.ts` + `workstation:tile-token-update` IPC (`13b7607`) — PTY-scrape source for `tokensUsed`/`tokenBudget`.

**Downstream gates:**
- T2 (Focused session terminal stream) consumes `selectedEntry` from this ticket's data flow; path-disjoint at file level but reads the same `selectedSessionName` state surface.
- T3 (Action bar kill/diff/merge/focus) reads `selectedSessionName` from FrameCRoot — already wired Wave B WB6; no change in T1.
- T5 (BUILD.md driven dispatch) eventually feeds new session entries through the same spawn-result pathway that T1 surfaces; no direct dependency.
- T7 (Visual polish) consumes the rendered SessionList + filter bar after T1 ships structure + behavior; T7 polishes CSS / colors / spacing.

**Estimated WB count:** 10-12 baseline (11 WBs default path; 10-12 swing per Sub-Q resolutions; +1 if frozen-surface §6 amendment triggers).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first to understand binding vs deferred work.
2. Read §3 (Sub-Q gate arbitrations) — six operator decisions parameterize WB scope; default recommendations are `[MODELED]` and operator may ack or redirect.
3. Read §4 (WB ladder) for execution order. WBs are construction-order-aware: probe-then-impl per cairn discipline.
4. §5-§9 are operational supports — cross-references, self-check expectations, definition of done, risk register, IPC amendment outline.

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]` observed in this session via direct source read; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence. Operator-frozen-envelope outcomes are `[KNOWN-OPERATOR-ARBITRATED]` and binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per full-build-mode dispatch §2 T1 enumeration + §3.2 mechanical-translation authorization:

1. **Replaces Frame C empty-sessions stub** at `packages/dispatch-workstation/src/tile-grid/mount.ts:175-181` (`tryAutoMountFrameC` currently calls `mountFrameC(root, { sessions: [] })`) with a live `TileGridSessionEntry[]` stream consumed from the source-of-truth surface defined by Sub-Q-T1-A resolution.

2. **Per-tile model badge population**: extends `TileGridSessionEntry.model` field from default-stub (`'claude-sonnet-4-6'` default per audit §7 Dim 5 row) to real-data population per Sub-Q-T1-B resolution. Renders short-form badge label on Frame C session row (e.g., `S4.6` for `claude-sonnet-4-6`, `O4.6` for `claude-opus-4-6`, `O4.7·1M` for opus 4.7 with 1M context, `H` for haiku). Mapping table lives in NEW `packages/dispatch-workstation/src/frame-c/model-badge.ts`.

3. **Per-tile status indicator wiring (green/amber/red/grey)**: extends current `SessionList` status-dot rendering (`session-list.tsx:64-70` `STATUS_DOT_HEX` Wave B WB4 subset {open: green, collapsed: grey, detached: amber}) to a four-color wireframe-equivalent enum (green / amber / red / grey) per Sub-Q-T1-C resolution. Mapping table lives in NEW `packages/dispatch-workstation/src/frame-c/status-color.ts`.

4. **Per-tile uptime real-data wiring**: extends `TileGridSessionEntry` with `uptimeStartedAtMs?: number` field (or equivalent per Sub-Q-T1-D resolution); Frame C session row renders `HH:MM` uptime via renderer-side delta from current time. Currently NOT in `TileGridSessionEntry` shape (per `tile-grid.tsx:29-52` field inventory).

5. **Filter dropdowns + filter logic**: NEW `packages/dispatch-workstation/src/frame-c/session-filter-bar.tsx` component renders the wireframe's three controls (status dropdown + repo dropdown + Clear button). Filter state lives per Sub-Q-T1-E resolution (renderer-only useState OR persisted via NEW `frame-c-filter-state.ts`). Filtering applies before rendering rows; preserves the original session count for an out-of-band "N of M" label per wireframe.

6. **Tile selection persistence across re-renders**: revisits Wave B Sub-Q-MBTWBFCS-A=α (renderer-only `useState` in FrameCRoot per `a1f7a03` §3.1 default decision) per Sub-Q-T1-F resolution. Either upgrade to persisted state OR remain deferred per operator arbitration.

7. **Audit reclassification**: this ticket's findings doc (WB-final docs) updates audit `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §7 Dim 5 rows + §10.5 row per the closures landed (conditional on Sub-Q resolutions).

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify Frame C's existing two-column layout (`frame-c-root.tsx`) shell structure — extends state-stream wiring + adds filter bar above SessionList, but the column shell remains.
- Does NOT modify DetailPane content rendering (T2 sibling territory — `detail-pane.tsx` line read-only here).
- Does NOT modify action bar (T3 sibling territory — `action-bar.tsx`).
- Does NOT modify MB-T12 tile-grid mosaic layout, drag-resize, swap, or detach behavior. May extend `tile-grid-app.tsx` state-stream visibility per Sub-Q-T1-A=(α/δ) but does not change tile-grid rendering or behavior.
- Does NOT modify frozen surfaces unless Sub-Q-T1-A=(γ) / Sub-Q-T1-C=(iii) / Sub-Q-T1-E=(β) is selected, in which case `WORKSTATION_CONTRACT.md` §6 amendment scope is surfaced at HALT-WB-PRE-COMMIT gate per CLAUDE.md §2.4 (separate operator-arbitrated commit per dispatch §3.3 pattern).
- Does NOT modify `dispatch-core/src/v3/schema.ts` (Sub-Q-T1-B=(ii) would touch this — recommended against in §3.2 default).
- Does NOT close `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Tier 2 at `docs/FOLLOWUPS.md:271`) — Frame C inherits TileGridApp's missing daemon-SSE subscription. Cross-ref only.
- Does NOT modify spawn-confirm-modal, audit-modal, onboarding, or any other renderer surface outside `src/frame-c/` + (conditionally) `src/main/main.ts` sentinel zone.
- Does NOT introduce electron-store or any new persistence library (CLAUDE.md §3.5 — mirror `splitter-state.ts` raw `fs` pattern if Sub-Q-T1-E=(β) is selected).
- Does NOT add a daemon-SSE subscription (sibling row 271 territory).

---

## §2 — Arbitration anchor (operator-frozen via full-build-mode dispatch 2026-05-11)

### §2.1 — Dispatch §2 T1 enumeration (binding)

`[KNOWN-OPERATOR-ARBITRATED]`

Per `docs/coordination/full-build-mode-dispatch.md` §2 T1: T1 ships the six bullets listed in §1.1 of this ticket body. Operator pre-arbitrated this scope as the canonical wireframe-parity workstream for the left-rail data path; sub-session may draft ticket bodies as operator-supervised mechanical translation per dispatch §3.2.

### §2.2 — Visual-comparison gate (dispatch §3.5)

`[KNOWN-OPERATOR-ARBITRATED]`

Per dispatch §3.5 closure-path-γ addition to auto-ack envelope §C: `green:wiring` AUTO-ACK requires headless screenshot generation OR operator-manual-screenshot fallback. WB-final smoke (per CLAUDE.md §4.6 runtime-launch smoke + dispatch §3.5 visual-diff gate) consumes the screenshot path; if T6 headless pipeline ships before this ticket's WB-final, smoke uses it; else operator-manual-screenshot at HALT-WB-FINAL-PRE-COMMIT.

### §2.3 — Frozen-contract amendment scoping (binding pattern)

`[KNOWN-OPERATOR-ARBITRATED]`

Per dispatch §3.3: new IPC channels require WORKSTATION_CONTRACT.md §6 amendment per CLAUDE.md §2.4 (operator-arbitrated separate commit; sub-session drafts amendment text, operator HALT-PRE-COMMIT reviews exact language). This ticket's default Sub-Q recommendations avoid amendments (Sub-Q-T1-A=(δ) Context, Sub-Q-T1-B=(i) workstation spawn extension, Sub-Q-T1-C=(i) existing TileStatus, Sub-Q-T1-D=(i)/(iii) renderer-internal, Sub-Q-T1-E=(α) renderer-only). Non-default selections escalate to amendment scope and add HALT gates accordingly.

### §2.4 — Construction order (file ownership for parallel-CC discipline)

`[KNOWN per dispatch §5.1 + this ticket §5.3]`

T1 primary territory:
- NEW `packages/dispatch-workstation/src/frame-c/sessions-provider.tsx` (Sub-Q-A=(α/δ) shape) OR NEW `packages/dispatch-workstation/src/frame-c/sessions-stream-subscription.ts` (Sub-Q-A=(β) shape) — choice gated on Sub-Q-T1-A
- NEW `packages/dispatch-workstation/src/frame-c/model-badge.ts` (model→label mapping)
- NEW `packages/dispatch-workstation/src/frame-c/status-color.ts` (status→hex mapping)
- NEW `packages/dispatch-workstation/src/frame-c/session-filter-bar.tsx` (filter dropdowns + Clear button)
- MOD `packages/dispatch-workstation/src/frame-c/session-list.tsx` (extensions: model badge, uptime, status colors, filter-aware rendering)
- MOD `packages/dispatch-workstation/src/frame-c/frame-c-root.tsx` (state-stream wiring; filter state plumbing)
- MOD `packages/dispatch-workstation/src/tile-grid/mount.ts:175-181` `tryAutoMountFrameC` (replace empty-sessions stub)
- CONDITIONAL MOD `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx` (Sub-Q-A=(α/δ) state-lift OR Context exposure)
- CONDITIONAL MOD `packages/dispatch-workstation/src/main/spawn-handler.ts` (Sub-Q-B=(i) model field propagation)
- CONDITIONAL NEW `packages/dispatch-workstation/src/main/frame-c-filter-state.ts` (Sub-Q-E=(β) splitter-state mirror)
- CONDITIONAL NEW `packages/dispatch-workstation/src/main/frame-c-selection-state.ts` (Sub-Q-F=(β) selection persistence)
- CONDITIONAL MOD `packages/dispatch-workstation/src/main/main.ts` sentinel zone (new IPC handlers if Sub-Q-A=(γ) / Sub-Q-C=(iii) / Sub-Q-E=(β) / Sub-Q-F=(β))
- CONDITIONAL MOD `WORKSTATION_CONTRACT.md` §6.6 (amendment if §6-touching Sub-Q resolutions selected)

Path-disjoint from co-active sub-sessions per dispatch §5.1:
- T2 ticket-body (Focused session terminal stream): `src/frame-c/detail-pane.tsx` + live-PTY-tail — different file
- T3 ticket-body (Action bar): `src/frame-c/action-bar.tsx` + `workstation:kill-session` IPC contract amendment — different file + different §6 contract row
- T6 ticket-body (Methodology infra): `scripts/build-*.mjs` + test/probe harness — path-disjoint from `src/`
- T4-successor `commit-plan-doc-1334` (Wave B WB11): docs only — path-disjoint

Path-overlap risk:
- `frame-c-root.tsx` is read by T2 ticket body for selectedSessionName/selectedEntry plumbing (already shipped at Wave C #5 `bd31b94`). T1 extends this file; T2 should defer FrameCRoot edits until T1 lands OR coordinate via `docs/coordination/t1-t2-coord-2026-05-12.md` per dispatch §5.1.
- `tile-grid-app.tsx` is MB-T12 territory; Sub-Q-A=(α/δ) edits require frozen-MB-T12-zone awareness. Surface at HALT-WB-PRE-COMMIT if non-trivial refactor.

---

## §3 — Sub-Q gate arbitrations REQUIRED before specific WBs

Six operator decisions parameterize WB scope. Surface at HALT-TICKET-BODY-PRE-COMMIT for batch resolution. Defaults if unresolved are `[MODELED]` recommendations.

### §3.1 — Sub-Q-T1-A: sessions-stream source-of-truth surface

Required before **WB3** (sessions-stream wiring probe) + **WB4** (impl). Default if unresolved: **(δ) React Context (renderer-only, no IPC)**.

| Option | Mechanism | Frozen-surface touch | Risk |
|---|---|---|---|
| (α) State-lift to shared parent | NEW `frame-c/sessions-provider.tsx` wraps both `<TileGridApp>` and `<FrameCRoot>`; sessions state lives in provider; both components consume via prop or context. REQUIRES refactor of `tile-grid-app.tsx` to accept sessions as controlled prop (currently internal `useState`). | NONE (renderer-internal) | `[MODELED-MEDIUM]` MB-T12 zone edit; large-blast-radius refactor; existing MB-T12 probes may need updates |
| (β) Independent subscription | Frame C mount subscribes to `workstation:spawn-result` independently from TileGridApp (mirroring `tile-grid-app.tsx:159-185` useEffect pattern). Two independent state copies. | NONE | `[MODELED-MEDIUM]` data-divergence risk: handleKill in TileGridApp removes session from its copy but Frame C copy persists; needs cross-component cleanup IPC OR shared event bus |
| (γ) New IPC snapshot+subscribe channel | NEW `workstation:sessions-state-get` + `workstation:sessions-state-changed` IPC pair; main-process becomes source-of-truth (likely backed by `tile-grid-state.ts` or new `sessions-state.ts`). Both renderers subscribe. | YES — `WORKSTATION_CONTRACT.md` §6.6 amendment required (operator-arbitrated, separate commit per CLAUDE.md §2.4) | `[MODELED-HIGH]` cleanest architecturally but adds 2 WBs for IPC + amendment cycle |
| (δ) React Context (recommended) | NEW `frame-c/sessions-context.tsx` exports React Context; TileGridApp wraps `<SessionsContext.Provider value={sessions}>` around its tree AND publishes via `window.__sessionsBridge.set(...)` on a renderer-global event emitter; Frame C subscribes via the same global. Renderer-internal cross-mount glue (Frame C and tile-grid auto-mount into separate DOM roots per `mount.ts` — they cannot share React Context directly). | NONE | `[MODELED-MEDIUM]` requires renderer-global event emitter glue (`window.dispatchEvent(new CustomEvent('sessions-state-changed', { detail: sessions }))` pattern); pragmatic; mirrors §C.5 tile-token-update precedent |

`[MODELED]` Recommend **(δ)** for ship-velocity + zero-§6-touch. Rationale: TileGridApp and FrameCRoot mount into different DOM roots (`#tile-grid-root` and `#frame-c-root` per `workstation-shell.html`), so React Context cannot bridge them directly. Window-level CustomEvent emitter is the renderer-internal pattern most consistent with existing channels (`workstation:tile-token-update` subscribes via `workstationBridge.onTileTokenUpdate` per `tile-grid-app.tsx:209-217`; similar pattern at renderer level). Sub-Q-A=(β) is a viable fallback but adds the cleanup-coordination Tier 2 followup risk. Sub-Q-A=(α) is the architecturally-cleanest if MB-T12 refactor is acceptable; surface separately if operator wants that path.

Operator decision pending.

### §3.2 — Sub-Q-T1-B: model field source

Required before **WB7** (model-badge probe) + **WB8** (impl). Default if unresolved: **(i) workstation spawn-handler extension**.

| Option | Mechanism | Frozen-surface touch | Effort |
|---|---|---|---|
| (i) Workstation spawn-handler extension (recommended) | `spawn-handler.ts` `SpawnSessionResult` shape (existing `cwd: string` field per `spawn-handler.ts:207`) — add sibling `model?: string` field populated from the workstation-internal spawn-request payload (operator selects model at spawn time OR default-from-env). Mirrors §2.10 mechanical-translation framing — workstation-internal, no daemon contract change. | NONE (workstation-internal; `spawn-handler.ts:203` already notes daemon does NOT expose cwd per §2.10 frozen-surface) | LOW |
| (ii) Daemon SessionSchemaV2 field | Add `model?: string` to `dispatch-core/src/v2/schema.ts:SessionSchemaV2` — FROZEN per CLAUDE.md §1 (`dispatch-core/src/v3/schema.ts` §1-§13). Operator-arbitration required per CLAUDE.md §2.10. Daemon `/v2/sessions/:name` returns model; renderer reads via existing daemon-client. | YES — `dispatch-core` schema (FROZEN §1-§13); REQUIRES operator-arbitrated contract authoring per CLAUDE.md §2.10 | HIGH (frozen schema + daemon impl + new IPC consumption) |
| (iii) PTY scrape | Parse model from CC startup banner via `tile-token-scraper.ts`-pattern PTY observer (model identifier appears in CC's startup output). | NONE (renderer-internal PTY pattern) | MEDIUM (PTY-scrape brittleness; CC output format may change without versioning) |
| (iv) Defer | Keep `model?: string` STUB at renderer default; do NOT render model badge in this ticket. Filing as Tier 3 followup if operator wants badge before T7 polish lands. | NONE | ZERO |

`[MODELED]` Recommend **(i)** for ship-velocity + frozen-surface-disjointness. Rationale: spawn-handler is workstation-internal (per `spawn-handler.ts:203-205` comment); model is selected at spawn-time by operator OR derived from environment; passing it through SpawnSessionResult mirrors the existing `cwd` propagation pattern. Sub-Q-B=(iii) PTY scrape is honest fallback if (i) reveals architectural blockers (e.g., model not known at spawn time — depends on CC invocation discipline). Sub-Q-B=(ii) is correct long-term but blocked on frozen-schema operator arbitration; defer to dedicated ticket.

Operator decision pending.

### §3.3 — Sub-Q-T1-C: status indicator color mapping (green/amber/red/grey)

Required before **WB5** (status-color probe) + **WB6** (impl). Default if unresolved: **(i) extend TileStatus enum + renderer-derived states**.

`[KNOWN]` Per audit §7 Dim 5 row `state`: three disjoint state systems coexist (`SessionSchemaV2.state` daemon-authoritative; `ComputedStatus` daemon-derived; `TileStatus` renderer-local). Per `types.ts:22`: `TileStatus = 'idle' | 'open' | 'killed' | 'detached'` (4 values). Wireframe wants 4 colors mapped onto health semantics. Current `session-list.tsx:64-70` STATUS_DOT_HEX covers 3 of 4 wireframe colors (no red).

| Option | Source | Color mapping | Frozen-surface touch |
|---|---|---|---|
| (i) Extend TileStatus + renderer-derived (recommended) | Extend `TileStatus` enum with `'error'` (red) and `'warning'` (amber additional to existing detached=amber); renderer derives error/warning from PTY-tail sentinel detection (e.g., orchestrator quiescence-timeout, ACTION-block parse error, or PTY-scrape failure pattern). `open`→green, `idle`→grey, `detached`→amber, `killed`→hidden (filtered out before render), `error`→red, `warning`→amber. | NONE (renderer-internal enum extension; existing consumers tolerate via fallback in STATUS_DOT_HEX) | NONE |
| (ii) Daemon computed_status source | Subscribe to `SessionResponseV2.computed_status` (`idle|running|awaiting_review|stale`) per `dispatch-core/v2/schema.ts:CostInfoSchema` adjacent shape; map: `running`→green, `idle`→grey, `awaiting_review`→amber, `stale`→red. REQUIRES new IPC channel from daemon to renderer (daemon SSE OR poll-based). | YES — `WORKSTATION_CONTRACT.md` §6 amendment for new daemon-status IPC channel (operator-arbitrated) | HIGH (new daemon-renderer wire; sibling of `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` row 271 closure path-b) |
| (iii) Hybrid TileStatus + PTY signals | Keep `TileStatus` 4-value enum; add separate `healthHint?: 'green' | 'amber' | 'red' | 'grey'` field on `TileGridSessionEntry`; renderer computes hint from local PTY-scrape signals + TileStatus + tokensUsed/tokenBudget ratio (>90% = amber, 100% = red). | NONE | MEDIUM |

`[MODELED]` Recommend **(i)** for renderer-internal scope + zero-§6-touch. Rationale: PTY-scrape sentinel detection is precedented at `tile-token-scraper.ts` (§C.5); adding `'error'`/`'warning'` to TileStatus is additive (existing consumers fall back via `STATUS_DOT_HEX[x] ?? STATUS_DOT_HEX['open']!` pattern at `session-list.tsx:124`). Sub-Q-C=(ii) is the canonically-correct daemon-truth path but couples T1 to a daemon-side reconciliation surface (row 271 territory); defer. Sub-Q-C=(iii) is acceptable if operator wants stricter separation between operational status and health hint.

Operator decision pending.

### §3.4 — Sub-Q-T1-D: uptime field source

Required before **WB9** (uptime probe) + **WB10** (impl). Default if unresolved: **(iii) workstation-side spawn-timestamp at SpawnSessionResult**.

`[KNOWN]` Per audit §7 Dim 5 row `time`: STUB — `TileFooter` renders uptime as "time since tile mounted in current window" (MB-T18 Q-MBT18-3=a renderer-internal lazy useState snapshot), NOT session-spawn time. Wireframe semantics imply session-spawn-duration.

| Option | Mechanism | Frozen-surface touch | Persistence |
|---|---|---|---|
| (i) Renderer-internal mount-time | Mirror MB-T18 TileFooter pattern: lazy `useState<number>(Date.now())` on first render per session; uptime = `now() - mountTime`. Renderer-local; resets on Frame C re-mount (e.g., Frame A↔C toggle). | NONE | LOST on Frame C re-mount |
| (ii) Daemon-tracked spawn-timestamp | Add `spawnedAtMs?: number` field to daemon `SessionSchemaV2`. FROZEN per CLAUDE.md §1; operator-arbitration required. | YES — daemon schema (FROZEN) | TRUE session-lifetime |
| (iii) Workstation spawn-handler extension (recommended) | Extend `SpawnSessionResult` shape (sibling of Sub-Q-B=(i) `model` field) with `spawnedAtMs: number = Date.now()` recorded at `spawn-handler.ts:383-405` request-handler entry. Persisted at renderer via existing `tile-grid-state.ts` (already persists `TileGridSessionEntry` fields). Workstation-local source-of-truth. | NONE (workstation-internal) | PERSISTS across renderer re-mounts via `tile-grid-state.json` |

`[MODELED]` Recommend **(iii)** for true-session-uptime semantics + zero-frozen-surface-touch + leverages existing persistence path. Sub-Q-D=(i) is faster but semantically wrong (renderer-mount-time ≠ session-spawn-time). Sub-Q-D=(ii) is the canonically-correct daemon path but blocked on frozen-schema arbitration; defer.

Operator decision pending.

### §3.5 — Sub-Q-T1-E: filter state persistence

Required before **WB11** (filter probe) + **WB12** (impl). Default if unresolved: **(α) renderer-only useState**.

| Option | Mechanism | Frozen-surface touch | Persistence |
|---|---|---|---|
| (α) Renderer-only (recommended) | Filter state (`statusFilter: 'all' | <TileStatus>`, `repoFilter: 'all' | <repoName>`) lives in FrameCRoot `useState`; lost on Frame A↔C toggle or workstation re-launch. | NONE | LOST on reload |
| (β) `frame-c-filter-state.ts` mirror of splitter-state.ts | NEW `packages/dispatch-workstation/src/main/frame-c-filter-state.ts` (35-line raw `fs` pattern per CLAUDE.md §3.5). NEW IPC `frame-c:get-filter-state` + `frame-c:set-filter-state`. | YES — `WORKSTATION_CONTRACT.md` §6 amendment (operator-arbitrated) | PERSISTS across reloads |
| (γ) Embed in frame-mode-state.ts | Extend persisted state shape at `main/frame-mode-state.ts` with `filterState?: { statusFilter; repoFilter }`. Reuses existing `frame-mode:get`/`set` payload (additive). | YES — `WORKSTATION_CONTRACT.md` §6 (additive amendment per CLAUDE.md §2.4; less invasive than (β)) | PERSISTS |

`[MODELED]` Recommend **(α)** for ship-velocity. Rationale: filter state is ergonomic, not load-bearing; wireframe does not require persistence. Filing Tier 3 followup `MB-F-FRAME-C-FILTER-STATE-NOT-PERSISTED` at WB-final if Sub-Q-E=(α) selected, for operator-arbitrated re-open if needed.

Operator decision pending.

### §3.6 — Sub-Q-T1-F: tile selection persistence revisit

Required before **WB13** (selection-persist probe) IF (β) selected; default if unresolved: **(α) keep deferred (no change in this ticket)**.

`[KNOWN]` Wave B Sub-Q-MBTWBFCS-A=α (ticket body `a1f7a03` §3.1) shipped renderer-only selection state per operator pre-arbitration; selection lost on Frame A↔C toggle / reload. Wave B WB12 docs filed Tier 3 candidate (per ticket §5.2 row).

| Option | Mechanism | Frozen-surface touch | Effort |
|---|---|---|---|
| (α) Keep deferred (recommended) | No change in this ticket. Selection state remains renderer-only `useState` in `frame-c-root.tsx:89`. File Tier 3 followup `MB-F-FRAME-C-SELECTION-NOT-PERSISTED` if not already filed. | NONE | ZERO |
| (β) Promote to persisted | NEW `packages/dispatch-workstation/src/main/frame-c-selection-state.ts` (splitter-state.ts mirror). NEW IPC `frame-c:get-selection` + `frame-c:set-selection`. | YES — `WORKSTATION_CONTRACT.md` §6 amendment (operator-arbitrated) | MEDIUM (+2-3 WBs) |

`[MODELED]` Recommend **(α)** to keep ticket scope contained. Sub-Q-F=(β) sits naturally in a future dedicated ticket (`MB-T-WIREFRAME-T1-FOLLOWUP-SELECTION-PERSIST`) post-T7 visual polish.

Operator decision pending.

---

## §4 — WB ladder

11 WBs baseline (defaults: Sub-Q-A=(δ), Sub-Q-B=(i), Sub-Q-C=(i), Sub-Q-D=(iii), Sub-Q-E=(α), Sub-Q-F=(α)). 10-12 WB swing per Sub-Q resolutions. Construction order: probe-then-impl per cairn discipline.

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CLAUDE.md §10.5 + CONDUCTOR_API_CONTRACT.md §10.5; per-path `git add` per CLAUDE.md §2.7; push after each cairn-grammar commit per CLAUDE.md §2.6.

### WB1 — `red(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): probe-mbtwt1-01-empty-stub-detection`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwt1-01-empty-stub-detection.spec.ts` (NEW). Source-text inspection of `packages/dispatch-workstation/src/tile-grid/mount.ts:175-181`: asserts the `tryAutoMountFrameC` function body does NOT contain `sessions: []` literal at the `mountFrameC(root, ...)` call site. Probe fails RED until WB4 GREEN replaces the empty-sessions stub with a live stream.
**Acceptance:** probe RED on `expect(fs.readFileSync(...)).not.toMatch(/mountFrameC\(root,\s*\{\s*sessions:\s*\[\]\s*\}\)/)` — current source contains that literal per WB10 audit anchor `ea11bc7`.
**Frozen contracts touched:** none — probe-only.

### WB2 — `red(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): probe-mbtwt1-02-sessions-stream-roundtrip`

**Type:** red
**Scope:** RED probe at `probe-mbtwt1-02-sessions-stream-roundtrip.spec.tsx` (NEW). Asserts: when an external simulator emits a spawn-result via the chosen Sub-Q-T1-A mechanism (window event for δ; ipc-renderer mock for γ; provider state-lift for α; subscription mock for β), Frame C SessionList re-renders with N+1 rows. Probe fails RED — no source-of-truth subscription wired.
**Acceptance:** probe RED. Commit body Q1-Q9.
**Sub-Q-T1-A blocker:** WB3-WB4 cannot proceed until Sub-Q-T1-A resolves the source-of-truth mechanism. Probe shape parameterized — flag at HALT-WB2-PRE-COMMIT if Sub-Q-A unresolved.

### WB3 — `green(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): sessions-stream source-of-truth surface`

**Type:** green
**Scope:** GREEN at NEW source-of-truth surface per Sub-Q-T1-A:
- (α) NEW `frame-c/sessions-provider.tsx` + MOD `tile-grid/tile-grid-app.tsx` to accept controlled-sessions prop
- (β) NEW `frame-c/sessions-stream-subscription.ts` mirroring tile-grid-app.tsx spawn-result subscription pattern
- (γ) NEW main-process `main/sessions-state.ts` + `workstation:sessions-state-get` + `workstation:sessions-state-changed` IPC handlers + WORKSTATION_CONTRACT.md §6 amendment (operator-arbitrated separate commit BEFORE WB3 GREEN)
- (δ) NEW `frame-c/sessions-context.tsx` + MOD `tile-grid/tile-grid-app.tsx` to publish via `window.dispatchEvent(new CustomEvent('frame-c:sessions-state-changed', { detail }))` on every setSessions
**Acceptance:** source-of-truth surface exists + emits/exposes state. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on Sub-Q-A=(γ).

### WB4 — `green(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): replace empty-sessions stub + Frame C consumes stream`

**Type:** green
**Scope:** GREEN at `packages/dispatch-workstation/src/tile-grid/mount.ts:175-181` AND `packages/dispatch-workstation/src/frame-c/frame-c-root.tsx`:
- `tryAutoMountFrameC` replaces the `sessions: []` literal with a consumption of the Sub-Q-A source-of-truth (e.g., subscribes to `window` CustomEvent for δ; reads initial state + subscribes for changes).
- `FrameCRoot` accepts the sessions stream as a prop OR reads via Context/subscription; passes to `<SessionList sessions={sessions} />`.
**Acceptance:** WB1 + WB2 probes flip RED → GREEN. Commit body Q1-Q9.
**Followup CLOSED:** `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` Tier 2 row 327 — closure stamp in WB-final docs.
**Consumer non-regression check (CLAUDE.md memory):** verify MB-T12 tile-grid mosaic continues to render N tiles correctly when Frame A is active (no regression in spawn auto-mount path).

### WB5 — `red(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): probe-mbtwt1-03-status-color-mapping`

**Type:** red
**Scope:** RED probe at `probe-mbtwt1-03-status-color-mapping.spec.tsx` (NEW). Asserts: NEW `frame-c/status-color.ts` exports `statusToColor(status: TileStatus): string` returning the four wireframe colors (green/amber/red/grey) per Sub-Q-T1-C resolution. Probe fails RED — module absent.
**Acceptance:** probe RED. Commit body Q1-Q9.

### WB6 — `green(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): status-color module + session-list integration`

**Type:** green
**Scope:** GREEN at NEW `packages/dispatch-workstation/src/frame-c/status-color.ts` + MOD `packages/dispatch-workstation/src/frame-c/session-list.tsx`:
- `status-color.ts` exports `statusToColor(status: TileStatus): string` mapping per Sub-Q-T1-C:
  - (i) `open`→`#5b9d6e` (green), `idle`→`#888888` (grey), `detached`→`#c97a3a` (amber), `error`→`#c54a4a` (red), `warning`→`#c97a3a` (amber alias), `killed`→hidden
  - (ii) maps `computed_status` per daemon enum
  - (iii) hybrid hint field consumed
- `session-list.tsx` replaces inline `STATUS_DOT_HEX` literal (lines 64-70) with `statusToColor()` import; preserves `data-testid` and `data-status` attributes.
- Sub-Q-C=(i): MOD `tile-grid/types.ts:22` to extend `TileStatus = 'idle' | 'open' | 'killed' | 'detached' | 'error' | 'warning'`. Verify consumers tolerate (search for non-fallback usages).
**Acceptance:** WB5 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on Sub-Q-C=(ii) (new daemon-status IPC).

### WB7 — `red(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): probe-mbtwt1-04-model-badge-rendering`

**Type:** red
**Scope:** RED probe at `probe-mbtwt1-04-model-badge-rendering.spec.tsx` (NEW). Asserts: NEW `frame-c/model-badge.ts` exports `modelToLabel(model: string | undefined): string` returning short-form labels per wireframe (`'claude-sonnet-4-6'`→`'S4.6'`, `'claude-opus-4-6'`→`'O4.6'`, `'claude-opus-4-7'`→`'O4.7'`, `'claude-haiku-4-5'`→`'H'`, undefined→`''`); SessionList row renders `<span data-testid="frame-c-session-row-model-{name}">{label}</span>`. Probe fails RED — module absent + span not rendered.
**Acceptance:** probe RED. Commit body Q1-Q9.

### WB8 — `green(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): model-badge module + session-list integration + (conditional) spawn-handler model propagation`

**Type:** green
**Scope:** GREEN at NEW `packages/dispatch-workstation/src/frame-c/model-badge.ts` + MOD `packages/dispatch-workstation/src/frame-c/session-list.tsx`:
- `model-badge.ts` exports `modelToLabel(model?: string): string` with the wireframe mapping table.
- `session-list.tsx` adds `<span data-testid="frame-c-session-row-model-{name}">{modelToLabel(s.model)}</span>` between status dot and session name (per wireframe left-to-right layout).
- Sub-Q-B=(i): MOD `packages/dispatch-workstation/src/main/spawn-handler.ts` to add `model?: string` to `SpawnSessionResult`; populate from spawn-request payload OR env default at request-handler entry. MOD `tile-grid/tile-grid-app.tsx:121-141` `isSpawnSuccessReply` + `SpawnSuccessReply` shape to include `model?: string` propagation into `TileGridSessionEntry.model`.
- Sub-Q-B=(iii): NEW PTY-scrape `model-pty-scraper.ts` mirror of `tile-token-scraper.ts` pattern + IPC `workstation:tile-model-update`.
**Acceptance:** WB7 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none (Sub-Q-B=(i) and (iii) are workstation-internal); Sub-Q-B=(ii) blocked on frozen-schema operator arbitration per §3.2 not-recommended.

### WB9 — `red(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): probe-mbtwt1-05-uptime-rendering`

**Type:** red
**Scope:** RED probe at `probe-mbtwt1-05-uptime-rendering.spec.tsx` (NEW). Asserts: `TileGridSessionEntry` shape extended with `spawnedAtMs?: number` field (per `tile-grid.tsx:29-52` extension); SessionList row renders `<span data-testid="frame-c-session-row-uptime-{name}">{HH:MM}</span>` reflecting `formatUptime(now - spawnedAtMs)`. Probe fails RED — field absent + span not rendered.
**Acceptance:** probe RED. Commit body Q1-Q9.

### WB10 — `green(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): uptime field + session-list integration + (conditional) spawn-handler timestamp propagation`

**Type:** green
**Scope:** GREEN at MOD `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx:29-52` + MOD `packages/dispatch-workstation/src/frame-c/session-list.tsx` + NEW `packages/dispatch-workstation/src/frame-c/uptime-format.ts`:
- `tile-grid.tsx` adds `readonly spawnedAtMs?: number` field to `TileGridSessionEntry` (additive extension; existing consumers unaffected).
- `uptime-format.ts` exports `formatUptime(deltaMs: number): string` returning `HH:MM` per wireframe.
- `session-list.tsx` adds uptime span; renders `formatUptime(Date.now() - s.spawnedAtMs)` when `spawnedAtMs !== undefined`, else empty. Uses `useEffect` + `setInterval(1000)` to re-render every second (or shared time-tick context to avoid N intervals — minor optimization at WB-final if measured).
- Sub-Q-D=(iii): MOD `main/spawn-handler.ts` to record `spawnedAtMs: Date.now()` at request-handler entry; propagate through `SpawnSessionResult` shape and `tile-grid-app.tsx` SpawnSuccessReply parsing (sibling of Sub-Q-B=(i) `model` propagation — implement together where feasible).
- Sub-Q-D=(i): renderer-internal `useState(Date.now())` lazy snapshot on row mount (mirrors MB-T18 TileFooter pattern); accepts that semantics ≠ true session lifetime.
**Acceptance:** WB9 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none.

### WB11 — `red+green(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): probe-mbtwt1-06-filter-bar + filter-bar component + frame-c-root integration`

**Type:** red+green (paired in one WB for filter-bar end-to-end shipping)
**Scope:**
- **RED**: `probe-mbtwt1-06-filter-bar.spec.tsx` (NEW). Asserts: NEW `frame-c/session-filter-bar.tsx` renders three controls (`<select data-testid="frame-c-filter-status">`, `<select data-testid="frame-c-filter-repo">`, `<button data-testid="frame-c-filter-clear">`); FrameCRoot integrates filter state and passes filtered subset to SessionList; Clear resets to defaults. Probe fails RED — component absent.
- **GREEN**: NEW `packages/dispatch-workstation/src/frame-c/session-filter-bar.tsx` exports `<SessionFilterBar />` taking `{ sessions, filterState, onFilterStateChange }`. Renders three controls with options derived from sessions (status enum union; repo enum from `Array.from(new Set(sessions.map(s => s.repoName)))`). MOD `frame-c-root.tsx` adds `useState<FilterState>` (Sub-Q-E=(α)) OR loads persisted state via NEW `frame-c-filter-state.ts` IPC (Sub-Q-E=(β/γ)). Applies filter via `sessions.filter(s => matchesFilter(s, filterState))` before passing to SessionList.
**Acceptance:** probe flips RED → GREEN within this WB. Commit body Q1-Q9.
**Frozen contracts touched:** conditional on Sub-Q-E=(β/γ).

### WB12 — `red+green(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): probe-mbtwt1-07-selection-persistence (CONDITIONAL Sub-Q-F=(β) only)`

**Type:** red+green (CONDITIONAL — SKIPPED if Sub-Q-F=(α) default selected)
**Scope:**
- **RED**: probe asserts selection state survives Frame A↔C toggle + workstation re-launch.
- **GREEN**: NEW `main/frame-c-selection-state.ts` (splitter-state.ts pattern) + NEW IPC `frame-c:get-selection` + `frame-c:set-selection` + WORKSTATION_CONTRACT.md §6 amendment (separate operator-arbitrated commit).
**Acceptance:** probe flips RED → GREEN if Sub-Q-F=(β). Commit body Q1-Q9.
**Frozen contracts touched:** YES if executed.

### WB-final (WB13 or WB12 if Sub-Q-F=(α)) — `green(MB-T-WIREFRAME-T1-SESSION-DATA-FLOW): runtime-launch smoke + findings doc + audit reclassification`

**Type:** green (smoke + docs)
**Scope:** per CLAUDE.md §4.6 runtime-launch smoke + dispatch §3.5 visual-comparison gate:
1. Build fresh: `pnpm --filter dispatch-workstation build`.
2. Launch electron from `dist/main/main.js`.
3. Observe within ~10s: WINDOW_READY sentinel + `data-frame-mode='C'` default + Frame C surface renders.
4. Spawn ≥2 sessions: verify Frame C SessionList shows both rows with name, model badge (Sub-Q-B-driven), status color (Sub-Q-C-driven), uptime (Sub-Q-D-driven), ctx N% (Wave C #5 shipped at `bd31b94`).
5. Click a row: DetailPane renders selected session's content (Wave B WB8 shipped).
6. Filter status dropdown → only matching rows visible; Clear restores all.
7. Filter repo dropdown → only matching rows visible.
8. Generate headless screenshot if T6 pipeline ships; else operator-manual-screenshot at HALT-WB-FINAL-PRE-COMMIT per dispatch §3.5.
9. Author `docs/coordination/mbtwt1-findings-2026-05-12.md` per Wave B findings format anchor (I What Shipped / II Q-disposition / III Architectural deltas / IV Probe distribution / V Architecture notes / VI Documentation drift / VII Consumer non-regression / VIII WB Skip Rationale / IX New Followups Filed / X Open Items).
10. Audit reclassification stamps in `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md`:
    - §7 Dim 5 row `branch`: STUB → SHIPPED IF Sub-Q-B=(i)/(iii)
    - §7 Dim 5 row `model`: STUB → SHIPPED IF Sub-Q-B=(i)/(iii)
    - §7 Dim 5 row `state`: ARCHITECTURAL-MISMATCH → SHIPPED-VIA-RENDERER-DERIVED IF Sub-Q-C=(i)
    - §7 Dim 5 row `time`: STUB → SHIPPED-VIA-WORKSTATION-TIMESTAMP IF Sub-Q-D=(iii)
    - §10.5 row "Filter row": "Defer to v3.6" → SHIPPED
11. FOLLOWUPS.md updates:
    - Stamp `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` Tier 2 row 327 → CLOSED at this ticket's WB4 GREEN commit.
    - NEW Tier 3 `MB-F-FRAME-C-FILTER-STATE-NOT-PERSISTED` IF Sub-Q-E=(α).
    - NEW Tier 3 `MB-F-FRAME-C-SELECTION-NOT-PERSISTED` IF Sub-Q-F=(α) AND not already filed by Wave B WB12.
    - NEW Tier 3 `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE` IF Sub-Q-D=(i).
    - Cross-ref `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Tier 2 row 271) — Frame C surfaces inherited stale-tile risk; not closed by this ticket.
**Acceptance:** all 11 steps verified. Commit body Q1-Q9.
**Frozen contracts touched:** none — smoke + docs only.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED by this ticket

| Followup / Row | Tier | Closure path | Closing WB |
|---|---|---|---|
| `MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` (FOLLOWUPS.md:327) | Tier 2 | WB3+WB4: sessions-stream source-of-truth + Frame C consumption replaces empty `sessions: []` stub at `mount.ts:175-181` | WB4 |
| Audit §7 Dim 5 row `state` ARCHITECTURAL-MISMATCH | (audit row) | WB5+WB6: status-color mapping with extended TileStatus enum (Sub-Q-C=(i)) | WB6 |
| Audit §7 Dim 5 row `branch` STUB | (audit row) | WB8: branch field already exists (`tile-grid.tsx:33` `branchName?`); WB8 verifies population path via Sub-Q-B-adjacent extension OR documents as no-change | WB8 |
| Audit §7 Dim 5 row `model` STUB | (audit row) | WB8: model field population via Sub-Q-B mechanism | WB8 |
| Audit §7 Dim 5 row `time` STUB | (audit row) | WB10: uptime field via Sub-Q-D mechanism | WB10 |
| Audit §10.5 row "Filter row" "Defer to v3.6" | (audit row) | WB11: filter bar component + filter logic | WB11 |
| Full-build-mode dispatch §2 T1 bullets 1-6 | (dispatch enumeration) | WB3-WB12 (per-bullet) | WB-final |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB3 may discover that the Sub-Q-T1-A=(δ) window-CustomEvent approach has unforeseen race conditions with React batching — fallback to Sub-Q-T1-A=(β) independent subscription with cross-component cleanup via `workstation:tile-kill` (existing channel). File Tier 2 followup if so.
- WB6 (Sub-Q-C=(i)) extension of `TileStatus` enum may reveal consumer non-regression failures in MB-T12 tile rendering — search `STATUS_DOT_HEX` usages + fallback patterns; file Tier 2 if non-trivial fan-out.
- WB8 (Sub-Q-B=(i)) may discover that spawn-handler does not have model context at request-handler entry (model selected later in CC invocation). Fallback to Sub-Q-B=(iii) PTY scrape; file Tier 3 if so.
- WB10 (Sub-Q-D=(iii)) `spawnedAtMs` propagation may surface MB-T18 TileFooter divergence — TileFooter uses renderer-mount-time (Q-MBT18-3=a); Frame C uses spawn-time. Two-semantics-per-uptime risk; file Tier 3 `MB-F-UPTIME-SEMANTICS-DIVERGENCE-FOOTER-VS-FRAME-C` if confusing.
- WB11 filter-bar may discover that `repoName` field is not populated in production (audit §7 Dim 5 row `repo` STUB — `cwd ≠ repoName`). Filter would show "all" / empty options only. File Tier 2 `MB-F-FRAME-C-FILTER-REPO-FIELD-UNPOPULATED` and document graceful-degradation behavior.
- WB-final smoke may surface PTY-tick-rate cost from per-row `setInterval(1000)` uptime refresh at N=8+ sessions; file Tier 3 if observed (shared-time-tick refactor).

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE | `ea11bc7` (WB10 final GREEN) | `frame-c/frame-c-root.tsx` + `frame-c/session-list.tsx` + `tile-grid/mount.ts:163-187` `tryAutoMountFrameC`; audit §3 reclassification anchor |
| MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE | `bd31b94` (WB4 final GREEN) | `frame-c/session-list.tsx:143-149` ctx N% rendering + `frame-c-root.tsx:104-105` selectedEntry threading |
| MB-T12 tile-grid | (MB-T12 chain) | `tile-grid/tile-grid.tsx:29-52` `TileGridSessionEntry` shape; `tile-grid/tile-grid-app.tsx` state stream + spawn-result subscription |
| §C.5 tile-token-scraper | `13b7607` | `main/tile-token-scraper.ts` PTY-scrape pattern + `workstation:tile-token-update` IPC + `tile-grid-app.tsx:209-217` renderer subscription pattern |
| MB-T18 TileFooter (CONDITIONAL Sub-Q-D=(i)) | (MB-T18 chain) | `tile-grid/tile-footer.tsx` uptime mount-time pattern (Q-MBT18-3=a) |

### §5.4 — Dispatch + audit doc anchors (read at WB1 start)

- `docs/coordination/full-build-mode-dispatch.md` §1 wireframe inventory + §2 T1 enumeration + §3.2 mechanical-translation + §3.3 frozen-contract amendment pattern + §3.5 visual-comparison gate
- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §7 Dim 5 (data model — 1 SHIPPED · 4 STUB · 4 ARCHITECTURAL-MISMATCH · 1 WIREFRAME-VISION-NOT-SHIPPED) + §10.5 (Filter row defer-to-v3.6) + §8.B (Tile state lifecycle — external-death-reconciliation gap row 271)
- `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE_BUILD.md` (`a1f7a03`) — Wave B ticket body format anchor + Sub-Q-MBTWBFCS-A=α renderer-only selection state precedent

### §5.5 — Co-active sub-session coordination (per dispatch §5.1)

- T2 ticket-body (Focused session terminal stream — `src/frame-c/detail-pane.tsx` + live-PTY-tail): coordinate FrameCRoot edit window per `docs/coordination/t1-t2-coord-2026-05-12.md` (create at WB1 if not present). Selection state remains source-of-truth in FrameCRoot per Wave B; T1 + T2 both read `selected` but only T1 edits filter / sessions plumbing.
- T3 ticket-body (Action bar — `src/frame-c/action-bar.tsx` + `workstation:kill-session` IPC contract amendment): path-disjoint; T3's kill IPC will not affect T1 sessions-stream wiring directly but T3 may want to consume T1's source-of-truth surface (Sub-Q-A=(δ) window-event) to refresh on kill. Coord note if so.
- T6 ticket-body (Methodology infra — `scripts/build-*.mjs` + test/probe harness): path-disjoint; T6 outputs may include headless-screenshot pipeline used by T1 WB-final smoke per dispatch §3.5.

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

Each cairn-grammar commit body answers all nine questions. Expected shapes per WB type:

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | N/A — source-text inspection | BEHAVIOR (fs.readFileSync sentinel check) | No — stub still in place | No | No | KNOWN/MODELED | new test/unit/frame-c/ path-disjoint | N/A | No |
| WB2 RED | N/A | BEHAVIOR (simulator+mock or @testing-library/react render) | No — wiring absent | No | No | KNOWN/MODELED | new probe path-disjoint | N/A | No |
| WB3 GREEN | conditional (Sub-Q-A=(γ) needs spike on IPC pattern) | BEHAVIOR (real subscription/render) | No — impl load-bearing | No | conditional on Sub-Q-A=(γ) §6 amendment | KNOWN/MODELED | frame-c/ new files + (conditional) tile-grid-app.tsx zone | N/A | No |
| WB4 GREEN | N/A | BEHAVIOR (real Frame C mount + sessions render) | No — impl load-bearing | No | No | KNOWN/MODELED | tile-grid/mount.ts:175-181 zone + frame-c/ files | N/A | No |
| WB5 RED | N/A | BEHAVIOR (module-import probe) | No — module absent | No | No | KNOWN/MODELED | new probe path-disjoint | N/A | No |
| WB6 GREEN | N/A | BEHAVIOR (real session-list render with status colors) | No — module load-bearing | No | conditional on Sub-Q-C=(ii) | KNOWN/MODELED | frame-c/status-color.ts + session-list.tsx + (conditional) types.ts | N/A | No |
| WB7 RED | N/A | BEHAVIOR (module + render probe) | No — module absent | No | No | KNOWN/MODELED | new probe path-disjoint | N/A | No |
| WB8 GREEN | N/A | BEHAVIOR (real session-list render with model badge) | No — module load-bearing | No | No | KNOWN/MODELED | frame-c/model-badge.ts + session-list.tsx + (conditional) spawn-handler.ts + tile-grid-app.tsx | N/A | No |
| WB9 RED | N/A | BEHAVIOR (field probe + render) | No — field/render absent | No | No | KNOWN/MODELED | new probe path-disjoint | N/A | No |
| WB10 GREEN | N/A | BEHAVIOR (real session-list render with uptime) | No — module load-bearing | No | No | KNOWN/MODELED | tile-grid.tsx (additive field) + session-list.tsx + (conditional) spawn-handler.ts | N/A | No |
| WB11 RED+GREEN | N/A | BEHAVIOR (filter render + interaction) | No — component absent until GREEN | No | conditional on Sub-Q-E=(β/γ) | KNOWN/MODELED | new frame-c/session-filter-bar.tsx + frame-c-root.tsx | N/A | No |
| WB12 RED+GREEN (CONDITIONAL Sub-Q-F=(β)) | N/A | BEHAVIOR (persistence roundtrip via real IPC) | No — wiring absent until GREEN | No | YES — §6 amendment | KNOWN/MODELED | new main/frame-c-selection-state.ts + main.ts sentinel zone | N/A | No |
| WB-final | N/A | BEHAVIOR (real electron launch + DOM + spawn + filter) | N/A — smoke verifies WB1-WB12 integration | No | No | KNOWN per observed sentinels | none — observational | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1-WB-final cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed to origin/main per CLAUDE.md §2.6.
2. **`MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION` Tier 2 row 327 CLOSED**: `tryAutoMountFrameC` no longer passes empty `sessions: []` literal; Frame C SessionList renders live `TileGridSessionEntry[]` from the chosen Sub-Q-A source-of-truth.
3. **Per-tile model badge renders** on Frame C session rows per Sub-Q-B resolution: real-data populated (or honestly defaulted with Tier 3 filing).
4. **Per-tile status color** renders the wireframe's four-color palette (green/amber/red/grey) per Sub-Q-C resolution.
5. **Per-tile uptime** renders `HH:MM` per Sub-Q-D resolution.
6. **Filter bar** renders three controls (status dropdown + repo dropdown + Clear button) + filter logic applies; filtered subset passes to SessionList.
7. **Tile selection** continues to work (Wave B WB6 surface unchanged) OR upgrades to persisted IF Sub-Q-F=(β).
8. **5-package typecheck CLEAN** per CLAUDE.md §4.4 (one command at a time, no `&&` chains).
9. **No regression in shipped probes**: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE probes (`test/unit/frame-c/probe-mbtwbfcs-*`); MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE probes (`probe-mbtwtws-*`); MB-T12 tile-grid probes; tile-token-scraper §C.5 probes.
10. **WB-final runtime-launch smoke** per CLAUDE.md §4.6 + dispatch §3.5 visual-comparison gate: WINDOW_READY + Frame C mount + live sessions + filter behavior + screenshot evidence.
11. **WB-final findings doc + audit reclassification + FOLLOWUPS updates lands**: `docs/coordination/mbtwt1-findings-2026-05-12.md`; audit §7 Dim 5 row reclassifications per Sub-Q resolutions; FOLLOWUPS row 327 closure stamp + Tier 3 filings.
12. **Operator-visible UX**: Frame C session list shows real sessions on first launch post-merge; clicking a row selects it; DetailPane updates (Wave B-shipped behavior); filter dropdowns gate visible rows; Clear restores.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sub-Q-T1-A=(δ) window-CustomEvent has React batching race with mount-time spawn replays | `[MODELED-MEDIUM]` (CustomEvent fires synchronously; React batches updates; spawn-on-mount edge case may double-emit) | `[MODELED-MEDIUM]` (sessions render 2× briefly OR miss initial state if Frame C mounts after spawn) | WB3 emits initial-state on subscriber attach (read current state at subscribe-time); WB4 dedupes via `name` key (idempotent — already established at `tile-grid-app.tsx:173` pattern) |
| Sub-Q-T1-A=(α) state-lift requires MB-T12 zone refactor that breaks shipped probes | `[MODELED-HIGH]` if (α) chosen — `tile-grid-app.tsx` is MB-T12 territory, holds the source-of-truth state at line 155 | `[MODELED-HIGH]` (probe regressions in MB-T12 ladder if controlled-component shift) | Default to (δ) per §3.1 recommendation; if operator selects (α), HALT-WB3-PRE-COMMIT for refactor blast-radius review |
| Sub-Q-T1-B=(i) spawn-handler model field — model may not be known at spawn-handler entry (CC invocation defers model selection) | `[MODELED-MEDIUM]` (spawn-handler.ts:383-405 accepts repoPath + asks daemon to allocate; model is downstream CC argv) | `[MODELED-MEDIUM]` (model field stays undefined → badge renders empty; honest fallback) | WB8 documents the gap; falls back to Sub-Q-B=(iii) PTY-scrape OR (iv) defer; file Tier 3 if observed |
| Sub-Q-T1-C=(i) TileStatus enum extension breaks consumers (search `STATUS_DOT_HEX`, `TileStatus` usages) | `[KNOWN]` (additive extension; fallback patterns exist at `session-list.tsx:124` `STATUS_DOT_HEX[x] ?? open` and similar in tile-header.tsx) | `[MODELED-LOW]` (compile-time check via TypeScript discriminated union exhaustiveness) | WB6 grep audit for all TileStatus usages; verify exhaustiveness; consumer non-regression probes per WB |
| Sub-Q-T1-D=(iii) `spawnedAtMs` divergence from MB-T18 TileFooter mount-time uptime — two-semantics-per-uptime | `[MODELED-LOW]` (Frame C uses true session-time; TileFooter uses renderer-mount-time) | `[MODELED-LOW]` (operator confusion if both surfaces visible simultaneously) | WB10 emits `data-uptime-semantic` attribute (e.g., `session-spawn-time` vs `renderer-mount-time`) for visual debugging; file Tier 3 `MB-F-UPTIME-SEMANTICS-DIVERGENCE-FOOTER-VS-FRAME-C` if observed in smoke |
| WB11 filter-bar repo dropdown shows empty options because `repoName` is STUB per audit §7 Dim 5 | `[KNOWN]` (audit row says repoName defaults to `''`; no IPC source) | `[MODELED-MEDIUM]` (filter UX shows "all" only — degraded but honest) | WB11 graceful-degradation: dropdown shows `'all'` + populated repos only (filter `Array.from(new Set(...)).filter(Boolean)`); file Tier 2 `MB-F-FRAME-C-FILTER-REPO-FIELD-UNPOPULATED` |
| WB-final visual-comparison gate (dispatch §3.5) requires headless screenshot — T6 pipeline not yet shipped | `[KNOWN]` (T6 in flight per dispatch §4 Phase 1 batch) | `[MODELED-LOW]` (operator-manual-screenshot fallback per dispatch §3.5) | WB-final HALT-WB-FINAL-PRE-COMMIT requests operator-manual-screenshot if T6 not yet landed; cite screenshot path in commit body per dispatch §3.5 |
| Sub-Q-T1-E=(β/γ) filter-state persistence triggers WORKSTATION_CONTRACT.md §6 amendment mid-ticket | `[KNOWN]` if (β/γ) chosen | `[MODELED-MEDIUM]` (separate operator-arbitrated commit per CLAUDE.md §2.4) | Default to (α) renderer-only; only escalate if persistence is operator-load-bearing per HALT-TICKET-BODY-PRE-COMMIT ack |
| MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION (Tier 2 row 271) — Frame C inherits TileGridApp's missing daemon-SSE | `[KNOWN]` | `[MODELED-LOW]` (SessionList shows stale entries for externally-killed sessions — same as tile-grid today) | Cross-ref in WB-final docs; T1 does NOT close row 271; documented as inherited gap |
| 5-package typecheck failure if Sub-Q-T1-B=(i) propagates new field through `SpawnSessionResult` schema | `[MODELED-LOW]` if Sub-Q-B=(i); `[KNOWN-NO]` if Sub-Q-B=(iii)/(iv) | `[MODELED-MEDIUM]` (cross-package contract surface — `dispatch-core/dist/v3/schema.js` rebuild discipline per CLAUDE.md §3.4) | WB8 GREEN runs `pnpm --filter dispatch-core build` BEFORE workstation typecheck per CLAUDE.md §3.4 |
| Frame C default-mode lock-in (`frame-mode-state.ts:8` `DEFAULT_MODE: FrameMode = 'C'`) — T1 bugs visible on every launch | `[KNOWN]` | `[MODELED-MEDIUM]` (UX regression on every launch if T1 has runtime bugs) | WB-final smoke is load-bearing for default-mode UX; HALT-WB-FINAL-PRE-COMMIT can request feature-flag of default-mode-A pending T1 stability if smoke surfaces concerns |

---

## §9 — WORKSTATION_CONTRACT.md §6 amendment outline (CONDITIONAL — per Sub-Q resolutions)

`[MODELED]` Amendment scope depends on Sub-Q resolutions; per dispatch §3.3 each new IPC channel = new operator-arbitrated amendment cycle. Drafted text below is mechanical-translation scaffold; operator-arbitrates final language at HALT-WB-PRE-COMMIT.

### §9.1 — Sub-Q-T1-A=(γ): `workstation:sessions-state-{get,changed}` (NOT recommended default)

If selected: §6.6 amendment adds row:

```
### §6.6.N — workstation:sessions-state-get / workstation:sessions-state-changed

| Channel | Direction | Payload | Reply shape | Authority |
|---|---|---|---|---|
| `workstation:sessions-state-get` | renderer→main (ipcRenderer.invoke) | none | `{ sessions: readonly TileGridSessionEntry[] }` | source-of-truth main-process state in `main/sessions-state.ts` (NEW; splitter-state.ts pattern) |
| `workstation:sessions-state-changed` | main→renderer (webContents.send) | `{ sessions: readonly TileGridSessionEntry[] }` | n/a (broadcast) | fired by `main/sessions-state.ts` on every mutation; both `#tile-grid-root` and `#frame-c-root` renderers subscribe |

Failure modes: ipc-invoke timeout (renderer-side 1000ms fallback to empty array); main-process write contention (last-writer-wins per CLAUDE.md §3.5 splitter-state precedent).
```

### §9.2 — Sub-Q-T1-C=(ii): `workstation:session-computed-status` (NOT recommended default)

If selected: §6.6 amendment adds row for daemon-status-relay channel; sibling of `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` row 271 closure-path-b.

### §9.3 — Sub-Q-T1-E=(β): `frame-c:get-filter-state` / `frame-c:set-filter-state` (NOT recommended default)

If selected: §6.6 amendment adds row mirroring `frame-mode:get`/`frame-mode:set` pattern at lines 460-468 of main.ts; persistence file `frame-c-filter-state.json` at `app.getPath('userData')`.

### §9.4 — Sub-Q-T1-F=(β): `frame-c:get-selection` / `frame-c:set-selection` (NOT recommended default)

If selected: §6.6 amendment adds row similar to §9.3 above for selection-state persistence.

### §9.5 — Default path (recommended): NO §6 amendment

Sub-Q defaults (A=(δ), B=(i), C=(i), D=(iii), E=(α), F=(α)) produce ZERO frozen-surface touch. Workstation-internal extensions (spawn-handler model + spawnedAtMs fields) are §2.10 mechanical-translation; renderer-internal modules (sessions-context, status-color, model-badge, uptime-format, session-filter-bar) are new-file additions. Auto-ack envelope §C operative throughout per dispatch §3.5 visual-comparison gate.

---

**End of MB-T-WIREFRAME-T1-SESSION-DATA-FLOW ticket body.**

Pending operator resolutions before execution (surface at HALT-TICKET-BODY-PRE-COMMIT):
- Sub-Q-T1-A (§3.1) — sessions-stream source-of-truth surface (α state-lift / β independent subscription / γ new IPC / **δ React Context + window CustomEvent (recommended)**)
- Sub-Q-T1-B (§3.2) — model field source (**i workstation spawn-handler extension (recommended)** / ii daemon schema / iii PTY scrape / iv defer)
- Sub-Q-T1-C (§3.3) — status indicator color mapping (**i extend TileStatus + renderer-derived (recommended)** / ii daemon computed_status / iii hybrid TileStatus + hint)
- Sub-Q-T1-D (§3.4) — uptime field source (i renderer-internal mount-time / ii daemon-tracked / **iii workstation spawn-handler extension (recommended)**)
- Sub-Q-T1-E (§3.5) — filter state persistence (**α renderer-only (recommended)** / β frame-c-filter-state.ts / γ embed in frame-mode-state.ts)
- Sub-Q-T1-F (§3.6) — tile selection persistence revisit (**α keep deferred (recommended)** / β promote to persisted)

Plus flag-at-WB-final question: visual-comparison gate per dispatch §3.5 — does operator want headless screenshot evidence in commit body (T6 dependency), or operator-manual-screenshot fallback?
