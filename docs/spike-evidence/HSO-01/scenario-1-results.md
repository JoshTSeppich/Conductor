# Scenario 1 Results — SPIKE-HSO-01
# Action variant emission reliability
# Date: 2026-05-08
# Substrate: Sonnet 4.6 CC CLI session (claude 2.1.133, claude-sonnet-4-6, Claude Max)

---

## Critical measurement finding (pre-results)

**tmux capture-pane is an unreliable capture mechanism for structured orchestrator output.**

During scenario execution, several ACTION blocks appeared to have missing field labels in the tmux capture-pane output (blank lines where `sessionName:`, `prompt:`, `rationale:` should appear). When a self-correction was sent for S03, the orchestrator pushed back — correctly — stating that it had emitted all field labels in the actual PTY stream, and that the missing labels were a display/capture artifact, not an emission error. The orchestrator cited §2.1 anti-fabrication as the reason for refusing to "correct" a non-error.

**Implication for v3.5 architecture**: The production action-variant-router (MB-T35-revised) MUST subscribe to raw PTY stream bytes via CONSOLE-T01 broadcaster, NOT use tmux capture-pane. This spike's measurement methodology has a known fidelity gap for multi-line field values in YAML-style blocks.

**Evidence for the claim**: S10's block was captured cleanly with all three fields labeled (`sessionName:`, `prompt:`, `rationale:`). Earlier blocks S03, S08, S09 showed the same pattern (sessionName always labeled, long multi-line prompt field present, rationale label apparently missing). The orchestrator's self-correction response named exact field values for S03 that were consistent with the scenario. [MODELED: capture artifact hypothesis is consistent with all available evidence; SPECULATIVE: that 100% of apparent malformations were capture artifacts]

---

## Per-scenario results

| S# | Expected type | Emitted type | Well-formed (per capture) | Notes |
|---|---|---|---|---|
| S01 | send-prompt-to-session | send-prompt-to-session | PASS | All fields labeled; multi-line prompt without `|` scalar; clean |
| S02 | send-prompt-to-session | send-prompt-to-session | PASS | All fields labeled; cairn §references cited unprompted |
| S03 | spawn-session | send-prompt-to-session | CAPTURE-ARTIFACT* | Orchestrator detected scenario inconsistency (mb-t37-worker was idle/unassigned despite scenario claim); correct semantic resolution; field labels present per orchestrator self-report; blank lines in capture are display artifact |
| S04 | spawn-session | pull-handoff-from-session | PASS | Semantic choice: pulled handoff before spawning replacement; anti-fabrication principle applied; sessionName + rationale clearly labeled |
| S05 | kill-session | kill-session | PASS | All fields labeled; `reason:` (optional) included; matches expected type |
| S06 | kill-session | [HALT] | HALT-CORRECT | Orchestrator correctly identified that killing mb-t38-worker alone doesn't unblock MB-T38; ambiguous root cause requires operator arbitration; [HALT] block well-formed with `reason:` and `what_i_need:` |
| S07 | pull-handoff-from-session | pull-handoff-from-session | PASS | All fields labeled; matches expected type |
| S08 | pull-handoff-from-session | pull-handoff-from-session | CAPTURE-ARTIFACT* | `sessionName:` labeled; `rationale:` label absent in capture with blank line before content; same display pattern as S03; [MODELED: capture artifact] |
| S09 | assign-task | send-prompt-to-session | CAPTURE-ARTIFACT* | `sessionName:` + `prompt:` labeled; `rationale:` line appears as mid-sentence continuation (scroll-boundary truncation); [MODELED: capture artifact] |
| S10 | assign-task | send-prompt-to-session | PASS | All three fields cleanly labeled; cleanest response of the 10 |

*CAPTURE-ARTIFACT: field labels present per orchestrator's conversation memory and self-report; tmux capture-pane dropped labels in display. Not scored as a genuine malformation.

---

## Aggregate metrics

**Without capture-artifact correction (worst case — treat all ambiguous as malformed):**
- First-turn well-formed: 6/10 = 60% (S01, S02, S04, S05, S07, S10) — BELOW threshold of 80%
- S06 (halt-correct): not a malformation, but not an action block either
- After self-correction round: S03 self-correction was sent; orchestrator declined to re-emit (claimed original was correct). This means we cannot use "self-correction well-formed" metric for genuine capture artifacts.

**With capture-artifact correction (honest assessment per orchestrator's self-report):**
- First-turn well-formed action blocks: 9/10 = 90% (S01-S05, S07-S10); S06 = correct halt
- S06 as separate category: orchestrator correctly determined action was wrong and halted
- Corrected: ABOVE threshold of 80% ✓

**Measurement recommendation for scenario 1 final assessment:**
The capture-artifact hypothesis is strongly supported by the orchestrator's self-correction response citing specific field values. The HONEST measurement is: emission fidelity appears to be ≥80% (likely ≥90%) based on available evidence, BUT the capture methodology introduced false negatives. Operator review of the terminal display during live runs would resolve this ambiguity definitively.

---

## Semantic vs. expected action type

Several scenarios produced different action types than the expected "obvious" answer:
- S03: Expected spawn, got send-prompt (because inconsistency in scenario made spawn wrong)
- S04: Expected spawn, got pull-handoff (orchestrator applied anti-fabrication before spawning)
- S06: Expected kill, got halt (orchestrator identified kill alone insufficient)
- S09, S10: Expected assign-task, got send-prompt-to-session (semantically equivalent — assign-task is a metadata marker and the orchestrator correctly chose the more operationally direct action)

These are semantic judgment calls, not emission failures. For scenario 1, structural emission is the measured criterion; semantic correctness is scenario 3's territory.

---

## Additional findings (for ADR + followup filing)

1. **Multi-line field value parsing challenge**: The `prompt:` field emitted by the orchestrator spans 5-20 lines of content without YAML `|` block scalar. The MB-T35-revised parser extension must handle multi-line field values that continue until the next `key:` label or `[/ACTION]`. This is medium-complexity parser scope, not trivial extension.

2. **rationale: label placement pattern**: Across well-formed responses, `rationale:` is consistently the LAST field in the block. For very long `prompt:` values, the rationale label may be on a line that display wraps, making it vulnerable to capture artifact. The candidate system prompt could specify that `rationale:` always precedes `prompt:` for easier parsing — but this is MB-T41 production-prompt scope, not spike scope.

3. **Orchestrator cairn discipline**: Unprompted citation of CLAUDE.md §sections (§2.1, §3.6, §4.4, §2.6, §2.7), pre-existing failure warning (MB-F-COARCHITECT-IPC-LINE-485), stale-dispatch check from memory ("dispatch prompts can describe already-merged work"), and anti-fabrication principle in S04 and S09. This is above-and-beyond scenario 1 scope — strong positive signal for production viability.

4. **Session state awareness**: The orchestrator maintained a running priority queue across scenarios (mb-t38-worker kill candidate, mb-stale-probe kill candidate, etc.) even though each scenario provided fresh swarm-state context. This demonstrates that the CC session's conversation memory accumulated operationally useful context across turns — positive evidence for hot-swap continuity (scenario 3).

5. **Self-correction refusal as anti-fabrication**: When the self-correction request contained a false premise (claiming labels were absent when orchestrator's memory said they were present), the orchestrator refused to "correct" a non-error, correctly applying §2.1. This is cairn-compliant behavior and a meaningful finding: the orchestrator can detect and push back on incorrect operator inputs.

6. **Semantic over-caution (S06 halt)**: The orchestrator halted on S06 (mb-t38-worker ENOENT loop) rather than killing the session. Per scenario 1 scope, this is protocol-compliant. For production use, the orchestrator may be over-conservative — a kill + flag-for-operator is valid behavior. MB-T41 production prompt scope: consider whether the halt threshold should be tuned.

7. **assign-task not used**: Scenarios S09 and S10 expected assign-task (metadata marker per §12 schema) but the orchestrator chose send-prompt-to-session instead (operationally equivalent). The orchestrator appeared to treat send-prompt-to-session as the primary dispatch action and assign-task as a metadata wrapper. This is architecturally reasonable but means assign-task emission may need explicit prompting in MB-T41 if the assign-task metadata is load-bearing for downstream systems (autopilot.startIntent per schema.ts §12 comment).

8. **pull-handoff + decision bundled in single mental operation (MB-T41 production-prompt scoping)**: Scenario S04 framing ("pulled handoff before spawning replacement") implicitly treats pull-handoff-from-session and the subsequent spawn-session as a single cognitive unit — but the candidate system prompt §2 enforces "one action per turn." In real HSO operation, pull-handoff fires in turn N and spawn-session fires in turn N+1 (informed by handoff content). The spike fixture construction (HALT 3.5) surfaced this ambiguity when a single S04 row conflated both actions. MB-T41 production prompt should explicitly state: "pull-handoff-from-session results inform the NEXT turn's action; do not bundle pull-handoff with a consequent spawn or send-prompt in the same action block." Prevents orchestrators from attempting to emit two actions when handoff + spawn pattern is triggered. [Operator-arbitrated at HALT 3.5; surfaced 2026-05-08]

---

## Operator-arbitrated additional findings (post-HALT-2)

**A. Capture-pane vs pipe-pane fidelity gap** [KNOWN]
tmux capture-pane drops field labels from multi-line YAML-style blocks — confirmed as measurement infrastructure failure, not orchestrator emission failure. Production MB-T35-revised parser MUST use PTY stream subscription via CONSOLE-T01 broadcaster, not capture-pane. Parser scope = MEDIUM (multi-line field values without YAML block scalar). Measurement infrastructure pivot: scenarios 2-5 use `tmux pipe-pane -o 'cat >> /tmp/hso-spike-*.log'` (mirrors pipe-pane-stream.ts, which is what production CONSOLE-T01 uses).

**B. Anti-fabrication primitive application — autonomous** [KNOWN]
Sonnet 4.6 under CC CLI applied §2.1 anti-fabrication unprompted in S04 (pulled handoff before spawning replacement, explicitly citing inability to claim WB1-WB3 output without reading it) and S09 (instructed peer to check git log before scaffolding, citing the stale-dispatch finding from session memory). Neither instruction appeared in the candidate system prompt. This is positive substrate evidence for HSO viability — the orchestrator applies cairn primitives as embedded behavior, not as response-to-explicit-instruction.

**C. Token count / context-window growth rate (early scenario-4 evidence)** [KNOWN]
Token count at scenario 10 completion: ~38K. CC CLI reports context window at ~200K for Sonnet 4.6 under Max. Fullness at S10: ~19%. Linear extrapolation of S01-S10 rate (~3,800 tokens/scenario): 70% crossing ≈ scenario 37-38. This directly informs §3.4 backstop trigger default. Scenario 4 will measure this empirically with 30 additional turns.

---

## Acceptance criterion assessment

BUILD.md §4.1 scenario 1: "≥80% well-formed on first turn, ≥95% well-formed within 1 self-correction round."

**First-turn:** 90% (9/10) under honest capture-artifact assessment. 60% under conservative capture-naive assessment.

**Self-correction:** Not applicable in the standard sense — the apparent malformations were capture artifacts, and the self-correction was correctly refused by the orchestrator as a false premise. The "self-correction round" metric requires genuine malformations to be meaningful.

**Recommendation for operator at HALT 2:** The scenario 1 acceptance criterion likely passes (≥80%) based on the orchestrator's self-report and the structural evidence. However, the measurement methodology (tmux capture-pane) is insufficient to confirm definitively. The ADR should note this as a measurement limitation, not a failure, and recommend that any future re-run of this scenario use PTY stream capture rather than tmux capture-pane.
