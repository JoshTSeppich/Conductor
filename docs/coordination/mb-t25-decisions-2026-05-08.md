# MB-T25 Decisions — operator-skim review surface

**Date:** 2026-05-08
**Companion to:** `docs/coordination/mb-t25-diagnose-2026-05-08.md`
**Status:** authored, awaiting HALT 0 dual-conditional ack
**Round 4:** Terminal B / mbt25-worktree (per-session worktree isolation)

---

## §1 — One-paragraph TL;DR

MB-T25 ships a plan-usage ring widget (outer = % used, inner dotted = time-until-reset) as the **leftmost slot** in the existing `chat-shell-header-bar` element. SDK 0.92.0 type-shape exposes `Response.headers` via `MessageStream.response` + `MessageStream.withResponse()` ([KNOWN] from .d.ts read) — therefore SDK is NOT the blocker. The Outcome-A-vs-B branch collapses entirely to whether the Anthropic API actually emits `anthropic-ratelimit-*` headers under operator's plan tier; **Terminal D's MB-T34 Phase 1 spike answers definitively.** Outcome A → 5-WB ladder, full live ring. Outcome B → 4-WB ladder, placeholder shell + `MB-F-T25-PLAN-USAGE-HEADER-EXPOSURE-DEFERRED` Tier 2 followup.

---

## §2 — Q dispositions (operator-skim)

| Q | Tentative disposition | One-line rationale |
|---|---|---|
| **Q-MBT25-1** | (a) hand-rolled SVG | MB-T26 71-line precedent; pure-fn ring math is one trig call; avoid bundle bloat |
| **Q-MBT25-2** | (a) push-based via `onPlanUsageUpdate` | Mirrors MB-T26 onCostUpdate; `MB-F-T26-Q-DISPOSITION-INFEASIBILITY-ROUND-2` already taught the polling lesson |
| **Q-MBT25-2a** | (a) extend coarchitectBridge | Plan-usage is per-Conductor-session domain; same bridge as onCostUpdate |
| **Q-MBT25-3** | Operator arbitrates at A's Phase 1 (recommend MB-T24 rightmost) | My MB-T25 is leftmost regardless; toggle-vs-observability visual grouping motivates rightmost |
| **Q-MBT25-4** | (a) empty rings + `—` countdown placeholder | MB-T26 `formatCost(null) → '—'` precedent; `MB-F-T26-COST-METER-INITIAL-MOUNT-EMPTY-STATE` Tier 3 path |
| **Q-MBT25-5** | [MODELED] field shape until D's spike; pure-fn helpers neutral to header-name | `formatResetCountdown(reset, now)` signed against number/ISO-string, not header field name |
| **Q-MBT25-6** | (a) followup-only-shell for Outcome B | Raw-fetch-alongside-SDK doubles request count + complicates retry/auth; closure path covers SDK upgrade + plan-tier upgrade + feature request |

---

## §3 — WB ladder branch summary

### Outcome A (headers exposed) — 5-WB ladder

| WB | Type | Deliverable |
|---|---|---|
| WB1 | red | scaffold `plan-usage-ring.tsx` + `ring-helpers.ts` + 2 RED probes; chat-shell.tsx + mount.ts sentinel zones; slot prop + resolver |
| WB2 | green | ring-math + tinting + countdown helpers (pure fns; 100% line cov); probe-01-math GREEN |
| WB3 | green | PlanUsageRing component + bridge subscription + preload.mts +1 method (Q-MBT25-2a=a coarchitectBridge.onPlanUsageUpdate); probe-07-plan-usage-ring GREEN |
| WB4 | green | live integration test + runtime electron smoke per CLAUDE.md §4.6 |
| WB5 | docs | findings doc + FOLLOWUPS amendments + outcome classification |

### Outcome B (headers not exposed) — 4-WB ladder

| WB | Type | Deliverable |
|---|---|---|
| WB1 | red | scaffold `plan-usage-ring.tsx` (placeholder state) + `ring-helpers.ts` + RED probes; sentinel zones; `MB-F-T25-PLAN-USAGE-HEADER-EXPOSURE-DEFERRED` Tier 2 filed |
| WB2 | green | ring-math + tinting + countdown helpers (pure fns; data sources mocked); probe-01-math GREEN |
| WB3 | green | PlanUsageRing with placeholder state (`—` countdown, empty rings); probe-07 GREEN against placeholder |
| WB4 | docs | findings doc + outcome classification "Capability enabled with known limitations" + followup tracking SDK upgrade path |

---

## §4 — HALT 0 dual-conditional gate

**Gate 1 — Operator ack on Q-MBT25-1..6:**
- Confirm or dispose otherwise. Q-MBT25-3 is operator-arbitrated at Terminal A's Phase 1, NOT here; surface only.

**Gate 2 — Terminal D's MB-T34 Phase 1 spike outcome:**
- Outcome A → 5-WB ladder
- Outcome B → 4-WB ladder + Tier 2 followup

**Both must arrive before WB1.** §3.7 strict halt discipline — no preliminary authoring during the wait.

---

## §5 — Frozen-territory verification (pre-WB1)

Per Round 4 prompt §6, allowed paths for MB-T25 commits:
- `packages/dispatch-workstation/src/chat-shell/plan-usage-ring.tsx` (NEW)
- `packages/dispatch-workstation/src/chat-shell/ring-helpers.ts` (NEW)
- `packages/dispatch-workstation/src/chat-shell/chat-shell.tsx` (additive sentinel zone)
- `packages/dispatch-workstation/src/chat-shell/mount.ts` (additive `resolveRenderPlanUsageRing`)
- `packages/dispatch-workstation/src/main/preload.mts` (additive zone for `onPlanUsageUpdate`; Outcome A only)
- `packages/dispatch-workstation/src/main/coarchitect-ipc.ts` OR new `packages/dispatch-workstation/src/main/plan-usage-ipc.ts` (Outcome A only)
- `packages/dispatch-workstation/test/unit/chat-shell/probe-07-plan-usage-ring.spec.tsx` (NEW)
- `packages/dispatch-workstation/test/unit/ring-helpers/probe-01-math.spec.ts` (NEW)
- `packages/dispatch-workstation/test/integration/chat-shell/plan-usage-roundtrip.test.tsx` (NEW; Outcome A only)
- `docs/coordination/mb-t25-*` (NEW)
- `docs/FOLLOWUPS.md` (additive rows)

Frozen surfaces (not touched):
- `packages/dispatch-core/src/v3/schema.ts` — frozen contract
- `docs/build-docs/CONDUCTOR_API_CONTRACT.md` — frozen contract
- `docs/build-docs/WORKSTATION_CONTRACT.md` §6 — frozen contract
- `docs/build-docs/REGISTRY.md` §2 — frozen contract
- Terminal C's MB-T26 sentinel zones (`chat-shell.tsx`, `mount.ts`, `preload.mts` MB-T26 zones)
- Terminal D's MB-T27 sentinel zones (`chat-shell.tsx`, `mount.ts` MB-T27 zones)
- Terminal A's MB-T24 sentinel zones (when authored)

---

## §6 — Cross-session coordination (per-session worktree isolation note)

Round 4 §3.12 worktree pivot eliminates four shared-tree failure modes documented at MB-T26 + MB-T27:
- Index-race (Tier 1 — `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT`)
- Working-tree-blocking (Tier 1 — `MB-F-PARALLEL-CAIRN-WORKING-TREE-BLOCKING`)
- Content-sweep (Tier 1 — `MB-F-PARALLEL-CAIRN-SHARED-TREE-CONTENT-SWEEP`)
- Cross-session destructive stash (Tier 1 — `MB-F-PARALLEL-CAIRN-CROSS-SESSION-STASH-DESTRUCTIVE`)

**New failure mode under worktree isolation:** push-rebase contention. Mitigated by atomic-chain `git pull --rebase --autostash` per §2.4 atomic-chain pattern.

**Q7 self-check answer under worktree isolation:** *"Per-session worktree isolation per Round 4 §3.12 pivot; structurally impossible to sweep cross-session edits."*

---

**Decisions doc closed at this commit.** Awaiting HALT 0 dual-conditional ack.
