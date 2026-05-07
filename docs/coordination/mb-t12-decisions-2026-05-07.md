# MB-T12 Phase 2 — Operator-Arbitrated Decisions

**Date**: 2026-05-07
**HEAD at decision time**: `e87fd22` (post-MB-F-T11-T13-RESOLVER-STUB shim swap)
**Source**: `/tmp/mb-t12-diagnose.md` (Phase 1 surface inventory, 2026-05-06)
**Phase 2 brief**: operator-authored, this session
**Ticket**: §4 lines 213-221 of `docs/build-docs/CONDUCTOR_V3_RESCOPE.md`
**Spec section**: §3.3 lines 70-86 (Pane layout — tiling window manager)

This doc captures the dispositions on Q-MBT12-1..11 (arbitration questions) and
R-MBT12-1..8 (risks) raised in Phase 1, plus the 14-WB ladder for Phase 2.

---

## I. Q-MBT12-N dispositions

| ID | Disposition | One-line rationale |
|---|---|---|
| Q-MBT12-1 | (a) pure-fn TS calc + CSS Grid | No new layout libraries; bundle stays minimal |
| Q-MBT12-2 | (a) vanilla mousedown/move/up | Mirrors splitter pattern at workstation-shell.html:355 |
| Q-MBT12-3 | (b) splitter-state.ts pattern | Raw fs JSON in userData, `MB_TILE_GRID_STATE_DIR` env override; NO electron-store |
| Q-MBT12-4 | (a) new BrowserWindow loading console-panel.html | Reuses preload.cjs; emitToWebview multiplexed by sessionName→webContents |
| Q-MBT12-5 | (a) reuse `workstation:spawn-result` | NO new IPC; NO contract amendment; renderer subscribes via existing `onSpawnResult` |
| Q-MBT12-6 | (a) one ConsolePanel per tile | Add `targetSessionName` prop, listeners filter on it; smallest delta |
| Q-MBT12-7 | (a) placeholder slots only | Picker (MB-T16) and autopilot (MB-T17) wire in followups |
| Q-MBT12-8 | (a) replace `#console-tile-region` inner HTML | New `<div id="tile-grid-root">` + tile-grid bundle script; height becomes flex-grow |
| Q-MBT12-9 | (a) collapse to height:0 when N=0 | Kanban empty-state followup tracked separately as MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX |
| Q-MBT12-10 | (a) defer tab-strip to v3.1 | v3.0 ships scroll-only at N≥9; acceptance test only covers N=4 |
| Q-MBT12-11 | moot | Q-MBT12-5=a means no IPC additions, no contract amendment |

## II. R-MBT12-N dispositions

| ID | Disposition | Action |
|---|---|---|
| R-MBT12-1 | Defer hard mitigation | File MB-F-T12-BUNDLE-SHARED-CHUNK-DEDUP (Tier 2) at WB14; flag in commit body |
| R-MBT12-2 | Renderer state as source of truth | Tile-grid React state holds tile inventory; bridge `console:open|close` events are signal-only |
| R-MBT12-3 | RESOLVED | Q-MBT12-5=a means no contract amendment |
| R-MBT12-4 | RESOLVED at HEAD | sess-mbt11 merged at `69d7d29`; autopilot-loop.ts, autopilot-state-store.ts, orchestrator-action-handler.ts, session-kill-ipc.ts all PRESENT |
| R-MBT12-5 | RESOLVED by Q-MBT12-3=b | electron-store NOT installed; mirroring splitter-state.ts |
| R-MBT12-6 | HONOR | Tile-grid additions in NEW `=== BEGIN: MB-T12 tile-grid mount ===` sentinel block; do NOT touch existing sentinel zones |
| R-MBT12-7 | refactor `emitToWebview` | Multi-target keyed by sessionName→webContents; WB11 |
| R-MBT12-8 | flat `src/tile-grid/` convention | Matches existing convention (console-panel/, coarchitect/, audit-modal/, main/, onboarding/, error-display/) |

## III. WB ladder (14 WBs, single-session)

1. **WB1**: scaffold tile-grid directory + build pipeline + decisions doc (RED)
2. **WB2**: tile-layout.ts pure-fn grid-fit calculator + unit tests
3. **WB3**: tile-grid-state.ts persistence + unit tests
4. **WB4**: ConsolePanel `targetSessionName` prop + listener filter; closes MB-F-CONSOLE-T03-MULTI-PANEL
5. **WB5**: tile.tsx skeleton with header chrome + body + footer/picker/autopilot slots
6. **WB6**: tile-grid.tsx top-level grid + N-tile rendering + unit tests
7. **WB7**: tile drag-resize handlers + persistence + integration test
8. **WB8**: tile drag-swap on headers + persistence + integration test
9. **WB9**: spawn → onSpawnResult → tile-grid auto-mount + integration test
10. **WB10**: tile collapse/expand + persistence + integration test
11. **WB11**: detach-to-window + emitToWebview multi-target + integration test
12. **WB12**: workstation-shell + main.ts tile-grid mount integration + smoke test
13. **WB13**: runtime-launch verification + 5-package typecheck (HALT 1 before WB14)
14. **WB14**: findings doc + followups (HALT 2 before push to main)

## IV. HALT gates

- **HALT 0**: WB-ladder review completed; standing by ack for WB1. **Acked**.
- **Status surfaces**: every 3-4 WBs (after WB3, WB6, WB9, WB12).
- **HALT 1**: full verification matrix before WB14 (findings doc) starts.
- **HALT 2**: operator-arbitrated push to main after WB14 commit.

## V. Discipline

- Per-path git operations (NEVER `-A` or `.`)
- Pre-commit territory check via `git status --short`
- Post-commit territory verification via `git log -1 --stat`
- Confidence labels KNOWN / MODELED / SPECULATIVE on every claim
- Anti-fabrication: read source, don't infer
- Each commit body includes self-check Q1-Q9 per CONDUCTOR_API_CONTRACT.md §10.5
- All work happens directly on main (additive scaffolding, not a contract change)
- Per-commit-push: each WB commit pushed to origin immediately, verified via `git log --oneline origin/main..HEAD` returning empty

## VI. References

- Phase 1 diagnose: `/tmp/mb-t12-diagnose.md` (local-only, ephemeral)
- Spec: `docs/build-docs/CONDUCTOR_V3_RESCOPE.md` §3.3 + §4 lines 213-221
- Splitter-state.ts pattern (template for WB3): `packages/dispatch-workstation/src/main/splitter-state.ts`
- Build-console-panel.mjs (template for WB1 build script): `packages/dispatch-workstation/scripts/build-console-panel.mjs`
- Console-panel/mount.ts (template for renderer mount, deprecated by WB4): `packages/dispatch-workstation/src/console-panel/mount.ts`
- sess-mbt13 findings (tile-header territory amendment): `docs/coordination/sess-mbt13-findings-2026-05-06.md`
- Followups touched: MB-F-CONSOLE-T03-MULTI-PANEL (closed at WB4), MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE (honored at WB13), MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE (honored at WB13), MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX (separate from MB-T12 per Q-MBT12-9)
