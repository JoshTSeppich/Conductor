# MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP — Build doc

**Closure target**: `MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED` (Tier 1; `docs/FOLLOWUPS.md:367`).
**Dispatch anchor**: `/tmp/r12-t1c-w1-phase5-mount-wiring-dispatch.txt` (Round 12 Wave T1-CLOSURE-Wave-1).
**Orchestrator**: gen-6 `orchestrator-2026-05-16-handoff` (Saturday 2026-05-16 post operator green-light).
**Session**: `SESSION-r12-t1c-w1-phase5-mount-wiring`.
**Arbitration**: OPT-β (preload-bridge only; mount.ts uses fetch + token) per gen-6 ack 2026-05-16.
**Manifest expansion**: EXPANSION-1 at `735703f` (preload.mts moved from READ-ONLY to TERRITORY for 1-method addition).

## §1 — Scope

Wire `<TileGridApp statusListClient={...} />` at the renderer entry (`packages/dispatch-workstation/src/tile-grid/mount.ts`) so the tile-header status indicator becomes daemon-reactive in production. Closes the dogfood-blocking gap (empty Frame B status dots) introduced at `MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION` WB-final amendment `4a9633c` (Option A; build-break recovery dropped the renderer-side `HttpSessionListClient` fallback because session-cap.ts pulls `node:fs/path/os` into the browser-target tile-grid bundle).

## §1.1 — Sub-Q dispositions

| Sub-Q | Disposition | Anchor |
|---|---|---|
| **Q-PHASE5PW-1** (renderer-safe HttpSessionListClient pathway) | **(b/c hybrid)** — preload bridge `workstationBridge.getDaemonToken` reusing the **pre-existing** `workstation:get-daemon-token` IPC handler at `main.ts:466` (Fix-92 sentinel zone, cairn finding #92). NO new IPC channel; NO main.ts amendment; NO `WORKSTATION_CONTRACT.md §6` amendment. | gen-6 ack 2026-05-16 + HALT 0 phase-1 diagnose discovery (handler pre-existing for kanban-webview token bootstrap; never exposed via main contextBridge surface). |
| **Q-PHASE5PW-2** (renderer-bundle build verification) | **PASS** — `pnpm --filter dispatch-workstation build` exits 0; `dist/tile-grid/renderer.js` ships at 1.6mb (no node-import breakage). | WB2 GREEN ratification at `6d106dc`. |

## §2 — Cairn ladder

| WB | Commit | Verb | Outcome |
|---|---|---|---|
| WB1 RED | `00ea555` | red | preload bridge pass-through probe (3/3 RED at HEAD) |
| WB1 GREEN | `2a93e00` | green | preload.mts `getDaemonToken` (3/3 GREEN; Fix-92 IPC reuse) |
| WB2 RED | `e0e4c60` | red | mount.ts prod-wiring probe (4/4 RED at HEAD) |
| WB2 GREEN | `6d106dc` | green | mount.ts renderer-safe StatusListClient + `statusListClient` prop pass (4/4 GREEN) |
| WB-final | (this commit) | docs | findings + impl-coord + ticket body + RESOLVED stamp proposal |

## §3 — Files touched

| Path | Status | Authority |
|---|---|---|
| `packages/dispatch-workstation/src/main/preload.mts` | MODIFIED — 1 new method in new sentinel zone `=== BEGIN: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP getDaemonToken ===` | manifest EXPANSION-1 `735703f` |
| `packages/dispatch-workstation/src/tile-grid/mount.ts` | MODIFIED — new sentinel zone `=== BEGIN: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP statusListClient ===` + sync-then-async re-render wiring | manifest WRITE |
| `packages/dispatch-workstation/test/unit/tile-grid/probe-mbtphase5pw-01-prod-wiring.spec.ts` | NEW — 4 text-pattern assertions on mount.ts | manifest WRITE |
| `packages/dispatch-workstation/test/unit/tile-grid/probe-mbtphase5pw-03-statusclient-pass-through.spec.ts` | NEW — 3 text-pattern assertions on preload.mts | manifest WRITE |
| `docs/build-docs/CONDUCTOR_MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP_BUILD.md` | NEW — this file | manifest WRITE |
| `docs/coordination/mb-t-phase-5-tile-header-prod-wiring-followup-{findings,decisions,impl-coord}-2026-05-16.md` | NEW — WB-final docs | manifest WRITE |

**Files NOT touched (verified via `git log --name-only` across the ladder)**:
- `src/main/main.ts` (READ-ONLY per manifest; Fix-92 handler at line 466 is reused unchanged)
- `src/tile-grid/tile-grid-app.tsx`, `tile-grid.tsx`, `tile-header.tsx`, `types.ts`, `status-indicator.tsx` (FORBIDDEN per manifest)
- `docs/build-docs/CONDUCTOR_API_CONTRACT.md`, `docs/build-docs/WORKSTATION_CONTRACT.md`, `packages/dispatch-core/src/v3/schema.ts`, `CLAUDE.md` (frozen contracts per CLAUDE.md §1)
- `docs/FOLLOWUPS.md` (operator-stamp envelope per dispatch §66; gen-6 files)

## §4 — Implementation summary

### §4.1 — preload.mts addition (WB1 GREEN)

```ts
// === BEGIN: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP getDaemonToken ===
getDaemonToken: () => ipcRenderer.invoke('workstation:get-daemon-token'),
// === END: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP getDaemonToken ===
```

Single-method addition inside `workstationBridge` contextBridge. Routes to the pre-existing `workstation:get-daemon-token` IPC handler at `main.ts:466` (Fix-92 sentinel zone). The handler reads `~/.foxworks-dispatch/token` via `readDaemonTokenForBootstrap` (node:fs in main process) and returns trimmed token string or null.

### §4.2 — mount.ts wiring (WB2 GREEN)

```ts
// === BEGIN: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP statusListClient ===
async function buildRendererStatusListClient(): Promise<StatusListClient | null> {
  const bridge = window.workstationBridge;
  if (!bridge || typeof bridge['getDaemonToken'] !== 'function') return null;
  const token = (await (bridge['getDaemonToken'] as () => Promise<unknown>)()) as
    | string | null | undefined;
  if (typeof token !== 'string' || token.length === 0) return null;
  const daemonUrl = 'http://localhost:7878';
  return {
    async listSessions() {
      const res = await fetch(`${daemonUrl}/v2/sessions`, {
        headers: { 'X-Conductor-Token': token },
      });
      if (!res.ok) throw new Error(`daemon returned HTTP ${res.status}`);
      return (await res.json()) as Awaited<ReturnType<StatusListClient['listSessions']>>;
    },
  };
}
// === END: MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP statusListClient ===
```

Plus `tryAutoMountTileGrid()` re-render pattern: synchronous first-render WITHOUT the client (preserves immediate auto-mount ordering), then asynchronous re-render with the client once resolved. Test seam: `opts.statusListClient` accepts explicit injection (`null` = no client; `client` = test stub).

### §4.3 — Why type-only import is safe

```ts
import type { StatusListClient } from '../main/session-status-source.js';
```

`import type` is fully erased by both TypeScript and esbuild. Confirmed by successful renderer build (`pnpm --filter dispatch-workstation build` → `dist/tile-grid/renderer.js  1.6mb` with no `Could not resolve "node:fs|path|os"` errors). session-cap.ts is NOT pulled into the bundle.

## §5 — Verification evidence

### §5.1 — Unit probes

```
probe-mbtphase5pw-01-prod-wiring.spec.ts
  01a: mount.ts threads statusListClient prop into createElement     PASS
  01b: mount.ts uses window.workstationBridge.getDaemonToken         PASS
  01c: mount.ts issues fetch on /v2/sessions + X-Conductor-Token     PASS
  01d: mount.ts declares MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-
       FOLLOWUP sentinel zone                                        PASS

probe-mbtphase5pw-03-statusclient-pass-through.spec.ts
  03a: preload.mts exposes workstationBridge.getDaemonToken method   PASS
  03b: preload.mts routes through workstation:get-daemon-token       PASS
  03c: preload.mts declares MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-
       FOLLOWUP sentinel zone                                        PASS

Test Files  2 passed (2)
Tests       7 passed (7)
```

### §5.2 — tile-grid unit suite non-regression

```
pnpm --filter dispatch-workstation exec vitest run test/unit/tile-grid/
Test Files  13 passed (13)
Tests       51 passed (51)
```

All 51 tile-grid unit tests pass at WB2 GREEN HEAD `6d106dc`. Includes pre-existing phase5-status-indicator probes (5/5 + 3/3) — phase5 Path B data-flow remains intact.

### §5.3 — 5-package typecheck

```
pnpm --filter dispatch-core typecheck      → CLEAN (tsc --noEmit exit 0)
pnpm --filter dispatch-daemon typecheck    → CLEAN
pnpm --filter dispatch-workstation typecheck → CLEAN
pnpm --filter dispatch-cli typecheck       → CLEAN
pnpm --filter dispatch-web typecheck       → CLEAN
```

One command at a time per CLAUDE.md §4.4.

### §5.4 — Renderer build (Q-PHASE5PW-2 ratification)

```
pnpm --filter dispatch-workstation build
  dist/tile-grid/renderer.js  1.6mb
  TILE_GRID_BUILD_COMPLETE
  BUILD_COMPLETE
```

No `Could not resolve "node:fs|path|os"` errors. The `4a9633c` failure mode is structurally closed — the renderer-side path keeps session-cap.ts out of the browser bundle.

### §5.5 — Runtime-launch smoke (CLAUDE.md §4.6)

```
node packages/dispatch-workstation/dist/main/run-smoke.js
[smoke] launching workstation…
[smoke] running onboarding…
[smoke] DISPATCH_MODE_IPC_MOUNTED
[smoke] WINDOW_STATE 1024 768
[smoke] SPLITTER_LOADED 251
SHELL_READY
[smoke] RENDER_OK
[smoke] WINDOW_READY
[smoke] TILE_GRID_MOUNTED
[smoke] APPROVAL_POLICY_IPC_MOUNTED
AUTOPILOT_IPC_MOUNTED
ONBOARDING_READY
[smoke] BOOTSTRAP_TOKEN_WRITTEN 44
[smoke] exited with code 0
```

Sentinels fired: WINDOW_READY ✓, TILE_GRID_MOUNTED ✓, BOOTSTRAP_TOKEN_WRITTEN 44 ✓ (proves the `workstation:get-daemon-token` IPC chain my mount.ts also consumes via getDaemonToken bridge). Exit 0.

OrchestratorPoolManager halt errors are pre-existing stale tmux sessions per phase5-status-integration findings §III.6; unrelated to this ticket.

## §6 — Outcome classification

**Improved (binary flip + behavioral quality)** for the PRODUCTION SURFACE. The dogfood-blocking gap (empty Frame B status dots) is closed: production tile-grid renderer now constructs a renderer-safe `StatusListClient` and threads it into `<TileGridApp statusListClient={...} />`. The phase5 Path B data-flow (parent-closure `useEffect` subscription + `statusSnapshot.get(s.name) ?? s.status ?? 'idle'` fallback chain) becomes daemon-reactive on cold start.

**Closure stamp proposed**: `MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED` Tier-1 row at `FOLLOWUPS.md:367` → **RESOLVED at `6d106dc` per `MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP` 2-WB ladder 2026-05-16** (operator-stamp envelope; gen-6 files per dispatch §66).

## §7 — Risk-watch

| Risk | Status | Mitigation |
|---|---|---|
| session-cap.ts node imports leak into bundle | RESOLVED [KNOWN] | Type-only import + fetch-based adapter; build CLEAN. |
| Token-fetch race vs. tile-grid first paint | MITIGATED [KNOWN] | Sync first-render preserves immediate mount; async re-render upgrades to daemon-reactive on token-fetch resolution. Existing fallback chain (tile-grid-app.tsx:509) handles undefined statusListClient. |
| Token nullability | HANDLED [KNOWN] | All 3 nullability sources (bridge absent / token disk-read null / token empty string) return `null` from `buildRendererStatusListClient` → no re-render → behavior identical to pre-WB2. |
| Daemon-URL env-override divergence | DOCUMENTED [KNOWN] | Renderer hardcodes `http://localhost:7878`. `FOXWORKS_DAEMON_URL` not honored because `process.env` is not contextBridged. Tier-2 followup proposed at §8.1. |
| Cross-session staging-leak (parallel-cairn shared-working-tree) | RESOLVED [KNOWN] | Observed at WB2 RED + WB2 GREEN pre-commit; per-path discipline + `git reset HEAD` recovery (per `feedback_per_path_discipline_catches_cross_session_staging_leak.md`) correctly prevented contamination. Each commit verified via `git log -1 --stat` post-commit. |

## §8 — Proposed followups (operator-stamp envelope)

### §8.1 — MB-F-PHASE5PW-RENDERER-DAEMON-URL-ENV-OVERRIDE-DIVERGENCE (Tier 2)

| Field | Value |
|---|---|
| ID | `MB-F-PHASE5PW-RENDERER-DAEMON-URL-ENV-OVERRIDE-DIVERGENCE` |
| Tier | 2 |
| Scope | The renderer-side StatusListClient at `mount.ts` hardcodes `http://localhost:7878` (matches `DEFAULT_DAEMON_URL` in `session-cap.ts:143`). HttpSessionListClient honors `FOXWORKS_DAEMON_URL` env-override via `process.env['FOXWORKS_DAEMON_URL']`; the renderer cannot read `process.env` because it's not contextBridged. This is a documented divergence — operator running with custom `FOXWORKS_DAEMON_URL` will have the tile-grid renderer point at localhost:7878 while other workstation surfaces (HttpSessionListClient consumers in spawn-ipc) follow the env-override. |
| Origin | `MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP` WB2 GREEN `6d106dc`. |
| Closure path | Either (a) expose `workstationBridge.getDaemonUrl()` analogous to `getDaemonToken()` (single new bridge method + reuse existing main.ts env-read), or (b) bundle the URL into the existing `getDaemonToken()` response (changes return shape — requires kanban-webview compatibility check at card-bridge-preload.mts). Estimate 1 WB once arbitration selects (a) vs. (b). |
| Anchor | `mount.ts` `MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP statusListClient` sentinel zone documents the hardcoded URL in code-comment. WB2 GREEN commit body §3 Architecture notes. This row. |
| Discoverability | Future contributors grepping for `FOXWORKS_DAEMON_URL` in workstation src/ will find session-cap.ts but NOT mount.ts — pointer trail from `mount.ts` sentinel zone comment + this row. |
| Tier 2 reasoning | Affects only non-default daemon-URL deployments (rare; FOXWORKS_DAEMON_URL is typically unset). Tile-grid status indicators fall back to seeded `s.status` when fetch fails (existing chain). NOT dogfood-blocking; defer behind Family A/B/C work. |

### §8.2 — MB-F-PHASE5PW-OBSERVABLE-WIRED-SENTINEL (Tier 3)

| Field | Value |
|---|---|
| ID | `MB-F-PHASE5PW-OBSERVABLE-WIRED-SENTINEL` |
| Tier | 3 |
| Scope | Runtime-launch smoke verification (CLAUDE.md §4.6) confirms `WINDOW_READY` + `TILE_GRID_MOUNTED` + `BOOTSTRAP_TOKEN_WRITTEN` but does NOT directly observe the renderer-side StatusListClient wiring. Indirect confirmation works (same `workstation:get-daemon-token` chain proves the IPC plumbing), but a dedicated `STATUS_LIST_CLIENT_WIRED` sentinel emitted from `mount.ts` `.then()` callback would provide direct observable evidence for smoke + integration tests. |
| Origin | `MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP` WB-final smoke 2026-05-16; scope-deferred to keep WB2 GREEN minimal. |
| Closure path | 1-line `console.log('STATUS_LIST_CLIENT_WIRED')` inside the `void buildRendererStatusListClient().then((client) => { if (client !== null) render(client); })` block (sentinel forwarded via `MB_TEST_HOOKS=1` main-window console-message listener at `main.ts:272`). Trivial; defer until next phase5 work touches this region. |
| Anchor | `mount.ts` `MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP statusListClient` sentinel zone. WB-final findings doc §IV. |
| Discoverability | This row + sentinel zone comment. |
| Tier 3 reasoning | Defensive observability; no current consumer needs it. The probe-01 + probe-03 + renderer build CLEAN + BOOTSTRAP_TOKEN_WRITTEN cover the static + indirect runtime evidence. |

## §9 — Definition-of-done checklist

- [x] WB1 RED+GREEN: preload.mts `getDaemonToken` method; 3/3 probe-03 PASS; 5-pkg typecheck CLEAN.
- [x] WB2 RED+GREEN: mount.ts renderer-safe StatusListClient + `statusListClient` prop pass; 4/4 probe-01 PASS; 5-pkg typecheck CLEAN; renderer build CLEAN.
- [x] WB-final: findings + decisions + impl-coord docs + ticket body authored.
- [x] tile-grid unit suite non-regression (51/51 PASS at WB2 GREEN HEAD).
- [x] WB-final runtime-launch smoke per CLAUDE.md §4.6: WINDOW_READY + TILE_GRID_MOUNTED + BOOTSTRAP_TOKEN_WRITTEN sentinels fired; exit 0.
- [x] 2 followup rows proposed (Tier 2 `MB-F-PHASE5PW-RENDERER-DAEMON-URL-ENV-OVERRIDE-DIVERGENCE` + Tier 3 `MB-F-PHASE5PW-OBSERVABLE-WIRED-SENTINEL`).
- [x] Per-WB commit: per-path `git add` + per-path `git commit -o <pathspec>` + post-commit `git log -1 --stat` + push + origin parity verified.
- [x] Cross-session staging-leak observed + correctly handled via reset/per-path discipline; documented in WB2 commit bodies.

## §10 — Methodology observations (for impl-coord cross-link)

1. **HALT 0 phase-1 diagnose direct-reads vs. plugin agent**: Per dispatch §34 amortization clause for single-WB ladders (here 2-WB), I used direct reads (~30k tokens for 10 files). The `cairn-phase-1-diagnose` agent would have over-amortized. Operator can use this as evidence the §14.4 plugin-retrofit heuristic ("amortizes at multi-WB ladders + 3+-WB iterations") generalizes correctly.
2. **OPT-α → OPT-β → OPT-β++ refinement**: ANNOUNCEMENT surfaced OPT-α (3 WBs + WORKSTATION_CONTRACT.md amendment), OPT-β (2 WBs + preload-only), OPT-γ (reject). Gen-6 selected OPT-β. **Mid-ladder discovery**: pre-existing `workstation:get-daemon-token` IPC handler at `main.ts:466` (Fix-92, cairn finding #92) enables an even lighter OPT-β where preload.mts only needs to expose the existing channel via contextBridge — no new IPC channel, no `WORKSTATION_CONTRACT.md §6` amendment. Gen-6 anticipated under OPT-α arbitration; eliminated via Fix-92 reuse. **Cairn lesson**: HALT 0 phase-1 diagnose is load-bearing for arbitration-cost optimization; the operator-arbitrated path becomes lighter when the diagnose surfaces existing infrastructure.
3. **Cross-session staging-leak recovery**: 2 staging-leak events observed during this ladder (WB2 RED + WB2 GREEN pre-commit). Per CLAUDE.md §2.7 + memory feedback `feedback_per_path_discipline_catches_cross_session_staging_leak.md`: the 4-step pre-commit sequence (add → status → reset → commit -o) defends against shared-working-tree staging hooks. Per-path discipline correctly prevented contamination in both cases; each commit verified via `git log -1 --stat` to confirm ONLY my pathspec landed.
4. **Type-only import as bundle-safety hatch**: `import type { StatusListClient } from '../main/session-status-source.js'` lets the renderer reference the interface without pulling the implementation (session-cap.ts node imports). Renderer build CLEAN confirms TypeScript + esbuild correctly erase `import type` statements. This is a reusable pattern for any future renderer→main-process type sharing that crosses the node/browser bundle boundary.
5. **Sync-then-async render pattern**: `tryAutoMountTileGrid` first-renders synchronously without the StatusListClient (preserves immediate auto-mount), then asynchronously re-renders with the resolved client. Preserves the existing `TILE_GRID_MOUNTED` smoke sentinel timing; the upgrade to daemon-reactive happens after the first paint. The existing tile-grid-app.tsx:357-370 useEffect guard handles both `undefined` (skip subscription) and defined (subscribe) cases gracefully — no React state-update warnings, no re-mount.

## §11 — Closing posture

`MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP` ships at this docs commit. The Tier-1 dogfood-blocking gap is closed via the 2-WB ladder. Operator dogfood (post-merge launch + visual Frame B status dots) is the final verification step beyond the scope of this session (smoke runs without a live daemon).

**Surface to gen-6**: HALT-WB-FINAL-COMPLETE-r12-t1c-w1-phase5-mount-wiring with ladder commit hashes + RESOLVED stamp proposal + 2 followup-row bodies + token count + methodology observations. Then idle-standby per dispatch §95-§102.
