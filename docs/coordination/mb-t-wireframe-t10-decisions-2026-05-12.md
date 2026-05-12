# MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW — Operator Decisions

**Date:** 2026-05-12
**Author:** SESSION-`t6-ticket-body-0905` (Opus 4.7) under Round 11 §3.9 Wave 2 SPECULATIVE dispatch (territory manifest `t6-wireframe-t10-body.txt`)
**Anchor:** ticket body `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW_BUILD.md` co-landing at this commit.
**Status:** PENDING-OPERATOR-RESOLUTION — Sub-Q gates §3.1-§3.5 await operator-ack at HALT-TICKET-BODY-PRE-COMMIT.

---

## §0 — Purpose

This doc captures operator Sub-Q resolutions for `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW` per Round 11 §3.9 Wave 2 SPECULATIVE Phase 4 forward-positioning. Operator decisions land here as `[KNOWN-OPERATOR-ARBITRATED]` rows; ticket body §3 retains the alternates table for archaeology + §3.6+ retains "operator decision pending" lines until ack lands.

Pattern mirrors sibling T8 decisions doc (`mb-t-wireframe-t8-decisions-2026-05-12.md` cited in T8 ticket body §1.5 reshape amendment) — captures operator-arbitrated turn outputs for future cairn-audit traceability.

---

## §1 — Operator pre-arbitration anchors (Round 11 §3.9 Wave 2 dispatch)

`[KNOWN per Round 11 §3.9 Wave 2 dispatch-queue-current.md row]`:
- Scope = max-parallel-counter data flow (Phase 4 follow-on to T4 placeholder).
- Sibling pattern direction = T4/T8/T9 precedent (aggregator + emission channel + mount auto-wire).
- SPECULATIVE STATUS FRAMING = revision-cost explicitly accepted; post-Phase-3 evidence may RATIFY / RESHAPE / DISCARD.

`[KNOWN per territory manifest t6-wireframe-t10-body.txt]`:
- WRITE territory: this decisions doc + ticket body only.
- READ-ONLY: full-build-mode-dispatch.md + phase-4-tier-1-roadmap-draft.md + T4/T8/T9 ticket bodies.
- FORBIDDEN: FOLLOWUPS, orchestrator state, dispatch queue, manifests, CLAUDE.md, packages/**, CONDUCTOR_API_CONTRACT.md.

`[KNOWN per operator ack 2026-05-12]`: "ACK territory; proceed per manifest scope (rate-limit will clear; retry your task)" — territory ack pre-emptive; t6 surfaces HALT-TERRITORY-ACK + proceeds.

---

## §2 — Sub-Q gate disposition table (operator decisions pending)

| Sub-Q | Question | Recommendation `[MODELED]` | Operator disposition | Captured-at-commit |
|---|---|---|---|---|
| T10-A | Active-count (N) source | (α) RATIFY renderer-internal sessions-stream filter (Sub-Q-T4-E=(i) precedent) | PENDING | (forthcoming HALT-TICKET-BODY-PRE-COMMIT ack) |
| T10-B | Max-parallel (M) source-of-truth | (β) Workstation settings file (`splitter-state.ts` raw-fs pattern; default = 16 on first-launch missing-file) | PENDING | (forthcoming) |
| T10-C | Emission channel | (i) Prop-drilled from chat-shell host (RATIFY T4 WB4 + mount auto-wire) | PENDING | (forthcoming) |
| T10-D | Persistence (only if Sub-Q-B=(β)) | (ii) `fs.readFileSync` of `<userData>/max-parallel.json` mirroring `splitter-state.ts` | PENDING | (forthcoming) |
| T10-E | Cadence (only if async source) | (α) Synchronous per-render reads | PENDING | (forthcoming) |

### §2.1 — Default-disposition rationale summary

`[MODELED]`:
- All five defaults converge on **ship-velocity + zero-frozen-surface-touch + matched T4/T8/T9 sibling precedent**.
- (β) settings-file for M is the natural escalation from T4 const-16 + matches `splitter-state.ts` 35-line precedent + persists across launches.
- (α) RATIFY for N is honest minimal-change posture + leverages T1's authoritative sessions stream.
- (i) prop-drilled for emission channel avoids §6 amendment cycle.
- (ii) raw-fs persistence is the canonical CLAUDE.md §3.5 pattern (no electron-store).
- (α) synchronous cadence is sufficient for v1; live-reload deferred to follow-on Tier 3.

### §2.2 — Non-default escalation triggers

Operator may select non-default for any Sub-Q. Expected scope adjustments:
- **Sub-Q-B=(γ) daemon-config**: +1 WB for daemon endpoint addition + cross-package contract amendment.
- **Sub-Q-B=(δ) BUILD.md preamble**: +2-3 WBs for MB-T28 parser amendment + workstation observer; opens cross-ticket dependency with `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY` Tier 3 closure.
- **Sub-Q-C=(ii) push IPC**: +1 WB + `WORKSTATION_CONTRACT.md` §6.6 amendment + HALT-WB-PRE-COMMIT operator wording-review.
- **Sub-Q-A=(β) pool-state**: +1 WB for pool-surface verification + integration (depends on MB-T6 pool API stability at execution-phase HEAD).
- **Sub-Q-A=(γ) daemon-sessions-count**: +1 WB for daemon-poll wiring; aligns with cross-package daemon roadmap.

---

## §3 — Cross-references

### §3.1 — Sibling tickets

- T8 `mb-t-wireframe-t8-decisions-2026-05-12.md` — cost-meter data-flow decisions doc; precedent for this file's shape.
- T9 (decisions doc — `[SPECULATIVE]`; may not exist yet at HEAD post-`87c04b6`; if present, same precedent applies).
- T4 ticket body `f8fc24d` §3.5 Sub-Q-T4-E disposition — operator selected (i) renderer-internal; T10 advances M source.

### §3.2 — Related followups

- `MB-F-MAX-PARALLEL-CONFIG-SOURCE` (Tier 3 — T4 WB14 findings `4e8ec96` §IX) — primary closure target.
- `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (Tier 2 — T4 WB14 findings §IX) — MaxParallelCounter arm closure.
- `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY` (Tier 3 — T5 WB12 docs `87c04b6` per T5 findings §IX) — cross-ticket dep; T5 dispatch-loop consumes M from T10's source.

### §3.3 — Cairn methodology anchors

- CLAUDE.md §1 frozen-contract enumeration (WORKSTATION_CONTRACT.md §6 not in this ticket's default path).
- CLAUDE.md §2.4 operator-arbitrated contract amendments (only triggered by Sub-Q-C=(ii)).
- CLAUDE.md §2.7 per-path discipline + pathspec-on-commit per `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` Tier 1.
- CLAUDE.md §3.5 raw-fs persistence precedent — Sub-Q-B=(β) + Sub-Q-D=(ii) default path.
- CLAUDE.md §3.7 esbuild renderer-surface scripts — `max-parallel-counter.tsx` already bundled into chat-shell renderer at T4 WB4.
- CLAUDE.md §4.6 runtime-launch smoke + T6 §C envelope α/β gates — execution-phase WB7 smoke.

---

## §4 — Append history

This doc supports append-only operator-decision capture. Each operator ack lands as a new §N row referencing the Sub-Q + verbatim wording + commit SHA at ack time.

(append below as operator dispositions land)

---

`[KNOWN per Round 11 §3.9 STATUS FRAMING]`: SPECULATIVE — Phase 3 visual-verification not yet triggered. Operator-decisions captured here are pre-arbitration anchors that may be revised post-Phase-3 evidence.
