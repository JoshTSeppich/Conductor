# MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP — Impl-coord

Implementation-coordination notes: file-by-file edit summary, sentinel-zone discipline, ordering constraints, and parallel-cairn coordination. Companion to findings + decisions docs.

---

## §I — File-by-file edit summary

### §I.1 — `packages/dispatch-workstation/src/main/preload.mts`

**Change scope**: single 1-method addition inside `workstationBridge.exposeInMainWorld` block.

**Sentinel zone**: NEW `=== BEGIN: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP getDaemonToken === ... === END: ===`. Per CLAUDE.md §3.3, new logic in a NEW sentinel block (not extension of existing zones).

**Inserted after**: `MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH dispatch-trigger bridge` zone (the prior last addition inside workstationBridge per file inspection at HALT 0).

**Behavior**: `getDaemonToken: () => ipcRenderer.invoke('workstation:get-daemon-token')` — single-line bridge wrapping the pre-existing IPC handler at `main.ts:466`.

**Authority**: Manifest EXPANSION-1 at `735703f` (preload.mts moved from READ-ONLY to TERRITORY for 1-method addition per OPT-β ack).

---

### §I.2 — `packages/dispatch-workstation/src/tile-grid/mount.ts`

**Change scope**: 
1. New type-only import: `import type { StatusListClient } from '../main/session-status-source.js';`
2. `TileGridMountOptions` extended with `readonly statusListClient?: StatusListClient | null;` test-seam.
3. `Window` interface JSDoc updated to mention WB1 getDaemonToken.
4. NEW sentinel zone with `buildRendererStatusListClient` function.
5. `tryAutoMountTileGrid` refactored to sync-render + async-re-render pattern.

**Sentinel zone**: NEW `=== BEGIN: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP statusListClient === ... === END: ===`. Per CLAUDE.md §3.3, new logic in a NEW sentinel block.

**Inserted before**: `tryAutoMountTileGrid` exported function (so the helper builder is in scope at the function call site).

**Function refactor preservation**: `tryAutoMountTileGrid` signature unchanged. The new internal `render(...)` helper is a closure over `reactRoot`/`workstationBridge`/`consoleBridge`/`createTerminal`; called once synchronously (no client) and optionally once asynchronously (with client). Test injection via `opts.statusListClient` (explicit `null` = no client; concrete client = inject).

**Authority**: Manifest WRITE (this is the canonical wiring point per closure scope).

---

### §I.3 — Probe files (NEW)

**`packages/dispatch-workstation/test/unit/tile-grid/probe-mbtphase5pw-01-prod-wiring.spec.ts`**:
- 4 text-pattern assertions on mount.ts source.
- Mirrors dispatch §47-49 prescription.

**`packages/dispatch-workstation/test/unit/tile-grid/probe-mbtphase5pw-03-statusclient-pass-through.spec.ts`**:
- 3 text-pattern assertions on preload.mts source.
- Mirrors CONSOLE-T02 / MB-T22 / §C.1′ preload bridge assertion convention.

**Authority**: Manifest WRITE (probe paths enumerated in territorial manifest).

---

### §I.4 — Doc files (NEW)

- `docs/build-docs/CONDUCTOR_MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP_BUILD.md`
- `docs/coordination/mb-t-phase-5-tile-header-prod-wiring-followup-findings-2026-05-16.md` (this file's sibling)
- `docs/coordination/mb-t-phase-5-tile-header-prod-wiring-followup-decisions-2026-05-16.md`
- `docs/coordination/mb-t-phase-5-tile-header-prod-wiring-followup-impl-coord-2026-05-16.md` (this file)

**Authority**: Manifest WRITE (doc paths enumerated in territorial manifest).

---

## §II — Files NOT touched (boundary verification)

| Path | Reason | Verification |
|---|---|---|
| `packages/dispatch-workstation/src/main/main.ts` | READ-ONLY per manifest. Fix-92 IPC handler at line 466 reused unchanged. | `git diff main.ts` empty across all 4 cairn commits. |
| `packages/dispatch-workstation/src/tile-grid/{tile-grid-app.tsx,tile-grid.tsx,tile-header.tsx,types.ts,status-indicator.tsx,frame-shell-header.ts}` | FORBIDDEN per manifest (sibling tile-grid/* writes). | `git diff` confirms only mount.ts touched in src/tile-grid/. |
| `docs/build-docs/CONDUCTOR_API_CONTRACT.md` | Frozen contract per CLAUDE.md §1. | No edit; route consumed read-only per §4.2. |
| `docs/build-docs/WORKSTATION_CONTRACT.md` | Frozen contract per CLAUDE.md §1. No IPC channel added — Fix-92 reuse. | No edit. |
| `packages/dispatch-core/src/v3/schema.ts` | Frozen contract per CLAUDE.md §1. | No edit. |
| `docs/FOLLOWUPS.md` | Operator-stamp envelope per dispatch §66 (gen-6 files). | No edit; RESOLVED stamp body proposed at findings §VI. |
| `docs/coordination/orchestrator-state-current.md`, `docs/coordination/dispatch-queue-current.md`, `docs/coordination/ORCHESTRATOR_STATE_CONTRACT.md` | Frozen (orchestrator-state-current.md) or orchestrator-managed. | No edit. |
| `CLAUDE.md` | Operator-authored per §1. | No edit. |
| `packages/dispatch-core/**`, `packages/dispatch-daemon/**`, `packages/dispatch-cli/**`, `packages/dispatch-web/**` | FORBIDDEN per manifest. | No edit. |
| `packages/dispatch-workstation/src/main/preload.mts` (outside the new sentinel zone) | EXPANSION-1 WRITE scope only for the new method. | Diff confirms 1 new sentinel zone; no edits to existing zones. |
| `packages/dispatch-workstation/src/main/card-bridge-preload.mts` | Out of manifest WRITE territory. | No edit; existing Fix-92 Webview bootstrap continues independently. |
| `packages/dispatch-workstation/scripts/build-tile-grid.mjs` | READ-ONLY per manifest. | No edit; renderer bundle config unchanged. |
| `packages/dispatch-workstation/package.json`, `tsconfig.json` | READ-ONLY per manifest. | No edit. |

---

## §III — Sentinel-zone discipline

Two NEW sentinel zones authored:

1. `=== BEGIN: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP getDaemonToken ===` in preload.mts (inside workstationBridge contextBridge block, after MB-T-WIREFRAME-T5-BUILD-MD dispatch-trigger zone).
2. `=== BEGIN: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP statusListClient ===` in mount.ts (before `tryAutoMountTileGrid` export).

Per CLAUDE.md §3.3 sentinel discipline. ALL new logic lives inside these zones. tryAutoMountTileGrid function-body changes are OUTSIDE the sentinel zone but live in mount.ts which is in manifest TERRITORY — the sentinel-zone discipline applies primarily to main.ts (the §3.3 anchored file); mount.ts function-body edits within manifest TERRITORY are unrestricted. The new sentinel zones bound the *new helper function* and the *new method addition*, providing future grep-discovery anchors.

**Justification for tryAutoMountTileGrid function-body edits outside the sentinel zone**: The function signature is preserved; the internal `render(...)` closure + sync-then-async pattern are scoped to the function's existing responsibility (mount React tree); the new behavior is wholly within the function's contract. No external API surface change.

---

## §IV — Ordering constraints

**Per-WB ordering** (mandatory):
1. RED probe authored + committed + pushed.
2. GREEN implementation + probe flip verified + 5-pkg typecheck CLEAN + (WB2 only) renderer build CLEAN.
3. GREEN committed + pushed.

**Inter-WB ordering**:
- WB1 GREEN MUST precede WB2 (mount.ts depends on the preload bridge shipped at WB1).
- WB2 GREEN MUST precede WB-final smoke verification (the runtime evidence is for the final wiring).

**Inter-package typecheck ordering** (per CLAUDE.md §4.4):
- One command at a time; no `&&` chains.
- Order: dispatch-core → dispatch-daemon → dispatch-workstation → dispatch-cli → dispatch-web.
- Run at WB1 GREEN + WB2 GREEN.

**WB-final smoke ordering** (per CLAUDE.md §4.6):
- After WB2 GREEN renderer build.
- Before WB-final docs (smoke evidence feeds the findings doc §III.5).

---

## §V — Parallel-cairn coordination

### §V.1 — Sibling sessions during this ladder

Verified path-disjoint at HALT 0 + each pre-commit:

| Session | Territory | Commit at start | Last observed commit |
|---|---|---|---|
| `r12-t1c-w1-t08-onboarding-renderer-mount` | `src/onboarding/**` | STALE — resolved at `d6b4107` | (closed) |
| `r12-archive-writer` | `docs/cairn-under-stress-round-12.md` only | `f328e92` | (idle during ladder) |
| `r12-t1c-w1-postpull-discipline` | `packages/dispatch-core/**` | (started during my WB1) | `23f7c88` (green; landed during my WB1 RED→GREEN gap) |
| `r12-t1c-w1-pcacc` (or equivalent) | `packages/dispatch-cli/test/cairn-atomic-commit/**`, `docs/build-docs/CONDUCTOR_MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW_BUILD.md`, sibling coord docs | (started during my WB2 RED pre-commit) | (in-flight at my WB-final) |

### §V.2 — Cross-session contamination events

**Event 1 (WB2 RED pre-commit, `e0e4c60`)**: 4 sibling-session-staged files appeared in shared index:
- `docs/build-docs/CONDUCTOR_MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW_BUILD.md` (A)
- `docs/coordination/mb-f-parallel-cairn-atomic-commit-{decisions,findings,impl-coord}-2026-05-16.md` (A × 3)

Recovery: `git reset HEAD` → per-path `git add packages/dispatch-workstation/test/unit/tile-grid/probe-mbtphase5pw-01-prod-wiring.spec.ts` → per-path `git commit -o <pathspec>`. Post-commit `git log -1 --stat` confirmed ONLY my probe file landed in `e0e4c60` (1 file changed, 76 insertions(+)).

**Event 2 (WB1 GREEN pre-commit, `2a93e00`)**: Transient race window — 2 sibling-session-staged files (dispatch-core package.json + new test file) observed momentarily. Cleared by sibling's commit `23f7c88` before my commit fired. Verified `git diff --cached` empty pre-commit; my per-path `git commit -o packages/dispatch-workstation/src/main/preload.mts` restricted to my path regardless.

**Methodology lesson**: parallel-cairn shared-working-tree contexts continue to exhibit transient staging-leak windows. The 4-step pre-commit sequence (add → status → reset if leak observed → commit -o) per memory `feedback_per_path_discipline_catches_cross_session_staging_leak.md` is load-bearing.

### §V.3 — Sibling-session deliverables that may interact post-merge

- `r12-t1c-w1-postpull-discipline` `23f7c88`: postinstall hook added to `dispatch-core/package.json`. Per CLAUDE.md §3.4 post-pull-rebuild discipline — this is likely the closure for `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE`. May change `dispatch-core/dist` rebuild semantics post-pull. No interaction with my ticket scope (I don't touch dispatch-core).
- `r12-t1c-w1-pcacc` (in-flight): authoring `MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW` ticket body + probes. My ladder is a live data point for that ticket; cross-link both directions documented in my decisions doc §9.

---

## §VI — Cross-link to ticket body

This impl-coord doc is referenced from:
- `docs/build-docs/CONDUCTOR_MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP_BUILD.md` §3 (file scope) + §10 (methodology observations).
- `docs/coordination/mb-t-phase-5-tile-header-prod-wiring-followup-findings-2026-05-16.md` header + §VII Q1-Q9 + §IX cross-session.
- `docs/coordination/mb-t-phase-5-tile-header-prod-wiring-followup-decisions-2026-05-16.md` §9 cross-session coordination.

---

## §VII — Cross-link to ladder commits

| Commit | Subject |
|---|---|
| `735703f` | docs(dispatch-queue-current): manifest EXPANSION-1 |
| `00ea555` | red(MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP): WB1 — preload bridge pass-through probe |
| `2a93e00` | green(MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP): WB1 — preload.mts getDaemonToken bridge |
| `e0e4c60` | red(MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP): WB2 — mount.ts prod-wiring probe |
| `6d106dc` | green(MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP): WB2 — mount.ts renderer-safe StatusListClient + statusListClient prop pass |
| (this commit) | docs(MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP): WB-final |

---

**End impl-coord doc.**
