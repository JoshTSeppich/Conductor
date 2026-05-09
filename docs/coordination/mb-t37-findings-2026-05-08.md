# MB-T37 Findings — OrchestratorPoolManager + ConsoleIpcController observer taps

**Date:** 2026-05-08
**Session shape:** TICKET — Terminal X, solo; Terminal Y (MB-T39) in parallel at HALT-STAGING-FOR-X
**Base SHA:** 9bd82c1 (MB-T38 docs)
**RED commit:** dd0e41d
**GREEN commit:** 38b1a03
**WB3:** Skipped (operator-authorized — implementation clean per cairn convention)
**Docs commit:** (this commit)

---

## I. Shipped surface

### OrchestratorPoolManager

**File:** `packages/dispatch-workstation/src/coarchitect/hso-pool.ts`

`OrchestratorPoolManager` implements the 1-active + 1-standby Claude CLI hot-swap pool
per dispatch §3.4 + HALT 0/1 arbitrations.

**Class anatomy:**

| Member | Purpose |
|---|---|
| `start()` | Subscribe stdout + stream-close observers → spawn active → register tile → spawn standby → register tile → start tmux poll |
| `stop()` | Dispose both observers; clear poll interval |
| `_onPtyChunk(sessionName, chunk)` | Mid-action tracking; HANDOFF_EMITTED_MARKER detection; token-count parse; threshold → directive; parse-fail halt |
| `_promote()` | removeSession(standby) → addSession(active) → update `_activeSessionName` → void `_spawnAndRegister(standby)` |
| `_onActiveCrash()` / `_onStandbyCrash()` | First-fires-wins guards; crash → promote or replace |
| `_spawnAndRegister(sessionName)` | `handleSpawnRequest({repoPath, sessionName, permissionMode:'auto'})` → on success: `tileRegistry.addSession` |
| `_pollOnce()` | `runTmuxHasSession(active)` + `runTmuxHasSession(standby)` on POLL_INTERVAL_MS timer |

**Key constants (exported):**

| Constant | Value | Rationale |
|---|---|---|
| `RESERVED_ACTIVE` | `'__orchestrator_active'` | canonical active session name |
| `RESERVED_STANDBY` | `'__orchestrator_standby'` | canonical standby session name |
| `HANDOFF_TOKEN_THRESHOLD` | `130_000` | 65% of 200K context window (SPIKE-HSO-01 D3) |
| `TOKEN_COUNT_REGEX` | `/([0-9]+) tokens$/m` | matches status-bar last-line format |
| `HANDOFF_EMITTED_MARKER` | `'[HANDOFF-EMITTED]'` | MB-T41 §8.1 handoff completion marker |
| `HANDOFF_NOW_DIRECTIVE` | `'[HANDOFF-NOW]\n'` | directive pool sends to active at threshold |
| `POLL_INTERVAL_MS` | `5_000` | tmux crash-detection poll (Q-MBT37-2b) |
| `PARSE_FAIL_MAX` | `3` | consecutive non-parse failures before halt (Q-MBT37-2a) |

### ITileGridRegistry + TileGridRegistryAdapter

**File:** `packages/dispatch-workstation/src/coarchitect/hso-pool.ts` (lines 33–63)

`ITileGridRegistry` is a thin interface over the `tile-grid-state.ts` functional exports:
```typescript
interface ITileGridRegistry {
  addSession(name: string, state: TileLayoutState): void;
  removeSession(name: string): void;
  renameSession(fromName: string, toName: string): void;
}
```

`TileGridRegistryAdapter` wraps `writeTileLayoutState`, `readAllTileLayoutStates`,
`writeAllTileLayoutStates`, `readTileLayoutState`. `tile-grid-state.ts` is NOT modified.

**Motivation (HALT 0 V2(a)):** dispatch §1 described a class-based registry API at
`src/coarchitect/tile-grid-state.ts`. Actual state at HALT 0: functional module exports
at `src/main/tile-grid-state.ts`. The adapter pattern isolates the pool manager from
the module-vs-class divergence and enables DI in tests without touching the persistence
module. See §V F-MBT37-A.

### ConsoleIpcController observer taps

**File:** `packages/dispatch-workstation/src/main/console-ipc.ts`

Two `Set`-based observer registries added to `ConsoleIpcController`:
```typescript
private readonly stdoutObservers = new Set<(sessionName: string, chunk: string) => void>();
private readonly streamCloseObservers = new Set<(sessionName: string) => void>();
```

**`addStdoutObserver(fn)` — lines ~167–170:**
```typescript
addStdoutObserver(fn) {
  this.stdoutObservers.add(fn);
  return () => { this.stdoutObservers.delete(fn); };
}
```
Fan-out injection in `handleWsMessage` `type === 'line'` branch, immediately after
`emitToWebview('console:stdout-chunk', ...)`. Non-redirecting: `emitToWebview` fires
first; observer fan-out is a parallel tap, not a route replacement.

**`addStreamCloseObserver(fn)` — lines ~172–175:** symmetric.
Fan-out injection in `wireSocket` `sock.on('close', ...)`, after `closedByOperator`
guard and before `TERMINAL_CLOSE_CODES` check. Non-redirecting: `scheduleReconnect`
still fires for retryable close codes.

**Disposer pattern:** both methods return `() => { Set.delete(fn); }`. Multiple
concurrent registrations are independent; disposal removes only the specific closure
instance, not all observers. Probes 11–13 + 15 exercise this explicitly.

---

## II. HALT 0 / HALT 1 arbitration trail

### HALT 0 arbitrations

| ID | Question | Resolution |
|---|---|---|
| V1 | `OrchestratorPoolManager` location | `src/coarchitect/hso-pool.ts` confirmed |
| V2 | Tile-grid registry API | **(a)** thin `ITileGridRegistry` wrapper interface + `TileGridRegistryAdapter`; `tile-grid-state.ts` NOT modified |
| V3 | ConsoleIpcController injection | Initially (b) protocol-adapter; revised at HALT 1 to **(A)** direct concrete injection + `addStdoutObserver` non-redirecting tap |
| Q-MBT37-1 | Orchestrator tile render specialization | **(c)** standard tile; specialization deferred (see §V F-MBT37-TILE-GRID-RENDER-SPECIALIZATION) |
| Q-MBT37-2a | Parse-fail policy | 3× consecutive → `halt(reason)` |
| Q-MBT37-2b | Tmux poll interval | 5 000 ms |
| Q-MBT37-2c | Mid-action gating | `[ACTION:type]` without matching `[/ACTION]` = mid-action; hold directive |
| Q-MBT37-3 | Handoff trigger | `[HANDOFF-EMITTED]` is the SOLE promote-standby trigger |
| Q-MBT37-4 | PTY stream subscription | **(c)** PTY stream-close observer (Q-MBT37-4(c)); both stream-close + tmux poll with first-fires-wins guards |
| Q-MBT37-5 | Cold-start mechanism | **(b)** UI button; `dispatchModeReader` wired but UI button downstream |

### HALT 1 arbitrations

- **V3 change HALT 0→HALT 1:** dispatch V3 originally (b) protocol-adapter through `setSessionTarget`; operator revised to **(A)** `addStdoutObserver` non-redirecting tap. This is scope-positive — no existing routing is disrupted, and Terminal Y's probe mock interface is structurally compatible.
- **Q-MBT37-4(c) PTY EOF path ratified at HALT 1(a):** `addStreamCloseObserver` added to probe set (Probe 14 + Probe 15). This expanded the scope from 13 probes (HALT 1 V1/V2) to 15 probes (HALT 1(a) stream-close addition). Methodology-positive: gaps in the EOF path were caught before WB1 RED rather than post-merge.

---

## III. Token-count threshold mechanism

Token counting uses `TOKEN_COUNT_REGEX = /([0-9]+) tokens$/m` against the last non-empty
line of each PTY chunk. This matches the CC CLI status bar format `<N> tokens` at
end-of-line. The multiline flag (`m`) ensures `$` anchors to line-end, not string-end.

Threshold logic in `_onPtyChunk`:
1. If `[ACTION:...]` seen without `[/ACTION]` → set `_midAction = true` (hold directive)
2. If `[HANDOFF-EMITTED]` in chunk → `_awaitingMarker = false`; `_promote()`; return
3. Extract lastNonEmpty line; exec regex; if null → increment `_parseFailCount`; if
   `_parseFailCount === PARSE_FAIL_MAX` → `halt(reason)`
4. If parse success → reset `_parseFailCount = 0`; if `tokenCount >= HANDOFF_TOKEN_THRESHOLD`
   AND `!_awaitingMarker` AND `!_midAction` → send `[HANDOFF-NOW]\n`; set `_awaitingMarker = true`

**Post-promotion behavior:** `_promote()` sets `_activeSessionName = former_standby_name`.
Subsequent PTY chunks from the OLD active session name fail the `sessionName !== _activeSessionName`
guard and are silently discarded. Probe 04 verifies this: threshold chunks from the old
active do NOT re-trigger `[HANDOFF-NOW]` after promotion.

---

## IV. Crash detection: first-fires-wins

Two parallel paths per Q-MBT37-4(c):
- **PTY stream-close path:** `_onSessionClose` → `_onActiveCrash` or `_onStandbyCrash`
- **Tmux poll path:** `_pollOnce()` catch block → `_onActiveCrash` or `_onStandbyCrash`

Both paths protected by `_activeCrashHandled` and `_standbyCrashHandled` boolean guards.
First caller wins; subsequent calls are no-ops. This prevents double-promotion if PTY
stream-close fires at the same time as a tmux poll detects session absence.

Active crash → `_promote()` (standby becomes active; fresh standby spawned).
Standby crash → `removeSession(RESERVED_STANDBY)` + `_spawnAndRegister(RESERVED_STANDBY)` (replacement; active unaffected).

---

## V. Findings + authoring drift

### F-MBT37-A: tile-grid-state.ts path divergence [KNOWN]

Dispatch §1 claimed `src/coarchitect/tile-grid-state.ts` with an OOP registry class.
Actual state at HALT 0: `src/main/tile-grid-state.ts` with functional module exports
(`readAllTileLayoutStates`, `writeAllTileLayoutStates`, `writeTileLayoutState`,
`readTileLayoutState`, `defaultTileLayoutState`). No class; no registry object.

Detection: §2.1 anti-fabrication — read the actual source before implementing.
Resolution: `TileGridRegistryAdapter` in `hso-pool.ts` wraps the functional exports.
`tile-grid-state.ts` NOT modified. No regression to tile-grid consumers.

### F-MBT37-B: stream-close observer ratification at HALT 1(a) — scope expansion [KNOWN]

HALT 1 V1/V2 probes covered only stdout tap (Probes 10–13, 4 probes + 9 pool = 13 total).
During HALT 1 review, operator identified the PTY EOF crash path (Q-MBT37-4(c)) was
unobservable without a stream-close observer. `addStreamCloseObserver` was ratified at
HALT 1(a), adding Probes 14–15. Expanded scope from 13 → 15 probes.

Methodology note: this is a pre-WB1 scope expansion, not scope creep mid-implementation.
The expanded probes drove the WB2 implementation of `streamCloseObservers` fan-out.

### F-MBT37-C: probe micro-fixes revealed by async semantics [KNOWN]

Three test infrastructure fixes applied at WB2 after implementation revealed actual
async semantics:

1. **`afterEach(() => manager.stop())`** — `OrchestratorPoolManager.start()` creates a
   `setInterval`; without `stop()` in `afterEach`, the interval leaks across test cases,
   potentially causing spurious `_pollOnce()` calls in subsequent probes.

2. **`await Promise.resolve()` in probe-06** — `_promote()` calls `void _spawnAndRegister(RESERVED_STANDBY)`.
   Inside `_spawnAndRegister`, `handleSpawnRequest(...)` is called synchronously (before
   the first `await`), so `handleSpawnRequest` assertion is synchronous. But `addSession`
   is called AFTER the `await` resolves (microtask boundary). The WB1 spec didn't include
   `await Promise.resolve()` because the async boundary wasn't visible until the real
   implementation existed.

3. **`mockClear(tileRegistry.addSession)` in probe-07** — `manager.start()` calls
   `addSession(RESERVED_ACTIVE, ...)` and `addSession(RESERVED_STANDBY, ...)`. Probe 07
   asserts `addSession(RESERVED_ACTIVE, ...)` is called post-crash-promotion. Without
   clearing, the `toHaveBeenCalledWith` assertion would match the start() call — correct
   signal, wrong origin. Clearing ensures the assertion is scoped to the crash-promotion
   cycle.

---

## VI. Probe distribution

15/15 probes GREEN at WB2 commit `38b1a03`:

| Probe | Suite | Coverage |
|---|---|---|
| 01 | hso-pool.spec.ts | start() spawns active; tileRegistry.addSession(RESERVED_ACTIVE) |
| 02 | hso-pool.spec.ts | start() spawns standby; tileRegistry.addSession(RESERVED_STANDBY) |
| 03 | hso-pool.spec.ts | PTY chunk lastLine ≥ threshold → handleSendStdin([HANDOFF-NOW]) |
| 04 | hso-pool.spec.ts | [HANDOFF-EMITTED] terminates active tracking; subsequent chunk does NOT re-send |
| 05 | hso-pool.spec.ts | post-marker: removeSession(standby) precedes addSession(active) (order assertion) |
| 06 | hso-pool.spec.ts | post-promotion: fresh standby spawned + tile registered (invariant restored) |
| 07 | hso-pool.spec.ts | active crash (PTY stream-close) → promotes standby; spawns new standby |
| 08 | hso-pool.spec.ts | standby crash → replacement standby spawned; active tile unaffected |
| 09 | hso-pool.spec.ts | PARSE_FAIL_MAX consecutive non-parse chunks → halt(reason) |
| 10 | probe-01-stdout-observer.spec.ts | addStdoutObserver fn receives (sessionName, bytes); emitToWebview also fires |
| 11 | probe-01-stdout-observer.spec.ts | two observers, single chunk → both receive |
| 12 | probe-01-stdout-observer.spec.ts | disposer removes observer; subsequent chunk does not reach removed fn |
| 13 | probe-01-stdout-observer.spec.ts | two observers, one disposed → surviving receives; emitToWebview fires |
| 14 | probe-01-stdout-observer.spec.ts | addStreamCloseObserver fn receives sessionName; scheduleReconnect still fires |
| 15 | probe-01-stdout-observer.spec.ts | stream-close disposer removes observer; subsequent close does not reach removed fn |

Consumer non-regression: 39/39 `console-t02` probes GREEN at 38b1a03.
Workstation typecheck: clean (no errors).

---

## VII. Parallel-cairn coordination outcomes

**Per-path staging discipline:** held across both commits (dd0e41d + 38b1a03).
- WB1 RED staged: `hso-pool.ts` (new) + `hso-pool.spec.ts` (new) + `console-ipc.ts`
  (WB1 stub methods) — 3 files.
- WB2 GREEN staged: `hso-pool.ts` (rewrite) + `console-ipc.ts` (real impl) +
  `hso-pool.spec.ts` (probe micro-fixes) — 3 files.
- Terminal Y files (`swarm-state-writer.ts` and its tests) never appeared in Terminal X's
  staged set. `git status --short` confirmed at pre-commit for both WBs.

**Terminal Y (MB-T39) structural compatibility:**
Terminal Y's `makeMockDeps()` mock interface captures `addStdoutObserver` and
`addStreamCloseObserver` callbacks. This was authored during Terminal Y's HALT-STAGING-FOR-X
window. The V3(A) non-redirecting tap design is fully compatible: the mock expects
`(fn: StdoutObs) => (() => void)` which matches the real implementation signature exactly.
Terminal Y's HALT-STAGING-FOR-X was cleared by operator after 38b1a03 pushed to origin/main.

**Territory boundaries:** `tile-grid-state.ts` READ-only. `CONDUCTOR_API_CONTRACT.md` not
touched. `dispatch-core/src/v3/schema.ts` not touched. `main.ts` sentinel zones not
entered. `swarm-state-writer.ts` not touched (Terminal Y territory).

---

## VIII. Deviations from dispatch §3.4 + BUILD doc

**No deviations** from the ratified HALT 0/1 arbitrations. All Q-MBT37-1 through
Q-MBT37-5 decisions implemented as ratified.

**Notable implementation detail not in dispatch:** `_onPtyChunk` discards chunks for
`sessionName !== _activeSessionName`. This is load-bearing for probe 04 correctness
(post-promotion chunks from old active are silently dropped). The dispatch spec implies
this by the session-name routing semantics but does not state it explicitly.

**Q-MBT37-2c mid-action heuristic:** implemented as described (`[ACTION:` sets
`_midAction = true`; `[/ACTION]` clears). See §IX F-MBT37-MID-ACTION-HEURISTIC-AMBIGUITY
for production risk.

---

## IX. Followups filed

Three new followups filed with this WB4 docs commit. No existing followups closed by MB-T37.

| ID | Tier | Description |
|---|---|---|
| `MB-F-MBT37-TILE-GRID-RENDER-SPECIALIZATION` | Tier 2 | Q-MBT37-1=(c) deferral; UI render specialization for orchestrator pair tiles |
| `MB-F-MBT37-COLD-START-OPERATOR-UX` | Tier 3 | Q-MBT37-5=(b) deferral; UI button wiring for OrchestratorPoolManager.start() |
| `MB-F-MBT37-MID-ACTION-HEURISTIC-AMBIGUITY` | Tier 3 | Q-MBT37-2c mid-action tag detection; false-positive risk in production |
