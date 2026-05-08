# MB-T11-A Phase 1 Diagnose
**Session:** Round 5 Terminal 1 — mbt11a-worktree
**Date authored:** 2026-05-07 (session run date; prompt specified 2026-05-08)
**Base SHA:** f397ca0

---

## §1 — Current state of OrchestratorOutputSchema

**File:** `packages/dispatch-core/src/v3/schema.ts` (read FULL at HEAD f397ca0) [KNOWN]

### Discriminated union (§3, lines 239-246)

```typescript
export const OrchestratorOutputSchema = z.discriminatedUnion('type', [
  ActionOutputSchema,           // type: 'action'
  CardOutputSchema,             // type: 'card'
  MultiChoiceCardOutputSchema,  // type: 'multi-choice-card'
  EscapeBlockOutputSchema,      // type: 'escape-block'
]);
export type OrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;
```

**Discriminator field:** `type` (z.literal per variant)
**Existing variants:** 4 (`action`, `card`, `multi-choice-card`, `escape-block`)
**5 new action variants:** NOT present [KNOWN]

### §12 already on main (MB-T11 original — merged before Round 5 base)

The schema at HEAD already contains §12 (lines 814-968):
- `SendPromptActionPayloadSchema` + type
- `SpawnSessionActionPayloadSchema` + type
- `KillSessionActionPayloadSchema` + type
- `PullHandoffActionPayloadSchema` + type
- `AssignTaskActionPayloadSchema` + type
- `WorkstationSessionKillRequestSchema` + type
- `pickPayloadSchema(actionType: ActionType): z.ZodTypeAny` function

These are **second-pass payload validators** used by `orchestrator-action-handler.ts` after
the first-pass `OrchestratorOutputSchema.parse()`. The discriminated union itself was NOT
extended by MB-T11 original — payload validation is separate from the union shape.

### §13 already on main (MB-T13 — merged before Round 5 base)

Schema at HEAD contains §13 (lines 970-1157):
- `ApprovalPolicyEnum`, `ApprovalActionTypeEnum`
- `ApprovalPolicyRowSchema`, `ApprovalPolicyGetResponseSchema`, `ApprovalPolicyPutRequestSchema`
- `OrchestratorSwarmAuditRowSchema`, `OrchestratorSwarmAuditWriteRequestSchema`
- `OrchestratorSwarmAuditQuerySchema`, `OrchestratorSwarmAuditQueryResponseSchema`

**Implication:** MB-T11-A's §14 (new action variant discriminated union members) is the NEXT
section after §13. Sections §1-§13 are all frozen zones per CLAUDE.md §1.

### Export pattern (KNOWN)

Per §1-§13 convention: `export const XxxSchema = z.object({...}).strict()` + `export type Xxx = z.infer<typeof XxxSchema>`. All schemas use `.strict()`. New schemas must follow this pattern.

### OrchestratorOutputTypeEnum (§1, frozen)

Current values: `'action' | 'card' | 'multi-choice-card' | 'escape-block' | 'noop'`

The 5 new action variants ('send-prompt-to-session', 'spawn-session', etc.) introduce `type`
values NOT in this enum. The enum is used at `OrchestratorAuditRowSchema.output_type` (§5,
chat audit). The swarm audit (`OrchestratorSwarmAuditRowSchema` §13) uses
`ApprovalActionTypeEnum` for `action_type` — a separate surface.

**Design finding:** The new action variants DO NOT need to be in `OrchestratorOutputTypeEnum`
because they are swarm-action variants (audited by `orchestrator_swarm_audit` via §13), not
chat-panel output variants (audited by `orchestrator_audit` via §5). [MODELED — see Q-MBT11A-1]

---

## §2 — Current state of OrchestratorCard

**Prompt-specified path:** `dispatch-workstation/src/coarchitect/orchestrator-card.tsx`
**Actual path:** `dispatch-web/src/orchestrator-cards/orchestrator-card.tsx` [KNOWN via find]

**§3.1 anti-fabrication surface:** This is a file path contradiction between the prompt and
actual code. Per §3.18, this is surfaced to operator at HALT 0. The card component lives in
`dispatch-web`, not `dispatch-workstation`. All card-rendering work for MB-T11-A targets
`dispatch-web`.

### Current OrchestratorCard state (KNOWN — full file read)

**Props:**
```typescript
export interface OrchestratorCardProps {
  card_id: string;
  card: CardOutput | MultiChoiceCardOutput;   // union — no action variants yet
  superseded_card_ids?: ReadonlyArray<string>;
  is_stale?: boolean;
  is_dismissed?: boolean;
  onApprove?: (free_form_text: string) => void;
  onDecline?: (reason: string) => void;
  onMultiChoiceSelect?: (selected_index: number, free_form_text: string | null) => void;
}
```

**Variant switch logic:** `card.type === 'card'` → `CardVariant`; else → `MultiChoiceVariant`

**NO** action variant switch exists. **NO** `approvalRequired` prop exists.

**Existing styling conventions:**
- Orchestrator card tint: `bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800`
- Stale: `opacity-60 grayscale`
- Dismissed: `opacity-50` + `DismissedBody` with "Declined" badge
- Pills: Approve (green), Decline (red)
- State-mutating actions: Approve gated on non-empty free-form
- Read-only actions: Approve ungated (`READ_ONLY_ACTIONS` set containing `'read-file'`)

**Approval-required indicator convention:** NOT established (no existing pattern — new for MB-T11-A).

---

## §3 — Test config divergence (KNOWN)

### dispatch-core
- Config: `packages/dispatch-core/vitest.config.ts`
- Glob: `test/**/*.test.{ts,tsx}` (`.test.ts` and `.test.tsx` only; NO `.spec.*`)
- Environment: `node` (default)

### dispatch-workstation
- Config: `packages/dispatch-workstation/vitest.config.ts`
- Glob: `test/**/*.{test,spec}.{ts,tsx}` (accepts both `.test.*` and `.spec.*`)
- Environment: `node` (default; per-file override with `// @vitest-environment happy-dom`)

### dispatch-web
- Config: `packages/dispatch-web/vitest.config.ts`
- Glob: `test/**/*.test.{ts,tsx}` (`.test.ts` and `.test.tsx` only; NO `.spec.*`)
- Environment: `happy-dom` (global)

**Round 4 evidence MB-F-CLAUDE-MD-3-6-TEST-NAMING-DIVERGENCE confirmed** for dispatch-core.
dispatch-web shares the same `.test.*`-only restriction.

---

## §4 — Probe file naming and location

### dispatch-core probes (schema Zod parse tests)

**Directory:** `packages/dispatch-core/test/unit/v3-schema/` (NEW — does not exist yet)
**Extension:** `.test.ts` (per vitest config)
**Naming:** `probe-NN-action-variant-*.test.ts` per prompt §3
**Starting NN:** `01` (no existing probes in this new directory)

6 probes:
- `probe-01-action-variant-send-prompt.test.ts`
- `probe-02-action-variant-spawn-session.test.ts`
- `probe-03-action-variant-kill-session.test.ts`
- `probe-04-action-variant-pull-handoff.test.ts`
- `probe-05-action-variant-assign-task.test.ts`
- `probe-06-orchestrator-output-discriminated-union.test.ts`

### dispatch-web probes (React card render tests)

**Directory:** `packages/dispatch-web/test/` (flat — NO `unit/` subdirectory exists)
**Extension:** `.test.tsx` (per vitest config; NOT `.spec.tsx`)
**Naming convention:** existing MB-T07 card tests use `mb-t07-*.test.tsx` pattern (NOT `probe-NN`)
**Proposed naming:** `mb-t11a-orchestrator-card-*.test.tsx` (consistent with existing convention)

See Q-MBT11A-3: prompt specifies `dispatch-workstation/test/unit/coarchitect/probe-NN-*.spec.tsx`
but both package AND extension are wrong given actual file locations and vitest configs.

6 probes (dispatch-web):
- `mb-t11a-orchestrator-card-send-prompt-render.test.tsx`
- `mb-t11a-orchestrator-card-spawn-session-render.test.tsx`
- `mb-t11a-orchestrator-card-kill-session-render.test.tsx`
- `mb-t11a-orchestrator-card-pull-handoff-render.test.tsx`
- `mb-t11a-orchestrator-card-assign-task-render.test.tsx`
- `mb-t11a-orchestrator-card-approval-required-indicator.test.tsx`

---

## §5 — §3.22 cross-session check (pre-WB1) [KNOWN]

```
git fetch origin mbt11b-worktree  → success
git fetch origin mbt13-worktree   → success
git log --no-merges origin/mbt11b-worktree...HEAD -- packages/dispatch-core/src/v3/schema.ts
  → empty (no diverging commits)
git log --no-merges origin/mbt13-worktree...HEAD -- packages/dispatch-core/src/v3/schema.ts
  → empty (no diverging commits)
```

**Result:** CLEAN. Both peer branches have zero commits touching `schema.ts` at pre-WB1 check.
Will re-run pre-WB5 per §6 mandatory protocol.

---

## §6 — /mnt/project path substitution [KNOWN]

Prompt references `/mnt/project/v3-tickets-amendment.md` and `/mnt/project/CONDUCTOR_V3_RESCOPE_DRAFT.md`.
These paths do not exist on this machine. Same files available at `~/Downloads/`. Both were read
from `~/Downloads/`. No semantic gap detected between the referenced content and the files read.

§3.18 minor surface: logged here. Not a blocker.

---

## §7 — Q-MBT11A-N list (Phase 1 questions)

| ID | Question | Source | Blocking? |
|----|----------|--------|-----------|
| Q-MBT11A-1 | Should `OrchestratorOutputTypeEnum` (§1, frozen) be extended with the 5 new action type values? | §1 enum vs. new discriminated union member `type` literals | No — see decisions doc for default (b) |
| Q-MBT11A-2 | Is additive extension of `OrchestratorOutputSchema` at §3 (add 5 new discriminated union members) within frozen-zone rules? | CLAUDE.md §1 frozen: §1-§13; RESCOPE_DRAFT §5: "ADDS new discriminated-union members" | YES — required clarification before WB2 |
| Q-MBT11A-3 | OrchestratorCard is in `dispatch-web`, not `dispatch-workstation/src/coarchitect/`. Does MB-T11-A proceed in dispatch-web? | Prompt path vs. actual file location | YES — affects all WB3/WB4 probe locations |
| Q-MBT11A-4 | Probe naming/extension: dispatch-web convention is `mb-t11a-*.test.tsx` (not `probe-NN-*.spec.tsx` as prompt specifies). Proceed with dispatch-web convention? | vitest config + existing test file evidence | YES — affects WB1 RED scaffold |
| Q-MBT11A-5 | New action variant schema field shapes — specifically: (a) include `build_doc_commit_sha` per existing ActionOutputSchema pattern? (b) `assign-task.parameters` type: record vs. structured array? | Card rendering §1.4 requirements | No — see decisions doc for defaults |
| Q-MBT11A-6 | Does `dispatch-web/src/orchestrator-cards/orchestrator-card.tsx` card prop union need to accept the 5 new action variant types, or are new action variants only consumed by a new companion component? | OrchestratorCardProps current definition | No — see decisions doc for default |

---

## §8 — FOLLOWUPS.md relevant rows

Scanned for MB-T11-A impact [KNOWN]:

- `MB-F-T11-T13-ACTION-TYPE-ENUM-DEDUP` — post-merge dedup of `ApprovalActionTypeEnum` (§13) vs §12 `ActionType`. NOT a blocker for MB-T11-A; §14's new schemas use their own type literals as discriminators, not ActionTypeEnum.
- `MB-F-T11-T13-RESOLVER-STUB` — CLOSED 2026-05-07. Resolver shim is live. MB-T11-A's card `approvalRequired` is a render-prop from MB-T11-B; no resolver involvement in MB-T11-A.
- `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` — pre-existing workstation unit test failure. Does NOT affect dispatch-web or dispatch-core probes for MB-T11-A.

No FOLLOWUPS.md rows block MB-T11-A scope or require scope changes.

---

## §9 — Memory directory

`~/.claude/projects/-Users-joshuatseppich-Desktop-Automata-foxworks-dispatch-mbt11a/memory/` — does not exist (first session on this worktree path).

Parent project memory at `~/.claude/projects/-Users-joshuatseppich-Desktop-Automata-foxworks-dispatch/memory/` has 3 entries:
- `feedback_ladder_internal_three_source.md` — re-run Phase-1 spike at WB1 + WB-final
- `feedback_consumer_non_regression_per_wb.md` — run consumer probes at every WB
- `feedback_followup_row_as_forward_propagation_memory.md` — file reusable patterns as Tier 3 followups

**Applied to MB-T11-A:** dispatch-core consumer packages (dispatch-workstation, dispatch-daemon, dispatch-web) should be typechecked after WB2 schema additions (not just at WB-final).
