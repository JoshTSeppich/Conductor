# MB-F-MB-T07-KANBAN-COLUMN-INTEGRATION — Findings

**Session**: r12-cw2-mb-t07-kanban-column-integration
**Closure-target**: FOLLOWUPS:84 (Tier 2; `MB-F-MB-T07-KANBAN-COLUMN-INTEGRATION`)
**Outcome**: RESOLVED-BY-EQUIVALENCE per gen-7 arbitration 2026-05-17
**WB count**: 0 code commits; 1 WB-final docs commit
**Manifest**: `docs/coordination/territorial-manifests/r12-cw2-mb-t07-kanban-column-integration.txt`

## §1 — Closure-target row body (verbatim FOLLOWUPS.md:84)

> `OrchestratorCardsLane` ships as the existing-column placement helper per WC §5.5 but is NOT yet wired into `KanbanColumn.tsx`. Wire it so `awaiting_review` column hosts the `awaiting` lane below its session cards and `stale` column hosts the `stale` lane below its session cards. Per WC §5.5: orchestrator cards plug into existing columns; per WC §5.2: subtle blue tint visual distinction (already in OrchestratorCard). Tier 2 — depends on the cardBridge being wired (above) so awaiting/stale buckets actually populate.

## §2 — Supersession-detection evidence

Phase-1 diagnose via direct Read tool per operator subagent-rationing correction 2026-05-17 ~11:58 MDT (≤2 WB threshold → cairn-phase-1-diagnose subagent SKIPPED; anti-fabrication per CLAUDE.md §2.1 satisfied via cite-anchored source reads).

### §2.1 — Commit anchors

[KNOWN per `git --no-pager log --all` 2026-05-17 + `git show HEAD:packages/dispatch-web/src/components/Layout.tsx` direct read at HEAD `433d331`]:

| SHA | Subject (verbatim) | Role |
|---|---|---|
| `bf15fff` | `red(layout): assert SessionListPanel is mounted (not KanbanPanel)` | RED pin for Phase-2-Step-8 swap |
| `387ed6d` | `green(layout): swap KanbanPanel → SessionListPanel mount` | **Layout dead-code-fies KanbanPanel** |
| `2b0b0be` | `green(MB-T07): WB5-16 mount OrchestratorCardsExtras into SessionListPanel.extras` | **Option-D operator-arbitrated mount of cards** |
| `8e8b8e9` | `green(MB-F-LAYOUT-DATA-MOCK-PER-FIELD-BACKFILL): WB4 — Layout cluster wrapper cleanup + comment` | Latest Layout.tsx touch; preserves Step 8 swap |

### §2.2 — HEAD verification

[KNOWN at HEAD `433d331`, 2026-05-17]:
- `packages/dispatch-web/src/components/Layout.tsx:4` imports `SessionListPanel` (NOT `KanbanPanel`).
- `packages/dispatch-web/src/components/Layout.tsx:46` renders `<SessionListPanel extras={<OrchestratorCardsExtras />} />`.
- `KanbanPanel.tsx` has zero callers in `packages/dispatch-web/src/` — only direct test renders (`test/kanban.test.tsx`, `test/focus-from-hash.test.tsx`, `test/probe-mbf-kanban-region-empty-02-conditional-render.test.tsx`).
- `OrchestratorCardsLane` lives at `packages/dispatch-web/src/orchestrator-cards/orchestrator-cards-lane.tsx` (NOT at manifest TERRITORY path `packages/dispatch-web/src/components/OrchestratorCardsLane.tsx` — manifest-path mismatch noted; not actioned under path-β since lane file is untouched).

### §2.3 — WC §5.5 contract verbatim

[KNOWN per `WORKSTATION_CONTRACT.md:237-239` read 2026-05-17]:

> ### §5.5 Card column
> Orchestrator-proposed cards live in the existing dispatch-web kanban columns (AWAITING REVIEW for new proposals; STALE for superseded; etc.) with the visual distinction per §5.2. No dedicated "PROPOSALS" column in v3.0. Operator can filter via existing filter dropdowns to "orchestrator proposals only" if needed.

### §2.4 — Option-D arbitration rationale verbatim

[KNOWN per `packages/dispatch-web/src/orchestrator-cards/orchestrator-cards-extras.tsx:7-15` read 2026-05-17]:

```
// Per operator's Option D arbitration:
// - A2 corrected to SessionListPanel.extras (Session 1's actual ship).
// - A3 corrected to "extras-renders-both-buckets" because SessionList-
//   Panel's M2 taxonomy (Active / Done / Idle) has no Stale column
//   to share. Visual disambiguation between orchestrator cards and
//   CC-session cards comes from the blue tint already on OrchestratorCard
//   root (orchestrator-card.tsx:53-54), independent of column placement.
```

## §3 — Functional-closure vs residual-gap analysis

[KNOWN — split by criterion]:

| Criterion | Row-84 intent | Option-D ship state | Closed? |
|---|---|---|---|
| **User-visible card surfacing** (cardBridge → operator sees awaiting + stale buckets) | Required | `OrchestratorCardsExtras` renders both buckets in `SessionListPanel.extras` slot (above session groups); `useOrchestratorCards` hook populates from card-ipc-bridge | **✓ CLOSED** by `2b0b0be` |
| **Per-column placement** ("awaiting_review column hosts awaiting lane … stale column hosts stale lane") | Required | Single extras block above ALL session groups; SessionListPanel taxonomy is Active/Done/Idle (M2), not awaiting_review/stale (M1) | **✗ RESIDUAL GAP** — column-strict placement never landed |
| **WC §5.5 contract conformance** ("orchestrator cards live in the existing dispatch-web kanban columns") | Required | Operator Option-D arbitration explicitly notes the M2 taxonomy "has no Stale column to share" → mount falls back to extras-slot workaround | **PARTIAL** — operator-arbitrated workaround within §5.5 intent (cards in the existing column-bearing panel) but not literal per-column placement |
| **Visual distinction (§5.2 blue tint)** | Required | Blue tint on OrchestratorCard root persists independent of placement (orchestrator-card.tsx:53-54 per Option-D comment) | **✓ CLOSED** independent of this row |

## §4 — Supersession reasoning

[MODELED — supports gen-7 path-β arbitration]:

The user-visible criterion (operator-perceptible cards) is the load-bearing criterion per cairn-under-stress §1.1 (deferred-prod-wiring class). Row 84's strict per-column form (`KanbanColumn.tsx` wiring) is moot at HEAD because Phase-2-Step-8 swap at `387ed6d` removed KanbanPanel from `Layout.tsx`. Wiring per-column placement into KanbanColumn would land in dead code with zero operator-dogfood reachability — the inverse of the deferred-prod-wiring failure mode (structural-completeness without user-visible blast radius).

Option-D operator-arbitration at `2b0b0be` mounted `OrchestratorCardsExtras → SessionListPanel.extras` via `Layout.tsx:46`. This satisfies WC §5.5 conformance-in-intent (cards in the existing column-bearing panel) while honoring the M2 taxonomy mismatch (SessionListPanel Active/Done/Idle has no awaiting_review/stale column to share).

## §5 — Gen-7 arbitration outcome

Path β (RESOLVED-BY-EQUIVALENCE) approved 2026-05-17 by gen-7 cascade orchestrator (V4 high-concurrency cascade; 12-cap; operator-async authorized). See decisions doc at `docs/coordination/mb-f-mb-t07-kanban-column-integration-decisions-2026-05-17.md`.

## §6 — Followup filings (at WB-final commit)

- FOLLOWUPS:84 stamped → CLOSED-BY-EQUIVALENCE (operator-stamp envelope per shared bootstrap §F.7).
- NEW Tier-3 row `MB-F-MB-T07-PER-COLUMN-PLACEMENT-IF-KANBAN-RESURRECTED` filed — structural-completeness gap if operator someday re-mounts KanbanPanel.

## §7 — Outcome classification (CLAUDE.md §2.11)

**No regression; wiring verified; improvement case not exercised** — Option-D Layout-mount path verified at HEAD via Read tool; user-visible card surfacing intact; row 84's strict per-column form not exercised (would have landed in dead code per §2.2/§4).

## §8 — Adjacent observation (gen-7 awareness; not in this row's scope)

The kanban-empty-state-ux closure (`MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX` FOLLOWUPS:173, RESOLVED at `92fbc41`+`d212c80`+`5104e2a`) landed `KanbanEmptyState` into `KanbanPanel.tsx`. The closure's findings/impl-coord doc at `docs/coordination/mb-f-kanban-empty-state-ux-impl-coord-2026-05-16.md:59` claims "Single consumer: `packages/dispatch-web/src/components/Layout.tsx` imports KanbanPanel" — but Layout.tsx at HEAD imports `SessionListPanel`, NOT `KanbanPanel` (verified via `git show HEAD:Layout.tsx` 2026-05-17). That closure may have a moot-class status (operator's perceived blank-kanban-rectangle most likely came from SessionListPanel rendering empty Active/Done/Idle groups, not KanbanPanel). [SPECULATIVE without further read of the closure's RED probe assertions and impl-coord doc context.] Flagging for gen-7 awareness; not in this row's territory.

## §9 — Manifest-territory note

Manifest TERRITORY names `packages/dispatch-web/src/components/OrchestratorCardsLane.tsx` (path that does not exist at HEAD). Real `OrchestratorCardsLane.tsx` lives at `packages/dispatch-web/src/orchestrator-cards/orchestrator-cards-lane.tsx`.

Under path-β arbitration, the lane file is NOT touched — manifest mismatch is moot for this session. Per the orchestrator-methodology gap filed at `433d331` commit body (`MB-F-ORCHESTRATOR-MANIFEST-PATH-VERIFICATION-PRE-DISPATCH` Tier-2 NEW per SITREP-3 §VIII), this session is a natural exhibit for that meta-row — orchestrators should diff manifest paths against actual repo before dispatch (analogous to gen-6 §1.2 stale-dispatch pre-check at FOLLOWUPS:372).
