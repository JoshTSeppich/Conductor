# MB-T17 Phase 1 Diagnose — Per-tile autopilot toggle

**Date:** 2026-05-07
**Authoring HEAD:** `bb4b062` (post-MB-T16 close-out)
**Status:** Phase 1 surface inventory + open-questions surface;
operator-review HALT before Phase 2 WB1.

This doc surfaces the existing autopilot territory + open questions
Q-MBT17-1..13 + risks R-MBT17-1..8 with tentative dispositions for the
**per-tile autopilot toggle** ticket. MB-T17 mirrors the MB-T16 ladder
shape (5-WB ladder, render-prop slot pattern, bridge adapter pattern,
optimistic UI), with one **deviation**: NO daemon route (autopilot is
purely workstation-side state).

---

## I. Surface inventory

### I-A. autopilot-state-store

**File:** `packages/dispatch-workstation/src/main/autopilot-state-store.ts`
(173 lines, MB-T11 WB6).

**Public API (KNOWN):**

| Function | Signature | Purpose |
|---|---|---|
| `readAutopilotState(sessionName)` | `(string) => AutopilotState` | Per-session read; returns `defaultAutopilotState()` on no-row |
| `writeAutopilotState(sessionName, state)` | `(string, AutopilotState) => void` | Per-session write; merges into the file map |
| `readAllAutopilotStates()` | `() => Record<string, AutopilotState>` | Whole-map read; returns `{}` on missing/corrupt file |
| `writeAllAutopilotStates(all)` | `(Record<string, AutopilotState>) => void` | Whole-map write |
| `defaultAutopilotState()` | `() => AutopilotState` | `{ enabled: false, ... }` |

**`AutopilotState` shape (lines 49-56):**
```ts
{
  enabled: boolean;             // ← toggle reads/writes this field
  currentIntentId: string | null;
  currentStep: number | null;
  totalSteps: number | null;
  lastActionFiredAt: string | null;
  pendingIntents: PendingIntent[];
}
```

**Persistence:** sync fs (`readFileSync`/`writeFileSync`); JSON file at
`<userData>/autopilot-state.json`. Test override via env
`MB_AUTOPILOT_STATE_DIR` (mirrors splitter-state.ts). Best-effort writes
(swallowed errors per v3.0 single-user model).

**Default `enabled`:** `false` (line 61).

### I-B. autopilot-loop (state machine)

**File:** `packages/dispatch-workstation/src/main/autopilot-loop.ts`
(247 lines, MB-T11 WB6).

**Class:** `AutopilotLoop` (stateless — line 102: "every method reads +
writes through the injected store deps so multiple instances ... see the
same persisted state"). Constructor takes `AutopilotLoopDeps` with
optional `now`, `uuidGen`, `read`, `write` for test injection.

**Methods relevant to MB-T17 (KNOWN):**

| Method | Signature | Behavior |
|---|---|---|
| `setEnabled` | `(string, boolean) => void` | Toggles `state.enabled` (lines 121-125) |
| `isEnabled` | `(string) => boolean` | Reads `state.enabled` (lines 128-130) |

Both are literal pass-throughs to `readAutopilotState` /
`writeAutopilotState`; no encapsulated invariants. **Parallel instances
across multiple call sites are explicitly safe** (KNOWN per file
header).

### I-C. autopilot IPC handlers — NOT FOUND

**Search:** `ipcMain.handle.*autopilot` across
`packages/dispatch-workstation/src/main/`.

**Result:** zero matches. Existing autopilot caller is
`coarchitect-ipc.ts:84` which instantiates `AutopilotLoop` and routes
calls through `orchestrator-action-handler.dispatchAction`. No per-
session toggle IPC channel today.

**Implication:** MB-T17 must add new IPC handlers. Two channel names
proposed (mirror MB-T16 `workstation:approval-policy-{get,put}`):
- `workstation:autopilot-get` — payload `{ sessionName }`, returns
  `{ enabled: boolean }`
- `workstation:autopilot-put` — payload `{ sessionName, enabled }`,
  returns `{ enabled: boolean }`

### I-D. preload bridge methods — NOT FOUND

**File:** `packages/dispatch-workstation/src/main/preload.mts`.

**Search:** `autopilot` in workstationBridge methods. Zero matches.

**Existing bridge methods (KNOWN, from MB-T16 close-out + Explore
inventory):** `openRepoDialog`, `requestSpawn`, `onSpawnResult`,
`sendPromptToSession`, `killSession`, `fetchAuditModal`, `detachTile`,
`onTileDetachClosed`, `getSessionApprovalPolicy`,
`putSessionApprovalPolicy`.

**Implication:** MB-T17 adds 2 new bridge methods (mirror MB-T16):
- `getSessionAutopilotEnabled(sessionName) =>
  Promise<{ enabled: boolean }>`
- `setSessionAutopilotEnabled(sessionName, enabled) =>
  Promise<{ enabled: boolean }>`

### I-E. daemon routes — NONE NEEDED

**File:** `packages/dispatch-daemon/src/routes/`.

**Search:** `autopilot`. Zero relevant matches; daemon does NOT persist
autopilot state.

**Architecture note (KNOWN, from autopilot-loop.ts:6-12 file header):**
"pending_intents + last_action_fired_at live workstation-side; the WB7
Tier4 fan-out merges this state INTO each SessionContextSnapshot after
the daemon fetch. The daemon's /v3/sessions/:name/context-snapshot
continues to return [] / null for these fields."

**Implication:** MB-T17 IPC handlers mutate the local JSON file
directly. NO HTTP layer. **Significant deviation from MB-T16**: MB-T16
picker had a 2-call HTTP fetch path (`fetchSessionApprovalPolicy` +
`putSessionApprovalPolicy` with token auth); MB-T17 is direct file ops
behind an IPC handler. Simpler, fewer error modes.

### I-F. tile.tsx autopilot slot wrapper

**File:** `packages/dispatch-workstation/src/tile-grid/tile.tsx`
(lines 165-168, KNOWN).

**Current markup:**
```tsx
<div
  data-slot="autopilot"
  data-testid={`tile-autopilot-slot-${sessionName}`}
/>
```

**Adjacent picker slot (lines 162-164, MB-T16 baseline):**
```tsx
<div data-slot="picker" data-testid={`tile-picker-slot-${sessionName}`}>
  {renderPickerSlot ? renderPickerSlot(sessionName) : null}
</div>
```

**MB-T17 plan (mirror picker pattern):** replace the
self-closing `<div ... />` with the same render-prop wrapper:
```tsx
<div
  data-slot="autopilot"
  data-testid={`tile-autopilot-slot-${sessionName}`}
>
  {renderAutopilotSlot ? renderAutopilotSlot(sessionName) : null}
</div>
```

**Contract preservation (KNOWN-required):**
- `data-slot="autopilot"` attribute MUST persist (existing tile-grid-
  tile probe-01 tests assert this).
- `data-testid="tile-autopilot-slot-{name}"` MUST persist (MB-T12 WB5
  contract).
- When `renderAutopilotSlot` is `undefined`, wrapper renders empty
  (existing-test compatibility).

### I-G. TileGridSessionEntry shape

**File:** `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx`
(lines 25-40, KNOWN).

**Existing fields:** `name`, `status?`, `collapsed?`, `branchName?`,
`repoName?`, `model?`, `tokensUsed?`, `tokenBudget?`. **No autopilot
field today.**

**Implication:** MB-T17 does NOT add a field. Toggle reads `enabled`
state via fetch on mount (mirrors MB-T16 picker). State is owned by
autopilot-state-store, NOT by TileGridSessionEntry. This avoids
plumbing an extra prop through TileGridApp → TileGrid → Tile.

### I-H. MB-T11 ladder commits

**Result of `git log --grep="MB-T11"`:**
- `38e009a` green(MB-T11): WB6 — autopilot-loop + autopilot-state-store
- `912ad3c` green(MB-T11): WB5 — orchestrator-action-handler dispatcher
- `df47e94` green(MB-T11): WB7 — coarchitect-ipc action routing
- `012145c` docs(MB-T11): WB8 — multi-session test + findings doc
- `69d7d29` merge: sess-mbt11/orchestrator-action-tools-and-autopilot

**Ship status:** MB-T11 left autopilot **invisible to operators** —
state machine works (orchestrator can drive intents) but there's no UI
toggle. This ticket completes the MB-T11 surface area by exposing the
toggle.

### I-I. Open followups touching autopilot

| Line | ID | Tier | MB-T17 relation |
|---|---|---|---|
| 173 | `MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION` | 2 | **Chartered followup — closes at MB-T17 WB4** (mirrors MB-T16's MB-F-T13 closure pattern) |
| 181 | `MB-F-T15-AUTOPILOT-TOKEN-INTEGRATION` | 2 | **OUT OF SCOPE** (per operator brief); may consume autopilot-state-store telemetry once landed but not this ticket |
| 158 | `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED` | 2 | OUT OF SCOPE; orthogonal autopilot capability (orchestrator-fired spawn) |

---

## II. Open questions Q-MBT17-1..13

### Q-MBT17-1: Toggle UI affordance — checkbox switch?

Three plausible affordances:
- **(a)** Native `<input type="checkbox" role="switch">` — accessible,
  keyboard-friendly, no custom CSS.
- (b) Custom CSS toggle pill (rounded-rect with sliding circle).
- (c) Two-state `<button>` ("ON" / "OFF" text).

**Tentative disposition: (a)** — Q-MBT16-1=a precedent (native
control); accessibility default; minimal CSS. ~80 lines for the toggle
component (mirrors picker file size).

### Q-MBT17-2: Bridge graceful degradation when methods missing

When `workstationBridge.getSessionAutopilotEnabled` or
`setSessionAutopilotEnabled` is `undefined` (test fixtures, non-Electron
environments):
- **(a)** Render disabled toggle in 'unavailable' state (mirrors MB-T16
  Q-MBT16-2=a).
- (b) Render nothing (slot wrapper stays empty).

**Tentative disposition: (a)** — direct MB-T16 precedent + bridge
adapter pattern (Insight 2 from MB-T16 findings). Test fixtures don't
need to migrate.

### Q-MBT17-3: Optimistic UI on PUT failure

When `setSessionAutopilotEnabled` throws (e.g., disk write fails):
- **(a)** Optimistic update + silent rollback to prior state + tooltip
  surfacing the error (mirrors MB-T16 Q-MBT16-3=a).
- (b) Pessimistic — show pending state until PUT confirms, then
  commit.

**Tentative disposition: (a)** — direct MB-T16 precedent. Disk writes
are best-effort (autopilot-state-store swallows write errors per file
header), so PUT will rarely "fail" visibly; rollback handles the
disk-full / permission-denied edge.

### Q-MBT17-4: Render-prop on Tile

- **(a)** `Tile.renderAutopilotSlot?: (sessionName: string) => ReactNode`
  prop, plumbed through TileGrid + populated by TileGridApp.
- (b) Direct embed of `<TileAutopilotToggle>` inside Tile.tsx.

**Tentative disposition: (a)** — direct MB-T16 Q-MBT16-4=a precedent
+ Insight 1 (render-prop slot population is the established pattern for
v3.0 chrome). Reuses Tile's testability.

### Q-MBT17-5: Toggle component file location

- **(a)** New file `packages/dispatch-workstation/src/tile-grid/
  tile-autopilot-toggle.tsx` (mirrors MB-T16 `tile-approval-picker.tsx`).
- (b) Inline inside tile-grid-app.tsx.

**Tentative disposition: (a)** — direct MB-T16 Q-MBT16-5=a precedent.
Separate file keeps Tile testable in isolation + matches package layout.

### Q-MBT17-6: Optional bridge methods

- **(a)** Add `getSessionAutopilotEnabled?` + `setSessionAutopilotEnabled?`
  as OPTIONAL on `WorkstationBridgeShape` (mirrors MB-T16 Q-MBT16-6=a).
- (b) Required methods.

**Tentative disposition: (a)** — direct MB-T16 precedent + bridge
adapter pattern. Test fixtures + non-Electron envs degrade gracefully.

### Q-MBT17-7: Cache?

With ≤8 tiles, each fetches autopilot state on mount via the bridge.
- **(a)** No cache for v3.0; per-tile fetch on mount (mirrors MB-T16
  Q-MBT16-7=a).
- (b) Per-session cache shared across tiles.

**Tentative disposition: (a)** — direct MB-T16 precedent; sync fs ops
are cheap; v3.1 polish via `MB-F-T17-AUTOPILOT-CACHE-TTL` followup if
warranted (parallel to MB-F-T16-PICKER-CACHE-TTL).

### Q-MBT17-8: Default value for fresh session

When `readAutopilotState(sessionName)` returns `defaultAutopilotState()`
(no row), `enabled` is `false`.

- **(a)** Toggle renders 'off' on no-row (KNOWN-correct per
  defaultAutopilotState()).
- (b) Toggle renders 'on' (autopilot opt-out by default).

**Tentative disposition: (a)** — KNOWN-correct + opt-in is the safe
default for autopilot.

### Q-MBT17-9: IPC handler — direct file ops vs new AutopilotLoop instance?

Two architectures for the IPC controller's data path:
- **(a)** Instantiate a NEW `AutopilotLoop` in the IPC controller, call
  `setEnabled` / `isEnabled` (mirrors how coarchitect-ipc.ts:84 uses it).
  Pro: public API; future-proof if AutopilotLoop adds invariants. Con:
  parallel instance.
- (b) Import `readAutopilotState` / `writeAutopilotState` directly,
  toggle just the `enabled` field. Pro: simpler (no class
  instantiation). Con: bypasses public API.

**Tentative disposition: (a)** — AutopilotLoop file header explicitly
endorses parallel instances ("multiple instances ... see the same
persisted state"). Public API is cleaner for the IPC controller (~30
lines including the controller class + factory). No meaningful overhead
vs (b).

### Q-MBT17-10: Sentinel block in main.ts

- **(a)** New sentinel `=== BEGIN: MB-T17 autopilot IPC ===` adjacent
  to MB-T16 sentinel zone (mirrors R-MBT16-7 placement).
- (b) Reuse / extend an existing sentinel zone.

**Tentative disposition: (a)** — direct MB-T16 precedent + CLAUDE.md
§3.3 sentinel discipline ("Add new logic in NEW sentinel blocks").

### Q-MBT17-11: Test directory layout

- **(a)** `test/unit/autopilot-ipc/` (mirrors MB-T16
  `test/unit/approval-policy-ipc/`) for IPC controller tests +
  `test/unit/tile-autopilot-toggle/` for the React component.
- (b) Combine into a single directory.

**Tentative disposition: (a)** — direct MB-T16 precedent + CLAUDE.md
§3.6 test layout.

### Q-MBT17-12: ON-toggle side effects — does it START a loop?

Reading MB-T11 ladder + AutopilotLoop source: **autopilot is a state
flag, NOT a process-control toggle**. Toggle ON sets `enabled=true`;
the next user prompt or orchestrator action checks `isEnabled()` and
proceeds-or-blocks accordingly. There is NO background loop to start
or stop; no resources to allocate.

- **(a)** Toggle is a pure flag mutation; no side effects beyond the
  JSON write.
- (b) Toggle ON should ALSO trigger something (e.g., start a background
  task, initialize state).

**Tentative disposition: (a)** — KNOWN per autopilot-loop.ts:120-130.
The orchestrator-action-handler is the consumer of the flag; it will
see the new value on its next call. **No spawn / start / stop.**

### Q-MBT17-13: Probe coverage at WB4 integration

MB-T16 WB4 added probe-04 (TileGridApp picker-bridge adapter, 6 tests)
+ probe-06 (Tile renderPickerSlot prop integration, 7 tests).
- **(a)** Mirror: probe-05 (TileGridApp autopilot-bridge adapter, 6
  tests) + probe-07 (Tile renderAutopilotSlot prop integration, 7
  tests).
- (b) Combine integration coverage into a single broader probe.

**Tentative disposition: (a)** — direct MB-T16 precedent; named numeric
probes give per-WB regression-test attribution.

---

## III. Risks R-MBT17-1..8

### R-MBT17-1: Parallel AutopilotLoop instances (Q-MBT17-9=a)

**Surface:** new IPC controller instantiates AutopilotLoop; coarchitect-
ipc.ts:84 already has one. Two instances mutate the same JSON file via
sync fs ops.

**Severity:** LOW. Sync fs writes are atomic per call; AutopilotLoop is
KNOWN-stateless (file header line 102). Last-write-wins on concurrent
mutation; zero in-memory state to drift.

**Tentative disposition: ACCEPT** — explicitly endorsed pattern.

### R-MBT17-2: Concurrent JSON writes across call sites

**Surface:** toggle PUT + orchestrator's `recordAction` both mutate
`autopilot-state.json`. A toggle PUT during an action-fire could
overwrite the action's `lastActionFiredAt` update or vice-versa.

**Severity:** LOW. Race window is microseconds (sync fs); impact at
worst is one missed timestamp update, which the next action will
correct.

**Tentative disposition: ACCEPT** — v3.0 single-user single-workstation
model tolerates the race.

### R-MBT17-3: PUT failure leaves UI inconsistent (mirrors R-MBT16-8)

**Surface:** PUT throws → UI rolls back to prior toggle state + surfaces
error via tooltip-only on the toggle element.

**Severity:** LOW. Daemon-side autopilot persistence (which COULD fail)
doesn't exist; only sync fs writes can fail (disk-full, permissions).
Best-effort store swallows errors per file header → PUT may "succeed"
even when the disk write didn't land. v3.1 polish followup mirrors
MB-F-T16-OPTIMISTIC-ROLLBACK-OBSERVABILITY.

**Tentative disposition: ACCEPT for v3.0** — file followup at WB5 for
v3.1 prominent error indicator.

### R-MBT17-4: Slot wrapper testid preservation

**Surface:** existing tile-grid-tile probe-01..05 tests assert
`data-testid="tile-autopilot-slot-{name}"` + `data-slot="autopilot"`
on the slot wrapper.

**Severity:** ZERO when render-prop pattern is followed (preserves
both attributes by construction). If toggle child accidentally
overrides the wrapper, tests fail loudly.

**Tentative disposition: PRESERVE** — pattern explicit in WB3 + WB4
implementation; verified at WB4 integration probe.

### R-MBT17-5: Frozen-zone proximity in main.ts

**Surface:** new IPC wiring in main.ts adds a sentinel block adjacent
to existing MB-T16 zone.

**Severity:** ZERO when new logic stays inside its OWN sentinel.

**Tentative disposition: SEPARATE SENTINEL** (Q-MBT17-10=a) — no
existing zone touched.

### R-MBT17-6: TS dual-import drift (MB-F-DISPATCH-CORE-DUAL-IMPORT-PATTERN-DRIFT)

**Surface:** WB2 IPC controller + WB3 toggle component import types
from `dispatch-core/dist/v3/schema.js`. AutopilotLoop already imports
`PendingIntent` from there; the toggle doesn't need any dispatch-core
types directly (toggle works with `boolean`).

**Severity:** ZERO — no dispatch-core types needed in MB-T17 surfaces.

**Tentative disposition: NONE NEEDED** — IPC payloads use plain
`{ sessionName: string; enabled: boolean }`; no schema types involved.

### R-MBT17-7: tsconfig .tsx exclude pattern (MB-T11a discovery)

**Surface:** new `tile-autopilot-toggle.tsx` file requires entry in
workstation tsconfig.json `exclude` array (workstation tsconfig has no
JSX flag; .tsx files bundle via esbuild, not tsc).

**Severity:** ZERO when added at WB1 scaffold.

**Tentative disposition: ADD AT WB1** — same pattern as MB-T16 WB1
added tile-approval-picker.tsx.

### R-MBT17-8: Optimistic-rollback observability (mirrors R-MBT16-8)

**Surface:** PUT failure currently surfaces only via tooltip; operator
moving to other tiles may miss the rollback.

**Severity:** LOW. Same as MB-T16 R-MBT16-8.

**Tentative disposition: ACCEPT for v3.0** — file followup at WB5
mirroring MB-F-T16-OPTIMISTIC-ROLLBACK-OBSERVABILITY.

---

## IV. Proposed ladder (5 WBs)

| WB | Type | Scope |
|---|---|---|
| WB1 | red | Scaffold: empty `autopilot-ipc.ts` (file shell), empty `tile-autopilot-toggle.tsx` (file shell), tsconfig .tsx exclude entry, decisions doc capturing Q-MBT17-1..13 dispositions, stub probe directories with placeholder tests. |
| WB2 | green | `autopilot-ipc.ts` impl: `AutopilotIpcController` class with `registerHandlers(ipcMain)`, `createDefaultAutopilotIpcController()` factory, channel `workstation:autopilot-{get,put}` handlers calling `new AutopilotLoop().setEnabled` / `.isEnabled`. Preload extension adding 2 bridge methods. Unit tests in `test/unit/autopilot-ipc/probe-01-spec-table.spec.ts`. |
| WB3 | green | `tile-autopilot-toggle.tsx` impl: native `<input type="checkbox" role="switch">` with state machine (loading | ready | unavailable), useEffect mount fetch, optimistic+rollback onChange, exports `TileAutopilotToggleBridge` interface. Tests in `test/unit/tile-autopilot-toggle/probe-01-render-tests.spec.tsx`. |
| WB4 | green | Integration: Tile.tsx adds `renderAutopilotSlot?` prop, TileGrid plumbs through, TileGridApp constructs `autopilotBridge: TileAutopilotToggleBridge \| null` adapter + `renderAutopilotSlot` closure, main.ts adds sentinel block + wires `createDefaultAutopilotIpcController().registerHandlers(ipcMain)` + `AUTOPILOT_IPC_MOUNTED` test-hook stdout sentinel. Closes `MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION`. New tests: `tile-grid-tile/probe-07-autopilot-slot-integration.spec.tsx` (7 tests) + `tile-grid-app/probe-05-autopilot-bridge-adapter.spec.tsx` (6 tests). |
| WB5 | docs | Findings doc + 3 v3.1 polish followups (cache, retry, observability). |

**Estimated total tests: ~50** (26 IPC + 16 toggle + 7 + 6 integration).
**Estimated commits: 5 + 1 docs (Phase 1 diagnose).**

## V. Out-of-scope confirmations

Per operator brief, these are explicitly OUT OF SCOPE for MB-T17:

- **Token meter wiring** — owned by `MB-F-T15-AUTOPILOT-TOKEN-INTEGRATION`.
- **Footer chrome** — MB-T18.
- **Hero / squad layout** — MB-T19.
- **Color-class helpers** — toggle is binary state; no helper module
  needed (deviates from MB-T15 `color-helpers.ts`).
- **Daemon-side persistence** — autopilot is workstation-side only.
- **Multi-window sync of toggle state** — defer to v3.1 (mirror MB-T16
  open question §VII-3).
- **Background loop start/stop** — autopilot is a flag, not a process
  (Q-MBT17-12=a).

## VI. References

- MB-T16 ladder precedent: `docs/coordination/mb-t16-decisions-2026-05-07.md`
  + `docs/coordination/mb-t16-findings-2026-05-07.md`
- MB-T11 ladder source: `git log --grep="MB-T11"` (commits `38e009a`,
  `912ad3c`, `df47e94`, `012145c`, `69d7d29`)
- autopilot-state-store source: `packages/dispatch-workstation/src/main/
  autopilot-state-store.ts`
- autopilot-loop source: `packages/dispatch-workstation/src/main/
  autopilot-loop.ts`
- Tile slot baseline: `packages/dispatch-workstation/src/tile-grid/
  tile.tsx:165-168`
- Chartered followup: `docs/FOLLOWUPS.md:173`
  (`MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION`)
- CLAUDE.md sections governing: §2.5 halt, §3.3 sentinel, §3.6 test
  layout, §4.1 WB ladder, §4.2 HALT gates.

---

**HALT 0 — Phase 1 complete.** Awaiting operator review of Q-MBT17-1..13
+ R-MBT17-1..8 tentative dispositions before Phase 2 WB1.

When proceeding, operator says either:
- **"proceed with tentative dispositions, begin Phase 2 WB1"** —
  unanimous accept, WB1 starts.
- **"adjust Q-MBT17-N to (b/c)"** — disposition flip for specific
  questions before Phase 2.
