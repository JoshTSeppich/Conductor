# MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW closure-path-β — impl coord (2026-05-16)

**Session**: SESSION-r12-t1c-w1-parallel-cairn-atomic-commit
**Wave**: Round 12 / T1-CLOSURE-Wave-1 expansion cohort
**Audience**: parallel sibling sessions in Wave T1-CLOSURE-Wave-1 + future sessions consuming the helper

---

## §1 — Sibling session cross-references

[KNOWN per dispatch DISCIPLINE block + `git log --oneline -5 HEAD` after WB1]

Three sibling sessions concurrently active during this session:

| Session | Wave/role | Territory overlap | Coordination |
|---|---|---|---|
| `phase5-mount-wiring` | Wave T1-CLOSURE-Wave-1 (in-flight) | `packages/dispatch-workstation/src/main/preload.mts` (NOT in my territory) | No overlap; observed staging leak of preload.mts at WB1+WB2 pre-commit checks — defensively excluded via `commit -o -- <my-paths>`. |
| `onboarding` | Wave T1-CLOSURE-Wave-1 (in-flight) | unknown — likely `packages/dispatch-workstation/src/onboarding/` per CLAUDE.md §3.2 | No overlap observed. |
| `kanban-empty-state-ux` | Wave T1-CLOSURE-Wave-1 expansion | `packages/dispatch-web/` per dispatch DISCIPLINE | No overlap. |
| `dispatch-core-post-pull-rebuild` | Wave T1-CLOSURE-Wave-1 expansion | `scripts/post-pull-rebuild.sh` + `package.json` files | **`scripts/**` manifest-glob overlap acknowledged**. File-level: my `scripts/cairn-atomic-commit.sh` vs their `scripts/post-pull-rebuild.sh` — disjoint files. Their WB1 GREEN landed at `23f7c88` (before my WB1 `7d7a55f`); my WB1 rebased atop theirs cleanly. |

---

## §2 — Consumer guidance (sessions wanting to USE the helper)

### §2.1 — Basic invocation

```bash
# from any directory within a git working tree
scripts/cairn-atomic-commit.sh path/to/file1 path/to/file2 -- "green(MB-TXX): WB3 — short message"
```

### §2.2 — When to use vanilla git instead

Use vanilla git (NOT the helper) when:
- Commit body requires HEREDOC form (Q1-Q9 self-check blocks; multi-paragraph rationale) — see this session's WB1/WB2 commits as reference
- Commit message contains characters that would over-quote through shell expansion (backticks, nested `$()`)
- You need to amend, rebase, cherry-pick, or other non-linear git operations
- You need to push a tag or a non-main branch with custom refspec

Use the helper when:
- Routine cairn-grammar commits with short single-line messages
- WB-final docs commits (typically short titles)
- Any context where the per-path-add + race-detect + push discipline would otherwise be hand-rolled

### §2.3 — Test affordance — do NOT set in production

`CAIRN_ATOMIC_TEST_RACE_HOOK` is a test-only env var. If you find it set in your shell, `unset` it before invoking the helper:

```bash
unset CAIRN_ATOMIC_TEST_RACE_HOOK
scripts/cairn-atomic-commit.sh ...
```

The hook causes the script to `eval` arbitrary commands mid-execution; production callers must not rely on this.

### §2.4 — Exit code convention

| code | action |
|---|---|
| 0 | success; proceed to next WB |
| 2 | argument error; fix invocation + retry |
| 3 | environment error (not in git repo, etc.); investigate `git rev-parse --git-dir` |
| 4 | race detected + retry failed; surface to operator (likely indicates structural issue requiring per-session-worktrees per closure-path-α) |
| 5 | git commit failed; capture `git status` + investigate |
| 6 | git push failed; per CLAUDE.md §2.6 investigate (likely needs `git fetch` + decide rebase vs surface) |

---

## §3 — Maintainer guidance (sessions wanting to MODIFY the helper)

### §3.1 — Decisions doc precedence

Before modifying `scripts/cairn-atomic-commit.sh`, read `mb-f-parallel-cairn-atomic-commit-decisions-2026-05-16.md` (this directory). D-1 through D-6 are BINDING decisions; changing them requires operator re-arbitration.

### §3.2 — Probe locations

- `packages/dispatch-cli/test/cairn-atomic-commit/probe-mbf-pcacc-01-index-race-detection.spec.ts` — invocation contract + E2E happy path + arg-validation
- `packages/dispatch-cli/test/cairn-atomic-commit/probe-mbf-pcacc-02-pre-commit-status-check.spec.ts` — `cairn_detect_race` function-level + integration race-simulation + cross-shell

Run via:
```bash
pnpm --filter dispatch-cli exec vitest run test/cairn-atomic-commit/
```

[KNOWN per 2026-05-16T16:42Z run]: 11 probes, 11 PASS, ~1.36s.

### §3.3 — Source-with-guard pattern

The script ends with:
```bash
if [ "${BASH_SOURCE[0]:-$0}" = "${0}" ]; then
  cairn_main "$@"
fi
```

This affords sourcing for unit tests (probe-02 P1-P4 source the script + call `cairn_detect_race` directly). Modifications must preserve this guard, OR add `local`/`return` to all top-level function calls and document why the guard was removed.

### §3.4 — Bash 3.2 compatibility (D-4 binding)

If you need bash 4+ features, the decision in `mb-f-...-decisions-2026-05-16.md` D-4 must be re-arbitrated. Until then:
- No `mapfile`/`readarray`
- No associative arrays
- No `[[ -v var ]]` (use `[ -n "${var:-}" ]`)
- Test under bash 3.2 before commit: `/bin/bash --version` should show 3.2.x; run probes via `/bin/bash` not `bash` (the latter may resolve to a 4+ install on Linux).

---

## §4 — Open items for next-session pickup

[OPERATOR-ARBITRATED — not closed by this session]

1. **CLAUDE.md §2.7 amendment** — proposed in findings §V. Operator-stamp envelope.
2. **FOLLOWUPS row stamp** — proposed in findings §IV. Operator-stamp envelope.
3. **Path-α closure** (per-session worktrees) — operator-arbitrated infra change (URGENT-escalated per `6120dfd`). NOT in this session's scope.
4. **Path-γ closure** (accept-cost docs) — operator territory; documentation-only.
5. **Self-application dogfood** — see findings §III.3. Future sessions should adopt the script for routine commits; first dogfood commit could be a Tier-3 sweep ticket.
6. **bats CI integration** — Tier-3 followup `MB-F-CAIRN-ATOMIC-COMMIT-CI-INTEGRATION` (findings §I).

---

## §5 — Resumption posture

After WB-final commit lands, surface to gen-6:

```
HALT-WB-FINAL-COMPLETE-r12-t1c-w1-parallel-cairn-atomic-commit
  ladder: WB1 7d7a55f + WB2 69ea3d0 + WB-final <hash>
  Q-ATOMIC dispositions: 1=(a), 2=(a), 3=(a), 4=bash-POSIX+zsh-verified
  RESOLVED stamp proposal: see findings §IV (operator-stamp envelope)
  CLAUDE.md §2.7 amendment proposal: see findings §V (operator-stamp envelope)
  token count: under 30% utilization [MODELED]
  methodology observations: see findings §III (4 items including
    RED/GREEN-ordering question for round-12 §3.9.A consideration)
  follow-on tickets: 3 Tier-3 proposed in build doc §9
```
