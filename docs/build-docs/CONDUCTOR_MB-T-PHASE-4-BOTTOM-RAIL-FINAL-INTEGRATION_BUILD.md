# MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION — chat-shell bottom-rail consumer mount-wiring consolidation (MaxParallelCounter + BypassPermsIndicator)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW (Round 12 §3.9 SPECULATIVE Wave 1 cohort; body-drafting forward-position; execution-phase Wave 2)
**Date authored:** 2026-05-13
**Authored under:** Round 12 §3.9 plugin-loaded Wave 1 dispatch (territory manifest `r12-phase4-bottom-rail-integration-body.txt`; SESSION-`r12-phase4-bottom-rail-integration-body`; body-drafting only — packages/** FORBIDDEN at this session)
**Authoring delegate:** SESSION-`r12-phase4-bottom-rail-integration-body` (Opus 4.7) under orchestrator gen-5 Round 12 cascade — prior ladders MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW (`6ce548f`) + MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW (`28b0086`/`3c54195`) COMPLETE.
**Authoring anchor commit (HEAD at authoring time):** `762eed4` (Round 12 Wave 1 plugin-loaded cohort).
**Cairn ladder anchor:** Closes `MB-F-BOTTOM-RAIL-MOUNT-WIRING-FINAL-INTEGRATION` (Tier 2, T11 BYPASS-PERMS WB7 findings §VII at `28b0086`).

**SPECULATIVE Round-12 status:** `[SPECULATIVE per Round 12 §3.9 forward-positioning]` Body-drafting session authors ticket body only; execution-phase dispatch occurs in Round 12 Wave 2 (or later). Operator explicitly accepts revision-cost. Post-Wave-1-cohort evidence may RATIFY / RESHAPE / DISCARD this ticket. Treat scope as plausible, not committed.

**Closes / advances:**
- `MB-F-BOTTOM-RAIL-MOUNT-WIRING-FINAL-INTEGRATION` (Tier 2 — T11 WB7 findings §VII at `28b0086`) — **primary closure target**. T11 §XII synthesis confirms: T8 (cost-meter `7abb649`) + T9 (plan-timer `de6620e`) shipped their mount auto-wires; T10 (max-parallel `9ec2b6a`) + T11 (bypass-perms `3c54195`) shipped component-prop seams with consumer plumbing **deferred** because `chat-shell/mount.ts` was FORBIDDEN by their Wave 4 manifests for territorial isolation. This ticket consolidates the deferred consumer wiring for MaxParallelCounter + BypassPermsIndicator.
- `MB-F-BYPASS-PERMS-CONSUMER-WIRING` (Tier 2 — T11 WB7 findings §VII at `28b0086`) — **absorbed**. T11 proposed both followups; recommended closure path was `chat-shell/mount.ts resolveRenderBypassPermsIndicator` mirroring T9 `resolveRenderPlanTimerText` (`de6620e`) precedent. This ticket absorbs that scope as a sub-arm rather than treating it separately.

**Depends on (all merged):**
- `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW` (`6ce548f`) — `MaxParallelCounter` component prop seam (`activeCount?: number` at `chat-shell/max-parallel-counter.tsx:51`). Consumer surface stable under this ticket's mount auto-wire.
- `MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW` (`3c54195` WB6; `28b0086` WB7 findings) — `BypassPermsIndicator` component prop seam (`bypassActiveCount?: number` at `chat-shell/bypass-perms-indicator.tsx:40`) + `bypass-perms-source.ts` aggregator (`93-119`) + spawn-handler integration (`spawn-handler.ts:221, 486`).
- `MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW` (`afd3778`; `de6620e` mount auto-wire) — **`resolveRenderPlanTimerText` mount-wiring precedent**. Pattern to mirror at this ticket.
- `MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW` (`155933f`; `7abb649` mount auto-wire) — `resolveRenderCostMeter` mount-wiring precedent (alternative shape — daemon-pure-fn aggregator).
- Cluster A bundle (`3e9a203`) — `SpawnSessionResult.spawnMode` + permissionMode plumbing prerequisite for `bypass-perms-source.recordSpawn` flow.

**Downstream gates:**
- Cost-meter + plan-timer **data-source ARMs** (`MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` Tier 3; `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` Tier 2) remain OPEN per their respective Tier 2/3 followup rows. **This ticket touches only consumer-mount-wiring**; data-source replacements are independent tickets per Q-BR-4 default disposition.
- Phase 3 visual-verification ratification (if re-triggered) may surface that bottom-rail indicators render differently than expected; T10/T11 sibling pattern: defer revision to Phase 3 feedback.

**Estimated WB count:** 7-9 (1 ticket-body docs + 5-7 ladder WBs + 1 findings + 1 runtime-smoke).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first to bind in-vs-out work.
2. Read §3 (Sub-Q gate arbitrations) — six operator decisions parameterize WB scope; defaults `[MODELED]` recommendations.
3. Read §4 (WB ladder) for execution order. WBs are construction-order-aware: probe-then-impl per cairn discipline.
4. §5-§8 are operational supports — cross-refs, self-check expectations, definition of done, risk register.

Confidence labels per CLAUDE.md §2.2: `[KNOWN]` observed in this session via direct source read OR Phase 1 diagnose `[KNOWN]` claims at HEAD `762eed4`; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence.

**Phase 1 diagnose provenance:** This body was authored after a `cairn-phase-1-diagnose` agent dispatch (agent ID `a5e8425ce76f9ae5b`) that produced a surface inventory of chat-shell + tile-grid + main bottom-rail mount-wiring state. All file:line citations herein are inherited from the diagnose's `[KNOWN]` claims (direct source-read evidence). Per §11(VIII) discipline, plugin-agent dispatch is enumerated in §9.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN per Phase 1 diagnose + manifest]`:

1. **MOD `packages/dispatch-workstation/src/chat-shell/mount.ts`** — add `resolveRenderMaxParallelCounter` factory (mirroring T9 `resolveRenderPlanTimerText` at `de6620e` precedent) that:
   - Subscribes to the existing workstation sessions stream (renderer-internal path per Q-BR-2 default).
   - Reads `maxParallel` from chosen source-of-truth per Q-BR-3 default (settings-file mirroring `splitter-state.ts` raw-fs pattern per CLAUDE.md §3.5).
   - Supplies `renderMaxParallelCounter` slot to ChatShell (currently destructured at `chat-shell.tsx:154,261` but never supplied → `undefined` at production runtime).

2. **MOD `packages/dispatch-workstation/src/chat-shell/mount.ts`** — add `resolveRenderBypassPerms` factory that:
   - Subscribes to `bypass-perms-source.onUpdate` via a renderer-accessible bridge (per Q-BR-1 default = (a) renderer-side, per Q-BR-6 = renderer reads count via existing preload bridge OR new `coarchitect:bypass-perms-update` extension).
   - Supplies `renderBypassPerms` slot to ChatShell (currently destructured at `chat-shell.tsx:157,248` but never supplied).

3. **MOD `packages/dispatch-workstation/src/main/main.ts`** — instantiate `createBypassPermsSource()` at app start (Q-BR-5 default = (a) singleton); thread into `defaultSpawnHandlerDeps` via `spawn-ipc.ts:248-273` factory.

4. **MOD `packages/dispatch-workstation/src/main/spawn-ipc.ts`** — populate `bypassPermsSource` field on `SpawnHandlerDeps` factory output (closes the dep-tree gap T11 WB4 left open at `spawn-handler.ts:221`).

5. **Test coverage in workstation** per matched-WB scope:
   - `test/unit/chat-shell/probe-mbtphasebrf-*.spec.tsx` for `resolveRenderXxx` factory contracts
   - `test/unit/main/probe-mbtphasebrf-*.spec.ts` for `createBypassPermsSource` instantiation + deps wiring
   - `test/integration/chat-shell/probe-mbtphasebrf-*.test.ts` for end-to-end mount-wiring smoke (chat-shell renders bottom-rail indicators with live data)

6. **Runtime-launch smoke** per CLAUDE.md §4.6 — workstation merge touches `src/main/*.ts` AND `src/chat-shell/mount.ts`; WB-final smoke verifies `WINDOW_READY` sentinel + bottom-rail indicators render mode-correctly + no `ERR_MODULE_NOT_FOUND` class bugs.

7. **Docs**: this ticket body, findings doc, coord doc, decisions doc (current session authors body+coord+decisions; execution session authors findings).

### §1.2 — What this ticket DOES NOT

`[KNOWN per Phase 1 diagnose + Q-BR-4 default disposition]`:

- Does NOT modify component-prop seams shipped by T10/T11 — `MaxParallelCounter` `activeCount?` (line 51) + `BypassPermsIndicator` `bypassActiveCount?` (line 40) consumed as-given.
- Does NOT modify `BottomRailCostMeter` or `PlanTimerText` consumer wiring — both **already** auto-wire via `mount.ts:315-335` (`resolveRenderCostMeter`) + `mount.ts:459-470` (`resolveRenderPlanTimerText`). This ticket touches their slots only if Q-BR-4 ack arbitrates "refresh in scope"; default disposition = out-of-scope.
- Does NOT modify cost-meter or plan-timer **data sources** — `coarchitect-ipc.ts:117-120` hardcoded `0` (covered by `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` Tier 3) + `createNullRateLimitSource()` plan-timer source (covered by `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` Tier 2). Out-of-scope per CLAUDE.md §2.12 (don't absorb other open followups silently).
- Does NOT modify `WORKSTATION_CONTRACT.md §6` unless Q-BR-1=(b) is operator-arbitrated. Default path Q-BR-1=(a) renderer-side avoids contract amendment.
- Does NOT modify daemon (`packages/dispatch-daemon/**`) — `aggregateActiveSessionCount` at `max-parallel-aggregator.ts:90-124` is daemon-side pure-fn; this ticket's Q-BR-2 default uses renderer-internal filter (RATIFY current `max-parallel-counter.tsx:65` inline filter via mount-supplied sessions stream).
- Does NOT modify `dispatch-core/src/v3/schema.ts` — no cross-package schema additions needed.
- Does NOT modify tile-grid bottom-rail — tile-grid is **not** a host for these four indicators per Phase 1 diagnose (only `action-bar-bypass-perms-indicator` reference at `tile-grid.tsx:61` is the per-session Frame-C indicator, distinct from chat-shell global indicator).
- Does NOT modify orchestrator system prompt (`hso-system-prompts/orchestrator.md` FORBIDDEN per CLAUDE.md §1).

---

## §2 — Arbitration anchor

### §2.1 — Round 12 Wave 1 cohort enumeration (binding)

`[KNOWN-OPERATOR-ARBITRATED per Round 12 §3.9 plugin-loaded Wave 1 dispatch]`

Per `dispatch-queue-current.md` Round 12 Wave 1 row + manifest at `docs/coordination/territorial-manifests/r12-phase4-bottom-rail-integration-body.txt`:
- TERRITORY (write): 3 doc files only — this body + coord doc + decisions doc.
- READ-ONLY: chat-shell + tile-grid + main + dispatch-daemon source + schema + Round 11 archive + BYPASS-PERMS coord + T10 decisions + FOLLOWUPS.md.
- FORBIDDEN: ALL packages/**/*.ts + packages/**/*.tsx (NO implementation; body-drafting only this session) + FOLLOWUPS.md edit + cairn-*.md + orchestrator-state + dispatch-queue + manifest dir + CLAUDE.md + frozen contracts.

Operator-supplied directive frame (per dispatch body at `/tmp/r12-dispatch-phase4-bottom-rail-integration-body.txt`):
> "Author ticket body MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION that closes MB-F-BOTTOM-RAIL-MOUNT-WIRING-FINAL-INTEGRATION (Tier 2, surfaced by phase4-t9 BYPASS-PERMS WB7 findings at 28b0086). Consolidates consumer plumbing for MaxParallelCounter (T10) + BypassPermsIndicator (T11) + possibly cost-meter + plan-timer refresh."

`[KNOWN-OPERATOR-PRE-ARBITRATED]` constraints:
- Scope = consumer-mount-wiring consolidation (T9 `de6620e` precedent: factory + slot supplier).
- Body-drafting only at this session; execution-phase comes Wave 2 (manifest expansion required to relax packages/** FORBIDDEN).
- Cost-meter + plan-timer refresh is "possibly" in scope per dispatch text — Q-BR-4 surfaces this as operator-arbitrable.

### §2.2 — Frozen-contract amendment scoping

`[KNOWN per CLAUDE.md §1]`

ZERO frozen-surface modifications under default-path Sub-Q resolutions (Q-BR-1=(a), Q-BR-2=(a), Q-BR-5=(a), Q-BR-6=(c) i.e. skip-because-Q-BR-1=(a)). Non-default Sub-Q options that would require frozen-surface touch:
- Q-BR-1=(b) IPC push channel → `WORKSTATION_CONTRACT.md §6.6` amendment (operator-arbitrated; +1 HALT cycle).
- Q-BR-2=(b) daemon-side aggregator → potentially new daemon route under `CONDUCTOR_API_CONTRACT.md` §6.6 surface (operator-arbitrated; +1-2 WBs).
- Q-BR-3=(c) BUILD.md preamble → cross-ticket dep on `MB-T28` parser + `MB-T-PHASE-4-BUILD-MD-REAL-FIXTURE-CYCLE` (Phase-3-trigger-dependent).

All non-default escalation triggers are operator-territory; default-path execution does not touch frozen surfaces.

### §2.3 — Construction order (file ownership at execution-phase)

`[MODELED — Wave 2 execution-phase prediction]`

Execution-session TERRITORY (WRITE — to be granted at Wave 2 manifest expansion):
- MOD `packages/dispatch-workstation/src/chat-shell/mount.ts` (PRIMARY territorial intersection; current Wave-4 manifests had this FORBIDDEN — Wave 2 expansion explicitly grants it).
- MOD `packages/dispatch-workstation/src/main/main.ts` (sentinel-zone-aware per CLAUDE.md §3.3 — new `=== BEGIN: MB-T-PHASE-4-BOTTOM-RAIL ===` block).
- MOD `packages/dispatch-workstation/src/main/spawn-ipc.ts` (deps factory update).
- NEW tests in `test/unit/{chat-shell,main}/probe-mbtphasebrf-*.spec.{ts,tsx}` + `test/integration/chat-shell/probe-mbtphasebrf-*.test.ts`.
- NEW docs (findings + coord-execution-phase notes).

Conditional WRITE (only if non-default Sub-Q escalation):
- MOD `packages/dispatch-workstation/src/main/preload.mts` (only if Q-BR-1=(b) new IPC channel).
- MOD `docs/build-docs/WORKSTATION_CONTRACT.md` §6.6 (only if Q-BR-1=(b); operator-arbitrated).
- MOD `packages/dispatch-workstation/src/main/coarchitect-ipc.ts` (only if Q-BR-6=(a) extend coarchitectBridge).

Path-overlap risk at execution: `mount.ts` is high-traffic territory (T8/T9 both modified it for their auto-wires); per-path commit pathspec mandatory at every WB; pre-commit `git status --short` mandatory.

---

## §3 — Sub-Q gate arbitrations

Six operator decisions parameterize WB scope. Defaults if unresolved are `[MODELED]` recommendations. Body-drafting session (this) surfaces Sub-Qs; operator-decisions land in `mb-t-phase-4-bottom-rail-final-integration-decisions-2026-05-13.md` companion doc.

### §3.1 — Sub-Q-BR-1: Consumer wiring path

Required before **WB1+WB2** (max-parallel mount auto-wire) + **WB3+WB4** (bypass-perms mount auto-wire). Default: **(a) renderer-side `resolveRenderXxx` mirroring T9 `de6620e` precedent**.

| Option | Mechanism | Frozen-surface touch | Effort |
|---|---|---|---|
| (a) Renderer-side `resolveRenderXxx` (recommended; T9 `de6620e` precedent) | `mount.ts` adds factories that subscribe to existing renderer-accessible signals (sessions stream + bypass-perms count via existing or extended preload bridge); supplies slot props to ChatShell | ZERO | LOW |
| (b) New IPC push channel | New `workstation:max-parallel-update` + `workstation:bypass-perms-update` channels; preload bridge extension; main process emits per state change | YES — `WORKSTATION_CONTRACT.md §6.6` amendment | MEDIUM |
| (c) Hybrid: max-parallel renderer-side (a) + bypass-perms IPC (b) | Mixed | YES (partial) | MEDIUM |

`[MODELED]` Recommend **(a)** — matches T9 `resolveRenderPlanTimerText` precedent (the lone shipped instance of this pattern at `de6620e`); zero frozen-surface touch; lowest WB count. (b) reserved for operator-arbitrated path requiring §6.6 amendment.

### §3.2 — Sub-Q-BR-2: MaxParallel N (active session count) data flow

Required before **WB1+WB2**. Default: **(a) Renderer-internal sessions-stream filter (RATIFY T4 Sub-Q-T4-E=(i) + T10 Sub-Q-T10-A=α defaults)**.

| Option | Source | Frozen-surface touch |
|---|---|---|
| (a) Renderer-internal (recommended) | `mount.ts` subscribes to existing workstation sessions stream (same source `chat-shell.tsx` already uses); filter `status === 'open'` per `max-parallel-counter.tsx:64-65` inline pattern; supply `activeCount` prop | ZERO |
| (b) Daemon-side aggregator | Wire `aggregateActiveSessionCount` (`packages/dispatch-daemon/src/max-parallel-aggregator.ts:90-124`) via new daemon route + workstation poll; supply `activeCount` from polled value | YES — new daemon route (`CONDUCTOR_API_CONTRACT.md` surface) |
| (c) Defer N to component-internal filter | Mount supplies `sessions` prop only; component computes N internally per current line 64-65 logic | ZERO (but loses T10 `activeCount?` seam usefulness) |

`[MODELED]` Recommend **(a)** — RATIFY current data flow; minimal change; T10 sub-Q-A=α default already prefers this; (b) adds daemon route + cross-package contract surface for no observed gain.

### §3.3 — Sub-Q-BR-3: MaxParallel M (limit) source-of-truth

Required before **WB1+WB2**. Default: **(b) Workstation settings file (`<userData>/max-parallel.json` mirroring `splitter-state.ts` raw-fs pattern per CLAUDE.md §3.5)**.

| Option | Source | Persistence | Effort |
|---|---|---|---|
| (a) Renderer const `DEFAULT_MAX_PARALLEL=16` | Hardcoded in `mount.ts` factory; matches current T4 placeholder semantics | None | LOW (1-line) |
| (b) Workstation settings file (recommended; CLAUDE.md §3.5 precedent) | `fs.readFileSync('<userData>/max-parallel.json')`; default = 16 on first-launch missing-file; mirror `splitter-state.ts:1-35` shape | Yes — across launches | LOW-MEDIUM (~35-line new module) |
| (c) BUILD.md preamble `max_parallel: N` | Parsed by `MB-T28` parser ticket (not yet shipped) | Yes — git-tracked | HIGH (cross-ticket dep) |
| (d) Daemon config | Daemon endpoint exposes max-parallel; workstation polls | Yes — daemon-controlled | MEDIUM (cross-package + §6.6) |

`[MODELED]` Recommend **(b)** — natural escalation from T4 const-16 placeholder; CLAUDE.md §3.5 canonical pattern; persists across launches; no electron-store install (CLAUDE.md §9 forbids); does NOT block on `MB-T28` (Phase-4-trigger-dependent). (a) is admissible as v1 minimum if operator prefers ship-velocity; (c) defers to Phase 4 build-md cluster.

### §3.4 — Sub-Q-BR-4: Cost-meter + plan-timer refresh in scope?

Required before **WB scope finalization**. Default: **(b) Out-of-scope; this ticket is max-parallel + bypass-perms mount-wiring only**.

| Option | Scope | WB delta |
|---|---|---|
| (a) In-scope refresh | Verify cost-meter + plan-timer mount-wiring still functions post-merge; reconcile slot ordering; touch existing `resolveRenderCostMeter` + `resolveRenderPlanTimerText` factories only if regression detected | +0-2 WBs |
| (b) Out-of-scope (recommended) | This ticket touches only max-parallel + bypass-perms slots; cost-meter + plan-timer data-source ARMs covered by `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` (Tier 3) + `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2) follow-ons | +0 WBs |
| (c) Full-rail refresh | Audit all four bottom-rail indicators end-to-end; reconcile data sources where stubbed | +3-5 WBs (absorbs Tier 2/3 followups) |

`[MODELED]` Recommend **(b)** — cost-meter + plan-timer **consumer-mount-wiring is already shipped** at `mount.ts:315-335` + `mount.ts:459-470`; their open ARMs are data-source work (separate tickets per CLAUDE.md §2.12 anti-absorption). (a) is admissible if operator wants a sanity verification step. (c) breaks anti-absorption discipline.

### §3.5 — Sub-Q-BR-5: `createBypassPermsSource()` instantiation lifetime

Required before **WB5** (main.ts aggregator instantiation). Default: **(a) `main.ts` singleton threaded through `defaultSpawnHandlerDeps`**.

| Option | Mechanism | Testability |
|---|---|---|
| (a) `main.ts` singleton (recommended) | `main.ts` constructs `createBypassPermsSource()` once at app start; threads instance into `defaultSpawnHandlerDeps` factory + makes accessible to renderer-side via preload bridge OR coarchitect-ipc emit | HIGH (DI-friendly; mock-substitutable) |
| (b) Lazy in `defaultSpawnHandlerDeps()` factory | Factory constructs source on first call | MEDIUM (factory becomes stateful) |
| (c) Module-scoped const in `bypass-perms-source.ts` | `export const bypassPermsSource = createBypassPermsSource();` at module top-level | LOW (untestable singleton; mirrors current `coarchitect-ipc.ts:94` rateLimitAggregator pattern) |

`[MODELED]` Recommend **(a)** — preserves DI testability per T11 WB2 design intent (`createBypassPermsSource` factory shape signals lifetime-owner-elsewhere); (c) is admissible if operator prefers symmetry with `rateLimitAggregator` module-scope pattern but loses test substitutability.

### §3.6 — Sub-Q-BR-6: IPC channel name+shape (only if Q-BR-1=(b))

Required ONLY IF **Sub-Q-BR-1=(b)** chosen. Default if (b) chosen: **(c) Skip — use Q-BR-1=(a) renderer-side path**.

| Option | Channel name | Bridge surface | Frozen-surface touch |
|---|---|---|---|
| (a) Extend coarchitectBridge | `coarchitect:bypass-perms-update` + `coarchitect:max-parallel-update` | `preload.mts` coarchitect bridge extension | `WORKSTATION_CONTRACT.md §6.6` amendment |
| (b) New workstation bridge | `workstation:bypass-perms-update` + `workstation:max-parallel-update` | New `workstation` bridge in `preload.mts` | `WORKSTATION_CONTRACT.md §6.6` amendment + new bridge surface |
| (c) Skip (recommended if Q-BR-1=(a)) | n/a | n/a | n/a |

`[MODELED]` Recommend **(c)** — default Q-BR-1=(a) renders this Sub-Q moot. If operator escalates to Q-BR-1=(b), then (a) is preferred (extends existing coarchitectBridge surface rather than adding a new bridge).

---

## §4 — WB ladder

7-9 WBs total (default-path estimate). WB0 (this docs) authored by body-drafting session at Round 12 Wave 1; WB1-WB-final execute at Round 12 Wave 2+ under expanded manifest. Each cairn-grammar commit follows methodology:
- Pre-commit `git status --short` MANDATORY
- Per-path `git add <single-path>`
- Per-path `git commit -m "..." -- <single-pathspec>`
- Push immediately per CLAUDE.md §2.6
- Q1-Q9 self-check in commit body

### WB0 — `docs(MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION): ticket body authoring`

**Type:** docs
**Scope:** NEW `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION_BUILD.md` (this file) + NEW `docs/coordination/coord-mb-t-phase-4-bottom-rail-final-integration-2026-05-13.md` + NEW `docs/coordination/mb-t-phase-4-bottom-rail-final-integration-decisions-2026-05-13.md`.
**Authoring session:** SESSION-`r12-phase4-bottom-rail-integration-body` (Round 12 Wave 1; CURRENT SESSION).
**Acceptance:** 3 docs committed + pushed per per-path discipline; ticket body marked SPECULATIVE per Round 12 forward-positioning.

### WB1 — `red(MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION): probe-mbtphasebrf-01-max-parallel-mount-wiring`

**Type:** red
**Scope:** NEW `packages/dispatch-workstation/test/unit/chat-shell/probe-mbtphasebrf-01-max-parallel-mount-wiring.spec.tsx`. Asserts (Sub-Q-BR-1=a + Sub-Q-BR-2=a + Sub-Q-BR-3=b defaults):
- `mount.ts` exports `resolveRenderMaxParallelCounter` factory.
- Factory accepts `{ sessions$, maxParallel }` deps; returns slot supplier compatible with ChatShell's `renderMaxParallelCounter` prop signature.
- Slot supplier passes `activeCount` derived from `sessions$.value.filter(s => s.status === 'open').length` AND `maxParallel` value to MaxParallelCounter.
- When `mount.ts` mounts ChatShell, `chat-shell.tsx:154,261` slot evaluation is defined (not `undefined`).
- Regression shield: existing `resolveRenderCostMeter` + `resolveRenderPlanTimerText` slots remain functional.

**Acceptance:** probe RED at HEAD; flips GREEN at WB2.

### WB2 — `green(MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION): mount.ts resolveRenderMaxParallelCounter`

**Type:** green
**Scope:**
- MOD `packages/dispatch-workstation/src/chat-shell/mount.ts` — add `resolveRenderMaxParallelCounter` factory (mirroring `resolveRenderPlanTimerText` at line 459-470 shape); read `maxParallel` from chosen source (per Sub-Q-BR-3; default = settings-file).
- NEW `packages/dispatch-workstation/src/chat-shell/max-parallel-source.ts` (only if Sub-Q-BR-3=(b)) — raw-fs `<userData>/max-parallel.json` reader mirroring `splitter-state.ts:1-35` shape.

**Acceptance:** WB1 probe flips RED → GREEN.

### WB3 — `red(MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION): probe-mbtphasebrf-02-bypass-perms-mount-wiring`

**Type:** red
**Scope:** NEW `packages/dispatch-workstation/test/unit/chat-shell/probe-mbtphasebrf-02-bypass-perms-mount-wiring.spec.tsx`. Asserts:
- `mount.ts` exports `resolveRenderBypassPerms` factory.
- Factory accepts `{ bypassPermsCount$ }` (or equivalent) dep; returns slot supplier compatible with ChatShell's `renderBypassPerms` prop signature.
- Slot supplier passes `bypassActiveCount` from observed source to `BypassPermsIndicator`.
- When `mount.ts` mounts ChatShell, `chat-shell.tsx:157,248` slot evaluation is defined.
- Regression shield: when bypass-perms-source is absent (test mode), slot falls back to `dispatchMode`-only render (T4 WB12 semantics preserved).

**Acceptance:** probe RED at HEAD; flips GREEN at WB4.

### WB4 — `green(MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION): mount.ts resolveRenderBypassPerms`

**Type:** green
**Scope:** MOD `packages/dispatch-workstation/src/chat-shell/mount.ts` — add `resolveRenderBypassPerms` factory. Per Q-BR-1=(a) default: factory subscribes to renderer-accessible signal sourced from main-process aggregator (mechanism: extend preload coarchitectBridge with `coarchitect:bypass-perms-update` emit on `bypass-perms-source.onUpdate`; renderer reads via existing bridge surface — minimal extension, no new bridge).

**Acceptance:** WB3 probe flips RED → GREEN.

### WB5 — `red(MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION): probe-mbtphasebrf-03-main-aggregator-instantiation`

**Type:** red
**Scope:** NEW `packages/dispatch-workstation/test/unit/main/probe-mbtphasebrf-03-main-aggregator-instantiation.spec.ts`. Asserts:
- `main.ts` imports `createBypassPermsSource` from `./bypass-perms-source.js`.
- `main.ts` instantiates the source at app start (within new sentinel zone per CLAUDE.md §3.3).
- `defaultSpawnHandlerDeps()` (per `spawn-ipc.ts:248-273` shape) returns object whose `bypassPermsSource` field equals the singleton instance.
- spawn-handler invocation with the populated deps reaches `recordSpawn` at `spawn-handler.ts:486` (end-to-end dep-wiring verification).

**Acceptance:** probe RED at HEAD; flips GREEN at WB6.

### WB6 — `green(MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION): main.ts aggregator instantiation + deps wiring`

**Type:** green
**Scope:**
- MOD `packages/dispatch-workstation/src/main/main.ts` — new sentinel zone `=== BEGIN: MB-T-PHASE-4-BOTTOM-RAIL bypass-perms-source instantiation ===` ... `=== END: MB-T-PHASE-4-BOTTOM-RAIL ===` adjacent to existing SpawnIpcController construction (line 878 area); construct `createBypassPermsSource()` singleton.
- MOD `packages/dispatch-workstation/src/main/spawn-ipc.ts` — `defaultSpawnHandlerDeps` factory accepts + returns `bypassPermsSource` field.
- (conditional per Q-BR-1=(a)) MOD `packages/dispatch-workstation/src/main/coarchitect-ipc.ts` OR new bridge wiring: source's `onUpdate` callback emits via existing IPC surface to renderer for WB4 slot supplier.

**Acceptance:** WB5 probe flips RED → GREEN. Existing spawn-handler test suite remains GREEN. T11 spawn-handler probes preserved.

### WB7 (CONDITIONAL — only if Q-BR-1=(b)) — `contract(MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION): WORKSTATION_CONTRACT §6.6 amendment`

**Type:** contract (operator-arbitrated; HALT cycle)
**Scope:** Only if Q-BR-1=(b) IPC push channel chosen. MOD `docs/build-docs/WORKSTATION_CONTRACT.md` §6.6 — add `coarchitect:bypass-perms-update` + `coarchitect:max-parallel-update` channels per CLAUDE.md §1 frozen-surface arbitration. MOD `packages/dispatch-workstation/src/main/preload.mts` to expose channels.

**Acceptance:** Operator stamp on contract amendment; WB4 + WB6 wiring adjusted to use new IPC channels.

### WB8 — `green(MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION): integration smoke + runtime-launch verification`

**Type:** green
**Scope:**
- NEW `packages/dispatch-workstation/test/integration/chat-shell/probe-mbtphasebrf-04-end-to-end-mount-wiring.test.ts` — end-to-end smoke: workstation launches, chat-shell renders, bottom-rail shows MaxParallelCounter + BypassPermsIndicator with live values when spawns occur.
- CLAUDE.md §4.6 runtime-launch smoke: `pnpm --filter dispatch-workstation exec electron dist/main/main.js` → observe `WINDOW_READY` sentinel within ~10s → verify no `ERR_MODULE_NOT_FOUND` for `bypass-perms-source.js` import path.

**Acceptance:** integration probe GREEN; runtime smoke clean.

### WB-final — `docs(MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION): WB-final — findings + coord execution-phase + operator-stamp surface`

**Type:** docs
**Scope:**
- NEW `docs/coordination/mb-t-phase-4-bottom-rail-final-integration-findings-2026-05-N.md` — full findings doc per T11 format (cairn ladder table; Sub-Q dispositions taken; architectural diagram; test evidence; race-window evidence; FOLLOWUPS surface for operator stamp; audit reclassification).
- APPEND `docs/coordination/coord-mb-t-phase-4-bottom-rail-final-integration-2026-05-13.md` — execution-phase coord notes (sibling sessions observed; race-window evidence; per-path discipline metrics).
- FOLLOWUPS surface for operator stamp (since `FOLLOWUPS.md` is FORBIDDEN at execution session unless manifest expanded):
  - `MB-F-BOTTOM-RAIL-MOUNT-WIRING-FINAL-INTEGRATION` Tier 2: CLOSED.
  - `MB-F-BYPASS-PERMS-CONSUMER-WIRING` Tier 2: CLOSED (absorbed into this ticket).
  - Audit reclassification: `wireframe-vs-shipped-audit-2026-05-09.md` rows for max-parallel + bypass-perms updated to "SHIPPED-with-consumer-mount-wiring".

**Acceptance:** docs land + commits pushed.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED by this ticket

| Followup | Tier | Closure path | Closing WB |
|---|---|---|---|
| `MB-F-BOTTOM-RAIL-MOUNT-WIRING-FINAL-INTEGRATION` | Tier 2 | Mount auto-wire shipped for max-parallel + bypass-perms; cost-meter + plan-timer already shipped at T8/T9 | WB-final |
| `MB-F-BYPASS-PERMS-CONSUMER-WIRING` | Tier 2 | Absorbed into this ticket; `resolveRenderBypassPerms` shipped at WB4 | WB-final |

### §5.2 — Followups likely to surface

`[MODELED-SPECULATIVE]`:
- `MB-F-BOTTOM-RAIL-INDICATOR-RENDER-ORDER` Tier 3 — if visual-verification reveals indicators render in different left-to-right order than wireframe-target.
- `MB-F-MAX-PARALLEL-CONFIG-FILE-PERSISTENCE-ATOMICITY` Tier 3 — if Sub-Q-BR-3=(b) settings-file path chosen; concurrent writes during launch may race (mirror `splitter-state.ts` mitigation).
- `MB-F-BYPASS-PERMS-COUNT-IPC-EMIT-CADENCE` Tier 3 — if Q-BR-1=(a) + per-event emit produces UI thrash; debounce policy may need refinement.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Relevance |
|---|---|---|
| `MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW` | `afd3778` + `de6620e` | **Primary precedent** — `resolveRenderPlanTimerText` mount-wiring shape to mirror |
| `MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW` | `155933f` + `7abb649` | `resolveRenderCostMeter` mount-wiring shape (daemon-side aggregator variant) |
| `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW` | `6ce548f` + `9ec2b6a` | `MaxParallelCounter.activeCount?` prop seam |
| `MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW` | `3c54195` + `28b0086` | `BypassPermsIndicator.bypassActiveCount?` prop seam + `bypass-perms-source.ts` aggregator + spawn-handler integration |
| `MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS` | `f8fc24d` + `4e8ec96` | Bottom-rail slot integration in chat-shell.tsx |

### §5.4 — Manifest constraint surfacing (execution-phase)

`[MODELED — Wave 2 expansion required]`:
- `chat-shell/mount.ts` must be granted WRITE at Wave 2 manifest (FORBIDDEN under T8/T9/T10/T11 Wave 4 manifests).
- `main/main.ts` + `main/spawn-ipc.ts` WRITE granted at Wave 2.
- If Q-BR-1=(b) chosen: `WORKSTATION_CONTRACT.md` WRITE granted (operator-arbitrated; contract amendment).
- `FOLLOWUPS.md` operator-stamp deferred per current cairn discipline (manifest typically excludes; operator applies in separate commit).

---

## §6 — Self-check Q1-Q9 expectations per WB

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q5 (frozen mod?) | Q7 (parallel territory?) |
|---|---|---|---|---|---|
| WB0 docs (this session) | N/A | N/A | N/A | No | per-path doc paths only |
| WB1 RED | T9 `de6620e` mount-wiring precedent | BEHAVIOR (real mount factory invocation + slot-supplier shape verification) | No — factory absent | No | new test path |
| WB2 GREEN | (see WB1) | BEHAVIOR (real mount.ts + real ChatShell slot consumption) | No — factory load-bearing | No | mount.ts MOD; high-traffic territory; per-path commit + race-window aware |
| WB3 RED | T9 precedent | BEHAVIOR (real mount factory) | No — factory absent | No | new test path |
| WB4 GREEN | (see WB3) | BEHAVIOR (real mount.ts + real bridge subscription) | No — factory load-bearing | No (Q-BR-1=(a)) / **YES** if Q-BR-1=(b) — `WORKSTATION_CONTRACT.md §6.6` amendment | mount.ts MOD; race-window aware |
| WB5 RED | T11 `bypass-perms-source` precedent | BEHAVIOR (real main.ts module load + real spawn-ipc factory) | No — wiring absent | No | new test path |
| WB6 GREEN | (see WB5) | BEHAVIOR (real instantiation + dep threading) | No — wiring load-bearing | No (sentinel zone authoring per CLAUDE.md §3.3) | main.ts + spawn-ipc.ts MOD; race-window aware |
| WB7 contract (CONDITIONAL) | N/A | N/A | N/A | **YES** — `WORKSTATION_CONTRACT.md §6.6` amendment | operator-arbitrated; HALT cycle |
| WB8 GREEN | N/A | BEHAVIOR (real Electron launch + real DOM render) | No — end-to-end load-bearing | No | integration test path; runtime smoke per CLAUDE.md §4.6 |
| WB-final docs | N/A | N/A | N/A | No | findings + coord doc paths |

---

## §7 — Definition of done

1. **WB0-WB-final cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed to origin per CLAUDE.md §2.6.
2. **`resolveRenderMaxParallelCounter` shipped** at `mount.ts`: slot supplier provides `MaxParallelCounter` with `sessions` + `maxParallel` + `activeCount` props; `chat-shell.tsx:154,261` slot evaluation defined at runtime.
3. **`resolveRenderBypassPerms` shipped** at `mount.ts`: slot supplier provides `BypassPermsIndicator` with `bypassActiveCount` derived from main-process aggregator; `chat-shell.tsx:157,248` slot evaluation defined.
4. **`createBypassPermsSource()` instantiated** at `main.ts` singleton; threaded through `defaultSpawnHandlerDeps` so `spawn-handler.ts:486` recordSpawn invocation populates the aggregator's live state.
5. **Workstation typecheck CLEAN** per CLAUDE.md §4.4 (5-package typecheck, one command at a time).
6. **Runtime-launch smoke CLEAN** per CLAUDE.md §4.6: `WINDOW_READY` sentinel observed within ~10s; no `ERR_MODULE_NOT_FOUND` for any new import paths.
7. **No regression in T10 + T11 component probes** + sibling spawn-handler probes preserved per CLAUDE.md §4.5 + memory's consumer-non-regression-per-WB discipline.
8. **Findings doc + coord doc + operator-stamp surface land** at WB-final.
9. **Per-path discipline applied at every commit**: pre-commit `git status --short` + per-path `git add` + per-path `git commit -- <pathspec>`. Race-window stress regime per Round 11/12 §3.9.

---

## §8 — Risk register

Inherited from Phase 1 diagnose R1-R7 + body-drafting amplifications:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| R1: `main.ts` + `spawn-ipc.ts` co-edit race window with sibling sessions (path-overlap with T11-precedent observed) | `[KNOWN per Round 11 Wave 4 evidence]` | `[MODELED-MEDIUM]` (race-window stress per Round 11/12 §3.9) | Sentinel-zone new wiring inside `=== BEGIN: MB-T-PHASE-4-BOTTOM-RAIL ===` block per CLAUDE.md §3.3; re-read pre-stage + per-path commit pathspec at every WB; atomic stage+commit+verify in single shell invocation per T11 precedent |
| R2: Sub-Q-BR-3 silent absorption of `MB-F-MAX-PARALLEL-CONFIG-SOURCE` Tier 3 if (b) settings-file shipped without explicit operator-ack | `[KNOWN per Phase 1 diagnose]` | `[MODELED-MEDIUM]` (CLAUDE.md §2.12 anti-absorption discipline) | Surface Sub-Q-BR-3 at decisions doc; require operator-ack before WB2 ladder execution |
| R3: Cost-meter + plan-timer data-source ARMs cross-ticket scope collision if Q-BR-4=(c) chosen | `[KNOWN per Phase 1 diagnose]` | `[MODELED-MEDIUM]` (honest framing obscured per CLAUDE.md §2.11) | Default Q-BR-4=(b) excludes data-source work; touch only consumer-wiring sanity check at most |
| R4: Pre-existing test failures (`MB-F-COARCHITECT-IPC-LINE-485` + integration flake suite per CLAUDE.md §4.5) may mask regressions | `[KNOWN per CLAUDE.md §4.5]` | `[MODELED-LOW]` (scoped WB probes mitigate; final WB13 surfaces expected pre-existing fails) | Per CLAUDE.md §4.5 do NOT re-diagnose; document expected pre-existing fails at WB-final verification surface; scope per-WB probes to new wiring directory |
| R5: Q-BR-1=(b) IPC channel path triggers `WORKSTATION_CONTRACT.md §6.6` amendment (operator-arbitrated; +1 HALT cycle) | `[KNOWN]` | `[MODELED-MEDIUM]` (operator-arbitration delay) | Default-favor Q-BR-1=(a) renderer-side per T9 `de6620e` precedent; reserve (b) for operator escalation |
| R6: `main.ts` dense sentinel-zone topology — new aggregator-instantiation wiring must NOT modify code inside existing zones | `[KNOWN per CLAUDE.md §3.3]` | `[MODELED-MEDIUM]` (discipline-gap risk) | Author new `=== BEGIN: MB-T-PHASE-4-BOTTOM-RAIL ===` zone outside existing Fix-A/B/C/89/92/Session-3/Probe-92 ranges; grep `=== ` at WB6 start to map current zones before editing |
| R7: Runtime-launch smoke mandatory per CLAUDE.md §4.6 — missing it would invite `ERR_MODULE_NOT_FOUND` class bugs invisible to typecheck + unit suites | `[KNOWN per `MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE`]` | `[MODELED-HIGH]` (merge-gate violation) | WB8 includes runtime-launch smoke as explicit definition-of-done item |
| R8: Round 12 §3.9 SPECULATIVE Wave 1 — body-drafting may be RESHAPED or DISCARDED by Wave 2 execution-phase evidence (e.g., Sub-Q dispositions diverge from defaults; Phase 3 visual feedback reshapes scope) | `[KNOWN per Round 12 §3.9 STATUS FRAMING]` | `[MODELED-MEDIUM]` (~9-WB-equivalent scope revision risk) | Operator explicitly accepts revision-cost per §3.9 dispatch; body marked SPECULATIVE; decisions doc retains all alternates for archaeology |

---

## §9 — Plugin-agent dispatch enumeration (Round 12 §11(VIII) evidence)

`[KNOWN per session log]`:

| Agent | Dispatch reason | Returned summary | Input to body |
|---|---|---|---|
| `cairn-phase-1-diagnose` (agent ID `a5e8425ce76f9ae5b`) | Map current chat-shell + tile-grid + main bottom-rail mount-wiring state; surface inventory + Sub-Qs + risks before WB ladder authoring | Surface inventory (4 components + 2 mount gaps + 2 main-process aggregators) + 6 Sub-Qs (Q-BR-1..6) + 7 risks (R1-R7) + 5-8 WB ladder shape estimate | §1 scope; §3 Sub-Q gates; §4 ladder; §8 risk register all inherit Phase 1 `[KNOWN]` claims |

No `cairn-anti-fabrication-verifier` dispatch — Phase 1 diagnose provided sufficient file:line citation density that direct re-verification was redundant at body-drafting layer. Execution-phase session SHOULD dispatch verifier before any new `[KNOWN]` claim about altered surface state.

No `cairn-cross-package-impact` dispatch — Q-BR-1=(a) default path touches zero cross-package contracts; Q-BR-2=(b) escalation OR Q-BR-1=(b) escalation would warrant verifier dispatch at execution session.

No `cairn-followup-drafter` dispatch — `FOLLOWUPS.md` is FORBIDDEN at body-drafting manifest; new followup rows surface to operator at WB-final findings doc per existing T11 precedent.

No `cairn-test-failure-triage` dispatch — N/A (no implementation; no test failures to triage at body-drafting session).

---

**End of MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION ticket body.**

Pending Sub-Q resolutions before ladder execution (defaults applicable if operator chooses auto-defaults at Wave 2 entry):
- Sub-Q-BR-1 (§3.1) — Consumer wiring path (**a renderer-side (recommended)** / b IPC channel / c hybrid)
- Sub-Q-BR-2 (§3.2) — MaxParallel N data flow (**a renderer-internal (recommended)** / b daemon-side / c component-internal-filter)
- Sub-Q-BR-3 (§3.3) — MaxParallel M source-of-truth (a const / **b settings-file (recommended)** / c BUILD.md / d daemon-config)
- Sub-Q-BR-4 (§3.4) — Cost-meter + plan-timer refresh in scope? (a in-scope / **b out-of-scope (recommended)** / c full-rail-refresh)
- Sub-Q-BR-5 (§3.5) — `createBypassPermsSource()` lifetime (**a main.ts singleton (recommended)** / b lazy factory / c module-scoped const)
- Sub-Q-BR-6 (§3.6) — IPC channel name+shape (only if Q-BR-1=b chosen; a coarchitectBridge / b new workstation bridge / **c skip (recommended; default Q-BR-1=a)**)

`[KNOWN per Round 12 §3.9 STATUS FRAMING]`: SPECULATIVE — Round 12 Wave 1 body-drafting forward-position. Execution-phase Wave 2 dispatch deferred; operator explicitly accepts revision-cost. Post-Wave-2 evidence may RATIFY / RESHAPE / DISCARD.
