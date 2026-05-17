# MB-F-INTEGRATION-TEST-ELECTRON-PROCESS-LEAK — decisions

**Session**: SESSION-r12-t1c-w1-electron-process-leak-cleanup
**Date**: 2026-05-16
**Followups row**: `docs/FOLLOWUPS.md:153`

---

## 1. Q-ELEAK arbitration record

### Q-ELEAK-1 — Cleanup primitive scope (afterEach vs afterAll vs both)

**Disposition**: BOTH (auto-ack envelope confirmed at HALT 0).

- afterEach: per-test tracked-PID kill via `killAllTracked()`. Opt-in: spec files that call `trackChild(child)` post-spawn get a guaranteed reap on test failure. Existing specs don't call this; remains optional.
- afterAll: defensive sweep via `sweepOrphanDescendants(process.pid)` + `killObservedDescendants()` (polling-captured PIDs).
- Existing inline `try/finally child.kill('SIGKILL')` in probe specs remains as defense-in-depth (NOT replaced by the helper hooks).

**Confidence**: [KNOWN] — both hook paths empirically validated by probe-01 (9 tests) + probe-02 (5 tests).

### Q-ELEAK-2 — PID enumeration approach

**Disposition**: (a) tracked-PID primary + (b) ancestor-bounded pgrep sweep + descendant polling for re-parented orphans. Refined from auto-ack envelope to add the polling primitive after WB-final surfaced the macOS re-parenting gap (see findings §2).

**Constraint preserved**: ancestor-PID guard is load-bearing.
- `sweepOrphanDescendants` BFS-walks ONLY from `process.pid` via `pgrep -P` — never crosses to sibling/cousin PIDs.
- Default `commPattern` is `/[Ee]lectron|Code Helper/` — filters out non-Electron descendants (e.g., test fixtures' bash children).
- `killObservedDescendants` skips `process.pid` and `process.ppid` explicitly.
- Operator's daily-driver Workstation (descendant of /Applications/Claude.app, NOT a descendant of any vitest fork) is mechanically excluded.

**Confidence**: [KNOWN] — sibling/unrelated PID exclusion validated by probe-01 test "sweepOrphanDescendants is ancestor-bounded".

### Q-ELEAK-3 — Affected suite enumeration

**Disposition**: Q-ELEAK-3 became moot when Q-ELEAK-4 selected (b) global setup.ts registration.

Dispatch listed 4-5 suites. Phase 1 diagnose found 28. Global registration via setup.ts attaches the helper hooks to every fork regardless of how many spec files spawn Electron, so the count distinction stopped mattering.

### Q-ELEAK-4 — Scope (4 suites vs 28 vs global setup)

**Disposition**: (b) global setup.ts registration. Operator (gen-6) auto-ack OPTION (b) at 2026-05-16; manifest-expansion-3 grants `packages/dispatch-workstation/test/setup.ts` WRITE.

Rationale (gen-6 commit `2881f4a`):
> "cleanest architecturally + 1-line import closes leak across all 28 suites + matches §3.4 mechanical-translation envelope (no frozen-contract amendment; test infrastructure only)."

**Confidence**: [KNOWN] — global registration verified to attach hooks in every fork via helper probes (probe-02 "registerElectronCleanup() afterEach reaps tracked children" test pair).

### Q-ELEAK-5 — Hook registration shape

**Disposition**: (b) global via `test/setup.ts`. Resolved by Q-ELEAK-4 disposition.

Helper export `registerElectronCleanup()` is called once from `test/setup.ts:20`. Vitest loads `setup.ts` per fork → hooks attach per fork.

### Q-ELEAK-6 — Vitest fork-isolation handling for amend-file shape

**Disposition**: SUPERSEDED by Q-ELEAK-4 (b) selection.

Original concern: under default `isolate: true`, `__cleanup-amend.spec.ts` siblings cannot observe spawns in `probe-*.test.ts` siblings (separate forks). With global `test/setup.ts` registration, this is irrelevant — every fork registers its own afterEach/afterAll, no cross-fork observation needed.

Polling-based design preserves fork isolation explicitly: `observedDescendants` is V8-isolate-scoped module state per fork.

### Q-ELEAK-7 — Acceptance criterion

**Disposition**: (a) — `pgrep -fl "[Ee]lectron" | grep -v Claude.app | wc -l` returns 0 after full integration suite run.

Status: [KNOWN] SATISFIED at WB-final verification. See findings §4.

## 2. Polling vs sweepByCommandLine (WB4 sub-decision)

**Choice**: Polling-by-PID over sweep-by-command-line.

| Aspect | sweep-by-command-line (rejected) | polling-by-PID (chosen) |
|--------|-------------------------------|-----------------------|
| Fork isolation | ❌ broken — any fork's afterAll matches any fork's command lines | ✅ preserved — Set is V8-isolate-scoped |
| Re-parenting handling | ✅ catches re-parented orphans by command-line pattern | ✅ catches re-parented orphans by stored PID |
| Cross-fork interference | ❌ 4 cascading test failures observed in WB4 spike | ✅ zero cross-fork interference |
| Runtime overhead | very low (single ps invocation per afterAll) | ~2-4% (poll every 500ms during tests) |
| Operator-Workstation safety | ✅ excluded by `/var/folders/.../T/` prefix | ✅ excluded by ancestor-bounded BFS root |

Polling overhead is acceptable; cross-fork safety is non-negotiable. Polling wins.

## 3. Polling interval (500ms)

Trade-off: shorter interval = lower miss probability for spawn→reparent race; higher overhead. Longer = lower overhead; higher miss probability.

- macOS Electron spawn typically takes 100-300ms from `spawn()` call to first child Helper appearing.
- Re-parenting happens at shim-kill, which is usually >1 second after spawn (test body executes between spawn and assertion failure).
- 500ms gives 2 ticks of slack on the typical spawn→reparent window.

**Disposition**: 500ms default; override via `startDescendantPolling(intervalMs)` if needed. If `MB-F-ELEAK-CLOSURE-POLLING-OVERHEAD-FLAKE-DELTA` triage shows polling causes the 4 additional failures, lower frequency to 1000ms.

## 4. Pre-existing failures handling

Per CLAUDE.md §4.5, two known pre-existing failure classes exist:
- `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` (Tier 2; unit test, not in integration scope)
- `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` (Tier 3; ~5 flaky integration tests)

WB-final baseline (WB3 alone) observed 16 failures, consistent with the documented baseline. WB3+WB4 observed 20 failures. The +4 delta is `MB-F-ELEAK-CLOSURE-POLLING-OVERHEAD-FLAKE-DELTA` (Tier 3, NEW followup).

**Disposition**: do NOT re-diagnose the 16 baseline failures per WB. Surface only the +4 delta as new finding. Closure ticket is for leak elimination; test failures are orthogonal to this ticket's acceptance criterion.

## 5. Doc placement convention

- Build doc at `docs/build-docs/CONDUCTOR_MB-F-INTEGRATION-TEST-ELECTRON-PROCESS-LEAK_BUILD.md` (matches §3.8 pattern + sibling doc conventions like `CONDUCTOR_MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE_BUILD.md`).
- Coordination docs at `docs/coordination/mb-f-integration-test-electron-process-leak-{findings,decisions,impl-coord}-2026-05-16.md` per §3.8.

## 6. Cross-session coordination

Wave T1-CLOSURE-Wave-1 expansion (POOL-C #2) ran concurrently with 3 other parallel-cairn sessions:
- `phase5-mount-wiring` — writes `src/tile-grid/mount.ts` + `src/main/preload.mts` (zero territory overlap with this session)
- `kanban-empty-state-ux` — writes `dispatch-web/src/kanban/` (zero overlap)
- `stamp-lag-sweep` — writes `docs/FOLLOWUPS.md` only (zero overlap with this session's WRITE paths)

Manifest-expansion-3 (gen-6 commit `2881f4a`) granted `packages/dispatch-workstation/test/setup.ts` exclusively to this session for the duration of this work.

Per-path discipline (CLAUDE.md §2.7) caught one cross-session staging leak attempt: untracked `docs/coordination/territorial-manifests/r12-t1c-w1-worktree-fresh-dist.txt` appeared in `git status` during WB3 staging from a peer session. Confirmed excluded via per-path `git add packages/dispatch-workstation/test/setup.ts`. No cross-session contamination.
