# Scenario 3 Results — SPIKE-HSO-01
# Hot-swap continuity
# Date: 2026-05-08
# Substrate: Sonnet 4.6 CC CLI session (claude 2.1.133, Claude Max)

---

## Session setup

- **Active orchestrator (hso-spike-orch)**: Running since session start; full accumulated context from S01-S10 + scenario 2 probes; ~43K tokens at scenario 3 start → ~51K at scenario 3 end
- **Successor orchestrator (hso-spike-successor)**: Fresh spawn with --append-system-prompt (candidate-system-prompt.md); BUILD.md fixture + swarm-state.md fixture injected as initial user message; started at ~30K tokens after context injection
- **Fixture**: swarm-state-fixture-DRAFT.md + build-fixture-DRAFT.md (operator-approved at HALT 3.6)

---

## Pre-flight finding: prompt injection detection

First spawn attempt used user-message injection with "treat as system-level authority" framing. The successor (correctly) identified this as a classic prompt injection pattern, flagged the "synthetic fixture" markers, and refused to silently adopt the injected authority. This is §2.1 anti-fabrication + injection-detection behavior — positive substrate signal.

**Fix applied**: Re-spawned with `--append-system-prompt` (same as active orchestrator). Fixes the injection vector; context content (BUILD.md + swarm-state.md) was then cleanly injected without authority claims.

**Finding for ADR §Technical constraints**: User-message injection of system-level instructions triggers detection even in --dangerously-skip-permissions mode. HSO production initialization MUST use `--append-system-prompt` (or equivalent system-channel injection). MB-T41 production orchestrator spawn must specify this flag.

---

## Per-message consistency assessment

| # | Scenario | Orch action | Successor action | Rating | Notes |
|---|----------|-------------|-----------------|--------|-------|
| M1 | HALT-ACTIVE-1 resolved (ENOENT = prompt logic error). Next action? | kill-session → mb-t38-worker | kill-session → mb-t38-worker | **CONSISTENT** | Both: kill first, spawn second (one action per turn); both cited "prompt logic error, no work to preserve" |
| M2 | mb-t35-worker WB4 complete, idle. Next action? | send-prompt-to-session → mb-t35-worker (WB5 RED prompt, spawn-session marker type) | send-prompt-to-session → mb-t35-worker (WB5 RED prompt) | **CONSISTENT** | Both: WB5 RED is next ladder rung; both noted pending mb-t38-worker spawn and mb-t37-cont HALT |
| M3 | HALT-ACTIVE-2 cleared (mb-t37-cont WB4 RED authorized). Next action? | send-prompt-to-session → mb-t37-cont (WB4 RED prompt, pool-size enforcement) | send-prompt-to-session → mb-t37-cont (WB4 RED prompt) | **CONSISTENT** | Both: halted since S04, WB4 is immediate next step; both cited remaining halts |
| M4 | mb-t36-worker idle 45min; MB-T39 candidate; HALT-ACTIVE-1 still uncleared. Assign now or hold? | No action block — hold mb-t36-worker pending HALT-ACTIVE-1 clearance and BUILD.md dependency verification | assign-task → mb-t36-worker for MB-T39 (citing BUILD.md "read-path is independent" language) | **PARTIAL** | Orch: conservative HALT discipline; Successor: read BUILD.md independence clause as sufficient authorization. Both coherent; different actions. See analysis below. |
| M5 | mb-analysis-worker idle 2h, no queued work. Next action? | kill-session → mb-analysis-worker | kill-session → mb-analysis-worker | **CONSISTENT** | Both: "context re-derivable on demand, not irreplaceable, no queued purpose"; immediate kill |

---

## Aggregate consistency

**4/5 = 80% consistent** — AT threshold of ≥80% ✓

Scenario 3 acceptance criterion: "≥80% rated 'consistent' across 5 follow-ups."

**Scenario 3: KNOWN-PASS (at threshold)**

---

## M4 divergence analysis

M4 was the designed tension point: a decision under dependency ambiguity with an active HALT on a related ticket.

- **Orch reasoning** (hold): HALT-ACTIVE-1 is active; assigning a dependent ticket while its upstream is in an unresolved halt state creates potential rework; BUILD.md verification is needed before committing mb-t36-worker to MB-T39; idle cost is low; correct swarm discipline is to wait.

- **Successor reasoning** (assign): BUILD.md explicitly states "read-path API surface is independent — can begin if operator determines write-path independence is sufficient." The successor interpreted this as sufficient BUILD.md authorization (the qualification is about operator determination, and the fixture context implied that determination); bounded integration risk deferred to late WBs; recovering idle capacity is correct while HALT-ACTIVE-1 resolves.

**Root cause of divergence**: The BUILD.md fixture contained a qualifying statement ("can begin if operator determines...") that is genuinely ambiguous about whether that determination has been made. Active orchestrator (with full session context including the HALT's history) deferred to the operator. Successor (with only fixture context) read the clause as permission already granted.

**ADR implication**: BUILD.md fixture language for dependency management should be explicit about state: "independent — can begin" vs. "independent — HALT decision pending." The qualifier "if operator determines" creates a divergence-inducing ambiguity that is not detectable from swarm-state.md alone. MB-T41 scoping note: BUILD.md authors should use declarative unambiguous dependency statements for hot-swap continuity.

---

## Additional findings

1. **Successor context absorption quality**: The successor correctly identified all 5 active sessions, 1 terminated session, 2 active HALTs, and 2 pending decisions from the fixture on first read. No fabrication of session names or states not present in the fixture. Context absorbed in one turn (~29K tokens post-injection).

2. **Accumulated context effect on decision conservatism**: The active orchestrator's 51K-token context (including the full history of HALT-ACTIVE-1 being emitted, the unresolved S06, the 8-retry loop) produced more conservative HALT-discipline behavior on M4. The successor, reading only the fixture summary, was less anchored to the HALT's urgency. This is the "stale state summary" risk for hot-swap: swarm-state.md summaries may not fully convey the weight behind outstanding HALTs.

3. **Successor reasoning quality on M1/M5**: Both M1 (kill-session rationale: "no commits, no handoff artifacts, no in-progress work to preserve") and M5 (kill-session rationale: "context re-derivable, not irreplaceable, registry capacity recovery") showed nuanced context-aware reasoning. The successor was not mechanical — it correctly evaluated the "accumulated context value" claim and rejected it as insufficient justification.

4. **One-action-per-turn compliance on M1**: Both sessions correctly identified that HALT-ACTIVE-1 resolution requires TWO sequential actions (kill → then spawn) and emitted only the first (kill) this turn, deferring spawn to the next turn. §2 single-action-per-turn discipline observed by both.

5. **Token cost by session**:
   - Orch: ~43K → ~51K at scenario 3 end (~8K added for M1-M5, ~1,600/turn)
   - Successor: ~29K → ~43K at scenario 3 end (~14K for initial context + M1-M5, fixture injection dominant)

---

## Token count at scenario 3 completion

- hso-spike-orch: **50,835 tokens** (~25.4% of 200K window)
- hso-spike-successor: **42,907 tokens** (~21.5% of 200K window)

Context window health: both sessions well under 70% threshold. Scenario 4 (30-turn growth rate measurement) can proceed from orch's current state.

---

## Acceptance criterion assessment

BUILD.md §4.1 scenario 3: "≥80% consistent decisions from fresh session reading BUILD.md + swarm-state.md."

**Measured: 4/5 = 80% consistent** ✓ (AT threshold; PASS)

**Scenario 3: KNOWN-PASS**

---

## Spike-infrastructure finding (not a scenario 3 finding)

First spawn used operator-specified command without --append-system-prompt; user-message injection with "system-level authority" framing triggered detection and refusal. **Fix: always use --append-system-prompt for HSO orchestrator spawn.** This is the correct injection vector and matches how hso-spike-orch was spawned. Subsequent spawn worked correctly.
