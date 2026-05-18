# MB-T-MVP-W2-AGENT-GRID — Findings (2026-05-17)

**Session:** r12-mvp-w2-agent-grid
**Operator authorization:** OPTION (B) AUTHORIZED ~17:35 MDT 2026-05-17 (commit c881b55 territorial-manifests; commit 23b4362 operator-vision canonical 5-component decomposition)
**Closure target:** Operator-vision Component 2 — agent-grid (`docs/coordination/operator-vision-three-pane-conductor-2026-05-17.md:80-85`)
**Cascade window:** ~17:35 MDT → ~18:55 MDT 2026-05-17 (~80 min)

## §1 — Scope delivered

| Element (operator vision Component 2) | Status | Evidence |
|---|---|---|
| 2x2/2x3 grid for active sub-sessions | ✓ DELIVERED | `src/tile-grid/agent-grid-layout.ts` NEW; `tile-grid.tsx` consumes via `agentGridMode={true}` prop |
| Per-tile status dot (green=running) | ✓ DELIVERED (pre-existing affordance verified) | `tile-header.tsx:225-230` testid `tile-status-indicator` |
| Per-tile agent label | ✓ DELIVERED (Q-W2-3=a session.name verbatim) | `tile-header.tsx:231-237` testid `tile-session-name` |
| Per-tile uptime | ✓ DELIVERED (closed t8-sibling-exec prop-drill gap) | end-to-end prop-drill TileGridSessionEntry → Tile → TileHeader; testid `tile-header-uptime` |
| Per-tile live tmux output stream | ✓ VERIFIED (pre-existing primitive) | `tile.tsx:258` mounts ConsolePanel; `console-panel.tsx:92-93` filters by `targetSessionName`; cross-tile isolation asserted in probe-04 |
| Tiles appear on session spawn | ✓ VERIFIED (pre-existing MB-T12 WB9 wiring) | `tile-grid-app.tsx:256-305` onSpawnResult subscription |
| Tiles disappear on exit | ✓ DELIVERED (kill-button verify-only per Q-W2-4=a) | `tile-grid-app.tsx:379-381` handleKill filter chain; probe-03 covers |
| Handle 1-12 concurrent tiles gracefully | ✓ DELIVERED | layout spec table N=1..12 explicit; N>12 overflow handling |

## §2 — Files modified (territory-bounded)

| Path | Δ | Commit |
|---|---|---|
| `packages/dispatch-workstation/src/tile-grid/agent-grid-layout.ts` | NEW (~113 LOC) | `186e401` WB1 GREEN |
| `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` | +33 LOC (agentGridMode prop + spawnedAtMs field + branch + data-attr) | `8742117` WB2 + `95103b6` WB3 |
| `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx` | +30 LOC (agentGridMode prop default=true + spawnedAtMs entry-populate) | `8742117` WB2 + `95103b6` WB3 |
| `packages/dispatch-workstation/src/tile-grid/tile.tsx` | +12 LOC (spawnedAtMs prop + TileHeader threading) | `95103b6` WB3 |
| `packages/dispatch-workstation/test/unit/tile-grid/probe-mbt-mvp-w2-01-agent-grid-2x2-layout.spec.tsx` | NEW (~370 LOC; 38 tests) | `fadc8b8` RED + extended `8742117` WB2 |
| `packages/dispatch-workstation/test/unit/tile-grid/probe-mbt-mvp-w2-02-tile-status-dot-uptime-agent-label.spec.tsx` | NEW (~181 LOC; 3 tests) | `851afb3` RED + `95103b6` GREEN |
| `packages/dispatch-workstation/test/unit/tile-grid/probe-mbt-mvp-w2-03-spawn-exit-reactivity.spec.tsx` | NEW (~163 LOC; 5 tests) | WB-final |
| `packages/dispatch-workstation/test/unit/tile-grid/probe-mbt-mvp-w2-04-live-stream-per-tile.spec.tsx` | NEW (~165 LOC; 2 tests) | WB-final |

Total: ~1067 NEW LOC; territory-clean (all paths in manifest TERRITORY).

## §3 — Verification results

### §3.1 Targeted test suite

```
pnpm exec vitest run test/unit/tile-grid/ test/unit/tile-grid-grid/ \
  test/unit/tile-layout-grid-fit/ test/unit/tile-hero-squad-layout/ \
  test/unit/tile-header-mb-t15/
→ Test Files  24 passed (24)
   Tests       205 passed (205)
   Duration    ~5s
```

Wave-2 NEW probes contribute 48 tests (38 + 3 + 5 + 2). Non-regression confirmed across:
- `probe-01-grid-renders-n-tiles.spec.tsx` (13 tests — MB-T12 uniform layout default)
- `probe-mbtphase4-t8sibling-02` (model chip + spawnedAtMs callback — side-Map preserved)
- `probe-mbtphase4-t8sibling-03` (TileHeader uptime direct unit — unchanged behavior)
- `probe-mbtphase5-status-*` (5 files — status integration unaffected)
- `probe-01-spec-table` (computeGridLayout + computeHeroSquadLayout pure-fn — unchanged)

### §3.2 5-package typecheck

| Package | Status |
|---|---|
| `dispatch-core` | ✓ clean |
| `dispatch-daemon` | ✓ clean |
| `dispatch-workstation` | ✗ FAILS — see §4.1 (Wave-1 territory break) |
| `dispatch-cli` | ✓ clean |
| `dispatch-web` | ✓ clean |

### §3.3 Runtime-launch smoke

PER CLAUDE.md §4.6: smoke only required when scope touches `src/main/*.ts`. Wave-2 territory excludes `src/main/**` (FORBIDDEN per manifest). Smoke not required.

## §4 — Pre-existing failures + cross-wave findings

### §4.1 [KNOWN] Wave-1 territory break — focus-pane.tsx tsconfig exclude missing

**Issue:** `pnpm --filter dispatch-workstation typecheck` fails with 4 errors in `src/orchestrator-focus-pane/focus-pane.tsx`:
```
src/orchestrator-focus-pane/focus-pane.tsx(43,5): error TS17004: Cannot use JSX unless the '--jsx' flag is provided.
src/orchestrator-focus-pane/focus-pane.tsx(44,7): error TS17004
src/orchestrator-focus-pane/focus-pane.tsx(45,7): error TS17004
src/orchestrator-focus-pane/index.ts(3,27): error TS6142
src/orchestrator-focus-pane/index.ts(4,37): error TS6142
```

**Root cause:** Workstation tsconfig.json `compilerOptions` does NOT set `"jsx"` — all .tsx renderer files are typechecked separately (esbuild/Vite/other path) and are excluded from `tsc --noEmit` via the `"exclude"` array. Wave-1 (commit `a904bdb` green WB1) created `src/orchestrator-focus-pane/focus-pane.tsx` + `index.ts` but did NOT add them to the exclude list — pattern violation vs the established convention (tile.tsx, tile-grid.tsx, etc. are excluded).

**Attribution:** Wave-1 territory (`src/orchestrator-focus-pane/**`). NOT introduced by Wave-2 work [KNOWN — verified my files (tile.tsx, tile-grid.tsx, tile-grid-app.tsx) are in tsconfig exclude list; no Wave-2 file produces typecheck errors].

**Bidirectional fence (CLAUDE.md §2.9):** Wave-2 does NOT modify Wave-1 territory to fix this. Surfaced for Wave-1's WB-final or operator-arbitration.

**Followup filed:** MB-F-WAVE-1-FOCUS-PANE-TSCONFIG-EXCLUDE-MISSING (Tier 1 — Wave-1 closure must add `src/orchestrator-focus-pane/focus-pane.tsx` + `index.ts` to workstation/tsconfig.json exclude list, or configure separate renderer tsconfig).

### §4.2 [KNOWN] Pre-existing failures per CLAUDE.md §4.5

- `MB-F-COARCHITECT-IPC-LINE-485-...` (Tier 2) — not exercised by Wave-2 scope
- `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` (Tier 3) — not exercised by Wave-2 unit scope (only test/unit/* run)

Neither re-diagnosed per CLAUDE.md §9.

## §5 — Cross-package impact

[KNOWN] Wave-2 scope is renderer-internal: `packages/dispatch-workstation/src/tile-grid/**`. No dispatch-core schema changes; no WORKSTATION_CONTRACT.md §6 IPC channels modified. Cross-package surface: zero. `cairn-cross-package-impact` subagent not invoked (single-package scope).

## §6 — Outcome classification (CLAUDE.md §2.11)

**Improved (binary flip + behavioral quality):**
- Renderer default layout flips uniform → agent-grid (operator-vision Component 2 MVP visible).
- Per-tile uptime chrome now visible end-to-end (was non-visible via t8-sibling-exec prop-drill gap; gap closed).

**No regression; wiring verified; improvement case exercised:**
- ConsolePanel per-tile live-stream isolation harnessed via probe-04 (existed; verified).
- Spawn-appear / kill-disappear reactivity harnessed via probe-03 (existed; verified).

## §7 — Followups filed (see §4.1 + impl-coord doc)

| ID | Tier | One-liner |
|---|---|---|
| `MB-F-WAVE-1-FOCUS-PANE-TSCONFIG-EXCLUDE-MISSING` | 1 | Wave-1's new `src/orchestrator-focus-pane/*.tsx` breaks workstation typecheck; needs tsconfig exclude addition. |
| `MB-F-AGENT-GRID-AUTO-EXIT-REACTIVITY` | 1 | Q-W2-4=a deferred: auto-tile-disappear on daemon-side process-exit (currently kill-button-only). |
| `MB-F-AGENT-GRID-MOUNT-OPT-OUT-FLAG` | 3 | mount.ts could pass `agentGridMode={false}` to opt back to uniform if MVP regresses (operator escape hatch). |
| `MB-F-TILE-HERO-SQUAD-DEAD-CODE-EVENTUAL-REMOVAL` | 3 | Hero-squad layout preserved as fallback; if hero-mode is permanently retired, schedule deletion. |

## §8 — STANDBY-ACK status (pending WB-final commit)

Operator OPTION (B) closure target advanced. Cascade Wave-2 ready for STANDBY-ACK on next commit.
