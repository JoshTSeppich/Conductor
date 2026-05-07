# Session MB-T11 — Findings (append-only)

**Branch:** `sess-mbt11/orchestrator-action-tools-and-autopilot`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-mbt11`
**Cut from:** `main` HEAD `8d61104` (post-sess-mbt10 merge + Tier-1 followup
consolidation; latest origin/main at session open)
**Date opened:** 2026-05-06

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the parallel-batch sess-mbt11 slot. Numbers below
are working entries; operator may renumber on merge.

---

## Finding #sess-mbt11-1 — MB-T11 — Orchestrator action tools + autopilot loop

**Date filed:** 2026-05-06
**Tier:** 3 — feature ticket. Implements `CONDUCTOR_V3_RESCOPE.md §3.6 + §3.7 + §4 lines 203-211`.

**Origin:** Phase 2 brief MB-T11 (orchestrator action tools + autopilot loop).
Phase 1 diagnose at `/tmp/mb-t11-diagnose.md` surfaced Q-MBT11-{1..10} +
risks R1/R5 for HALT 0; operator landed all ten arbitrations + R1/R5
dispositions ahead of WB1.

**Discovered by:** Session MB-T11 (this batch) Phase 1 reading + Phase 2
implementation. Builds on:
- MB-T07 OrchestratorCard surface (existing CardOutput / ActionOutput shape)
- MB-T09 session-send-prompt IPC + envelope schema (consumed by 'send' action)
- MB-T10 Tier 4 spawnedSessions + tier4-builder + context-snapshot endpoint
- MB-T05 spawn pipeline (referenced from Phase 2 brief WB7 spawn dep stub)

**Resolution status:** SHIPPED on `sess-mbt11/orchestrator-action-tools-and-autopilot`.
Ladder commits (8 WBs):

- WB1 `aa51fff` — schema(MB-T11): §12 per-action payload sub-schemas + ActionTypeEnum 'assign-task'
- WB2 `9a2665d` — green(MB-T11): orchestrator-action-types.ts pure module + unit tests
- WB3 `77cd4c9` — green(MB-T11): workstation:session-kill IPC + handler + integration tests
- WB4 `a342e75` — green(MB-T11): approval-policy-resolver stub + MB-F-T11-T13-RESOLVER-STUB followup
- WB5 `a886347` — green(MB-T11): orchestrator-action-handler.ts dispatcher + unit tests
- WB6 `f2f39cf` — green(MB-T11): autopilot-loop.ts + autopilot-state-store.ts + unit tests
- WB7 `13bf482` — green(MB-T11): coarchitect-ipc action routing + Tier4 wiring closure + system-prompt update + MB-F-T10-COARCHITECT-IPC-WIRE-TIER4 RESOLVED
- WB8 (this commit) — green(MB-T11) + docs(MB-T11): autopilot multi-session acceptance integration test + this finding entry

### Surface change (KNOWN — direct file diff `8d61104..HEAD`)

| | Before (HEAD `8d61104`) | After (HEAD post-WB8) |
|---|---|---|
| `dispatch-core/src/v3/schema.ts` | through §11 (Tier 4 payload) | + §12: per-action payload sub-schemas (Send/Spawn/Kill/PullHandoff/AssignTask) + `pickPayloadSchema(actionType)` helper + `WorkstationSessionKillRequestSchema` (sess-mbt11 WB3 IPC schema). §1 ActionTypeEnum extended with `'assign-task'` (R1 disposition: additive enum-VALUE extension permitted). |
| `dispatch-workstation/src/main/orchestrator-action-types.ts` | did not exist | NEW pure module (231 lines): `MB_T11_ACTION_TYPES` tuple, 5 type-narrowing helpers, `ACTION_DESCRIPTORS` map encoding §3.2 Medium policy baseline, `assertActionPayload` second-pass validator. |
| `dispatch-workstation/src/main/session-kill-ipc.ts` | did not exist | NEW IPC handler (232 lines): `workstation:session-kill` channel mirroring MB-T09 pattern; tmux kill-session + PATCH /v2/sessions/:name/state pipeline; workstation-local error variants (TmuxKillError, DaemonUnreachable). |
| `dispatch-workstation/src/main/main.ts` | registered MB-T09 + MB-T05 IPC | + 8-line additive: registers `workstation:session-kill` after MB-T09 in `app.whenReady` chain. |
| `dispatch-workstation/src/main/preload.mts` | exposed `sendPromptToSession` on workstationBridge | + 4-line additive: exposes `killSession` on workstationBridge alongside sendPromptToSession. |
| `dispatch-workstation/src/main/approval-policy-resolver-stub.ts` | did not exist | NEW stub module (77 lines) per Q-MBT11-6=a + Rule 3: always returns `approvalRequired:true` regardless of input. Most-conservative default while sess-mbt13 ships the real resolver in parallel. |
| `dispatch-workstation/src/main/orchestrator-action-handler.ts` | did not exist | NEW dispatcher module (340 lines): `dispatchAction(input, deps)` single entry; 6 narrow dep injectables; 3-variant `DispatchActionResult` (`fired`/`pending-approval`/`error`); routes to MB-T09/MB-T05/WB3 IPC + v2 handoff + autopilot.startIntent per action. Card variant short-circuits resolver; payload validation runs BEFORE resolver gate. |
| `dispatch-workstation/src/main/autopilot-state-store.ts` | did not exist | NEW JSON-file persistence module (172 lines): `<userData>/autopilot-state.json` keyed by sessionName. Test-override via `MB_AUTOPILOT_STATE_DIR` (mirrors splitter-state.ts pattern). Defensive shape validation on read. |
| `dispatch-workstation/src/main/autopilot-loop.ts` | did not exist | NEW state-machine module (246 lines): `AutopilotLoop` class with `setEnabled` / `isEnabled` / `startIntent` / `recordAction` / `getPendingIntents` / `getLastActionFiredAt` / `clearIntent` / `resetSession`. Inline UUIDv7 helper (replicated 25 lines from `dispatch-daemon/src/events/history.ts:135`; workstation does not import from dispatch-daemon today). |
| `dispatch-workstation/src/main/tier4-fan-out.ts` | did not exist | NEW Tier 4 fan-out helper (116 lines) per Q-MBT11-7=a + Q-MBT11-8=a: `buildTier4Payload(deps)` calls daemon `/v3/sessions/:name/context-snapshot` per session AND merges workstation autopilot state (pending_intents + last_action_fired_at) into each `SessionContextSnapshot` per Q-MBT11-8=a. |
| `dispatch-workstation/src/main/coarchitect-ipc.ts` | passed `spawnedSessions: null` to buildContext (followup MB-F-T10-COARCHITECT-IPC-WIRE-TIER4); silently fall-through on `action-fire-without-card` route | + module-scope singletons (AutopilotLoop, HttpSessionListClient, daemon-token helper); buildContext call site replaced `spawnedSessions: null` with `await buildTier4Payload(...)` (Q-MBT11-7=a closure); F5 routing now wires `'action-fire-without-card'` → `dispatchAction` with full dep set (send/kill/pull/assign-task wired; spawn deferred per `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED`). |
| `dispatch-workstation/coarchitect/system-prompt.md` | DRAFT P-0.4 system prompt with 3 worked examples | + 101-line MB-T11 section before "Behavioral rules in detail": documents 5 MB-T11 action types + payload shapes; assign-task metadata-marker semantics; approval-policy resolver behavior; autopilot trigger phrases ("go" / "autopilot on" / "pause" / "resume"); Example 4 worked assign-task → first-step send envelope flow. R5 disposition authorized this surface. |
| `dispatch-workstation/test/unit/orchestrator-action-types/` | did not exist | NEW dir with 3 probes (35 tests): discriminators + payload validation + descriptor completeness |
| `dispatch-workstation/test/unit/session-kill-ipc/` | did not exist | NEW dir with 4 probes (10 unit tests): controller success + no-session + tmux-fails + daemon-fails |
| `dispatch-workstation/test/integration/session-kill/` | did not exist | NEW dir with 1 real-tmux probe: spawn smoke session, kill via controller, verify pane gone within 500ms (auto-skip when tmux not on PATH) |
| `dispatch-workstation/test/unit/approval-policy-resolver-stub/` | did not exist | NEW dir with 2 probes (9 tests): always-requires-approval + shape-matches-interface |
| `dispatch-workstation/test/unit/orchestrator-action-handler/` | did not exist | NEW dir with 8 probes + _helpers.ts (35 tests): payload validation + 5 routing assertions + resolver-blocks + resolver-allows |
| `dispatch-workstation/test/unit/autopilot-state-store/` | did not exist | NEW dir with 1 probe (7 tests): persistence round-trip + restart simulation |
| `dispatch-workstation/test/unit/autopilot-loop/` | did not exist | NEW dir with 4 probes (21 tests): intent lifecycle + multi-session isolation + pending-intents shape + intent-id uniqueness |
| `dispatch-workstation/test/unit/tier4-fan-out/` | did not exist | NEW dir with 1 probe (6 tests): empty + populated + killed-filter + degrade paths |
| `dispatch-workstation/test/integration/coarchitect-action-routing/` | did not exist | NEW dir with 1 probe (4 tests): router-to-handler integration |
| `dispatch-workstation/test/integration/autopilot-multi-session/` | did not exist | NEW dir with 1 acceptance probe (4 tests) per ticket §4: 2-session autopilot + multi-step plan + approval-card surfaces + resume on approve |
| `docs/FOLLOWUPS.md` | open: `MB-F-T10-COARCHITECT-IPC-WIRE-TIER4` (Tier 2) | `MB-F-T10-COARCHITECT-IPC-WIRE-TIER4` marked CLOSED by sess-mbt11 WB7. NEW: `MB-F-T11-T13-RESOLVER-STUB` (Tier 1, cross-merge). NEW: `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED` (Tier 2). |

Cumulative diff: 39 files / +4,326 / −5 lines.

### Schema additions (Q-MBT11-1=a + R1 applied at WB1)

```ts
// §1 (additive enum-value addition per R1 disposition):
ActionTypeEnum.add('assign-task') // 9th member; comment marks origin

// §12 — Orchestrator action tools (CONDUCTOR_V3_RESCOPE.md §3.6 + §4)
SendPromptActionPayloadSchema    = z.object({ prompt: string.min(1), envelope: SendPromptEnvelope.optional() }).strict();
SpawnSessionActionPayloadSchema  = z.object({ sessionName, repoPath, permissionMode: enum(['readonly','normal','dangerously-skip']).optional() }).strict();
KillSessionActionPayloadSchema   = z.object({ sessionName, reason: string.optional() }).strict();
PullHandoffActionPayloadSchema   = z.object({ sessionName }).strict();
AssignTaskActionPayloadSchema    = z.object({ sessionName, intent_summary, expected_steps: int.min(1).optional() }).strict();

WorkstationSessionKillRequestSchema = z.object({ sessionName }).strict();

pickPayloadSchema(actionType: ActionType): z.ZodTypeAny;
```

`payload: z.unknown()` on `ActionOutputSchema` / `CardOutputSchema` (§3) is
unchanged; per Q-MBT11-1=a, the per-action validation happens
post-`OrchestratorOutputSchema.parse` via `assertActionPayload` in
`orchestrator-action-types.ts`. This eliminates rebase-conflict surface
with sess-mbt13's §13 OrchestratorOutputSchema variants (if any).

### Acceptance criteria status (per CONDUCTOR_V3_RESCOPE.md §4 lines 209-211)

| Criterion | Status | Evidence |
|---|---|---|
| Unit tests per action type | KNOWN GREEN | 35 probes at test/unit/orchestrator-action-handler/ (8 probe files) cover all 5 MB-T11 action types |
| Integration test: spawn 2 sessions (smoke harness) | KNOWN GREEN — deterministic | WB8 acceptance probe at test/integration/autopilot-multi-session/probe-01-acceptance-multi-session-autopilot.spec.ts uses dep-injection seam + AutopilotLoop with tmpdir state. Real-tmux smoke is covered separately at WB3 probe-05 (real-tmux session-kill); real daemon + real tmux + real dispatcher dogfood deferred to v3.0 ship-gate validation. |
| set autopilot, fire multi-step plan via assign-task | KNOWN GREEN | Acceptance test 1: emits assign-task for sess-a + sess-b, captures distinct intent_ids |
| Verify both sessions receive their prompts in correct order | KNOWN GREEN | Acceptance test 1: 6-prompt interleaved A/B/A/B/A/B sequence with envelope step monotonicity asserted per session |
| Verify approval card surfaces for commit-touching prompt | KNOWN GREEN | Acceptance test 2: stub resolver always blocks → kind:'pending-approval'; commit-touching prompt path validated |
| Verify operator approval resumes loop | KNOWN GREEN | Acceptance test 3: same payload re-emitted as CardOutput (operator-approved variant) → resolver short-circuits → action fires |

### Q-MBT11-1..10 + R1/R5 status (operator-arbitrated 2026-05-06)

| Q | Disposition | Implemented at |
|---|---|---|
| Q-MBT11-1 | (a) per-action sub-schemas, post-parse validation | WB1 §12 + WB2 assertActionPayload |
| Q-MBT11-2 | (a) electron-store autopilot persistence (JSON-file in userData) | WB6 autopilot-state-store.ts |
| Q-MBT11-3 | (a) new dedicated workstation:session-kill IPC | WB3 session-kill-ipc.ts |
| Q-MBT11-4 | (a) reuse existing GET /v2/sessions/:name/handoff | WB7 firePullHandoff dep |
| Q-MBT11-5 | (a) assign-task as metadata-only marker | WB1 schema + WB6 startIntent + WB7 system-prompt |
| Q-MBT11-6 | (a) resolver stub at approval-policy-resolver-stub.ts | WB4 stub + MB-F-T11-T13-RESOLVER-STUB followup |
| Q-MBT11-7 | (a) close MB-F-T10-COARCHITECT-IPC-WIRE-TIER4 in WB7 | WB7 tier4-fan-out + RESOLVED status update |
| Q-MBT11-8 | (a) workstation-merge of pending_intents + last_action_fired_at | WB7 tier4-fan-out fetchAndMergeSnapshot |
| Q-MBT11-9 | (a) per-session autopilot toggle in electron-store | WB6 setEnabled + isEnabled per sessionName |
| Q-MBT11-10 | accept 8-WB ladder | WB1-WB8 ladder shipped as designed |
| R1 | PERMITTED additive enum-VALUE extension at §1 ActionTypeEnum | WB1 'assign-task' addition (additive, not modifying existing values) |
| R5 | PERMITTED system-prompt update | WB7 system-prompt.md +101 lines (assign-task primer + autopilot trigger language) |

### Verification (KNOWN — test-execution observations 2026-05-06)

**Per-WB unit + integration suites:**

| WB | Test count | Status |
|---|---|---|
| WB1 (schema) | n/a (schema-only) | typecheck + build clean |
| WB2 | 35 tests / 3 probes | GREEN |
| WB3 | 10 tests / 5 probes (4 unit + 1 real-tmux integration) | GREEN; real-tmux probe-05 spawn-then-kill in 172ms |
| WB4 | 9 tests / 2 probes | GREEN |
| WB5 | 35 tests / 8 probes + _helpers.ts | GREEN |
| WB6 | 28 tests / 5 probes | GREEN |
| WB7 | 10 tests / 2 probes (6 tier4-fan-out + 4 router-to-handler integration); 38 adjacent regression suites also clean | GREEN |
| WB8 | 4 tests / 1 acceptance probe | GREEN |

**Cumulative MB-T11 test count:** ~131 tests across 26 probe files.

**Workstation runtime-relaunch smoke (Rule 4):** WB3, WB5, WB7 each
required runtime-relaunch verification per coordination doc Rule 4.
All three observed `WINDOW_READY` sentinel within 8s; WB7 also passed
the `ERR_MODULE_NOT_FOUND` regression check defending against
MB-F-DISPATCH-CORE-DUAL-IMPORT-PATTERN-DRIFT recurrence.

**5-package typecheck sweep:** clean at every WB close
(dispatch-core, dispatch-workstation, dispatch-daemon, dispatch-cli,
dispatch-web — all `tsc --noEmit` exit 0).

### Followups filed

| ID | Tier | Closure path |
|---|---|---|
| `MB-F-T11-T13-RESOLVER-STUB` | 1 | Cross-merge of sess-mbt11 + sess-mbt13: swap stub import in `orchestrator-action-handler.ts` for sess-mbt13's real resolver; delete stub file + 2-probe test dir; probe-02-stub-shape-matches-interface.spec.ts intentionally fails on swap to force test cleanup. |
| `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED` | 2 | Wire orchestrator-fired spawn through `SpawnIpcController.handleSpawnRequest` threading `defaultSpawnHandlerDeps()` (async — needs the same controllerPromise pattern as `registerSpawnIpcHandlers`). v3.0 acceptance test (WB8) spawns via deterministic dep-injection, not via orchestrator-fired action; non-blocking for v3.0 ship. Operator dogfood will reveal whether v3.0 needs orchestrator-driven spawn. |

### Followups closed by this session

| ID | Origin | Closed at |
|---|---|---|
| `MB-F-T10-COARCHITECT-IPC-WIRE-TIER4` | sess-mbt10 WB5 | sess-mbt11 WB7 (`13bf482`): `tier4-fan-out.ts` + `coarchitect-ipc.ts:141` `spawnedSessions: null` literal replaced with `await buildTier4Payload({...}).catch(() => null)`. Q-MBT11-7=a + Q-MBT11-8=a applied. |

---

## Cross-session coordination ledger

Sess-mbt11 ran in parallel with sess-mbt13 (per-session approval policy +
audit table). Coordination per parallel-cairn coordination doc 2026-05-06:

| Topic | sess-mbt11 territory | sess-mbt13 territory | Overlap |
|---|---|---|---|
| `dispatch-core/src/v3/schema.ts` | §12 only (action-tool schemas + WB3 IPC schema) | §13 (audit-row + approval-policy enum) | KNOWN per Rule 1: §s land in numerical order at merge time. Both branches append to end-of-file; first-merger keeps its §; second-merger rebases per coordination doc + MB-F-PARALLEL-CAIRN-SCHEMA-FILE-MERGE-CONFLICT. Q-MBT11-1=a kept `OrchestratorOutputSchema.discriminatedUnion` UNCHANGED, eliminating that conflict surface. |
| `approval-policy-resolver` | STUB at `approval-policy-resolver-stub.ts` (Q-MBT11-6=a + Rule 3) | Real resolver at `approval-policy-resolver.ts` (separate filename) | Stub returns `approvalRequired:true` for all inputs (most-conservative default). Post-cross-merge, MB-F-T11-T13-RESOLVER-STUB tracks the swap. |
| `dispatch-daemon/src/db/schema.ts` | NOT TOUCHED (forbidden) | NEW (approval_policy column + audit table) | KNOWN: sess-mbt11 verified pre-WB1 that no daemon DB schema file exists at HEAD `8d61104`; sess-mbt13's creation does not conflict with sess-mbt11. |
| `dispatch-daemon/src/migrations/*` | NOT TOUCHED (forbidden) | NEW migration | No overlap. |
| `dispatch-daemon/src/routes/v3/audit/*` | NOT TOUCHED (forbidden) | NEW routes | No overlap. The existing `routes/v3/orchestrator-audit.ts` (COARCH-T01 audit) is independent of sess-mbt13's `orchestrator_swarm_audit` table. |
| `dispatch-workstation/src/renderer/tile-header/*` | NOT TOUCHED (forbidden) | LIMITED (approval-policy picker) | No overlap. |
| `dispatch-workstation/src/main/coarchitect-ipc.ts` | LIMITED EDIT (Phase 2 brief WB7 explicitly authorized: action-fire route + Tier4 wiring closure + system-prompt update) | reads-only territory per coordination doc | LIMITED but unilateral — sess-mbt13's reads-only constraint means no concurrent write conflict. |
| `docs/FOLLOWUPS.md` | append-only (rows + status amendments) | append-only (rows) | KNOWN: 3-way merge resolves cleanly when both branches append. |

### Forward dependency

| To | Trigger | Action |
|---|---|---|
| (post-cross-merge) | sess-mbt11 + sess-mbt13 both merged to main | Close `MB-F-T11-T13-RESOLVER-STUB`: swap stub for real resolver in orchestrator-action-handler.ts default deps; delete `approval-policy-resolver-stub.ts` + `test/unit/approval-policy-resolver-stub/` dir. |
| (v3.0 ship-gate dogfood) | Operator drives the conductor loop end-to-end | Validate WB8 acceptance criteria against real-tmux + real-daemon + real-Anthropic. Surface any new findings as `MB-F-T11-DOGFOOD-*` followups. |
| (future ticket) | Orchestrator-driven spawn becomes useful | Close `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED`: wire `fireSpawn` through `SpawnIpcController.handleSpawnRequest`. |

---

## Authority chain

- `CONDUCTOR_V3_RESCOPE.md` §3.4 (orchestrator-to-session protocol)
- `CONDUCTOR_V3_RESCOPE.md` §3.5 (Tier 4 spawnedSessions context)
- `CONDUCTOR_V3_RESCOPE.md` §3.6 (action tools enumeration)
- `CONDUCTOR_V3_RESCOPE.md` §3.7 (autopilot loop semantics)
- `CONDUCTOR_V3_RESCOPE.md` §4 lines 203-211 (MB-T11 ticket body)
- `CONDUCTOR_API_CONTRACT.md` §10.5 (Q1-Q9 self-check at every commit)
- Phase 2 brief (operator 2026-05-06)
- Q-MBT11-1..10 + R1/R5 dispositions (operator HALT 0 ack 2026-05-06)
- parallel-cairn coordination doc 2026-05-06 (Rules 1-4 + territory fences)

---

## HALT W8 closing summary

**Branch state:** sess-mbt11/orchestrator-action-tools-and-autopilot at the
WB8 commit (this finding's parent), origin synced.

**Ready-for-merge declaration:**
- All 8 WBs shipped with green tests + clean typecheck + runtime smoke
  where required.
- All 10 Q-MBT11 + R1 + R5 dispositions implemented.
- All 6 acceptance criteria validated (5 deterministic via WB8 probe;
  1 deferred to v3.0 dogfood per real-tmux/daemon/Anthropic boundary).
- 2 followups filed (1 cross-merge Tier 1, 1 deferred Tier 2); 1
  pre-existing followup closed (MB-F-T10-COARCHITECT-IPC-WIRE-TIER4).
- Cross-session coordination clean: no sess-mbt13 territory touched
  except shared schema.ts §12 (Q-MBT11-1=a kept the discriminator
  unchanged → minimal conflict surface) and shared FOLLOWUPS.md
  append-only.
- Per parallel-cairn schema-file conflict rule
  (MB-F-PARALLEL-CAIRN-SCHEMA-FILE-MERGE-CONFLICT): if sess-mbt13
  merges first, sess-mbt11 rebases onto post-mbt13-merge main before
  attempting its own merge. Operator arbitrates merge order at HALT W8.

Standing by for operator merge to main.
