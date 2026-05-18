# CONDUCTOR MB-T-MVP-W2-AGENT-GRID — Build doc

**Ticket:** MB-T-MVP-W2-AGENT-GRID — Operator-vision Component 2 (agent-grid)
**Session:** r12-mvp-w2-agent-grid (gen-7 dispatch under operator OPTION (B) ~17:35 MDT 2026-05-17)
**Closure:** WB1 + WB2 + WB3 + WB-final (4 WB ladder); ~80 min wall-clock; ~50k token budget consumed.

## §1 — Build summary

**Operator-vision Component 2** (`docs/coordination/operator-vision-three-pane-conductor-2026-05-17.md:80-85`):

> ### Component 2 — agent-grid
> - Top-right of main area, ~40% width
> - 2x2 or 2x3 grid of live tmux mirror tiles for active sub-sessions
> - Per-tile: status dot (green=running), agent label, uptime, live tmux output stream
> - Tiles appear on session spawn, disappear on exit
> - Should handle 1-12 concurrent tiles gracefully

**Built:**
1. NEW `src/tile-grid/agent-grid-layout.ts` pure-fn module (peer of `tile-layout.ts` + `tile-hero-squad-layout.ts`) producing CSS Grid layout for N=1..12 (and graceful overflow at N>12).
2. NEW `TileGridProps.agentGridMode?: boolean` + `TileGridAppProps.agentGridMode?: boolean` props. `TileGridApp` defaults to `true` (MVP production default — `mount.ts` → `<TileGridApp>` → agent-grid layout). `TileGrid` direct mount defaults to `false` (preserves MB-T12 ladder tests).
3. CLOSED t8-sibling-exec build-doc §1.5 deferral: `spawnedAtMs` end-to-end prop-drill `TileGridSessionEntry → Tile → TileHeader`, enabling the operator-vision-Component-2-mandated uptime chrome element to render in production renders.
4. 4 NEW probes (48 tests) covering pure-fn layout spec, React-level layout activation, end-to-end chrome rendering, spawn/exit reactivity, and cross-tile live-stream isolation.

## §2 — Phase-1 diagnose (summary)

Subagent `cairn-phase-1-diagnose` invoked at session start; full output in session context. Key findings:
- **Live tmux output stream primitive EXISTS** (Phase-1 verified): `tile.tsx:258` mounts `<ConsolePanel targetSessionName={sessionName}>` per session; `console-panel.tsx:92-93` filters `onStdoutChunk` by `targetSessionName === sessionName`. Wave-2 verifies + harnesses (probe-04), does NOT rebuild.
- **Status dot + agent label + uptime chrome affordances EXIST** in tile-header.tsx but **uptime is not prop-drilled** — was the only operator-vision Component 2 element not visible in production renders (t8-sibling-exec deferred prop-drill at build-doc §1.5).
- **Spawn-reactivity EXISTS** via `tile-grid-app.tsx:256-305` `onSpawnResult` subscription (MB-T12 WB9 wiring).
- **Frozen-contract proximity:** NONE. tile-grid is renderer-internal; no dispatch-core schema touch; no WORKSTATION_CONTRACT.md §6 IPC channel.

Surface inventory + arbitration questions + risk matrix detail in `docs/coordination/mb-t-mvp-wave-2-agent-grid-decisions-2026-05-17.md`.

## §3 — WB ladder

### WB1 — agent-grid-layout.ts module
- **RED:** `fadc8b8` — `red(MB-T-MVP-W2-AGENT-GRID): WB1 — probe-01 computeAgentGridLayout spec-table N=1..12`. Probe asserts `computeAgentGridLayout` interface + spec table (1×1, 1×2, 2×2, 2×3, 3×3, 3×4 + overflow at N>12) + gridTemplateAreas + invalid-n guard + return-shape immutability. RED state: `Cannot find module ../../../src/tile-grid/agent-grid-layout.js`.
- **GREEN:** `186e401` — `green(MB-T-MVP-W2-AGENT-GRID): WB1 — agent-grid-layout.ts implementation`. NEW `src/tile-grid/agent-grid-layout.ts` (~113 LOC) implementing `computeAgentGridLayout(n)` per spec table. Interface `AgentGridLayout` matches peer `GridLayout` shape. 32 tests passed.

### WB2 — tile-grid.tsx restyle to consume agent-grid-layout
- **GREEN (combined RED+GREEN per cairn §2.3 single-commit allowance for paired test+impl):** `8742117` — `green(MB-T-MVP-W2-AGENT-GRID): WB2 — tile-grid.tsx agentGridMode prop + restyle wiring`. Updated 3 files:
  - `src/tile-grid/tile-grid.tsx`: `+computeAgentGridLayout` import, NEW prop `agentGridMode?: boolean`, branch + `data-agent-grid-mode` attr.
  - `src/tile-grid/tile-grid-app.tsx`: NEW prop `agentGridMode?: boolean` (default true MVP), pass-through.
  - `probe-mbt-mvp-w2-01-agent-grid-2x2-layout.spec.tsx`: extended with 6 React-level tests asserting `<TileGrid agentGridMode={true}>` renders 2×2/2×3/3×3/3×4 at N=4/6/9/12, + non-regression (default-omitted preserves uniform 2×4 at N=9), + hero-mode precedence.
  - Total 38 tests passed.

### WB3 — per-tile chrome verification + uptime prop-drill closure
- **RED:** `851afb3` — `red(MB-T-MVP-W2-AGENT-GRID): WB3 — probe-02 per-tile chrome`. Asserts all 3 chrome elements (status-indicator + session-name + uptime) render end-to-end. RED state: `Unable to find an element by: [data-testid=tile-header-uptime]` (uptime conditional on spawnedAtMs prop, which was not threaded past tile-grid-app.tsx side-Map).
- **GREEN:** `95103b6` — `green(MB-T-MVP-W2-AGENT-GRID): WB3 — spawnedAtMs end-to-end prop-drill`. Updated 3 files:
  - `src/tile-grid/tile-grid.tsx`: NEW field `TileGridSessionEntry.spawnedAtMs?: number` + pass-through to `<Tile>`.
  - `src/tile-grid/tile.tsx`: NEW prop `TileProps.spawnedAtMs?: number` + thread to `<TileHeader spawnedAtMs={spawnedAtMs}>`.
  - `src/tile-grid/tile-grid-app.tsx`: spawn-result handler stores `spawnedAtMs` in the new entry field (parallel to existing side-Map for legacy `onSpawnedAtMsCapture` consumers).
  - 3 tests passed. Full tile-grid-related scope (22 files, 198 tests) re-verified GREEN.

### WB-final — closure + 2 additional probes + 4 docs + verification
- **WB-final commit (this one):**
  - 2 NEW probes (`probe-mbt-mvp-w2-03-spawn-exit-reactivity.spec.tsx` 5 tests; `probe-mbt-mvp-w2-04-live-stream-per-tile.spec.tsx` 2 tests; both GREEN).
  - 4 NEW docs (this build-doc + findings + decisions + impl-coord under `docs/coordination/mb-t-mvp-wave-2-agent-grid-*-2026-05-17.md`).
  - Targeted test suite GREEN (24 files / 205 tests passing).
  - 5-pkg typecheck: 4 clean; workstation FAILS due to Wave-1 territory break (filed `MB-F-WAVE-1-FOCUS-PANE-TSCONFIG-EXCLUDE-MISSING` Tier 1 — see findings §4.1).
  - Runtime-launch smoke not required per CLAUDE.md §4.6 (Wave-2 territory excludes `src/main/**`).

## §4 — Followups filed

| ID | Tier | One-liner |
|---|---|---|
| `MB-F-WAVE-1-FOCUS-PANE-TSCONFIG-EXCLUDE-MISSING` | 1 | Wave-1 commit `a904bdb` added `src/orchestrator-focus-pane/focus-pane.tsx` without updating `packages/dispatch-workstation/tsconfig.json` exclude list; workstation typecheck fails with 4 TS17004/TS6142 errors. Wave-1 closure (or operator-arbitrated tsconfig amendment) must add the path to exclude. |
| `MB-F-AGENT-GRID-AUTO-EXIT-REACTIVITY` | 1 | Tiles disappear via kill-button only (Q-W2-4=a). Auto-disappear on daemon-side process-exit deferred — likely requires a new `session:exited` IPC channel (Wave-1 may add as part of streaming primitive). |
| `MB-F-AGENT-GRID-MOUNT-OPT-OUT-FLAG` | 3 | Optional: expose `agentGridMode={false}` opt-out through mount.ts if operator wants an A/B comparison flag at runtime. |
| `MB-F-TILE-HERO-SQUAD-DEAD-CODE-EVENTUAL-REMOVAL` | 3 | Hero-squad layout FLAG-PRESERVED post-Wave-2. If hero-mode is permanently retired, schedule deletion of `tile-hero-squad-layout.ts` + hero-squad branch + `heroSessionName` field + state-file migration. |
| `MB-F-AGENT-GRID-COMPACT-CHROME-PROFILE` | 3 (conditional) | Filed only if operator-dogfood reveals visual overcrowding at 40% width pane; Q-W2-6 (b) preserve-full-chrome may need a compact-form gate similar to `frameMode === 'A'`. |

## §5 — Acceptance criteria (from operator-vision Component 2)

- [x] "2x2 or 2x3 grid of live tmux mirror tiles for active sub-sessions" — agent-grid layout flips at TileGridApp default; 2×2 at N=4, 2×3 at N=6.
- [x] "Per-tile: status dot (green=running)" — `tile-status-indicator` testid, `data-status` attr per session status.
- [x] "Per-tile: agent label" — `tile-session-name` testid renders `session.name` verbatim (Q-W2-3=a).
- [x] "Per-tile: uptime" — `tile-header-uptime` testid; end-to-end prop-drill closed at WB3 GREEN; renders `formatUptimeLabel(spawnedAtMs, Date.now())` when spawnedAtMs threaded from spawn-result envelope.
- [x] "Per-tile: live tmux output stream" — `<ConsolePanel targetSessionName={sessionName}>` mounted per tile; cross-tile isolation asserted in probe-04.
- [x] "Tiles appear on session spawn" — `tile-grid-app.tsx:256-305` onSpawnResult subscription; probe-03 verifies.
- [x] "Tiles disappear on exit" (kill-button-driven per Q-W2-4=a) — probe-03 verifies; auto-exit reactivity deferred per filed followup.
- [x] "Should handle 1-12 concurrent tiles gracefully" — spec table explicit at N=1..12; N>12 overflow=true CSS auto-flow handles graceful degradation.

## §6 — Discipline footprint

- ✓ Per-path `git add` for every commit (CLAUDE.md §2.7).
- ✓ `git commit -o <pathspec>` for first-commit-of-NEW-file (per MEMORY.md `feedback_git_commit_pathspec_for_new_files`).
- ✓ Per-cairn-commit push (`git push origin main` after each commit; `git log origin/main..HEAD` empty after each push) (CLAUDE.md §2.6).
- ✓ Q1-Q9 self-check in every cairn-grammar commit body (CONDUCTOR_API_CONTRACT.md §10.5).
- ✓ Bidirectional territory fence (CLAUDE.md §2.9) respected — Wave-1 break surfaced via followup, not silent-fix.
- ✓ Anti-fabrication (CLAUDE.md §2.1) — every claim labeled [KNOWN]/[MODELED]/[SPECULATIVE]; tile.tsx/console-panel.tsx existing-pattern claims verified by reading actual source (lines cited).
- ✓ Phase-1-diagnose auto-acked under §3.4 mechanical-translation envelope with explicit per-Q dispositions (`docs/coordination/mb-t-mvp-wave-2-agent-grid-decisions-2026-05-17.md`).
