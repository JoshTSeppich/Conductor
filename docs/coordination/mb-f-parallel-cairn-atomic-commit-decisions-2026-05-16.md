# MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW closure-path-β — decisions (2026-05-16)

**Session**: SESSION-r12-t1c-w1-parallel-cairn-atomic-commit
**Wave**: Round 12 / T1-CLOSURE-Wave-1 expansion cohort
**Decisions log for**: closure-path-(β) atomic stage-commit-push helper

This document records BINDING decisions made by this session under the Q-ATOMIC envelope. All decisions were AUTO-ACK per dispatch HALT 0 + verified by probes during WB1/WB2. Future sessions modifying `scripts/cairn-atomic-commit.sh` MUST cite this doc OR surface to operator for re-arbitration.

---

## D-1 — Invocation contract: positional pathspecs + `--` separator + message (Q-ATOMIC-1 = (a))

**Decision**: The script accepts pathspecs as positional args, then a literal `--`, then a single positional commit message. Options (`--no-push`, `--remote`, `--branch`, `-h`/`--help`) may precede pathspecs.

```
cairn-atomic-commit [options] <pathspec1> [<pathspec2>...] -- "<commit-message>"
```

**Rejected alternatives**:
- (b) Named flags (`--add <pathspec> --commit-message "<text>"`) — verbose; obscures the "atomic single command" intent of the row body.
- (c) Sub-commands (`stage` / `commit` / `push`) — breaks atomicity; defeats the closure-path-β purpose.

**Rationale**: row-β body says "single command that runs `git add` + `git commit` + `git push`". Positional form is the minimal-friction shape matching that wording. The `--` separator avoids ambiguity with pathspecs that start with `-` (and matches git's own pathspec-separator convention).

**Binding**: any change requires operator arbitration (re-open the Q-ATOMIC-1 envelope).

---

## D-2 — Race-detection: pre-add baseline + post-add `git status --short` comparison + retry-once-then-abort (Q-ATOMIC-2 = (a))

**Decision**: After per-path `git add`, the script captures `git status --short` and verifies every requested pathspec shows column-1 ∈ \{A,M,D,R,T,C\} (i.e., staged). If any pathspec is missing (race detected), retry once: re-add + re-check. If still missing, abort with exit 4.

**Rejected alternatives**:
- (b) `flock` on `.git/index` — cross-session-coordination-via-fs-lock is an antipattern in parallel-cairn shared-tree mode. Adds OS-portability headaches (`flock` is Linux-leaning; macOS has different semantics).
- (c) Loop with bounded retries (>1) — over-retries mask real bugs; one retry covers transient race; persistent race indicates structural issue requiring operator attention.

**Rationale**: aligns CLAUDE.md §2.7 + memory `feedback_per_path_discipline_catches_cross_session_staging_leak` 4-step pattern (add → status → reset → commit -o). The `-o` commit step is itself race-protected (re-stages from working tree); the detection layer adds visibility into when the race occurred.

**Binding**: any change to retry count, abort threshold, or detection mechanism requires operator arbitration.

---

## D-3 — Push: single-attempt; surface rejection (Q-ATOMIC-3 = (a))

**Decision**: After commit, the script runs `git push <remote> <branch>` exactly once. On failure (exit non-zero), exit with code 6 + diagnostic `git push <remote> <branch> failed; investigate per CLAUDE.md §2.6 (do NOT blind-retry)`.

**Rejected alternative**:
- (b) Retry-once with `git pull --rebase --autostash` between attempts — masks legitimate concurrent-change errors; conflicts with CLAUDE.md §2.6 directive "push rejection = investigate, do not blind-retry".

**Rationale**: push rejection in parallel-cairn means another session pushed concurrently; the right response is to fetch + investigate + decide whether to rebase or surface to operator, NOT to auto-rebase blindly (which could merge in another session's work-in-progress).

**Binding**: any auto-retry mechanism (even single-shot rebase) requires operator arbitration.

---

## D-4 — Shell compatibility: bash 3.2+ POSIX-compat; zsh-via-shebang (Q-ATOMIC-4)

**Decision**: Script uses `#!/usr/bin/env bash` shebang. Syntax restricted to bash 3.2+ compatible features:
- No `mapfile`/`readarray` (bash 4+)
- No associative arrays (bash 4+)
- Standard indexed arrays only
- `[ ]` preferred over `[[ ]]` where neutral
- Explicit non-empty guards before `${arr[@]}` expansion

Invocation from zsh parent shell works via shebang self-exec (verified probe-02 P7 + standalone smoke).

**Rationale**: operator runs zsh 5.9 (interactive); macOS bash is 3.2.57 (default). Script must run in both contexts. POSIX-compat ensures portability if/when the script migrates to CI (Linux bash 4/5).

**Binding**: any use of bash 4+ features requires either (i) raising the shebang to `#!/bin/bash` with documented minimum version, or (ii) operator arbitration.

---

## D-5 — Test affordance: `CAIRN_ATOMIC_TEST_RACE_HOOK` env var

**Decision**: The script `eval`'s `$CAIRN_ATOMIC_TEST_RACE_HOOK` (if set) between `git add` and the post-add status capture. This allows tests to inject simulated index-rewrites without spawning subshells.

**Production constraint**: Callers MUST NOT set this env var. Documented inline at `scripts/cairn-atomic-commit.sh:145` + at probe-02 header.

**Rejected alternative**: subshell-based race injection (forked process running `git commit --allow-empty` mid-script) — non-deterministic (race-condition timing), and the dispatch's example (`git commit --allow-empty`) doesn't actually sweep staged content, so wouldn't trigger the detection.

**Binding**: removal of this affordance requires re-authoring probe-02. Renaming the env var is acceptable but requires updating both the script comment + probe-02 references.

---

## D-6 — Probe location: vitest under `packages/dispatch-cli/test/cairn-atomic-commit/`

**Decision**: Probes are vitest `.spec.ts` files under `packages/dispatch-cli/test/cairn-atomic-commit/`, NOT bats files under `scripts/test/`. Territory granted both paths; chose vitest per territory fallback clause "bats test harness if bats is acceptable; **else probe via dispatch-cli/test/**".

**Rationale**: `which bats` returned `not found` on operator system. Authoring a `.bats` file that no one can run is dead code.

**Future**: see `MB-F-CAIRN-ATOMIC-COMMIT-CI-INTEGRATION` Tier-3 followup proposal in findings doc §I.

**Binding**: if bats is later adopted, the vitest probes should be mirrored to bats; do NOT replace.

---

## §Z — Cross-doc references

- Findings: `docs/coordination/mb-f-parallel-cairn-atomic-commit-findings-2026-05-16.md`
- Build doc: `docs/build-docs/CONDUCTOR_MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW_BUILD.md`
- Impl coord: `docs/coordination/mb-f-parallel-cairn-atomic-commit-impl-coord-2026-05-16.md`
- Followups row: `docs/FOLLOWUPS.md:348` (operator-stamp envelope; see findings §IV)
- CLAUDE.md amendment proposal: findings §V (operator-stamp envelope)
