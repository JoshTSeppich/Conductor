# MB-T-WIREFRAME-T8 — Findings (2026-05-12)

**Ticket:** MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW
**Build doc:** `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW_BUILD.md`
**Session:** `phase4-t8-exec` (Round 11 §3.9 SPECULATIVE)
**Manifest:** `docs/coordination/territorial-manifests/phase4-t8-exec.txt`
**Decisions doc:** `docs/coordination/mb-t-wireframe-t8-decisions-2026-05-12.md`
**Coord doc:** `docs/coordination/coord-phase4-t8-2026-05-12.md`

Format: Wave B findings convention (I-X) per ticket §4 WB-final.

---

## I — What shipped

`[KNOWN]` at HEAD post-WB-final ship.

| WB | Verb | Commit | Surface | Net change |
|---|---|---|---|---|
| WB1 | red | `31709e0` (P5, pre-(β)) | `packages/dispatch-workstation/test/unit/chat-shell/probe-mbtwft8-01-current-stub-state.spec.ts` | 2-condition source-text sentinel for workstation src/main flip (sibling-flippable; out of (β) T8 scope but in T8 territory per manifest correction `6d7dff3`) |
| WB2 | red | `1ca2e15` | `packages/dispatch-daemon/test/unit/cost-aggregator.test.ts` | 4-condition probe for daemon pure-fn aggregator |
| WB3 | green | `39c514b` | `packages/dispatch-daemon/src/cost-aggregator.ts` | NEW `aggregateDailyCost(sessions): number` pure-fn; flips WB2 4/4 GREEN |
| WB4 | red (inverted) | `1238193` | `packages/dispatch-workstation/test/unit/chat-shell/probe-mbtwft8-02-aggregator-driven-render.spec.tsx` | 3-condition cross-package consumer-integration probe; GREEN-at-authoring with documented cairn inversion (regression-shield semantic preserved) |
| WB-final | green (docs) | (this commit) | decisions + findings + coord + ticket-body (β) amendment | (β) reshape captured; sibling deferrals enumerated |

**WB5 SKIPPED** under (β): workstation `src/main/coarchitect-ipc.ts:89`
STUB replacement is out of t8 territory; sibling-session deliverable.
Rationale captured at §VIII below.

---

## II — Sub-Q disposition (per ticket §3 gates)

`[KNOWN-OPERATOR-ARBITRATED]` 2026-05-12.

| Sub-Q | Default | (β) Resolution | Status |
|---|---|---|---|
| §3.1 A — aggregator source-of-truth | (c) workstation-daemon-polling | (b) daemon-side pure-fn | RESOLVED — daemon aggregator shipped at WB3 |
| §3.2 B — emission channel | (i) reuse `coarchitect:cost-update` | DEFERRED to sibling | OPEN — sibling-session decision |
| §3.3 C — per-session attribution | (i) aggregated total only | (i) aggregated total only | RESOLVED — `aggregateDailyCost` returns scalar number |
| §3.4 D — poll cadence + lifecycle | (γ) hybrid event-driven + 60s | DEFERRED to sibling | OPEN — pure-fn aggregator is cadence-agnostic |
| §3.5 E — daemon mock-to-real | (α) workstation-side only | (α) — mock-transparent | RESOLVED — `aggregateDailyCost` consumes MOCK_COST_INFO and future real values transparently |

---

## III — Architectural deltas

### III.1 — Daemon-side aggregator pattern adopted (vs workstation-side default)

`[KNOWN]` Ticket body §3.1 Sub-Q-T8-A default recommended (c) workstation-
side daemon-polling aggregator. (β) reshape selected (b) — daemon-side
pure-fn aggregator at `packages/dispatch-daemon/src/cost-aggregator.ts`.

**Architectural implication:** Aggregation logic now lives daemon-side
even though no daemon HTTP route consumes it (no `/v2/sessions/cost-summary`
endpoint shipped). The pure-fn is consumable by either:
- A future daemon route handler (wraps pure-fn over `/v2/sessions` registry
  read) — recommended next step if cross-package boundary tightening is
  preferred.
- A future workstation-side aggregator-poller that imports the pure-fn
  via cross-package relative path (precedent: WB4 probe at
  `chat-shell/probe-mbtwft8-02-...spec.tsx:48`).

**Sibling pattern parity:** T9 sibling shipped same pattern for plan-timer
at `packages/dispatch-daemon/src/rate-limit-aggregator.ts` (`3fef80d`).
Two daemon-side aggregators now coexist for the two bottom-rail data flows;
architectural consistency preserved.

### III.2 — Cross-package import in workstation tests (precedent reinforced)

`[KNOWN]` WB4 probe imports daemon-side `aggregateDailyCost` via workspace-
relative path. Precedent: `test/integration/approval-policy-semantic/
probe-01-policy-resolver-semantic.test.ts:39` does the same for daemon
test fixtures. WB4 reinforces this pattern for unit-level cross-package
contract testing.

### III.3 — No frozen-surface touch

`[KNOWN]` All shipped artifacts within (β) scope:
- CostInfoSchema (FROZEN per CLAUDE.md §1) consumed structurally; not modified.
- WORKSTATION_CONTRACT.md §6 (FROZEN) not touched.
- No new IPC channels introduced.
- No daemon route additions (deferred).

---

## IV — Probe distribution

| Surface | Probes (this ticket) | Pre-existing | Total |
|---|---|---|---|
| Daemon unit | 4 (cost-aggregator.test.ts conditions 1-4) | 244 | 248 |
| Workstation unit (chat-shell/probe-mbtwft8-*) | 5 conditions (WB1 sibling + WB4 own) | (pre-existing T4/T7 covered) | n/a |

`[KNOWN]` Daemon suite at HEAD post-WB-final:
- 4/4 cost-aggregator conditions PASS post-WB3.
- 247 passed | 1 failed (pre-existing `cc-console-buffer-migration.test.ts:89`;
  unrelated to t8; flagged §IX).

`[KNOWN]` Workstation suite touched by t8: only WB4 probe — 3/3 PASS
post-WB3.

---

## V — Architecture notes (post-ship state)

`[MODELED]` Composite system state for cost-meter data flow:

```
┌─────────────────────────────────────────────────────────────┐
│ DAEMON  (in t8 territory; shipped)                          │
│                                                             │
│  GET /v2/sessions                                           │
│    → MOCK_COST_INFO per session (routes/sessions.ts:114)    │
│                                                             │
│  aggregateDailyCost(sessions): number                       │
│    → sum of cost_info.usd_today (cost-aggregator.ts; WB3)   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ NO ROUTE WRAPPER YET — pure-fn only
                 │ (future: /v2/sessions/cost-summary, or
                 │  workstation cross-package import per WB4 probe)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ WORKSTATION src/main (sibling-session territory; NOT in t8) │
│                                                             │
│  coarchitect-ipc.ts:89                                      │
│    ipcMain.handle('coarchitect:getDailyCost', () => 0) STUB │
│    (WB1 RED 31709e0 condition (1) — sibling-flippable)      │
│                                                             │
│  src/main/cost-meter-aggregator.ts                          │
│    ABSENT (WB1 RED 31709e0 condition (2) — sibling-shippable)│
│                                                             │
│  No active aggregator-to-bridge wiring; no                  │
│  coarchitect:cost-update broadcast emitter (HSO-WB14a       │
│  removed it; not reauthored under (β) T8).                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ WORKSTATION renderer (consumer; T4 WB8 shipped)             │
│                                                             │
│  BottomRailCostMeter (bottom-rail-cost-meter.tsx)           │
│    subscribes to bridge.onCostUpdate; renders               │
│    `conductor api · $X.XX today` per wireframe              │
│                                                             │
│  CURRENT RUNTIME RENDER: `conductor api · — today`          │
│    (em-dash; no bridge data because emitter is removed)     │
└─────────────────────────────────────────────────────────────┘
```

**Outcome classification per CLAUDE.md §2.11:** *Capability enabled with
known limitations* — daemon pure-fn is ship-ready; runtime end-to-end
flow awaits sibling session ship.

---

## VI — Documentation drift

`[KNOWN]` Ticket body §1, §2.4, §4 WB ladder, §6 self-check expectations
all written against original (c)-default scope (workstation-side
aggregator). (β) reshape diverges.

**Resolution:** ticket body amendment shipped at this WB-final commit
adding §1.5 (β reshape note) + §4.0 (cairn-ladder under (β)) sections,
preserving original §1-§9 for historical context. See `CONDUCTOR_MB-T-
WIREFRAME-T8-COST-METER-DATA-FLOW_BUILD.md` post-amendment.

---

## VII — Consumer non-regression

`[KNOWN]` Per WB4 probe execution at `1238193`:
- BottomRailCostMeter wireframe-format render contract from T4 WB7
  (probe-mbtwt4-04-cost-meter-aggregation.spec.tsx) — UNCHANGED; T8 did
  not modify the component.
- T4 4-condition probe (no-bridge → em-dash; $0.42 emit → wireframe;
  $1.23 emit → wireframe; 2-decimal truncation) — still GREEN; not
  re-run as full T4 suite at this WB (per CLAUDE.md §9 don't run full
  workstation suite per WB).
- WB4's own 3 conditions exercise the same component via the same bridge
  signature with aggregator-driven inputs — extends T4 coverage without
  conflict.

---

## VIII — WB skip rationale (WB5)

`[KNOWN]` Original ticket body §4 WB5 scope:
> Replace STUB `ipcMain.handle('coarchitect:getDailyCost', () => 0)` with
> `() => costMeterAggregator.getDailyTotal()` ... ADD `costMeterAggregator
> .onUpdate(...)` mirroring removed `broadcastCostUpdate`.

ALL of WB5's edit targets are in `packages/dispatch-workstation/src/main/`
— OUTSIDE t8 manifest territory.

**Skip per (β) reshape:** WB5 is a sibling-session deliverable. T8 ships
daemon-side ingredients (WB2+WB3) + consumer-binding test (WB4); sibling
ships workstation src/main wiring that closes WB1 RED `31709e0`
conditions (1) and (2).

**Closure path:** future sibling session with manifest including
`packages/dispatch-workstation/src/main/coarchitect-ipc.ts` and
`packages/dispatch-workstation/src/main/cost-meter-aggregator.ts` will:
1. Author NEW workstation `src/main/cost-meter-aggregator.ts` polling
   daemon `/v2/sessions`, applying `aggregateDailyCost` (cross-package
   import from `dispatch-daemon/src/cost-aggregator.js`).
2. Replace STUB at `coarchitect-ipc.ts:89` with aggregator-driven response.
3. Add broadcast emitter (mirroring pre-HSO-WB14a pattern).
4. Flip 31709e0 RED → GREEN (both conditions).

**Outcome classification per CLAUDE.md §2.11:** *Capability enabled with
known limitations* — exact framing.

---

## IX — New followups + deferred-followups

### IX.1 — Deferrals (NOT closing in t8; required for full closure)

`[KNOWN]` Per t8 manifest FORBIDDEN scope, `docs/FOLLOWUPS.md` cannot be
modified in this session. The following rows DO NOT receive closure stamps
at t8 ship; sibling-session or operator-driven update required:

- **`MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED`** (Tier 3, T4 WB14
  findings §IX) — partial advance: daemon aggregator pure-fn ready;
  workstation STUB unchanged. Full closure when sibling session ships
  WB5-equivalent (workstation aggregator + STUB replacement).

- **`MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION`** (Tier 3, FOLLOWUPS:273)
  — closure path UPDATED per (β): daemon-side aggregator pure-fn is the
  current source-of-truth; PTY-scrape path remains valid future-alternative
  if daemon-side stays mocked indefinitely. Sibling closure update needed.

- **`MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING`** (Tier 2) — cost-meter arm NOT
  closed by t8 alone; awaits sibling WB5-equivalent.

- **Audit `wireframe-vs-shipped-audit-2026-05-09.md` §10.6 row "cost meter
  $/day"** — DOES NOT advance to SHIPPED-with-real-aggregation; advances
  only after sibling ship.

### IX.2 — Potential new followups surfaced during t8

`[MODELED]`:

- **MB-F-DAEMON-COST-AGGREGATOR-ROUTE-WRAPPER** (would be Tier 3, if filed):
  daemon pure-fn `aggregateDailyCost` has no HTTP route wrapper yet.
  Workstation cross-package import (WB4 probe pattern) works but
  architectural cleanliness would suggest a `/v2/sessions/cost-summary`
  daemon endpoint. Defer; not blocking.

- **MB-F-VITEST-DISCOVERY-SPEC-VS-TEST-SUFFIX** (would be Tier 3): daemon
  vitest config discovers `*.test.{ts,tsx}` only; manifest authoring
  initially missed this. Operator already corrected the t8 manifest at
  `6d7dff3`; broader followup would propose `include: ['test/**/*.{test,
  spec}.{ts,tsx}']` to align daemon convention with workstation. Defer
  to vitest-config-amendment ticket if patterns recur.

### IX.3 — Pre-existing failure (NOT closing; for visibility)

`[KNOWN]` Daemon suite at HEAD post-WB-final:
- `cc-console-buffer-migration.test.ts:89` deterministically fails on
  `userTables.length === 4`. Last touched by `3dd9a7d` (MB-F-DISPATCH-
  CORE-PERSIST-UNIFIED refactor) + `7af9cde` (CONSOLE-T01 cluster 1).
- ZERO coupling to T8 cost-aggregator surface (`packages/dispatch-daemon/
  src/cost-aggregator.ts` is pure-fn over `cost_info` shape; no sqlite/
  cc_console_buffer interaction).
- Existed pre-T8 ship; not introduced by t8.

Per CLAUDE.md §4.5 pre-existing-failure discipline: noted, not
re-diagnosed. Flag for operator-arbitrated cleanup ticket.

---

## X — Open items

`[KNOWN]` Following sibling/operator actions remain to fully close
MB-T-WIREFRAME-T8 wireframe-target:

1. Sibling session ships workstation `src/main/cost-meter-aggregator.ts`
   + `coarchitect-ipc.ts:89` STUB replacement + broadcast emitter wiring.
2. WB1 RED `31709e0` 2 conditions flip GREEN.
3. Runtime-launch smoke per CLAUDE.md §4.6: launch electron;
   BottomRailCostMeter renders `conductor api · $X.XX today` (non-em-
   dash) with ≥1 session spawned + daemon aggregator output flowing
   end-to-end.
4. Operator updates `docs/FOLLOWUPS.md`:
   - Close `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED`.
   - Update `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` closure path.
   - Cross-ref `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` cost-meter arm.
5. Operator updates audit `wireframe-vs-shipped-audit-2026-05-09.md` §10.6.

**Until items 1-3 complete:** runtime UX renders em-dash placeholder;
backend pure-fn ship is invisible to operator at electron launch. This is
expected (β) behavior — t8 delivers infrastructure, sibling delivers
visible wiring.

---

**End of MB-T-WIREFRAME-T8 findings (2026-05-12).**
