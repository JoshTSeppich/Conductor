# MB-T11-A Session Findings — 2026-05-08

**Session:** mbt11a-worktree (Sonnet 4.6)
**Branch:** mbt11a-worktree
**Base SHA:** f397ca0
**Ladder:** 4 WBs (WB1 RED, WB2 GREEN schema, WB3+WB4 GREEN card, WB5 docs)

---

## §I — Scope delivered

| Acceptance criterion | Status |
|---|---|
| `SendPromptToSessionOutputSchema` (strict; min(1) fields) in §3 | SHIPPED |
| `SpawnSessionOutputSchema` (strict; optional initialPrompt) | SHIPPED |
| `KillSessionOutputSchema` (strict; optional reason) | SHIPPED |
| `PullHandoffFromSessionOutputSchema` (strict; sessionName + rationale only) | SHIPPED |
| `AssignTaskOutputSchema` (strict; optional parameters record) | SHIPPED |
| `OrchestratorOutputSchema` discriminated union extended (9 members total) | SHIPPED |
| 6 dispatch-core Zod probes (196/196 GREEN) | SHIPPED |
| `OrchestratorCard` extended with 5 action variant renderers | SHIPPED |
| `OrchestratorCardProps.card` union extended additively (7 types) | SHIPPED |
| `approvalRequired?: boolean` prop + approval-required-indicator | SHIPPED |
| 6 dispatch-web probes (320/320 GREEN) | SHIPPED |
| 5-package typecheck clean | VERIFIED |
| §3.22 cross-session check: no overlap with mbt11b or mbt13 | VERIFIED |

---

## §II — Phase 1 surface corrections (HALT 0 ratifications)

| Q | Prompt claim | Actual state | Resolution |
|---|---|---|---|
| Q-MBT11A-3 | Card at `dispatch-workstation/src/coarchitect/orchestrator-card.tsx` | Actual: `dispatch-web/src/orchestrator-cards/orchestrator-card.tsx` | Corrected via HALT 0 ack |
| Q-MBT11A-4 | Probes at `dispatch-workstation/test/unit/coarchitect/probe-NN-*.spec.tsx` | Actual: `dispatch-web/test/mb-t11a-*.test.tsx` per dispatch-web vitest config | Corrected via HALT 0 ack |
| Q-MBT11A-5 | `assign-task.parameters` type unclear | Used `z.record(z.string(), z.unknown()).optional()` per default | Ratified |
| Q-MBT11A-6 | `approvalRequired` prop scope | Additive extension; backward-compat | Ratified |

---

## §III — Key technical finding: TypeScript forward-reference constraint

**Finding:** The initial implementation plan placed the 5 new schemas at a new `§14` section at the end of schema.ts. This would cause a TDZ (Temporal Dead Zone) ReferenceError at module load: `OrchestratorOutputSchema` is defined at §3 (line ~246) and references the new schemas; TypeScript `const` declarations are NOT hoisted.

**Resolution:** Placed the 5 new schemas WITHIN §3, immediately before `OrchestratorOutputSchema`. The §3 block is now:
1. Existing 4 schemas (ActionOutputSchema, CardOutputSchema, MultiChoiceCardOutputSchema, EscapeBlockOutputSchema) — unchanged
2. 5 new MB-T11-A schemas (SendPromptToSession, SpawnSession, KillSession, PullHandoffFromSession, AssignTask)
3. `OrchestratorOutputSchema` discriminated union — extended with all 5 new members

This placement is authorized by Q-MBT11A-2=ACK (additive §3 extension). Existing §3 schemas were not touched.

**envelope field exclusion:** `SendPromptToSessionOutputSchema` does NOT include an `envelope` field. `SendPromptEnvelopeSchema` (§10, line ~689) would create a forward-reference if included here. Envelope is an IPC-transport detail added by MB-T11-B's action handler when forwarding to `WorkstationSessionSendPromptRequest`. This is documented in probe-01 (negative test: `rejects envelope field`) and router.ts comments.

---

## §IV — Consumer fix: orchestrator-output-router.ts

After extending `OrchestratorOutputSchema` to 9 members, `dispatch-workstation/src/main/orchestrator-output-router.ts` had a TypeScript error at the final fallthrough: the code assumed everything remaining after narrowing 'card'/'multi-choice-card'/'escape-block' was `ActionOutput`, but now 5 new action variant types are also possible.

**Fix:** Added explicit `if (output.type === 'action')` guard. The 5 new variants fall through to `{ kind: 'text-passthrough' }` per Q-MBT11A-1=b (IPC routing deferred to Round 6).

---

## §V — §3.22 cross-session results

| Branch | schema.ts modified from base? | orchestrator-card.tsx modified from base? |
|---|---|---|
| mbt11b-worktree | NO (0 diff lines) | NO (0 diff lines) |
| mbt13-worktree | NO (0 diff lines) [CLOSED re-dispatch session] | NO (0 diff lines) |

No cross-session conflict. Zero merge risk on both files.

mbt11b-worktree status: closed (WB2 findings doc committed at 2081f36). Ladder shipped `approval-decision.ts` type + stubs only (not schema.ts territory).

---

## §VI — Acceptance verification summary

```
dispatch-core test:  196/196 GREEN (26 files)
  v3-schema probes:  53 tests across probe-01 through probe-06 — all GREEN
dispatch-web test:   320/320 GREEN (52 files)
  MB-T11-A probes:   39 tests across 6 probe files — all GREEN
  MB-T07 non-reg:    48 tests — all GREEN (approvalRequired is purely additive)
5-package typecheck: ALL CLEAN (dispatch-core, daemon, workstation, cli, web)
```

---

## §VII — IPC deferral scope

The 5 new action variant types are recognized by `OrchestratorOutputSchema` and rendered by `OrchestratorCard`. IPC routing (actual invocation of each action when the orchestrator fires one) is deferred to Round 6 per Q-MBT11A-1=b:

| Action variant | Router disposition | IPC wiring status |
|---|---|---|
| send-prompt-to-session | text-passthrough | Deferred (Round 6) |
| spawn-session | text-passthrough | Deferred (Round 6) |
| kill-session | text-passthrough | Deferred (Round 6) |
| pull-handoff-from-session | text-passthrough | Deferred (Round 6) |
| assign-task | text-passthrough | Deferred (Round 6) |

---

## §VIII — Outcome classification

**Improved (additive schema + rendering capability)** — 5 new OrchestratorOutput action variants shipped in schema and card; 12/12 probes GREEN; 5-package typecheck clean; no regressions. IPC routing deferred to Round 6 by operator arbitration — not a limitation of the implementation, a scoped boundary.

---

## §IX — Followups filed

| ID | Tier | Summary |
|---|---|---|
| MB-F-T11A-IPC-ROUTING-ROUND-6 | 2 | 5 new action variants return text-passthrough in router; IPC wiring deferred |
| MB-F-T11A-SCHEMA-FORWARD-REF-PATTERN | 3 | Forward-reference template for future §3 extensions |
