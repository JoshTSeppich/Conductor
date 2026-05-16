# MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW — build doc (closure-path-β)

**Ticket**: MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW (Tier 1)
**Followup row**: `docs/FOLLOWUPS.md:348`
**Closure path**: (β) atomic stage-commit-push sequence helper with index-lock awareness
**Author session**: SESSION-r12-t1c-w1-parallel-cairn-atomic-commit (Round 12 Wave T1-CLOSURE-Wave-1 expansion cohort, gen-6 dispatch 2026-05-16)
**Status**: PARTIAL RESOLUTION — path-β implemented; paths-α/γ remain OPEN (operator-arbitrated)

Sibling closure paths (out of scope for this ticket):
- (α) migrate parallel-cairn to per-session worktrees — operator-arbitrated infrastructure change (operator URGENT-escalated per `6120dfd`)
- (γ) accept index-race as inherent cost; document recovery pattern — operator territory (documentation-only)
- (δ) T6 methodology infrastructure may close when build-freshness/bundle-fingerprint workflows graduate to atomic-commit support — observation, no scope here

---

## §1 — Problem statement

[KNOWN per FOLLOWUPS row body + T2 WB2 commit `d627096` 2026-05-12]: shared-working-tree parallel-cairn execution creates an index-race window between `git add` and `git commit`. When another sub-session's `git commit` runs between MY `git add` and MY `git commit`, the git index is rewritten and MY staged work reverts to untracked. First commit attempt fails with `error: pathspec ... did not match any file(s) known to git`.

Round 11 §5.C.3 / §5.C.5 promoted the §3.9.A commit-pathspec mandate to KNOWN-load-bearing-via-counter-example (100% mitigation rate across 10+ parallel-cairn commits in Round 12 Wave 2). This ticket operationalizes that discipline into a single command.

## §2 — Invocation contract

```
cairn-atomic-commit [options] <pathspec1> [<pathspec2>...] -- "<commit-message>"
```

Options:
- `--no-push` — skip push step (commit only)
- `--remote <name>` — push remote (default: `origin`)
- `--branch <name>` — push branch (default: current HEAD branch)
- `-h`, `--help` — usage

Exit codes:
| code | meaning |
|---|---|
| 0 | success |
| 2 | argument validation error (missing pathspec, missing message, bad flag) |
| 3 | environment error (not in git repo, `git add` failure) |
| 4 | race detected and retry could not recover |
| 5 | `git commit` failed |
| 6 | `git push` failed (single-attempt per CLAUDE.md §2.6) |

## §3 — Mechanism

1. Capture pre-add `git status --short` (informational baseline)
2. Per-path `git add -- <pathspec>` for every staged file (CLAUDE.md §2.7)
3. Capture post-add `git status --short`; verify every requested pathspec shows as staged (column 1 not space, not `?`). Renamed paths (`R  old -> new`) are matched on `new`.
4. If race detected: retry once (re-add + re-check). If still missing, abort with exit 4 + diagnostic.
5. `git commit -o -m "<msg>" -- <pathspec>...` — `-o` (`--only`) re-stages from working tree, race-protected against another session's index sweep (round-11 §5.C.3 KNOWN-load-bearing).
6. Single-attempt push (Q-ATOMIC-3 = (a)); rejection surfaces with `investigate per CLAUDE.md §2.6 (do NOT blind-retry)`.

## §4 — Test affordance

The script honors `CAIRN_ATOMIC_TEST_RACE_HOOK` env var. When set, the hook is `eval`'d after `git add` but before status capture, allowing tests to simulate concurrent index-rewrites without spawning subshells.

**Production callers MUST NOT set this env var.** Documented inline at `scripts/cairn-atomic-commit.sh` line ~145 + in probe-02 header.

## §5 — Files

| Path | Lines | Role |
|---|---|---|
| `scripts/cairn-atomic-commit.sh` | 218 | the helper itself; bash 3.2+ compatible; sourceable for unit tests |
| `packages/dispatch-cli/test/cairn-atomic-commit/probe-mbf-pcacc-01-index-race-detection.spec.ts` | 131 | WB1 RED+GREEN: existence + invocation contract + happy-path E2E |
| `packages/dispatch-cli/test/cairn-atomic-commit/probe-mbf-pcacc-02-pre-commit-status-check.spec.ts` | 206 | WB2: cairn_detect_race function-level + integration race simulation + cross-shell |

## §6 — Verification matrix

[KNOWN per local probe runs 2026-05-16T16:40Z and 16:42Z; transcripts in WB1/WB2 commit bodies]

| Probe | Coverage | Result |
|---|---|---|
| probe-01 P1 | script exists + executable | PASS |
| probe-01 P2 | happy path E2E (commit + push to bare remote) | PASS |
| probe-01 P3 | missing pathspec → exit 2 + usage | PASS |
| probe-01 P4 | missing message → exit 2 | PASS |
| probe-02 P1 | `cairn_detect_race` all staged → 0 | PASS |
| probe-02 P2 | missing pathspec → 1 + diagnostic | PASS |
| probe-02 P3 | empty pathspec list → 0 | PASS |
| probe-02 P4 | renamed-path handling | PASS |
| probe-02 P5 | transient race (one-shot hook) → retry → exit 0 | PASS |
| probe-02 P6 | persistent race → exit 4 + clear error | PASS |
| probe-02 P7 | zsh self-exec via shebang | PASS |

Cross-shell standalone smoke (Q-ATOMIC-4 belt-and-suspenders): `zsh -c "<script> --no-push z.txt -- 'zsh smoke'"` → exit 0, commit landed with subject `zsh smoke`.

## §7 — Closure stamp proposal

The following stamp text is proposed for `docs/FOLLOWUPS.md:348`. **Operator-stamp envelope** — do NOT auto-apply; surfaced for operator stamping.

> **Path-(β) RESOLVED 2026-05-16 by SESSION-r12-t1c-w1-parallel-cairn-atomic-commit at `7d7a55f` (WB1) + `69ea3d0` (WB2) + <WB-final commit hash>**. Helper at `scripts/cairn-atomic-commit.sh`; probes at `packages/dispatch-cli/test/cairn-atomic-commit/`. Path-α (per-session worktrees, operator-arbitrated infra) + path-γ (accept-cost docs) remain **OPEN**. Tier 1 row stays OPEN (downgrade-on-full-α/γ-close).

## §8 — CLAUDE.md §2.7 amendment proposal

The following amendment is proposed to surface `cairn-atomic-commit.sh` as the canonical implementation of §2.7 per-path discipline. **Operator-stamp envelope** — do NOT auto-apply; do NOT edit CLAUDE.md. Surfaced for operator review.

**Append to CLAUDE.md §2.7 after the existing paragraph**:

> **Helper (closure-path-β of MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW)**: `scripts/cairn-atomic-commit.sh` packages per-path add + race-detection + `commit -o` + single-attempt push into a single invocation. Use when authoring routine cairn-grammar commits in shared-working-tree parallel-cairn mode. Vanilla git is still acceptable when the commit message requires the HEREDOC form (for Q1-Q9 self-check blocks); use the helper for short-message commits and as a reference implementation for the discipline.

---

## §9 — Future work (Tier-3 surfaces; do not absorb into this ticket)

- **MB-F-CAIRN-ATOMIC-COMMIT-HEREDOC-SUPPORT** (Tier 3): the current contract takes `--` followed by a single positional `<msg>`. Operator workflows often need multi-paragraph commit bodies (Q1-Q9 self-check). Options: `--message-file <path>` flag, or HEREDOC stdin via `-` sentinel. Defer until usage pattern emerges.
- **MB-F-CAIRN-ATOMIC-COMMIT-CI-INTEGRATION** (Tier 3): scripts/test/cairn-atomic-commit.bats not authored (bats unavailable on operator macOS). Add CI workflow that installs bats + runs a parallel `.bats` mirror of probes if/when bats is adopted.
- **MB-F-CAIRN-ATOMIC-COMMIT-PNPM-WRAPPER** (Tier 3): expose as `pnpm cairn:commit ...` for shell-agnostic invocation from any package directory. Defer until pnpm-side discipline matures.
