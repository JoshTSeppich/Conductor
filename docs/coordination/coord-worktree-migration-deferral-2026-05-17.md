# Operator decision: worktree migration (path-α) DEFERRED

**Operator:** Joshua Seppich
**Date:** 2026-05-17 ~17:00 MDT
**Subject:** FOLLOWUPS:348 path-α (per-session worktree migration) — DEFERRED with re-evaluation gate
**Draft source:** /tmp/per-session-worktree-migration-plan/ (gen-6 cascade-mid session r12-t1c-w1-worktree-migration-plan, 2026-05-16)

---

## Context

Gen-6 cascade-mid draft session produced comprehensive migration plan at /tmp/per-session-worktree-migration-plan/ (5 files, ~38KB):
- migration-steps.md (7-step runbook)
- contamination-class-closure.md (closure mapping for rows 330, 348, 359, 374)
- cutover-timing-analysis.md (4 timing options with blast-radius analysis)
- operator-ratification-prompt.md (paste-ready ratification text)
- post-migration-validation.md (6 success criteria + 2 recovery paths)

Draft is operationally serious with explicit rollback paths, 7 arbitration questions, and honest urgency reframing.

---

## Decision: DEFER

Per gen-6's own honest reframing in cutover-timing-analysis.md §"Constraint: existing path-β closure changes the urgency curve":

> "Closure-path-β shipped at 173ead7 (scripts/cairn-atomic-commit.sh); the Round-9 + Round-11 incident corpus is **structurally closed** without path-α. The 6120dfd URGENT-escalation pre-dated path-β's shipping; with path-β in place, path-α urgency drops from 'CRITICAL' to 'high-value-but-defense-in-depth'."

The original 6120dfd URGENT-escalation predated path-β shipping. With path-β operative:
- Path-α is a methodological-cleanliness improvement (eliminates mechanism vs detects+retries)
- Not a critical-path closure
- FOLLOWUPS:348 PARTIAL-RESOLVED-BY-PATH-BETA stamp is the honest current state

Additionally: gen-6's recommended Option (A) "natural-fence at 22h-cascade close" (~05/17 08:00 MDT) timing has already passed. Current state: v4 high-concurrency cascade in flight at 12-cap; mid-cascade worktree migration would introduce real disruption risk.

---

## Re-evaluation gate

Path-α to be re-evaluated when ANY of the following fires:
1. Current Round 12 v4 high-concurrency cascade closes naturally (cascade drain to TERMINATE-CASCADE-READY)
2. Path-β observably fails under v4 stress AND failure cannot be addressed by path-β refinement
3. Operator schedules deliberate 2-4 hour focus block for cutover

Whichever fires first.

v4 cascade SERVES as the path-β stress test at 12-cap concurrency. Results inform path-α urgency calculus.

---

## FOLLOWUPS:348 status preserved

Row 348 remains PARTIAL-RESOLVED-BY-PATH-BETA. No closure-α stamp at this time.

Rows 330, 359, 374 stamps deferred to actual cutover.

---

## Draft preservation

Gen-6 draft artifacts at /tmp/per-session-worktree-migration-plan/ are preserved for use at actual cutover. Files persist as long as /tmp/ persists. If lost, draft can be re-authored from this decision doc + cairn-under-stress-round-12.md §"path-β" anchor + 6120dfd commit body.

Future cutover operator-session reads these files + executes migration-steps.md Steps 1-7.

---

## Default-set for future cutover (when re-evaluation gate fires)

If/when path-α is executed, these defaults apply unless operator overrides at cutover time:

| Question | Default |
|---|---|
| Q-WT-TIMING | Operator-discretion per re-evaluation-gate trigger |
| Q-WT-2 (orchestrator policy) | (b) orchestrator-in-its-own-worktree |
| Q-WT-3 (HSO peer infra) | (a) inherit workstation cwd (no packages/ change) |
| Q-WT-1 (branch policy) | (a) branch-per-session |
| Q-WT-4 (granularity) | (a) per-session |
| Q-WT-5 (cleanup cadence) | (b) end-of-session |
| Q-WT-6 (path-β retention) | (a) keep — defense-in-depth |
| Q-WT-MAP-1 (row mapping) | Use 330/348/359/374 per gen-6 survey |
| Q-WT-CLAUDE-AMEND | Approve as-drafted in migration-steps.md Step 5 |

---

## Path-β remains the working defense

scripts/cairn-atomic-commit.sh at 173ead7 continues protecting parallel-cairn production workflow. Round 12 v4 cascade tests path-β at 12-cap concurrency. If path-β holds through v4 stress, path-α can defer indefinitely as defense-in-depth-not-required.

---

## Methodology evidence

This decision is itself cairn-methodology evidence:
- Anti-fabrication: operator decision based on gen-6's own honest urgency-reframing rather than executing because-dispatch-said-so
- Disciplined deferral with explicit re-evaluation gate (not silent dropping)
- Operator preserves the draft work (not discarded)
- Stamp explicit on FOLLOWUPS:348 PARTIAL-RESOLVED-BY-PATH-BETA preserved

Candidate Round 12 §1 incident class: "operator-decision-on-deferral-with-re-evaluation-gate" — disciplined-non-execution pattern.

