# MB-T12 WB13 — Runtime-Launch Verification + Final Ship Gate

**Date:** 2026-05-07
**HEAD at verification:** `827cc1f` (post-WB12 push)
**Ladder position:** 13/14 — final gate before WB14 (findings + followups + push to main)
**HALT 1 status:** PRE-AUTHORED — operator review of this verification matrix gates WB14 + push.

This doc captures the WB13 verification matrix per the Phase 2 brief:
> Per MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE (sess-mbt09 lesson):
> full runtime relaunch with WINDOW_READY sentinel observation. Manual
> test sequence in commit body. Pre-commit: pnpm --filter dispatch-core
> build. 5-package typecheck (one per command, no chains). Full sess-mbt11
> + sess-mbt13 collateral test suites still green.

---

## I. Runtime-launch smoke (KNOWN — exit 0)

Built workstation full pipeline + launched headless with `MB_TEST_HOOKS=1`:

```sh
pnpm --filter dispatch-workstation build      # 8 sub-builds GREEN
MB_TEST_HOOKS=1 packages/dispatch-workstation/node_modules/.bin/electron \
  packages/dispatch-workstation/dist/main/main.js \
  > /tmp/launch-mbt12-wb13.log 2>&1 &
# kill after sentinels observed
```

**Sentinels observed in `/tmp/launch-mbt12-wb13.log`:**
```
WINDOW_STATE 1024 768
SPLITTER_LOADED 395
SHELL_READY
RENDER_OK
WINDOW_READY
TILE_GRID_MOUNTED
ONBOARDING_READY
BOOTSTRAP_TOKEN_WRITTEN 44
```

**Verification:**
- ✅ `WINDOW_READY` — main window did-finish-load (Electron lifecycle)
- ✅ `SHELL_READY` — workstation-shell.html initSplitter completed
- ✅ `TILE_GRID_MOUNTED` — **NEW WB12 sentinel**; confirms
  `DetachTileIpcController` constructed + `registerHandlers(ipcMain)`
  called + main-process IPC plumbing complete
- ✅ `ONBOARDING_READY` — onboarding decision flow completed
- ✅ `BOOTSTRAP_TOKEN_WRITTEN 44` — Fix-92 daemon-token bootstrap clean
- ✅ NO `ERR_MODULE_NOT_FOUND` (defends against
  MB-F-DISPATCH-CORE-DUAL-IMPORT-PATTERN-DRIFT recurrence)
- ✅ NO `Uncaught` exceptions, NO `Error:` lines

Electron exited cleanly via `SIGTERM` from `pkill` after sentinels caught.

## II. 5-package typecheck (KNOWN — all clean exit 0)

Run individually per WB13 directive (one per command, no chains):

| Package | Result |
|---|---|
| dispatch-core | clean |
| dispatch-daemon | clean |
| dispatch-workstation | clean |
| dispatch-cli | clean |
| dispatch-web | clean |

Pre-commit: `pnpm --filter dispatch-core build` ran (KNOWN — clean)
per MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE; ensures the
dist/.d.ts files reflect any cumulative ladder schema-additive merges
(none in this ladder, but the discipline is followed regardless).

## III. Collateral test suites — full sweep (sequential per WB11a discovery)

| Suite | Files | Tests | Pass | Fail | Notes |
|---|---|---|---|---|---|
| sess-mbt11 (autopilot + orchestrator-action + session-kill) | 20 | 107 | 107 | 0 | KNOWN clean |
| sess-mbt13 (approval-policy-resolver + audit-modal-ipc) | 8 | 44 | 44 | 0 | KNOWN clean |
| coarch-t04 + coarchitect-context-tier4 + coarchitect-ipc | 12 | 58 | 57 | 1 | 1 pre-existing line-485 fail (same as WB2 baseline) |
| MB-T12 ladder (10 dirs, see §IV) | 32 | 290 | 290 | 0 | KNOWN clean (incl. WB12 wiring-mounts migration) |

**Total: ~72 test files, 499/500 tests; 1 failure is the known pre-existing
deterministic flake at coarchitect-ipc:485** (filed in WB2 commit body
as MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL,
to-be-filed at WB14, Tier 2). Out-of-scope for MB-T12.

## IV. MB-T12 cumulative test surface (WB1-WB12, 290 tests)

```
test/unit/tile-layout-grid-fit/         45 tests (WB2 + WB7)
test/unit/tile-grid-state/              30 tests (WB3 + WB7)
test/unit/console-panel-multi-mount/     7 tests (WB4)
test/unit/console-t03/                  38 tests (WB4 migration)
test/unit/tile-grid-tile/               54 tests (WB5 + WB8 + WB10 + WB11a)
test/unit/tile-grid-grid/               34 tests (WB6 + WB7 + WB8)
test/unit/tile-grid-app/                29 tests (WB9 + WB10 + WB11a)
test/unit/console-ipc-multi-target/      8 tests (WB11a)
test/unit/console-panel-mount-url-session/  8 tests (WB11a)
test/unit/detach-tile-ipc/              13 tests (WB11b)
test/unit/wiring-mounts/                24 tests (incl. 8 WB12-migrated)
                                        ───
TOTAL                                  290 tests, 100% green
```

## V. Pre-existing failure set (UNCHANGED since WB2 baseline)

The 6-test pre-existing failure set first surfaced in WB2 commit body
remains stable across the ladder — none in WB1-WB12 import graph:

| Test | Class | Notes |
|---|---|---|
| `fix-83-verification/probe-04-spawn-result-ok-live-daemon` | daemon-gated integration | requires live daemon |
| `fix-84-verification/probe-06-defect-b-card-emission-manual` | MANUAL | operator-only |
| `fix-89-menu-rebuild/probe-01-menu-rebuild-propagates` | Electron menu API | flake-prone non-electron |
| `mb-t05-kanban-card/probe-01-spawn-card-renders` | webview/DOM | flake-prone non-electron |
| `mb-t04/spawn-modal-emits-intent` | DOM IPC | flake-prone non-electron |
| `coarchitect-ipc/test_register_ipc_handlers:485` | deterministic | logic bug or stale mock |

**Verification:** WB2 commit body's three-evidence convergence holds
(set drift between identical-state runs, WB2 import graph excludes all 6,
coarchitect-ipc:485 reproduces in isolation against pre-WB2 state).
None re-diagnosed per operator directive 2026-05-07.

## VI. Manual operator test sequence (recipe for ship-gate UI verification)

This sequence is the hands-on UI validation that the runtime smoke does
not cover (no display + no operator-driven clicks in headless mode). Run
when the operator wants to confirm the full UX before push to main:

```sh
# 1. Build + launch.
pnpm --filter dispatch-workstation build
packages/dispatch-workstation/node_modules/.bin/electron \
  packages/dispatch-workstation/dist/main/main.js

# 2. Workstation window opens. Observe:
#    - Kanban region (top) shows dispatch-web kanban, no console area visible
#      below it (TileGridApp returns null at sessions.length===0).
#    - Chat region (bottom) shows orchestrator chat panel at default 280px.
#    - Splitter (6px ns-resize) between them.

# 3. Click "+ Spawn Session" in the header bar 4 times. After each:
#    - Choose a repo path + session name.
#    - Observe: a new tile mounts in the tile-grid region.
#    - Spawn 1 → 1×1 layout (full region).
#    - Spawn 2 → 1×2 layout (side by side).
#    - Spawn 3 → 2×2 layout (last tile spans bottom row: t0 t1 / t2 t2).
#    - Spawn 4 → 2×2 layout (even fit: t0 t1 / t2 t3).

# 4. With 4 tiles in 2×2 grid, drag the central vertical resize handle
#    50px to the right.
#    - Observe: left column tiles widen, right column tiles narrow.
#    - Drag-end persists (when WB12 follow-up wires the persistence
#      callback in MB-F-T12-RENDERER-PERSISTENCE-WIRING).
#    - For now (WB12 ship): in-memory only — closing+reopening the
#      workstation resets the layout.

# 5. Click the kill button on tile-c (third tile).
#    - Observe: tile-c disappears.
#    - Layout reflows from 2×2 (4 tiles) to 2×2 (3 tiles) with last
#      tile spanning: t0 t1 / t2 t2.

# 6. Optional: drag tile-a's header onto tile-d's header.
#    - Observe: tile-a and tile-d swap positions.

# 7. Optional: click the collapse button on tile-b.
#    - Observe: tile-b collapses to a 40px header strip.
#    - Click anywhere on the collapsed tile to expand again.

# 8. Optional: click the detach button on tile-a.
#    - Observe: a separate BrowserWindow opens loading
#      console-panel.html?session=<a's name>.
#    - The main-grid tile-a shows "detached — close window to reattach".
#    - Console events for tile-a route to the detached window only.
#    - Close the detached window → main-grid tile-a re-mounts the
#      ConsolePanel.

# 9. Close the workstation. SIGTERM clean.
```

**Acceptance for HALT 1:**
- Steps 1-5 are the ship-minimum verification (matches the brief's
  "spawn 4 sessions, verify 2×2 grid, drag border, kill 1 session,
  verify reflow to 1+2 layout").
- Steps 6-8 are exploratory — exercise WB8 / WB10 / WB11 paths.
- Step 9 confirms clean shutdown.

## VII. HALT 1 readiness checklist

- ✅ Runtime smoke: TILE_GRID_MOUNTED + WINDOW_READY observed clean
- ✅ 5-package typecheck: all clean
- ✅ Collateral test suites: sess-mbt11 + sess-mbt13 + coarch-t04
  green (excepting pre-existing line-485 failure, expected per WB2)
- ✅ MB-T12 cumulative ladder: 290 tests across 11 directories, 100% green
- ✅ Pre-existing failure set: stable (no new regressions)
- ✅ dispatch-core rebuild discipline followed
- ✅ Manual test sequence documented for operator UI verification

**Operator decision points:**
1. Manual test sequence (§VI) — run before authorizing push to main?
2. WB14 followups list — confirm the anticipated set, file remaining?
3. Push to main — HALT 2 gate after WB14 commits.

## VIII. Anticipated WB14 followups

5 followups expected to file at WB14:

1. **MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL** (Tier 2) —
   real bug or stale mock; needs triage outside MB-T12. Surfaced in WB2.
2. **MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE** (Tier 3) —
   needs proper test-tier separation (vitest projects or
   `MB_TEST_INTEGRATION=1` gating). Surfaced in WB2.
3. **MB-F-T12-BUNDLE-SHARED-CHUNK-DEDUP** (Tier 2) —
   tile-grid + console-panel + audit-modal each bundle React; total
   workstation bundle weight is ~4.5MB. Tree-shake / shared-chunk
   optimization. Filed at WB1 inline comment.
4. **MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION** (Tier 2) —
   placeholder slot in WB5; MB-T17 successor populates. Filed at WB5.
5. **MB-F-T12-RENDERER-PERSISTENCE-WIRING** (Tier 2) —
   TileGridApp's `onPersistSessions` / `onPersistGridOverride`
   callback props are renderer-stub at WB12; WB12 ships in-memory only.
   Add ipcRenderer.invoke channels for tile-grid-state read/write.
   Filed at WB12 mount.ts comment.

Plus 2 deferred-from-spec (Tier 3):
6. **MB-F-T12-TAB-STRIP-OVERFLOW** — deferred per Q-MBT12-10=a
7. **MB-F-T12-DETACH-BACK-INTO-MAIN** — scoped-out per spec line 219

Plus 1 detected during WB10:
8. **MB-F-T12-COLLAPSE-ROW-COMPRESS** (Tier 3) — row-template-rows
   compression when ALL tiles in a row are collapsed. v3.0 ships
   per-tile collapse only.

WB14 commits FOLLOWUPS.md with these 8 entries + a findings doc.

## IX. References

- /tmp/launch-mbt12-wb13.log (runtime sentinel evidence)
- docs/coordination/mb-t12-decisions-2026-05-07.md (Q+R dispositions)
- /tmp/mb-t12-diagnose.md (Phase 1 surface inventory, ephemeral)
- Phase 2 brief WB13 (operator 2026-05-07)
- WB1-WB12 commits: 5803ce5 38a37be 5a81390 492b85c 4f8e36b 4023b86
  53f5620 4272eab 43adea5 18eed7d e91c52f 59becfa 827cc1f
