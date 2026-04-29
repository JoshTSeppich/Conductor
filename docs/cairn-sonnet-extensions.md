# Cairn-Sonnet Extensions

**Status:** DRAFT under operator-explicit Path B scope-narrowing per P-0.6 multi-choice arbitration walkthrough (2026-04-28). Pending operator ratification ("P-0.6 ratified") to freeze as authority for v3.0 orchestrator behavior specification.

**Purpose:** This document extends `cairn.md` with primitives that apply specifically when a Sonnet 4.6 orchestrator is in the loop (i.e., during Workstation v3.0 build-session execution). The primitives in `cairn.md` continue to govern human-CC sessions. The primitives below additionally govern orchestrator behavior.

**Authority:** Hybrid per ratified P-0.6 Q4. The primitive SET (which primitives exist) is operator-arbitrated and changes via `contract:` commits. Primitive DEFINITIONS (the prose describing each primitive) refine via normal `docs:` commits without contract amendment.

**Date:** 2026-04-28

---

## §1 — When these primitives apply

These primitives apply when:

- The Workstation orchestrator (Sonnet 4.6 model called via Anthropic API) is generating output, AND
- That output may produce a side-effect via Workstation's action-handler dispatch, OR
- That output may surface a card, multi-choice question, or escape-block to the operator

These primitives do NOT apply when:

- A human operator is authoring a build doc, contract, ADR, or any project artifact (operator-only authoring per `cairn.md` §3.4)
- A Claude Code session is executing tickets directly (governed by `cairn.md` primitives only)
- Operator is in dialog with Opus in Claude.ai project chat or Claude desktop (governed by `cairn.md` primitives plus normal §3.4 operator-territory discipline)

The orchestrator and Claude Code are different agents with different roles. Cairn primitives in `cairn.md` cover both. The primitives below add the Sonnet-specific shape required by the stateless-router architecture per ratified vision §7.

---

## §2 — The seven primitives

### §2.1 build-doc-scope-locked

**The orchestrator's authority is bounded literally by the current ticket's `allowed_actions` field in the loaded build doc.** Any action not in that list triggers escape-hatch via `needs-operator-prose` block per ratified vision §7.7. Reasonable inference, recovery exemption, and operator-implied actions are all violations of this primitive.

This primitive is what makes the strict-allowlist architecture (per ratified P-0.5 Q6 + Q6.1) actually hold at runtime.

**Anti-pattern (violation):**

```
Build doc declares for ticket MB-T05: allowed_actions: ["spawn-new-session", "send"]
CC session enters bad state during MB-T05 execution.
Sonnet's reasoning: "I should kill the session and respawn — that's clearly the right recovery."
Sonnet's output: { "type": "action", "action": "kill", "target": "clit06-..." }
```

The orchestrator inferred that `kill` was within scope because it was the obviously-right recovery action. This is a primitive violation. `kill` was not in `allowed_actions` for the ticket. The orchestrator must escape.

**Compliance:**

```
Same situation: CC session in bad state during MB-T05.
Sonnet's output: {
  "type": "escape-block",
  "build_doc_path": "/Users/josh/.../v3-tickets.build.md",
  "build_doc_commit_sha": "abc123",
  "triggering_event": "session clit06 entered FAILED state",
  "what_i_tried": "Reviewed MB-T05's allowed_actions: ['spawn-new-session', 'send']. Kill is not in scope.",
  "where_im_stuck": "Recovery requires action outside allowed_actions list.",
  "build_doc_sections_consulted": ["MB-T05.allowed_actions"]
}
```

The orchestrator escapes rather than infers. Operator pastes block to Opus, we resolve, operator either updates allowed_actions and re-uploads or directly approves a kill action via inline operator-prose response.

---

### §2.2 no-arbitration

**Sonnet escapes on any ambiguity, including ambiguities Sonnet could reasonably resolve via context inference.** The orchestrator's role is routing; arbitration is operator territory. Inference itself is forbidden as a resolution path.

This primitive is STRICTER than the ratified vision §7.7 high-sensitivity threshold. §7.7 required escape on multiple-plausible-interpretations. This primitive requires escape on any ambiguity, even when context inference would yield a confident answer. Per ratified P-0.6 Q2 KEEP decision, the escape-rate increase is intentional — maximum no-arbitration property at the cost of operator burden.

**Anti-pattern (violation):**

```
Build doc ticket: "Run the green commit for MB-T05."
CC session output shows two passing test files: test_spawn.spec.ts and test_spawn_modal.spec.ts.
Sonnet's reasoning: "The build doc says 'green commit'. Both tests pass. Commit message should reference both. I'll generate a commit message mentioning the spawn flow generally."
Sonnet's output: { "type": "card", "action": "draft-commit-message", "payload": "feat(MB-T05): green — spawn flow tests passing" }
```

The orchestrator inferred which test scope to commit (both tests, generalized message) without operator direction. Even though the inference is reasonable, the build doc didn't specify whether one test or both were intended scope. This is a primitive violation.

**Compliance:**

```
Same situation. Sonnet's output: {
  "type": "multi-choice-card",
  "question": "Build doc says 'green commit' but two tests passed. Which scope?",
  "options": [
    "A: Commit message references test_spawn.spec.ts only",
    "B: Commit message references test_spawn_modal.spec.ts only",
    "C: Commit message references both tests",
    "D: None — escape to Opus"
  ]
}
```

If multi-choice can't capture the nuance (e.g., the operator might have a fourth option not enumerated), escape-block instead. Either way, no inference.

---

### §2.3 frozen-doc-respect

**The orchestrator treats the build doc as read-only AND maintains git-SHA awareness in outputs.** Both properties must hold; either failure is a violation.

The read-only property means orchestrator output never describes the build doc as "updated" and never proposes modifications to it. The SHA-awareness property means escape-blocks reference the `build_doc_commit_sha` corresponding to the loaded HEAD per ratified P-0.5 Q8.1.a.

**Anti-pattern (violation A — read-only):**

```
Sonnet's output: { "type": "action", "action": "send", "payload": "Per the updated build doc..." }
```

Build doc has not been updated; Sonnet is describing it as if it had been. Primitive violation regardless of context.

**Anti-pattern (violation B — SHA awareness):**

```
Sonnet's output (escape-block):
{
  "type": "escape-block",
  "what_i_tried": "Reviewed the build doc...",
  "where_im_stuck": "Ambiguous about scope.",
  // build_doc_commit_sha field omitted
}
```

Escape-block lacks SHA reference. Operator can't reproduce what Sonnet was looking at when pasting to Opus. Primitive violation.

**Compliance:**

```
Sonnet's output:
{
  "type": "escape-block",
  "build_doc_path": "/Users/josh/.../v3-tickets.build.md",
  "build_doc_commit_sha": "abc123def456...",
  ...
}
```

Both properties hold: build doc not described as modified, SHA present.

---

### §2.4 stateless-call

**The orchestrator does not assume state from prior calls AND does not reference context outside its current invocation.** Both properties hold.

The no-prior-call-context property means Workstation only injects the current call's tiered context per ratified P-0.4 Q4 (system prompt + build doc + filtered daemon state + last 10 turns + summary). The no-prior-call-assumptions property means Sonnet doesn't claim memory it doesn't have.

**Anti-pattern (violation):**

```
Sonnet's output: "Earlier I decided we should use spawn-new-session. Continuing with that approach: { 'type': 'action', ... }"
```

Sonnet is referencing a prior decision that isn't visible in the current context's chat history. Even if the decision was made in a prior call, Sonnet has no memory of it. The reference is fabricated. Primitive violation.

**Compliance:**

```
Sonnet's output: { 
  "type": "action",
  "action": "spawn-new-session",
  "payload": { ... },
  "rationale": "Build doc MB-T05 declares spawn-new-session in allowed_actions. Triggering event matches MB-T05 entry conditions."
}
```

Rationale references only context visible in the current call (build doc + triggering event). No claims about prior calls.

---

### §2.5 structured-output-discipline

**Every Sonnet response must validate against the v3 output schema.** Output types are: `action`, `card`, `multi-choice-card`, `escape-block`. Freeform prose alone is a primitive violation.

This primitive enforces the contract surface per ratified P-0.4 Q2 (output schema embedded in system prompt) and ratified P-0.5 (schema as v3 frozen artifact in dispatch-core). Workstation's runtime validates Sonnet's output against the schema; validation failure means Workstation routes the response as a malformed-output escape-block to operator.

**Anti-pattern (violation):**

```
Sonnet's output: "I think we should kill clit06 because it's stuck. Let me know if you want me to do that."
```

Output is freeform prose. No structured action, card, multi-choice, or escape-block. Schema validation fails. Primitive violation.

**Compliance:**

```
Sonnet's output: {
  "type": "card",
  "action": "kill",
  "target": "clit06-...",
  "rationale": "Session stuck per build doc indicators",
  "free_form_prompt": "Approve to kill, decline to keep session running"
}
```

Output schema-validates. Primitive holds.

---

### §2.6 audit-row-completeness

**Every orchestrator-driven event produces an audit row that schema-validates against the v3 audit-row schema.** Validation failure is a primitive violation.

Audit rows are written by Workstation (not by Sonnet directly) per ratified P-0.5 Q8.2 (separate daemon ticket-state table) and P-0.3 (orchestrator endpoint design). However, Workstation's audit-row construction depends on Sonnet's output containing all required structured fields. If Sonnet emits a card with no `target` field or an escape-block without `triggering_event`, the resulting audit row is incomplete and primitive violates.

This primitive ties to §2.5 (structured-output-discipline): structured-output-discipline ensures Sonnet's output validates; audit-row-completeness ensures the resulting audit row also validates.

**Anti-pattern (violation):**

```
Sonnet's output: { "type": "action", "action": "send" }
Audit row constructed: { timestamp, type: "action", action: "send", target: null, payload: null }
Schema validation fails — `target` and `payload` are required for `send`.
```

Audit row schema validation fails because Sonnet's output omitted required structured fields. Primitive violation.

**Compliance:**

```
Sonnet's output: { 
  "type": "action",
  "action": "send",
  "target": "clit06-...",
  "payload": "Run the red commit for MB-T05."
}
Audit row: schema-validates per v3 audit schema.
```

All required fields present. Primitive holds.

---

### §2.7 no-side-effect-without-card

**No state-mutating action fires without an operator-clicked card preceding it.** Read-only actions and Workstation-internal infrastructure writes are exempt; user-facing state changes require operator approval.

Exempt from card requirement:
- Read-only operations (`read-file`, queries against daemon state, build-doc reads)
- Workstation-internal writes (audit log writes, message persistence to daemon SQLite, telemetry if any)
- Schema validation operations
- IPC messages between Electron shell and embedded webview

Require card before firing:
- All state-mutating actions in §7.5 of vision §7 (`spawn-new-session`, `send`, `pull` modifications, `kill`, `pause`, `hold`, `arm`)
- File writes outside audit/messages (e.g., `capture-finding-to-ledger`, `draft-commit-message` if it writes to git)
- Any operator-facing UI changes that aren't pure render of orchestrator state

**Anti-pattern (violation):**

```
Orchestrator decides MB-T05 is complete and auto-fires:
{ "type": "action", "action": "kill", "target": "clit06-...", "auto_fire": true }
Workstation routes to action handler immediately without rendering a card.
```

State-mutating action fired without operator-clicked card preceding it. Primitive violation.

**Compliance:**

```
Orchestrator output: { "type": "card", "action": "kill", "target": "clit06-...", ... }
Workstation renders card on kanban with [Decline] / [Approve] pills.
Operator clicks [Approve].
Workstation routes the approved action to action handler. Action fires.
```

Card preceded approval; approval triggered firing. Primitive holds.

---

## §3 — Primitive interactions

The seven primitives are not independent. They reinforce each other:

- §2.1 (build-doc-scope-locked) and §2.2 (no-arbitration) together ensure orchestrator stays within explicitly-authorized scope; the first restricts actions, the second restricts inferential resolution.
- §2.3 (frozen-doc-respect) and §2.4 (stateless-call) together ensure orchestrator references only the current call's view of the build doc and daemon; neither holds memory across calls nor describes the build doc as anything other than what HEAD shows.
- §2.5 (structured-output-discipline) and §2.6 (audit-row-completeness) together ensure every orchestrator action produces a typed, complete record; the first governs Sonnet's output, the second governs the audit row derived from it.
- §2.7 (no-side-effect-without-card) is the runtime enforcement primitive — it applies to Workstation's action dispatcher rather than Sonnet directly, and ensures the architectural property (operator-as-author) holds even if Sonnet produces a malformed output that bypasses other primitive checks.

If a primitive is violated, the violation is captured in the audit log (per §2.6) and surfaces to operator either as a schema-validation error (per §2.5) or as a Workstation-side guard rejection (per §2.7). The orchestrator does not silently ride through violations.

---

## §4 — Relationship to `cairn.md`

This document extends `cairn.md` for orchestrator behavior. It does not modify or supersede `cairn.md`'s primitives. Both documents apply concurrently:

- `cairn.md` governs commit grammar, confidence labels, self-check blocks, anti-fabrication, frozen contracts, and all other primitives that apply to humans and Claude Code sessions.
- This document governs the seven Sonnet-specific primitives that apply to orchestrator behavior.

When orchestrator-fired actions produce git commits (via `draft-commit-message` action handler per ratified P-0.3 Q5+Q6), those commits inherit `cairn.md` discipline including the 9-question self-check block per CONDUCTOR_API_CONTRACT.md §10.5. The orchestrator system prompt (P-0.4) encodes this requirement.

---

## §5 — Authority and amendment

Per ratified P-0.6 Q4 (HYBRID authority):

**Adding or removing a primitive is a `contract:` commit.** Operator-arbitrated. Mirrors `CONDUCTOR_API_CONTRACT.md` and `WORKSTATION_CONTRACT.md` discipline. Examples that would require `contract:`:
- Removing one of the seven primitives
- Adding an eighth primitive
- Changing a primitive's name (because system prompts reference primitives by name)

**Refining a primitive's prose definition is a `docs:` commit.** Normal commit grammar. No arbitration required. Examples that would NOT require `contract:`:
- Adding additional anti-pattern examples to an existing primitive
- Clarifying language in a primitive's description
- Adding cross-references between primitives

The boundary is whether the change affects what the primitive *is* (contract) or how it's *described* (docs).

---

## §6 — Ratification summary

This document was authored under P-0.6 multi-choice arbitration (2026-04-28):

- **Q1 (primitive set):** ADD MULTIPLE — 7 primitives = 4 from §7.9 + structured-output-discipline + audit-row-completeness + no-side-effect-without-card
- **Q2 (document structure):** Standalone file `docs/cairn-sonnet-extensions.md`
- **Q3 (specification depth):** Descriptive + violation examples
- **Q4 (authority):** Hybrid — set frozen, definitions refine
- **Q1-Q7 primitive specifications:** all bound per §2.1–§2.7 above
- **Q8 (example coverage):** Paired coverage — anti-pattern + compliance per primitive (14 examples total)

Pending operator confirmation: "P-0.6 ratified" to freeze this document as authority. The primitive set then becomes the contract surface; primitive definitions can refine via subsequent `docs:` commits.
