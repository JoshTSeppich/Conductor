# Coord — Phase 5 ctx% accuracy ticket (T-PHASE-5)

**Date:** 2026-05-13
**Author:** SESSION-`t6-ticket-body-0905-phase5-ctx-percent` (Opus 4.7) under Round 11 §3.9 Wave 5 SPECULATIVE dispatch.
**Anchor:** body + decisions doc co-landing at this commit.

---

## §0 — Purpose

Cross-session coordination note for downstream execution-dispatch cycles. Captures execution-phase territory boundaries + parallel-cairn coordination points + cross-ticket dependencies that affect dispatch sequencing.

---

## §1 — Execution-phase file ownership (NOT current ticket-body authoring)

Per ticket body §2.5, T-PHASE-5 execution-phase territory:

| File | Action | WB | Sub-Q dependence |
|---|---|---|---|
| `packages/dispatch-workstation/src/tile-grid/model-context-windows.ts` | MOD (append 1M entry) | WB2 | Sub-Q-B=(β) |
| `packages/dispatch-workstation/src/frame-c/ctx-percent.ts` | NEW (helper) | WB4 | Sub-Q-E=(β) |
| `packages/dispatch-workstation/src/tile-grid/tile-header.tsx` | MOD (consume helper) | WB4 | Sub-Q-E=(β) |
| `packages/dispatch-workstation/src/frame-c/session-list.tsx` | MOD (consume helper) | WB4 | Sub-Q-E=(β) |
| `packages/dispatch-workstation/src/frame-c/terminal-header-bar.tsx` | MOD (consume helper) | WB4 | Sub-Q-E=(β) |
| `packages/dispatch-workstation/src/main/tile-token-scraper.ts` | CONDITIONAL MOD (compaction events) | WB5 | Sub-Q-D=(β) |
| `packages/dispatch-workstation/src/main/ctx-percent-aggregator.ts` | CONDITIONAL NEW | WB-condit | Sub-Q-A=(γ) |
| `WORKSTATION_CONTRACT.md` §6.6 | CONDITIONAL MOD | WB-condit | Sub-Q-A=(γ) |

Test files (NEW): `packages/dispatch-workstation/test/unit/{tile-grid,frame-c}/probe-mbtphase5ctx-{01,02,03,04}.spec.{ts,tsx}`.

---

## §2 — Parallel-cairn coordination points

### §2.1 — Sibling sessions touching same files

`[KNOWN per Round 11 Wave 5 dispatch-queue]`:
- Other Wave 5 sub-sessions path-disjoint by manifest construction.
- T10 ticket body (Wave 2 `b76ed51`): execution-phase touches `chat-shell/mount.ts` — NOT a T-PHASE-5 territory file.

`[SPECULATIVE]` execution-phase risk:
- Phase 4 `MB-T-PHASE-4-MODEL-SOURCE-WIRING` execution (per phase-4-rev-2 roadmap §1.1) MAY touch `tile-grid/tile-grid.tsx` `TileGridSessionEntry` shape or `spawn-handler.ts`. T-PHASE-5 does NOT modify these.
- T7 (Visual polish) sessions may have edits in `tile-header.tsx` — coordinate edit window if T7 + T-PHASE-5 concurrently execute.
- T-PHASE-5 WB4 modifies 3 render-site files; sequential lock-step needed within T-PHASE-5 itself (each render-site MOD is a separate WB4 sub-commit OR single bundled MOD per operator preference).

### §2.2 — Cross-ticket dependency: 1M model string

`[KNOWN]` per Phase 4 rev-2 roadmap §1.1: `MB-T-PHASE-4-MODEL-SOURCE-WIRING` is the upstream ticket that populates `TileGridSessionEntry.model` from spawn-result. At HEAD post-`b76ed51`, that ticket is STUB — model field is `undefined` per T1 findings §III.A row 2.

T-PHASE-5 dependency:
- T-PHASE-5 Sub-Q-B=(β) extends lookup with `'O4.7·1M'` key.
- Lookup is consulted via `getContextWindow(modelId)` at consumer sites.
- IF Phase 4 model-source-wiring ships AFTER T-PHASE-5 and uses backend string `'claude-opus-4-7-1m'` (NOT `'O4.7·1M'`), the lookup MISSES and falls to DEFAULT 200_000.
- WB1 reading scope MUST verify the actual model string at HEAD; WB2 GREEN may need BOTH `'O4.7·1M'` AND `'claude-opus-4-7-1m'` entries (or alias map).

**Coordination requirement:** T-PHASE-5 execution dispatch SHOULD happen AFTER Phase 4 model-source-wiring lands (or concurrently with explicit WB1 reading-scope alignment), so the backend-actual model string is observable.

### §2.3 — Bundle-discovery risk (Frame C ↔ tile-grid coupling)

`[KNOWN per Wave B precedent 2174f3a]`: Frame C is bundled INTO the tile-grid renderer (no separate `build-frame-c.mjs` esbuild script). T-PHASE-5 WB4 introduces `frame-c/ctx-percent.ts` helper consumed by `tile-grid/tile-header.tsx` (cross-package-dir but same-bundle).

Verify at WB1 reading scope:
- Helper at `frame-c/ctx-percent.ts` is bundled into `dist/tile-grid/renderer.js` via existing auto-discovery.
- If NOT auto-discovered, move helper to `tile-grid/ctx-percent.ts` instead (Frame C importing tile-grid is the established direction).

---

## §3 — HALT gates anticipated

`[MODELED per ticket body §3]`:

| HALT | WB | Trigger | Operator action |
|---|---|---|---|
| HALT-TICKET-BODY-PRE-COMMIT | (this body landing) | Per ticket body §3 5 Sub-Q gates pending | Operator ack body + Sub-Q resolutions |
| HALT-WB-PRE-COMMIT (conditional) | WB-condit | IF Sub-Q-A=(γ) daemon-aggregator selected → `WORKSTATION_CONTRACT.md` §6.6 amendment | Operator wording-review |
| HALT-WB1-PRE-COMMIT (advisory) | WB1 | Reading-scope finding: backend model string mismatch (1M variant) | Operator confirms alias-map strategy |

---

## §4 — Phase 4 vs Phase 5 sequencing recommendation

`[MODELED-SPECULATIVE]`:

Recommended dispatch order:
1. Phase 4 batch (per rev-2 roadmap §4 clusters) — including `MB-T-PHASE-4-MODEL-SOURCE-WIRING` if elected.
2. T-PHASE-5 dispatch AFTER Phase 4 batch lands.

Rationale: T-PHASE-5 closure value is highest when `TileGridSessionEntry.model` propagates real model strings (including 1M variant). Pre-Phase-4-model-source-wiring, T-PHASE-5 ships the lookup extension but it remains dormant (model field is undefined → lookup uses DEFAULT regardless of entry added).

Alternative: T-PHASE-5 ships independently as "preparing the lookup for when Phase 4 ships" — honest forward-positioning per Round 11 §3.9 Wave 5 SPECULATIVE STATUS FRAMING.

Operator selects sequencing at HALT-TICKET-BODY-PRE-COMMIT.

---

## §5 — Anti-fabrication summary `[KNOWN]`

Per ticket body §9:
- ctx% renders at 3 sites (tile-header.tsx, session-list.tsx, terminal-header-bar.tsx) — verified by grep.
- Formula uniform: `Math.round((tokensUsed / tokenBudget) * 100)` — verified at all 3 sites.
- tokensUsed source: `tile-token-scraper.ts` §C.5 WB2 GREEN — verified by head read.
- tokenBudget source: `model-context-windows.ts` 3-entry static lookup all at 200_000 — verified by direct read.
- 1M variant gap: ModelHint `'O4.7·1M'` per CLAUDE.md NOT in lookup — verified by direct read.
- Phase 4 rev-2 roadmap silence on ctx% — verified by grep returning no rows.
- Comment trail confirming forward-positioning: `model-badge.ts:23-24` — verified by direct read.

`[SPECULATIVE]` per dispatch STATUS FRAMING:
- Phase 4 + Phase 5 dogfood evidence pending.
- Operator-load-bearing-ness of 1M ctx% accuracy depends on operator using 1M variant in dogfood.

---

`[KNOWN per Round 11 §3.9 Wave 5 STATUS FRAMING]`: SPECULATIVE Phase 5 forward-positioning; revision-cost explicitly accepted.
