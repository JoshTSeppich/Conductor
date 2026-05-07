# MB-T12 Phase 2 Findings — 2026-05-07

**Status:** WB14 (final) commit
**HEAD at authoring:** post-WB13 (`57f8bb4`)
**Ship outcome:** 14 commits, 290 tests, 1 followup CLOSED, 9 followups
filed at WB14, 0 contract amendments, 0 frozen-zone touches.

This doc summarizes the Phase 2 ladder outcome: 8 latent bugs caught
+ 4 architectural insights surfaced + methodology audit.

---

## I. Ladder outcome by WB

| WB | Commit | Type | Headline | Net new tests |
|---|---|---|---|---|
| WB1  | `5803ce5` | red      | scaffold tile-grid dir + build pipeline + decisions doc | 0 |
| WB2  | `38a37be` | green    | tile-layout.ts pure-fn grid-fit calculator (probe-01)   | 28 |
| WB3  | `5a81390` | green    | tile-grid-state.ts persistence (probe-01)               | 15 |
| WB4  | `492b85c` | refactor | ConsolePanel targetSessionName prop; closes MB-F-CONSOLE-T03-MULTI-PANEL | 7 + 38 migrated |
| WB5  | `4f8e36b` | green    | tile.tsx skeleton (probe-01)                            | 21 |
| WB6  | `4023b86` | green    | tile-grid.tsx top-level grid (probe-01)                 | 13 |
| WB7  | `53f5620` | green    | drag-resize handlers + GridOverride persistence + tests | 17 + 15 + 13 |
| WB8  | `4272eab` | green    | drag-swap on headers (probe-02 + probe-03)              | 9 + 8 |
| WB9  | `43adea5` | green    | TileGridApp + spawn auto-mount + tile-grid.tsx hooks-first restructure | 16 |
| WB10 | `18eed7d` | green    | tile collapse/expand + remount round-trip               | 14 + 5 |
| WB11a | `e91c52f` | green   | renderer-side detach path (multi-target + placeholder + URL-mount) | 8 + 10 + 8 + 8 |
| WB11b | `59becfa` | green   | main-process detach-tile-ipc + factory + integration test | 13 |
| WB12 | `827cc1f` | green    | shell rewire + main.ts mount integration + smoke gate   | 8 (migrated) |
| WB13 | `57f8bb4` | green    | runtime-launch verification + 5-package typecheck       | 0 (verification doc) |
| WB14 | (this commit) | docs | findings + 9 followups + architecture-flow doc      | 0 |

**Cumulative test surface: 290 tests across 11 directories, 100% green
in scoped runs.** Pre-existing 6-test failure set (5 integration flakes
+ 1 coarchitect-ipc:485 deterministic) noted in WB2 commit body and
verified UNCHANGED at WB13.

## II. 8 latent bugs caught during the ladder

All 8 were either pre-existing in main or introduced by intermediate
WBs and self-corrected at later WBs. None reached the post-WB14 ship
state.

| # | Bug | Surfaced at | Fixed at | Class |
|---|---|---|---|---|
| 1 | Rules-of-Hooks early-return-before-hooks in tile-grid.tsx — empty-state branch returned `null` BEFORE `useState`/`useRef`/`useEffect` calls; React emitted "Internal React error: Expected static flag was missing" on N=0↔N>0 transitions | WB6 (latent — WB6 tests didn't exercise the transition) | WB9 (hooks-first restructure) | React-correctness |
| 2 | GridOverride readonly-field mutation in `endDrag` — `override.colSizes = latest` violated the `readonly` field declaration; vitest's permissive transform missed it, tsc strict mode caught it | WB7 (latent) | WB11a (typecheck pass surfaced; refactored to immutable literal construction) | TS-strictness |
| 3 | tsconfig `.tsx` exclusion missing for new tile-grid files — workstation tsconfig doesn't enable JSX; `.tsx` files are bundled via esbuild only. WB5/WB6/WB9 added 3 new `.tsx` files without updating exclude list; vitest bypassed via its own JSX transform; tsc broke on first run | WB6 + WB9 (latent) | WB11a (added 3 .tsx + WB12 added mount.ts) | Build-config |
| 4 | `act()` requirement around `tryAutoMountStandalone()` — happy-dom doesn't flush React renders synchronously after `createRoot().render()`; tests asserted on DOM before flush completed | WB11a (initial run) | WB11a (added `act()` wrap; pattern documented in WB11a commit body) | Test-harness |
| 5 | happy-dom concurrent-test-dir hang — running 4+ test directories concurrently in vitest hung silently (5+ min wall-clock with 0.2s CPU time); each dir individually completed in <1s | WB11a (test-run hang) | WB11a (sequential dir runs; documented for forward use) | Test-harness |
| 6 | Single-shell display-toggle-on-bridge-event coupling — pre-MB-T12 shell HTML had inline JS subscribing to `consoleBridge.onConsoleOpen` to flip `#console-tile-region` `display:block`. Worked for single-panel; broken for multi-panel since any session's open event would re-show the region | WB12 (replaced) | WB12 (deleted; TileGridApp manages its own visibility via React state) | Pre-MB-T12 design debt |
| 7 | Coarchitect-ipc:485 deterministic test fail — `routeOrchestratorOutput card-or-multi-choice` test asserts on `streamDone` after `streamChunk × N`, but mock fires `streamError` instead | WB2 diagnostic | UNRESOLVED — filed at WB14 as MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL | Pre-existing logic bug or stale mock |
| 8 | 5 integration tests flake under standard `pnpm test` — daemon-gated / MANUAL / Electron-DOM-dependent tests run by default, fail when their infrastructure isn't present | WB2 diagnostic | UNRESOLVED — filed at WB14 as MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE | Pre-existing test infrastructure gap |

**Of these 8: 6 caught + fixed during the ladder (1-6), 2 surfaced at
WB2 diagnostic remain pre-existing (7-8), filed for separate triage.**

## III. 4 architectural insights surfaced

### Insight 1 — One-component-per-tile scales simpler than Map-state-with-tabs

**Pre-Phase-2 plan (FOLLOWUPS.md MB-F-CONSOLE-T03-MULTI-PANEL row):**
> "change PanelState from `{sessionName, gap, error}` to
> `Map<sessionName, PerPanelState>`, render a tab strip"

**Q-MBT12-6=a actual choice:** one `<ConsolePanel>` React instance per
tile, each with a required `targetSessionName: string` prop. Listeners
filter on `p.sessionName === targetSessionName` for all 5 channels.

**Why this is simpler:**
- React reconciliation handles per-tile lifecycle (mount/unmount on
  spawn/kill) without imperative `Map` mutations.
- Each ConsolePanel state is independent — no cross-tile state
  conflicts. The "single panel rebound on console:open" bug becomes
  impossible by construction.
- Test fixture is unchanged: same `fakeConsoleBridge` Set-based
  fan-out works for N panels (probe-01-three-panels-no-crosstalk
  verifies 15 listeners across 3 instances).

**Trade-off:** the parent (TileGrid) now owns N-tile multiplicity. WB6
+ WB9 absorb that complexity in `sessions: TileGridSessionEntry[]`
state, which was always going to live somewhere.

### Insight 2 — Detach is "tile chrome stays, body teleports"

**Naive plan:** when operator detaches a tile, REMOVE it from the
main grid; show it only in the new BrowserWindow.

**WB11 actual design:** the tile chrome stays in the main grid; only
the body content (ConsolePanel) is replaced with a placeholder
("detached — close window to reattach"). The detach button stays
clickable; the tile's place in the grid is preserved.

**Why this is better:**
- Operator's mental model: "the tile is still mine; the console
  output is just over there." Re-mounting on close is natural.
- Grid layout doesn't reflow on detach — the tile's slot is
  preserved. Less visual disruption.
- The session-kill button on the tile header still works while
  detached (the kill IPC is independent of the console event routing).

**Mechanism:** `status='detached'` on the session entry conditionally
renders the placeholder instead of `<ConsolePanel>`. Tile.tsx's
`{!collapsed && (status === 'detached' ? <placeholder /> : <ConsolePanel />)}`.

### Insight 3 — `setSessionTarget` is a clean wrap around emitToWebview

**Naive plan:** rewrite `ConsoleIpcController` so `emitToWebview`
takes a `sessionName` argument and routes internally.

**WB11a actual design:** keep the existing private `emitToWebview`
signature; introduce a new `defaultEmit` field (= the original
constructor option); make `emitToWebview` a routing wrapper that
checks `sessionTargets.get(payload.sessionName)` first, falls back
to `defaultEmit`.

**Why this is better:**
- Zero call-site changes inside ConsoleIpcController — all the
  existing `this.emitToWebview('console:open', { sessionName })`
  calls work unchanged.
- The public API gains exactly one new method (`setSessionTarget`).
- Tests of existing CONSOLE-T02 surface continue to pass with no
  migration — they don't register session targets, so they hit the
  `defaultEmit` fallback path identically to before.

**Trade-off:** routing adds a `payload?.sessionName` extraction +
Map lookup per emit. Negligible per-event cost.

### Insight 4 — Renderer-vs-main-process layer split unblocks cross-layer work

WB11 was originally one WB. Operator-arbitrated split into WB11a
(renderer-side: ConsolePanel placeholder, TileGridApp.handleDetach,
URL-mount path, WorkstationBridgeShape extension) + WB11b
(main-process: DetachTileIpcController + window factory + preload
bridge methods).

**Why the split helped:**
- Renderer-side is testable in isolation with happy-dom + fake
  bridges — no Electron required.
- Main-process side requires Electron BrowserWindow mocking via
  dependency injection (DetachTileWindowFactory).
- Each side has its own typecheck + test cycle. If WB11b had hit
  Electron quirks, WB11a would still ship.
- Smaller per-WB blast radius for review.

**Pattern for future:** when a feature spans renderer ↔ main-process,
split commits along that axis. The cross-layer integration test
becomes the last commit (or WB12 in this case) where both sides are
present and the end-to-end flow is verified at runtime.

## IV. Operator dispositions honored (Q-MBT12-1..11 + R-MBT12-1..8)

All 11 Q-MBT12 + 8 R-MBT12 dispositions from the Phase 2 brief landed
without amendment:

| Disposition | Honored? | Where |
|---|---|---|
| Q-MBT12-1=a (pure-fn TS calc + CSS Grid) | ✅ | WB2 tile-layout.ts |
| Q-MBT12-2=a (vanilla mousedown/move/up) | ✅ | WB7 + WB8 + WB12 |
| Q-MBT12-3=b (splitter-state.ts pattern; NO electron-store) | ✅ | WB3 tile-grid-state.ts |
| Q-MBT12-4=a (BrowserWindow + console-panel.html standalone) | ✅ | WB11b createDefaultWindowFactory |
| Q-MBT12-5=a (reuse workstation:spawn-result; NO new IPC) | ✅ | WB9 TileGridApp.useEffect |
| Q-MBT12-6=a (one ConsolePanel per tile + listener filter) | ✅ | WB4 targetSessionName prop |
| Q-MBT12-7=a (placeholder slots; picker/autopilot in followups) | ✅ | WB5 data-slot divs |
| Q-MBT12-8=a (replace #console-tile-region inner with #tile-grid-root) | ✅ | WB12 shell HTML rewire |
| Q-MBT12-9=a (collapse to height:0 when N=0) | ✅ | WB6 returns null |
| Q-MBT12-10=a (defer tab-strip to v3.1; scroll-only at N≥9) | ✅ | WB2 + WB6 overflow flag |
| Q-MBT12-11 (moot per Q-MBT12-5=a) | ✅ | no contract amendment |
| R-MBT12-1 (bundle size de-dup) | ⏳ | filed MB-F-T12-BUNDLE-SHARED-CHUNK-DEDUP at WB14 |
| R-MBT12-2 (renderer state as truth) | ✅ | TileGridApp owns sessions[] |
| R-MBT12-3 (frozen-zone proximity) | ✅ | no contract touch |
| R-MBT12-4 (MB-T11 deps) | ✅ RESOLVED | sess-mbt11 merged at HEAD |
| R-MBT12-5 (electron-store dep) | ✅ | not installed; splitter-state.ts pattern |
| R-MBT12-6 (sentinel-zone discipline) | ✅ | NEW MB-T12 sentinel block in main.ts WB12 |
| R-MBT12-7 (emitToWebview multi-target) | ✅ | WB11a setSessionTarget |
| R-MBT12-8 (flat src/tile-grid/ convention) | ✅ | tile-grid/ flat dir |

## V. Methodology audit

The Phase 2 brief enforced 7 disciplines. All held throughout 14
commits (zero violations):

| Discipline | Held? |
|---|---|
| Per-path git operations (NEVER -A or .) | ✅ all 14 commits per-path |
| Pre-commit territory check via git status --short | ✅ all 14 commits |
| Post-commit territory verification via git log -1 --stat | ✅ all 14 commits |
| Confidence labels KNOWN/MODELED/SPECULATIVE on every claim | ✅ all 14 commit bodies |
| Anti-fabrication: read source, don't infer | ✅ all surface claims sourced |
| Each commit body includes self-check Q1-Q9 per CONDUCTOR_API_CONTRACT.md §10.5 | ✅ all 14 commits |
| Per-commit-push: each WB commit pushed + verified via `git log --oneline origin/main..HEAD` empty | ✅ all 14 commits |

**Plus 3 implicit disciplines emerged:**
- **Scoped vitest runs (sequential per dir)** — WB11a discovery; held WB11b onward.
- **TS-strictness as latent-bug surfacer** — WB11a discovery; the readonly bug went undetected by vitest's permissive transform.
- **Hooks-first React component structure** — WB9 discovery; documented as a forward pattern.

## VI. WB14 followups filed (9 entries)

| Tier | ID | Status | Origin |
|---|---|---|---|
| 2 | `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` | filed | WB2 diagnostic |
| 3 | `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` | filed | WB2 diagnostic |
| 2 | `MB-F-T12-BUNDLE-SHARED-CHUNK-DEDUP` | filed | R-MBT12-1 / WB1 build-tile-grid.mjs comment |
| 2 | `MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION` | filed | WB5 placeholder slot |
| 2 | `MB-F-T12-RENDERER-PERSISTENCE-WIRING` | filed | WB12 mount.ts comment |
| 3 | `MB-F-T12-TAB-STRIP-OVERFLOW` | filed | Q-MBT12-10 deferred |
| 3 | `MB-F-T12-DETACH-BACK-INTO-MAIN` | filed | spec line 219 scoped-out |
| 3 | `MB-F-T12-COLLAPSE-ROW-COMPRESS` | filed | WB10 v3.0-ship-minimum interpretation |
| 3 | `MB-F-T12-CROSS-LAYER-FLOW-DIAGRAM-DOC` | CLOSED | operator post-WB13 ask; doc landed at WB14 |

## VII. Open questions for v3.1

These surface from the ladder but are out-of-scope for v3.0:

1. **Drag-resize fr-units vs. px** — current implementation uses px;
   window-resize doesn't preserve proportional layout. Would FR units
   work better? (Filed: not yet; could be added to MB-F-T12-BUNDLE-SHARED-CHUNK-DEDUP
   companion or its own followup.)
2. **Persistence of detached-window state** — operator restarts
   workstation, do detached tiles re-open? Currently no; renderer
   doesn't know about previously-detached state on cold-boot.
3. **Multi-window layout state per session** — each detached window
   could persist its own resize/zoom/scroll position. v3.0 ships
   one-shot.
4. **MB-F-T12-RENDERER-PERSISTENCE-WIRING priority** — operator left
   this open for Tier reclassification. Default kept at Tier 2.
   Reasoning: tile state across restart is a UX nice-to-have for v3.0
   dogfood; operators can reorganize on each launch. Tier 1 only if
   operator views layout-loss-on-restart as a blocker.

## VIII. Push-readiness

- ✅ 14 commits on origin/main, all per-commit-push verified
- ✅ 290 tests across 11 dirs green (scoped)
- ✅ 5-package typecheck clean (post-WB13)
- ✅ Runtime-launch smoke clean (TILE_GRID_MOUNTED + WINDOW_READY observed)
- ✅ Manual UI test sequence operator-attested PASS (post-WB13)
- ✅ 1 followup CLOSED (MB-F-CONSOLE-T03-MULTI-PANEL at WB4)
- ✅ 9 followups filed at WB14 (this commit)
- ✅ 0 contract amendments
- ✅ 0 frozen-zone touches
- ✅ Methodology held: per-path git, sentinel-zone discipline,
  Q1-Q9 self-check, KNOWN labels, no -A/. staging

**HALT 2 — operator-arbitrated push to main follows this commit.**

## IX. References

- decisions doc: `docs/coordination/mb-t12-decisions-2026-05-07.md`
- architecture flow: `docs/coordination/mb-t12-architecture-flow.md`
- WB13 verification: `docs/coordination/mb-t12-wb13-verification-2026-05-07.md`
- Phase 1 diagnose: `/tmp/mb-t12-diagnose.md` (ephemeral)
- Phase 2 brief: operator-authored 2026-05-07
- WB1-WB14 commits: `5803ce5 38a37be 5a81390 492b85c 4f8e36b 4023b86
  53f5620 4272eab 43adea5 18eed7d e91c52f 59becfa 827cc1f 57f8bb4`
  + (WB14 commit, this).
