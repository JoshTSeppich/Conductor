# MB-F-T25-PLAN-USAGE-ROUNDTRIP-INTEGRATION-TEST-STALE-AFTER-T9-AUTOWIRE — WB-final decisions

**Session:** r12-cw2-t25-plan-usage-roundtrip-test
**Date:** 2026-05-17

---

## Q-MBF-T25PURT-1 — Fix option (multi-subscriber refactor vs opt-out)

**Question:** Update fake bridge to multi-subscriber + assertions (Option 1) OR pass `renderPlanTimerText: undefined` opt-out (Option 2)?

**Disposition:** Option 1 — multi-subscriber refactor.

**Rationale:**
- Operator-recommended per FOLLOWUPS:370 row body ("more representative of production multi-subscriber semantics").
- Option 2 papers over the contract drift; future production fan-out additions (T26 cost-meter, T27 mix-indicator already share parent-bridge patterns) would re-create the same single-slot displacement.
- Option 1 diff size (24 insertions / 10 deletions) is comparable to Option 2's `mountChatShell` opts payload addition; structural change cost is similar.
- Auto-ack-eligible under boot prompt §B scope language ("multi-subscriber pattern matching production"); explicit operator confirmation in operator-correction 2026-05-17 ~11:58 MDT ("multi-subscriber fake bridge refactor + 6 assertion updates per your Phase-1 diagnose findings").

**Confidence:** [KNOWN-OPERATOR-ARBITRATED]

---

## Q-MBF-T25PURT-2 — DOM-ordinal expectation at L310

**Question:** What is the actual post-T9 `planUsageIdx`?

**Disposition:** `expect(planUsageIdx).toBe(1)`.

**Rationale:**
- FOLLOWUPS:370 row body explicitly states "DOM ordinal of plan-usage shifts 0→1 due to extra plan-timer slot" — [KNOWN] per cairn-test-failure-triage agent surface at MB-T-PHASE-4-BOTTOM-RAIL WB8.
- Verified post-fix via test run at 2026-05-17 16:57:59 MDT: test case "plan-usage slot renders BEFORE cost-meter slot" PASSES with `toBe(1)` assertion.
- Ordering invariant `[plan-timer | plan-usage | cost-meter | …]` preserved; plan-timer slot inserts at index 0 (mount.ts resolveRenderPlanTimerText path-2 resolution order); plan-usage shifts to index 1.

**Confidence:** [KNOWN]

---

## Q-MBF-T25PURT-3 — Subscriber-count assertion tightness

**Question:** `toBe(2)` (T9-aware tight) vs `toBeGreaterThanOrEqual(1)` (T9-tolerant loose)?

**Disposition:** `toBe(2)` (tight).

**Rationale:**
- Cairn discipline §2.1 + §4.5 favor tight assertions that surface future behavior shifts as explicit RED rather than absorbing them silently.
- Future production fan-out additions (e.g., a third subscriber via T29 model-mix-from-rate-limits or T-future-spec) SHOULD trigger this test to RED, forcing explicit ratification + assertion update — exactly the cycle that surfaced this closure.
- Inline comment at L167-L168 documents the post-T9 contract expectation, providing forward-discoverability for the next contract-shift cycle.

**Confidence:** [KNOWN] (cairn-norm-derived)

---

## Q-MBF-T25PURT-META — Single-WB collapse vs explicit 2-WB ladder

**Question:** Per shared-bootstrap §D estimated 2-WB ladder, ship as single green commit + WB-final OR explicit RED probe + GREEN ladder?

**Disposition:** Single green commit (WB1) + WB-final (2 commits total).

**Rationale:**
- Pre-existing deterministic 6/6 RED at HEAD (anchored at T9 ship `de6620e` 2026-05-12) IS the RED probe; cairn-test-failure-triage agent surface at MB-T-PHASE-4-BOTTOM-RAIL WB8 `b378127` was the RED authorship cycle.
- Authoring a new RED probe to demonstrate "the test fails before my fix" would re-create state already documented in the row body — wasted commit cycle.
- Operator-correction (III) 2026-05-17 ~11:58 MDT explicitly authorized "RED+GREEN as a refactor commit if appropriate" — collapse is appropriate for closure-of-existing-RED pattern.
- Grammar choice: `green:` rather than `refactor:` because the fix flips failing assertions to passing (positive behavior recovery), not a structural reorg with behavior preserved.

**Confidence:** [KNOWN-OPERATOR-ARBITRATED]

---

## Cross-references

- Findings doc: `docs/coordination/mb-f-t25-plan-usage-roundtrip-test-findings-2026-05-17.md`
- WB1 commit: `9f17a78`
- Manifest EXPANSION-1: `433d331`
- FOLLOWUPS:370 (closure-target row body)
- Operator-correction 2026-05-17 ~11:58 MDT (FIRST-CLOSURE-TARGET designation + subagent rationing + 30-min ship window)
