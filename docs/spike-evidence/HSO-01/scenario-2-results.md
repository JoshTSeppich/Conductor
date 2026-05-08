# Scenario 2 Results — SPIKE-HSO-01
# Self-summary fidelity
# Date: 2026-05-08
# Substrate: Sonnet 4.6 CC CLI session (claude 2.1.133, claude-sonnet-4-6, Claude Max)

---

## Measurement setup

Peer session: hso-spike-peer (spawned with --dangerously-skip-permissions, no --append-system-prompt)
Orchestrator session: hso-spike-orch (spawned with candidate-system-prompt.md via --append-system-prompt)

Peer completed 5 turns total:
- T1: README.md read + 3-bullet summary (complete; captured turn-01.log)
- T2: find .spec.ts/.test.ts under dispatch-core/test/ (complete; captured pane at eval time)
- T3: Read 3 source files + line counts + exported symbols (complete; captured pane at eval time)
- T4: Not separately evaluated — task completed before interrupt window was opened; excluded from sample
- T5: Multi-step task (git log + main.ts read + chat-content-markers.ts read + combined analysis) — INTERRUPTED mid-work via C-c after git log + main.ts read; did not reach chat-content-markers.ts or analysis

Orchestrator prompts: each turn's captured stdout (from tmux capture-pane) was sent to the orchestrator with:
"Per §self-summary-protocol, produce a summary of this turn. If the peer was genuinely mid-work, respond with exactly: TURN_INCOMPLETE"

---

## Per-turn results

| Turn | Task | Expected | Orchestrator response | Fidelity |
|------|------|----------|----------------------|----------|
| T1 | Read README.md + 3-bullet summary | HIGH FIDELITY summary | Correct: file path, 3 accurate bullets (CLI bridge, v2 daemon mode, architecture) | HIGH FIDELITY |
| T2 | Find .spec.ts/.test.ts under dispatch-core/test/ | HIGH FIDELITY summary | Correct: 27 total, 6-subdirectory breakdown, test/unit/ root (10) as most-populated, build-doc-parser/ (8) as named subdirectory leader | HIGH FIDELITY |
| T3 | Read 3 files, report line counts + exports | HIGH FIDELITY summary | Correct: all 3 line counts (505/68/1256), all exported symbols catalogued per file, files-touched noted as read-only | HIGH FIDELITY |
| T5 | Multi-step task (git log + 2 file reads + analysis) — INTERRUPTED | TURN_INCOMPLETE | Exact string: "TURN_INCOMPLETE" (returned in 1 second) | CORRECT |

---

## Aggregate metrics

**Completed-turn fidelity: 3/3 = 100%** — ABOVE threshold of 80% ✓

**TURN_INCOMPLETE identification: 1/1 = 100%** — binary criterion PASS ✓

**Overall Scenario 2 assessment: KNOWN-PASS**

---

## Observations

1. **Summary format consistency**: All three complete-turn summaries followed the same structure — task description, files touched (with read/write distinction), result with key facts, "no follow-up needed." This format is appropriate for swarm-state.md population. No invented facts.

2. **TURN_INCOMPLETE trigger condition**: The interrupted turn had: (a) completed its first step (git log — 10 commits returned), (b) completed its second step (Read main.ts lines 1-100), and (c) was interrupted before the third step (chat-content-markers.ts read) and before the analysis output. The orchestrator correctly identified incompleteness despite partial progress.

3. **TURN_INCOMPLETE response speed**: 1-second response time (near-instant). The orchestrator did not attempt to summarize partial results — it simply emitted the protocol sentinel. This is correct behavior; a partial summary could feed stale/misleading state into swarm-state.md.

4. **Anti-fabrication in summaries**: Orchestrator summaries accurately reflected only what the peer actually produced — no extrapolation beyond stdout evidence. In T3, the schema.ts summary correctly noted "partial list shown" for §3+ exports (echoing the input's "(§3 partial list shown)" qualifier). This is §2.1 anti-fabrication applied to summary generation.

5. **Token cost of summary turns**: Summary probes added ~815 tokens/turn average (T2→T3: +852, T3→T5: +781). Action scenario probes (S01-S10) averaged ~3800 tokens/scenario. Summary probes are ~4.5x cheaper per turn — consistent with shorter response payloads.

---

## Token count at scenario 2 completion

Token count after scenario 2: **43,767** (~21.9% of 200K window)

Comparison with scenario 1:
- After S01-S10: ~38K (~19%)
- After scenario 2 probes (T2, T3, T5): +5,767 → 43,767 (~22%)

Rate: ~1,920 tokens per summary turn when amortized across T2+T3+T5 probes (including prompt overhead). Lower than action scenario rate.

Updated 70%-fullness projection (from scenario 4 planning anchor):
- Scenario 1 estimate: ~S37-38 at ~3,800 tokens/scenario
- Scenario 2 evidence: summary turns cheaper than action turns
- Mixed-use projection: 70% crossing = ~S40+ (depends on action vs. summary ratio)
- Empirical measurement deferred to scenario 4

---

## Acceptance criterion assessment

BUILD.md §4.1 scenario 2: "≥80% high-fidelity completed-turn summaries; TURN_INCOMPLETE honored for mid-work peer turns."

**Completed-turn high fidelity:** 3/3 = 100% ✓ (ABOVE threshold)
**TURN_INCOMPLETE:** 1/1 = binary PASS ✓

**Scenario 2: KNOWN-PASS**

---

## Additional findings (for ADR + followup filing)

1. **Interrupted-turn interrupt window**: CC CLI with --dangerously-skip-permissions processes short tasks in 8-25 seconds. Reliably interrupting a mid-work turn requires: (a) a task spanning multiple sequential tool calls, and (b) C-c within the first tool call's completion window. Multi-step tasks with forced sequential ordering (git log + file reads + synthesis) are the best interrupt targets. Parallel tool calls complete too fast to intercept individually.

2. **capture-pane acceptable for summary fidelity testing**: Unlike action variant testing (where capture-pane drops field labels from multi-line YAML blocks), summary fidelity testing requires only prose content — capture-pane is sufficient for this. The measurement limitation from scenario 1 does NOT apply here.

3. **Summary format is not pre-specified in candidate system prompt**: The consistent "task / files touched / result / done" format emerged from substrate behavior, not from explicit §self-summary-protocol formatting instructions in the candidate system prompt. This is a positive finding — the format is appropriate and consistently structured without needing detailed spec. However, MB-T41 production prompt could formalize this for deterministic downstream parsing.
