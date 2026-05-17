# MB-F-MB-T07-KANBAN-COLUMN-INTEGRATION — Decisions

**Session**: r12-cw2-mb-t07-kanban-column-integration
**Date**: 2026-05-17
**Arbitrator**: gen-7 (cascade orchestrator; V4 high-concurrency; operator-async authorized)
**Findings**: `docs/coordination/mb-f-mb-t07-kanban-column-integration-findings-2026-05-17.md`

## Q-MBFT07KCI-1 — Path α (manifest-correction + WB ladder) vs β (RESOLVED-BY-EQUIVALENCE) vs γ (dead-code completeness)

**Decision**: **(β) RESOLVED-BY-EQUIVALENCE**.

**Approved by**: gen-7 arbitration 2026-05-17 (one-message reply post-session evidence surface; quoted: "path (β) RESOLVED-BY-EQUIVALENCE APPROVED per your evidence — Option-D operator-arbitration at 2b0b0be mounts OrchestratorCardsExtras → SessionListPanel.extras via Layout.tsx:46; Phase-2-Step-8 at 387ed6d removed KanbanPanel from Layout (KanbanColumn.tsx is dead code in live Layout). Path α would land dead-code; path β preserves WC §5.5 conformance-in-intent.").

**Rationale**:
- Option-D operator-arbitration at `2b0b0be` mounts `OrchestratorCardsExtras → SessionListPanel.extras` via `Layout.tsx:46` — satisfies row 84's user-visible criterion (operator sees awaiting + stale buckets) with WC §5.5 conformance-in-intent.
- Phase-2-Step-8 swap at `387ed6d` removed `KanbanPanel` from `Layout.tsx`; `KanbanColumn.tsx` is dead code in the live operator UI (only reachable via direct test renders).
- Path α would land code in dead `KanbanColumn.tsx` — structural-completeness without user-visible blast radius (inverse of cairn-under-stress §1.1 deferred-prod-wiring class).
- Path γ (dual-mount-active) risks duplicate cards if `KanbanPanel` is ever resurrected; better to defer per-column wiring to the moment of resurrection.

**Trade-offs accepted**:
- Strict per-column placement form not exercised; residual structural-completeness gap filed as Tier-3 followup `MB-F-MB-T07-PER-COLUMN-PLACEMENT-IF-KANBAN-RESURRECTED`.
- If operator someday arbitrates a swap-back to KanbanPanel (e.g., to restore strict WC §5.5 awaiting_review/stale taxonomy), the Tier-3 followup becomes load-bearing.

## Q-MBFT07KCI-2 — Stamp shape verbatim

**Decision**: stamp shape proposed by session, approved verbatim by gen-7:

> → CLOSED-BY-EQUIVALENCE 2026-05-17 by gen-7 arbitration — Option-D operator-arbitrated mount at `2b0b0be` (OrchestratorCardsExtras → SessionListPanel.extras via Layout.tsx:46) satisfies row's user-visible criterion (operator sees awaiting + stale buckets); strict per-column-placement form (KanbanColumn.tsx wiring) is moot because Phase-2-Step-8 swap at `387ed6d` removed KanbanPanel from Layout. WC §5.5 conformance preserved-in-intent via operator-arbitrated workaround (extras-slot above Active/Done/Idle groups; M2 taxonomy noted at orchestrator-cards-extras.tsx:7-15). Residual structural-completeness gap (per-column placement in a hypothetical resurrected KanbanPanel) filed as MB-F-MB-T07-PER-COLUMN-PLACEMENT-IF-KANBAN-RESURRECTED Tier-3.

## Q-MBFT07KCI-3 — Subagent invocation under operator correction 2026-05-17 ~11:58 MDT

**Decision**: `cairn-phase-1-diagnose` SKIPPED per operator subagent-rationing correction (≤2 WB threshold). Direct Read tool used for surface inventory — anti-fabrication satisfied per CLAUDE.md §2.1 (every substantive claim cite-anchored to source path + line number + commit SHA).

**Boot-overhead-to-output ratio**: justified per directive (no subagent ceremony for moot-class closure where surface inventory is 4-file scope: Layout.tsx + KanbanColumn.tsx + KanbanPanel.tsx + orchestrator-cards-extras.tsx).

## Q-MBFT07KCI-4 — Territorial-manifest path mismatch

**Decision**: NOT-ACTED in this session. Manifest TERRITORY names `packages/dispatch-web/src/components/OrchestratorCardsLane.tsx` (path that does not exist at HEAD). Real `OrchestratorCardsLane.tsx` lives at `packages/dispatch-web/src/orchestrator-cards/orchestrator-cards-lane.tsx`. Under path-β, the lane file is NOT touched — manifest mismatch is moot for this session.

**Forward**: if Tier-3 followup `MB-F-MB-T07-PER-COLUMN-PLACEMENT-IF-KANBAN-RESURRECTED` is ever closed, the dispatcher must grant manifest EXPANSION on `packages/dispatch-web/src/orchestrator-cards/**`.

**Methodology cross-reference**: this session is a natural exhibit for `MB-F-ORCHESTRATOR-MANIFEST-PATH-VERIFICATION-PRE-DISPATCH` Tier-2 NEW filed by gen-7 at `433d331` commit body (per SITREP-3 §VIII) — orchestrators should diff manifest paths against actual repo before dispatch (analogous to gen-6 §1.2 stale-dispatch pre-check at FOLLOWUPS:372).

## Q-MBFT07KCI-5 — Outcome classification (CLAUDE.md §2.11)

**Decision**: "No regression; wiring verified; improvement case not exercised".

**Evidence**:
- Option-D mount path verified via Read at HEAD `433d331` (Layout.tsx:46 + orchestrator-cards-extras.tsx:7-15 rationale + 2b0b0be commit subject).
- User-visible card surfacing intact (no behavioral change in this commit).
- Row 84's strict per-column form not exercised (would have landed in dead KanbanColumn.tsx per §2.2 of findings).
