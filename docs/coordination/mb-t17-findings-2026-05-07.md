# MB-T17 Phase 2 Findings — 2026-05-07

**Status:** WB5 (final) commit
**HEAD at authoring:** `6b4866b` (post-MB-T20-WB4)
**WB4 attribution anomaly:** content landed at `ecdd0e4`
(titled `red(MB-T18): WB1 — scaffold tile-footer + decisions doc`)
due to a parallel-cairn index race in shared-working-tree execution.
See §II. Tracked at the Tier 1 methodology followup
`MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (filed by Terminal B).

**Ship outcome:** 4 commits attributed to MB-T17 + 1 commit
(`ecdd0e4`) attributed to MB-T18 that contains MB-T17 WB4 content
verbatim, plus this WB5 docs commit. **52 MB-T17 tests** across 4
directories all GREEN. **End-to-end integration verified** on
origin/main: renderer `<TileAutopilotToggle>` → preload bridge →
ipcMain → AutopilotLoop → autopilot-state.json. **1 chartered
followup CLOSED** (`MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION`).
**3 v3.1 polish followups filed** at WB5. **0 contract amendments,
0 frozen-zone touches, 0 latent bugs introduced.**

This doc summarizes the MB-T17 (per-tile autopilot toggle) ladder
outcome.

---

## I. Ladder outcome by WB

| WB | Commit | Type | Headline | Net new tests |
|---|---|---|---|---|
| Phase 1 | `39e8134` | spike | Diagnose — surface inventory + open questions Q-MBT17-1..13 + R-MBT17-1..8 | 0 |
| WB1 | `ffe0dc7` | red   | scaffold autopilot-ipc + tile-autopilot-toggle + decisions doc | 12 stub tests (replaced WB2/3) |
| WB2 | `95ad485` | green | autopilot-ipc.ts impl + preload extension + 26 spec-table unit tests | 26 (replaced WB1 stubs) |
| WB3 | `59c7387` | green | tile-autopilot-toggle.tsx full impl + 13 render tests | 13 (replaced WB1 stubs) |
| WB4 | `ecdd0e4` | (see §II) | Tile.renderAutopilotSlot + TileGrid plumb + TileGridApp adapter + main.ts wire + closes MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION | 13 (7 probe-07 tile-grid-tile + 6 probe-05 tile-grid-app) |
| WB5 | (this commit) | docs  | findings + 3 v3.1 polish followups | 0 |

**Cumulative MB-T17 test surface: 52 tests across 4 directories
(autopilot-ipc + tile-autopilot-toggle + tile-grid-tile probe-07 +
tile-grid-app probe-05), 100% GREEN in scoped runs on origin/main
HEAD `6b4866b`.** Plus 89 prior tile-grid-tile regression tests (incl.
6 MB-T16 probes) + 41 prior tile-grid-app regression tests, all
preserved.

## II. WB4 attribution anomaly

**Incident.** MB-T17 WB4 plan was: edit tile.tsx + tile-grid.tsx +
tile-grid-app.tsx + main.ts + FOLLOWUPS.md and add probe-05 +
probe-07. After my WB3 push (`59c7387`), I executed all 7 path edits
in the shared working tree. While my changes were unstaged-modified +
untracked-new (verified by my own pre-commit `git status --short`),
Terminal B's MB-T18 WB1 commit (`ecdd0e4`) — landing concurrently —
captured my 7 paths into its own commit despite Terminal B asserting
per-path discipline + untouched T17 territory in their commit body.

**Verified outcome (KNOWN per `git show ecdd0e4 --` of each path):**
all 7 of my MB-T17 WB4 paths landed on origin/main with my exact
intended diff content:
- `tile.tsx` — `renderAutopilotSlot?` prop + slot wrapper conversion ✓
- `tile-grid.tsx` — prop + plumb-through ✓
- `tile-grid-app.tsx` — TileAutopilotToggle import + WorkstationBridgeShape extension + bridge adapter + closure ✓
- `main.ts` — MB-T17 sentinel imports block + IPC mount block + `AUTOPILOT_IPC_MOUNTED` test-hook ✓
- `FOLLOWUPS.md:173` — MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION row CLOSED with my closure detail ✓
- `test/unit/tile-grid-tile/probe-07-autopilot-slot-integration.spec.tsx` — 7 tests ✓
- `test/unit/tile-grid-app/probe-05-autopilot-bridge-adapter.spec.tsx` — 6 tests ✓

Zero deviation from my intended scaffold; 13 new tests GREEN.

**Root cause (per operator coordination notice):** index isolation gap
in shared-working-tree parallel-cairn — NOT per-path discipline failure
by Terminal B. Tracked at Tier 1 methodology followup
`MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (filed by Terminal B).

**Remediation chosen (operator-arbitrated):** forward-fix. No revert,
no rewrite. The work is functionally on origin/main; this findings
doc is the canonical attribution record. WB5 commits use the new
atomic-chain commit methodology (§VII) to prevent recurrence:

```
git pull --ff-only && \
git add <explicit paths> && \
git diff --cached --name-only | sort > /tmp/staged.txt && \
diff /tmp/staged.txt <(printf <intended paths> | sort) && \
git commit -m "..." && \
git push origin main && \
git log --oneline origin/main..HEAD
```

If the `diff` returns non-empty (index has more than intended), the
`&&` chain aborts before commit.

**Lesson** (preserved for v3.1 ladder discipline): in shared-working-
tree parallel-cairn, `git status --short` and `git add <explicit
paths>` are NECESSARY but NOT SUFFICIENT. The atomic-chain idiom adds
the SUFFICIENT step: explicit pre-commit verification that the index
contains EXACTLY the intended paths, no more, no less.

## III. Cumulative test surface

Despite the misleading WB4 commit attribution, the test surface is
canonical:

| Suite | Tests | Source |
|---|---|---|
| `autopilot-ipc/probe-01-spec-table` | 26 | MB-T17 WB2 (commit `95ad485`) |
| `tile-autopilot-toggle/probe-01-render-tests` | 13 | MB-T17 WB3 (commit `59c7387`) |
| `tile-grid-tile/probe-07-autopilot-slot-integration` | 7 | MB-T17 WB4 content (landed at `ecdd0e4`) |
| `tile-grid-app/probe-05-autopilot-bridge-adapter` | 6 | MB-T17 WB4 content (landed at `ecdd0e4`) |
| **Total MB-T17** | **52** | — |

Regression-clean against MB-T16 picker tests (probe-04 + probe-06) +
MB-T15 tile-header tests (probe-05) + MB-T12 tile-grid-tile tests
(probe-01..04). All 89 tile-grid-tile + 41 tile-grid-app + 21 cross-
session (T18 footer + T20 chat-shell) tests remain GREEN on `6b4866b`.

## IV. 0 latent issues caught + fixed within the ladder

MB-T17 shipped without surfacing any latent code bugs. The MB-T16
lessons (applied forward at WB1) prevented all the recurring patterns:
- Read-before-Write tracking (MB-F-WRITE-TOOL-READ-TRACKING-CROSS-TURN)
  — preemptive 1-line Reads worked.
- TS strictness — no readonly mutations or strict-mode failures.
- happy-dom act() requirement — render tests used act() + waitFor()
  correctly; all WB3 + WB4 React tests passed first try.
- tsconfig .tsx exclude pattern — `tile-autopilot-toggle.tsx` added at
  WB1; no typecheck surprises across WB2-WB4.
- Slot wrapper testid preservation — render-prop pattern preserved
  `tile-autopilot-slot-{name}` testid + `data-slot="autopilot"` per
  Q-MBT17-4=a. probe-01..05 tile-grid-tile tests stayed GREEN.

The "no latent code issues" outcome reflects pattern maturity
(MB-T15/T16 templates) + a simpler scope (workstation-side only;
boolean state).

**One methodology incident** (the WB4 attribution anomaly) was
caught and surfaced via cross-session forensics, not via my own pre-
commit territory check. That is the load-bearing lesson of this
ladder. See §VII methodology audit.

## V. 3 architectural insights surfaced

### Insight 1 — Render-prop slot population pattern is now firmly established (3rd application)

WB4 reused the render-prop pattern verbatim from MB-T16 picker:
1. TileGridApp captures the autopilot bridge in a closure
2. Closure passed via `renderAutopilotSlot?` prop to TileGrid → Tile
3. Tile invokes the closure inside the existing
   `<div data-slot="autopilot" ...>` wrapper
4. When undefined: wrapper renders empty (existing-test compat)

**Three successive applications now (MB-T16 picker + MB-T17 toggle +
MB-T20 chat-shell tab-host).** Pattern is the conventional choice for
v3.0 chrome slot population. MB-T18 (footer) follows the SAME pattern
once T18 reaches their WB3.

### Insight 2 — Bridge adapter pattern handles the workstation-side variant gracefully

MB-T16 introduced the bridge adapter pattern with HTTP-bound bridge
methods (`getSessionApprovalPolicy` + `putSessionApprovalPolicy`).
MB-T17 reused the SAME pattern shape with NO HTTP — bridge methods
return `Promise<{ enabled: boolean }>` from local IPC only.

**The adapter pattern is bridge-implementation-agnostic.** It cares
about (a) "are both methods defined?" and (b) "if so, build the
slim bridge object". Whether the methods talk HTTP, IPC, or in-memory
state is invisible at the closure boundary. This generalizes to any
future per-tile feature: header chrome, footer, autopilot, or
hypothetical future toggles can all share the same closure-construction
shape regardless of where their data lives.

### Insight 3 — Significant deviation from MB-T16: NO daemon route, NO HTTP layer

MB-T16 picker required a 2-call HTTP path (`fetchSessionApprovalPolicy`
+ `putSessionApprovalPolicy` with token auth), a daemon route +
SQLite table, and a graceful-degrade resolver-shim variant for
orchestrator-action-handler. MB-T17 toggle has NONE of that:

| Surface | MB-T16 picker | MB-T17 toggle |
|---|---|---|
| Daemon route | `/v3/sessions/:name/approval-policy` GET+PUT | none |
| Persistence | SQLite `session_policies` (daemon) | JSON file `<userData>/autopilot-state.json` |
| Token auth | `X-Conductor-Token` per call | none |
| HTTP error modes | network, timeout, non-2xx, JSON parse | none (sync fs) |
| Parallel call sites | resolver-shim + picker | only IPC controller |
| Total LoC (impl) | ~230 (picker + shim) | ~155 (single IPC controller) |

The simpler scope ALSO simplified the ladder — fewer error paths to
test, fewer integration surfaces to verify. WB2's IPC controller +
WB3's React component each landed in ~155 LoC vs MB-T16's ~230 +
~210. Total MB-T17 source surface is roughly 60% of MB-T16's at the
same architectural complexity.

This is the right outcome — workstation-side state should NOT spawn
daemon routes unless multi-process consumers require it. The
orchestrator-action-handler reads `AutopilotLoop.isEnabled()` directly
in its own process; no HTTP needed.

## VI. Operator dispositions honored

All 13 Q-MBT17 + 8 R-MBT17 dispositions landed without amendment:

| Disposition | Honored? | Where |
|---|---|---|
| Q-MBT17-1=a (native checkbox role=switch) | ✅ | WB3 tile-autopilot-toggle.tsx |
| Q-MBT17-2=a (disabled+tooltip on bridge-missing or fetch-error) | ✅ | WB3 unavailable state + WB4 bridge adapter null path |
| Q-MBT17-3=a (optimistic + silent rollback + tooltip) | ✅ | WB3 onChange handler + lastError state |
| Q-MBT17-4=a (render-prop on Tile) | ✅ | WB4 Tile.renderAutopilotSlot prop |
| Q-MBT17-5=a (separate file tile-autopilot-toggle.tsx) | ✅ | WB1 + WB3 |
| Q-MBT17-6=a (optional bridge methods) | ✅ | WB4 WorkstationBridgeShape extension |
| Q-MBT17-7=a (no cache for v3.0) | ✅ | per-tile fetch on mount; followup filed for v3.1 |
| Q-MBT17-8=a (default off on no-row) | ✅ | KNOWN per autopilot-state-store.ts:61 default |
| Q-MBT17-9=a (parallel AutopilotLoop instance) | ✅ | WB2 controller + WB4 main.ts wire |
| Q-MBT17-10=a (new sentinel block in main.ts) | ✅ | WB4 `=== BEGIN: MB-T17 autopilot IPC ===` adjacent to MB-T16 zone |
| Q-MBT17-11=a (per-WB probe directories) | ✅ | autopilot-ipc + tile-autopilot-toggle + tile-grid-tile/probe-07 + tile-grid-app/probe-05 |
| Q-MBT17-12=a (toggle is pure flag, no side effects) | ✅ | KNOWN per autopilot-loop.ts:120-130; no spawn/start/stop |
| Q-MBT17-13=a (probe-05 + probe-07 numbering) | ✅ | WB4 |
| R-MBT17-1..8 ACCEPT/PRESERVE/SEPARATE/NONE-NEEDED/ADD-AT-WB1 | ✅ | per Phase 1 dispositions |

## VII. Methodology audit

The CLAUDE.md disciplines + ladder lessons + Phase 1 diagnose
discipline: held throughout 4 cairn-grammar commits + 1 docs commit
PER MY OWN AUTHORSHIP. **One methodology incident at WB4 surfaced**
via cross-session forensics (the index race; NOT a discipline gap on
my side).

| Discipline | Held? |
|---|---|
| Per-path git operations (no -A or .) | ✅ all my commits |
| Pre-commit territory check via `git status --short` | ✅ all commits — but insufficient to catch the parallel index race at WB4 |
| Post-commit territory verification via `git log -1 --stat` | ✅ all my commits — would have caught the race had I observed it BEFORE the parallel `git commit` ran |
| Confidence labels KNOWN/MODELED/SPECULATIVE | ✅ all 5 commit bodies + diagnose + decisions doc |
| Anti-fabrication: read source, don't infer | ✅ Phase 1 + WB1-WB4 sourced verifications |
| Each commit body includes self-check Q1-Q9 | ✅ all 4 cairn-grammar commits + this docs commit |
| Per-commit-push: each WB pushed + verified | ✅ WB1-WB3 + this WB5 |
| Scoped sequential test runs (WB11a discovery) | ✅ all WB validations |
| tsconfig .tsx exclude pattern | ✅ WB1 |
| Read-before-Write across turns | ✅ preemptive Reads at WB2/3/4 worked |
| **NEW for WB5: atomic-chain commit (verifies staged paths exactly match intended)** | ✅ first application this commit (see §II) |

The atomic-chain commit pattern is the v3.1+ canonical idiom for
parallel-cairn execution. Adoption recommended at all subsequent
WBs across all sessions.

## VIII. WB5 followups filed (3 entries)

| Tier | ID | Status | Origin |
|---|---|---|---|
| 3 | `MB-F-T17-AUTOPILOT-CACHE-TTL` | filed | Q-MBT17-7=a deferred — v3.1 per-session cache for fetch dedup (mirrors MB-F-T16-PICKER-CACHE-TTL shape) |
| 3 | `MB-F-T17-AUTOPILOT-RETRY-AFFORDANCE` | filed | Q-MBT17-2=a polish — v3.1 explicit retry button on bridge-error (mirrors MB-F-T16-PICKER-RETRY-AFFORDANCE shape) |
| 3 | `MB-F-T17-OPTIMISTIC-ROLLBACK-OBSERVABILITY` | filed | R-MBT17-8 — v3.1 prominent indicator beyond tooltip-only (mirrors MB-F-T16-OPTIMISTIC-ROLLBACK-OBSERVABILITY shape) |

All 3 are Tier 3 (visual / UX polish; v3.0 ships functional with
acceptable degradation paths).

The Tier 1 methodology followup `MB-F-PARALLEL-CAIRN-INDEX-RACE-
ATOMIC-COMMIT` is filed by Terminal B (not by this commit), per
operator coordination notice 2026-05-07.

## IX. Open questions for v3.1 (out of MB-T17 scope)

1. **Cache TTL** — when v3.1 adds the autopilot cache (filed
   `MB-F-T17-AUTOPILOT-CACHE-TTL`), what's the right TTL? Toggle reads
   are cheap (sync fs), so cache is mostly about avoiding redundant
   IPC round-trips on tile re-mount. PUT-only invalidation is simplest
   but may diverge from autopilot-loop.ts mutations (e.g., orchestrator
   actions) that don't go through the IPC channel.
2. **Cross-window sync of autopilot state** — same as MB-T16 §VII-3
   for the picker. If operator detaches a tile (BrowserWindow opens
   for that session) AND views the toggle in the main grid, both
   pickers must reflect the same state. Currently each fetches
   independently on mount. v3.1 follow-up: subscribe to a hypothetical
   `autopilot_changed` event class via the existing event-stream
   infrastructure, OR move the cache into main-process scope.
3. **Multi-step intent + toggle interaction** — what happens when
   operator flips toggle OFF mid-intent? Current Q-MBT17-12=a says
   "pure flag — no side effects". Orchestrator-action-handler reads
   `isEnabled()` on each call; mid-intent toggle-off would block
   subsequent steps. v3.1 might want explicit cancel-pending-intent
   semantics (clearIntent() callback on toggle-off) or operator
   confirmation.

## X. References

- decisions doc: `docs/coordination/mb-t17-decisions-2026-05-07.md`
  (`ffe0dc7`)
- Phase 1 diagnose: `docs/coordination/mb-t17-diagnose-2026-05-07.md`
  (`39e8134`)
- chartered followup CLOSED at WB4 (via `ecdd0e4`):
  `MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION` in `docs/FOLLOWUPS.md:173`
- Methodology followup (filed by Terminal B):
  `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (Tier 1)
- MB-T16 findings (immediate ladder precedent):
  `docs/coordination/mb-t16-findings-2026-05-07.md`
- MB-T11 ladder source (autopilot foundation):
  - `38e009a` green(MB-T11): WB6 — autopilot-loop + autopilot-state-store
  - `df47e94` green(MB-T11): WB7 — coarchitect-ipc action routing
  - `69d7d29` merge: sess-mbt11
- WB1-WB5 commits: `ffe0dc7 95ad485 59c7387 ecdd0e4 + (this WB5 commit)`
