# MB-T18 WB1 Index-Race Clarification

**Date:** 2026-05-07
**Subject commit:** `ecdd0e4 red(MB-T18): WB1 — scaffold tile-footer + decisions doc`
**Surfaced-from:** MB-T18 WB1 recovery (this session) + operator-arbitrated
clarification commit (this commit).

This doc clarifies that `ecdd0e4` was AUTHORED as MB-T18 WB1 but
INADVERTENTLY ABSORBED Terminal A's MB-T17 WB4 territory due to a
git-index race in the shared-working-tree parallel-cairn context. The
commit is published; the diffs are functionally correct (T17 WB4 work
is in main); the commit subject is misleading. Terminal A WILL NOT
re-commit MB-T17 WB4 because the diffs already landed. This doc is
the load-bearing record of that disposition.

---

## I. What happened (timeline, [KNOWN] from reflog)

| t | Event | sha (where applicable) |
|---|---|---|
| t0 | MB-T18 Phase 1 spike pushed | `536e206` |
| t1 | T17 WB1+WB2+WB3 shipped; T20 WB1+WB2 shipped | `ffe0dc7`..`90cd05b` |
| t2 | This session began MB-T18 WB1 authoring | (working) |
| t3 | This session ran `git add` of 4 explicit MB-T18 paths | (index = 4 paths) |
| t4 | This session ran `git --no-pager diff --cached --stat` → confirmed 4 paths staged | (index = 4 paths, [KNOWN]) |
| t5 | This session ran `git status --short` → confirmed 4 staged + 7 unstaged from T17 + 2 unstaged from T20 | (working tree snapshot, [KNOWN]) |
| t6 | **Terminal A ran `git add` of 7 MB-T17 WB4 paths from a parallel shell** | (index = 11 paths, [INFERRED-FROM-EVIDENCE]) |
| t7 | This session ran `git commit -m "..."` | `ecdd0e4` (11-file commit) |
| t8 | This session ran `git --no-pager log -1 --stat` post-commit verification → discovered 11-file commit | (incident discovered) |

The race window between t5 (status snapshot) and t7 (commit) was
hundreds of milliseconds — sufficient for Terminal A to stage their
WB4 paths into the SHARED git index between this session's snapshot
and commit.

## II. Files in `ecdd0e4` ([KNOWN] from `git show --numstat ecdd0e4`)

**MB-T18 territory (this session, intended):**

| File | Lines |
|---|---|
| `docs/coordination/mb-t18-decisions-2026-05-07.md` | +174 |
| `packages/dispatch-workstation/src/tile-grid/tile-footer.tsx` | +52 |
| `packages/dispatch-workstation/test/unit/tile-footer/probe-00-module-loads.spec.tsx` | +53 |
| `packages/dispatch-workstation/tsconfig.json` | +1 / -1 |

**MB-T17 WB4 territory (Terminal A, unintentionally absorbed):**

| File | Lines | T17 purpose |
|---|---|---|
| `docs/FOLLOWUPS.md` | +1 / -1 | T17 WB4 closes `MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION` |
| `packages/dispatch-workstation/src/main/main.ts` | +35 | T17 WB4 sentinel zone for autopilot IPC |
| `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx` | +43 | T17 WB4 `autopilotBridge` adapter + `renderAutopilotSlot` closure |
| `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` | +8 | T17 WB4 `renderAutopilotSlot?` prop pass-through |
| `packages/dispatch-workstation/src/tile-grid/tile.tsx` | +13 / -1 | T17 WB4 `renderAutopilotSlot?` prop on TileProps + render-prop wrapper |
| `packages/dispatch-workstation/test/unit/tile-grid-app/probe-05-autopilot-bridge-adapter.spec.tsx` | +132 | T17 WB4 integration tests |
| `packages/dispatch-workstation/test/unit/tile-grid-tile/probe-07-autopilot-slot-integration.spec.tsx` | +146 | T17 WB4 integration tests |

Total: 4 MB-T18 paths (intended) + 7 MB-T17 WB4 paths (unintentionally
absorbed) = 11 paths, +658 / -3.

## III. Root cause [KNOWN]

The git index is a **per-checkout, NOT per-process** resource. When
multiple shells operate on the same checkout (shared working tree
across parallel-cairn sessions), they all share `.git/index`. Each
shell's `git add` mutates the shared index; each shell's `git commit`
captures whatever is in the shared index at the moment it runs.

CLAUDE.md §2.7 prescribes per-path `git add <path>` to avoid sweeping
unstaged work — and that discipline IS sufficient to protect against
THIS session's accidental sweeps. **It is NOT sufficient to protect
against a different session's `git add` happening between this
session's pre-commit territory check and this session's commit.**

The race window:
1. Session B (this session) `git add <B paths>` → index has B paths.
2. Session B `git status --short` → snapshot shows B staged, A unstaged.
3. **Session A (Terminal A) `git add <A paths>` → index now has B + A paths.**
4. Session B `git commit -m "B subject"` → commit captures B + A paths
   under B's subject.

**Terminal C observed the symptom from their angle** and filed
`MB-F-T20-LOCAL-HEAD-DIVERGENCE-MECHANISM` (FOLLOWUPS.md:130, Tier 3)
flagging the local-vs-origin divergence around this incident with
"root cause unidentified." This doc identifies the root cause as the
shared-index race; the divergence Terminal C observed is the
downstream consequence (their `git pull` rebased onto ecdd0e4 even
though ecdd0e4 wasn't authored or expected by them).

## IV. Forward fix [KNOWN — applied at this commit forward]

**Atomic-chain commit pattern:** every cairn-grammar commit chains
`git add → diff verify → commit` in a SINGLE shell invocation, so no
other session can mutate the index between the verify and the commit.

```bash
git add <explicit-paths> && \
git diff --cached --name-only | sort > /tmp/intended-staged.txt && \
printf '<expected-paths>\n' | sort > /tmp/intended-list.txt && \
diff /tmp/intended-staged.txt /tmp/intended-list.txt && \
git commit -m "<subject>...<body>" && \
git --no-pager log -1 --name-only && \
git push origin main && \
git --no-pager log --oneline origin/main..HEAD
```

If `diff` between the two intended-paths files is non-empty (i.e.,
index has more or fewer paths than expected), the chain aborts via
`set -e`-equivalent semantics (`&&`). The commit does not happen;
the operator surfaces the contamination explicitly.

**Pre-commit `git status --short` discipline still applies** as a
surface-awareness pass for which other sessions are active and what
territories are dirty. But it is no longer treated as the
authoritative pre-commit verification — that role moves to the
post-`git add` `git diff --cached --name-only` check INSIDE the
atomic chain.

**Q7 self-check protocol revision:** the answer to "Touched files
another parallel session might modify?" is now answered against
`git log -1 --name-only` POST-commit, comparing against an explicit
intended-path list. If the post-commit set differs from intent,
operator MUST be surfaced before push.

## V. Disposition

**Terminal A (MB-T17 WB4) is COMPLETE.** Their WB4 diffs are at
`ecdd0e4`. They will NOT re-commit those changes. T17 WB5 (findings
doc) lands on top of `ecdd0e4` as a fresh commit; T17 ladder is
otherwise unaffected.

**This session (MB-T18) acknowledges `ecdd0e4` as a discipline-gap
commit** — the SUBJECT (`red(MB-T18): WB1 — scaffold tile-footer +
decisions doc`) is accurate-but-incomplete; the actual diff captures
both MB-T18 WB1 and MB-T17 WB4. Future readers consulting `git log`
should consult this clarification doc + the published commit body's
Q7 entry to understand the contamination.

**No force-push. No revert. No rewrite.** The historical record stays
honest; this clarification commit is the load-bearing audit trail.

## VI. Cross-reference

- `MB-F-T20-LOCAL-HEAD-DIVERGENCE-MECHANISM` (FOLLOWUPS.md:130, Tier 3)
  — Terminal C's downstream observation of this same incident.
  Filed under "root cause unidentified"; this doc IDENTIFIES the root
  cause as the shared-index race documented in §III.
- `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (FOLLOWUPS.md, this
  commit) — Tier 1 methodology followup encoding the §IV forward fix.
- `MB-F-PARALLEL-CAIRN-SCHEMA-FILE-MERGE-CONFLICT` (FOLLOWUPS.md:151,
  Tier 1) — prior parallel-cairn methodology lesson; same Tier; this
  followup belongs in the same load-bearing-discipline category.

## VII. References

- `ecdd0e4` commit body Q7 — the territory check that was honored at
  pre-commit but invalidated by the post-snapshot index race.
- `git --no-pager reflog -10` at incident time — the evidence for
  the race timing (HEAD@{2}: reset, HEAD@{1}: T20 WB3, HEAD@{0}: my
  reset that misfired).
- CLAUDE.md §2.7 (per-path git operations), §2.9 (bidirectional
  territory fences), §4.3 (cross-session coordination).
- Operator brief 2026-05-07: authorized "Option 1: Accept + add
  clarifying commit" + atomic-chain forward methodology.
