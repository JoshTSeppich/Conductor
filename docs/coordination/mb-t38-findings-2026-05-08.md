# MB-T38 Findings — swarm-state.md + handoff document infrastructure

**Date:** 2026-05-08
**Session shape:** TICKET — Terminal B, Wave 1 parallel-cairn with MB-T35-revised (Terminal A)
**Base SHA:** c88048c (MB-T41 production HSO orchestrator system prompt)
**RED commit:** dfd83db
**GREEN commit:** 70674e1
**WB3:** Skipped (operator-authorized — implementation clean)
**Docs commit:** (this commit)

---

## I. Shipped infrastructure

### swarm-state.md continuous write protocol

**File:** `packages/dispatch-workstation/src/coarchitect/swarm-state-writer.ts`

`SwarmStateWriter` class subscribes to 6 continuous triggers via EventEmitter and overwrites
`docs/swarm-state.md` atomically on each event:

| Event | Handler method | State mutation |
|---|---|---|
| `tile-grid:session-add` | `onSessionAdd` | peers Map.set |
| `tile-grid:session-remove` | `onSessionRemove` | peers Map.delete |
| `action-variant:fired` | `onActionVariantFired` | actions[] push |
| `halt:emitted` | `onHaltEmitted` | halts[] push |
| `error:recorded` | `onErrorRecorded` | errors[] push |
| `peer:turn-complete` | `onPeerTurnComplete` | selfSummaries[] push |

All 6 handlers call `writeSwarmState()` → `writeAtomic(swarmStatePath, formatSwarmState())`.
None call `writeHandoffDoc()`.

swarm-state.md format sections (per orchestrator.md §1 schema):
```
# swarm-state.md — Conductor v3.5 Swarm State
**Last updated:** <ISO timestamp>
## Active Peers
## Actions Fired Since Last Update
## Active HALTs
## Unresolved Errors
## Outstanding Decisions
## Peer Self-Summaries
```

D2 fields in HALT entries (parser-anchored per orchestrator.md §4):
- `halt_urgency: high | medium | low`
- `halt_emitted_at: <ISO 8601>`
- `halt_blocking: <list>`

§7 YAML self-summary fields written for `peer:turn-complete` events (parser-anchored per
orchestrator.md §7; exact field names required — MB-T35-revised parser consumes these):
```yaml
peer_session: <name>
task: <one-sentence>
files_touched:
  - <path>
result: <one-sentence>
completion_status: complete | TURN_INCOMPLETE | error
no_follow_up: <bool>
follow_up_action: <if no_follow_up=false>
```

### Handoff document generation (D9 separate trigger + separate artifact)

**Handler:** `onHandoffTriggered` (event: `handoff:triggered`) → `writeHandoffDoc()` only.

Handoff documents written to `docs/coordination/handoff-<ISO-timestamp>.md` (new file
per handoff; colons replaced by hyphens in filename for filesystem safety).

**5 mandatory sections per orchestrator.md §8.2 (in order):**
1. Where I was (state summary — faithful echo of swarm-state.md)
2. Verbatim unsent prompts (formal `[ACTION:send-prompt-to-session]` blocks)
3. Sequencing intent
4. HALT severity rationale (with urgency + rationale per active HALT)
5. Explicit "do not" list (4 entries)

`writeHandoffDoc()` NEVER calls `writeSwarmState()`. `onHandoffTriggered` is
a separate bound listener from all 6 continuous listeners. D9 constraint enforced at
the call-stack level; Probe 08 verifies it.

### Atomic write pattern

`writeAtomic()` at bottom of `swarm-state-writer.ts` (lines ~265-270):
```typescript
function writeAtomic(filePath: string, content: string): void {
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, content, 'utf8');
  renameSync(tmpPath, filePath);
}
```

`renameSync` is POSIX-atomic on same filesystem. The `.tmp` file never persists after
successful rename. Probe 09 verifies: after 10 rapid-fire synchronous emissions,
`existsSync(swarmStatePath + '.tmp')` returns false. Authored within MB-T38 scope —
no existing atomic-write infrastructure in the workstation codebase to import
(finding MB-T38-C4a, confirmed at HALT 0 C4).

---

## II. Subscription wiring to Terminal A emission protocol

Wired in `SwarmStateWriter.onActionVariantFired` listener:

```typescript
import type {
  ActionVariantFiredPayload,
  MarkerActionType,
} from '../main/action-variant-ipc.js';
```

**Actual emission protocol (probe-verified at pre-WB2 against fc15a26):**
- Event constant: `ACTION_VARIANT_FIRED_EVENT = 'action-variant:fired' as const` (line 214)
- Payload: `ActionVariantFiredPayload { actionType: MarkerActionType, payload, sessionName, firedAt }` (lines 217-222)
- Emitter: `actionVariantEmitter` singleton (line 229)

**Mock-vs-actual compatibility:** WB1 mock used `actionType: string`; Terminal A typed
`actionType: MarkerActionType` (5-literal union). Compatible — `MarkerActionType` is
assignable from all 5 string literals. WB2 GREEN imports `MarkerActionType` for type-strict
handling; no string widening needed.

**Mock shape used in probes (WB1 + WB2):** tests pass `EventEmitter` instances with
manually emitted events — `SwarmStateWriter` constructor accepts any `EventEmitter`,
not the singleton directly. Production wiring uses the singleton; tests use mock.
This is the correct DI pattern for testability.

---

## III. D9 constraint enforcement

D9 (from SPIKE-HSO-02 + CONDUCTOR_V3.5_BUILD.md §5 second amendment at 5c816eb):
> swarm-state.md continuous writes and handoff document generation are SEPARATE triggers
> and SEPARATE artifacts; merging them into a single write operation violates D9.

**Enforcement:** two separate event listeners (`onPeerTurnComplete` is last of 6 continuous
listeners; `onHandoffTriggered` is the 7th and only handoff listener). Neither calls
the other's write method. The `dispose()` method removes all 7 listeners independently.

**Probe 08 verification:** fires `tile-grid:session-add` to establish swarm-state.md,
reads content, fires `handoff:triggered`, reads content again — asserts `contentAfter ===
contentBefore`. Passes GREEN because `onHandoffTriggered` calls `writeHandoffDoc()` only.

---

## IV. Probe distribution

9/9 probes GREEN at WB2 commit `70674e1`:

| Probe | Coverage |
|---|---|
| 01 | peer-add → swarm-state.md peer entry |
| 02 | peer-remove → peer entry absent |
| 03 | action-variant:fired → action recorded |
| 04 | halt:emitted → D2 fields (halt_urgency, halt_emitted_at, halt_blocking) |
| 05 | error:recorded → error entry |
| 06 | peer:turn-complete → §7 YAML self-summary (exact field names) |
| 07 | handoff:triggered → §8.2 5-section handoff doc |
| 08 | handoff:triggered does NOT modify swarm-state.md (D9) |
| 09 | atomic write — no .tmp persists; valid content after 10 rapid emissions |

---

## V. Parallel-cairn coordination outcomes

**Per-path git add discipline:** held across both commits (dfd83db + 70674e1).
- WB1 RED staged: `swarm-state-writer.ts` (new) + `swarm-state-writer.spec.ts` (new) — 2 files.
- WB2 GREEN staged: `swarm-state-writer.ts` (modified) — 1 file.
- Terminal A files (`action-variant-ipc.ts`, `chat-content-markers.ts`) never appeared
  in Terminal B's staged set across either commit. `git log -1 --stat` verified post-commit.

**Terminal A in-flight observation at WB1 pre-commit:**
At `git status --short` before WB1 RED commit, Terminal A's working tree contained:
- `M chat-content-markers.ts` — `parseActionMarker` RED stub in progress (unstaged)
- `?? action-variant-ipc.ts` — WB2 file already scaffolded (untracked)

Neither staged by Terminal B. Surface-and-note; no action required.

**HALT-STAGING-FOR-A:** held per §3.7. Literal halt between WB1 RED ship and operator's
cross-session coordination note. No reads, no prep, no file inventories during halt window.

**Terminal A protocol verify at pre-WB2:** anti-fabrication §3.1 discipline applied.
Operator coordination note claims verified against actual `action-variant-ipc.ts` at
fc15a26 before subscription wiring. All 4 claims matched exactly (event constant, payload
interface, emitter, import path). No divergence requiring halt-and-surface.

**Territory boundaries:** orchestrator.md READ-only throughout. dispatch-core/src/v3/schema.ts
not touched. CONDUCTOR_API_CONTRACT.md not touched. action-variant-ipc.ts not touched.

---

## VI. Findings + deviations from spec

**MB-T38-C4a — atomic write pattern authored within scope:** dispatch §2 recmd "atomic
write pattern" implies an existing infrastructure to consume. No such pattern exists in
the workstation codebase (all existing modules use raw `writeFileSync` directly). MB-T38
authors `writeAtomic()` as a module-local helper. Not a deviation — acceptable new-pattern
introduction (confirmed at HALT 0 C4 with operator ack).

**C4b — tile-grid registry events shape modeled, not probed at WB2:** dispatch §2 WB2 cites
"tile-grid registry events" as a second subscription source. `tile-grid-state.ts` is a
pure persistence module (no EventEmitter, no ipcMain.emit). The actual IPC layer that
would emit tile-grid state changes is [MODELED] to be in `main.ts` sentinel zones. WB2
GREEN implements the `tile-grid:session-add` / `tile-grid:session-remove` event handlers
against the mock emitter shape but does NOT wire to a real tile-grid IPC emitter — that
wiring requires investigation of the actual main.ts IPC layer at a future ticket (MB-T37
territory or MB-T38 follow-on). Production use of swarm-state-writer.ts requires a caller
to construct the writer with the appropriate emitter from the main.ts tile-grid IPC layer.

No deviations from D9 constraint. Separate triggers and separate artifacts enforced.

---

## VII. Observation — coarch-t03/sdk-call-shape.spec.ts

During WB2 GREEN test run, `test/unit/coarch-t03/sdk-call-shape.spec.ts` showed 2 failures
not in the §4.5 pre-existing baseline:
- `streamMessage calls messages.create with model, system, messages, max_tokens, stream:true`
- `streamMessage only yields text_delta chunks (skips message_stop etc.)`

Not diagnosed per §4.5 discipline — not MB-T38 scope. Filed as `MB-F-MBT38-COARCH-T03-SDK-CALL-SHAPE-FAILURES`
(Tier 3 candidate) in FOLLOWUPS.md. Possible causes: (a) pre-existing flake not in §4.5
baseline; (b) Terminal A's chat-content-markers.ts extension transitively affecting;
(c) unrelated intermittent failure. Closure path: isolate by running full suite at fc15a26
vs 70674e1 to determine if regression introduced during Wave 1.

---

## VIII. Followups filed

| ID | Tier | Description |
|---|---|---|
| `MB-F-MBT38-COARCH-T03-SDK-CALL-SHAPE-FAILURES` | Tier 3 (candidate) | 2 new test failures in coarch-t03/sdk-call-shape.spec.ts observed during WB2 verification; not in §4.5 baseline; diagnosis deferred |

**No existing followups closed by MB-T38.**
MB-F-T11A-IPC-ROUTING-ROUND-6 was Terminal A's closure (fc15a26).
