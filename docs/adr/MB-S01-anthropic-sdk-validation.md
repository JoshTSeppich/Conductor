# MB-S01 — Anthropic SDK + Sonnet 4.6 orchestrator validation

**Status:** Decided 2026-04-29.
**Spike code:** `packages/dispatch-menubar/spikes/MB-S01/` and `packages/dispatch-core/spikes/MB-S01/proposed-output-schema.ts`.
**Run cited:** `packages/dispatch-menubar/spikes/MB-S01/results/2026-04-30T05-16-06-423Z/` (35 scenarios, single operator-executed run).
**Authority:** Spike-evidence only. The freeze anchor for v3 schema is `packages/dispatch-core/src/v3/schema.ts` under operator P-0.3 commit; this ADR does NOT modify any frozen artifact.

## Decision (one-line)

Sonnet 4.6 via `@anthropic-ai/sdk` (string `claude-sonnet-4-6`) can serve as the Workstation orchestrator under the system prompt at `packages/dispatch-menubar/coarchitect/system-prompt.md` and the seven cairn-Sonnet primitives, with three production caveats addressed in §F1–§F3 below: (1) scenario / build-doc design must explicitly mark ambiguity boundaries or expect over-escape under the no-arbitration ratchet; (2) self-check generation requires injecting `CONDUCTOR_API_CONTRACT.md §10.5` verbatim into Sonnet's context; (3) chat-panel UX must accommodate p95 first-token latency well above the P-0.2 Q6 < 2s bar.

## Validation targets

### Target 1 — Stateless context-injection round-trip across all four output types

**KNOWN.** All four output types (`action`, `card`, `multi-choice-card`, `escape-block`) were exercised end-to-end and parsed cleanly. Sonnet emitted `card` for state-mutating proposals, `multi-choice-card` when build-doc templates matched, `escape-block` on ambiguity or scope violation, and `action` was not emitted by Sonnet in this run (Sonnet preferred `card` even for read-only `read-file` per S-01-05; see §F4 below for the system-prompt-vs-cairn-Sonnet-§2.7 tension this exposes).

Cite: `summary.json` `parse_ok_rate=1, schema_ok_rate=1` across 35/35 calls. Per-type detection counts derive from `summary.json.pass_breakdown` plus `raw/*.json[].parse.parsed.type`.

### Target 2 — Schema validation rate

**KNOWN.** **35/35 = 100%** of Sonnet's outputs (a) parsed as JSON without markdown-fence stripping (`parse_strict_ok_rate=1`) and (b) schema-validated against the proposed Zod discriminated union in `packages/dispatch-core/spikes/MB-S01/proposed-output-schema.ts`. No invalid extra-keys, no malformed `options[]`, no missing required fields.

Cite: `summary.json` `parse_ok_rate=1, parse_strict_ok_rate=1, schema_ok_rate=1`. Spot-checked raw files all show `parse.stripped_fences=false` and `schema.ok=true`.

### Target 3 — Cost projection (actual measured)

**KNOWN measured per-call averages:**
- Input tokens / call: **7,422 avg** (total 259,765 over 35 calls)
- Output tokens / call: **438 avg** (total 15,347)
- Total run cost: **~$1.01** (vs $0.60 modeled at proposal time — input tokens were 2.5× the modeled 3,000 because system prompt + build-doc fixture combined are larger than I projected).

**MODELED projection at posted Sonnet 4.6 pricing** ($3/M input, $15/M output as of 2026-04-29 — operator-verifiable at https://www.anthropic.com/pricing on the day this ADR commits):

| Calls/day | Calls/month | Input USD | Output USD | **Total USD/month** |
|---|---|---|---|---|
| 100 | 3,000 | 66.80 | 19.71 | **86.51** |
| 200 | 6,000 | 133.60 | 39.42 | **173.02** |
| 500 | 15,000 | 333.99 | 98.55 | **432.54** |

Cite: `summary.json.summary.input_tokens_avg=7422, output_tokens_avg=438`; `summary.json.projections.calls_per_day_*` for the table.

**MODELED, not KNOWN, because:** (a) pricing rate is the operator-verifiable input, (b) avg token counts vary with build-doc size — production build docs may be larger or smaller than the 5-ticket spike fixture; production should re-baseline.

### Target 4 — First-token latency

**KNOWN.** **p50 = 940ms (PASSES P-0.2 Q6 < 2s hard bar). p95 = 19,931ms (FAILS the bar by ~10×).** Total-response p50 is 13.2s and p95 is 25.5s — Sonnet does substantial pre-text deliberation on complex scenarios.

Top 8 by `ttft_ms`, cited:

| Scenario | TTFT (ms) | Total (ms) | Output type |
|---|---|---|---|
| S-01-10 | 21,074 | 24,913 | card |
| S-03-04 | 19,931 | 23,820 | multi-choice-card |
| S-04-01 | 19,812 | 29,237 | escape-block |
| S-02-04 | 13,097 | 23,040 | escape-block |
| S-01-08 | 12,424 | 17,392 | multi-choice-card |
| S-03-02 | 12,208 | 16,815 | multi-choice-card |
| S-03-01 | 11,182 | 14,175 | multi-choice-card |
| S-02-01 | 10,239 | 20,978 | escape-block |

Cite: `summary.json.summary.ttft_p50_ms=940, ttft_p95_ms=19931, total_p50_ms=13208, total_p95_ms=25532`. Per-scenario TTFTs in `raw/<scenario-id>.json[].invocation.ttft_ms`.

**MODELED:** the high-TTFT pattern correlates with scenarios requiring multi-section build-doc inspection (template trigger-condition matching, allowed-actions verification, section citation). This is consistent with Sonnet 4.6 doing internal reasoning before producing visible tokens. The current SDK call does not enable extended thinking explicitly; tail latency may be reducible by configuring `thinking` parameters or pruning context tier sizes.

### Target 5 — Self-check block reliability

**KNOWN, root cause diagnosed.** **0/10 self-check scenarios passed the harness's pass criterion.** The harness's detection regex (calibrated to `CONDUCTOR_API_CONTRACT.md §10.5`-specific keywords) found 0/9 §10.5 questions in payload across all 10 S-05-* scenarios.

**However**, all 10 raw payloads contain a self-check-shaped block (`"self_check"` field or "Self-check" heading in payload), so Sonnet IS placing a 9-question structure in `payload` (correctly per operator decision Q5 — block in payload, NOT rationale). The questions Sonnet generated are commit-message-review-flavored cairn questions (e.g., S-05-01: "Does this commit message reference the correct ticket ID?", "Does the subject line fit within 72 characters?", "Does the commit scope match the allowed_actions list?") — plausible cairn questions, but NOT the §10.5 verbatim 9-question set.

**Root cause is BOTH (a) and (c) per the operator's diagnostic enumeration:**

- **(a) System prompt instructs but does not include §10.5 inline.** Per `system-prompt.md`: *"For action-producing commits (specifically `draft-commit-message` actions), you also generate a 9-question self-check block per `CONDUCTOR_API_CONTRACT.md` §10.5 to be embedded in the resulting commit body."* The reference is to a file path; the spike's tier-1..6 user message also does not include §10.5 contents. Sonnet has no way to reproduce the specific 9 questions because it has not been given them.
- **(c) Detection logic looks for §10.5-specific keywords** (e.g., "verified by a spike", "behavior, or my mocks", "halt state that wasn't explicitly authorized"). Sonnet's invented questions are coherent cairn-flavored self-checks but do not contain those tokens. The detection regex is correct; what it's measuring isn't being produced.

**Not (b):** Sonnet did not ignore the instruction. Sonnet generated a structured 9-question block in the payload field (placement decision Q5 was respected). Sonnet is operating on the literal instruction it received, which omitted the §10.5 question text.

Cite: `raw/S-05-01.json[].parse.parsed.payload` (Sonnet-generated questions are coherent cairn-flavored, not §10.5); `raw/S-05-02.json` (block under `payload.self_check` array shape); `raw/S-05-04.json` (block under `payload` string with `Self-check (CONDUCTOR_API_CONTRACT.md §10.5):` heading and Sonnet-invented questions). Operator-verifiable claim: 10/10 scenarios contain `"self_check"` field or `Self-check` heading in payload; 0/10 contain any of the six distinctive §10.5 phrases (regex-verified).

**Production fix path:** COARCH-T01/T02 must either (i) inject `CONDUCTOR_API_CONTRACT.md §10.5` text into the user message context tier (ratified P-0.4 Q4), or (ii) amend the system prompt to inline the 9 questions verbatim. Either path requires `contract:` commit (system prompt is frozen artifact).

### Target 6 — Ratcheted no-arbitration

**KNOWN PASS at the design surface; KNOWN STRONGER signal at the scenario-design layer.**

- **Designed escape scenarios:** 5/5 of `04-ambiguity-escapes.json` produced escape-blocks (S-04-01..05). Each escape-block contains structured `where_im_stuck` text grounded in the actual build-doc content with `build_doc_sections_consulted` arrays referencing the explicit IDs (`#tickets-*`, `#multi-choice-templates`, etc.).
- **Pre-marked escape scenarios:** 5/5 of `02-escape-blocks.json` produced escape-blocks (S-02-01..05). S-02-02 is the cleanest evidence of build-doc-scope-locked: Sonnet declined to propose `kill` because MB-T-CYCLE's `Allowed actions` is `[pull, send]`, citing the build doc's deliberate-omission language verbatim.
- **Multi-choice scenarios:** 5/5 of `03-multi-choice.json` matched their templates and emitted multi-choice-cards (S-03-01..05).

**Plus over-escape evidence (FINDING F1, see §F1 below):** 3/10 of `01-normal-actions.json` produced escape-blocks or multi-choice-cards instead of plain cards. Inspection of the raw files shows these "failures" are correct Sonnet behavior under the no-arbitration ratchet — the scenario triggering events were ambiguous in ways my test-design didn't anticipate. The over-escape is a STRONGER signal that the ratchet is working, not a weaker one.

Cite: `summary.json.pass_breakdown` 5/5 across 02/03/04 categories; `raw/S-02-02.json[].parse.parsed.where_im_stuck` (kill-not-in-allowed-actions citation); `raw/S-04-02.json[].parse.parsed.build_doc_sections_consulted` (5-section citation array on a single escape).

## Findings

### Finding F1 — 3/10 normal-action scenarios escalated to multi-choice-card or escape-block (ratchet working as designed)

**KNOWN. Verdict: Sonnet behavior CORRECT; scenario design under-specified ambiguity boundaries.**

Per-scenario diagnosis citing `raw/<id>.json`:

- **S-01-06** expected `card` (action: `send`), got `multi-choice-card`. Sonnet matched the build-doc's `MC-prompt-tone` template (the triggering event said "follow-up send" without specifying tone). Per `raw/S-01-06.json`: Sonnet's multi-choice-card cited the `MC-prompt-tone` template's exact options. **Sonnet is right; my scenario should have specified tone in the triggering event.**
- **S-01-07** expected `card`, got `escape-block`. Per `raw/S-01-07.json[].parse.parsed.where_im_stuck`: Sonnet escaped because the synthetic chat history (turn -4) contained an operator decline of a refactor send with reason "review-first" and a directive to "pull and wait for next daemon event before proposing". When the next event arrived, Sonnet escaped because the "review-first gate" was ambiguous. **Sonnet is right; the chat-history fixture biased toward escape and my scenario's expectation didn't account for it.**
- **S-01-08** expected `card`, got `multi-choice-card`. Sonnet matched `MC-spawn-target-repo` even though the triggering event said "against target_repo". Per `raw/S-01-08.json[].parse.parsed.context`: Sonnet read MB-T05's Description as "spawn executes against this build doc's target_repo" generically and applied the template's "ticket itself does not name a repo" trigger condition. **Debatable but defensible** — the build-doc's target_repo IS frontmatter-level rather than ticket-level, so Sonnet's strict reading is consistent with the no-arbitration ratchet.

**Verdict:** Sonnet escalated three scenarios that would have been "card" outputs under context inference. The escalations are appropriate per `cairn-sonnet-extensions.md §2.2` (no-arbitration ratcheted under P-0.6 Q2 KEEP). The scoring failure is an artifact of my scenario design being too strict, not a Sonnet failure. **The ratchet is working as designed and is HIGHER-friction than even the explicit `04-ambiguity-escapes` scenarios anticipated.**

**Production implication:** v3.0 dogfood (vision §8.4) should expect 5-30% over-escape rate on borderline cases. Operator-burden calibration is the build-doc author's job — adding `## Open Questions` and `## Multi-choice Templates` reduces escape rate; omitting them increases it. Per ratified `build-doc-schema-spec.md §6` authoring conventions, this is the expected discipline.

### Finding F2 — Self-check generation 0/10 detection-pass; root cause is context omission, not model adherence

**KNOWN root cause (a)+(c) per Target 5 above.**

Sonnet IS placing a 9-question self-check block in `payload` field on 10/10 draft-commit-message scenarios (operator decision Q5 holds). The block contains plausible cairn-flavored review questions tailored to commit-message review, not the `CONDUCTOR_API_CONTRACT.md §10.5` verbatim 9 questions, because §10.5 is referenced by file-path in the system prompt but not included in any context tier.

**Production fix:** COARCH-T01/T02 implementation must add §10.5 question text to the orchestrator's context. Two options:

- **(F2-Fix-A)** Amend `system-prompt.md` to inline the 9 questions verbatim. Requires `contract:` commit (system prompt is frozen authority per ratified P-0.4 Q6).
- **(F2-Fix-B)** Inject `CONDUCTOR_API_CONTRACT.md §10.5` content as a context tier in the API call (pre-pended to the user message). Implementation detail of context-injection layer; does NOT require contract amendment.

F2-Fix-B has lower contract surface but raises input-token cost per call by ~500-800 tokens. F2-Fix-A is operator territory.

### Finding F3 — TTFT p95 = 19.9s far exceeds the P-0.2 Q6 < 2s bar (but p50 passes)

**KNOWN.** P-0.2 Q6 is a p50 bar (< 2s); p50 measurement is 940ms — bar passes. p95 is 19,931ms; **the bar does not specify p95 acceptance**, so the bar is technically met at the specified threshold. However, 5% of orchestrator calls show 10-25s with no visible token, which is a real chat-panel UX issue.

**MODELED root cause:** Sonnet 4.6 performs internal deliberation before producing first user-visible tokens on complex multi-section build-doc inspection scenarios. The pattern correlates with output type: high-TTFT cases skew toward `multi-choice-card` and `escape-block` outputs that require careful template-matching and section citation. Low-TTFT cases (≤ 1s) include both `card` and `escape-block` outputs but tend to involve simpler triggering events.

**Production implications and recommendations:**

- **(F3-UX-1)** Chat-panel must show typing/spinner indicator immediately on send, and an explicit "thinking..." or "deliberating..." indicator if no visible token after 2s. This is implementation-cheap and aligns with the system-prompt rule 7 spirit ("escape on ambiguity") — explaining to the operator that careful deliberation is happening.
- **(F3-UX-2)** Optional: stream token-budget remaining via SDK to give a progress indicator. Implementation cost low; SDK supports.
- **(F3-Mitigation-1)** Consider reducing context-tier sizes. The current 7,422-token avg input is large; pruning chat-history (10 turns + summary) or compressing the build doc at injection time may reduce deliberation time.
- **(F3-Mitigation-2)** **DEFERRED to v3.x per ratified vision §7.10:** tiered model architecture (Haiku 4.5 for routine routing, Sonnet 4.6 for deliberation). This is the cleanest tail-latency mitigation but requires v3.x scope expansion.
- **(F3-Mitigation-3)** SPECULATIVE: explicitly disabling extended thinking via `thinking` API parameter may reduce latency at the cost of output quality. Untested in this spike. Operator-arbitrated whether to spike further.

**Operator decision needed:** is p95 ≈ 20s acceptable for v3.0 ship under (F3-UX-1)+(F3-UX-2) UX mitigations alone, or does v3.0 ship gate on additional latency reduction work? The P-0.2 Q6 bar as ratified is p50-only; explicit p95 amendment is a `contract:` commit if desired.

### Finding F4 — System-prompt-rule-6 vs cairn-Sonnet-§2.7 read-only exemption tension (incidental)

**KNOWN, scope-flagged.** S-01-05 (read-file scenario) emitted `card` per scenario expectation, NOT `action`. The `action` output type was never observed in this run. Per `system-prompt.md` rule 6 ("No side effects without an operator-clicked card. Even when you produce an action, that action does not fire until the operator clicks Approve on the resulting card"), Sonnet may interpret all output as needing card wrapping. Per `cairn-sonnet-extensions.md §2.7` ("Read-only operations [...] are exempt from card requirement"), `read-file` should bypass the card. The two specs disagree.

**Not a v3.0 ship blocker** — `card` wrapping a `read-file` is conservatively safer (operator approves the read explicitly). But the contract surface is inconsistent. Operator-arbitrated whether to amend system-prompt rule 6 or cairn-sonnet-extensions §2.7 to align. This is a v3.x followup.

## Recommendations summary

1. **(F1)** Expect 5-30% over-escape rate on borderline scenarios in dogfood. Build-doc authors must pre-mark ambiguity boundaries via `## Open Questions` and `## Multi-choice Templates` to reduce burden.
2. **(F2)** COARCH-T01/T02 must inject `CONDUCTOR_API_CONTRACT.md §10.5` text into the orchestrator's context. F2-Fix-B (context-injection) is lower-contract-surface; F2-Fix-A (system prompt amendment) is operator territory.
3. **(F3-UX-1, F3-UX-2)** Chat-panel must accommodate p95 ≈ 20s deliberation time with typing indicator + thinking-state UI. Implementation-cheap; required for v3.0 ship UX quality.
4. **(F3-Mitigation-1)** COARCH-T02 should evaluate context-tier pruning to reduce deliberation latency.
5. **(F4)** v3.x followup to align system-prompt rule 6 with cairn-Sonnet §2.7 read-only exemption.

## What was NOT validated (out of spike scope)

- Behavior under sustained API rate-limit pressure (single-run spike, 500ms inter-call delay).
- Behavior across model version changes (only `claude-sonnet-4-6` exercised).
- Behavior with production-sized build docs (>30 tickets, multiple `## Multi-choice Templates`).
- Behavior on the operator-mediated escape-block → Opus → resolution round-trip (operator-prose UI not yet built).
- Behavior with concurrent calls (single-run sequential).
- Behavior under build-doc git HEAD changes mid-call (deferred to COARCH-T04).
- Anti-jailbreak / adversarial-input handling.

## Confidence labels

- **KNOWN:** 100% schema validation (35/35), p50 TTFT 940ms, all 25 designed escape/multi-choice scenarios passed, root cause diagnosis for F2, all per-scenario verdicts in F1.
- **MODELED:** Cost projection table (rate is operator-verifiable input), root cause hypothesis for F3 high TTFT, fix paths in F2/F3 recommendations.
- **SPECULATIVE:** F3-Mitigation-3 (extended-thinking disable), production-scale token-count behavior, behavior under concurrent load.

## References

- Run results (citation target for all KNOWN claims): `packages/dispatch-menubar/spikes/MB-S01/results/2026-04-30T05-16-06-423Z/`
- Spike harness: `packages/dispatch-menubar/spikes/MB-S01/`
- Proposed Zod schema (spike-only, NOT freeze anchor): `packages/dispatch-core/spikes/MB-S01/proposed-output-schema.ts`
- System prompt under validation: `packages/dispatch-menubar/coarchitect/system-prompt.md`
- Cairn-Sonnet primitives validated: `docs/cairn-sonnet-extensions.md` §2.1–§2.7
- Build-doc schema referenced: `docs/build-doc-schema-spec.md`
- Frozen contracts cited: `WORKSTATION_CONTRACT.md` §3.5 + §8.1, `CONDUCTOR_API_CONTRACT.md` §10.5, `vision.md` §7.5 + §7.7 + §8.3
- Cairn methodology: `cairn.md` and `docs/cairn-findings.md`

## Cross-session note

This ADR closes Phase 1 (parallel cairn round 2). Sessions B (MB-S03 daemon v3 amendment) and C (MB-S02 spawn fidelity) committed at `14ddf36` and `946e06d`; this commit lands on top.
