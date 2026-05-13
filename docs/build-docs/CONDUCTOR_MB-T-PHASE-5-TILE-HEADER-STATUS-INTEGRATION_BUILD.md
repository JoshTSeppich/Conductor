# MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION — Wire `createSessionStatusSource` snapshot into tile-header status indicator

**Status:** `[SPECULATIVE]` DRAFT-PENDING-OPERATOR-REVIEW (Round 12 forward-position; ticket body authored ahead of impl manifest)
**Date authored:** 2026-05-13
**Authored under:** §3.2 operator-supervised mechanical translation discipline. Round 12 §3.9 SPECULATIVE Wave 1 dispatch from `r12-phase5-tile-header-integration-body` session manifest. Body is forward-position scaffolding; **no impl scope authorized** until operator HALT-PRE-WB1 ack with chosen closure path.
**Authoring delegate:** Opus 4.7 under dispatch row "r12-phase5-tile-header-integration-body — author MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION ticket body + coord docs".
**Authoring anchor commit (HEAD at authoring time):** `8bb68b3` (Round 12 Wave 1 dispatch-queue close + plugin-loaded cohort author).
**Cairn ladder anchor:** Phase 5 forward-position wave continuation. Closes the consumer-side gap left by `MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW` (`bf99f9d`) which shipped the data source + presentational component but EXPLICITLY deferred the tile-header chrome integration because `tile-grid.tsx` was FORBIDDEN to that ticket's manifest.

**Closes:**
- `MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` (Tier 2; `docs/FOLLOWUPS.md:361`) filed at `30e4aa8` from `commit-plan-doc-1334-status-indicator` WB-final. Followup body verbatim: *"1 prop addition to TileGridProps (renderStatusSlot analog to renderPickerSlot) + parent closure reading createSessionStatusSource snapshot. WB5 integration probe (5dc34c7) demonstrates the end-to-end mechanism."*

**Depends on (already merged, READ-ONLY consumed):**
- `packages/dispatch-workstation/src/main/session-status-source.ts` (`fb6a474`) — `createSessionStatusSource(deps): { subscribe, getSnapshot, dispose }`. `[KNOWN]` at `session-status-source.ts:57-104`.
- `packages/dispatch-workstation/src/main/session-status-source-poll.ts` (`17aa384`) — `startStatusPoll` + `StatusListClient` interface.
- `packages/dispatch-workstation/src/main/session-status-source-derive.ts` (`eeb11f5`) — `deriveTileStatus` pure-fn.
- `packages/dispatch-workstation/src/tile-grid/status-indicator.tsx` (`ff530b1`) — `StatusIndicator` presentational component. **May or may not be wired by this ticket depending on Sub-Q-1 disposition** (see §3.1).
- `packages/dispatch-workstation/test/unit/tile-grid/probe-mbtphase5-status-indicator-02-integration.spec.tsx` (`5dc34c7`) — end-to-end mechanism demonstration via `ConsumerWrapper` fixture (`probe-...-02-integration.spec.tsx:74-91`). Use as authoring reference for the production parent-closure shape.
- `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` `TileGridSessionEntry.status?: TileStatus` (`[KNOWN]` at `tile-grid.tsx:29-31`) — **data-flow plumbing already exists**; this ticket may exercise it without adding a new prop (see Sub-Q-1 Path B).
- `packages/dispatch-workstation/src/tile-grid/tile-header.tsx` `<span data-testid="tile-status-indicator">` (`[KNOWN]` at `tile-header.tsx:224-230`) — existing status dot driven by `TileHeader.status` prop. Already reactive to whatever `Tile.status` is passed.

**Depends on (NOT YET MERGED but coordinating in parallel):**
- None known at authoring time (Round 12 Wave 1 plugin-loaded cohort manifests are body-drafting-only per dispatcher).

**Downstream gates (post-ship):**
- Optional follow-on: spawn-event optimistic seeding (closing `MB-F-STATUS-SOURCE-SPAWN-EVENT-OPTIMISTIC-WINDOW` Tier 3, `docs/FOLLOWUPS.md:362`) — DEFERRED; not in scope.
- Optional follow-on: daemon-unreachable UX banner (closing `MB-F-STATUS-SOURCE-DAEMON-UNREACHABLE-UX` Tier 3, `docs/FOLLOWUPS.md:363`) — DEFERRED.

**Estimated WB count:** 3-4 WBs + WB-final, scope-dependent on Sub-Q-1 disposition (§3.1):
- **If Path B (data-flow, RECOMMENDED):** 3 WBs + WB-final. Parent-closure status hookup → empty-window fallback → dispose lifecycle.
- **If Path A (followup-row literal `renderStatusSlot`):** 4 WBs + WB-final. Add prop to `TileGridProps`, plumb through `<Tile>`, author parent-closure, dispose lifecycle.
- **If Path C (replace TileHeader inline dot with render-slot):** 5+ WBs + WB-final. Touches `tile-header.tsx` AND adds `renderStatusSlot` AND removes inline span; risks MB-T12 probe-01..04 testid collisions.

Final ladder size is operator-binding via Sub-Q-1.

---

## §0 — Reading protocol

1. §1 (scope) + §2 (arbitration anchor — operator HALT-PRE-WB1 binds the ladder).
2. §3 (sub-Qs) — **UNRESOLVED at authoring**; this ticket is Round 12 forward-position SPECULATIVE. Operator answers required before WB1 RED.
3. §4 (WB ladder) for execution order, gated on Sub-Q-1 disposition.
4. §5-§9 are operational supports.

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]`, `[MODELED]`, `[SPECULATIVE]`, `[KNOWN-OPERATOR-ARBITRATED]` for operator-acked decisions binding ticket scope. **All Sub-Q dispositions in §3 are `[SPECULATIVE]` until operator HALT-PRE-WB1 ack.**

---

## §1 — Scope

### §1.1 — What this ticket DOES

The closure goal is consumer-visible: **the tile-header status dot reflects live daemon-derived session status** (green for running, amber for stale, red for daemon-down or held-cairn-violation, grey for idle). The data source is shipped (`createSessionStatusSource`); this ticket wires its snapshot into the renderer chain feeding the existing tile-header status dot.

**Specific closure path depends on Sub-Q-1 disposition (§3.1).** Two viable paths are catalogued below; both close the followup. The recommendation is Path B (data-flow). The followup row prescribes Path A literally; this ticket surfaces Path B because investigation at authoring reveals an existing data-flow seam.

#### Path A — `renderStatusSlot` prop (followup-row-literal)

`[SPECULATIVE]` — pending Sub-Q-1=A operator ack:

1. **Add `renderStatusSlot?: (sessionName: string) => ReactNode` to `TileGridProps`** in `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx`, mirroring `renderPickerSlot` shape at `tile-grid.tsx:103` exactly.
2. **Pass-through to `<Tile>`** at `tile-grid.tsx:427` block, identical to `renderPickerSlot={renderPickerSlot}` line.
3. **Add `renderStatusSlot?` to `TileProps`** in `tile.tsx`, mirroring `renderPickerSlot` at `tile.tsx:82`. Render inside header chrome: `<div data-slot="status" data-testid="tile-status-slot-{sessionName}">{renderStatusSlot?.(sessionName) ?? null}</div>` adjacent to picker/autopilot slots.
4. **Author parent closure** in `tile-grid-app.tsx`, mirroring `renderPickerSlot` shape at `tile-grid-app.tsx:395-402`. Closure reads from a `useState`-mirrored snapshot of `createSessionStatusSource` and returns `<StatusIndicator status={...} sessionName={sessionName} />`.
5. **Author `useEffect` lifecycle** in `tile-grid-app.tsx` that creates the source on mount, subscribes (mirroring `probe-...-02-integration.spec.tsx:76-89` ConsumerWrapper), and `dispose()`s on unmount.

**Result**: TWO status dots co-rendered per tile header — the existing `tile-header.tsx:226` inline span (driven by `Tile.status` → `TileGridSessionEntry.status`) AND the new render-slot StatusIndicator (driven by source snapshot). Testid collision is AVOIDED because the new component uses `tile-status-indicator-{sessionName}` (per-session keyed) while the existing inline span uses unkeyed `tile-status-indicator`. **Visual duplication is the open concern** — operator decides if both indicators co-rendered is acceptable, OR if Path A implies removing the existing TileHeader inline dot (which collapses to Path C).

#### Path B — data-flow via existing `TileGridSessionEntry.status` (RECOMMENDED)

`[SPECULATIVE]` — pending Sub-Q-1=B operator ack:

1. **No new prop on `TileGridProps`. No new prop on `TileProps`. No changes to `tile-grid.tsx` or `tile.tsx`.**
2. **In `tile-grid-app.tsx`**: add `useState<ReadonlyMap<string, TileStatus>>(new Map())` to mirror the source snapshot. Add `useEffect` that creates the source on mount, subscribes (sets state on snapshot), and `dispose()`s on unmount.
3. **Merge snapshot into `sessions[]`** at the JSX call site (`tile-grid-app.tsx:447-448`): wrap `sessions={sessions}` with `sessions={sessions.map(s => ({ ...s, status: snapshot.get(s.name) ?? s.status ?? 'idle' }))}`. The existing `Tile.status` → `TileHeader.status` → `<span data-testid="tile-status-indicator">` chain becomes reactive automatically.
4. **No `tile-grid/*.tsx` files added** → no `MB-F-WORKSTATION-TSCONFIG-TILE-GRID-TSX-EXCLUDE-CONVENTION` tax.
5. **The shipped `StatusIndicator` component is NOT wired in this ticket** but remains exported + available for downstream consumers (FrameCRoot SessionList rows per `coord-phase5-status-2026-05-13.md` §1 row 2 — separate follow-on ticket scope).

**Result**: single status dot per tile (the existing `tile-header.tsx:224-230` span), now reactive. MB-T12 probe-01..04 selectors continue to match unchanged (`tile-status-indicator` unkeyed testid preserved). Smallest blast radius.

#### Path C — replace TileHeader inline dot with `renderStatusSlot` (full collapse)

`[SPECULATIVE]` — pending Sub-Q-1=C operator ack:

1. All of Path A's surface changes.
2. **PLUS**: remove the existing `<span data-testid="tile-status-indicator">` block at `tile-header.tsx:224-230`. TileHeader no longer renders its own dot; the new render-slot is the sole status surface.
3. **PLUS**: amend MB-T12 probe-01..04 (search workstation test suite for `tile-status-indicator` testid usages) to use the per-session keyed `tile-status-indicator-{sessionName}` testid OR introduce a testid alias.

**Result**: cleanest architectural end-state (single status component class). LARGEST blast radius — touches `tile-header.tsx` (a stable shipped surface) and possibly MB-T12 unit tests. Risk of regression on the MB-T15 token-meter/branch chrome reads. **Not recommended for v3.0**; could be a deferred refactor follow-on.

### §1.2 — What this ticket DOES NOT

`[SPECULATIVE]` constraints (operator may rescope):

- Does NOT modify `dispatch-core/src/v2/schema.ts` (FORBIDDEN; frozen).
- Does NOT modify any file under `packages/dispatch-daemon/**` (FORBIDDEN; out of scope).
- Does NOT amend `frame-c/status-color.ts` or `tile-grid/types.ts` (READ-ONLY consumed via the shipped source).
- Does NOT add a new IPC channel (FORBIDDEN amendment to `WORKSTATION_CONTRACT.md`).
- Does NOT ship spawn-event optimistic seeding (`MB-F-STATUS-SOURCE-SPAWN-EVENT-OPTIMISTIC-WINDOW` — deferred Tier 3).
- Does NOT ship daemon-unreachable UX banner (`MB-F-STATUS-SOURCE-DAEMON-UNREACHABLE-UX` — deferred Tier 3).
- Does NOT install runtime dependencies. Production wiring uses the existing source + `HttpSessionListClient`.
- Does NOT persist snapshot state. On unmount / window reload the snapshot is rebuilt from the first daemon poll.

### §1.3 — Territory expansion needed for impl manifest

`[SPECULATIVE]` — surface for Wave 2 impl session manifest:

- **Path A** requires write access to: `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx`, `packages/dispatch-workstation/src/tile-grid/tile.tsx`, `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx`. NEW probe file under `packages/dispatch-workstation/test/unit/tile-grid/`.
- **Path B** requires write access to: `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx` ONLY. NEW probe file under `packages/dispatch-workstation/test/unit/tile-grid/`.
- **Path C** requires write access to: Path A files + `packages/dispatch-workstation/src/tile-grid/tile-header.tsx` + workstation test files referencing `tile-status-indicator` unkeyed testid (likely under `test/unit/tile-grid/` MB-T12 ladder probes).
- **None** of Path A/B/C require tsconfig.json amendment IF Path B is chosen (no new `.tsx` file). Path A and Path C may not require tsconfig amendment either (no new `.tsx` file authored; only edits to existing excludes). **But verify** at WB1: any new probe file under `test/unit/tile-grid/` is already covered by the blanket `test` exclude at `tsconfig.json:17` (the `.tsx` exclude tax applies to `src/tile-grid/`, not `test/`).

This block goes verbatim into the Wave 2 impl manifest under TERRITORY.

---

## §2 — Arbitration anchor

The following operator decisions are LOAD-BEARING and bind every WB. All `[SPECULATIVE]` at authoring; operator HALT-PRE-WB1 ack required:

| Sub-Q | Operator decision needed | Authoring recommendation |
|---|---|---|
| §3.1 (closure path) | Path A (renderStatusSlot) / Path B (data-flow) / Path C (replace inline dot) | **Path B** — smallest blast radius; preserves MB-T12 probe selectors; no tile-grid `.tsx` additions; no testid collision. |
| §3.2 (source ownership + lifecycle) | Module-singleton in `tile-grid-app.tsx` useEffect / main-process bridge ownership / global source registry | Renderer-side `useEffect`-owned in `tile-grid-app.tsx` (mirrors WB5 probe `ConsumerWrapper` pattern at `probe-...-02-integration.spec.tsx:76-89`). One source per `TileGridApp` mount; disposed on unmount. |
| §3.3 (empty-window rendering before first poll) | `'idle'` grey fallback / preserve existing `s.status` fallback / explicit `'awaiting'` placeholder | **`s.status ?? 'idle'`** — defer to entry's seeded status if present (e.g., from spawn-result envelope), else grey. Mirrors existing TileHeader behavior. |
| §3.4 (`HttpSessionListClient` sharing) | Share existing instance from `session-cap.ts` / instantiate separate / inject via prop | **Instantiate separate** — decouples status-poll cadence from cap-check cadence; avoids coupling concerns. Negligible HTTP overhead (1 extra poll/3s). |
| §3.5 (optimistic spawn-event seeding) | Include in this ticket / defer to `MB-F-STATUS-SOURCE-SPAWN-EVENT-OPTIMISTIC-WINDOW` follow-on | **Defer** — keep this ticket data-flow-only. Optimistic seeding has its own filed Tier 3 followup. |

---

## §3 — Sub-arbitrations (UNRESOLVED — pending operator HALT-PRE-WB1 ack)

### §3.1 — Closure path (3 options; RECOMMEND Path B)

See §1.1. The followup row (`docs/FOLLOWUPS.md:361`) prescribes Path A literally ("renderStatusSlot analog to renderPickerSlot"). Authoring investigation reveals that `TileGridSessionEntry.status?` already exists at `tile-grid.tsx:31` and is already plumbed through to the existing `tile-header.tsx:224-230` indicator. Path B exploits this existing seam without adding a new render-prop. The followup-row prescription was authored before this seam was investigated; Path B is consistent with the spirit of the followup (close the operator-visible status-color gap) while being structurally smaller.

Operator decision binding. Possible outcomes:
- **Path A**: ship literal followup-row prescription. Co-renders two indicators (existing inline + new keyed). 4-WB ladder.
- **Path B**: data-flow only. Reuses existing indicator. 3-WB ladder. **RECOMMENDED.**
- **Path C**: full collapse to single new component, removing inline. 5+-WB ladder. Largest blast radius.

### §3.2 — Source ownership and lifecycle

Where does the singleton `SessionStatusSource` live, and what is its lifetime?

- Option (a) **Renderer-side, `tile-grid-app.tsx` `useEffect`** — mirrors WB5 probe `ConsumerWrapper`. One source per `TileGridApp` component instance; disposed on unmount. Recommended.
- Option (b) **Main-process bridge** — workstation main owns the source; renderer subscribes via IPC channel. Requires new `WORKSTATION_CONTRACT.md` IPC (FORBIDDEN amendment to frozen contract). Rejected.
- Option (c) **Global module singleton** — module-scope `let source = createSessionStatusSource(...)` in a helper module. Survives `TileGridApp` remounts. Risk: leaks if not disposed at app shutdown.

Recommendation: (a). Aligns with `probe-...-02-integration.spec.tsx:76-89` pattern; React-idiomatic; no IPC coupling.

### §3.3 — Empty-window rendering

Snapshot starts empty; first poll completes 0-3s after mount. What does the indicator show during that window?

- Option (a) **`s.status ?? 'idle'`** — fallback to entry's seeded status (e.g., spawn-result envelope may have `'idle'`), else grey. **RECOMMENDED** — mirrors existing behavior.
- Option (b) **always `'idle'`** — discard entry's seeded status. Simpler; less reactive.
- Option (c) **distinct `'awaiting'`** — would require touching `tile-grid/types.ts` (FORBIDDEN here) and `frame-c/status-color.ts` (READ-ONLY). Rejected.

### §3.4 — `HttpSessionListClient` sharing

The workstation already polls `GET /v2/sessions` for the session cap check via `HttpSessionListClient` (`session-cap.ts:159+`). The new source polls the same endpoint at a separate cadence. Options:

- Option (a) **Instantiate separate `HttpSessionListClient`** — fully decoupled; ~1 extra HTTP request per 3s. **RECOMMENDED.**
- Option (b) **Share instance, share poll loop** — requires refactoring `session-cap.ts` to broadcast cap-check results to status consumers. Larger blast radius; scope creep.
- Option (c) **Share instance, separate poll loops** — both `startStatusPoll` and the cap-check poll call `listSessions()` on the same client object. Acceptable; client is stateless. Marginal benefit over (a).

### §3.5 — Optimistic spawn-event seeding

A successful workstation spawn-result envelope arrives faster than the first daemon poll (up to 3s latency). Should this ticket also seed `snapshot[sessionName] = 'idle'` on spawn-result observation?

- Option (a) **Defer** — separate filed Tier 3 followup (`MB-F-STATUS-SOURCE-SPAWN-EVENT-OPTIMISTIC-WINDOW`, `docs/FOLLOWUPS.md:362`) closes this. **RECOMMENDED.**
- Option (b) **Include** — add the optimistic seed in this ticket's parent-closure. Closes both the integration + the optimistic-window followup. Scope creep risk.

---

## §4 — WB ladder

**Ladder scope is operator-binding via Sub-Q-1.** Two ladders are catalogued. Operator picks at HALT-PRE-WB1.

### Path B ladder (RECOMMENDED — 3 WBs + WB-final)

#### WB1 — `red+green(MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION): WB1 — parent-closure status hookup in tile-grid-app.tsx`

**Scope:** Add `useState<ReadonlyMap<string, TileStatus>>` + `useEffect` lifecycle in `tile-grid-app.tsx`; merge snapshot into `sessions` at JSX call site.

**RED probe — 3 conditions** (probe file: `test/unit/tile-grid/probe-mbtphase5-status-integration-01-parent-closure.spec.tsx`):
1. Render `<TileGridApp>` with a fake `SessionStatusSource` injected (test seam via prop or factory override). Initial render: indicator shows entry's seeded `status` (`'idle'` by default).
2. Source emits `'open'` for session 'a' via subscribe callback. After fake-timer tick + `act()` flush, `tile-status-indicator` element's `data-status` attribute reads `'open'`.
3. Source emits `'error'` for session 'a'. After flush, `data-status` reads `'error'`.

Acceptance: probe imports `TileGridApp`; selectors find the existing unkeyed `tile-status-indicator` testid (Path B preserves it). GREEN: implement the snapshot mirror + merge in the JSX call site; 3/3 PASS + typecheck CLEAN.

#### WB2 — `red+green(MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION): WB2 — empty-window fallback`

**Scope:** Verify the `s.status ?? 'idle'` fallback at the merge site behaves correctly when the snapshot is empty AND when the entry has a seeded `status`.

**RED probe — 2 conditions** (probe file: `test/unit/tile-grid/probe-mbtphase5-status-integration-02-empty-window.spec.tsx`):
1. Source emits no snapshot entries yet (empty Map). Entry has no `status` field. Indicator's `data-status` reads `'idle'`.
2. Source emits no snapshot entries yet. Entry has `status: 'open'` seeded. Indicator's `data-status` reads `'open'` (seeded value preserved).

GREEN: WB1 merge expression `snapshot.get(s.name) ?? s.status ?? 'idle'` already implements both; this probe is the ratification. If WB1 GREEN omits the chained fallback, this WB1 GREEN gets amended (no new RED commit; bug-fix in-WB).

#### WB3 — `red+green(MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION): WB3 — dispose lifecycle on unmount`

**Scope:** Verify `useEffect` cleanup calls `source.dispose()` and stops further snapshot emits from reaching React state.

**RED probe — 2 conditions** (probe file: `test/unit/tile-grid/probe-mbtphase5-status-integration-03-dispose.spec.tsx`):
1. Mount `<TileGridApp>` with recording fake source. Unmount via `cleanup()`. Recording verifies `source.dispose()` was invoked exactly once.
2. After unmount, simulated source emit does NOT trigger React state-update warning (`act()` outside boundary check).

GREEN: ensure `useEffect` returns `() => { unsub(); source.dispose(); }` per `probe-...-02-integration.spec.tsx:85-88` pattern.

#### WB-final — `docs(MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION): WB-final — findings + coord docs`

**Scope:**
1. `docs/coordination/mb-t-phase-5-tile-header-status-integration-findings-2026-05-13.md` — closure findings, cairn ladder table, verification evidence, downstream impact.
2. `docs/coordination/coord-mb-t-phase-5-tile-header-status-integration-2026-05-13.md` — updated cross-session interlocks + RECURRENCE catalog if observed + any new followups.
3. Followups proposed (orchestrator-mediated FOLLOWUPS.md insertion):
   - `MB-F-STATUS-SOURCE-FRAME-C-SESSION-LIST-INTEGRATION` (Tier 3) — wire StatusIndicator into FrameCRoot SessionList rows (per `coord-phase5-status-2026-05-13.md` §1 row 2 reference).
   - Close `MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` as RESOLVED at this ticket's final commit.

### Path A ladder (4 WBs + WB-final) — alternate if Sub-Q-1=A

#### WB1 — Add `renderStatusSlot?` to `TileGridProps` + pass-through to `<Tile>` (red+green in `tile-grid.tsx`).
#### WB2 — Add `renderStatusSlot?` to `TileProps` + render inside header chrome (red+green in `tile.tsx`).
#### WB3 — Author parent-closure + `useEffect` lifecycle in `tile-grid-app.tsx` (red+green).
#### WB4 — Integration ratification probe end-to-end (`tile-status-indicator-{sessionName}` testid path; verify co-rendered with unkeyed inline dot).
#### WB-final — findings + coord docs (same as Path B WB-final).

### Path C ladder (5+ WBs + WB-final) — alternate if Sub-Q-1=C

Adds all Path A WBs PLUS: WB5 removes inline `<span data-testid="tile-status-indicator">` from `tile-header.tsx` + WB6 migrates MB-T12 probe-01..04 testid usage. Documented but **NOT RECOMMENDED**.

---

## §5 — Cross-references

| Anchor | Citation |
|---|---|
| Followup row (closure target) | `docs/FOLLOWUPS.md:361` (`MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION`) |
| Shipped data source | `packages/dispatch-workstation/src/main/session-status-source.ts:57-104` (`fb6a474`) |
| Shipped StatusIndicator component | `packages/dispatch-workstation/src/tile-grid/status-indicator.tsx` (`ff530b1`) |
| End-to-end mechanism reference | `packages/dispatch-workstation/test/unit/tile-grid/probe-mbtphase5-status-indicator-02-integration.spec.tsx:74-91` (`5dc34c7`) |
| Existing data-flow seam | `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx:29-31` (`TileGridSessionEntry.status?: TileStatus`) |
| Existing TileHeader indicator | `packages/dispatch-workstation/src/tile-grid/tile-header.tsx:224-230` (`<span data-testid="tile-status-indicator">`) |
| Existing parent-closure pattern reference | `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx:380-444` (renderPickerSlot/renderAutopilotSlot/renderFooterSlot closures + bridges) |
| Predecessor ticket | `docs/build-docs/CONDUCTOR_MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW_BUILD.md` (data-flow + component shipped at `bf99f9d`) |
| Predecessor findings | `docs/coordination/mb-t-phase-5-status-indicator-data-flow-findings-2026-05-13.md` §V row 1 (downstream impact) + §VII row 1 (followup body) |
| Predecessor coord | `docs/coordination/coord-phase5-status-2026-05-13.md` §1 row 2 + §4 row 1 |
| Tsconfig.tsx convention | `MB-F-WORKSTATION-TSCONFIG-TILE-GRID-TSX-EXCLUDE-CONVENTION` Tier 2 (`docs/FOLLOWUPS.md:365`) — applies only if Path A/C add a NEW `.tsx` file; Path B does not. |

---

## §6 — Self-check expectations (per CONDUCTOR_API_CONTRACT.md §10.5)

Every WB commit body MUST include the Q1-Q9 self-check block. Pre-emptive answers for this ticket's expected pattern:

1. **API verified by spike?** — The shipped data source (`createSessionStatusSource`) was spike-verified during the predecessor ticket WB5 (`5dc34c7`). This ticket consumes the public interface only; no new external API. ✅
2. **Test exercises behavior or MOCKS?** — Behavior. WB1-WB3 probes use a recording fake source injected via test seam (preferred over module mocks); React component renders for real via `@testing-library/react`.
3. **If implementation deleted, test passes?** — No (RED probes fail at HEAD; GREEN closes them).
4. **Anything outside contract spec?** — No. Sub-Q-1..Sub-Q-5 dispositions pin every decision; Path B requires zero contract surface changes.
5. **Modified contract without approval?** — No. `dispatch-core/src/v2/schema.ts`, `WORKSTATION_CONTRACT.md`, and `frame-c/status-color.ts` all READ-ONLY.
6. **Any unlabeled claim?** — Every Sub-Q-1..5 answer is `[KNOWN-OPERATOR-ARBITRATED]` after HALT-PRE-WB1; pre-ack body uses `[SPECULATIVE]`. Surface-state claims about existing code use `[KNOWN]` with file:line citation.
7. **Touched files another parallel session might modify?** — Every WB MUST pre-stage `git status --short` per CLAUDE.md §2.7. Path B touches `tile-grid-app.tsx` only — a stable surface but in the tile-grid territory; coordinate with any concurrent tile-grid ticket via manifest fences.
8. **Bypass PATCH /v2/sessions/:name/state?** — N/A. This ticket only READS via the shipped source which calls GET /v2/sessions.
9. **Work during unauthorized halt?** — No. HALT-PRE-WB1 gate at operator Sub-Q ack; subsequent WB commits authorized.

Every WB commit MUST use per-path pathspec: `git commit -m "..." -- <path1> <path2> ...`. Per CLAUDE.md §2.7.

---

## §7 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sub-Q-1 disposition flip mid-ladder (operator changes mind from Path B to Path A) | LOW | MED — partial work along Path B's tile-grid-app.tsx-only edit; pivot to Path A multiplies surface changes | Gate Sub-Q-1 ack at HALT-PRE-WB1; do NOT begin WB1 RED until disposition is `[KNOWN-OPERATOR-ARBITRATED]`. |
| Path A: testid collision risk between existing inline `tile-status-indicator` and new keyed `tile-status-indicator-{sessionName}` | MED | LOW — selectors are non-overlapping strings | Verify at WB4 ratification probe; if MB-T12 probe-01..04 selectors broaden via partial-match, file as RED-class regression. |
| Path B: existing `TileGridSessionEntry.status` field has additional callers seeding it (e.g., spawn-handler envelope, frame-c-root) that this ticket's merge expression overrides | MED | LOW — defaulting chain `snapshot.get(s.name) ?? s.status ?? 'idle'` preserves seeded values when snapshot is empty | WB2 probe explicitly exercises the seeded-fallback case; if observed regression on spawn-result envelope flow, surface at WB-final findings. |
| `useEffect` lifecycle leaks source on TileGridApp remount | LOW | MED — accumulates poll timers on rapid remount | WB3 dispose probe; React strict mode double-invoke; verify dispose count matches mount count under strict-mode test. |
| `tile-grid-app.tsx` is touched by other tile-grid tickets (MB-T15-T19 ladder fan-out) in parallel | LOW (Round 12 Wave 1 cohort is body-drafting-only) | MED — cross-session staging contamination | Per-path `git add` per CLAUDE.md §2.7; pre-stage `git status --short` mandatory. Coordinate via manifest fences. |
| Path C: removing inline `tile-status-indicator` span breaks MB-T12 probe-01..04 unconditionally | HIGH (if Path C chosen) | MED — every MB-T12 unit test selector hit | Defer Path C unless operator explicitly invokes; flag as scope-expansion-required. |

---

## §8 — Definition of done

**Path B (RECOMMENDED):**
- [ ] WB1 RED+GREEN: parent-closure status hookup; 3/3 conditions pass; typecheck CLEAN.
- [ ] WB2 RED+GREEN: empty-window fallback; 2/2 conditions pass; typecheck CLEAN.
- [ ] WB3 RED+GREEN: dispose lifecycle; 2/2 conditions pass; typecheck CLEAN.
- [ ] WB-final: 2 docs authored + 1 followup row closure proposed (orchestrator-mediated).
- [ ] Every WB commit: per-path stage + per-path commit pathspec + post-stage status verified + push + origin parity verified.
- [ ] Consumer non-regression at WB-final: full workstation unit suite passes (excluding documented pre-existing REDs per CLAUDE.md §4.5).
- [ ] HALT-TICKET-BODY-PRE-COMMIT: operator Sub-Q-1..5 ack received and recorded in `mb-t-phase-5-tile-header-status-integration-decisions-2026-05-13.md`.

**Path A** and **Path C** definitions of done: extend the WB count per §4 ladders.

---

## §9 — Closing posture

`[SPECULATIVE]` per Round 12 forward-positioning. Body is dispatch-ready scaffolding; operator HALT-PRE-WB1 ack binds the closure path AND the WB ladder size. Without ack, no impl session manifest authoring is justified.

The closure goal is unambiguous: operator-visible status colors on the tile header. Three viable paths to it. Path B is structurally smallest, exploits an existing data-flow seam discovered at authoring, and preserves all existing testid contracts. Path A is the literal followup-row prescription. Path C is the longest-term cleanest end-state but the largest blast radius.

Surface to operator: **chose Sub-Q-1 disposition + ack §3.2-§3.5 recommendations OR override.**

---

**End ticket body.**
