# MB-T17 Phase 2 — Operator-Arbitrated Decisions

**Date:** 2026-05-07
**HEAD at decision time:** post-Phase-1-diagnose (`39e8134`)
**Source:** `docs/coordination/mb-t17-diagnose-2026-05-07.md` (Phase 1)
+ operator confirmation 2026-05-07 ("Proceed with tentative
dispositions, begin Phase 2 WB1. All Q-MBT17-1..13 = (a). All
R-MBT17-1..8 ACCEPT/PRESERVE as proposed.").
**Phase 2 brief:** scope-via-chartered-followup
`MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION` (FOLLOWUPS.md:173).

This doc captures the dispositions on Q-MBT17-1..13 + R-MBT17-1..8 + the
Phase 2 ladder for MB-T17 (per-tile autopilot toggle). Operator
confirmed all tentative recommendations from Phase 1 §II + §III.

---

## I. Q-MBT17-N dispositions

| ID | Disposition | One-line rationale |
|---|---|---|
| Q-MBT17-1 | (a) native `<input type="checkbox" role="switch">` | Accessible by default, keyboard-friendly, low-effort; mirrors Q-MBT16-1=a precedent |
| Q-MBT17-2 | (a) disabled toggle + tooltip "autopilot unavailable" on bridge-missing or fetch error | Operator-visible failure mode; mirrors Q-MBT16-2=a |
| Q-MBT17-3 | (a) optimistic update + silent rollback on PUT error + tooltip | Snappy UI; mirrors Q-MBT16-3=a |
| Q-MBT17-4 | (a) render-prop on Tile (`renderAutopilotSlot?: (sessionName) => ReactNode`) | Mirrors Q-MBT16-4=a + MB-T16 Insight 1 (render-prop slot population pattern) |
| Q-MBT17-5 | (a) separate file `src/tile-grid/tile-autopilot-toggle.tsx` | Mirrors Q-MBT16-5=a; testable in isolation |
| Q-MBT17-6 | (a) optional methods on WorkstationBridgeShape | Mirrors Q-MBT16-6=a + MB-T16 Insight 2 (bridge adapter pattern); existing test fixtures stay GREEN |
| Q-MBT17-7 | (a) no cache for v3.0; per-tile fetch on mount | Mirrors Q-MBT16-7=a; sync fs ops are cheap |
| Q-MBT17-8 | (a) default `enabled=false` on no-row (KNOWN per autopilot-state-store.ts:61) | Opt-in is the safe default for autopilot |
| Q-MBT17-9 | (a) parallel `AutopilotLoop` instance in IPC controller | KNOWN-endorsed by autopilot-loop.ts:102 file header ("stateless class … multiple instances see the same persisted state") |
| Q-MBT17-10 | (a) new sentinel block `=== BEGIN: MB-T17 autopilot IPC ===` adjacent to MB-T16 zone | CLAUDE.md §3.3 sentinel discipline |
| Q-MBT17-11 | (a) per-WB probe directories (`test/unit/autopilot-ipc/` + `test/unit/tile-autopilot-toggle/`) | CLAUDE.md §3.6 + MB-T16 precedent |
| Q-MBT17-12 | (a) toggle is a pure flag — no background loop, no side effects | KNOWN per autopilot-loop.ts:120-130; orchestrator-action-handler reads `isEnabled()` on next call |
| Q-MBT17-13 | (a) probe-05 (TileGridApp adapter, 6 tests) + probe-07 (Tile slot integration, 7 tests) at WB4 | Mirrors Q-MBT16-13 → probe-04 + probe-06 numbering scheme |

## II. R-MBT17-N dispositions

| ID | Disposition | Action |
|---|---|---|
| R-MBT17-1 | ACCEPT | Parallel AutopilotLoop instances explicitly safe; sync fs ops + zero in-memory state |
| R-MBT17-2 | ACCEPT | Concurrent JSON writes — sync fs atomic per call; race window microseconds; impact bounded to one missed timestamp |
| R-MBT17-3 | ACCEPT for v3.0 | Tooltip-only PUT-failure surfacing acceptable; v3.1 polish followup at WB5 (mirror MB-F-T16-OPTIMISTIC-ROLLBACK-OBSERVABILITY) |
| R-MBT17-4 | PRESERVE | Slot wrapper testid `tile-autopilot-slot-{name}` + `data-slot="autopilot"` preserved by render-prop pattern construction |
| R-MBT17-5 | SEPARATE SENTINEL | Per Q-MBT17-10=a; new sentinel block in main.ts; no existing zone touched |
| R-MBT17-6 | NONE NEEDED | No dispatch-core types needed in MB-T17 surfaces (toggle is `boolean`, not enum) |
| R-MBT17-7 | ADDED AT WB1 | tsconfig exclude entry for tile-autopilot-toggle.tsx — landed in this commit |
| R-MBT17-8 | ACCEPT for v3.0 | Same as R-MBT17-3 |

## III. Phase 2 ladder (5 WBs, single session)

Per operator brief 2026-05-07 + Phase 1 diagnose §IV:

1. **WB1 (red)** — scaffold autopilot-ipc.ts + tile-autopilot-toggle.tsx
   stubs + this decisions doc + test files (probe-00 per dir) +
   tsconfig exclude entry for the new .tsx file.
   Commit: `red(MB-T17): WB1 — scaffold autopilot-ipc + tile-autopilot-toggle + decisions doc`.
2. **WB2 (green)** — autopilot-ipc.ts pure-fn helpers
   (getSessionAutopilotEnabled, setSessionAutopilotEnabled) +
   AutopilotIpcController + registerHandlers + factory +
   preload.mts extension (getSessionAutopilotEnabled,
   setSessionAutopilotEnabled on workstationBridge) + unit tests.
   Commit: `green(MB-T17): WB2 — autopilot-ipc + preload + unit tests`.
3. **WB3 (green)** — tile-autopilot-toggle.tsx full implementation
   (native `<input type="checkbox" role="switch">`, useEffect mount
   fetch, optimistic onChange + silent rollback per Q-MBT17-2=a +
   Q-MBT17-3=a, disabled state on bridge-missing or fetch-error) +
   render tests + onChange tests + error-state tests.
   Commit: `green(MB-T17): WB3 — tile-autopilot-toggle + render tests`.
4. **WB4 (green)** — Tile.tsx renderAutopilotSlot prop (converts
   self-closing `<div data-slot="autopilot" />` to render-prop
   wrapper preserving testid + data-slot) + TileGrid plumb-through +
   TileGridApp wires (extends WorkstationBridgeShape +
   constructs `autopilotBridge: TileAutopilotToggleBridge | null`
   adapter + renderAutopilotSlot closure) + main.ts integration
   sentinel block + integration tests + close
   `MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION` row in FOLLOWUPS.md.
   Commit: `green(MB-T17): WB4 — slot integration + main.ts wire + closes MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION`.
5. **WB5 (docs)** — findings doc + 3 v3.1 polish followups
   (cache, retry, observability — mirroring MB-T16 WB5 followups).
   Commit: `docs(MB-T17): WB5 — findings doc + followups`.

## IV. Discipline (per CLAUDE.md + MB-T12/MB-T15/MB-T16 ladder lessons)

- Per-path git operations (NEVER `-A` or `.`) — CLAUDE.md §2.7
- Pre-commit territory check via `git status --short`
- Post-commit territory verification via `git log -1 --stat`
- Confidence labels KNOWN / MODELED / SPECULATIVE on every claim — §2.2
- Anti-fabrication: read source, don't infer — §2.1
- Each commit body includes self-check Q1-Q9 per
  CONDUCTOR_API_CONTRACT.md §10.5 — §2.4
- All work happens directly on main (additive) — §2.7
- Per-commit-push: each WB commit pushed to origin immediately,
  verified via `git log --oneline origin/main..HEAD` returning empty —
  §2.6 + MB-T12 WB14 closure (`MB-F-LADDER-PER-COMMIT-PUSH-VS-HALT-2-TENSION`)
- WB11a discoveries applied:
  - Run scoped vitest dirs SEQUENTIALLY (not concurrently — happy-dom hang)
  - Use `act()` wrappers around async DOM-flush calls
  - Add new `.tsx` files to tsconfig exclude — landed at WB1
- MB-T15 + MB-T16 ladder lessons applied:
  - Type extraction pattern when non-JSX modules need .tsx-defined types
    (N/A for MB-T17 — IPC payloads are plain `{ sessionName, enabled }`)
  - Read-before-Write tracking can lose state across turns
    (`MB-F-WRITE-TOOL-READ-TRACKING-CROSS-TURN`) — preemptive 1-line
    Reads before Writes of cross-turn files
  - Render-prop slot population pattern (MB-T16 Insight 1) — mirrors
    Tile.renderPickerSlot? for renderAutopilotSlot?
  - Bridge adapter pattern (MB-T16 Insight 2) — TileGridApp constructs
    null-or-bridge adapter; toggle handles null via 'unavailable' state

## V. Coordination (parallel-cairn awareness)

Operator brief 2026-05-07 surfaces 3 parallel sessions in flight:
- **Terminal B:** MB-T18 (footer chrome). SHARES tile.tsx, tile-grid.tsx,
  tile-grid-app.tsx, main.ts with this session at WB4.
- **Terminal C:** MB-T20 (chat panel shell). New territory `chat-panel/`
  — no tile-grid overlap.
- **Terminal D:** docs chore (architecture note). Docs-only — no source
  overlap.

**Mitigation strategy at WB4 shared-file edits:**
- Render-prop additions are non-conflicting by construction (this
  session adds `renderAutopilotSlot?`; T18 adds `renderFooterSlot?`).
- Pre-commit `git status --short` MUST verify no T18 territory crossed
  into this session's commit.
- Post-commit `git log -1 --stat` MUST verify only this session's paths
  landed.
- If T18 lands their main.ts mutation first, fetch+rebase before
  pushing this session's main.ts mutation.
- HALT and surface to operator if `git status` shows files this session
  did NOT author.

**WB1 status (this commit) — no shared-file touches:**
- All 5 WB1 paths are NEW or this-session-owned: 2 src files (NEW),
  2 test files (NEW), 1 decisions doc (NEW), 1 tsconfig EDIT (single
  exclude addition; T18 has not yet added their .tsx exclude per
  pre-commit territory check).

## VI. References

- Phase 1 diagnose: `docs/coordination/mb-t17-diagnose-2026-05-07.md`
  (`39e8134`)
- Source-of-truth followup: `MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION`
  in `docs/FOLLOWUPS.md:173`
- Operator brief 2026-05-07: "next ticket" → "Confirmed: MB-T17 — Per-
  tile autopilot toggle" + "Proceed with tentative dispositions, begin
  Phase 2 WB1"
- MB-T16 ladder precedent (immediate predecessor):
  - `docs/coordination/mb-t16-decisions-2026-05-07.md`
  - `docs/coordination/mb-t16-findings-2026-05-07.md`
  - WB1 commit: `b20e2fc` (template for this WB1 scaffold)
- MB-T11 ladder source (autopilot foundation):
  - `git log --grep="MB-T11"` (commits `38e009a`, `912ad3c`, `df47e94`,
    `012145c`, `69d7d29`)
- Existing surfaces:
  - autopilot-state-store: `packages/dispatch-workstation/src/main/
    autopilot-state-store.ts`
  - autopilot-loop: `packages/dispatch-workstation/src/main/
    autopilot-loop.ts`
  - Tile slot baseline: `packages/dispatch-workstation/src/tile-grid/
    tile.tsx:165-168`
  - IPC pattern templates: `packages/dispatch-workstation/src/main/
    approval-policy-ipc.ts` (MB-T16), `audit-modal-ipc.ts`,
    `session-kill-ipc.ts`
- Frozen-zone refs: `CLAUDE.md` §2.10 + `packages/dispatch-core/src/
  v3/schema.ts` (NOT touched)
- CLAUDE.md sections governing: §2.5 halt, §2.6 per-commit-push,
  §2.7 per-path git, §3.3 sentinel, §3.6 test layout, §4.1 WB ladder,
  §4.2 HALT gates, §4.3 cross-session coordination
