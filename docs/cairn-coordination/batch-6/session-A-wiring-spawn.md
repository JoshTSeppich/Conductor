# Batch 6 — Session A — wiring-spawn

## §0 Staging verification (cross-session pre-flight)

- [x] Operator confirmed re-scope doc landed at `docs/build-docs/CONDUCTOR_V3_RESCOPE.md` (verified present in worktree, read-only context).
- [x] Operator confirmed the 9 dogfood findings filed at `docs/cairn-findings.md` (verified entries #67–#75; this session's scope = #72, #73, #74).
- [x] Worktree at `~/Desktop/Automata/foxworks-worktrees/batch-6-session-A` on branch `session-A/wiring-spawn`. `git status` clean. Upstream tracks `origin/main`.
- [x] origin/main fetched implicitly via worktree creation; branch is up-to-date (no diverging commits).
- [x] Per-path `git add <path>` discipline confirmed (Round 1 Incident 8 evidence). No `git add -A` in this session.

## §1 Followups owned

Per `docs/cairn-coordination/batch-6/00_COORDINATION_SCAFFOLD.md` §1 Session A row:

- **MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION** (cairn #72; Tier 1 ship-gate blocker; dogfood-validated workaround; permanent fix = absolute-path resolution via `which claude` at workstation startup).
- **MB-F-MB-T05-POST-SPAWN-LIVENESS-CHECK** (cairn #73; Tier 1 defense-in-depth; post-spawn `tmux has-session` verification with configurable delay).
- **MB-F-MB-T05-SPIKE-ENVIRONMENT-VALIDATION** (cairn #74; Tier 2 methodology; ADR amendment only, no code).

## §2 Files owned + files NOT owned

**Owned (this session's territory):**
- `packages/dispatch-workstation/src/main/spawn-env.ts`
- `packages/dispatch-workstation/src/main/spawn-handler.ts`
- `packages/dispatch-workstation/src/main/spawn-ipc.ts`
- `packages/dispatch-workstation/src/main/binary-resolver.ts` (new)
- `packages/dispatch-workstation/test/unit/wiring-spawn/*` (new test directory)
- `docs/adr/MB-S02-spike-environment-validation-amendment.md` (new)
- `docs/cairn-coordination/batch-6/session-A-wiring-spawn.md` (this file)
- `docs/FOLLOWUPS.md` (only the three followup-resolution rows for #72/#73/#74; per-path add)

**Explicitly NOT owned (refuse if I find myself touching these):**
- `packages/dispatch-workstation/src/main/main.ts` (no edits — DI-only changes for Session A; no new register-handler call needed).
- `packages/dispatch-workstation/src/main/card-ipc.ts`, `card-bridge.ts`, `card-context-cache.ts`, `coarchitect-ipc.ts`, `http-daemon-client.ts` (Session B territory).
- `packages/dispatch-workstation/src/onboarding/*`, `src/console-panel/*`, `scripts/build-*.mjs`, `workstation-shell.html` (Session B / C territory).
- `docs/cairn-coordination/batch-6/session-{B,C}-*.md` (read-only sibling reference).

## §3 main.ts coord contract status

N/A — Session A does not touch `main.ts`. Existing `registerSpawnIpcHandlers()` call at `main.ts:148` is unchanged; this session's wiring hides behind that call site.

## §4 Cross-session findings

### CSF-A-1 — Pre-existing MB-T04 integration test relies on sentinel removed by MB-T05 GREEN

**Date observed:** 2026-05-03 (during full-suite session-end validation)
**Status:** Pre-existing on `origin/main`. NOT caused by Session A's changes.
**Recommendation:** filed as observation, not as a new followup, because a near-identical concern is already tracked at `MB-F-MB-T08-SPAWN-RESULT-SENTINEL` in `docs/FOLLOWUPS.md` line 76 (different sentinel, different test surface, but same shape: integration tests want sentinels that the production handlers no longer emit). Operator may choose to reopen MB-T04 territory or roll into a broader smoke-harness sentinel-wiring follow-on.

**Detail:**
- Test: `packages/dispatch-workstation/test/integration/mb-t04/spawn-modal-emits-intent.test.ts`
- Failure shape (KNOWN — observed): test waits for `SPAWN_REQUESTED <json>` sentinel from main process; sentinel never arrives; 10s timeout fires.
- Origin: MB-T04 GREEN (`9ed0233`) emitted the sentinel from spawn-ipc.ts under `MB_TEST_HOOKS=1`. MB-T05 GREEN (`6173bf8 green: MB-T05 cluster 4 — spawn-ipc handler integration`) explicitly REMOVED the test-hook stdout-echo path: `git show 6173bf8 -- packages/dispatch-workstation/src/main/spawn-ipc.ts` shows the deletion of the `SPAWN_REQUESTED` echo with the comment "REMOVED: the MB_TEST_HOOKS=1 SPAWN_REQUESTED stdout-echo path".
- The test was not updated alongside MB-T05 GREEN, so it has been silently broken since MB-T05 landed.
- Verification that this is NOT caused by Session A: the test fails identically against `origin/main` (no Session A commits applied); the spawn-ipc.ts surface that this session changes (the lazy `controllerPromise` for cairn #72) does not re-introduce the removed sentinel.

**No new followup filed.** The shape is well-tracked under the existing MB-T08 sentinel followup. If operator wants this specific MB-T04 integration test repaired or deleted, it is a small Tier-2 ticket independent of batch 6's followup scope.

## §5 Session-end summary

**Final commit list (in order, all pushed to `origin/session-A/wiring-spawn`):**

1. `2d93894` `contract: batch-6 Session A coord file — wiring-spawn scope`
2. `7ec470e` `red: cairn #72 — spawn pipeline must resolve claude bin to absolute path`
3. `f2acfbf` `green: cairn #72 — resolve claude bin to absolute path before tmux spawn`
4. `1ca36eb` `red: cairn #73 — post-spawn liveness check via tmux has-session`
5. `9a9c593` `green: cairn #73 — post-spawn liveness check via tmux has-session`
6. `65805b7` `contract: cairn #74 — MB-S02 spike-environment-validation methodology amendment`
7. `8d48e1e` `docs(followups): close MB-T05 PATH-allowlist + liveness-check + spike-env`

**Followups closed (3, all owned this session):**
- `MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION` (cairn #72) — Tier 1 ship-gate blocker; absolute-path resolution via `which claude` + `binary-resolver.ts`; KNOWN-validated for operator's env, MODELED for other install paths.
- `MB-F-MB-T05-POST-SPAWN-LIVENESS-CHECK` (cairn #73) — Tier 1 defense-in-depth; `tmux has-session` probe between `runTmuxNewSession` and `registerSession`; 500ms heuristic delay default.
- `MB-F-MB-T05-SPIKE-ENVIRONMENT-VALIDATION` (cairn #74) — Tier 2 methodology; ADR amendment at `docs/adr/MB-S02-spike-environment-validation-amendment.md`; binds future spikes touching operator-environment-dependent assumptions.

**Test counts (KNOWN — vitest output):**
- New tests added by this session: **15** (3 files in `test/unit/wiring-spawn/`):
  - `test_binary_resolver.spec.ts` — 5 tests, 100% pass.
  - `test_spawn_uses_resolved_claude_bin_path.spec.ts` — 4 tests, 100% pass.
  - `test_post_spawn_liveness_check.spec.ts` — 6 tests, 100% pass.
- Spawn-pipeline regression suite (wiring-spawn + mb-t05 + mb-t06): **21 files / 59 tests / 100% pass**. No regressions.
- Full dispatch-workstation unit suite (`pnpm test test/unit`, post-build): **72 of 73 files pass; 1 pre-existing import failure** (`test/unit/coarch-t04/build-doc-validator.spec.ts` — `Cannot find package 'dispatch-core/dist/v3/schema.js'`). Tracked under existing `MB-F-MB-T05-PRE-EXISTING-VALIDATOR-IMPORT` (FOLLOWUPS.md line 73). Resolved automatically when `pnpm -r build` is run before tests; the workstation test suite does not invoke it. Not caused by Session A.
- Full dispatch-workstation suite including integration (`pnpm test`, post-`pnpm -r build`): **87 of 88 files pass; 242 of 243 tests pass**. Single failure = the pre-existing MB-T04 integration test described in §4 CSF-A-1 above.
- Typecheck: clean (`pnpm typecheck` succeeds).

**Halt-discipline events:**
- §0 pre-flight halt-state surfaced to operator at session-start when worktree + scaffold were absent. Operator restaged. No further halts during work.
- No work performed during halt-states.

**Cross-session findings (per §4):**
- 1 pre-existing test breakage observed (MB-T04 integration test depends on removed sentinel). NOT a new regression. Not filed as new followup; well-aligned with existing `MB-F-MB-T08-SPAWN-RESULT-SENTINEL`.

**Territory discipline:**
- 0 unowned files modified.
- `main.ts` not touched (per scaffold §1 Session A note).
- Per-path `git add` used on every commit; `git add -A` not used.
- `docs/FOLLOWUPS.md` edited (per-path) with only the three new closure rows appended; no pre-existing rows touched.

**Operator-merge wait:** Branch `session-A/wiring-spawn` ready for operator merge. Per scaffold §4 sequence, Session A merges first.


---

## Session log

### 2026-05-03 session start
- Worktree confirmed clean on `session-A/wiring-spawn`.
- Coordination scaffold read end-to-end.
- Cairn findings #72/#73/#74 read end-to-end.
- Existing source under territory inventoried (spawn-env.ts, spawn-handler.ts, spawn-ipc.ts) plus existing MB-T05/MB-T06 test fixtures (will need claudeBinPath + runTmuxHasSession threaded through their dep factories during GREEN — KNOWN, not a cross-territory edit since those tests live in directories owned by Session A's followups).
- Note: the three followup IDs (`MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION`, `MB-F-MB-T05-POST-SPAWN-LIVENESS-CHECK`, `MB-F-MB-T05-SPIKE-ENVIRONMENT-VALIDATION`) are NOT yet present as rows in `docs/FOLLOWUPS.md`. Cairn entries reference them by ID. Plan: when marking resolved at session end, this session will append three closure rows to FOLLOWUPS.md so the IDs in cairn-findings.md resolve to filed records (per scaffold §0 step 2 intent). Per-path add only on FOLLOWUPS.md, only the three new rows.
- Plan: Followup #72 (spike-skip — contracts well-understood) → red → green; Followup #73 → red → green; Followup #74 → contract: ADR; FOLLOWUPS.md closure rows; full test suite; session-end summary.
