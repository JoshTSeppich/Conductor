# MB-F-T25-PLAN-USAGE-ROUNDTRIP-INTEGRATION-TEST-STALE-AFTER-T9-AUTOWIRE — WB-final findings

**Session:** r12-cw2-t25-plan-usage-roundtrip-test
**Generation:** gen-7 V4 high-concurrency stress cascade — Wave R12-CLOSURE-Wave-2 first cohort (FIRST-CLOSURE-TARGET designation per operator correction 2026-05-17 ~11:58 MDT)
**Closure-target row:** `MB-F-T25-PLAN-USAGE-ROUNDTRIP-INTEGRATION-TEST-STALE-AFTER-T9-AUTOWIRE` at `docs/FOLLOWUPS.md:370` (Tier 2)
**Manifest:** `docs/coordination/territorial-manifests/r12-cw2-t25-plan-usage-roundtrip-test.txt` (EXPANSION-1 amendment at `433d331`)
**Date:** 2026-05-17

---

## §I — Ladder summary

| WB | Type | SHA | One-line |
|----|------|-----|----------|
| WB1 | green | `9f17a78` | multi-subscriber fake bridge + 3 assertion updates (post-T9 production semantics) |
| WB-final | green | (this commit) | findings + decisions + FOLLOWUPS:370 RESOLVED stamp |

**Total cairn-grammar commits: 2** (collapsed RED+GREEN ladder per operator correction (III) SUBAGENT INVOCATION RATIONED 2026-05-17 — single-WB closure appropriate for test-only fix where pre-existing deterministic-fail at HEAD IS the RED probe).

## §II — Scope + closure target

**Closure-target row body** (verbatim from FOLLOWUPS:370):

> Tier 2 — deterministic fail; mechanism-clear; ≤2-line fix. T9 GREEN `de6620e` added `PlanTimerTextContainer` as second subscriber to `bridge.onRateLimitUpdate` (via `mount.ts:459-470` `resolveRenderPlanTimerText` path-2 auto-wire). T25's integration test `packages/dispatch-workstation/test/integration/chat-shell/plan-usage-roundtrip.test.tsx` (authored at `f448139` before T9 ship) uses single-slot last-writer-wins fake bridge at lines 65-71 (`captured = cb`). Result: 6/6 tests deterministic-fail since 2026-05-12 (T9 ship date) — one mechanism, six symptoms.

**Closure path chosen:** Option 1 (multi-subscriber fake + assertion updates) — operator-recommended path per FOLLOWUPS:370 row body ("more representative of production multi-subscriber semantics"). NOT Option 2 (`renderPlanTimerText: undefined` opt-out) which would paper over multi-subscriber contract.

## §III — Mechanism analysis

[KNOWN per FOLLOWUPS:370 row body + Read of `packages/dispatch-workstation/src/chat-shell/mount.ts:480-488` + lines 509-519 + verified test-run output 2026-05-17 16:57:59 MDT]:

**Pre-T9 state (test authored 2026-05-12 anchor `f448139`):**
- Production: `PlanUsageRing` (only) subscribed to `coarchitectBridge.onRateLimitUpdate` via `mount.ts resolveRenderPlanUsageRing` path-2 closure
- Test: single-slot `captured = cb` correctly modeled single-subscriber semantics
- All 6 tests GREEN

**Post-T9 state (de6620e ship 2026-05-12):**
- Production: `PlanTimerTextContainer` ALSO subscribes to same channel via `mount.ts resolveRenderPlanTimerText` path-2 closure (sibling-consumer per `mount.ts:492` comment: "Resolution order mirrors resolveRenderPlanUsageRing")
- Test: single-slot fake's `captured = cb` overwrites `PlanUsageRing`'s subscription with `PlanTimerTextContainer`'s subscription (mount order)
- `fireUpdate(state)` reaches only the 2nd subscriber (PlanTimerTextContainer); PlanUsageRing never receives state
- 6/6 deterministic-fail with one mechanism, six symptoms:
  - (a) `subscribeCount` observed 2 (test asserts 1)
  - (b) `cleanupCount` observed 2 (test asserts 1)
  - (c) `captured cb` overwritten — fireUpdate displaces PlanUsageRing
  - (d) Ring SVG never rendered → `expect(svg).toBeTruthy()` fails
  - (e) Yellow/red tint testids null → tint assertions fail
  - (f) Header-bar DOM ordinal of plan-usage shifted 0→1 (plan-timer slot now at index 0)

## §IV — Fix

**Single file modified:** `packages/dispatch-workstation/test/integration/chat-shell/plan-usage-roundtrip.test.tsx`

**`makeFakeBridge()` refactor** (lines 47-87; 24 insertions / 10 deletions):
- `let captured: ((state: RateLimitState) => void) | null = null` → `const captured: ((state: RateLimitState) => void)[] = []`
- `captured = cb` → `captured.push(cb)`
- `if (!captured) throw…` → `if (captured.length === 0) throw…`
- `captured(state)` → `for (const cb of captured) cb(state)`
- Added header docstring citing T9 anchor `de6620e` + FOLLOWUPS:370 + canonical multi-subscriber pattern reference

**3 assertion updates** (one each per affected test case):
- L167 (test: "mounts ChatShell + auto-renders plan-usage slot"): `expect(subscribeCount()).toBe(1)` → `toBe(2)` with inline `// Post-T9 (de6620e)…` comment
- L274 (test: "cleanup-fn invoked on unmount"): `expect(cleanupCount()).toBe(1)` → `toBe(2)` with inline `// Post-T9: 2 subscribers…` comment
- L310 (test: "plan-usage slot renders BEFORE cost-meter slot"): `expect(planUsageIdx).toBe(0)` → `toBe(1)` with updated comment ("plan-timer slot prepends header-bar at index 0; plan-usage shifts to index 1; ordering invariant [plan-timer | plan-usage | cost-meter | …] preserved")

**Pattern reference (READ-ONLY):**
- `packages/dispatch-workstation/test/unit/chat-shell-mix-indicator/probe-02-mix-indicator-container-subscription.spec.tsx:31-47` — canonical array-based multi-subscriber fake-bridge (`callbacks.push(cb)` + `for (const cb of callbacks) cb(reply)`). Pattern chosen over Set-variant at `test/unit/plan-timer/probe-mbtwft9-02-aggregator-roundtrip.spec.ts:50-71` because closure-counter scalars (`subscribes`, `cleanups`) and ordered-callback semantics align better with array than Set.

## §V — Verification

**Targeted test suite** [KNOWN per `pnpm --filter dispatch-workstation test test/integration/chat-shell/plan-usage-roundtrip.test.tsx` at 2026-05-17 16:57:59 MDT]:

```
✓ test/integration/chat-shell/plan-usage-roundtrip.test.tsx (6 tests) 256ms

Test Files  1 passed (1)
     Tests  6 passed (6)
  Duration  839ms
```

All 6 assertions previously deterministic-fail now GREEN; zero regressions in sibling tests within file.

**5-package typecheck** (per CLAUDE.md §4.4 + shared-bootstrap §F.2; one command at a time; no `&&` chains):
- `pnpm --filter dispatch-workstation typecheck` — [PENDING capture at WB-final commit body]
- `pnpm --filter dispatch-core typecheck` — [PENDING]
- `pnpm --filter dispatch-daemon typecheck` — [PENDING]
- `pnpm --filter dispatch-cli typecheck` — [PENDING]
- `pnpm --filter dispatch-web typecheck` — [PENDING]

**dist-rebuild discipline:** N/A — scope did not touch `dispatch-core` sources.
**Runtime-launch smoke (CLAUDE.md §4.6):** N/A — scope did not touch `packages/dispatch-workstation/src/main/*.ts`.

**CLAUDE.md §4.5 pre-existing-failure baseline:** This row was NOT in the §4.5 enumerated list (5 integration tests + coarchitect-ipc:485) but WAS captured as a Tier 2 followup at `acb6bda` from cairn-test-failure-triage agent surface at MB-T-PHASE-4-BOTTOM-RAIL WB8. Closure REMOVES this row from the "expected pre-existing failure" baseline; baseline does not grow.

## §VI — Outcome classification

**Per CLAUDE.md §2.11:** **Improved (fault recovery)** — deterministic 6/6 RED at HEAD flipped to deterministic 6/6 GREEN via test-fixture refactor matching production multi-subscriber contract. No regression introduced in adjacent tests or src/.

Not classified as "No regression; wiring verified" because the closure flipped failing assertions to passing (positive recovery), not preserved an existing green state.

## §VII — Methodology notes

### §VII.1 — HALT-AMBIGUOUS-MANIFEST + self-correcting cycle

This session contributed evidence to the gen-7 stress-cascade archive (Round 12 §12) for a NEW HALT-vocabulary entry:

**Sequence:**
1. Phase-1 inheritance reads + `find` discovered manifest TERRITORY cited non-existent path (`test/unit/chat-shell/plan-usage-roundtrip.test.tsx`) while actual file at `test/integration/chat-shell/`.
2. Cairn-phase-1-diagnose agent (invoked pre-operator-correction (III)) independently corroborated path mismatch and surfaced full diagnose.
3. Session HALTED at HALT-AMBIGUOUS-MANIFEST pre-WB1-RED per CLAUDE.md §2.9 (bidirectional territory fences — refuse, surface, wait); 0 commits authored.
4. Gen-7 arbitrated via SITREP-3 → manifest amendment commit `433d331` with `EXPANSION-1` marker (single-token `unit/` → `integration/` correction; mechanical-translation envelope under CLAUDE.md §3.4 for manifest authorship).
5. Session resumed under corrected manifest; single-WB green ladder shipped within minutes per operator FIRST-CLOSURE-TARGET 30-min ship window (~12:28 MDT).

**Methodology insight [KNOWN]:**
- Cairn discipline §2.9 territorial-fence-as-refusal directly prevented silent path-interpretation; would have created an out-of-territory commit otherwise. Cost of refusal: ~10 minutes operator-arbitration latency. Benefit: zero territory-violation incidents in cascade.
- Manifest-authoring is operator/orchestrator-arbitrated by default but path-corrections fall under §3.4 mechanical-translation envelope when the corrected path is the canonical anchor cited elsewhere (FOLLOWUPS row body in this case).
- HALT-AMBIGUOUS-MANIFEST sits adjacent to HALT-STALE-DISPATCH-0 (Round 12 §1.2 emergent class) in the gen-6/gen-7 HALT-vocabulary extensions: both are "scope-clear-but-anchor-mismatched" classes resolved by orchestrator mediation rather than session work.

### §VII.2 — Operator-correction (III) SUBAGENT INVOCATION RATIONED — empirical evidence

This session straddled the operator-correction directive at ~11:58 MDT:
- Pre-correction: cairn-phase-1-diagnose agent invoked (Phase-1 diagnose completed with full surface inventory + Q1-Q3 + arbitration items + risks). Token cost: ~55k (agent run) + ~50k (session context up to diagnose surface). Output: load-bearing for HALT-AMBIGUOUS-MANIFEST surface AND for the assertion updates (L310 ordinal index, multi-subscriber pattern reference at `probe-02-mix-indicator-container-subscription.spec.tsx:31-47`).
- Post-correction: directly Read the test file + pattern reference; authored edits + commit + push within ~10 minutes. Token cost: ~15k.

**Empirical takeaway:** for SIMPLE ≤2-WB closures where the FOLLOWUPS row body already enumerates mechanism + line numbers + fix path explicitly (as FOLLOWUPS:370 does), direct Read is sufficient. Phase-1 diagnose agent value is concentrated in: (a) verifying claimed paths exist (which Read also catches); (b) identifying adjacent-pattern references not cited in the row body (which Read can find via Grep if the operator briefs the pattern source). For complex multi-package or multi-WB closures, retrofit invocation remains amortizable.

This session's diagnose findings WERE load-bearing because they surfaced the HALT-AMBIGUOUS-MANIFEST evidence; without the diagnose, the session would have either (a) attempted the test path naively → HALT-TERRITORY-VIOLATION at first git add, or (b) silently written to the actual integration/ path → manifest violation undetected.

## §VIII — Followups filed

**None.** Clean closure; no scope-creep absorbed; no new methodology gaps surfaced beyond §VII.1 + §VII.2 archive-feeding evidence (captured here, not as new FOLLOWUPS rows — gen-7 archive-writer may absorb into Round 12 §12 stress-cascade archive at orchestrator discretion).

## §IX — Cross-references

- FOLLOWUPS:370 (closure-target row body authoritative)
- Manifest EXPANSION-1: `433d331` (gen-7 path correction per SITREP-3)
- WB1 green: `9f17a78` (multi-subscriber fake bridge + 3 assertion updates)
- T9 ship anchor: `de6620e` (resolveRenderPlanTimerText path-2 auto-wire; introducing commit)
- Pre-T9 test authoring: `f448139` (single-subscriber assumption)
- cairn-test-failure-triage agent surface at MB-T-PHASE-4-BOTTOM-RAIL WB8: `b378127` (WB-final) + `acb6bda` (FOLLOWUPS row filing)
- Pattern reference: `packages/dispatch-workstation/test/unit/chat-shell-mix-indicator/probe-02-mix-indicator-container-subscription.spec.tsx:31-47`
- Decisions doc: `docs/coordination/mb-f-t25-plan-usage-roundtrip-test-decisions-2026-05-17.md` (sibling)
- Gen-7 orchestrator state: `docs/coordination/orchestrator-state-current.md §16.10`
- Dispatch queue entry: `docs/coordination/dispatch-queue-current.md` Wave R12-CLOSURE-Wave-2 first cohort row
