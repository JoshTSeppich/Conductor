# MB-T-WIREFRAME-T8 — Operator-Arbitrated Decisions (2026-05-12)

**Ticket:** `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW_BUILD.md`
**Session:** `phase4-t8-exec` (Round 11 §3.9 SPECULATIVE)
**Manifest:** `docs/coordination/territorial-manifests/phase4-t8-exec.txt`
**Authored under:** §3.4 mechanical translation of operator arbitrations.
**Confidence labels** (CLAUDE.md §2.2): `[KNOWN-OPERATOR-ARBITRATED]` for direct
operator decisions in this session; `[MODELED]` for derived implications.

---

## §1 — (β) Reshape Arbitration

`[KNOWN-OPERATOR-ARBITRATED]` 2026-05-12 turn-2:

> "proceed with reading (β); supersede WB1 RED"

**Three candidate readings surfaced at HALT-TERRITORY-MISMATCH** (turn-1
operator-acked HALT response):

- **(α)** Manifest pre-arbitrates Sub-Q-T8-A=(b) daemon-side aggregator;
  workstation src/main wiring deferred to sibling session.
- **(β)** Manifest scope intentionally narrows T8 to *daemon-side aggregator
  + bottom-rail consumer test only*; ticket body §2.4 + WB1 RED probe stale.
- **(γ)** Manifest incomplete; operator intends ticket body §2.4 paths to
  also be in T8 territory (drafting omission).

**Operator selected (β).** T8 ships:
1. Daemon-side `aggregateDailyCost` pure-fn module + probe (WB2 RED + WB3 GREEN).
2. Bottom-rail consumer integration probe binding daemon output → wireframe
   render (WB4).
3. WB-final docs + ticket-body amendment.

**Out of (β) scope** (handled by sibling session OR deferred):
- Workstation `src/main/cost-meter-aggregator.ts` (WB1 RED 31709e0 sentinel).
- Workstation `src/main/coarchitect-ipc.ts:89` STUB replacement (WB1 RED 31709e0 sentinel).
- Daemon `/v2/sessions/cost-summary` route (defer; aggregator pure-fn is
  consumable as-is by workstation polling).
- BottomRailCostMeter component-body changes (already shipped at T4 WB8;
  consumer signature unchanged).

---

## §2 — Sub-Q Resolutions under (β)

Mapping (β) reshape against ticket body §3 Sub-Q gates:

| Sub-Q | Default | (β) Resolution | Rationale |
|---|---|---|---|
| §3.1 Sub-Q-T8-A (aggregator source-of-truth) | (c) workstation-side daemon-polling | **(b) daemon-side aggregator pure-fn** | Manifest territory grants `packages/dispatch-daemon/src/cost-aggregator*.ts` exclusively — daemon-side aggregator. Pure-fn over `SessionResponseV2[]` (no daemon route addition; route work is downstream sibling concern). |
| §3.2 Sub-Q-T8-B (emission channel) | (i) reuse `coarchitect:cost-update` | **DEFERRED to sibling** | Emission-channel selection is workstation-side wiring (out of (β) scope). Bridge surface stable per T4. |
| §3.3 Sub-Q-T8-C (per-session attribution) | (i) aggregated total only | **(i) aggregated total only** | `aggregateDailyCost` returns `number` (scalar daily total); matches existing `onCostUpdate(totalUsd: number)` bridge signature; no breakage of T4-shipped consumer. |
| §3.4 Sub-Q-T8-D (poll cadence + lifecycle) | (γ) hybrid event-driven + safety net | **DEFERRED to sibling** | Polling/lifecycle is workstation-side wiring. Pure-fn aggregator is cadence-agnostic. |
| §3.5 Sub-Q-T8-E (daemon mock-to-real) | (α) workstation-side only; daemon deferred | **(α) — mock-data-pass-through** | T8 daemon aggregator transparently consumes MOCK_COST_INFO; future `MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION` Tier 2 ship replaces MOCK with real Anthropic-API integration without aggregator code change (CostInfoSchema FROZEN). |

---

## §3 — Cairn-grammar inversion at WB4

`[KNOWN]` WB4 RED probe (`probe-mbtwft8-02-aggregator-driven-render.spec.tsx`)
shipped at commit `1238193` is GREEN at HEAD because WB3 GREEN
(`39c514b`) shipped the daemon aggregator first.

**Why cairn-`red:` verb is correct nonetheless:**
- Probe sentinels module existence + behavior contract; deletion re-flips RED.
- Regression-shield semantic is preserved.
- Conceptual RED state was load-bearing at WB2 RED checkpoint (1ca2e15)
  pre-WB3 ship.

**Why not `green:`:** `green:` is for *implementation that makes a red test
pass*; this commit is the contract spec itself, not the impl. Test
authoring is `red:` per CLAUDE.md §2.3.

Honest framing captured in commit body; not silently elided.

---

## §4 — Discoverability findings (surfaced + resolved)

### §4.1 — Daemon vitest .spec.ts→.test.ts collision

`[KNOWN]` Initial manifest specified `cost-aggregator*.spec.ts` but daemon
vitest config (`packages/dispatch-daemon/vitest.config.ts:11`) discovers
only `*.test.{ts,tsx}`. Surfaced as HALT-TERRITORY-DISCOVERABILITY-GAP.

**Resolution:** operator manifest correction at `6d7dff3` —
`cost-aggregator*.spec.ts` → `cost-aggregator*.test.ts` (mechanical
translation under §3.4). Probe authored at corrected path.

### §4.2 — P5-shipped WB1 RED probe out-of-original-territory

`[KNOWN]` WB1 RED probe at `31709e0` was authored to
`packages/dispatch-workstation/test/unit/chat-shell/probe-mbtwft8-01-current-stub-state.spec.ts`
but original t8 manifest scoped only `bottom-rail/probe-mbtwft8-*.spec.tsx`.

**Resolution:** same `6d7dff3` correction added
`chat-shell/probe-mbtwft8-*.spec.{ts,tsx}` to t8 territory. 31709e0 probe
verified in-scope at WB1 re-verification; RED state confirmed (2/2 failing
at HEAD per workstation vitest run).

---

## §5 — WB-skip rationale (WB5)

`[KNOWN]` Ticket body §4 WB5 specified `coarchitect-ipc.ts:89` STUB
replacement + aggregator startup wiring + broadcast emitter. ALL paths in
WB5 scope are `packages/dispatch-workstation/src/main/*.ts` — out of (β)
territory.

**Skip rationale:** (β) reshape excludes workstation src/main wiring.
WB5 is a sibling-session deliverable (will close 31709e0 WB1 RED
conditions (1) and (2) when shipped). T8 does not block on WB5; the
daemon aggregator + cross-package consumer probe stand as ship-evidence
independent of WB5.

**Outcome classification per CLAUDE.md §2.11:** *Capability enabled with
known limitations* — daemon aggregator pure-fn is ship-ready; end-to-end
flow awaits sibling session wiring.

---

## §6 — Audit + FOLLOWUPS deferral

`[KNOWN]` Audit doc (`docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md`)
and `docs/FOLLOWUPS.md` are NOT in t8 territory.

**Deferral:** flagged in WB-final findings doc §IX for sibling-session or
operator-driven closure. Specifically:
- Audit §10.6 row "cost meter $/day" — DOES NOT advance to "SHIPPED-with-
  real-aggregation" yet; T8 ships HALF the flow (daemon-side); requires
  sibling WB5 to claim full closure.
- `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` Tier 3 — NOT closed by
  T8 alone; closure depends on workstation `coarchitect-ipc.ts:89` STUB
  removal.

This is honest scope-boundary discipline per CLAUDE.md §2.12 followups-
over-absorption.

---

**End of T8 decisions doc (2026-05-12).**
