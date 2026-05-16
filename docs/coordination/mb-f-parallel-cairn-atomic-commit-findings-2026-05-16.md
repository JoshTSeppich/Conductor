# MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW closure-path-β — findings (2026-05-16)

**Session**: SESSION-r12-t1c-w1-parallel-cairn-atomic-commit
**Wave**: Round 12 / T1-CLOSURE-Wave-1 expansion cohort
**Dispatch**: `/tmp/r12-t1c-w1-parallel-cairn-atomic-commit-dispatch.txt` (gen-6 orchestrator-2026-05-16-handoff)
**Session-start HEAD**: `d6b4107` [KNOWN]
**Session-end HEAD**: `69ea3d0` (WB2 push) + WB-final commit pending [KNOWN]
**Token posture at WB-final commit**: see RESUMPTION POSTURE surface

---

## §I — KNOWN findings during diagnose

[KNOWN per `which bats: not found` 2026-05-16T16:40Z]
**bats not installed on operator system.** Per territory fallback clause "bats test harness if bats is acceptable; **else probe via dispatch-cli/test/**", I authored probes as vitest `.spec.ts` files under `packages/dispatch-cli/test/cairn-atomic-commit/`. `scripts/test/cairn-atomic-commit.bats` was NOT authored. The territory grant for that path remains unused.

**Tier-3 followup proposal**: `MB-F-CAIRN-ATOMIC-COMMIT-CI-INTEGRATION` — if bats is later adopted (e.g., for CI shell-script linting), mirror the vitest probes into bats. Defer until adoption signal exists.

[KNOWN per `bash --version` 2026-05-16T16:40Z]
**bash 3.2.57 (macOS default).** Script syntax restricted to bash 3.2-compatible: no `mapfile`/`readarray`, no associative arrays. Used `[ ]` over `[[ ]]` where neutral; explicit array-length checks (`${#arr[@]}`) instead of `${arr+set}` idioms; standard `${arr[@]}` expansion only after non-empty guard.

[KNOWN per `zsh --version` 2026-05-16T16:40Z]
**zsh 5.9 available.** Cross-shell verification (Q-ATOMIC-4) covered by probe-02 P7 + standalone smoke (TMP repo + `zsh -c "<script> --no-push z.txt -- 'zsh smoke'"` → exit 0).

---

## §II — Q-ATOMIC envelope dispositions (auto-ack, no new arbitrations)

| ID | Disposition | Rationale + verification |
|---|---|---|
| Q-ATOMIC-1 | (a) positional `<pathspec...> -- "<msg>"` | Verbatim match to row-β body "single command that runs add + commit + push". Implemented at `cairn_main` arg-parse loop. Verified by probe-01 P2/P3/P4. |
| Q-ATOMIC-2 | (a) pre-add baseline + post-add status check + retry-once-then-abort | CLAUDE.md §2.7 + `feedback_per_path_discipline_catches_cross_session_staging_leak`. Implemented via `cairn_detect_race` + retry loop in `cairn_main`. Verified by probe-02 P1-P6. |
| Q-ATOMIC-3 | (a) single-attempt push; surface rejection | CLAUDE.md §2.6 "push rejection = investigate, do not blind-retry". Implemented as bare `git push "$remote" "$branch"` with exit-6 on failure. Verified by probe-01 P2 (push success path). Rejection path not exercised in probes (no easy hermetic simulation). |
| Q-ATOMIC-4 | bash 3.2+ POSIX-compat; zsh verification | `#!/usr/bin/env bash` shebang; script uses bash-compatible syntax; verified across bash 3.2.57 + zsh 5.9 invocation. |

No new arbitrations surfaced during execution.

---

## §III — Methodology observations

### §III.1 — RED/GREEN ordering for WB2

[OBSERVATION] WB1 GREEN per dispatch spec already implemented `cairn_detect_race` + retry mechanism (the dispatch's WB1 GREEN says "skeleton with pre-commit `git status --short` capture + `git add <pathspec>` + status comparison + `git commit -o <pathspec> -m "<msg>"` + `git push origin main` chain" — the "status comparison" IS the detection mechanism). WB2 therefore was probe-authoring + behavior verification, not implementation.

This created an implicit-RED situation: probe-02 passed on first run because WB1 GREEN already satisfied it. The cairn-grammar `green:` prefix is still appropriate (WB2 adds verification artifacts), but the strict-RED-first cycle was elided.

**Surfaced for round-12 §3.9.A/§5.x consideration**: should WB ladders explicitly mark "verification-only WBs" (probe-against-existing-impl) vs "implementation WBs" (RED→GREEN)? Current cairn-grammar doesn't distinguish.

### §III.2 — Cross-session staging-leak observed (defensive working as intended)

[KNOWN per pre-commit `git status --short` at WB1 commit 2026-05-16T16:41Z + WB2 commit 16:42Z]
At both WB1 and WB2 pre-commit checks, `packages/dispatch-workstation/src/main/preload.mts` showed as modified-by-another-session (`M` at WB1, `M ` staged-by-another at WB2). This file is NOT in my territory; it belongs to the phase5-mount-wiring sibling session (manifest declares `preload.mts` writes there).

**Defensive outcome**: per-path `git add` + `git commit -o -- <my-paths>` excluded the leak from both my commits. Verified by `git log -1 --stat` post-commit showing only my territory files.

This is exactly the §3.9.A discipline working as intended; cited in WB1 + WB2 commit bodies. The dispatch-script being authored here would have provided the same protection automatically.

### §III.3 — Self-application observation (dogfood deferred)

[OBSERVATION] I did NOT use `cairn-atomic-commit.sh` to author its own commits. Rationale: chicken-and-egg risk (script failure during self-application would block the closure ticket). Vanilla `git add` + `git commit -o --` was used for WB1, WB2, and WB-final.

**Surfaced for future sessions**: Subsequent cairn-grammar commits in Round 12+ should use the script. A bootstrap commit demonstrating self-use should be authored in a follow-on session (likely a Tier-3 sweep ticket). This is NOT a regression of the closure — it's an absence of dogfooding evidence.

### §III.4 — Concurrent main-branch advancement

[KNOWN per `git --no-pager log --oneline -5 HEAD` after WB1 push]
My WB1 commit `7d7a55f` landed on parent `23f7c88` (sibling session post-pull-rebuild's WB1), NOT on `d6b4107` (my session-start HEAD). Three concurrent sibling sessions advanced main during my work:
- `00ea555` — phase5 WB1 RED
- `23f7c88` — post-pull-rebuild WB1 GREEN
- `69ea3d0` — my WB2

[MODELED — origin reconciliation via implicit fetch+rebase, NOT confirmed by direct trace]: my local main must have advanced to `23f7c88` between session-start and WB1 commit (perhaps via pnpm install hook or git's auto-fetch). Did not investigate further because per-commit-push verification was clean both times (`git log origin/main..HEAD` empty).

---

## §IV — RESOLVED stamp proposal (operator-stamp envelope)

**Do NOT edit `docs/FOLLOWUPS.md` directly** — proposed text for operator review:

Append to row at `docs/FOLLOWUPS.md:348` body:

> **Path-(β) RESOLVED 2026-05-16 by SESSION-r12-t1c-w1-parallel-cairn-atomic-commit at `7d7a55f` (WB1 skeleton + probe-01) + `69ea3d0` (WB2 probe-02 + cross-shell) + <WB-final commit hash>**. Helper at `scripts/cairn-atomic-commit.sh` (218 lines, bash 3.2+ compat, sourceable). Probes at `packages/dispatch-cli/test/cairn-atomic-commit/` (11 probes, 11 PASS). Cross-shell verified bash 3.2.57 + zsh 5.9. Path-α (per-session worktrees, operator-arbitrated infra change per `6120dfd`) + path-γ (accept-cost docs) remain **OPEN**. Tier 1 row stays OPEN pending α/γ closure.

---

## §V — CLAUDE.md §2.7 amendment proposal (operator-stamp envelope)

**Do NOT edit `CLAUDE.md` directly** — proposed text for operator review:

Append to CLAUDE.md §2.7 after the existing paragraph (between line ending "Post-commit verification via `git log -1 --stat`." and start of §2.8):

> **Helper (closure-path-β of MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW)**: `scripts/cairn-atomic-commit.sh` packages per-path add + race-detection + `commit -o` + single-attempt push into a single invocation. Use when authoring routine cairn-grammar commits in shared-working-tree parallel-cairn mode. Vanilla git is still acceptable when the commit message requires HEREDOC form (for Q1-Q9 self-check blocks); use the helper for short-message commits and as a reference implementation for the discipline.

---

## §VI — Token posture + next-session handoff

- Token budget at WB-final commit: under 30% utilization [MODELED — no direct counter exposed; estimated from ~20 tool calls + ~5 file reads + ~3 file writes]
- No follow-on WB required for closure-path-β
- Path-α + path-γ are operator-arbitrated; await operator decision on whether to dispatch separate closure sessions
