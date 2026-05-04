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

(Populated as work progresses; no findings expected, but recorded if surfaced.)

## §5 Session-end summary

(Populated at session end with final commit list, test counts, halt-discipline events.)

---

## Session log

### 2026-05-03 session start
- Worktree confirmed clean on `session-A/wiring-spawn`.
- Coordination scaffold read end-to-end.
- Cairn findings #72/#73/#74 read end-to-end.
- Existing source under territory inventoried (spawn-env.ts, spawn-handler.ts, spawn-ipc.ts) plus existing MB-T05/MB-T06 test fixtures (will need claudeBinPath + runTmuxHasSession threaded through their dep factories during GREEN — KNOWN, not a cross-territory edit since those tests live in directories owned by Session A's followups).
- Note: the three followup IDs (`MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION`, `MB-F-MB-T05-POST-SPAWN-LIVENESS-CHECK`, `MB-F-MB-T05-SPIKE-ENVIRONMENT-VALIDATION`) are NOT yet present as rows in `docs/FOLLOWUPS.md`. Cairn entries reference them by ID. Plan: when marking resolved at session end, this session will append three closure rows to FOLLOWUPS.md so the IDs in cairn-findings.md resolve to filed records (per scaffold §0 step 2 intent). Per-path add only on FOLLOWUPS.md, only the three new rows.
- Plan: Followup #72 (spike-skip — contracts well-understood) → red → green; Followup #73 → red → green; Followup #74 → contract: ADR; FOLLOWUPS.md closure rows; full test suite; session-end summary.
