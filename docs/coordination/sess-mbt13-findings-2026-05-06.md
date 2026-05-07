# Session MB-T13 — Findings (append-only)

**Branch:** `sess-mbt13/per-session-approval-policy-and-audit`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-mbt13`
**Cut from:** `main` HEAD `8d61104` (post-sess-mbt10 + Tier-E Phase-C parallel-cairn entry)
**Date opened:** 2026-05-06

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the parallel-batch sess-mbt13 slot. Numbers below
are working entries; operator may renumber on merge.

---

## Finding #sess-mbt13-1 — MB-T13 — Per-session approval policy + audit table

**Date filed:** 2026-05-06
**Tier:** 3 — feature ticket. Implements `CONDUCTOR_V3_RESCOPE.md §3.2 + §3.8 + §4 lines 223-231`.

**Origin:** Phase 2 brief MB-T13 (per-session approval policy +
orchestrator swarm-audit). Phase 1 diagnose at `/tmp/mb-t13-diagnose.md`
surfaced Q-MBT13-{1..13} for HALT 0; operator landed all thirteen
(plus a territory amendment + WB5 routing note + WB10 integration test
note) ahead of WB1.

**Discovered by:** Session MB-T13 (this batch) Phase 1 diagnose +
Phase 2 implementation. Builds on COARCH-T01's SQLite layer + sess-mbt09
IPC pattern + sess-mbt10 schema-section parallel-cairn convention.

**Resolution status:** SHIPPED on `sess-mbt13/per-session-approval-
policy-and-audit`. Ladder commits (chronological):

- WB1 `a225411` — schema: §13 — `ApprovalPolicyEnum` +
  `ApprovalActionTypeEnum` + `ApprovalPolicyRowSchema` +
  `ApprovalPolicyGetResponseSchema` + `ApprovalPolicyPutRequestSchema` +
  `OrchestratorSwarmAuditRowSchema` + `OrchestratorSwarmAuditWriteRequestSchema`
  + `OrchestratorSwarmAuditQueryResponseSchema` (8 schemas + 8 type
  exports under §13).
- WB2 `c0edb88` — red: 6 RED probe files / 7 RED tests for
  migration 0003 (table existence, indexes, defaults, CHECK
  constraints, idempotent re-run).
- WB3 `daad6d4` — green: migration `0003-approval-policy-and-swarm-
  audit.sql` ships; 6 RED probes flip GREEN.
- WB4 `112e679` — green: daemon `POST + GET /v3/audit/swarm-audit`
  route + 8 probe files / 12 tests + brief-gap closure adding
  `OrchestratorSwarmAuditQuerySchema` to §13.
- WB5 `f29811a` — green: daemon `GET + PUT /v3/sessions/:name/approval-
  policy` route (under new `routes/v3/sessions/` subdir per WB5 routing
  note) + 5 probe files / 7 tests.
- WB6 `170c689` — green: workstation `approval-policy-resolver.ts`
  pure fn + 4 test files / 34 tests covering §3.2 matrix.
- WB7 `0594757` — green: workstation `audit-modal-ipc.ts` controller
  + production fetch helper + IPC handler + preload bridge + 4 test
  files / 10 tests.
- WB8 `19cc984` — green: workstation View → Show recent orchestrator
  actions menu item + `src/audit-modal/*` React renderer +
  `scripts/build-audit-modal.mjs` + build-pipeline chain edit + 3
  test files / 8 tests + runtime-relaunch smoke (WINDOW_READY ✓).
- WB9 `7107150` — green: audit-write end-to-end integration test
  (5 varying-actionType POSTs → 5 rows / 1 file / 3 tests).
- WB10 `41119a6` — green: approval-policy semantic integration test
  via resolver-direct harness (1 file / 5 tests; cross-package
  relative-path import of dispatch-daemon's spawnTestServer fixture).
- WB11 (this commit) — docs: finding entry + 7 followups filed.

### Surface change (KNOWN — direct file diff `8d61104..HEAD`)

| | Before (HEAD `8d61104`) | After (HEAD post-WB11) |
|---|---|---|
| `dispatch-core/src/v3/schema.ts` | through §11 (Tier 4 spawned-session context) | + §13: 8 new schemas + type exports (approval-policy enum + action-type enum + row + Get/Put + audit-row + write-request + query-request + query-response) |
| `dispatch-daemon/migrations/0003-approval-policy-and-swarm-audit.sql` | did not exist | new SQL migration (147 lines): `session_policies` (3 columns + PK + DEFAULT 'medium' + CHECK) + `orchestrator_swarm_audit` (12 columns + CHECK on enum fields) + 2 indexes |
| `dispatch-daemon/src/lifecycle/startup.ts` | did not register MB-T13 routes | imports + registers `registerSwarmAuditRoutes` (after orchestrator-audit) + `registerApprovalPolicyRoutes` (after swarm-audit) |
| `dispatch-daemon/src/routes/v3/audit/swarm-audit.ts` | did not exist | new route handler (156 lines): POST validates via `OrchestratorSwarmAuditWriteRequestSchema`, INSERTs with UUIDv7 id, returns 201; GET validates query via `OrchestratorSwarmAuditQuerySchema`, SELECTs ORDER BY ts DESC LIMIT N (Math.min clamp at 100 per Q-MBT13-9=a) |
| `dispatch-daemon/src/routes/v3/sessions/approval-policy.ts` | did not exist | new route handler (116 lines): GET returns row OR `{policy: 'medium', updated_at: null}` structural default per Q-MBT13-4=c; PUT validates via `ApprovalPolicyPutRequestSchema`, INSERT OR REPLACE with server-generated ISO-8601 `updated_at` |
| `dispatch-workstation/src/main/approval-policy-resolver.ts` | did not exist | new pure fn (192 lines): `resolveApproval({policy, actionType, predicates}) → {approvalRequired, reason}` per §3.2 verbatim semantics; tight = always required; medium = action-type triggers (spawn/kill always; pull never) + predicate triggers (multi-step/willCommit/willTouchContract on send/assign-task); loose = only willCommit/willTouchContract |
| `dispatch-workstation/src/main/audit-modal-ipc.ts` | did not exist | new IPC handler (173 lines): controller class + dep-injected `fetchSwarmAudit` seam + production helper that GETs `/v3/audit/swarm-audit?limit=100` with `X-Conductor-Token`; result type uses LOCAL discriminated union (NOT WorkstationError — §8 is sess-mbt13-out-of-territory) capturing `daemon-unreachable` / `parse-failure` |
| `dispatch-workstation/src/main/main.ts` | did not wire MB-T13 surfaces | + import `registerAuditModalIpcHandlers` + invokes it inside `app.whenReady()` block; + `AUDIT_MODAL_PATH` constant; + `openAuditModalWindow()` top-level fn (creates BrowserWindow with main preload, loads dist/audit-modal/audit-modal.html); threads `onShowAuditModal: openAuditModalWindow` through both `registerApplicationMenu` initial call and `refreshConsoleMenu` rebuild path |
| `dispatch-workstation/src/main/menu.ts` | View submenu had no MB-T13 item | + optional `onShowAuditModal?: () => void` in `ApplicationMenuOpts`; appends "Show recent orchestrator actions" item under View submenu when callback provided (preserves test-isolated unit specs that pass no callback) |
| `dispatch-workstation/src/main/preload.mts` | `workstationBridge` had no audit method | + `fetchAuditModal: () => ipcRenderer.invoke('workstation:audit-modal-fetch')` |
| `dispatch-workstation/src/audit-modal/{audit-modal.html, audit-modal.tsx, mount.tsx}` | did not exist | new React modal renderer: dark-theme HTML with embedded styles; `AuditModal` component with loading/empty/error/success states + per-row click-to-expand JSON detail + Close button + ESC-key dismiss + dep-injected bridge prop for testability |
| `dispatch-workstation/scripts/build-audit-modal.mjs` | did not exist | new esbuild script bundling `mount.tsx` to `dist/audit-modal/renderer.js` + copying `audit-modal.html`; mirrors `build-onboarding.mjs` pattern (no separate sandboxed preload — main preload reused per WB8 minimum-scope) |
| `dispatch-workstation/package.json` | build chain ended at `build-onboarding.mjs` | + `node scripts/build-audit-modal.mjs` chained at end |
| `dispatch-workstation/tsconfig.json` | excluded onboarding/console tsx files | + excluded `src/audit-modal/audit-modal.tsx` + `src/audit-modal/mount.tsx` (matches existing JSX-via-esbuild pattern) |
| Tests | no MB-T13 tests | 32 new test files / 86 new tests across 5 dirs (migration / swarm-audit route / sessions-approval-policy route / swarm-audit-end-to-end / approval-policy-resolver / audit-modal-ipc / audit-modal-render / approval-policy-semantic) |

### Q-MBT13-{1..13} arbitration status

| Question | Decision | Where applied |
|---|---|---|
| Q-MBT13-1=a | New SQLite `session_policies` table (NOT ALTER on non-existent SQLite session table; v2 RegistrySchemaV2 frozen) | migration 0003 + WB5 route + WB7 resolver fallback |
| Q-MBT13-2=a | TEXT enum + CHECK constraint | migration 0003 `CHECK (approval_policy IN ('tight','medium','loose'))` |
| Q-MBT13-3=a | Single migration file with both tables + indexes | `0003-approval-policy-and-swarm-audit.sql` (multi-table per 0001 precedent) |
| Q-MBT13-4=c | Defense-in-depth: SQL DEFAULT 'medium' + workstation-side fallback on no-row | migration `DEFAULT 'medium'` + WB5 route returns `'medium'` + null updated_at on no-row + WB6 resolver tolerates undefined predicates |
| Q-MBT13-5=b | Two indexes: `(ts DESC)` + `(session_name, ts DESC)` | migration `idx_swarm_audit_ts` + `idx_swarm_audit_session_ts` |
| Q-MBT13-6=b | Resolver as pure fn; caller passes `(policy, actionType, predicates)` | WB6 resolver signature; sess-mbt11 will call this directly post-cross-merge |
| Q-MBT13-7=b | Async-after-fire audit-write; best-effort | WB4 route is fire-and-forget on the daemon side; sess-mbt11 audit-write timing wraps this in a single-shot retry |
| Q-MBT13-8=c | Hash explicit fields: SHA-256 of `JSON.stringify({action_type, session_name, prompt})` | WB1 schema regex `/^[a-f0-9]{64}$/` enforces 64-char hex; concrete hash-input shape is sess-mbt11 territory at the audit-writer call site |
| Q-MBT13-9=a | LIMIT 100 ORDER BY ts DESC; defer rich filter to v3.1 | WB4 route Math.min(parsed.limit, 100) clamp; WB7 IPC always sets `limit=100`; WB8 modal renders single page; followup `MB-F-T13-AUDIT-MODAL-FILTERS` filed |
| Q-MBT13-10=b | DEFER tile-header picker → followup | followup `MB-F-T13-TILE-HEADER-PICKER-INTEGRATION` filed; sess-mbt13 ships data layer + resolver + audit + IPC only; `dispatch-workstation/src/renderer/tile-header/*` removed from territory per amendment |
| Q-MBT13-11=a | DEFER settings-default → followup | followup `MB-F-T13-SETTINGS-DEFAULT-POLICY-INTEGRATION` filed; SQL DEFAULT 'medium' is the structural default until MB-T11-old/MB-T14 settings UI lands |
| Q-MBT13-12=a | Define `ApprovalActionTypeEnum` in §13; post-merge dedup followup | WB1 schema + WB6 resolver-local re-declaration; followup `MB-F-T11-T13-ACTION-TYPE-ENUM-DEDUP` filed |
| Q-MBT13-13 | Accept 11-WB ladder | shipped 11 WBs as ladder; +1 brief-gap closure mid-WB4 + +1 brief-gap closure mid-WB7 (both flagged in commit bodies + Q2 self-checks) |

### Brief-gap closures (operator-acked pattern)

Per operator's WB4+WB5 ack: "when WB execution surfaces a missing
schema/type/helper that's purely mechanical-translation within
established §13 territory and existing operator arbitrations, CC may
add it within the consuming WB's commit, BUT must flag it in
self-check Q2 + commit body as 'intra-§13 brief-gap closure.'"

Two brief-gap closures applied this session:

1. **WB4 — `OrchestratorSwarmAuditQuerySchema` added to §13** (commit
   `112e679`). WB1 schema list specified 8 schemas; the request-side
   query schema for the GET endpoint was omitted. Daemon does NOT
   direct-dep zod (only via dispatch-core), so route validation
   needed a dispatch-core Zod export. Smallest correct change: add
   23 lines to §13 (one schema + one type export) with a doc-comment
   note about the WB1/WB4 boundary.

2. **WB7 — Local result-type discriminated union for IPC reply**
   (commit `0594757`). Phase 2 brief WB7 said "Returns rows array
   or WorkstationError DaemonUnreachable", but `WorkstationErrorSchema`
   (§8) has NO `DaemonUnreachable` variant — and §8 is outside
   sess-mbt13 territory per coordination doc Rule 2 (sess-mbt13
   ALLOWED is "schema.ts §13 only"). Closed by using a local
   discriminated-union shape in `audit-modal-ipc.ts` (`AuditModalFetchResult`)
   capturing the same semantic information without forcing a §8
   amendment.

### Acceptance criteria status (per CONDUCTOR_V3_RESCOPE.md §4 lines 229)

| Acceptance clause | Status | Where verified |
|---|---|---|
| Unit tests for policy resolver (per-session policy + action-type → approval-required boolean per §3.2) | ✓ MET | WB6 — 4 test files / 34 tests across `resolver-tight`, `resolver-medium`, `resolver-loose`, `resolver-degraded-predicates` |
| Daemon migration test for new column + table | ✓ MET | WB2/WB3 — 6 test files / 7 tests covering both tables + 2 indexes + CHECK constraints + SQL DEFAULT + idempotent re-run |
| Audit-write integration test: fire 5 actions of varying types → assert 5 audit rows with correct fields | ✓ MET | WB9 — 1 test file / 3 tests with all 5 ApprovalActionType values + 12-field round-trip preservation + null nullable round-trip |
| Operator-facing approval-policy-change test: pick "tight" on a session → next orchestrator send-prompt to that session surfaces a card | ⚠ PARTIAL — pre-merge harness only | WB10 — 1 test file / 5 tests via resolver-direct harness (PUT 'tight' → GET → resolveApproval('tight', 'send', {}) → approvalRequired:true). REAL cross-session card-surfacing test (which requires sess-mbt11's action-handler to consume the resolver) lands as part of `MB-F-T11-T13-RESOLVER-STUB` closure post-cross-merge |

### Validation summary (KNOWN — full sweep at WB11)

```
pnpm --filter dispatch-core build                       PASS
pnpm --filter dispatch-workstation build                PASS (AUDIT_MODAL_BUILD_COMPLETE sentinel)
5-package typecheck (core/daemon/cli/web/workstation)   ALL CLEAN
pnpm --filter dispatch-core test                        12 files / 60 tests PASS
pnpm --filter dispatch-daemon vitest run (MB-T13 dirs)  20 files / 29 tests PASS
pnpm --filter dispatch-workstation vitest run (MB-T13 dirs) 12 files / 57 tests PASS

Runtime-relaunch smoke (WB11):
  WINDOW_READY        ✓ emitted
  ERR_MODULE_NOT_FOUND ✓ NOT FOUND (no ESM regression)
  Sentinel sequence: WINDOW_STATE 1024 768 → SPLITTER_LOADED 395 →
                     SHELL_READY → RENDER_OK → WINDOW_READY →
                     CONSOLE_TILE_GRID_MOUNTED → ONBOARDING_READY →
                     BOOTSTRAP_TOKEN_WRITTEN 44
  Cleanup: worktree-path Electron tree killed (Claude Code's own
           Electron at a different path was untouched)
```

### Cross-session coordination ledger

| Branch | HEAD | Surface | Coordination |
|---|---|---|---|
| sess-mbt11 | (parallel construction at branch `sess-mbt11/orchestrator-action-tools-and-autopilot`) | Orchestrator action tools + autopilot loop + §12 schema additions | **Forward dependency.** sess-mbt11's action-handler imports `resolveApproval` from sess-mbt13's WB6 file. Pre-merge: sess-mbt11 stubs the resolver at `approval-policy-resolver-stub.ts`. Post-cross-merge: stub replaced via `MB-F-T11-T13-RESOLVER-STUB` followup. |
| sess-mbt11 schema territory | (TBD) | §12 — extends `OrchestratorOutputSchema` discriminated union with action-tool variants | **Schema-section parallel-cairn rule** (per `MB-F-PARALLEL-CAIRN-SCHEMA-FILE-MERGE-CONFLICT`, sess-mbt10 lesson): first-merging branch lands its §; second rebases onto post-first-merge main BEFORE its own merge attempt. sess-mbt13 §13 lands AFTER sess-mbt11's §12 numerically; either branch may merge first. |
| sess-mbt11 ApprovalActionType | (TBD) | sess-mbt11's action-type enum (likely under §12) | **Parallel definition** per Q-MBT13-12=a. sess-mbt13's `ApprovalActionTypeEnum` mirrors sess-mbt11's structurally; post-cross-merge dedup via `MB-F-T11-T13-ACTION-TYPE-ENUM-DEDUP` followup. |
| sess-mbt12 | (not yet started) | Tile UI (auto-mount + tiling layout) | **Forward dependency for tile-header picker.** Q-MBT13-10=b deferred tile-header picker UI to post-MB-T12 followup `MB-F-T13-TILE-HEADER-PICKER-INTEGRATION`. The picker would invoke `PUT /v3/sessions/:name/approval-policy` (already shipped) when operator changes policy via dropdown on a tile header. |
| MB-T11-old / MB-T14 | (not yet started) | Workstation settings UI (renumber per CONDUCTOR_V3_RESCOPE.md §6 / §7 Q2) | **Forward dependency for settings-default-policy.** Q-MBT13-11=a deferred default-policy-in-settings to followup `MB-F-T13-SETTINGS-DEFAULT-POLICY-INTEGRATION`. The settings UI would surface a "Default approval policy" dropdown that the workstation reads when first PUTting policy for a newly-spawned session. |

### Followups filed (this WB)

Seven entries appended to `docs/FOLLOWUPS.md`:

1. `MB-F-T13-TILE-HEADER-PICKER-INTEGRATION` — Tier 2 (post-MB-T12)
2. `MB-F-T13-SETTINGS-DEFAULT-POLICY-INTEGRATION` — Tier 2 (post-MB-T11-old/MB-T14)
3. `MB-F-T11-T13-ACTION-TYPE-ENUM-DEDUP` — Tier 2 (post-cross-merge)
4. `MB-F-T13-AUDIT-MODAL-FILTERS` — Tier 3 (v3.1 enrichment)
5. `MB-F-T13-AUDIT-WRITE-RETRY-QUEUE` — Tier 2 (defer; risk R5)
6. `MB-F-T13-SESSION-POLICY-CLEANUP-ON-KILL` — Tier 2 (defer; Q-MBT13-1=a side-effect)
7. `MB-F-T13-AUDIT-SCHEMA-CONVERGENCE` — Tier 3 (v3.1; risk R6)

### Authority chain

- `CONDUCTOR_V3_RESCOPE.md` §3.2 (per-session approval policy
  semantics — verbatim) + §3.6 (action types) + §3.8 (audit row field
  set — verbatim) + §4 lines 223-231 (MB-T13 ticket body + acceptance
  clauses) + §5 (frozen surfaces) + §6 (renumber note for MB-T11
  settings UI / MB-T14)
- `WORKSTATION_CONTRACT.md` §8.1 (additive-only SQLite migration
  model; coexistence-without-sync rule for sessions.json + v3 SQLite)
- `dispatch-core/src/v3/schema.ts` §13 (commit `a225411` WB1 — Zod
  surface for runtime validation)
- Operator-arbitrated Q-MBT13-{1..13} 2026-05-06 (HALT 0)
- Phase 2 brief WB1-WB11 ladder + WB5 routing note + WB10 integration
  test note + territory amendment removing tile-header
- Operator-acked brief-gap-closure pattern (WB4+WB5 ack message)

### Closing summary (HALT W11)

- **11 commit SHAs in chronological order:** `a225411 → c0edb88 → daad6d4 → 112e679 → f29811a → 170c689 → 0594757 → 19cc984 → 7107150 → 41119a6 → (this commit)`
- **All Q-MBT13-{1..13} + amendments status:** documented above (all
  applied; deferrals tracked as followups)
- **All 4 acceptance clauses:** 3 fully MET, 1 PARTIAL (resolver-direct
  harness pre-merge; cross-session card-surfacing test post-cross-merge
  per `MB-F-T11-T13-RESOLVER-STUB`)
- **7 followups filed:** appended to `docs/FOLLOWUPS.md`
- **Full sweep results:** all green
- **Cross-session territory check:** sess-mbt11 territory untouched at
  every WB
- **Status:** READY FOR MERGE per parallel-cairn schema-file conflict
  rule. If sess-mbt11 merges first, rebase onto post-mbt11-merge main
  before merging sess-mbt13.
