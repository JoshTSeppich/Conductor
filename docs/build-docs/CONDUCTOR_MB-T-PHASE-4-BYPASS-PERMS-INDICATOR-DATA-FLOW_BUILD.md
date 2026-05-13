# MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW — bottom-rail bypass-perms-indicator real-data flow (per-spawn permission-mode aggregation + indicator source seam)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW (Cluster F per P3-rev-2 §3.2; SPECULATIVE Phase 4 forward-positioning)
**Date authored:** 2026-05-13
**Authored under:** Round 11 §3.9 SPECULATIVE Wave 4 dispatch (territory manifest `phase4-t9-bypass-perms.txt`; SESSION-`phase4-t9-exec-bypass-perms`; operator-acknowledged speculative-revision risk per §3.9 STATUS FRAMING)
**Authoring delegate:** SESSION-`phase4-t9-exec-bypass-perms` (Opus 4.7) under orchestrator gen-4 Round 11 cascade — prior ladders MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW (`afd3778`) + MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW (`6ce548f`) COMPLETE.
**Authoring anchor commit (HEAD at authoring time):** `178b994` (Wave 4 dispatch landed).
**Cairn ladder anchor:** P3-rev-2 §3.2 Cluster F (bottom-rail data flow follow-ons); sibling to T8 cost-meter (`155933f`), T9 plan-timer (`afd3778`), T10 max-parallel (`6ce548f`). Closes the last open arm of `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2 from T4 WB14 findings §IX.

**SPECULATIVE Phase-4 status:** `[SPECULATIVE per dispatch §3.9 STATUS FRAMING]` Phase 3 visual-verification not yet triggered (in-flight at `__orchestrator_active` Wave 4 row 23). Operator explicitly accepts revision-cost. Post-Phase-3 evidence may RATIFY / RESHAPE / DISCARD this ticket. Treat scope as plausible, not committed.

**Closes / advances:**
- `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (Tier 2 — T4 WB14 findings §IX) — **final arm closure**: T8 (`155933f`) closed cost-meter arm; T9 (`afd3778`) closed plan-timer arm; T10 (`6ce548f`) shipped max-parallel component prop seam (consumer wiring deferred); this ticket closes the BypassPermsIndicator arm via component prop seam extension + main-process aggregator.
- Full-build-mode dispatch §1 Bottom rail bullet 6 (`bypass-perms ⚠ indicator`) — structural ship landed at T4 WB12 (`f8fc24d` §4 WB12 Sub-Q-T4-F=(i) `dispatchMode === 'auto'` placeholder); this ticket advances from **global-dispatchMode-toggle source** → **per-spawn-permissionMode-aggregated source seam**.
- T4-shipped placeholder framing: `BypassPermsIndicator` currently renders based on `dispatchMode: 'auto' | 'ask'` (chat-shell global toggle controlled by `dispatchModeBridge`). The real authoritative signal is per-spawn `permissionMode` already plumbed through `spawn-handler.ts` (`SpawnSessionRequest.permissionMode` → `--dangerously-skip-permissions` argv → `SpawnSessionResult.spawnMode`). This ticket reconciles the two by introducing a main-process aggregator that observes per-spawn state and exposes an aggregated signal.

**Depends on (all merged):**
- `MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS` (`f8fc24d` body; WB14 docs `4e8ec96`) — `BypassPermsIndicator` component shipped + slot integration in chat-shell.tsx. Consumer surface stable under this ticket's additive prop extension.
- `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` closure (a) (`228a2da` + `5328a97` + `3e9a203`) — `SpawnSessionResult.spawnMode` field + spawn-handler population shipped. This ticket consumes spawn-handler's awareness of per-spawn permissionMode as the aggregator source.
- `MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW` (`afd3778`) — workstation-side pluggable-source skeleton precedent. Same `[NEW disposition]` (f)-pattern applies here: ship architectural seam; defer consumer plumbing.
- `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW` (`6ce548f`) — component additive-optional-prop seam precedent (`activeCount?: number` override; same shape applies for `bypassActiveCount?: number`).

**Downstream gates:**
- Consumer plumbing into chat-shell `bypass-perms-indicator` slot supplier — requires `chat-shell/mount.ts` edit (FORBIDDEN by this session's manifest) or alternative wiring path. Deferred to follow-on `MB-F-BYPASS-PERMS-CONSUMER-WIRING` Tier 2 per WB7 findings.
- Phase 3 visual-verification — may surface that operator-visible UX needs per-session indicator instead of (or alongside) the chat-shell global indicator. T10 sibling pattern: defer revision to Phase 3 feedback.

**Estimated WB count:** 7 (1 ticket-body docs commit + 6 ladder WBs + 1 findings).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first to bind vs deferred work.
2. Read §3 (Sub-Q gate arbitrations) — five operator decisions parameterize WB scope; defaults `[MODELED]` recommendations.
3. Read §4 (WB ladder) for execution order. WBs are construction-order-aware: probe-then-impl per cairn discipline.
4. §5-§8 are operational supports — cross-refs, self-check expectations, definition of done, risk register.

Confidence labels per CLAUDE.md §2.2: `[KNOWN]` observed in this session via direct source read at HEAD `178b994`; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per Wave 4 dispatch row 24 + manifest `phase4-t9-bypass-perms.txt`:

1. **NEW `packages/dispatch-workstation/src/main/bypass-perms-source.ts`** — main-process aggregator tracking per-spawn permissionMode state. Mirrors T9 rate-limit-aggregator (`3fef80d`) pluggable-source skeleton OR T10 max-parallel-aggregator (`8ea83a0`) pure-fn pattern per Sub-Q-A resolution.

2. **MOD `packages/dispatch-workstation/src/main/spawn-handler.ts`** — sibling integrates by calling `source.recordSpawn(sessionName, permissionMode)` on each successful spawn-result. Additive non-breaking change to `SpawnHandlerDeps` (optional `bypassPermsSource?: BypassPermsSource` dep). Backward-compat: omitting the dep → no-op (current call sites unaffected).

3. **MOD `packages/dispatch-workstation/src/chat-shell/bypass-perms-indicator.tsx`** — additive optional prop seam (`bypassActiveCount?: number`) per Sub-Q-C resolution. When supplied, overrides the inline `dispatchMode === 'auto'` check; when omitted, T4 WB12 semantics preserved verbatim. Mirrors T10 `activeCount?: number` precedent (`9ec2b6a`).

4. **Test coverage in workstation** per manifest:
   - `test/unit/main/probe-mbtwfbypass-*.spec.ts` for source module + spawn-handler integration
   - `test/unit/chat-shell/probe-mbtwfbypass-*.spec.tsx` for indicator prop contract

5. **Docs**: this ticket body, findings doc (`mb-t-phase-4-bypass-perms-indicator-data-flow-findings-2026-05-13.md`), coord doc (`coord-phase4-bypass-perms-2026-05-13.md`).

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify `BypassPermsIndicator` rendering logic outside the new optional prop branch — T4 WB12 dispatchMode-based render preserved verbatim.
- Does NOT modify `SpawnSessionRequest` or `SpawnSessionResult` shape — request already has `permissionMode`, result already has `spawnMode` per closure (a) work at `5328a97`. Aggregator reads existing fields; no schema additions.
- Does NOT modify daemon (`packages/dispatch-daemon/**` FORBIDDEN) or dispatch-core (`packages/dispatch-core/**` FORBIDDEN). No `/v2/sessions` filter additions; no `SessionResponseV2` extensions.
- Does NOT modify `WORKSTATION_CONTRACT.md` §6.6 — no new IPC channels. Aggregator is main-process-only at this ticket; consumer wiring (mount.ts auto-wire OR new IPC bridge) deferred to follow-on.
- Does NOT modify sibling indicators (`bottom-rail-cost-meter.tsx`, `plan-timer-text.tsx`, `max-parallel-counter.tsx` — all FORBIDDEN by manifest).
- Does NOT modify `chat-shell/mount.ts` (FORBIDDEN) — consumer wiring path between aggregator and indicator is deferred.
- Does NOT modify other BypassPermsIndicator consumers (`frame-c/action-bar.tsx`, `tile-grid/tile-grid.tsx`) — those consume per-session `spawnMode` already (closure (a) work); they're out of T10's chat-shell-global concern.
- Does NOT modify `dispatchModeBridge` / `dispatch-mode-store` — the global dispatch-mode toggle persists as the default data source when aggregator signal is unavailable.

---

## §2 — Arbitration anchor

### §2.1 — Wave 4 dispatch enumeration (binding)

`[KNOWN-OPERATOR-ARBITRATED]`

Per `dispatch-queue-current.md` Wave 4 row 24:
> phase4-t9-exec | MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW (Cluster F per P3-rev-2 §3.2) — ticket body + WB1+ ladder

Operator-supplied directive frame:
> "author MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW ticket body + WB1+ ladder (Cluster F per P3-rev-2 §3.2; closes T4-shipped bypass-perms-indicator placeholder data source). Mirror T8/T9 (β)-style scope narrowing: ship data-source module + sibling integrates."

`[KNOWN-OPERATOR-PRE-ARBITRATED]` constraints:
- Scope = data-source module + sibling-integrates pattern (T8/T9 (β)-reshape precedent).
- Closes T4-shipped placeholder data source — the placeholder is `dispatchMode === 'auto'` global toggle; real per-spawn signal lives in spawn-handler.
- Sibling pattern: data-source module + sibling integrates = aggregator owns state; integrator (spawn-handler) feeds events; consumer (indicator) optionally reads aggregated signal.

### §2.2 — Visual-comparison gate

`[KNOWN-OPERATOR-ARBITRATED]`

Per dispatch §3.5: WB-final smoke verifies indicator renders mode-correctly per Phase-3 visual-verification pipeline (just shipped at `a8e9a76`; in active use by `__orchestrator_active` Wave 4 row 23). Operator-manual-screenshot fallback if Phase-3 doesn't cover bottom-rail indicator surface explicitly.

### §2.3 — Frozen-contract amendment scoping

`[KNOWN-OPERATOR-ARBITRATED]`

Per dispatch §3.3: ZERO frozen-surface modifications under default-path Sub-Q resolutions. The manifest itself FORBIDS `WORKSTATION_CONTRACT.md`, `schema.ts`, `CONDUCTOR_API_CONTRACT.md`, `orchestrator.md`, sibling components, daemon, dispatch-core — full belt-and-suspenders coverage. Non-default Sub-Q options that would require frozen-surface touch are out-of-scope for this session (deferred to operator-arbitrated follow-on).

### §2.4 — Construction order (file ownership)

`[KNOWN per manifest]`

T10 primary territory (WRITE per manifest):
- NEW `packages/dispatch-workstation/src/main/bypass-perms-source.ts`
- MOD `packages/dispatch-workstation/src/main/spawn-handler.ts`
- MOD `packages/dispatch-workstation/src/chat-shell/bypass-perms-indicator.tsx`
- NEW tests in `test/unit/main/probe-mbtwfbypass-*.spec.ts` + `test/unit/chat-shell/probe-mbtwfbypass-*.spec.tsx`
- NEW docs (this ticket body + findings + coord)

Co-active sub-session coordination per Wave 4 dispatch-queue + Wave 2 in-flight:
- `commit-plan-doc-1334` (spawnMode closure (a)) — landed at `228a2da`/`227bd2e`/`5328a97`/`3e9a203`. `spawn-handler.ts` is path-overlap territory; per-path commit pathspec mandatory.
- `__orchestrator_active` Phase-3 visual verification — disjoint (scripts + screenshots).
- `phase4-t8-exec` Cluster D-ε methodology — disjoint (methodology infra; no app code).
- `r11-archive-writer` round close — disjoint (docs/archive only).

Path-overlap risk: `spawn-handler.ts` is workstation main territory that's been heavily edited in Wave 2 sessions. Race-window stress regime per Round 11 §3.9 mandates per-path commit pathspec at every WB.

---

## §3 — Sub-Q gate arbitrations

Five operator decisions parameterize WB scope. Defaults if unresolved are `[MODELED]` recommendations. Operator-arbitrated session under Wave 4 envelope's "auto-ack" framing per T10 precedent — defaults apply unless operator surfaces revision.

### §3.1 — Sub-Q-A: Aggregator architecture

Required before **WB1** (source probe) + **WB2** (impl). Default: **(α) Pluggable-source skeleton (T9 (f)-pattern)**.

| Option | Mechanism | Effort |
|---|---|---|
| (α) Pluggable-source skeleton (recommended; T9 precedent `3fef80d`) | `BypassPermsSource = { recordSpawn, getActiveBypassCount, onUpdate, ... }` interface; `createBypassPermsSource()` factory returning mutable in-memory map of `sessionName → permissionMode`. Subscribers fire on `recordSpawn`. | LOW |
| (β) Pure-fn aggregator (T10 precedent `8ea83a0`) | `aggregateBypassCount(sessions)` pure-fn; caller maintains state externally. Mirrors T10 max-parallel pattern. | LOW |
| (γ) Stateful-with-removal | (α) plus `recordKill(sessionName)` to decrement on session-kill. More complete but couples to spawn-handler kill pipeline (out-of-manifest paths). | MEDIUM |

`[MODELED]` Recommend **(α)** — same skeleton pattern as T9; spawn-handler-side integrator pushes events; aggregator owns state. (β) pure-fn is admissible if Phase 3 surfaces "kill-tracking is essential". (γ) bleeds into out-of-manifest paths (kill handler).

### §3.2 — Sub-Q-B: Signal shape

Required before **WB5** (indicator probe) + **WB6** (component impl). Default: **(ii) `bypassActiveCount?: number` (matches T10 `activeCount?: number` precedent)**.

| Option | Signal | Component branch |
|---|---|---|
| (i) `bypassActive?: boolean` | Aggregated boolean — true if any spawn is bypassed | Component renders indicator when `bypassActive ?? dispatchMode === 'auto'` |
| (ii) `bypassActiveCount?: number` (recommended) | Numeric — count of bypassed live spawns | Component renders when `bypassActiveCount > 0 ?? dispatchMode === 'auto'`. Numeric carries more info for future UX (e.g., "3 sessions bypassed") |
| (iii) Both `bypassActive?` + `bypassActiveCount?` | Caller chooses | Component prefers count if provided, else boolean, else dispatchMode |

`[MODELED]` Recommend **(ii)** for forward-compat (UX may want to surface count) + T10 precedent shape. Component logic: `(bypassActiveCount ?? 0) > 0 || dispatchMode === 'auto'`. Backward-compat: when prop omitted, T4 WB12 dispatchMode-only check preserved.

### §3.3 — Sub-Q-C: Component prop API shape

Required before **WB5+WB6**. Default: **(α) Additive optional prop (T10 precedent)**.

| Option | Mechanism | Backward-compat |
|---|---|---|
| (α) Additive optional prop (recommended) | New `bypassActiveCount?: number` field on `BypassPermsIndicatorProps`; existing required `dispatchMode` preserved | Yes — all existing call sites unchanged |
| (β) New component | NEW `BypassPermsIndicatorWithSource` co-exists; old component preserved | Yes but two components to maintain |
| (γ) Mandatory prop addition | Breaking change | No — call sites need updating (FORBIDDEN by manifest scope) |

`[MODELED]` Recommend **(α)** matching T10 precedent (`9ec2b6a` `activeCount?: number`). (γ) blocked by manifest (call sites in `frame-c/action-bar.tsx` + `chat-shell.tsx` slot supplier are out-of-territory).

### §3.4 — Sub-Q-D: Render disposition under aggregator signal

Required before **WB5+WB6**. Default: **(any-bypassed-shows-indicator)**.

| Option | Semantics |
|---|---|
| (any) Show indicator if any spawn is bypassed (`bypassActiveCount > 0`) | "warn operator that at least one bypassed session is live" |
| (all) Show indicator only if ALL live spawns are bypassed | "warn operator only when all sessions risk bypass" |
| (threshold) Show indicator when count ≥ threshold | Operator-configurable; out-of-default-scope |

`[MODELED]` Recommend **(any)** — bypass-perms is a precaution indicator; presence of even one bypassed session warrants showing the warning. Mirrors original `dispatchMode === 'auto'` semantics (which triggers when the CURRENT default is bypass, regardless of session count).

### §3.5 — Sub-Q-E: Spawn-handler integration cadence

Required before **WB3+WB4**. Default: **(α) Synchronous post-spawn-success record**.

| Option | Mechanism |
|---|---|
| (α) Sync post-spawn-success record (recommended) | spawn-handler calls `source.recordSpawn(name, mode)` immediately after `runTmuxNewSession` + daemon registration succeed |
| (β) Event-driven via spawn-result subscription | spawn-handler emits event; aggregator subscribes externally |
| (γ) Polling-based reconciliation | aggregator polls some session-list source; out-of-manifest (daemon FORBIDDEN) |

`[MODELED]` Recommend **(α)** for simplicity + matches existing spawn-handler integration patterns. (β) is over-engineering for an in-process aggregator. (γ) is blocked by manifest.

---

## §4 — WB ladder

7 WBs total. WB0 (docs) authors this ticket body; WB1-WB6 execute the ladder; WB7 (docs) closes with findings + coord. Each cairn-grammar commit follows methodology:
- Pre-commit `git status --short` MANDATORY
- Per-path `git add <single-path>`
- Per-path `git commit -m "..." -- <single-pathspec>`
- Push immediately per CLAUDE.md §2.6
- Q1-Q9 self-check in commit body

### WB0 — `docs(MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW): ticket body authoring`

**Type:** docs
**Scope:** NEW `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW_BUILD.md` (this file).
**Acceptance:** ticket body committed + pushed.

### WB1 — `red(MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW): probe-mbtwfbypass-01-source-module`

**Type:** red
**Scope:** NEW `packages/dispatch-workstation/test/unit/main/probe-mbtwfbypass-01-source-module.spec.ts`. Asserts (Sub-Q-A=α):
- Module `src/main/bypass-perms-source.ts` exists.
- Exports `createBypassPermsSource()` factory returning `{ recordSpawn, getActiveBypassCount, onUpdate, ... }`.
- `recordSpawn(name, 'auto')` increments active bypass count; `recordSpawn(name, 'ask')` does not.
- `onUpdate(cb)` fires callback on each recordSpawn; dispose deregisters.
- Purity-of-derivation: getActiveBypassCount() is deterministic given recorded state.

**Acceptance:** probe RED at HEAD; flips GREEN at WB2.

### WB2 — `green(MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW): bypass-perms-source.ts impl`

**Type:** green
**Scope:** NEW `packages/dispatch-workstation/src/main/bypass-perms-source.ts` with `createBypassPermsSource()` factory + `BypassPermsSource` interface. State: `Map<sessionName, 'auto' | 'ask'>`. Mutations via `recordSpawn(name, mode)`. Derived: `getActiveBypassCount()` = count of entries with mode === 'auto'. Subscribers fire on each recordSpawn.

**Acceptance:** WB1 probe flips RED → GREEN.

### WB3 — `red(MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW): probe-mbtwfbypass-02-spawn-handler-integration`

**Type:** red
**Scope:** NEW `packages/dispatch-workstation/test/unit/main/probe-mbtwfbypass-02-spawn-handler-integration.spec.ts`. Asserts:
- `SpawnHandlerDeps` accepts optional `bypassPermsSource?: BypassPermsSource` field.
- When `bypassPermsSource` is supplied, spawn-handler calls `source.recordSpawn(name, permissionMode ?? 'ask')` after successful spawn-result.
- When `bypassPermsSource` is omitted, spawn-handler proceeds normally (backward-compat).

**Acceptance:** probe RED at HEAD; flips GREEN at WB4.

### WB4 — `green(MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW): spawn-handler integration`

**Type:** green
**Scope:** MOD `packages/dispatch-workstation/src/main/spawn-handler.ts`:
- Add `bypassPermsSource?: BypassPermsSource` field to `SpawnHandlerDeps`.
- Call `deps.bypassPermsSource?.recordSpawn(req.sessionName, req.permissionMode ?? 'ask')` after successful spawn-result construction.

**Acceptance:** WB3 probe flips RED → GREEN. Existing spawn-handler test suite remains GREEN.

### WB5 — `red(MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW): probe-mbtwfbypass-03-indicator-prop-contract`

**Type:** red
**Scope:** NEW `packages/dispatch-workstation/test/unit/chat-shell/probe-mbtwfbypass-03-indicator-prop-contract.spec.tsx`. Asserts (Sub-Q-B=ii + Sub-Q-C=α + Sub-Q-D=any):
- Source-text: `BypassPermsIndicatorProps` declares optional `bypassActiveCount?: number`.
- Render-behavior: when `bypassActiveCount={3}` + `dispatchMode='ask'`, indicator renders (count overrides).
- Render-behavior: when `bypassActiveCount={0}` + `dispatchMode='ask'`, indicator hidden.
- Backward-compat: when `bypassActiveCount` omitted + `dispatchMode='auto'`, indicator renders (T4 WB12 semantics preserved).
- Backward-compat: when `bypassActiveCount` omitted + `dispatchMode='ask'`, indicator hidden.

**Acceptance:** probe RED at HEAD; flips GREEN at WB6.

### WB6 — `green(MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW): indicator additive prop`

**Type:** green
**Scope:** MOD `packages/dispatch-workstation/src/chat-shell/bypass-perms-indicator.tsx`:
- Add `readonly bypassActiveCount?: number` field on `BypassPermsIndicatorProps`.
- Update render branch: `const showIndicator = (props.bypassActiveCount ?? 0) > 0 || props.dispatchMode === 'auto';`
- If `!showIndicator` return null; else render existing JSX unchanged.

**Acceptance:** WB5 probe flips RED → GREEN. T4 WB12 regression probe remains GREEN.

### WB7 — `docs(MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW): findings + coord docs + operator-stamp surface`

**Type:** docs
**Scope:**
- NEW `docs/coordination/mb-t-phase-4-bypass-perms-indicator-data-flow-findings-2026-05-13.md` — full findings doc per T9/T10 format.
- NEW `docs/coordination/coord-phase4-bypass-perms-2026-05-13.md` — coord note documenting sibling-session activity + path-overlap reconciliation.
- FOLLOWUPS surface (operator-stamp since `FOLLOWUPS.md` is FORBIDDEN):
  - `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2: FINAL ARM CLOSED (BypassPermsIndicator prop seam added at WB6).
  - NEW Tier 2 `MB-F-BYPASS-PERMS-CONSUMER-WIRING`: future ticket plumbs `bypass-perms-source` to indicator via chat-shell/mount.ts auto-wire OR new IPC channel.

**Acceptance:** docs land + commits pushed.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED or stamped by this ticket

| Followup | Tier | Closure path | Closing WB |
|---|---|---|---|
| `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (BypassPermsIndicator arm) | Tier 2 | Component prop seam shipped at WB6 | WB7 stamp |

### §5.2 — Followups likely to surface

`[MODELED-SPECULATIVE]`:
- `MB-F-BYPASS-PERMS-CONSUMER-WIRING` Tier 2 — chat-shell consumer plumbing (mount.ts auto-wire) deferred.
- `MB-F-BYPASS-PERMS-SOURCE-KILL-RECONCILIATION` Tier 3 — Sub-Q-A=(γ) `recordKill` path; depends on Phase 3 dogfood revealing whether kill-tracking is essential.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Relevance |
|---|---|---|
| `MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS` | `f8fc24d` body + `4e8ec96` WB14 | `BypassPermsIndicator` component WB12 + slot integration |
| `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` closure (a) | `228a2da` / `5328a97` / `3e9a203` | `spawn-handler.ts` permissionMode plumbing |
| `MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW` | `afd3778` | workstation-side pluggable-source skeleton precedent |
| `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW` | `6ce548f` | additive-optional-prop seam precedent |

### §5.4 — Manifest constraint surfacing

`[KNOWN per manifest at phase4-t9-bypass-perms.txt]`:
- `chat-shell/mount.ts` FORBIDDEN — consumer wiring path between aggregator and indicator deferred to follow-on.
- `WORKSTATION_CONTRACT.md` FORBIDDEN — no new IPC channels for renderer subscription.
- `dispatch-daemon/**` + `dispatch-core/**` FORBIDDEN — no schema additions, no daemon endpoint additions.
- Sibling components FORBIDDEN — only THIS indicator can be modified.

Consumer-wiring is a known gap closed at ticket-level only via the additive prop seam (renderer can be wired by follow-on). Same shape as T10's deferred consumer plumbing.

---

## §6 — Self-check Q1-Q9 expectations per WB

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q5 (frozen mod?) | Q7 (parallel territory?) |
|---|---|---|---|---|---|
| WB0 docs | N/A | N/A | N/A | No | per-path ticket-body path |
| WB1 RED | N/A | BEHAVIOR (real dynamic-import) | No — module absent | No | new test path |
| WB2 GREEN | T9 (f)-skeleton precedent at 3fef80d | BEHAVIOR (real factory + Map state) | No — module load-bearing | No | new src path |
| WB3 RED | N/A | BEHAVIOR (spawn-handler invocation with mock deps) | No — integration absent | No | new test path |
| WB4 GREEN | (see WB3) | BEHAVIOR (real spawn-handler + mock source) | No — integration load-bearing | No | spawn-handler MOD; per-path commit; race-window aware |
| WB5 RED | N/A | BEHAVIOR (@testing-library/react render) | No — prop absent | No | new test path |
| WB6 GREEN | T10 prop-seam precedent at 9ec2b6a | BEHAVIOR (real component render with prop) | No — prop load-bearing | No | component MOD; backward-compat preserved |
| WB7 docs | N/A | N/A | N/A | No | findings + coord doc paths |

---

## §7 — Definition of done

1. **WB0-WB7 cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed to origin/main per CLAUDE.md §2.6.
2. **`bypass-perms-source.ts` shipped** with `createBypassPermsSource()` + `BypassPermsSource` interface; `recordSpawn` + `getActiveBypassCount` + `onUpdate` semantics verified.
3. **spawn-handler.ts integrated**: optional `bypassPermsSource?` dep wired; on successful spawn-result, `source.recordSpawn(name, mode)` invoked.
4. **`BypassPermsIndicator` prop seam added**: optional `bypassActiveCount?: number`; backward-compat with T4 WB12 dispatchMode semantics preserved.
5. **Workstation typecheck CLEAN** per CLAUDE.md §4.4.
6. **No regression in T4 WB12 indicator probe** per CLAUDE.md §4.5 + memory's consumer-non-regression-per-WB discipline.
7. **Findings doc + coord doc + operator-stamp surface land** at WB7.
8. **Per-path discipline applied at every commit**: pre-commit `git status --short` + per-path `git add` + per-path `git commit -- <pathspec>`. Race-window stress regime per Round 11 §3.9.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `spawn-handler.ts` path-overlap with active sibling sessions (commit-plan-doc-1334 closure (a) work, future kill-handler work) | `[KNOWN]` | `[MODELED-MEDIUM]` (race-window stress per Round 11 §3.9 Wave 2 evidence — observed across T10 ladder commits) | Per-path commit pathspec mandatory; pre-commit `git status --short` mandatory; atomic stage+commit+verify in single shell invocation per T10 precedent |
| Consumer wiring deferred — indicator renders T4 WB12 semantics until mount.ts plumbing lands | `[KNOWN]` | `[MODELED-LOW]` (matches T9/T10 (f)-disposition precedent; honest "Capability enabled with known limitations" per §2.11) | File `MB-F-BYPASS-PERMS-CONSUMER-WIRING` Tier 2 at WB7 |
| Sub-Q-A=(γ) kill-tracking deferred — aggregator never decrements on session-kill | `[KNOWN]` | `[MODELED-LOW]` (acceptable for v1 indicator; Phase 3 dogfood will surface if "stale bypass count" is operator-visible problem) | Defer to Sub-Q-A=(γ) follow-on if Phase 3 surfaces |
| Pre-existing chat-shell happy-dom test infra issues per CLAUDE.md §4.5 | `[KNOWN]` | `[MODELED-LOW]` (T10 WB3 probe used different code path that worked — 4/4 GREEN evidence) | NOT re-diagnose per CLAUDE.md §4.5 |
| Round 11 §3.9 Wave 4 SPECULATIVE: Phase 3 visual-verification may RESHAPE or DISCARD ticket entirely | `[KNOWN per dispatch STATUS FRAMING]` | `[MODELED-MEDIUM]` (7-WB equivalent scope discard risk) | Operator explicitly accepts revision-cost per §3.9 dispatch |

---

**End of MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW ticket body.**

Pending Sub-Q resolutions before ladder execution (auto-defaults under Wave 4 envelope):
- Sub-Q-A (§3.1) — Aggregator architecture (**α pluggable-source skeleton (recommended)** / β pure-fn / γ stateful-with-removal)
- Sub-Q-B (§3.2) — Signal shape (i boolean / **ii count (recommended)** / iii both)
- Sub-Q-C (§3.3) — Prop API shape (**α additive optional (recommended)** / β new component / γ mandatory)
- Sub-Q-D (§3.4) — Render disposition (**any (recommended)** / all / threshold)
- Sub-Q-E (§3.5) — Integration cadence (**α sync post-spawn (recommended)** / β event-driven / γ polling)

`[KNOWN per Round 11 §3.9 STATUS FRAMING]`: SPECULATIVE Phase 4 forward-positioning; revision-cost explicitly accepted by operator. Post-Phase-3 evidence may RATIFY / RESHAPE / DISCARD.
