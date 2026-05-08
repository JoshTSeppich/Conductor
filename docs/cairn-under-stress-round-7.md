# Cairn Under Stress — Round 7 Evidence Harvest

**Round shape:** Single CC session (SPIKE-HSO-01) operator-supervised, with chat-Claude (Opus 4.7) as relay/architect/dispatch-author. ~4-5 hours wall-clock, 2026-05-08.

**Authoring posture:** Drafted by chat-Claude for operator review per §3.4 mechanical translation carve-out. Operator authors final text + commits.

**Anchor:** SPIKE-HSO-01 ADR `docs/adr/HSO-01-orchestrator-substrate-viability.md` (commit `c1b78c4`); v3.5 BUILD `docs/build-docs/CONDUCTOR_V3.5_BUILD.md` (commit `d3ab879`); FOLLOWUPS.md MB-F-HSO-01-* rows.

---

## §1 — Round shape disclaimer

[KNOWN] Round 7 was NOT a parallel-cairn engineered substrate-portability stress experiment like Round 5. It was a single CC session executing a single SPIKE under chat-Claude relay. Methodology evidence is captured here because the dispatch-authoring + execution discipline produced substantive findings, not because the round shape was multi-session.

**Round 5 vs Round 7 framing:**
- Round 5: 5 parallel sessions on engineered §3.22 cross-session shared-artifact density. Methodology evidence was about session-vs-session coordination.
- Round 7: 1 spike session driven by chat-Claude. Methodology evidence is about chat-Claude → CC → operator handoff discipline at gate boundaries.

Both are cairn-under-stress evidence, but they exercise different primitives. Filing this as Round 7 reflects sequencing, not parallel scope.

---

## §2 — Chat-Claude dispatch-authoring failures (caught by CC §3.1 anti-fabrication)

Three documented chat-Claude errors during SPIKE-HSO-01, all caught by CC's anti-fabrication discipline before any work fired:

### §2.1 Filesystem-mount path fabrication (HALT 0)

[KNOWN] Chat-Claude authored SPIKE-HSO-01 dispatch citing `/mnt/user-data/outputs/CONDUCTOR_V3.5_BUILD.md` as the operator-accessible path to the v3.5 BUILD draft.

**Reality:** That path resolves only in chat-Claude's filesystem mount. CC sessions cannot read from chat-Claude's `/mnt/user-data/outputs/`. CC session correctly probed both candidate paths (`/mnt/user-data/outputs/` and `docs/build-docs/`), found neither resolved on operator's local disk, and HALTed.

**Failure mode:** Chat-Claude under "all recmd best judgment" velocity cited a path it had access to without verifying operator-side accessibility.

**Recovery:** Operator copied draft from chat-Claude's outputs panel to `~/Downloads/`, then committed to `docs/build-docs/CONDUCTOR_V3.5_BUILD.md` (commit `d3ab879`). CC re-ran HALT 0 against committed path, cleared cleanly.

**Methodology learning:** Chat-Claude artifacts must be assumed inaccessible to operator-machine until operator commits or copies. Chat-Claude dispatches cannot reference `/mnt/user-data/*` or `/mnt/project/*` paths as operator-accessible.

### §2.2 Line-number drift from stale memory (HALT 1)

[KNOWN] Chat-Claude dispatch §2 instructed CC to read `coarchitect-ipc.ts lines 360-380` for the fireSpawn placeholder.

**Reality:** Actual fireSpawn location at HEAD `534ab52` was line 429. File evolved from MB-T17 + MB-T24 + MB-T25 + MB-T28 + MB-T34 ladder since `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED` followup was authored.

**Failure mode:** Chat-Claude cited line numbers from followup body memory (`coarchitect-ipc.ts:365-374`) rather than probe-verifying at dispatch-authoring time.

**Recovery:** CC located actual fireSpawn at line 429 via grep. Surface as Item 4 of HALT 1 ack. Non-blocking; content confirmed; spike scope unchanged.

**Methodology learning:** Chat-Claude dispatch authoring must probe-verify file paths AND line numbers at authoring time. Memory-cited line numbers from followup bodies or prior conversations are stale by default; repos evolve continuously.

### §2.3 Project-instructions filesystem-mount path fabrication (HALT 1)

[KNOWN] Chat-Claude dispatch §2 item 5 instructed CC to read `/mnt/project/foxworks-project-instructions.md` for §3.7 + §3.18 cairn primitives.

**Reality:** That path resolves only in chat-Claude's project mount. The operator-machine equivalent is `CLAUDE.md` (auto-loaded at CC session start). Same failure mode as §2.1.

**Recovery:** CC session correctly identified CLAUDE.md as the operative equivalent and registered §2.5 halt discipline + §3.18 from there.

**Methodology learning:** Same as §2.1 — chat-Claude artifacts assumed inaccessible. Plus: chat-Claude must distinguish between `foxworks-project-instructions.md` (a chat-Claude-only project prompt) and `CLAUDE.md` (the operator-machine canonical equivalent).

---

## §3 — Substrate-positive findings (Sonnet 4.6 under CC CLI)

Four substantive positive findings during SPIKE-HSO-01:

### §3.1 Anti-fabrication is embedded substrate behavior, not prompted (F1)

[KNOWN] Sonnet 4.6 applied §3.1 anti-fabrication discipline unprompted across multiple scenarios:

- **S04 (scenario 1):** orchestrator pulled handoff before spawning replacement, explicitly citing inability to claim WB1-WB3 work content without reading it
- **S09 (scenario 1):** orchestrator instructed peer to check git log before scaffolding, anti-fabrication-applied to peer task design
- **Scenario 2 T3 summary:** orchestrator echoed "(§3 partial list shown)" qualifier from peer's stdout rather than fabricating completeness
- **Scenario 3 HALT 3.5 first spawn:** successor identified user-message authority injection as classic prompt-injection pattern, refused to silently adopt the injected authority

None of these behaviors appeared explicitly in the candidate system prompt §6 prohibitions. All emerged from substrate's embedded discipline.

**Methodology significance:** Sonnet 4.6 substrate has anti-fabrication built into its training corpus deeply enough that explicit prompting is not required. This is the strongest substrate-viability signal SPIKE-HSO-01 produced.

### §3.2 Within-session methodology learning at HALT boundaries

[KNOWN] CC session demonstrated within-session learning at multiple HALT gates:

- **HALT 0 → HALT 1:** Caught chat-Claude path fabrication (§2.1), surfaced honestly
- **HALT 1:** Surfaced 2 additional chat-Claude errors (§2.2, §2.3) discovered during source-of-truth reads
- **HALT 1.5 (chat-Claude-added):** Authored candidate system prompt with field names probe-verified from actual schema.ts (not memory)
- **Scenario 1:** Distinguished true emission failures from capture-pane artifacts via self-correction-loop verification
- **Scenario 3 HALT 3.5:** Refused user-message authority injection; chat-Claude issued corrected `--append-system-prompt` instruction
- **Scenario 4:** Surfaced CC CLI message-queue racing as production-relevant infrastructure constraint
- **Scenario 5:** Disclosed `/cost` meter vs Claude.ai weekly-bar distinction as measurement limitation

**Methodology significance:** Single-session learning is a real cairn primitive. CC sessions absorb early-session findings into later-session decisions without operator instruction. Round 1 evidence noted within-session-self-correction; Round 7 confirms it across HALT boundaries.

### §3.3 Chat-Claude-added halt gates demonstrate evolutionary discipline

[KNOWN] Chat-Claude added 3 halt gates beyond the original SPIKE-HSO-01 dispatch:

- **HALT 1.5:** Candidate system prompt review before §3.3 spawn
- **HALT 3.5:** Swarm-state.md fixture review before §5.4 successor spawn
- **HALT 3.6:** Revised fixture review after revision applied

**Methodology significance:** When chat-Claude spots a load-bearing artifact authoring step that isn't currently halt-gated, gate it. This is an emergent cairn primitive: HALT-gate-on-load-bearing-artifact-authoring. Worth formalizing.

### §3.4 Capture-vs-fidelity finding traced cleanly to production architecture

[KNOWN] Scenario 1 surfaced that tmux capture-pane drops field labels from multi-line YAML-style ACTION blocks. CC session traced this to MB-T35-revised parser scope: production parser MUST use PTY stream subscription (CONSOLE-T01 broadcaster), not capture-pane. Pivoted measurement infrastructure from capture-pane to pipe-pane mid-spike for scenarios 2-5.

**Methodology significance:** Spike-instrumentation findings translate to production-architecture requirements. This is the load-bearing cairn-tooling pattern: methodology evidence becomes architectural constraint, not just process documentation.

---

## §4 — Architectural findings via cairn primitives

Three architectural findings emerged from cairn discipline applied during scenarios:

### §4.1 M4 divergence: BUILD.md ambiguity surfaced via cairn

[KNOWN] Scenario 3 M4 was the only PARTIAL rating (4/5 = 80% consistent). Active orchestrator and successor diverged on a HALT-pending decision. Both responses coherent; divergence root-caused to BUILD.md fixture qualifier ("can begin if operator determines write-path independence is sufficient").

**Methodology significance:** Cairn discipline made the divergence interpretable. Both sessions applied principled reasoning; the ambiguity in fixture authorship was the root cause, not substrate failure. This translates to D5 (declarative BUILD.md dependency statements; no qualified-by-determination clauses) — an operator-side BUILD.md authorship discipline requirement.

### §4.2 HALT urgency not transmissible via summary alone (F6, D2)

[KNOWN] Active orchestrator's 51K accumulated context (including HALT-ACTIVE-1 emission history) produced more conservative HALT-discipline than successor's 29K fixture-summary context. swarm-state.md summary entries lose the weight behind outstanding HALTs.

**Methodology significance:** Stateless-worker architecture requires explicit metadata preservation, not summary prose alone. swarm-state.md schema must include halt_urgency + halt_emitted_at + halt_blocking fields. This is D2 in the ADR; operative requirement for MB-T38 + MB-T41.

### §4.3 User-message authority injection triggers detection (F3, D1)

[KNOWN] First successor spawn used user-message injection of system-level authority claims; correctly refused as prompt injection. `--append-system-prompt` is the only authorized HSO initialization vector.

**Methodology significance:** Substrate-defended security primitive translates to architecture requirement. MB-T37 OrchestratorPoolManager spawn logic MUST encode `--append-system-prompt` as canonical command. Operator cannot bypass this even with `--dangerously-skip-permissions` because the substrate enforces it.

---

## §5 — Methodology amendment candidates (operator-only authoring)

Three amendments to project instructions §3 worth considering at next operator-side ratification:

### §5.1 §3.1 anti-fabrication amendment — chat-Claude dispatch-authoring extension

**Proposed amendment text:**

> Chat-Claude dispatch-authoring must probe-verify all file paths, line numbers, and SHAs at dispatch-authoring time. Memory-cited paths/lines from followup bodies, prior conversations, or training data are stale by default. Particular failure modes:
> 
> 1. Chat-Claude filesystem-mount paths (`/mnt/user-data/*`, `/mnt/project/*`) cited as operator-accessible. CC sessions cannot resolve these. Chat-Claude must cite operator-machine paths only (`docs/`, `~/Downloads/`, etc.) or explicitly frame as "after operator commits/copies to local disk."
> 
> 2. Line-number drift from repository evolution. Followup bodies cite line numbers at filing time; files evolve. Probe-verify at dispatch-authoring time.
> 
> 3. Stale SHA citations. Anchor dispatches against current `main` HEAD probe-verified at authoring time, not against memory of last-known SHA.
> 
> Chat-Claude under "best judgment" velocity is particularly susceptible to these failure modes. Strict cairn discipline applies regardless of authorization velocity.

**Significance:** Round 5 post-mortem identified `MB-F-ROUND5-DISPATCH-AUTHORING-PREFILL-VERIFICATION` (4/5 sessions found tickets pre-shipped). Round 7 identified 3 chat-Claude path/line errors caught at HALT 0/HALT 1. Pattern is consistent: chat-Claude dispatch-authoring at velocity skips probe-verification on cited paths/lines.

### §5.2 §3.X new primitive — HALT-gate-on-load-bearing-artifact-authoring

**Proposed amendment text:**

> When chat-Claude or operator spots a load-bearing artifact authoring step that isn't currently halt-gated in an existing dispatch or session flow, gate it. Load-bearing artifacts include:
> 
> - System prompts (HSO orchestrator system prompt, candidate spike prompts)
> - Fixtures used as measurement inputs (BUILD.md fixtures, swarm-state.md fixtures, scenario-3 inputs)
> - Schema additions (halt_urgency field, summary format spec, action variant payload)
> - Re-arbitration records (Q-V35-4 amendment, frozen-contract amendments)
> 
> Cost of HALT-gate-on-load-bearing-artifact: ~30 seconds of operator review. Risk avoided: measurement against flawed artifact, downstream architectural drift, fabrication-by-omission. Strict cairn discipline says when in doubt, gate.

**Significance:** Round 7 added HALT 1.5, HALT 3.5, HALT 3.6 dynamically beyond original dispatch. All three caught real issues (system prompt review, fixture structural ambiguity, fixture revision verification). Worth formalizing as primitive.

### §5.3 §3.7 halt discipline amendment — distinguish chat-Claude vs operator HALT origins

**Proposed amendment text:**

> §3.7 halt discipline applies to all HALT-state origins:
> 
> - Operator-imposed HALTs (gate between phases, awaiting operator ack) — strict literal "do nothing"
> - Chat-Claude-added HALTs (load-bearing artifact review per §3.X) — strict literal "do nothing"
> - Self-imposed HALTs (CC session emits [HALT] block per §3.18 anti-fabrication) — strict literal "do nothing" until operator clears
> 
> All three forms are equivalent in halt-discipline terms. Chat-Claude or CC session adding a HALT mid-flow is operator-arbitrable territory; operator can ratify the halt-gate or override with explicit disclosure. Adding a HALT silently is itself a methodology-positive action; ignoring or routing around an added HALT is a §3.7 violation.

**Significance:** Round 7 demonstrated that HALTs can be added during execution by either chat-Claude (via response message instructing CC to halt at additional gate) or by CC session itself (via emitting halt-and-surface response). Both are legitimate; both require strict literal halt discipline. Worth codifying.

---

## §6 — Cross-session methodology propagation

[MODELED] Round 7 evidence supports the cairn-arc-synthesis.md §8 substrate-portability claim: cairn primitives propagate across sessions through coordination notes and within-session learning, not just through training-corpus inheritance.

**Round 7 specific evidence:**
- CC session inherited Round 5 + Round 6 + dogfood-blocker session methodology evidence via CLAUDE.md (auto-loaded at session start)
- CC session applied per-commit-push discipline cleanly without operator instruction (commit `c1b78c4` push verified via empty `git log origin/main..HEAD`)
- CC session applied territory-check discipline (`git status --short` before commit) without operator instruction
- CC session honored `.gitignore *.log` exclusion correctly without force-add prompting

**Methodology significance:** Cairn discipline transfers across sessions through repo-anchored evidence + CLAUDE.md auto-load + within-session learning at HALT boundaries. Round 7 spike confirmed this transfer is robust under Sonnet 4.6 substrate; downstream Cairn-tooling roadmap can rely on it.

---

## §7 — Followups for Round 7 evidence harvest

These are operator-only authorship territory; chat-Claude can draft for review but cannot author final.

### §7.1 Project instructions §3.1 amendment (chat-Claude dispatch-authoring extension)

Per §5.1 above. Operator decides ratification at next operator-side methodology amendment window.

### §7.2 Project instructions §3.X new primitive (HALT-gate-on-load-bearing-artifact-authoring)

Per §5.2 above. Operator decides ratification.

### §7.3 Project instructions §3.7 amendment (HALT origins distinction)

Per §5.3 above. Operator decides ratification.

### §7.4 Cairn-tooling roadmap input

Round 7 evidence informs Cairn-tooling MVP scope (Group Gamma flagship, post-Conductor-v2). Specifically:
- `verify-dispatch-paths` primitive: probe-verify chat-Claude-cited paths against operator-machine filesystem at dispatch-authoring time
- `verify-dispatch-lines` primitive: probe-verify chat-Claude-cited line numbers against current `main` HEAD at dispatch-authoring time
- `gate-load-bearing-artifact` primitive: enforce HALT-gate-on-load-bearing-artifact-authoring per §5.2
- These add to existing 4 candidate cairn-tooling primitives (commit grammar verification, contract freeze enforcement, scope fence enforcement, halt discipline enforcement)

---

## §8 — Summary

**Round 7 produced substantial cairn-under-stress evidence in single-session shape.** Three chat-Claude dispatch-authoring failures caught by CC §3.1 anti-fabrication discipline; four substrate-positive findings; three architectural findings; three methodology amendment candidates; cross-session methodology propagation evidence.

**Methodology evidence trajectory:** Round 4 (within-session self-corrections, 2 incidents) → Round 5 (parallel-cairn substrate-portability stress, 5 sessions, 4-of-5 prefill mismatch) → Round 6 (4 ticket dispatches, no formal evidence harvest) → Round 7 (single-session spike with chat-Claude relay, methodology evidence is about handoff discipline at gate boundaries).

**Recmd next steps:** File §7 amendments at next operator-side methodology window. Round 5 + Round 6 evidence harvests still pending; consider authoring all three (Round 5, 6, 7) at the same operator-side session for cross-round pattern recognition.

---

**Confidence labels throughout:**
- KNOWN: SPIKE-HSO-01 evidence, commit SHAs, scenario results, dispatch-authoring errors caught
- MODELED: methodology amendment text proposals (operator-arbitrated final form)
- SPECULATIVE: none — all findings anchor on KNOWN spike evidence or KNOWN dispatch artifacts

**Operator action required:**
1. Read this evidence harvest draft
2. Revise content where chat-Claude framing is wrong or incomplete
3. Commit to `docs/cairn-under-stress-round-7.md` (or operator-chosen path) under operator-authorship
4. Decide which §5.1-§5.3 methodology amendments to ratify at next operator-side window
