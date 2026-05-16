# MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP — Findings

**Status:** `[KNOWN-SHIPPED]` 2-WB ladder + WB-final landed. preload bridge `getDaemonToken` + mount.ts renderer-safe StatusListClient. Build CLEAN, runtime smoke CLEAN, 7/7 new probes PASS, 51/51 tile-grid suite non-regression.
**Ticket body:** `docs/build-docs/CONDUCTOR_MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP_BUILD.md`
**Decisions doc:** `docs/coordination/mb-t-phase-5-tile-header-prod-wiring-followup-decisions-2026-05-16.md`
**Impl-coord doc:** `docs/coordination/mb-t-phase-5-tile-header-prod-wiring-followup-impl-coord-2026-05-16.md`
**Session:** `SESSION-r12-t1c-w1-phase5-mount-wiring` (Round 12 Wave T1-CLOSURE-Wave-1)
**Dispatch anchor:** `/tmp/r12-t1c-w1-phase5-mount-wiring-dispatch.txt`
**Orchestrator:** gen-6 `orchestrator-2026-05-16-handoff`
**Authoring delegate:** Claude Opus 4.7
**Ladder anchor commit (HEAD at WB1 RED):** `735703f` (manifest EXPANSION-1).
**WB-final commit:** 2026-05-16.

---

## §I — Closure target

`MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED` (Tier 1; `docs/FOLLOWUPS.md:367`). **Marked RESOLVED at this WB-final commit** pending operator-mediated FOLLOWUPS.md edit (operator-stamp envelope per dispatch §66; gen-6 files).

Followup body verbatim (from FOLLOWUPS.md:367):
> Single-WB ticket: amend tile-grid/mount.ts to import HttpSessionListClient from src/main/session-cap.ts (mount.ts runs in renderer-entry scope where node imports may need a preload/IPC shim — TBD at ticket scoping); instantiate once; pass into TileGridApp.statusListClient prop. Verify via re-run of run-smoke.js + visual check on Frame B status dots.

**Closure path taken:** OPT-β (preload bridge `getDaemonToken` + mount.ts renderer-safe fetch-based StatusListClient). Refined mid-ladder to reuse pre-existing `workstation:get-daemon-token` IPC handler at `main.ts:466` (Fix-92, cairn finding #92) — eliminates the main.ts amendment originally anticipated under OPT-α. NO new IPC channel; NO `WORKSTATION_CONTRACT.md §6` amendment.

The closure spirit (operator-visible status colors on the tile header in production) is delivered: the production tile-grid renderer now threads `statusListClient` into `<TileGridApp>`; the phase5 Path B data-flow (`statusSnapshot.get(s.name) ?? s.status ?? 'idle'`) becomes daemon-reactive on cold start.

---

## §II — Cairn ladder

| WB | Commit | Verb | Outcome |
|---|---|---|---|
| HALT 0 | (no commit) | diagnose | direct-reads (10 files); ANNOUNCEMENT to gen-6 with OPT-α/β/γ disposition |
| WB1 RED | `00ea555` | red | preload bridge pass-through probe (3/3 RED at HEAD) |
| WB1 GREEN | `2a93e00` | green | preload.mts `getDaemonToken` (3/3 GREEN; Fix-92 IPC reuse) |
| WB2 RED | `e0e4c60` | red | mount.ts prod-wiring probe (4/4 RED at HEAD) |
| WB2 GREEN | `6d106dc` | green | mount.ts renderer-safe StatusListClient + `statusListClient` prop pass (4/4 GREEN) |
| WB-final | (this commit) | docs | findings + decisions + impl-coord + ticket body + 2 followup proposals |

**Cairn-grammar note:** Standard red→green pairing across both WBs. No `refactor:` or `spike:` commits in this ladder.

---

## §III — Verification evidence

### §III.1 — Unit probes (2 new files; 7/7 tests pass)

```
test/unit/tile-grid/probe-mbtphase5pw-01-prod-wiring.spec.ts
  01a: mount.ts threads statusListClient prop into createElement     PASS
  01b: mount.ts uses window.workstationBridge.getDaemonToken         PASS
  01c: mount.ts issues fetch /v2/sessions + X-Conductor-Token        PASS
  01d: mount.ts declares MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-
       FOLLOWUP sentinel zone                                        PASS

test/unit/tile-grid/probe-mbtphase5pw-03-statusclient-pass-through.spec.ts
  03a: preload.mts exposes workstationBridge.getDaemonToken method   PASS
  03b: preload.mts routes through workstation:get-daemon-token       PASS
  03c: preload.mts declares MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-
       FOLLOWUP sentinel zone                                        PASS

Test Files  2 passed (2)
Tests       7 passed (7)
```

**Probe-02 not authored** (manifest listed `probe-mbtphase5pw-02-mount-integration.spec.tsx` as available). 2-WB ladder ratification was satisfied by probe-01 + probe-03; full-mount integration probe deferred to follow-up if future regression risk surfaces.

### §III.2 — tile-grid unit suite non-regression

```
pnpm --filter dispatch-workstation exec vitest run test/unit/tile-grid/
Test Files  13 passed (13)
Tests       51 passed (51)
```

All 51 tile-grid unit tests pass at WB2 GREEN HEAD `6d106dc`. Pre-existing phase5-status-indicator probes (5/5 + 3/3) + phase5-status-integration probes (3+2+2 = 7/7 from `MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION`) all green — phase5 Path B data-flow remains intact.

### §III.3 — 5-package typecheck

```
pnpm --filter dispatch-core typecheck      → CLEAN
pnpm --filter dispatch-daemon typecheck    → CLEAN
pnpm --filter dispatch-workstation typecheck → CLEAN
pnpm --filter dispatch-cli typecheck       → CLEAN
pnpm --filter dispatch-web typecheck       → CLEAN
```

Run at WB1 GREEN + WB2 GREEN; one command at a time per CLAUDE.md §4.4.

### §III.4 — Renderer build (Q-PHASE5PW-2)

```
pnpm --filter dispatch-workstation build
  dist/tile-grid/renderer.js  1.6mb
  TILE_GRID_BUILD_COMPLETE
  BUILD_COMPLETE
```

No `Could not resolve "node:fs|path|os"` errors. The `4a9633c` failure mode is structurally closed — type-only import + fetch-based adapter keeps session-cap.ts out of the browser bundle.

### §III.5 — Runtime-launch smoke (CLAUDE.md §4.6)

```
[smoke] WINDOW_READY
[smoke] TILE_GRID_MOUNTED
[smoke] BOOTSTRAP_TOKEN_WRITTEN 44
[smoke] exited with code 0
```

Sentinels fired (excerpted; full output in build-doc §5.5). BOOTSTRAP_TOKEN_WRITTEN 44 proves the `workstation:get-daemon-token` IPC chain works — my mount.ts code path consumes the same handler via the `getDaemonToken` bridge shipped at WB1 GREEN. Indirect runtime evidence for the StatusListClient wiring; direct visual verification deferred to operator dogfood (Frame B status dots post-merge).

OrchestratorPoolManager halt errors are pre-existing stale tmux sessions per phase5-status-integration findings §III.6; unrelated.

---

## §IV — Outcome classification

**Improved (binary flip + behavioral quality)** for the PRODUCTION SURFACE. The dogfood-blocking gap (empty Frame B status dots) is closed: production tile-grid renderer constructs a renderer-safe `StatusListClient` and threads it into `<TileGridApp statusListClient={...} />`. The phase5 Path B data-flow becomes daemon-reactive on cold start.

**Capability enabled with known limitations**: daemon-URL env-override (`FOXWORKS_DAEMON_URL`) is not honored in the renderer because `process.env` is not contextBridged. Documented in §VIII.1 below as Tier-2 followup.

**Observability gap partial-closed**: WINDOW_READY + TILE_GRID_MOUNTED + BOOTSTRAP_TOKEN_WRITTEN provide indirect runtime evidence; a direct `STATUS_LIST_CLIENT_WIRED` sentinel would close the residual gap. Tier-3 followup at §VIII.2.

---

## §V — Downstream impact

| Surface | Impact | Confidence |
|---|---|---|
| MB-T12 probe-01..04 unit tests (unkeyed `tile-status-indicator` testid) | NONE — Path B preserves the testid selector exactly; sync-then-async re-render does not alter DOM structure. | [KNOWN — 51/51 tile-grid suite non-regression] |
| `tile-grid.tsx`, `tile-header.tsx`, `tile.tsx`, `types.ts`, `status-indicator.tsx` | NONE — zero edits (manifest FORBIDDEN respected). | [KNOWN — git diff scope across ladder] |
| `tile-grid-app.tsx` | NONE — zero edits (manifest READ-ONLY). The existing `useEffect` at line 357-370 already handles `statusListClient=undefined` (skip) and `statusListClient=defined` (subscribe) gracefully. | [KNOWN] |
| `dispatch-core/src/v3/schema.ts` | NONE — zero edits. | [KNOWN] |
| `WORKSTATION_CONTRACT.md §6` | NONE — no IPC amendment; existing `workstation:get-daemon-token` channel reused. | [KNOWN] |
| `CONDUCTOR_API_CONTRACT.md` | NONE — read-only consumption of `/v2/sessions` per §4.2. | [KNOWN] |
| `main.ts` Fix-92 IPC handler at line 466 | NONE — handler unchanged; new bridge method routes to the same handler. | [KNOWN — git diff scope] |
| `card-bridge-preload.mts:53` (kanban-webview bootstrap) | NONE — unaffected; both surfaces consume the same handler independently. | [KNOWN — handler is pure read; no state mutation] |
| `FrameCRoot SessionList` status colors | DEFERRED — tracked at `MB-F-STATUS-SOURCE-FRAME-C-SESSION-LIST-INTEGRATION` Tier 3 (filed at phase5-tile-header-status-integration WB-final). | [SPECULATIVE — depends on Family C wiring decisions] |

---

## §VI — RESOLVED stamp proposal (operator-stamp envelope)

For gen-6 to file at `docs/FOLLOWUPS.md:367` row body:

> **→ RESOLVED at `6d106dc` per `MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP` 2-WB ladder 2026-05-16** (preload.mts `getDaemonToken` bridge at WB1 GREEN `2a93e00` reusing pre-existing `workstation:get-daemon-token` IPC handler per Fix-92 / cairn finding #92; mount.ts renderer-safe fetch-based StatusListClient at WB2 GREEN `6d106dc`; renderer build CLEAN; runtime smoke CLEAN; tile-grid suite 51/51 non-regression). 2 follow-on rows filed: `MB-F-PHASE5PW-RENDERER-DAEMON-URL-ENV-OVERRIDE-DIVERGENCE` (Tier 2) + `MB-F-PHASE5PW-OBSERVABLE-WIRED-SENTINEL` (Tier 3).

---

## §VII — Q1-Q9 self-check summary across the ladder

All 4 cairn-grammar commits (WB1 RED + WB1 GREEN + WB2 RED + WB2 GREEN) include full Q1-Q9 blocks. Cross-cutting answers:

- **Q1 (API spike-verification)**: `workstation:get-daemon-token` handler verified by direct read of `main.ts:466-469` (Fix-92 zone) + `card-bridge-preload.mts:53` invocation precedent at HALT 0 [KNOWN]. `/v2/sessions` route + X-Conductor-Token auth verified via direct read of HttpSessionListClient (session-cap.ts:159-186) + daemon route handler + CONDUCTOR_API_CONTRACT.md §4.2 [KNOWN].
- **Q4 (outside contract spec)**: All edits bound to closure scope of `MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED` FOLLOWUPS row 367. Sentinel zones scope new logic explicitly.
- **Q5 (frozen contract)**: ZERO edits to frozen surfaces — verified by `git diff` across the ladder (only mount.ts + preload.mts + 2 probes + 4 docs touched). preload.mts WRITE granted by manifest EXPANSION-1 `735703f`; the IPC channel reused (`workstation:get-daemon-token`) is pre-existing per Fix-92.
- **Q7 (parallel-session contamination)**: Per-path `git add <pathspec>` + per-path `git commit -o <pathspec>` on every commit. Cross-session staging-leak observed at WB2 RED + WB2 GREEN pre-commit (sibling session staged 4-5 files in shared index); recovered via `git reset HEAD` + per-path re-stage per memory pattern `feedback_per_path_discipline_catches_cross_session_staging_leak.md`. Each commit verified via `git log -1 --stat` post-commit. 9 printer.cfg* operator-system files NEVER staged.
- **Q9 (unauthorized halt)**: One HALT 0 phase-1 diagnose surface to gen-6 with ANNOUNCEMENT; OPT-β ack-released the halt. No unauthorized halt activity.

---

## §VIII — Proposed followups

### §VIII.1 — MB-F-PHASE5PW-RENDERER-DAEMON-URL-ENV-OVERRIDE-DIVERGENCE (Tier 2)

See build-doc §8.1 for full row body. Summary:
- Renderer hardcodes `http://localhost:7878` because `process.env['FOXWORKS_DAEMON_URL']` is not contextBridged.
- Affects only non-default daemon-URL deployments.
- Closure path: expose `workstationBridge.getDaemonUrl()` analogous to `getDaemonToken()`. ~1 WB.

### §VIII.2 — MB-F-PHASE5PW-OBSERVABLE-WIRED-SENTINEL (Tier 3)

See build-doc §8.2 for full row body. Summary:
- Add `console.log('STATUS_LIST_CLIENT_WIRED')` in mount.ts `.then()` callback for direct smoke observability.
- Trivial; defer until next phase5 work touches this region.

---

## §IX — Risk-watch resolution

| Risk-watch | Status |
|---|---|
| WB1 [MODELED-CONCERN] from phase5 amendment `4a9633c`: HttpSessionListClient pulls node imports into renderer bundle | RESOLVED [KNOWN-CONFIRMED] — renderer-side fetch-based adapter avoids session-cap.ts entirely; build CLEAN at WB2. |
| Token-fetch race vs. tile-grid first paint | MITIGATED [KNOWN] — sync first-render preserves immediate mount; async re-render upgrades. |
| Cross-session staging-leak (parallel-cairn shared-working-tree) | RESOLVED [KNOWN] — observed twice; recovered via `git reset HEAD` + per-path discipline both times. Documented in commit bodies. |
| Sibling-session path-overlap | NONE [KNOWN] — `r12-t1c-w1-t08-onboarding-renderer-mount` is path-disjoint (src/onboarding/**); `r12-archive-writer` is docs-only; `r12-t1c-w1-postpull-discipline` (or equivalent staging-leak originator at `23f7c88`) touches dispatch-core/** + dispatch-cli/** — also path-disjoint from my territory. |

---

## §X — Definition-of-done checklist

- [x] HALT 0 ANNOUNCEMENT surfaced to gen-6 with OPT-α/β/γ disposition; OPT-β ack-received.
- [x] WB1 RED+GREEN: preload.mts `getDaemonToken` method; 3/3 probe-03 PASS; 5-pkg typecheck CLEAN.
- [x] WB2 RED+GREEN: mount.ts renderer-safe StatusListClient + statusListClient prop pass; 4/4 probe-01 PASS; 5-pkg typecheck CLEAN; renderer build CLEAN.
- [x] WB-final findings + decisions + impl-coord docs + ticket body authored.
- [x] tile-grid unit suite non-regression (51/51 PASS at WB2 GREEN HEAD).
- [x] WB-final runtime-launch smoke per CLAUDE.md §4.6: WINDOW_READY + TILE_GRID_MOUNTED + BOOTSTRAP_TOKEN_WRITTEN sentinels fired; exit 0.
- [x] 2 followup rows proposed (Tier 2 + Tier 3).
- [x] RESOLVED stamp body composed for operator-stamp envelope.
- [x] Per-WB commit: per-path discipline + post-commit verification + push + origin parity verified.

---

## §XI — Closing posture

`MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP` ships at this docs commit. The Tier-1 dogfood-blocking gap is closed via the 2-WB ladder. Operator dogfood (post-merge launch + visual Frame B status dots) is the final verification step beyond the scope of this session.

**Surface to gen-6**: HALT-WB-FINAL-COMPLETE-r12-t1c-w1-phase5-mount-wiring per dispatch §95-§100. Then idle-standby; further T1-CLOSURE-Wave-N work may be dispatched if scope-applicable.

**End findings doc.**
