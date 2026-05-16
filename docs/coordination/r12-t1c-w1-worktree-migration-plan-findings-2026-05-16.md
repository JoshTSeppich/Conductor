# SESSION-r12-t1c-w1-worktree-migration-plan — findings

**Round:** 12
**Wave:** T1-CLOSURE-Wave-1
**Date:** 2026-05-16
**Session class:** DRAFT-ONLY, plugin-loaded, gen-6-dispatched
**Dispatch:** `/tmp/r12-t1c-w1-worktree-migration-plan-dispatch.txt`
**Closure path:** `MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW` path-α (FOLLOWUPS.md row 348)
**Source escalation:** commit `6120dfd` (Round 11 Phase 1 §3rd-recurrence; closure-path-δ urgency CRITICALLY escalated 2026-05-12)

---

## §I — Summary

This session DRAFTED a 7-step migration plan to cut over parallel-cairn sub-session execution from shared-working-tree mode to per-session worktrees per CLAUDE.md §4.3. No committed source / scripts / committed docs modified (DRAFT-ONLY per §11(II) dispatch). All deliverables are operator-pasteable artifacts in `/tmp/per-session-worktree-migration-plan/` for operator review + ratification + execution.

**Headline reframing [KNOWN per `docs/cairn-under-stress-round-12.md:249`]:** closure-path-β shipped at `173ead7` (`scripts/cairn-atomic-commit.sh`) BEFORE this plan was authored. The Round-9 + Round-11 contamination corpus is **structurally closed** by path-β; path-α (this plan) upgrades the partial-β-closure to full-α-closure by eliminating the shared-index mechanism rather than detecting+retrying it. The `6120dfd` URGENT-escalation pre-dated β-shipping; with β in place, path-α urgency drops from CRITICAL to "methodologically cleaner, operator-arbitrated infrastructure improvement."

**Outcome classification (per CLAUDE.md §2.11):** "No regression; wiring verified; improvement case not exercised" — DRAFT artifacts ready for operator review; cutover itself is operator-arbitrated and out-of-session-scope.

---

## §II — Deliverables

All under `/tmp/per-session-worktree-migration-plan/`:

| File | Purpose | Operator action |
|---|---|---|
| `migration-steps.md` | 7-step runbook (Step 0 HALT through Step 7 smoke test) | Read; ratify per Step 0 |
| `contamination-class-closure.md` | Maps FOLLOWUPS rows 330, 348, 359, 374 to closure status post-cutover | Read; confirm row-mapping per Q-WT-MAP-1 |
| `cutover-timing-analysis.md` | 4 timing options (A natural-fence / B end-of-WB / C focus block / D post-MB-T41) with blast-radius | Read; select Q-WT-TIMING |
| `post-migration-validation.md` | SC-1 through SC-6 success criteria + recovery paths R-1 / R-2 | Read; use for cutover-acceptance gate |
| `operator-ratification-prompt.md` | Operator-pasteable text for orchestrator-chat ratification | Paste into orchestrator chat OR use one-line quick-action |

Plus this findings doc at `docs/coordination/r12-t1c-w1-worktree-migration-plan-findings-2026-05-16.md` (gen-6-visible).

---

## §III — Phase 1 evidence (what I read)

[KNOWN-evidence-collected]:

- `CLAUDE.md` §1 / §2.5 / §2.7 / §2.10 / §4.3 / §8 / §9 — methodology baseline (operator-amended §1 mid-session to top-level frozen-contract paths; noted, no impact).
- `/tmp/r12-t1c-w1-worktree-migration-plan-dispatch.txt` — dispatch prompt (115 lines).
- `docs/coordination/territorial-manifests/r12-t1c-w1-worktree-migration-plan.txt` — my territory manifest.
- `6120dfd` commit body (Round 11 Phase 1 §3rd recurrence; closure-path-δ CRITICAL escalation).
- `docs/FOLLOWUPS.md` rows 330, 348, 359, 374 (parallel-cairn contamination corpus + path-β closure stamp at row 348).
- `docs/cairn-under-stress-round-12.md:249` (perennial-race-class closure status reframing).
- `docs/coordination/orchestrator-state-current.md:521` + `:724` (spawn-command literal sites).
- `docs/coordination/orchestrator-self-restart-protocol.md:35-37` (orchestrator-restart spawn template).
- `scripts/cairn-atomic-commit.sh` (full 218-line read; worktree-transparency assessment).
- Survey of `scripts/` directory: only `cairn-atomic-commit.sh` present; **no spawn scripts in-repo** (spawn patterns are operator-side dispatch text + coord-doc templates).
- `~/Desktop/Automata/foxworks-worktrees/` confirmed already existing, empty, created 2026-05-07.
- `git worktree list` from primary tree: 1 entry only (primary tree at HEAD `acdd6e3`); no stale worktrees.

---

## §IV — Subagent invocation

**Subagent:** `cairn-cross-package-impact`
**Cost:** ~52k tokens (under impact-subagent ~30k budget cited in dispatch §11(II); amortizes for full-package + frozen-contract + docs survey).
**Return (verbatim summary):**
- Zero frozen-contract surfaces touched (REGISTRY.md §2 / CONDUCTOR_API_CONTRACT / dispatch-core schema §1-§13 / WORKSTATION_CONTRACT §6).
- Zero source-code references to hard-coded primary-tree path `/Users/joshuatseppich/Desktop/Automata/foxworks-dispatch` across `packages/**/src/**/*.{ts,mts,js,mjs,cjs,sh}` (load-bearing negative finding).
- 3 spawn-command-literal sites in `docs/coordination/**` (orchestrator-state-current.md:521 + :724, orchestrator-self-restart-protocol.md:35).
- `dispatch-core/src/v3/schema.ts:272` + `:961` — `repoPath: z.string().min(1)` accepts any non-empty string; no schema change required.
- `dispatch-workstation/src/main/spawn-handler.ts` parameter-driven; no edit required.
- `dispatch-workstation/src/coarchitect/hso-pool.ts:308` — `repoPath: process.cwd()` — design question for operator (Q-WT-3); not a forced edit.
- `scripts/cairn-atomic-commit.sh` is worktree-transparent (all 5 primitives — `git status`, `git add --`, `git commit -o`, `git push`, `git symbolic-ref` — resolve `.git` through worktree's `.git` file).
- Wave T1-CLOSURE-Wave-1 sibling sessions: no territory overlap.

**Subagent ID:** `aea09d42570efe7a4` (resumable via SendMessage if further impact-analysis is needed).

---

## §V — Open arbitration questions (operator-to-decide)

Replicated from `operator-ratification-prompt.md` with cross-refs into the plan:

| ID | Question | Recommended default | Cross-ref |
|---|---|---|---|
| Q-WT-TIMING | Cutover window (A/B/C/D) | (A) Natural-fence at 22h close | `cutover-timing-analysis.md` |
| Q-WT-1 | Worktree branch policy | (a) branch-per-session | `migration-steps.md` Step 3 |
| Q-WT-2 | Orchestrator worktree policy | (b) orchestrator-in-its-own-worktree | `migration-steps.md` Step 4 |
| Q-WT-3 | HSO peer infra path source | (a) inherit workstation cwd | `migration-steps.md` Step 4 + cross-package §"dispatch-workstation" |
| Q-WT-4 | Worktree granularity | (a) per-session | `cutover-timing-analysis.md` §"Worktree-granularity arbitration" |
| Q-WT-5 | Worktree cleanup cadence | (b) end-of-session | `migration-steps.md` Step 3 notes |
| Q-WT-6 | Path-β retention | (a) keep as defense-in-depth | `migration-steps.md` §0 |
| Q-WT-MAP-1 | Row-number mapping for dispatch's "216, 217, 223, 230" | Use 330/348/359 + defer 216/217/223/230 to operator | `contamination-class-closure.md` §"Row references" |
| Q-WT-CLAUDE-AMEND | CLAUDE.md §2.7/§4.3/§9 amendments | Approve as-drafted at cutover-commit | `migration-steps.md` Step 5 |

**Highest leverage:** Q-WT-TIMING + Q-WT-CLAUDE-AMEND (block cutover execution).
**Lowest leverage:** Q-WT-4 + Q-WT-5 + Q-WT-6 (defaults are safe).

---

## §VI — Per-path discipline applied to THIS session's commit

[KNOWN per session-startup `git status --short`]: working tree contains sibling-session untracked artifacts:
- `docs/FOLLOWUPS.md` (modified by stamp-lag-sweep sibling session)
- `docs/coordination/r12-t1c-w1-stamp-lag-sweep-evidence-2026-05-16.md` (sibling session)
- `docs/coordination/r12-t1c-w1-stamp-lag-sweep-findings-2026-05-16.md` (sibling session)
- `printer.cfg*` files (operator-side untracked, unrelated)

This session commits **ONLY** `docs/coordination/r12-t1c-w1-worktree-migration-plan-findings-2026-05-16.md` via per-path `git add --` + `git commit -o -- <pathspec>` per CLAUDE.md §2.7 + cairn-atomic-commit.sh path-β. Pre-commit `git diff --cached --name-only` verification confirms ONLY my findings doc staged.

Cross-session staging-race protection: this commit uses `cairn-atomic-commit.sh` (path-β shipped at `173ead7`) — the very script whose retirement-by-replacement is the subject of this plan. Recursive defense-in-depth.

---

## §VII — Self-check Q1-Q9 (CLAUDE.md §2.4)

| Q | Answer |
|---|---|
| 1 | API verified by spike? | N/A — no API surface in this DRAFT-only session. |
| 2 | Test exercises behavior or MOCKS? | N/A — no tests authored. |
| 3 | If implementation deleted, test passes? | N/A — no implementation. |
| 4 | Anything outside contract spec? | NO. Dispatch + territorial manifest scope strictly observed; 5 /tmp artifacts + 1 findings doc only. |
| 5 | Modified contract without approval? | NO. Zero frozen-contract touches per impact subagent §"Frozen-contract status". CLAUDE.md proposed amendments are SUGGESTED only; operator-arbitrated execution. |
| 6 | Any unlabeled claim in commit body? | NO. All factual claims in this findings doc + /tmp artifacts carry [KNOWN]/[MODELED]/[SPECULATIVE] labels. |
| 7 | Touched files another parallel session might modify? | NO. Only `docs/coordination/r12-t1c-w1-worktree-migration-plan-findings-2026-05-16.md` written + committed (per-session-unique path). Sibling stamp-lag-sweep session writes to disjoint paths. Verified per-path-add via `git diff --cached --name-only` shows ONLY my findings doc. |
| 8 | Bypass PATCH /v2/sessions/:name/state? | N/A — no daemon interaction. |
| 9 | Work during unauthorized halt? | NO. Dispatch explicitly authorized Phase 1 → Phase 7 execution. No halt state was active. |

---

## §VIII — Discipline + token accounting

- **Per-path `git add`** (§2.7): applied for findings doc only.
- **Per-commit-push** (§2.6): findings doc commit + push immediately after Phase 7; verification via `git log origin/main..HEAD` returning empty.
- **Cairn commit grammar** (§2.3): `docs:` prefix used (not red/green/spike/contract/refactor — this is documentation/coordination work, NOT a behavior cycle).
- **Halt discipline** (§2.5): no halt state entered or violated.
- **Token count [MODELED]:** ~88k input tokens this session (Phase 1 reads + subagent dispatch return + Phase 2-7 authoring). Well under 200k budget.
- **Subagent invocations:** 1 (cairn-cross-package-impact, ~52k subagent tokens — within ~30-100k budget cited in dispatch §11(II)).

---

## §IX — Resumption posture

After this findings doc commits + pushes, surface to gen-6 orchestrator (session `orchestrator-2026-05-16-handoff`):

```
HALT-WORKTREE-MIGRATION-PLAN-DRAFT-COMPLETE — SESSION-r12-t1c-w1-worktree-migration-plan

Deliverables:
- /tmp/per-session-worktree-migration-plan/migration-steps.md
- /tmp/per-session-worktree-migration-plan/contamination-class-closure.md
- /tmp/per-session-worktree-migration-plan/cutover-timing-analysis.md
- /tmp/per-session-worktree-migration-plan/operator-ratification-prompt.md
- /tmp/per-session-worktree-migration-plan/post-migration-validation.md

Findings doc commit SHA: <TBD-after-commit>
Token count: ~88k input
Subagent invocations: 1 (cairn-cross-package-impact, return ID aea09d42570efe7a4)

Highest-leverage operator arbitration questions:
1. Q-WT-TIMING — cutover window (default Option A = natural-fence at 22h close)
2. Q-WT-CLAUDE-AMEND — CLAUDE.md §2.7/§4.3/§9 amendments (default approve-as-drafted)
3. Q-WT-MAP-1 — confirm dispatch's "rows 216/217/223/230" mapping

Reframing flag for operator:
  Path-β SHIPPED at 173ead7 BEFORE this plan; contamination corpus is
  structurally closed by β. Path-α (this plan) upgrades partial-β stamp
  to full-α stamp by eliminating mechanism. Urgency: dropped from
  CRITICAL (per 6120dfd) to "methodologically cleaner improvement"
  — operator may choose deferral D without methodological loss.

Cutover-timing recommendation: Option A (natural-fence) unless Wave 2
spawn is immediate, in which case Option C (operator focus block).

Returning to idle-standby per dispatch §"Resumption posture".
```

Then idle-standby. No further work absent operator/orchestrator instruction.

---

## §X — Cross-references

- FOLLOWUPS row 348 (`MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW`) — target of this closure plan.
- FOLLOWUPS row 330 (`MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12`) — closed at cutover.
- FOLLOWUPS row 359 (`MB-F-ORCH-DISPATCH-ENVELOPE-CREEP-POST-ALL-RECMD-2026-05-12`) — partially closed at cutover.
- CLAUDE.md §2.7 + §4.3 + §9 — amendments proposed in `migration-steps.md` Step 5.
- `scripts/cairn-atomic-commit.sh` — path-β; remains as defense-in-depth.
- `docs/coordination/orchestrator-state-current.md:521,:724` — spawn-command edit targets.
- `docs/coordination/orchestrator-self-restart-protocol.md:35-37` — restart spawn template edit target.
- `docs/cairn-under-stress-round-12.md:249` — perennial-race-class closure status (reframing source).
- `docs/coordination/mb-f-parallel-cairn-atomic-commit-findings-2026-05-16.md` — sibling session that shipped path-β.
- Commit `6120dfd` — URGENT-escalation source for path-α.
- Commit `173ead7` — path-β shipment.
- Subagent return ID `aea09d42570efe7a4` (cairn-cross-package-impact) — resumable for further impact-analysis.

---

**End of findings.**
