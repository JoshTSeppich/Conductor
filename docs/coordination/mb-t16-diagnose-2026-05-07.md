# MB-T16 Phase 1 — Diagnose / Surface Inventory

**Ticket:** MB-T16 — Tile-header approval-policy picker
**Spec source-of-truth:** `MB-F-T13-TILE-HEADER-PICKER-INTEGRATION` row in
`docs/FOLLOWUPS.md:160` — operator confirmed scope-via-option-(a)
2026-05-07.
**Integration baseline:** MB-T15 architecture
(`docs/coordination/mb-t15-findings-2026-05-07.md`) +
`docs/coordination/mb-t12-architecture-flow.md`.
**Phase:** Phase 1 only — surface read + arbitration questions. NO
production edits, NO implementation commits, NO tests run.

Confidence labels appended per CLAUDE.md §2.2: `[KNOWN]`, `[MODELED]`,
`[SPECULATIVE]`.

---

## Source-of-truth note

Operator confirmed (2026-05-07): proceed with the chartered followup
`MB-F-T13-TILE-HEADER-PICKER-INTEGRATION` (option (a)) as the
canonical scope rather than the operator-side
`wireframe-tickets-inventory.md §3 MB-T16 entry`. The followup row
(filed at sess-mbt13 WB11, FOLLOWUPS.md:160) is verbatim:

> Implementation sketch: tile-header component reads policy via
> `GET /v3/sessions/:name/approval-policy` (already shipped at WB5),
> renders dropdown with three options (tight/medium/loose), fires
> `PUT /v3/sessions/:name/approval-policy` (already shipped at WB5)
> on change. No daemon-side work; pure UI integration with already-
> shipped routes.

If the operator inventory turns out to have richer/different scope
than this followup, the inventory takes precedence and Phase 1 / 2
revises.

---

## I. Surface inventory (anti-fabrication, file:line + responsibility)

### A — ApprovalPolicy schema (frozen at sess-mbt13)

`packages/dispatch-core/src/v3/schema.ts:992-993` [KNOWN]
```ts
export const ApprovalPolicyEnum = z.enum(['tight', 'medium', 'loose']);
export type ApprovalPolicy = z.infer<typeof ApprovalPolicyEnum>;
```
- 3 dropdown options. Strictly enumerated.

`packages/dispatch-core/src/v3/schema.ts:1040-1047` [KNOWN] —
`ApprovalPolicyGetResponseSchema`:
```ts
{
  session_name: string,        // min 1
  approval_policy: 'tight'|'medium'|'loose',
  updated_at: string|null,     // ISO datetime; null when no row exists
}
```
- `updated_at: null` is the daemon's "no row in session_policies" sentinel
  (Q-MBT13-4=c) — `approval_policy: 'medium'` is the structural default.
- Strict schema; extra fields rejected.

`packages/dispatch-core/src/v3/schema.ts:1054-1059` [KNOWN] —
`ApprovalPolicyPutRequestSchema`:
```ts
{ approval_policy: 'tight'|'medium'|'loose' }
```
- The PUT body is just the policy enum value. Server-side upsert
  assigns `updated_at` from `datetime('now')` (line 107 of the route).

### B — Daemon routes (sess-mbt13 WB5, shipped)

`packages/dispatch-daemon/src/routes/v3/sessions/approval-policy.ts:68-92` [KNOWN]
- `GET /v3/sessions/:name/approval-policy`
  - 200 OK with full GetResponse body
  - 400 on missing session name (route-param empty string)
  - No-row default: `{session_name, approval_policy: 'medium', updated_at: null}`
- `PUT /v3/sessions/:name/approval-policy`
  - 200 OK with the new GetResponse body (with non-null updated_at)
  - 400 on missing session name
  - 422 on invalid body shape (Zod parse failure)
  - INSERT OR REPLACE upsert into session_policies SQLite table

### C — Workstation existing approval-policy infrastructure

`packages/dispatch-workstation/src/main/approval-policy-resolver-shim.ts:96-122` [KNOWN] — `fetchSessionApprovalPolicy`:
- Already does GET `/v3/sessions/:name/approval-policy` with
  `X-Conductor-Token` header.
- Returns just `ApprovalPolicy` (one of 3 enum values), NOT the full
  GetResponse.
- Falls back to `'tight'` on any error (no token / non-200 / network /
  bad shape) — graceful-degraded for the resolver use case.
- Used by `orchestrator-action-handler` via `resolveApprovalShim`.
- **Reuse decision:** the shim's degraded-to-tight fallback is wrong
  for the picker UI (operator sees tight when daemon is unreachable;
  misleading). MB-T16 needs a SEPARATE fetch with full GetResponse
  shape + explicit error states so the picker can render a sensible
  error UI (Q-MBT16-2 below).

`packages/dispatch-workstation/src/main/preload.mts` [KNOWN]
- Currently exposes: `openRepoDialog, requestSpawn, onSpawnResult,
  sendPromptToSession, killSession, fetchAuditModal, detachTile,
  onTileDetachClosed`.
- NO approval-policy methods. MB-T16 adds 2: `getSessionApprovalPolicy`,
  `putSessionApprovalPolicy`.

### D — Existing IPC pattern (audit-modal-ipc + session-kill-ipc)

`packages/dispatch-workstation/src/main/audit-modal-ipc.ts` [KNOWN] —
pattern reference:
- Module-level: `DAEMON_URL = process.env['FOXWORKS_DAEMON_URL'] ?? 'http://localhost:7878'`
- `readDaemonToken()` reads `~/.foxworks-dispatch/token` via fs.
- Top-level `fetchSwarmAuditViaFetch(baseUrl, token, limit, fetchImpl)` — pure-fn HTTP helper, exported for test injection.
- `registerAuditModalIpcHandlers(ipcMain)` wires `ipcMain.handle('workstation:audit-modal-fetch', ...)`.
- main.ts calls `registerAuditModalIpcHandlers(ipcMain)` once at startup.

`packages/dispatch-workstation/src/main/session-kill-ipc.ts` [KNOWN] —
similar pattern. PUT/POST instead of GET; takes a payload arg.

**MB-T16 mirrors this pattern**: NEW `approval-policy-ipc.ts` with
GET + PUT helpers (or one combined controller with two methods), each
exported with fetchImpl test seam.

### E — Tile-header picker slot (post-MB-T15 WB4)

`packages/dispatch-workstation/src/tile-grid/tile.tsx:150` [KNOWN] —
the existing slot:
```jsx
<div data-slot="picker" data-testid={`tile-picker-slot-${sessionName}`} />
```
- Empty in v3.0; placeholder for MB-T16.
- Sibling of `<TileHeader>` (NOT inside TileHeader).
- `data-slot="picker"` attribute survives backward-compat per Q-MBT12-7=a.

`packages/dispatch-workstation/test/unit/tile-grid-tile/probe-01-tile-skeleton-and-handlers.spec.tsx:59,67` [KNOWN] — existing
test references:
- `screen.getByTestId('tile-picker-slot-gamma')` — must remain in DOM
- `getByTestId('tile-picker-slot-delta').getAttribute('data-slot')` ===
  `'picker'` — attribute must remain
- **Implication:** MB-T16 must preserve the wrapper `<div data-slot="picker"
  data-testid="tile-picker-slot-{name}">` AND mount the picker INSIDE
  it, not in place of it.

### F — TileGridSessionEntry shape (post-MB-T15 WB4)

`packages/dispatch-workstation/src/tile-grid/tile-grid.tsx:25-39` [KNOWN]
- 8 fields: `name, status?, collapsed?, branchName?, repoName?, model?,
  tokensUsed?, tokenBudget?`.
- **NO `approvalPolicy` field.** MB-T16 doesn't need to add one — the
  picker fetches policy directly via IPC keyed by session name. Per-
  session policy is daemon-authoritative, not parent-managed.

### G — TileGridApp WorkstationBridgeShape (post-MB-T11b)

`packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx:28-38` [KNOWN] —
current shape:
```ts
interface WorkstationBridgeShape {
  onSpawnResult: (cb) => () => void;            // required
  detachTile?: (sessionName) => Promise<{ok}>;  // optional (WB11b)
  onTileDetachClosed?: (cb) => () => void;      // optional (WB11b)
}
```
- **MB-T16 extends with 2 OPTIONAL methods** (mirrors WB11b pattern):
  ```ts
  getSessionApprovalPolicy?: (sessionName) => Promise<ApprovalPolicyGetResponse>
  putSessionApprovalPolicy?: (sessionName, policy) => Promise<ApprovalPolicyGetResponse>
  ```
- Optional so non-Electron / test environments degrade gracefully.

### H — Slot population mechanism (Q-MBT16-4 below)

Three approaches:
- **(a)** Render-prop on Tile: `renderPickerSlot?: (sessionName) => ReactNode`.
  TileGridApp creates the renderer once (with bridge captured in
  closure) and passes to TileGrid → Tile. Tile renders inside the
  existing `data-slot="picker"` wrapper div.
- (b) DOM-query + portal: TileGridApp finds `[data-slot="picker"]` divs
  and mounts pickers via React portal. Decoupled but imperative.
- (c) Component prop: Tile gets `pickerNode?: ReactNode`. Less flexible
  for per-session keying than (a).

[MODELED] **Tentative: (a) render-prop.** Aligns with the existing
slot wrapper preservation requirement (§E above): Tile keeps rendering
the wrapper div with the legacy testid + data-slot attribute; calls
`renderPickerSlot(sessionName)` inside (or null when undefined).

### I — Frozen-zone proximity check

Per CLAUDE.md §2.10 + §3.4 + the operator brief's frozen-contract list:
- `dispatch-core/src/v3/schema.ts` — ApprovalPolicy schemas already
  shipped at sess-mbt13; no schema work needed. **NOT touched by MB-T16.**
- `WORKSTATION_CONTRACT.md` — daemon-facing IPC; the new `workstation:
  approval-policy-*` channels are workstation-internal (renderer↔main),
  same class as `tile:detach` from MB-T11b. **NOT touched.**
- `CONDUCTOR_API_CONTRACT.md` — daemon HTTP routes already in §X
  (sess-mbt13). **NOT touched.**
- `REGISTRY.md`, Sherpa Pass, Engine, mechanism interfaces — unrelated.
  **NOT touched.**

[KNOWN] No `=== BEGIN: ... ===` sentinel zones in the files MB-T16
would touch. The `=== BEGIN: MB-T12 tile-grid mount ===` block in
main.ts will gain a NEW sibling block `=== BEGIN: MB-T16 approval-
policy IPC ===` per R-MBT12-6 discipline.

---

## II. Dependency map

```
┌──────────────────────────────────────────────────────────────────┐
│  TileGridApp (MB-T9, MB-T11b extensions, post-MB-T15 WB4)        │
│  ├─ workstationBridge: WorkstationBridgeShape                    │
│  │   MB-T16 ADDS 2 OPTIONAL methods:                             │
│  │     getSessionApprovalPolicy?(sessionName)                    │
│  │     putSessionApprovalPolicy?(sessionName, policy)            │
│  ├─ MB-T16: constructs renderPickerSlot fn closing over bridge   │
│  └─ feeds → TileGrid                                             │
└──────────────────┬───────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────────┐
│  TileGrid (MB-T6)                                                │
│  └─ MB-T16: passes renderPickerSlot through to <Tile>            │
└──────────────────┬───────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────────┐
│  Tile (MB-T5 + MB-T15 WB4)                                       │
│  └─ MB-T16: renders picker INSIDE existing slot wrapper:         │
│       <div data-slot="picker" data-testid="tile-picker-slot-X">  │
│         {renderPickerSlot ? renderPickerSlot(sessionName) : null}│
│       </div>                                                     │
└──────────────────────────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────────┐
│  TileApprovalPicker (NEW MB-T16)                                 │
│  ├─ Props: sessionName, workstationBridge                        │
│  ├─ State: currentPolicy, loading, error                         │
│  ├─ useEffect: fetch initial policy on mount                     │
│  ├─ Render: <select> with 3 options (tight/medium/loose)         │
│  └─ onChange: optimistic update + PUT, rollback on error         │
└──────────────────────────────────────────────────────────────────┘
                   ↕ workstationBridge (preload contextBridge)
┌──────────────────────────────────────────────────────────────────┐
│  Main process                                                    │
│  └─ ApprovalPolicyIpcController (NEW MB-T16)                     │
│      ├─ workstation:approval-policy-get ipcMain.handle           │
│      ├─ workstation:approval-policy-put ipcMain.handle           │
│      └─ HTTP fetch via DAEMON_URL + readDaemonToken()            │
└──────────────────────────────────────────────────────────────────┘
                   ↕ HTTP
┌──────────────────────────────────────────────────────────────────┐
│  Daemon routes/v3/sessions/approval-policy.ts (sess-mbt13 WB5)   │
│  ├─ GET /v3/sessions/:name/approval-policy                       │
│  └─ PUT /v3/sessions/:name/approval-policy                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## III. Territory boundaries (Phase 2 likely files)

**a. New files (Phase 2):**
- `packages/dispatch-workstation/src/main/approval-policy-ipc.ts` —
  main-process IPC controller; mirrors `audit-modal-ipc.ts` /
  `session-kill-ipc.ts` pattern (DI-injectable fetchImpl + HTTP helper +
  `registerHandlers(ipcMain)`).
- `packages/dispatch-workstation/src/tile-grid/tile-approval-picker.tsx` —
  React dropdown component (per Q-MBT16-1 native `<select>`).
- `packages/dispatch-workstation/test/unit/approval-policy-ipc/probe-01-*.spec.ts` —
  unit tests for ipc controller + fetchSessionApprovalPolicy /
  putSessionApprovalPolicy helpers.
- `packages/dispatch-workstation/test/unit/tile-approval-picker/probe-01-*.spec.tsx` —
  render + onChange + error-state tests.
- `packages/dispatch-workstation/test/unit/tile-grid-tile/probe-06-*.spec.tsx`
  (or extend probe-05) — integration test for renderPickerSlot
  prop and slot-wrapper preservation.

**b. Modified files (Phase 2):**
- `packages/dispatch-workstation/src/main/preload.mts` — add 2 methods
  to workstationBridge: `getSessionApprovalPolicy(sessionName)`,
  `putSessionApprovalPolicy(sessionName, policy)`.
- `packages/dispatch-workstation/src/main/main.ts` — wrap a NEW
  sentinel block `=== BEGIN: MB-T16 approval-policy IPC ===`
  registering the controller; mirrors the
  `=== BEGIN: MB-T12 tile-grid mount ===` pattern.
- `packages/dispatch-workstation/src/tile-grid/tile.tsx` —
  add `renderPickerSlot?: (sessionName: string) => ReactNode` prop;
  invoke inside the existing slot wrapper div.
- `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` — accept
  + plumb renderPickerSlot prop.
- `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx` —
  extend WorkstationBridgeShape with 2 optional methods; construct
  `renderPickerSlot` function inside; pass to TileGrid.
- `packages/dispatch-workstation/tsconfig.json` — add
  `src/tile-grid/tile-approval-picker.tsx` to the exclude list (per
  WB11a discovery).
- `docs/FOLLOWUPS.md` — close `MB-F-T13-TILE-HEADER-PICKER-INTEGRATION`
  row at MB-T16 WB5 ("CLOSED by MB-T16 WB4 (2026-05-07)").

**c. NOT touched (frozen / out-of-scope):**
- `packages/dispatch-core/src/v3/schema.ts` — schemas shipped at
  sess-mbt13.
- `packages/dispatch-daemon/**` — routes shipped at sess-mbt13 WB5.
- `packages/dispatch-workstation/src/main/approval-policy-resolver-shim.ts` —
  used by orchestrator-action-handler; orthogonal to picker. NOT
  touched.
- Frozen contracts (REGISTRY.md, CONDUCTOR_API_CONTRACT.md,
  WORKSTATION_CONTRACT.md, schema files): NOT touched.

---

## IV. Q-MBT16-N arbitration questions

### Q-MBT16-1 — Picker UI element

**Options:**
- **(a)** Native `<select>` element with 3 `<option>` values. Browser-
  rendered dropdown; accessible by default. **(Recommended)**
- (b) Custom button-with-popover dropdown (e.g., a div opens a list).
  More design control; ~50 LoC more; needs a11y (keyboard nav, escape,
  click-outside).

**Tentative:** **(a)** native `<select>`. v3.1 polish if operator
wants design refinement.

### Q-MBT16-2 — Error state UX

The picker fetches policy on mount; the daemon could be unreachable,
return non-200, or return an unexpected shape. What does the picker
show?

**Options:**
- **(a)** `<select>` is disabled; tooltip says "policy unavailable —
  retry in app restart". `<option>` shows last-known value or
  'medium' default. **(Recommended)**
- (b) Show stale value + a small "retry" affordance.
- (c) Hide the picker entirely on error (operator can't see it failed).

**Tentative:** **(a)** disabled with tooltip. Simple; operator-visible.

### Q-MBT16-3 — Optimistic UI on policy change

When the operator changes the dropdown value, the picker fires PUT.
What does the UI do during the in-flight PUT?

**Options:**
- **(a)** Optimistic update — immediately show the new value; rollback
  on PUT error (with toast / banner / silent revert?). **(Recommended;
  simpler revert: revert silently + show error tooltip)**
- (b) Disabled while in-flight; update on PUT success. Slightly safer
  but feels laggy.

**Tentative:** **(a)** optimistic; rollback silently + tooltip on error.

### Q-MBT16-4 — Slot population mechanism

[Repeated from §I-H above for reader convenience.]

**Tentative:** **(a)** render-prop on Tile (`renderPickerSlot?:
(sessionName) => ReactNode`). TileGridApp captures the bridge in a
closure and passes the renderer down through TileGrid to Tile.

### Q-MBT16-5 — Component file location

**Options:**
- **(a)** New file `src/tile-grid/tile-approval-picker.tsx`. **(Recommended)**
- (b) Inline in `tile.tsx` (less file proliferation; tighter coupling).

**Tentative:** **(a)** separate file. Single-purpose; testable in
isolation; mirrors `tile-header.tsx` from MB-T15.

### Q-MBT16-6 — WorkstationBridgeShape extension shape

**Options:**
- **(a)** Optional methods (mirror WB11b detachTile pattern):
  `getSessionApprovalPolicy?` + `putSessionApprovalPolicy?`.
  Graceful degradation in tests / non-Electron. **(Recommended)**
- (b) Required methods. Clearer contract but breaks all existing
  tile-grid-app tests that don't mock these.

**Tentative:** **(a)** optional. Existing 29 tile-grid-app tests stay
GREEN.

### Q-MBT16-7 — Caching policy reads across multiple tiles

If 4 tiles render simultaneously, each fetches its own policy on
mount → 4 daemon calls. Should there be a shared cache?

**Options:**
- **(a)** No cache for v3.0; per-tile fetch on mount. 4 daemon calls
  for 4 tiles is acceptable (small payload, low cost). **(Recommended
  for ship-minimum)**
- (b) Workstation-level cache keyed by sessionName; invalidated on
  PUT. ~30 LoC + cache-invalidation tests.

**Tentative:** **(a)** no cache; v3.1 follow-up if operator surfaces
performance concern.

### Q-MBT16-8 — Default value when daemon returns no-row

The daemon returns `{approval_policy: 'medium', updated_at: null}`
when no row exists. Should the picker:

**Options:**
- **(a)** Show 'medium' as if the operator chose it (consistent with
  daemon's authoritative answer). **(Recommended)**
- (b) Show a "not set" sentinel or different visual styling.

**Tentative:** **(a)** show 'medium'. The Q-MBT13-4=c daemon contract
makes 'medium' the authoritative no-row default; the picker defers to
the daemon.

---

## V. R-MBT16-N risks

### R-MBT16-1 — Per-tile fetch on mount could spam daemon

[KNOWN] 4 tiles → 4 GET calls to /v3/sessions/:name/approval-policy on
mount. Per Q-MBT16-7=a, no cache for v3.0. Mitigation: GET payload is
~80 bytes; the daemon SQLite SELECT is indexed on session_name + does
no I/O beyond the row. Performance is fine for ≤8 tiles (the v3.0
spec cap). v3.1 follow-up files if needed.

### R-MBT16-2 — PUT race conditions

[MODELED] Operator changes policy in two windows (or orchestrator +
operator simultaneously). Daemon's `INSERT OR REPLACE` upsert handles
this; last-write-wins is operator-acceptable for v3.0 single-user
single-workstation. No mitigation needed.

### R-MBT16-3 — TileApprovalPicker bridge stub in tests

[KNOWN] TileGridApp's `WorkstationBridgeShape` extension makes the new
methods OPTIONAL. Test fixtures must provide stubs OR the picker must
gracefully degrade when methods are undefined. Per Q-MBT16-2=a (disabled
state), no-bridge behavior = disabled select with tooltip. Same
graceful-degrade as WB11b.

### R-MBT16-4 — Existing `tile-picker-slot-{name}` testid + data-slot
contract

[KNOWN] probe-01 tile-grid-tile asserts the picker slot wrapper
remains in DOM with `data-slot="picker"`. MB-T16 mounts the picker
INSIDE the wrapper (per §I-E + §I-H decisions). Existing tests pass
unchanged.

### R-MBT16-5 — approval-policy-resolver-shim drift

[SPECULATIVE] The shim `fetchSessionApprovalPolicy` (used by
orchestrator-action-handler) and the new MB-T16 `getSessionApproval
Policy` IPC handler both call GET /v3/sessions/:name/approval-policy.
Two parallel call sites; if the daemon route changes (unlikely; it's
sess-mbt13-shipped), both must update. Mitigation: factor out a shared
HTTP helper if/when MB-F-T11-T13-RESOLVER-CALL-SITE-REWRITE
(FOLLOWUPS.md:170) lands. For MB-T16 ship-minimum, the duplication is
acceptable (~10 LoC each).

### R-MBT16-6 — Frozen-zone proximity

[KNOWN] No frozen-zone touches per §I-I. Schema is fixed (sess-mbt13);
daemon routes are fixed; workstation-internal IPC channels are not
contract-frozen. R-MBT16-6 is RESOLVED.

### R-MBT16-7 — Sentinel-zone discipline (main.ts)

[KNOWN] main.ts has multiple sentinel-marked zones (Fix-A, Fix-C,
Fix-92, Probe-92×3, Fix-B, KANBAN_EVAL, SHELL_EVAL, Fix-89, MB-T12
tile-grid mount). MB-T16 adds a NEW sentinel block
`=== BEGIN: MB-T16 approval-policy IPC ===` adjacent to (NOT inside)
existing zones. Same R-MBT12-6 discipline.

### R-MBT16-8 — Optimistic UI rollback semantics

[MODELED] Per Q-MBT16-3=a optimistic update + silent rollback on
error. If the PUT succeeds in the daemon but the response times out
on the client side, the picker rolls back to the old value but the
daemon has the new value — silent inconsistency. Mitigation: Q-MBT16-3
spec says "rollback silently + tooltip on error"; the tooltip surfaces
the failure. v3.1 follow-up: an explicit "policy may have changed —
refresh tile" affordance.

---

## VI. Phase 2 ladder (DRAFT — operator may revise after Phase 1 review)

5 WBs single-session.

- **WB1 (red)** — scaffold approval-policy-ipc + tile-approval-picker
  stubs + decisions doc + test files. Mirrors MB-T15 WB1 pattern (stub
  throws-with-deferral; module-load tests).
  Commit: `red(MB-T16): WB1 — scaffold approval-policy-ipc + tile-approval-picker + decisions doc`.
- **WB2 (green)** — `approval-policy-ipc.ts` main-process module
  (fetchSessionApprovalPolicy + putSessionApprovalPolicy helpers +
  ApprovalPolicyIpcController + registerHandlers) + unit tests +
  preload.mts extension. Mirrors audit-modal-ipc.ts.
  Commit: `green(MB-T16): WB2 — approval-policy-ipc + preload + unit tests`.
- **WB3 (green)** — `tile-approval-picker.tsx` component + render
  tests + onChange tests + error-state tests. Mirrors MB-T15 WB3.
  Commit: `green(MB-T16): WB3 — tile-approval-picker + render tests`.
- **WB4 (green)** — Tile.tsx renderPickerSlot prop + TileGrid
  plumb-through + TileGridApp wires + main.ts integration sentinel
  block + integration tests + close MB-F-T13-TILE-HEADER-PICKER-
  INTEGRATION row.
  Commit: `green(MB-T16): WB4 — slot integration + main.ts wire + closes MB-F-T13-TILE-HEADER-PICKER-INTEGRATION`.
- **WB5 (docs)** — findings doc + followups.
  Commit: `docs(MB-T16): WB5 — findings doc + followups`.

Per-commit-push throughout (per CLAUDE.md §2.6 + MB-T12 WB14 closure
lesson). Default mode: status surface every 2-3 WBs.

---

## VII. Open items for operator Phase 1 review

8 Q-MBT16 dispositions + 8 R-MBT16 risks above. Tentative
recommendations:

1. Q-MBT16-1 — native `<select>`
2. Q-MBT16-2 — disabled with tooltip on error
3. Q-MBT16-3 — optimistic update + silent rollback + tooltip on error
4. Q-MBT16-4 — render-prop on Tile (`renderPickerSlot?`)
5. Q-MBT16-5 — separate file `tile-approval-picker.tsx`
6. Q-MBT16-6 — optional methods on WorkstationBridgeShape (mirrors WB11b)
7. Q-MBT16-7 — no cache for v3.0; per-tile fetch on mount
8. Q-MBT16-8 — show 'medium' on no-row default (deferred to daemon)

Operator-visible UX choices that may want explicit confirmation:
- `<select>` styling — does it inherit dark theme automatically? May
  need inline-style overrides (Q-MBT15-4 pattern). Filed as open at
  WB3 if it surfaces.
- Tooltip format on error — text content? "Policy unavailable" vs
  "Daemon unreachable" vs "Last sync failed".

---

## VIII. End

Awaiting operator Phase 1 review. Standing by with no production
action. Next step on review: capture dispositions in
`docs/coordination/mb-t16-decisions-2026-05-07.md` and begin Phase 2
WB1.
