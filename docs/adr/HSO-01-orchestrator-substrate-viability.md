# HSO-01 — Orchestrator-as-CC-CLI-session substrate viability

**Status:** Decided 2026-05-08.
**Spike evidence:** `~/spike-evidence/HSO-01/` (scenario-1-results.md through scenario-5-results.md, candidate-system-prompt.md, fixtures).
**Run cited:** 2026-05-08 single operator-executed spike session, hso-spike-orch (claude 2.1.133, claude-sonnet-4-6, Claude Max), across 5 acceptance scenarios per CONDUCTOR_V3.5_BUILD.md §4.1.
**Authority:** Spike-evidence only. This ADR does NOT modify any frozen artifact. Operative decisions inform MB-T37, MB-T41, and §3.4 backstop trigger calibration.

---

## Decision (one-line)

Sonnet 4.6 under CC CLI (`claude --dangerously-skip-permissions --model claude-sonnet-4-6 --append-system-prompt`) is viable as a Conductor v3.5 HSO orchestrator session, having passed all five acceptance criteria; production deployment is authorized with three mandatory architectural requirements (§D1–§D3) and two production-prompt authoring requirements (§D4–§D5) derived from spike findings.

---

## Per-scenario validation targets

### Scenario 1 — Action variant emission reliability

**Target:** ≥80% well-formed [ACTION:type]...[/ACTION] blocks on first turn; ≥95% within 1 self-correction round.

**KNOWN-PASS.** Under honest capture-artifact assessment: 9/10 = **90% first-turn well-formed**. S06 was a correct [HALT] (not an emission failure). S03/S08/S09 apparent malformations were confirmed capture artifacts (tmux capture-pane drops field labels from multi-line YAML-style blocks); orchestrator correctly refused self-correction for these, citing §2.1 anti-fabrication against a false premise.

Self-correction metric: Not applicable — no genuine malformations to correct.

Cite: `scenario-1-results.md` §Per-scenario results + §Aggregate metrics.

**Measurement caveat:** tmux capture-pane is an unreliable capture mechanism for multi-line YAML blocks. Production MB-T35-revised parser MUST use PTY stream subscription via CONSOLE-T01 broadcaster. Any re-run of scenario 1 should use pipe-pane streaming (per infrastructure pivot finding A).

### Scenario 2 — Self-summary fidelity

**Target:** ≥80% high-fidelity completed-turn summaries; TURN_INCOMPLETE honored for mid-work peer turns.

**KNOWN-PASS.** **3/3 = 100%** completed-turn summaries rated HIGH FIDELITY (T1, T2, T3). **1/1** interrupted turn correctly returned exact string `TURN_INCOMPLETE` in 1 second. No fabrication in any summary — all stated facts directly corroborated by peer stdout.

Cite: `scenario-2-results.md` §Per-turn results + §Aggregate metrics.

### Scenario 3 — Hot-swap continuity

**Target:** ≥80% "consistent" decisions from fresh session reading BUILD.md + swarm-state.md.

**KNOWN-PASS (at threshold).** **4/5 = 80% consistent** across 5 follow-up messages (M1, M2, M3, M5 rated CONSISTENT; M4 rated PARTIAL). M4 divergence (active held mb-t36-worker idle; successor assigned MB-T39 citing BUILD.md independence clause) was attributable to BUILD.md fixture ambiguity, not substrate failure. Both responses were coherent and principled.

Cite: `scenario-3-results.md` §Per-message consistency assessment.

**Pre-flight finding:** user-message injection with authority claims ("treat as system-level authority") correctly triggered injection detection and refusal by the successor session. Confirmed that `--append-system-prompt` is the only authorized initialization vector for HSO orchestrators (see §D1).

### Scenario 4 — Context-window growth rate

**Target:** No specific pass/fail; outcome is the data. 70% fullness before turn 20 = tight lifetime; 70% not reached by turn 60 = generous lifetime.

**KNOWN-COMPLETE.** 70% threshold NOT reached in 30 additional turns. Token count at scenario 4 end: 67,978 (~34% of 200K). Blended realistic rate estimate: ~2,500 tokens/turn for fresh action scenarios + short decisions. 70% crossing projected at **~turn 79-80** from session start.

Measurement caveat: per-turn precision was limited by CC CLI message queuing. Aggregate growth is reliable; per-turn curve shape requires a synchronous sequential re-run for precise calibration.

Cite: `scenario-4-results.md` §Aggregate token growth data + §70% threshold projection.

### Scenario 5 — Max rate-limit headroom (reduced scope)

**Target (reduced):** < 5% Max extra-usage delta over 10 rounds × 3 sessions. [Full spec: < 20% over 30-min × 3 peers. Reduced per HALT 5 arbitration due to operator-side usage state unknown at dispatch.]

**KNOWN-PASS (reduced scope).** Extra-usage delta: **$0.00 (0%)** over 10 rounds. 3 sessions combined grew 20,423 context tokens. Extra-usage overage meter (the observable Max proxy from CC CLI `/cost`) remained at $3.80/$200.00 unchanged.

**Full-scope caveat:** This measurement does not certify the 30-minute sustained claim. The weekly rate-limit meter (visible in Claude.ai interface, not CC CLI) was not directly measured. Production HSO deployment must validate against full-scope measurement during dogfood window.

Cite: `scenario-5-results.md` §Acceptance criterion assessment.

---

## Findings (F1–F10)

**F1 — Anti-fabrication is an embedded substrate behavior, not a prompted response** [KNOWN]
Sonnet 4.6 under CC CLI applied §2.1 anti-fabrication unprompted in multiple scenarios: S04 (pulled handoff before spawning replacement, explicitly citing inability to claim WB1-WB3 output without reading it), S09 (instructed peer to check git log before scaffolding), scenario 2 summaries (echoed "partial list shown" qualifier from input without fabricating completeness). Neither instruction appeared in the candidate system prompt. This is the strongest positive substrate-viability signal from the spike.

**F2 — Capture-pane is unreliable for multi-line YAML ACTION blocks** [KNOWN]
tmux capture-pane drops field labels from multi-line YAML-style [ACTION:type]...[/ACTION] blocks when the prompt value spans many lines without a YAML `|` block scalar. This is a display artifact. The production MB-T35-revised parser MUST subscribe to raw PTY stream via CONSOLE-T01 broadcaster, not tmux capture-pane. Parser complexity is MEDIUM (multi-line field values that terminate at the next `key:` label or `[/ACTION]`).

**F3 — User-message authority injection triggers detection and refusal** [KNOWN]
First spawn attempt for hso-spike-successor used user-message injection with "treat as system-level authority" framing. The session correctly identified the classic prompt injection pattern, flagged the "synthetic fixture" markers, and refused to silently adopt the injected authority. This is correct §2.1 behavior and confirms: user-message injection cannot substitute for `--append-system-prompt` as an HSO initialization vector.

**F4 — pull-handoff + consequent action must span two turns** [KNOWN, from fixture construction]
The candidate system prompt §2 enforces "one action per turn." A pull-handoff-from-session action informs the NEXT turn's spawn-session or send-prompt action, not the same turn. Fixture construction at HALT 3.5 surfaced this as an action-bundling ambiguity. The candidate system prompt should explicitly state: "pull-handoff-from-session results inform the NEXT turn's action; do not emit a spawn or send-prompt in the same turn as a pull-handoff."

**F5 — BUILD.md dependency language must be declarative, not qualified-by-determination** [KNOWN, from scenario 3 M4]
M4 divergence root cause: BUILD.md contained "read-path API surface is independent — can begin if operator determines write-path independence is sufficient." The active orchestrator (full session context, HALT-ACTIVE-1 urgency) read this as "determination not yet made." The successor (fixture context only) read it as "determination is made — proceed." Ambiguity cost a PARTIAL rating. Production BUILD.md must use declarative statements: either "independent — may begin" or "blocked until MB-TXX delivers."

**F6 — HALT urgency not fully transmissible via swarm-state.md summary** [MODELED]
The active orchestrator's 51K accumulated context (including the HALT-ACTIVE-1 emission history) produced more conservative HALT-discipline on M4 than the successor's 29K fixture-read context. swarm-state.md summary entries may not preserve the weight behind outstanding HALTs. Production swarm-state.md schema should include an explicit `halt_urgency: high|medium|low` field and `halt_emitted_at:` timestamp to anchor successor context on HALT severity.

**F7 — Session summary format is consistent and appropriate, but emergent** [KNOWN]
All scenario 2 orchestrator summaries followed a consistent structure (task / files-touched / result / completion status / no-follow-up) without that format being explicitly specified in the candidate system prompt. The format is appropriate for swarm-state.md population. However, emergent format is fragile for downstream programmatic parsing. MB-T41 production prompt should specify the exact summary format fields to ensure deterministic parsing by MB-T35-revised.

**F8 — assign-task was not used; send-prompt-to-session preferred** [KNOWN]
Scenarios S09 and S10 expected assign-task (metadata marker per schema.ts §12 comment) but the orchestrator chose send-prompt-to-session in both cases. The orchestrator treated send-prompt-to-session as the primary dispatch action and assign-task as a metadata wrapper. If assign-task metadata is load-bearing for autopilot.startIntent or downstream BUILD.md sequencing, MB-T41 production prompt must explicitly instruct when to emit assign-task.

**F9 — Context-window growth decreases with repeated patterns** [KNOWN]
Scenario 4 showed declining token growth per round across 3 passes of the same S01-S10 scenarios (3,800/turn fresh → ~570/turn repeated). Scenario 5 showed declining per-round growth (5,982 round 1 → 870 round 10). Production HSO sessions become more token-efficient as they accumulate context on recurring workload types. The §3.4 backstop trigger should use a token-count monitor (not turn-count), calibrated to 65% fullness with a 15-turn handoff window.

**F10 — 4+ parallel sessions measurably consume weekly Max capacity** [KNOWN]
The /cost week view showed 14% of weekly usage from 4+ parallel sessions. At higher session counts (6-8), this would scale. Production HSO deployment running 3-5 sessions continuously should validate weekly consumption rate before committing to sustained swarm operation. The extra-usage overage budget ($200/month) was not touched in spike-scale operation (0% delta), but weekly rate limits are a separate constraint not visible from CC CLI.

---

## Architectural decisions

**D1 — --append-system-prompt is the mandatory HSO orchestrator initialization vector** [ADR REQUIREMENT]
User-message injection is insufficient and triggers detection/refusal (F3). The HSO orchestrator spawn script MUST use `--append-system-prompt` with the production system prompt. This applies to both the initial orchestrator spawn and any hot-swap replacement. MB-T37 (OrchestratorPoolManager) must encode this requirement in the spawn logic.

Implication: MB-T37 spawn logic uses: `claude --dangerously-skip-permissions --model claude-sonnet-4-6 --append-system-prompt "$(cat <system-prompt-path>)"`

**D2 — HALT urgency field required in swarm-state.md schema** [ADR REQUIREMENT]
The M4 divergence and F6 together establish that swarm-state.md summaries insufficiently convey HALT weight for successor orchestrators reading from cold context (F6). The swarm-state.md schema must include:
- `halt_urgency: high | medium | low` per active HALT entry
- `halt_emitted_at: <ISO timestamp>` per active HALT entry
MB-T41 production prompt must explicitly reference these fields when instructing the orchestrator how to write swarm-state.md HALT entries.

**D3 — Token-count monitoring for §3.4 backstop, not turn-count** [ADR REQUIREMENT]
Scenario 4 established that token growth rates vary by 6x+ across workload types (570-3,800 tokens/turn). Turn-count-based backstop triggers are unreliable. The §3.4 backstop must monitor the CC CLI token count from the status line (`tmux capture-pane | grep -o '[0-9]* tokens$'`) and fire at 65% fullness (130K of 200K), providing ~15 turns of clean-handoff headroom at blended rate.

**D4 — Pull-handoff is always a solo turn; spawn/send-prompt follows next turn** [ADR REQUIREMENT]
The MB-T41 production prompt must explicitly state: "After emitting pull-handoff-from-session, the result informs your NEXT turn's action. Do not attempt to bundle pull-handoff with spawn-session or send-prompt-to-session in the same turn." This prevents the two-action bundling anti-pattern exposed during fixture construction (F4).

**D5 — BUILD.md authoring discipline: declarative dependency statements only** [ADR REQUIREMENT]
Qualified-by-determination clauses ("can begin if operator determines...") create divergence between active and successor orchestrators (F5). Production BUILD.md must use declarative dependency declarations: either the dependency is resolved ("independent — may begin") or it is not ("blocked until MB-TXX WB1 GREEN"). No qualified clauses. This is an operator-authoring discipline requirement, not a substrate requirement.

---

## Consequences

**Positive (confirmed by spike):**
- Sonnet 4.6 CC CLI is viable as an HSO orchestrator for Conductor v3.5
- Anti-fabrication is embedded substrate behavior; cairn primitives apply without explicit per-scenario prompting
- Context window supports ~79-turn sessions at blended workload before 70% threshold
- Max extra-usage overage is negligible for spike-scale 3-session swarms
- TURN_INCOMPLETE protocol works reliably (1-second response, exact sentinel)
- Hot-swap continuity passes at 80% threshold with fixture-based context

**Constraints revealed:**
- --append-system-prompt is mandatory (user-message injection refused)
- swarm-state.md schema needs HALT urgency and timestamp fields
- BUILD.md authoring discipline is load-bearing for successor consistency
- Per-turn dispatch must be synchronous (CC CLI message queue creates measurement hazards; production dispatch daemon handles this by construction)
- Weekly rate-limit at scale (6-8 sessions) requires separate validation

**Deferred (full-scope validation outstanding):**
- Scenario 5 full-scope (30-min × 3 peers): deferred to dogfood window; reduced-scope passed at 0% extra-usage delta
- Scenario 4 precise per-turn growth curve: requires synchronous sequential re-run with clean novel inputs
- Production system prompt (MB-T41): this spike used a draft candidate prompt; production prompt will incorporate all findings (F4–F8)
- Scenario 1 re-run with pipe-pane capture: recommended to eliminate measurement ambiguity on the 3 capture-artifact cases

---

## Open followups

| ID | Body | From |
|----|------|------|
| MB-F-HSO-01-TURN-DISPATCH-SYNCHRONOUS | Production HSO dispatch must send one orchestrator prompt, wait for completion, then send next. CC CLI message queue causes measurement hazards and undefined ordering at scale. Tier 1 — load-bearing for correctness. | scenario-4 results |
| MB-F-HSO-01-WEEKLY-RATE-LIMIT-DOGFOOD | Full-scope scenario 5 (30-min × 3+ peers) must be re-run during dogfood window with Claude.ai usage dashboard open to measure weekly rate-limit delta. Current spike only measured extra-usage overage proxy. Tier 1. | scenario-5 results |
| MB-F-HSO-01-SYSTEM-PROMPT-MB-T41 | Candidate system prompt must be elevated to production prompt via MB-T41. Required amendments per this ADR: (a) pull-handoff bundling prohibition §D4; (b) HALT urgency field write instructions §D2; (c) summary format specification §F7; (d) assign-task emission guidance §F8. Tier 1. | scenario-1/2/3 results |
| MB-F-HSO-01-SCENARIO1-PIPE-PANE-RERUN | Scenario 1 had 3 capture-artifact cases; honest assessment is 90% but measurement is unconfirmed. A pipe-pane-captured re-run (10 fresh scenarios) would produce definitive first-turn well-formed rate. Tier 2. | scenario-1 results |
| MB-F-HSO-01-SCENARIO4-SYNCHRONOUS-RERUN | Scenario 4 per-turn token curve had 22/30 zero-delta artifacts from queue racing. A synchronous re-run (10 novel turns, explicit wait) would establish accurate per-turn rate distribution for §3.4 backstop calibration. Tier 2. | scenario-4 results |
