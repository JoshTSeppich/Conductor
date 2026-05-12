# Auto-ack §C envelope amendment — visual-comparison gate γ (proposed)

**Date:** 2026-05-12
**Authored by:** P1 sub-session at WB10
**Status:** DRAFT — proposed amendment text; ratification deferred to orchestrator landing per dispatch §3.5 visual-comparison gate addition wording
**Closes (when ratified):** dispatch §3.5 operator-manual-screenshot fallback retires (or becomes opt-out via "structural-only, no visual diff" flag)

---

## §1 — Current §C envelope (per dispatch §3.5 as of 2026-05-11)

```
`green:wiring` AUTO-ACK if all current §C conditions pass AND ONE of:
- Ticket body explicitly notes "structural-only, no visual diff" (e.g., T6
  methodology work, non-UI tickets)
- Headless screenshot generated; commit body cites screenshot path;
  visual-diff against prior commit shows expected change

`refactor:` and `docs:` unchanged.

Until T6 headless screenshot pipeline ships, this gate uses operator-
manual-screenshot as the fallback. Operator may request screenshot at
any HALT-PRE-COMMIT gate.
```

## §2 — Proposed amendment per Sub-Q-MBTMP3VVT-E=(ii) operator-acked default

`green:wiring` AUTO-ACK if all current §C conditions pass AND ONE of:

- **(a) Structural-only flag** — Ticket body explicitly notes "structural-only, no visual diff" (T6 methodology work, non-UI tickets, test-fixture changes).
- **(b) Phase 3 smoke ran** — `pnpm --filter dispatch-workstation verify:phase-3-smoke` invoked at commit boundary; commit body cites `runPhase3Smoke` summary line containing `state=<PASS|TARGET-ABSENT|FAIL|BUILD-FAILED|LAUNCH-FAILED>` and `screenshot=<path>`. State must be `PASS` OR `TARGET-ABSENT` for auto-ack; `FAIL` / `BUILD-FAILED` / `LAUNCH-FAILED` escalate to HALT-PRE-COMMIT operator review.

**Operator-manual-screenshot fallback retained as opt-out:** when the workstation's `dist/` build is not fresh OR the operator prefers manual inspection over mechanical diff, the commit body may cite a manual-screenshot path with rationale; per-WB rather than per-merge as before. Mechanical Phase 3 smoke is the new default; manual is opt-out.

**`refactor:` and `docs:` unchanged** — these commit types do not require visual verification per existing §C semantics.

## §3 — Rationale

Per `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` (`230cb6c`) closure-path-γ enumeration + dispatch §3.5 visual-comparison gate γ closure: operator-visual single-point-of-failure for runtime-verification across multiple weeks (KNOWN per operator-direct-statement 2026-05-11) is replaced by mechanical primary path. P1 ticket delivers the headless infrastructure (`verify:phase-3-smoke` CLI primitive + `runPhase3Smoke` orchestration) that makes mechanical primary path operationally viable.

Anti-fabrication §2.3 graceful-degradation contract preserved: when wireframe target image is not yet supplied by operator, `state=TARGET-ABSENT` is auto-ack-eligible (smoke captured screenshot; no diff possible; operator can inspect screenshot if desired). This handles the bootstrap period before operator uploads `wireframe-target-2026-05-11.png` (or operator-configured target).

## §4 — Ratification path

This document drafts the amendment text. Per dispatch §3.5 visual-comparison gate addition wording, the actual §C envelope amendment lands at orchestrator-arbitrated commit cycle — NOT this ticket's responsibility. P1 sub-session's role:
1. Ship the tooling (P1 WB1-WB9 complete at `132c033`).
2. Author proposed amendment text (this doc).
3. File FOLLOWUPS row 335 closure stamp (this commit).
4. Cross-reference in P1 findings doc (this commit).

Orchestrator gen-4 (or successor) may ratify the amendment per §3.5 wording at a subsequent dispatch cycle.
