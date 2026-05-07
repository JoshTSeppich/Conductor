# MB-T16 Phase 2 — Operator-Arbitrated Decisions

**Date:** 2026-05-07
**HEAD at decision time:** post-Phase-1-diagnose (`d11257a`)
**Source:** `docs/coordination/mb-t16-diagnose-2026-05-07.md` (Phase 1)
+ operator confirmation 2026-05-07 ("proceed with tentative
dispositions, begin Phase 2 WB1").
**Phase 2 brief:** scope-via-option-(a) — chartered followup
`MB-F-T13-TILE-HEADER-PICKER-INTEGRATION` (FOLLOWUPS.md:160).

This doc captures the dispositions on Q-MBT16-1..8 + R-MBT16-1..8 + the
Phase 2 ladder for MB-T16 (Tile-header approval-policy picker).
Operator confirmed all tentative recommendations from §VII of the
Phase 1 diagnose by acking "proceed with tentative dispositions".

---

## I. Q-MBT16-N dispositions

| ID | Disposition | One-line rationale |
|---|---|---|
| Q-MBT16-1 | (a) native `<select>` with 3 options | Browser-rendered, accessible by default, low-effort; v3.1 polish if operator wants design refinement |
| Q-MBT16-2 | (a) disabled `<select>` + tooltip "policy unavailable" on error | Operator-visible failure mode; no silent misleading state |
| Q-MBT16-3 | (a) optimistic update + silent rollback on PUT error + tooltip | Snappy UI; failure surfaces via tooltip without modal interruption |
| Q-MBT16-4 | (a) render-prop on Tile (`renderPickerSlot?: (sessionName) => ReactNode`) | Clean React idiom; preserves existing slot wrapper testid + data-slot attribute |
| Q-MBT16-5 | (a) separate file `src/tile-grid/tile-approval-picker.tsx` | Single-purpose; testable in isolation; mirrors tile-header.tsx from MB-T15 |
| Q-MBT16-6 | (a) optional methods on WorkstationBridgeShape (mirrors WB11b detachTile pattern) | Existing 29 tile-grid-app tests stay GREEN; graceful degradation in non-Electron tests |
| Q-MBT16-7 | (a) no cache for v3.0; per-tile fetch on mount | Acceptable for ≤8-tile cap; ~80B GET payload + indexed daemon SELECT |
| Q-MBT16-8 | (a) show 'medium' on no-row daemon response | Defer to daemon authoritative answer; Q-MBT13-4=c contract |

## II. R-MBT16-N dispositions

| ID | Disposition | Action |
|---|---|---|
| R-MBT16-1 | ACCEPT | 4-tile fetch overhead acceptable for v3.0 (≤8-tile cap); v3.1 cache follow-up if performance concern surfaces |
| R-MBT16-2 | ACCEPT | Daemon's INSERT OR REPLACE handles concurrent writes; last-write-wins acceptable for v3.0 single-user |
| R-MBT16-3 | mitigated | Q-MBT16-2=a graceful-degrade (disabled state when bridge missing); test fixtures stub minimal interface |
| R-MBT16-4 | HONOR | Existing `tile-picker-slot-{name}` wrapper testid + `data-slot="picker"` attribute preserved; picker mounts INSIDE wrapper |
| R-MBT16-5 | DEFER | Shim duplication tracked via existing MB-F-T11-T13-RESOLVER-CALL-SITE-REWRITE; ~10 LoC duplication acceptable for ship-minimum |
| R-MBT16-6 | RESOLVED | NO frozen-zone touches — schema fixed (sess-mbt13), daemon fixed, contracts not touched |
| R-MBT16-7 | HONOR | NEW sentinel block `=== BEGIN: MB-T16 approval-policy IPC ===` adjacent to MB-T12 sentinel zones per R-MBT12-6 discipline |
| R-MBT16-8 | ACCEPT | Q-MBT16-3 silent-rollback + tooltip is operator-acceptable for v3.0; v3.1 could add explicit "refresh tile" affordance |

## III. Phase 2 ladder (5 WBs, single session)

Per operator brief 2026-05-07 + Phase 1 diagnose §VI:

1. **WB1 (red)** — scaffold approval-policy-ipc.ts + tile-approval-picker.tsx
   stubs + this decisions doc + test files (probe-00 per dir).
   Commit: `red(MB-T16): WB1 — scaffold approval-policy-ipc + tile-approval-picker + decisions doc`.
2. **WB2 (green)** — approval-policy-ipc.ts pure-fn HTTP helpers
   (fetchSessionApprovalPolicy, putSessionApprovalPolicy) +
   ApprovalPolicyIpcController + registerHandlers + preload.mts
   extension (getSessionApprovalPolicy, putSessionApprovalPolicy on
   workstationBridge) + unit tests.
   Commit: `green(MB-T16): WB2 — approval-policy-ipc + preload + unit tests`.
3. **WB3 (green)** — tile-approval-picker.tsx full implementation
   (native `<select>`, useEffect fetch on mount, optimistic UI on
   change, disabled state on bridge-missing or fetch-error per
   Q-MBT16-2=a + Q-MBT16-3=a) + render tests + onChange tests +
   error-state tests.
   Commit: `green(MB-T16): WB3 — tile-approval-picker + render tests`.
4. **WB4 (green)** — Tile.tsx renderPickerSlot prop + TileGrid
   plumb-through + TileGridApp wires (extends WorkstationBridgeShape +
   constructs renderPickerSlot closure) + main.ts integration
   sentinel block + integration tests + close
   `MB-F-T13-TILE-HEADER-PICKER-INTEGRATION` row in FOLLOWUPS.md.
   Commit: `green(MB-T16): WB4 — slot integration + main.ts wire + closes MB-F-T13-TILE-HEADER-PICKER-INTEGRATION`.
5. **WB5 (docs)** — findings doc + followups.
   Commit: `docs(MB-T16): WB5 — findings doc + followups`.

## IV. Discipline (per CLAUDE.md + MB-T12/MB-T15 ladder lessons)

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
  - Add new `.tsx` files to tsconfig exclude
- MB-T15 WB1-WB5 lessons applied:
  - Type extraction pattern when non-JSX modules need .tsx-defined types
  - Dual-attribute backward-compat for testid/attribute migrations
  - Read-before-Write tracking can lose state across turns
    (`MB-F-WRITE-TOOL-READ-TRACKING-CROSS-TURN`)

## V. References

- Phase 1 diagnose: `docs/coordination/mb-t16-diagnose-2026-05-07.md`
- Source-of-truth followup: `MB-F-T13-TILE-HEADER-PICKER-INTEGRATION`
  in `docs/FOLLOWUPS.md:160`
- Operator brief 2026-05-07: "next ticket: MB-T16 picker" + "go with
  option a" + "proceed with tentative dispositions, begin Phase 2 WB1"
- MB-T12 architecture-flow: `docs/coordination/mb-t12-architecture-flow.md`
- MB-T15 findings (immediate ladder precedent):
  `docs/coordination/mb-t15-findings-2026-05-07.md`
- Existing surfaces:
  - schema: `packages/dispatch-core/src/v3/schema.ts:992-1059`
  - daemon route: `packages/dispatch-daemon/src/routes/v3/sessions/approval-policy.ts`
  - workstation existing: `packages/dispatch-workstation/src/main/approval-policy-resolver-shim.ts`
  - IPC pattern templates: `packages/dispatch-workstation/src/main/audit-modal-ipc.ts`,
    `packages/dispatch-workstation/src/main/session-kill-ipc.ts`
  - tile-grid integration target: `packages/dispatch-workstation/src/tile-grid/tile.tsx:150`
    (existing slot wrapper)
- Frozen-zone refs: `CLAUDE.md` §2.10 + `packages/dispatch-core/src/v3/schema.ts`
