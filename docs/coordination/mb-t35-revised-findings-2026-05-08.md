# MB-T35-revised Findings — 2026-05-08

**Session:** Terminal A (parallel-cairn with MB-T38 Terminal B)
**Base SHA:** `c88048c` (post-MB-T41 ship)
**GREEN SHA:** `fc15a26`
**Ticket:** MB-T35-revised — Action variant emission via markdown markers

---

## §I — Deliverables shipped

### Two-layer pipeline

**Layer 1 — Parser** (`packages/dispatch-workstation/src/coarchitect/chat-content-markers.ts`)
- `ParsedActionMarker` interface: lines 84–87
- `ACTION_BLOCK_RE` regex: line 91
- `FIELD_LINE_RE` field-line regex: line 95
- `parseActionMarker()` function: lines 103–121
- Additive extension only — existing `parseQuickPickMarker` + `parseSpawnedMarker` exports unchanged

**Layer 2 — Dispatcher** (`packages/dispatch-workstation/src/main/action-variant-ipc.ts`, new file)
- Inline field validation helpers (`FieldValidation<T>`, `requireStr`, `optionalStr`): lines 57–68
- 5 marker-specific field validators: lines 77–111
- `MARKER_ACTION_TYPES` + `MarkerActionType`: lines 117–125
- `ActionVariantDispatchDeps` interface: lines 131–186
- `ActionVariantDispatchResult` union: lines 192–208
- Emission protocol exports (`ACTION_VARIANT_FIRED_EVENT`, `ActionVariantFiredPayload`, `actionVariantEmitter`): lines 214–229
- `dispatchActionVariant()` core dispatch: lines 246–357

### 5 action variant wirings

| Variant | Dep | Field mapping |
|---|---|---|
| `send-prompt-to-session` | `fireSendPrompt(sessionName, prompt, rationale?)` | direct |
| `spawn-session` | `fireSpawn(sessionName, initialPrompt, rationale?)` | direct; repoPath dep-resolved |
| `kill-session` | `fireKill(sessionName, reason?)` | `marker.rationale → IPC.reason` |
| `pull-handoff-from-session` | `firePullHandoff(sessionName)` | direct (rationale audit-only) |
| `assign-task` | `fireAssignTask(sessionName, intent_summary, rationale?)` | `marker.ticketScope → IPC.intent_summary` |

---

## §II — Findings (operator-ratified at HALT 0)

### F-MBT35R-A — Schema drift between orchestrator.md §2 text-block format and §12 IPC schemas

**Finding:** `packages/dispatch-core/src/v3/schema.ts` §12 schemas were authored for the v3.0 tool-use path (`OrchestratorOutput` discriminated union). Field names differ from the MB-T41 §2 text-block format:
- `kill-session`: §12 uses `reason`; orchestrator.md emits `rationale`
- `assign-task`: §12 uses `intent_summary`; orchestrator.md emits `ticketScope`
- `spawn-session`: §12 requires `repoPath`; orchestrator.md does not include it

**Resolution (a) — operator-ratified at HALT 0:**
Define marker-specific inline validators in `action-variant-ipc.ts` matching orchestrator.md §2 field names exactly. Map to §12 IPC payloads in the dispatch switch statement. Frozen contract (`dispatch-core/src/v3/schema.ts`) not modified.

**Implementation:** `rationale→reason` mapping at line 307; `ticketScope→intent_summary` mapping at line 337. Comment annotations at each site (`// rationale maps to §12 KillSessionActionPayloadSchema.reason (F-MBT35R-A)`).

### F-MBT35R-B — spawn-session marker omits repoPath

**Finding:** `SpawnSessionActionPayloadSchema` at §12 requires `repoPath`. The orchestrator's `spawn-session` text-block does not include this field.

**Resolution:** `fireSpawn` dep signature accepts only `(sessionName, initialPrompt, rationale?)`. Production wiring resolves `repoPath` from session-context defaults within the dep (in `orchestrator-fire-spawn.ts` or its production replacement). `dispatchActionVariant` does not attempt to pass `repoPath` — it is not the dispatcher's responsibility.

**No halt required.** Pattern matches `orchestrator-fire-spawn.ts`'s existing dep abstraction. KNOWN via direct read of `packages/dispatch-workstation/src/main/orchestrator-fire-spawn.ts`.

### F-MBT35R-C — zod not in dispatch-workstation direct dependencies

**Finding:** First WB2 implementation attempt imported `zod` directly in `action-variant-ipc.ts`. Test run gave: `Cannot find package 'zod' imported from .../action-variant-ipc.ts`. Root cause: `zod` is in `dispatch-core/node_modules` but not `dispatch-workstation`'s own `package.json`.

**Resolution:** Replaced Zod schemas with inline manual validation helpers (`requireStr`, `optionalStr`, `validateXxx`). Field set is required/optional strings only — manual validation is complete and correct for this scope.

**New followup filed:** `MB-F-MBT35R-C-ZOD-IN-WORKSTATION` — add `zod` to `dispatch-workstation/package.json` for future schema validation work.

---

## §III — Emission protocol (Terminal B integration point)

Durable at SHA `fc15a26`.

```ts
// Terminal B subscribe pattern:
import {
  actionVariantEmitter,
  ACTION_VARIANT_FIRED_EVENT,
  type ActionVariantFiredPayload,
} from '../main/action-variant-ipc.js';

actionVariantEmitter.on(ACTION_VARIANT_FIRED_EVENT, (p: ActionVariantFiredPayload) => {
  // p.actionType  — MarkerActionType
  // p.payload     — validated marker fields (unknown; cast as needed)
  // p.sessionName — the session the action targeted
  // p.firedAt     — ISO timestamp
});
```

`actionVariantEmitter` is a singleton `EventEmitter` exported directly from the module. No separate event-bus module needed.

---

## §IV — Probe distribution

Dispatch §2 minimum: 8 probes. Shipped: **19 probes** across 2 test files.

| File | Probes | Scope |
|---|---|---|
| `test/unit/coarchitect/probe-07-action-marker-parser.spec.ts` | 9 | parseActionMarker: 5 variant extractions, 2 null-return cases, block-in-prose, unknown type passthrough |
| `test/unit/action-variant-ipc/probe-01-action-variant-dispatch.spec.ts` | 10 | dispatchActionVariant: 5 routing probes, unknown type error, missing field error, approval gate, event emission, resolveApproval call shape |

Test split rationale: dispatch §2 named a single test file. After Phase 1 read of the actual test directory structure (`test/unit/coarchitect/` existing convention for coarchitect parsers), operator-ratified split at HALT 1: parser probes in `coarchitect/`, handler dispatch probes in `action-variant-ipc/`.

---

## §V — Deviations from BUILD doc §5 scope

**Planned test path vs actual:** Dispatch §2 named `test/unit/main/action-variant-ipc.spec.ts`. Actual paths used: `test/unit/coarchitect/probe-07-...` + `test/unit/action-variant-ipc/probe-01-...`. Rationale: coarchitect parser tests belong in `coarchitect/` per established convention; handler dispatch tests use the `action-variant-ipc/` sub-directory to match the `probe-NN-descriptor.spec.ts` convention. Operator-ratified at HALT 1.

**chat-content-markers.ts location:** Dispatch §0 C4 initially cited `src/main/chat-content-markers.ts`. Actual location: `src/coarchitect/chat-content-markers.ts`. Caught at HALT 0 C4 via direct `find` probe; operator-corrected in HALT 0 ack.

**IPC closure path vs actual:** Dispatch §1 described wiring to `coarchitect-ipc.ts` and specific tmux/daemon channels directly. Actual implementation: pure dep-injection surface (`ActionVariantDispatchDeps`). Production wiring (which connects to `session-send-prompt-ipc.ts`, `orchestrator-fire-spawn.ts`, `session-kill-ipc.ts`, daemon routes) is the caller's responsibility. This is architecturally cleaner than the dispatch's suggestive coupling — no deviation from the ticket's behavioral acceptance (5 action types fire correctly + invalid marker surfaces error), but the internal wiring approach differs.

---

## §VI — Cross-session coordination outcomes

**Per-path discipline:** All 4 commits used explicit `git add <path>`. Zero Terminal B files swept. `git log -1 --stat` post-commit verified on WB1 and WB2 commits.

**Territory checks:** Terminal B's `coarchitect/swarm-state-writer.ts` appeared as untracked (`??`) in `git status` during WB2. Not staged. Flagged in Q7 of WB2 commit body.

**Consumer non-regression:** Full `coarchitect/` test suite run after WB2. 34 tests pass (probe-04/05/06 for existing `parseQuickPickMarker`/`parseSpawnedMarker` unchanged). 9 failures in `swarm-state-writer.spec.ts` are Terminal B's MB-T38 WB1 RED tests — pre-existing, not caused by Terminal A changes.

**Emission protocol coordination:** Protocol shape surfaced at HALT-WB1. Operator reviewed and ratified. Terminal B notified via operator cross-session coordination (not this session's responsibility per HALT-WB2 ack).

---

## §VII — Followups filed this ticket

| Row | Tier | Summary |
|---|---|---|
| `MB-F-MBT35R-C-ZOD-IN-WORKSTATION` | 2 | Add zod to dispatch-workstation package.json; inline validation ships here as stopgap |

---

## §VIII — Closure

**MB-F-T11A-IPC-ROUTING-ROUND-6** closed by `fc15a26`.

All 5 action variant IPC dispatch paths wired. Approval policy gating operative. Emission protocol durable. 19/19 probes GREEN.
