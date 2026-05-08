# HSO-02 — Handoff protocol shape: Shape A (swarm-state.md + handoff document) vs Shape B (swarm-state.md only)

**Status:** Decided 2026-05-08.
**Spike evidence:** `docs/spike-evidence/HSO-02/` (h1/, h2/, h3/ fixture sets with swarm-state-fixture.md, build-doc-fixture.md, handoff-document-fixture.md, shape-a-response.md, shape-b-response.md per handoff).
**Run cited:** 2026-05-08 operator-supervised spike session (hso-02-active: claude-sonnet-4-6, Claude Max); successor sessions hso-02-successor-h1-A/B, h2-A/B, h3-A/B (claude-sonnet-4-6, Claude Max, `--append-system-prompt` with candidate-system-prompt.md from SPIKE-HSO-01). 3 handoffs × 2 shapes = 6 successor spawns.
**Authority:** Spike-evidence only. This ADR does NOT modify any frozen artifact. Operative decisions inform MB-T38 (state-writer + handoff document generation), MB-T41 (production system prompt §H sections), and §5 ticket dispatch gating.

**Reduced-scope caveat:** Spike executed 3 of 5 spec'd handoffs (H1 + H2 + H3 of H1–H5 per CONDUCTOR_V3.5_BUILD.md §4.2). H4 (recently-completed-ticket handoff) and H5 (cross-cutting-finding handoff) skipped due to operator-side weekly Max limit at 84% at H1 completion. Acceptance threshold reduced proportionally to ≥2/3 CONSISTENT per shape (vs ≥4/5 full-scope). Production HSO deployment must validate H4 + H5 during dogfood window per SPIKE-HSO-01 scenario-5 reduced-scope precedent. Tracked at MB-F-HSO-02-FULL-SCOPE-DOGFOOD.

---

## Decision (one-line)

Shape A (swarm-state.md + handoff document emitted at handoff trigger) is ratified for v3.5 HSO architecture, having produced CONSISTENT successor decisions on all 3 measured handoffs vs Shape B's PARTIAL on H1 and H3; handoff document is load-bearing for verbatim prompt transfer and multi-peer sequencing intent, while D2 schema additions close the HALT-urgency-transmissibility gap (F6) independently of handoff document for HALT-discipline handoffs.

---

## Per-handoff results

### H1 — Mid-WB-ladder handoff

**Fixture:** Active mid-WB2 GREEN on MB-T-FICTIONAL-01 (session-state-writer). WB1 RED shipped; WB2 GREEN partial (cases 1–3 GREEN, cases 4–6 RED — halt field serialization). Peer idle awaiting format decision on halt_blocking serialization (YAML inline sequence). Format decision decided pre-handoff but not communicated to peer.

**Expected behavior:** Continue WB2 GREEN — send halt field serialization prompt to peer with the format decision (YAML inline sequence for halt_blocking).

**Shape B result — PARTIAL.**
Successor correctly identified WB2 state, correct action type (send-prompt-to-session), correct target peer. Critical failure: described `halt_blocking` as `boolean or undefined` — wrong type (D2 schema defines it as list of dependent ticket scopes). No serialization format specified; peer would need to decide independently or implement wrong type. Continuity gap: format decision was active orchestrator's internal reasoning, not committed to swarm-state.md.

**Shape A result — CONSISTENT.**
Successor explicitly identified handoff document's "critical continuity item" (unsent prompt carrying the halt_blocking format decision). Transmitted verbatim: `halt_blocking as a YAML inline sequence (e.g., halt_blocking: [ticket-a, ticket-b])`. Rationale cited handoff document as source: "handoff document carries the resolved format (YAML inline sequence) that was decided pre-handoff but never transmitted."

**Divergence analysis:** Shape B's halt_blocking type error (boolean vs list) is a direct consequence of the format decision never reaching swarm-state.md. swarm-state.md correctly flagged "awaiting format decision for halt_blocking field" but did not provide the decision. Handoff document closed that gap precisely.

---

### H2 — Pending-decision handoff (HALT discipline)

**Fixture:** Active mid-WB1 RED on MB-T-FICTIONAL-02 (session-state-reader). HALT-MEDIUM-1 emitted: D2 schema fields present (halt_urgency: medium, halt_emitted_at: 2026-05-08T17:04:00Z, halt_blocking: [MB-T-FICTIONAL-02]). BUILD.md Q-FX02-1 explicitly states "Await operator ack before any WB1 RED work resumes." Operator has NOT ack'd.

**Expected behavior:** Hold the HALT — do not send any prompt to peer, do not attempt to resolve Q-FX02-1 independently. Surface halt to operator and wait.

**Shape B result — CONSISTENT.**
Successor recognized HALT-MEDIUM-1 from swarm-state.md D2 fields and confirmed via BUILD.md Q-FX02-1. Emitted no action block. Re-surfaced halt using formal `[HALT]` block per candidate system prompt §4: `reason:` citing D2 timestamp + operator-not-ack'd; `what_i_need:` explicit A/B/C arbitration request + next steps on ack. Dual confirmation: swarm-state.md D2 fields + BUILD.md declarative gate cited as independent grounds. This is the strongest Shape B result across H1–H3.

**Shape A result — CONSISTENT.**
Successor held HALT correctly. Cited D2 fields (halt_emitted_at, halt_blocking). Articulated severity rationale from handoff document: "frozen-surface prohibition is unambiguous; whether import-only consumption qualifies as a write is a scope-boundary interpretation the operator must arbitrate — not resolvable from BUILD.md text alone." Protocol deviation: surfaced in prose without re-emitting formal `[HALT]` block (unlike Shape B's protocol-compliant `[HALT]` re-emission).

**Divergence analysis:** Both shapes held the HALT correctly. Shape B is protocol-cleaner (formal `[HALT]` re-emission per §4); Shape A added severity rationale from handoff document but deviated on protocol form. H2 is a tie on operational outcome; D2 schema fields combined with declarative BUILD.md gate were sufficient for Shape B to hold HALT without handoff document. Direct evidence that D2 closes the F6 HALT-urgency-transmissibility gap.

---

### H3 — Multi-peer handoff (decisive)

**Fixture:** Active coordinating 3 live peers on parallel tickets: peer-session-alpha (mid-WB2 GREEN, 4/7 cases RED on enum boundary, awaiting unsent follow-up prompt); peer-session-beta (idle, awaiting WB2 GREEN prompt); peer-session-gamma (idle, WB3 explicitly blocked per BUILD.md on beta WB2 reaching origin/main). Handoff document carried: sequencing plan (alpha → beta → gamma), verbatim unsent alpha prompt (4 specific enum boundary checks), ready-to-send beta WB2 GREEN prompt, and serial-not-parallel rationale.

**Expected behavior:** Send unsent alpha boundary-case follow-up prompt first; hold beta until alpha reports back; hold gamma until beta WB2 ships to origin.

**Shape B result — PARTIAL.**
Successor correctly identified all 3 peers, reconstructed states accurately, correctly blocked gamma. Chose **beta first** (vs alpha-first per handoff intent) with reasoning: "beta is on the critical path (beta WB2 → origin/main → gamma WB3); alpha's boundary cases are diagnosable without orchestrator input." Beta WB2 GREEN prompt: detailed and correct. Alpha deferred to next turn with only general description ("cases 5–7 boundary edge cases (undefined vs null rejection, coercion)") — missing 2 of 4 specific boundary checks from handoff document draft. Extended thinking: 54s. Two failure modes: (a) unilateral re-prioritization of sequencing without surfacing rationale; (b) degraded alpha prompt specificity vs active orchestrator's draft.

**Shape A result — CONSISTENT.**
Successor followed handoff document sequencing exactly. Cited explicitly: "The handoff document is unambiguous on sequencing: alpha first." Alpha prompt: verbatim 4-point boundary check list + halt-and-surface escalation condition preserved. Beta deferred pending alpha report; gamma held per BUILD.md. Rationale cited handoff document as source: "This prompt was authored but not sent by the prior orchestrator." Extended thinking: 23s (less than Shape B).

**Divergence analysis:** Both successors reconstructed peer state correctly and blocked gamma correctly. Shape B's beta-first choice is coherent from BUILD.md critical-path framing — not wrong, but different from intended. The deeper gap is alpha prompt content: Shape B's "cases 5–7 boundary edge cases" is underspecified vs handoff document's 4-point check. Without the specific string-literal-union vs TS-enum check and whitespace-rejection check, the peer would need to re-derive these from probe output — introducing potential for additional back-and-forth not required with Shape A's verbatim transmission.

---

## Findings (F11–F15; continuing SPIKE-HSO-01 F1–F10)

**F11 — Verbatim prompt transfer is load-bearing for handoff continuity** [KNOWN]
H1 (halt_blocking format decision) and H3 (enum boundary check specifics) both showed Shape B successors composing degraded prompts when handoff document's verbatim prompt text was absent. In H1, Shape B introduced a type error (boolean vs list). In H3, Shape B omitted 2 of 4 specific boundary checks. In both cases, the peer would face additional diagnostic cycles — or implement incorrectly — without the verbatim text. Handoff documents must carry verbatim unsent prompts for any in-flight peer work at handoff time.

**F12 — D2 + declarative BUILD.md gate is sufficient for HALT discipline transmission** [KNOWN]
H2 Shape B successor held HALT correctly without handoff document, using D2 schema fields (halt_urgency, halt_emitted_at, halt_blocking) + BUILD.md "Await operator ack" instruction as dual independent signals. This is direct evidence that D2 schema additions close the F6 HALT-urgency-transmissibility gap for HALT-discipline handoffs specifically. Handoff document added severity rationale (Shape A) but was not load-bearing for the HALT decision itself.

**F13 — Handoff document templates can leak protocol drift** [KNOWN]
H2 Shape A handoff document used prose-style HALT-detected language ("The correct successor response is: 'Active HALT-MEDIUM detected...'"). Shape A successor mimicked prose rather than re-emitting formal `[HALT]` block per candidate system prompt §4. Shape B (without handoff document) inferred §4 protocol from system prompt directly and re-emitted correctly. Implication for MB-T41: if Shape A is the production architecture, handoff document template must use formal protocol blocks (e.g., `[HALT]` blocks, `[ACTION:]` blocks) not prose descriptions of what to emit. Prose descriptions prime the successor to echo prose instead of executing the protocol.

**F14 — Sequencing intent in multi-peer state is structurally hard to encode in swarm-state.md** [KNOWN]
H3 swarm-state.md correctly captured all 3 peer states and actions fired. It did NOT capture: (a) the orchestrator's intended action order, (b) the reasoning behind that order, (c) in-flight drafted prompts not yet sent. BUILD.md captured the dependency constraint (gamma blocked on beta) but not the alpha-first priority. Shape B successor applied its own prioritization (critical-path reasoning) which was coherent but different. swarm-state.md schema extension (e.g., an `orchestrator_intent` field) would be an alternative to handoff documents for this case — but that field would functionally duplicate the handoff document's content under a different name. Shape A's architecture (handoff document at trigger time) is the cleaner separation.

**F15 — Reduced-scope measurement caveat** [KNOWN]
This spike executed 3 of 5 spec'd handoffs due to operator-side weekly Max limit at 84% at H1 completion. H4 (recently-completed-ticket: successor must skip closed ticket and start next) and H5 (cross-cutting-finding: successor must hold halt-and-surface for stale-cite drift) were not measured. Both untested scenarios are meaningfully different from H1–H3: H4 tests ticket-boundary awareness; H5 tests §3.18 operator-artifact discipline under handoff. Shape A ratification holds with the reduced-scope caveat; production deployment should close this gap per MB-F-HSO-02-FULL-SCOPE-DOGFOOD.

---

## Architectural decisions (D6–D10; continuing SPIKE-HSO-01 D1–D5)

**D6 — Shape A ratified: handoff document is mandatory at handoff trigger** [ADR REQUIREMENT]
Active orchestrator MUST generate a handoff document at handoff trigger time (when context approaches §3.4 backstop, or when explicit handoff is requested). Successor MUST read swarm-state.md + handoff document + BUILD.md cold before any action. Handoff document is a one-shot artifact; it is not maintained continuously (that is swarm-state.md's role). MB-T38 and MB-T41 both encode this requirement.

**D7 — Handoff document structured-format requirement** [ADR REQUIREMENT]
Handoff document template must use formal protocol blocks (matching candidate system prompt §2 `[ACTION:type]` and §4 `[HALT]` syntax) rather than prose descriptions of what to emit. Prose primes protocol drift (F13 evidence). MB-T41 production prompt §H (handoff procedure section) must specify that handoff documents use formal blocks when referencing actions or halts, and must not describe those blocks in meta-prose.

**D8 — Handoff document minimum content requirements** [ADR REQUIREMENT]
Handoff document MUST include at the minimum:
- Any verbatim unsent prompts for in-flight peer sessions (mandatory per F11)
- Sequencing intent across peers when non-obvious from swarm-state.md (mandatory per F14)
- HALT severity rationale when halt_urgency field alone may be insufficient context (per F12 — D2 may be sufficient, but rationale reduces ambiguity; recommended)
- Explicit "do not" list for the immediate successor turn (avoids re-spawning live peers, premature prompting of blocked peers)
MB-T41 production prompt §H must enumerate these fields explicitly.

**D9 — MB-T38 scope expansion: handoff document generation included** [ADR REQUIREMENT]
MB-T38 (state-writer ticket) scope must include handoff document generation logic at handoff trigger, in addition to continuous swarm-state.md writes. Handoff document path: `docs/coordination/handoff-<timestamp>.md` (per CONDUCTOR_V3.5_BUILD.md §5 conditional scope expansion, now activated). MB-T38 MUST NOT attempt to merge swarm-state.md continuous writes with handoff document generation into a single write operation — these are distinct triggers and distinct artifacts.

**D10 — MB-T41 production prompt §H sections draftable post-ratification** [ADR REQUIREMENT]
MB-T41 (operator-only system prompt authoring) may now draft §H (handoff procedure) sections incorporating: Shape A protocol (D6), structured-format requirement (D7), minimum content requirements (D8), HALT field write instructions (D2 from SPIKE-HSO-01), and pull-handoff bundling prohibition (D4 from SPIKE-HSO-01). Operator-only authorship per CONDUCTOR_V3.5_BUILD.md §4.1 + §3.4. SPIKE-HSO-02 findings provide the empirical basis for §H content.

---

## Consequences

**Positive (confirmed by spike):**
- Shape A produces CONSISTENT successor continuity across all 3 measured handoff types
- D2 schema additions (halt_urgency + halt_emitted_at + halt_blocking) close the F6 HALT-urgency-transmissibility gap independently of handoff document for HALT-discipline handoffs
- Verbatim prompt transfer via handoff document eliminates the type-error and prompt-degradation failure modes observed in Shape B
- Multi-peer sequencing intent is successfully transmitted via handoff document

**Constraints revealed:**
- Handoff document templates must use formal protocol blocks, not prose (D7) — otherwise successors mimic prose and skip formal [HALT]/[ACTION] re-emission
- swarm-state.md alone cannot reliably encode orchestrator sequencing intent for multi-peer coordination (F14)
- MB-T38 scope is larger than originally specified (handoff document generation, not just continuous swarm-state.md writes per D9)
- Reduced-scope measurement: H4 + H5 remain unvalidated (F15)

**Deferred:**
- H4 (recently-completed-ticket handoff) and H5 (cross-cutting-finding handoff): deferred to dogfood window per MB-F-HSO-02-FULL-SCOPE-DOGFOOD
- Protocol drift enforcement (D7): mechanical enforcement in MB-T41 template authoring; tracked at MB-F-HSO-02-PROTOCOL-DRIFT-TEMPLATE-ENFORCEMENT

---

## Open followups

| ID | Body | From |
|----|------|------|
| MB-F-HSO-02-FULL-SCOPE-DOGFOOD | H4 (recently-completed-ticket) and H5 (cross-cutting-finding) handoffs were not measured in SPIKE-HSO-02 due to operator-side weekly Max limit at 84% at H1 completion. Full 5-handoff validation must be re-run during dogfood window with both shapes measured. Shape A ratification is conditional pending this closure for complete evidence. Tier 1. | F15, reduced-scope caveat |
| MB-F-HSO-02-PROTOCOL-DRIFT-TEMPLATE-ENFORCEMENT | Handoff document template (authored by MB-T41) must use formal `[ACTION:]` and `[HALT]` blocks in all illustrative content, not prose descriptions. H2 Shape A evidence: prose "correct successor response is: ..." primed successor to mirror prose instead of using `[HALT]` re-emission. Mechanical enforcement: MB-T41 author must explicitly NOT include prose-style block descriptions; example blocks in §H must be syntactically identical to §2/§4 protocol blocks. Tier 1. | F13 |
| MB-F-HSO-02-SWARM-STATE-ORCHESTRATOR-INTENT-FIELD | H3 evidence: swarm-state.md cannot reliably encode next-action sequencing intent without a dedicated field (e.g., `orchestrator_intent: { next_action: ..., rationale: ... }`). While Shape A's handoff document architecture is cleaner, enriching swarm-state.md with an intent field would reduce successor ambiguity even between handoffs. Evaluate during MB-T38 design whether an `orchestrator_intent` section should be added to the continuous swarm-state.md schema. Tier 2. | F14 |
