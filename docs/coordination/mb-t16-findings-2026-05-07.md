# MB-T16 Phase 2 Findings — 2026-05-07

**Status:** WB5 (final) commit
**HEAD at authoring:** post-WB4 (`6252e64`)
**Ship outcome:** 5 commits + 1 phase-1-diagnose, 57 MB-T16 tests, 0
latent bugs introduced, 1 followup CLOSED (the chartered
`MB-F-T13-TILE-HEADER-PICKER-INTEGRATION`), 3 v3.1 polish followups
filed at WB5, 0 contract amendments, 0 frozen-zone touches.

This doc summarizes the MB-T16 (Tile-header approval-policy picker)
ladder outcome.

---

## I. Ladder outcome by WB

| WB | Commit | Type | Headline | Net new tests |
|---|---|---|---|---|
| Phase 1 | `d11257a` | spike | Diagnose — surface inventory + open questions | 0 |
| WB1 | `b20e2fc` | red   | scaffold approval-policy-ipc + tile-approval-picker + decisions doc | 10 stub tests (replaced at WB2/3) |
| WB2 | `96a5f0f` | green | approval-policy-ipc.ts pure-fn HTTP + IPC controller + preload extension | 26 (replaced WB1 stubs) |
| WB3 | `c400c07` | green | tile-approval-picker.tsx native `<select>` + state machine + render tests | 18 (replaced WB1 stubs) |
| WB4 | `6252e64` | green | Tile.renderPickerSlot + TileGrid plumb + TileGridApp bridge adapter + main.ts wire + closes MB-F-T13-TILE-HEADER-PICKER-INTEGRATION | 13 (7 probe-06 tile-grid-tile + 6 probe-04 tile-grid-app) |
| WB5 | (this commit) | docs  | findings + 3 followups | 0 |

**Cumulative MB-T16 test surface: 57 tests across 4 directories
(approval-policy-ipc + tile-approval-picker + tile-grid-tile probe-06 +
tile-grid-app probe-04), 100% green in scoped runs.** Plus 138 prior
tile-grid regression tests preserved.

## II. 0 latent issues caught + fixed within the ladder

MB-T16 shipped without surfacing any latent bugs. The MB-T15 lessons
(applied forward at WB1) prevented the recurring patterns:

- Read-before-Write tracking (`MB-F-WRITE-TOOL-READ-TRACKING-CROSS-TURN`)
  — preemptively did 1-line Reads before Writes of cross-turn files
  (color-helpers.ts at MB-T15 WB2 inspired the same prophylaxis at
  MB-T16 WB2, WB3); no Write errors during MB-T16.
- TS strictness (post-MB-T15 WB7-style `endDrag` readonly issue) —
  `approval-policy-ipc.ts` is in tsc scope; types correctly imported
  from `dispatch-core/dist/v3/schema.js`; no readonly mutations or
  strict-mode failures.
- happy-dom act() requirement (MB-T11a discovery) — render tests
  used `act()` + `waitFor()` for async Promise resolutions where
  state transitions matter; all 18 picker render tests + 6 bridge
  adapter tests passed first try.
- tsconfig .tsx exclude pattern — `tile-approval-picker.tsx` added
  at WB1; no typecheck surprises at WB2-WB4 integration.
- Slot wrapper testid preservation (MB-T15 WB4 lesson) — `Q-MBT16-3=a`
  + render-prop pattern preserves `tile-picker-slot-{name}` wrapper +
  `data-slot="picker"` attribute; existing probe-01 tile-grid-tile
  tests stay GREEN.

The "no latent issues" outcome reflects the maturity of the
dispatch-workstation tile-grid territory + pattern-template availability
(audit-modal-ipc.ts + session-kill-ipc.ts + detach-tile-ipc.ts as
direct templates for approval-policy-ipc.ts).

## III. 3 architectural insights surfaced

### Insight 1 — Render-prop slot population pattern is reusable

WB4 introduced the `renderPickerSlot?: (sessionName: string) => ReactNode`
prop on Tile + TileGrid. The pattern:

1. TileGridApp captures the bridge in a closure: `const renderPickerSlot
   = (name) => <PickerComponent sessionName={name} bridge={...} />`.
2. Closure passed to TileGrid via `renderPickerSlot` prop; plumbed to
   each Tile.
3. Tile invokes `renderPickerSlot(sessionName)` inside the existing
   `<div data-slot="...">` wrapper.
4. When undefined: wrapper renders empty (existing-test compat).

**Reusable for MB-T17 (autopilot toggle) + MB-T18 (footer)** — same
shape. Each successor adds:
- `renderAutopilotSlot?` / `renderFooterSlot?` prop on Tile + TileGrid
- TileGridApp constructs the closure with the relevant bridge methods
- The slot wrapper testid + data-slot attribute pattern preserves
  existing tests

### Insight 2 — Bridge adapter pattern handles graceful degradation

WB4's TileGridApp constructs `pickerBridge: TileApprovalPickerBridge | null`
by checking `workstationBridge.getSessionApprovalPolicy &&
workstationBridge.putSessionApprovalPolicy`. When EITHER method is
missing, pickerBridge=null; the picker handles null via the
'unavailable' state (Q-MBT16-2=a).

**Why this is better than required methods:** existing 29 tile-grid-app
tests don't supply approval-policy methods on their fake bridges. With
the adapter pattern, those tests don't need migration — the picker
renders 'unavailable', the tests don't assert on picker state, all
GREEN.

**Pattern generalizes:** any future per-tile feature that needs IPC
methods can use the same adapter — declare the methods OPTIONAL on
WorkstationBridgeShape, build the adapter only when ALL required
methods exist, gracefully degrade when they don't.

### Insight 3 — Two parallel call sites for the same daemon route is acceptable for ship-minimum

`approval-policy-resolver-shim.fetchSessionApprovalPolicy` (used by
orchestrator-action-handler) graceful-degrades to `'tight'` on error.
WB2's `fetchSessionApprovalPolicy` throws on any error path — the
picker UI needs explicit error states, NOT silent fallback to
misleading "tight".

Two consumers, two error-handling contracts, two ~30-LoC HTTP helpers
hitting the same `/v3/sessions/:name/approval-policy` GET route.
**Duplication is the right call here:**
- Each helper expresses its consumer's contract directly (graceful-
  degrade vs throw)
- Sharing a single helper would require the consumer to handle either
  contract — more complex than the duplication
- Tracked via existing `MB-F-T11-T13-RESOLVER-CALL-SITE-REWRITE` for
  v3.1 deduplication via the predicate-passing rewrite

## IV. Operator dispositions honored

All 8 Q-MBT16 + 8 R-MBT16 dispositions from the Phase 1 diagnose +
decisions doc landed without amendment:

| Disposition | Honored? | Where |
|---|---|---|
| Q-MBT16-1=a (native `<select>` 3 options) | ✅ | WB3 tile-approval-picker.tsx |
| Q-MBT16-2=a (disabled + tooltip on bridge-missing or GET error) | ✅ | WB3 unavailable state + WB4 bridge adapter null path |
| Q-MBT16-3=a (optimistic + silent rollback + tooltip on PUT error) | ✅ | WB3 onChange handler + lastError state |
| Q-MBT16-4=a (render-prop on Tile) | ✅ | WB4 Tile.renderPickerSlot prop |
| Q-MBT16-5=a (separate file tile-approval-picker.tsx) | ✅ | WB1 + WB3 |
| Q-MBT16-6=a (optional bridge methods) | ✅ | WB4 WorkstationBridgeShape extension |
| Q-MBT16-7=a (no cache for v3.0) | ✅ | per-tile fetch on mount; followup filed for v3.1 |
| Q-MBT16-8=a (show 'medium' on no-row) | ✅ | WB3 picker accepts daemon's authoritative response |
| R-MBT16-1 (per-tile fetch overhead) | ACCEPT | ≤8 tiles × ~80B GET; v3.1 cache via filed followup |
| R-MBT16-2 (PUT race conditions) | ACCEPT | daemon INSERT OR REPLACE; last-write-wins |
| R-MBT16-3 (bridge stub graceful degrade) | ✅ | WB4 adapter handles null |
| R-MBT16-4 (slot wrapper preservation) | ✅ | WB4 wrapper testid + data-slot kept |
| R-MBT16-5 (resolver-shim duplication) | DEFER | tracked via existing MB-F-T11-T13-RESOLVER-CALL-SITE-REWRITE |
| R-MBT16-6 (frozen-zone proximity) | RESOLVED | NO touches |
| R-MBT16-7 (sentinel discipline main.ts) | ✅ | WB4 NEW sentinel block adjacent to MB-T12 zone |
| R-MBT16-8 (optimistic rollback observability) | ACCEPT | tooltip-only surfacing for v3.0; followup filed for v3.1 |

## V. Methodology audit

The CLAUDE.md disciplines + MB-T12/MB-T15 ladder lessons + Phase 1
diagnose discipline: all held throughout 5 commits. Zero violations.

| Discipline | Held? |
|---|---|
| Per-path git operations (no -A or .) | ✅ all 5 commits |
| Pre-commit territory check via `git status --short` | ✅ all 5 commits |
| Post-commit territory verification via `git log -1 --stat` | ✅ all 5 commits |
| Confidence labels KNOWN/MODELED/SPECULATIVE | ✅ all 5 commit bodies + diagnose + decisions doc |
| Anti-fabrication: read source, don't infer | ✅ Phase 1 surfaced source-of-truth gap (operator-side inventory) explicitly; option-(a) confirmation captured in decisions doc |
| Each commit body includes self-check Q1-Q9 | ✅ all 5 commits |
| Per-commit-push: each WB pushed + verified | ✅ all 5 commits |
| Scoped sequential test runs (WB11a discovery) | ✅ all WB2-WB4 vitest invocations |
| tsconfig .tsx exclude pattern (WB11a discovery) | ✅ tile-approval-picker.tsx added at WB1 |
| Read-before-Write across turns (MB-T15 WB5 lesson) | ✅ preemptive Reads at WB2 + WB3; no Write errors |

## VI. WB5 followups filed (3 entries)

| Tier | ID | Status | Origin |
|---|---|---|---|
| 3 | `MB-F-T16-PICKER-CACHE-TTL` | filed | Q-MBT16-7=a deferred — v3.1 per-session cache for fetch dedup |
| 3 | `MB-F-T16-PICKER-RETRY-AFFORDANCE` | filed | Q-MBT16-2=a + R-MBT16-8 — v3.1 explicit retry button when daemon unreachable |
| 3 | `MB-F-T16-OPTIMISTIC-ROLLBACK-OBSERVABILITY` | filed | R-MBT16-8 — v3.1 prominent banner/toast for PUT errors (currently tooltip-only) |

All 3 are Tier 3 (visual / UX polish; v3.0 ships functional with
acceptable degradation paths).

## VII. Open questions for v3.1 (out of MB-T16 scope)

1. **Cache TTL** — when v3.1 adds the cache (filed
   MB-F-T16-PICKER-CACHE-TTL), what's the right TTL? Cache-bust on
   mutation (PUT) is straightforward; cache-bust on TTL for stale-
   reads needs operator UX preference (5 min? 30 min?).
2. **Resolver-shim deduplication** — the WB2 `fetchSessionApprovalPolicy`
   helper duplicates ~30 LoC with `approval-policy-resolver-shim.ts`.
   Existing followup `MB-F-T11-T13-RESOLVER-CALL-SITE-REWRITE` plans
   the predicate-passing rewrite that could subsume both call sites.
3. **Multi-window sync** — if operator opens approval-policy in a
   detached BrowserWindow (per MB-T11b detach flow) AND also views the
   main-window picker for the same session, both must reflect the same
   state. Currently each picker fetches independently on mount; PUT
   from one window doesn't notify the other. v3.1 follow-up: subscribe
   to `policy_updated` events via `/v2/events/stream` (or daemon emits
   a new event class) and refresh per-session pickers in real time.

## VIII. References

- decisions doc: `docs/coordination/mb-t16-decisions-2026-05-07.md`
- Phase 1 diagnose: `docs/coordination/mb-t16-diagnose-2026-05-07.md`
  (`d11257a`)
- chartered followup CLOSED at WB4:
  `MB-F-T13-TILE-HEADER-PICKER-INTEGRATION` in `docs/FOLLOWUPS.md:160`
- MB-T12 architecture-flow (integration baseline):
  `docs/coordination/mb-t12-architecture-flow.md`
- MB-T15 findings (immediate ladder precedent):
  `docs/coordination/mb-t15-findings-2026-05-07.md`
- WB1-WB5 commits: `b20e2fc 96a5f0f c400c07 6252e64` + (WB5 commit,
  this).
