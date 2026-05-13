# MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW — Operator Decisions

**Date:** 2026-05-13
**Author:** SESSION-`t6-ticket-body-0905-phase5-ctx-percent` (Opus 4.7) under Round 11 §3.9 Wave 5 SPECULATIVE dispatch (territory manifest `t6-phase5-ctx-percent.txt`)
**Anchor:** ticket body `docs/build-docs/CONDUCTOR_MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW_BUILD.md` co-landing at this commit.
**Status:** PENDING-OPERATOR-RESOLUTION — Sub-Q gates §3.1-§3.5 await operator-ack at HALT-TICKET-BODY-PRE-COMMIT.

---

## §0 — Purpose

This doc captures operator Sub-Q resolutions for `MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW` per Round 11 §3.9 Wave 5 SPECULATIVE Phase 5 forward-positioning. Operator decisions land here as `[KNOWN-OPERATOR-ARBITRATED]` rows; ticket body §3 retains the alternates table for archaeology + "operator decision pending" lines until ack lands.

Pattern mirrors sibling decisions-doc precedents (T8 `mb-t-wireframe-t8-decisions-2026-05-12.md`, T10 `mb-t-wireframe-t10-decisions-2026-05-12.md`) — captures operator-arbitrated turn outputs for future cairn-audit traceability.

---

## §1 — Operator pre-arbitration anchors (Round 11 §3.9 Wave 5 dispatch)

`[KNOWN per Round 11 §3.9 Wave 5 dispatch-queue-current.md row]`:
- Scope = per-tile ctx% accuracy data flow (Phase 5 forward-position).
- Sibling pattern direction = T1 SESSION-DATA-FLOW + T8 COST-METER + T9 PLAN-TIMER precedent.
- SPECULATIVE STATUS FRAMING = revision-cost explicitly accepted; post-Phase-4 + post-Phase-5 evidence may RATIFY / RESHAPE / DISCARD.

`[KNOWN per territory manifest t6-phase5-ctx-percent.txt]`:
- WRITE territory: this decisions doc + ticket body + coord note (3 files).
- READ-ONLY: phase-4-tier-1-roadmap-rev-2-2026-05-12.md + T1/T8/T9 ticket bodies.
- FORBIDDEN: FOLLOWUPS, orchestrator state, dispatch queue, manifests, `docs/cairn-*.md`, CLAUDE.md, packages/**, CONDUCTOR_API_CONTRACT.md.

`[KNOWN per operator ack 2026-05-13]`: "ACK territory; proceed per manifest scope" — t6 surfaces HALT-TERRITORY-ACK + proceeds with ticket body + decisions doc + coord note authoring.

---

## §2 — Sub-Q gate disposition table (operator decisions pending)

| Sub-Q | Question | Recommendation `[MODELED]` | Operator disposition | Captured-at-commit |
|---|---|---|---|---|
| T-PHASE-5-A | tokensUsed source-of-truth | (α) RATIFY PTY-scrape (current `tile-token-scraper.ts`) | PENDING | (forthcoming HALT-TICKET-BODY-PRE-COMMIT ack) |
| T-PHASE-5-B | tokenBudget source-of-truth | (β) Extended static lookup adding `O4.7·1M` variant | PENDING | (forthcoming) |
| T-PHASE-5-C | 1M variant coverage | (i) Fold into Sub-Q-B (no separate sub-Q) | PENDING | (forthcoming) |
| T-PHASE-5-D | Compaction-aware accounting | (α) Defer (last-match-wins regex handles common case) | PENDING | (forthcoming) |
| T-PHASE-5-E | Render-site reconciliation | (β) Extract `computeCtxPercent` helper | PENDING | (forthcoming) |

### §2.1 — Default-disposition rationale summary

`[MODELED]`:
- (α) RATIFY for tokensUsed matches operator-observable count (PTY-scrape catches what CC shows operator); higher-fidelity API sources admissible if dogfood surfaces drift.
- (β) extended-static-lookup for tokenBudget closes the `[KNOWN]` 1M-variant gap directly + smallest-bounded-scope (1-line edit + 1 RED/GREEN probe pair).
- (i) fold-1M-coverage into Sub-Q-B avoids artificial separation; the 1M coverage IS a lookup-table addition.
- (α) defer compaction-aware accounting accepts that last-match-wins regex handles common case; (β/γ) deferred as forward-propagation Tier 2 followup.
- (β) helper extraction eliminates 3-site formula drift risk without state-flow surgery.

### §2.2 — Non-default escalation triggers

Operator may select non-default for any Sub-Q. Expected scope adjustments:
- **Sub-Q-A=(γ) daemon-aggregator**: +1 WB for daemon-poll wiring + `WORKSTATION_CONTRACT.md` §6.6 amendment (mirror T8 Sub-Q-T8-A=(c) pattern).
- **Sub-Q-A=(β) API-header piggyback**: +1 WB spike (CLAUDE.md §2.8 spike-for-external-API) before impl.
- **Sub-Q-B=(γ) operator-config per-session**: +35 LOC for `splitter-state.ts`-pattern state module + UX surface deferred.
- **Sub-Q-B=(δ) Anthropic model-info API**: +HIGH scope (spike + HTTP client + secret-mgmt); typically deferred.
- **Sub-Q-C=(ii) cross-dep Phase 4 model-source-wiring**: serializes T-PHASE-5 behind Phase 4 model-source-wiring ship.
- **Sub-Q-D=(β) compaction-event subscription**: +1-2 WBs spike + regex + state machine.
- **Sub-Q-D=(γ) per-session usage ledger**: +2-3 WBs new state module + lifecycle hooks.
- **Sub-Q-E=(α) accept-duplication**: -1 WB (no helper extraction); file `MB-F-PHASE-5-CTX-PERCENT-RENDER-SITE-RECONCILIATION` Tier 3 OPEN instead of CLOSED.
- **Sub-Q-E=(γ) precomputed field**: +MEDIUM scope (state-flow change + TileGridSessionEntry schema addition).

---

## §3 — Cross-references

### §3.1 — Sibling tickets

- T8 `mb-t-wireframe-t8-decisions-2026-05-12.md` — cost-meter data-flow decisions doc; primary precedent for decisions-doc shape.
- T10 `mb-t-wireframe-t10-decisions-2026-05-12.md` — max-parallel data-flow decisions doc (Wave 2 ship); sibling forward-position pattern.
- T1 ticket body — `TileGridSessionEntry.tokensUsed`/`tokenBudget` field-pair source.
- §C.5 SUBSTRATE — `tile-token-scraper.ts` PTY-scrape pattern + `model-context-windows.ts` static lookup.

### §3.2 — Related followups (target rows to be filed at WB8)

- `MB-F-PHASE-5-CTX-PERCENT-TOKENBUDGET-1M-VARIANT-COVERAGE` (NEW Tier 2) — primary closure target via WB2 Sub-Q-B=(β).
- `MB-F-PHASE-5-CTX-PERCENT-RENDER-SITE-RECONCILIATION` (NEW Tier 3) — primary closure target via WB4 Sub-Q-E=(β).
- `MB-F-PHASE-5-CTX-PERCENT-COMPACTION-AWARE-ACCOUNTING` (NEW Tier 2) — forward-propagation per Sub-Q-D=(α) deferral.
- `MB-F-PHASE-5-CTX-PERCENT-TOKENSUSED-PTY-SCRAPE-ACCURACY` (NEW Tier 3) — forward-propagation per Sub-Q-A=(α) RATIFY-with-dogfood-trigger.

### §3.3 — Cairn methodology anchors

- CLAUDE.md §1 frozen-contract enumeration (WORKSTATION_CONTRACT.md §6 not in this ticket's default path).
- CLAUDE.md §2.4 operator-arbitrated contract amendments (only triggered by Sub-Q-A=(γ) daemon-aggregator).
- CLAUDE.md §2.7 per-path discipline + pathspec-on-commit per `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` Tier 1.
- CLAUDE.md §2.8 spike-before-production-code per external API — applies if Sub-Q-A=(β/γ/δ) selected.
- CLAUDE.md §3.5 raw-fs persistence precedent — Sub-Q-B=(γ) operator-config path.
- CLAUDE.md §3.7 esbuild renderer-surface scripts — `ctx-percent.ts` helper bundles via Frame C → tile-grid renderer transitively per Wave B `2174f3a` precedent.
- CLAUDE.md §4.6 runtime-launch smoke + T6 §C envelope α/β gates — execution-phase WB7 smoke.

---

## §4 — Append history

This doc supports append-only operator-decision capture. Each operator ack lands as a new §N row referencing the Sub-Q + verbatim wording + commit SHA at ack time.

(append below as operator dispositions land)

---

`[KNOWN per Round 11 §3.9 Wave 5 STATUS FRAMING]`: SPECULATIVE — Phase 4 + Phase 5 visual-verification not yet triggered. Operator-decisions captured here are pre-arbitration anchors that may be revised post-evidence.
