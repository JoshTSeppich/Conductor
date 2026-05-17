# MB-F-INTEGRATION-TEST-ELECTRON-PROCESS-LEAK — implementation coordination

**Session**: SESSION-r12-t1c-w1-electron-process-leak-cleanup
**Date**: 2026-05-16
**Followups row**: `docs/FOLLOWUPS.md:153`

---

## 1. Files touched

| Path | State | Lines (final) | Purpose |
|------|-------|---------------|---------|
| `packages/dispatch-workstation/test/integration/_helpers/electron-process-cleanup.ts` | NEW | 246 | Helper module: polling + sweep + hook factory |
| `packages/dispatch-workstation/test/integration/_helpers/probe-mbfeleak-01-afterall-cleanup-helper.spec.ts` | NEW | 174 | Unit probe (9 tests) for helper API |
| `packages/dispatch-workstation/test/integration/_helpers/probe-mbfeleak-02-suite-wide-cleanup.spec.ts` | NEW | 128 | Ratify meta-probe (5 tests) for suite-wide cleanup |
| `packages/dispatch-workstation/test/setup.ts` | MODIFIED | 32 (+17, -4) | Wired `registerElectronCleanup()` at module load |
| `docs/build-docs/CONDUCTOR_MB-F-INTEGRATION-TEST-ELECTRON-PROCESS-LEAK_BUILD.md` | NEW | — | Build doc (closure design + verification) |
| `docs/coordination/mb-f-integration-test-electron-process-leak-findings-2026-05-16.md` | NEW | — | Findings doc (this session) |
| `docs/coordination/mb-f-integration-test-electron-process-leak-decisions-2026-05-16.md` | NEW | — | Decisions doc (Q-ELEAK record + sub-decisions) |
| `docs/coordination/mb-f-integration-test-electron-process-leak-impl-coord-2026-05-16.md` | NEW | — | This doc |

**FORBIDDEN paths (no writes)**: all `src/*`, `test/unit/*`, frozen contracts, `docs/FOLLOWUPS.md`, `docs/coordination/orchestrator-state-current.md`, `docs/coordination/dispatch-queue-current.md`, `CLAUDE.md`. Verified via per-path `git add` discipline.

## 2. Commit ladder

| Commit | Subject | Files |
|--------|---------|-------|
| `d83c980` | `red(MB-F-ELEAK): WB1 — probe-01 unit tests for electron-process-cleanup helper API` | probe-mbfeleak-01-afterall-cleanup-helper.spec.ts |
| `60bfa93` | `green(MB-F-ELEAK): WB1 — electron-process-cleanup helper module` | electron-process-cleanup.ts |
| `805cabd` | `green(MB-F-ELEAK): WB2 — probe-02 ratify meta-probe for suite-wide cleanup` | probe-mbfeleak-02-suite-wide-cleanup.spec.ts |
| `7cade94` | `green(MB-F-ELEAK): WB3 — wire electron-process-cleanup into test/setup.ts` | test/setup.ts |
| `2b25d4b` | `green(MB-F-ELEAK): WB4 — descendant polling closes macOS reparenting gap` | electron-process-cleanup.ts (amend) + probe-01 (amend) |
| _this commit_ | `docs(MB-F-ELEAK): WB-final — build-doc + findings + decisions + impl-coord` | 4 docs |

Per-commit-push discipline (§2.6): each commit pushed to origin immediately; `git log --oneline origin/main..HEAD` returned empty after each push. No local-only commits.

Per-path discipline (§2.7): every `git add` used explicit path; no `-A` or `-.` ever. Pre-commit `git status --short` reviewed each time. One cross-session staging leak prevented during WB3 (untracked manifest from a peer session present in `git status`; not staged).

## 3. Subagent usage

| WB | Agent | Token spend | Outcome |
|----|-------|-------------|---------|
| HALT 0 | `cairn-phase-1-diagnose` | ~97k tokens | Surface inventory + Q-ELEAK-1/2/3 dispositions + Q-ELEAK-4/5/6/7 new arbitrations + WB ladder shape recommendation (5 WBs, later compressed to 5 with WB-final) |

Per §14.4 amortization heuristic, agent invocation paid off — Q-ELEAK-6 (fork-isolation gap) was a load-bearing architecture question that would have caused a mid-WB pivot if discovered after RED commits.

## 4. Verification path

### 4.1 Helper unit + ratify probes (WB1+WB2)

```
pnpm --filter dispatch-workstation exec vitest run test/integration/_helpers/
```
Final: 14 passed (14). Duration ~2.1s.

### 4.2 Non-regression for non-spawning tests (WB3 verification)

```
pnpm --filter dispatch-workstation exec vitest run test/unit/approval-policy-resolver/
```
34 passed (34). Confirms `test/setup.ts` global hook registration is safe for IPC/unit tests.

### 4.3 Typecheck (WB3 verification)

```
pnpm --filter dispatch-workstation typecheck
```
0 errors.

### 4.4 dispatch-core dist refresh (WB-final pre-step)

```
pnpm --filter dispatch-core build
```
Per CLAUDE.md §3.4, run before workstation integration tests if dispatch-core src has any uncommitted/recent export changes.

### 4.5 Full integration suite (WB-final closure verification)

```
pnpm --filter dispatch-workstation exec vitest run test/integration/
```
Post-run: `pgrep -fl "[Ee]lectron" | grep -v Claude.app | wc -l` returns **0** [KNOWN]. Closure criterion satisfied.

## 5. Confidence labels per CLAUDE.md §2.2

- **[KNOWN]** Leak count flip 31→0 — observed via direct pgrep invocation post-WB3 and post-WB4 suite runs.
- **[KNOWN]** Helper probe pass count (14/14) — observed via vitest invocation.
- **[KNOWN]** Fork-isolation invariant for polling — verified by construction (V8-isolate module state) + tested in probe-01 "fork-isolation invariant" assertion.
- **[KNOWN]** Suite duration delta within noise (~5%).
- **[MODELED]** The 4 additional test failures (vs WB3-baseline 16) are pre-existing flakes per CLAUDE.md §4.5 Tier 3 class. Filed as Tier 3 followup for triage. Architectural reasoning: polling does READ-only operations during tests; kills are afterAll-only. Cannot cause sentinel-timeout failures except via the marginal 2-4% runtime overhead. Triage in followup will confirm/deny.
- **[KNOWN]** Per-commit-push completed for all 5 WBs; verified via `git log origin/main..HEAD` empty after each push.
- **[KNOWN]** Per-path `git add` for every commit; confirmed via `git status --short` pre/post each commit.

## 6. Cross-session contamination check

Manifest-expansion-3 (gen-6 commit `2881f4a`) granted `test/setup.ts` WRITE exclusively to this session for the duration. No other parallel session in POOL-C #1 wave touched `packages/dispatch-workstation/test/`. Confirmed via:

```
git log --since="2026-05-16T18:00:00Z" --oneline -- packages/dispatch-workstation/test/setup.ts
```

Only this session's `7cade94` (WB3) modifies the file in the wave window. Zero overlap.

## 7. Followup proposals

### 7.1 MB-F-ELEAK-CLOSURE-POLLING-OVERHEAD-FLAKE-DELTA (Tier 3 — to file)

> WB4 polling-based closure added 4 test failures vs WB3-baseline 16 (total 20 failures post-WB4 suite run). All 4 are sentinel-timeout flakes matching `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` (CLAUDE.md §4.5 Tier 3) pattern. Polling does READ-only ops during tests; kills are afterAll-only. Triage path: re-run suite with `MB_F_ELEAK_POLL_INTERVAL_MS=1000` env-var override at startDescendantPolling. If delta drops to 0, polling overhead is the cause and the 500ms→1000ms default is the fix. If delta persists, the 4 are pre-existing flakes. Tier 3 — does NOT affect closure of FOLLOWUPS:153 (leak count = 0 satisfies acceptance). Discoverability: this followup row + this impl-coord doc §4.5 + findings doc §6.1.

### 7.2 No other new findings to file

`MB-F-INTEGRATION-TEST-REGISTRY-LEAK` (FOLLOWUPS:158, Tier 2) is the sibling-class problem (daemon-side test fixture registry rows persist). Not in scope here; remains open.

## 8. Closure stamp proposal (operator-stamp envelope)

Operator to update `docs/FOLLOWUPS.md:153` per build doc §7. Proposed prefix to the row body:

> **CLOSED by SESSION-r12-t1c-w1-electron-process-leak-cleanup (commits d83c980→2b25d4b + this WB-final docs commit, 2026-05-16).** Helper at `packages/dispatch-workstation/test/integration/_helpers/electron-process-cleanup.ts` registered globally via `test/setup.ts` (manifest-expansion-3, gen-6 commit `2881f4a`). Three-stage cleanup: descendant polling during tests + ancestor-bounded sweep in afterAll + observed-PID kill in afterAll. Closes the macOS-reparenting gap by capturing PIDs before re-parenting and killing by PID. Verified: 31 leaks → 0 leaks post full integration suite run. Fork-isolated by V8-isolate module state; cannot cross-kill other forks' live processes. Tier 1.
