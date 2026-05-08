# MB-T11-A Phase 1 Decisions
**Session:** Round 5 Terminal 1 — mbt11a-worktree
**Date authored:** 2026-05-07
**Base SHA:** f397ca0

Operator arbitrates each Q-MBT11A-N below. Default dispositions are CC best-effort;
operator ack at HALT 0 converts each to operative disposition.

---

## Q-MBT11A-1 — OrchestratorOutputTypeEnum: extend or leave frozen?

**Context:** `OrchestratorOutputTypeEnum` (§1) is a frozen zone. Its values are
`'action' | 'card' | 'multi-choice-card' | 'escape-block' | 'noop'`. The 5 new discriminated
union members use `type` literals NOT in this enum ('send-prompt-to-session', 'spawn-session',
'kill-session', 'pull-handoff-from-session', 'assign-task'). The enum is consumed by
`OrchestratorAuditRowSchema.output_type` (§5, chat audit). The swarm-action audit
(`OrchestratorSwarmAuditRowSchema` §13) is a separate table using `ApprovalActionTypeEnum`.

**Analysis:** The new action variant types are swarm actions, not chat-panel output types.
The chat audit (`orchestrator_audit`) tracks operator approve/decline of orchestrator chat output
(cards, multi-choice, escape-blocks). The swarm audit (`orchestrator_swarm_audit`) tracks
action-firing events. The two audit tables are semantically distinct. When a swarm action
requires approval, the approval surface IS a `CardOutput` (type: 'card') — still within the
existing `OrchestratorOutputTypeEnum`. The new action variant schemas are the INPUT to the
card-surface decision, not the card itself.

**Default disposition (b):** Do NOT extend `OrchestratorOutputTypeEnum` in §1.
The 5 new action variant schemas live in §14 alongside their own type literals. §1 remains
unchanged (zero modification to frozen zone). The semantic gap is intentional — the enum
covers chat-panel output surface types; the new action variants are pre-card orchestrator
decisions, audited via §13's swarm audit table.

**Confidence:** [MODELED] from schema structure + audit table separation.

---

## Q-MBT11A-2 — Additive extension of OrchestratorOutputSchema at §3

**Context:** `OrchestratorOutputSchema` is defined in §3 (line 239-246). Extending its
discriminated union to include 5 new members requires modifying that definition. §3 is within
the CLAUDE.md §1 frozen zone coverage (§1-§13). However, CONDUCTOR_V3_RESCOPE_DRAFT.md §5
explicitly states: "Re-scope ADDS new discriminated-union members to OrchestratorOutputSchema.
Does NOT modify existing schemas." The Round 5 prompt (§1 in scope, §0.1 frozen-contract caveat)
says: "you EXTEND additively, never modify existing zones."

**Analysis:** There is a tension between "frozen zone §1-§13 = no modification" and the
RESCOPE_DRAFT's explicit authorization to add members. Resolution: the frozen-zone constraint
protects EXISTING schema SHAPES from modification. Adding new union members to a discriminated
union is additive — existing consumers of `OrchestratorOutput` see no breaking change (they
handle the cases they know about; the new variants are narrowed by the `type` discriminator).
TypeScript discriminated union extension is backward-compatible. The RESCOPE_DRAFT (operator-
authored) is the authoritative decision that this extension is in scope.

**Default disposition:** Proceed with additive extension of `OrchestratorOutputSchema` at §3.
The 5 new variant schema definitions live in a new §14 section. The §3 union definition is
amended ONLY by appending new members — existing members and their schema shapes are unchanged.

If operator disagrees: alternative is a new `OrchestratorOutputExtendedSchema` in §14 that
re-declares the full union. This breaks consumer type-narrowing against `OrchestratorOutput`
type (they'd need to import from a different symbol). Not recommended.

**Confidence:** [MODELED] — requires operator ack to proceed.

---

## Q-MBT11A-3 — Card component package: dispatch-web vs. dispatch-workstation

**Context:** Prompt specifies `dispatch-workstation/src/coarchitect/orchestrator-card.tsx`.
Actual file: `dispatch-web/src/orchestrator-cards/orchestrator-card.tsx`. Confirmed via
`find` tool. The `dispatch-workstation/src/coarchitect/` directory contains `chat-panel.tsx`,
`chat-bubble.tsx`, `spawned-list.tsx`, `quick-pick-buttons.tsx` — NO `orchestrator-card.tsx`.

**Default disposition:** Follow the actual file location. Card extension work targets:
- `dispatch-web/src/orchestrator-cards/orchestrator-card.tsx` (extend component)
- `dispatch-web/test/` (flat test directory; probes live here)
- dispatch-web vitest config applies (`.test.{ts,tsx}`, happy-dom environment)

The prompt's path is [INACCURATE]. This is a §3.1 anti-fabrication finding surfaced at HALT 0.
The WB3/WB4 probe locations in the prompt are updated per actual package layout.

**Confidence:** [KNOWN].

---

## Q-MBT11A-4 — Probe naming convention for dispatch-web card tests

**Context:** Prompt specifies `probe-NN-orchestrator-card-*.spec.tsx` in
`dispatch-workstation/test/unit/coarchitect/`. Actual conventions:
- dispatch-web vitest config glob: `test/**/*.test.{ts,tsx}` — `.spec.*` files NOT included
- Existing dispatch-web card tests: `mb-t07-card-renders.test.tsx`, `mb-t07-approve-fires-action.test.tsx` (flat, `mb-t07-` prefix, `.test.tsx`)

**Default disposition:** Use dispatch-web conventions:
- Location: `packages/dispatch-web/test/`
- Extension: `.test.tsx`
- Naming: `mb-t11a-orchestrator-card-{variant}-render.test.tsx` + `mb-t11a-orchestrator-card-approval-required-indicator.test.tsx`

6 probes replacing the 6 prompt-specified dispatch-workstation probe targets.

**Confidence:** [KNOWN] from vitest config + test directory inventory.

---

## Q-MBT11A-5 — New action variant schema field shapes

**Context:** The 5 new variant schemas need field definitions. The card rendering requirements
per prompt §1.4 determine the minimum set. Existing `ActionOutputSchema` has:
`{type, action, target, payload, rationale, build_doc_commit_sha}`.

**Default disposition — field set:**

```
SendPromptToSessionOutputSchema:
  type: z.literal('send-prompt-to-session')
  sessionName: z.string().min(1)
  prompt: z.string().min(1)
  envelope: SendPromptEnvelopeSchema.optional()     // reuse §10 shape
  rationale: z.string().min(1)
  // NO build_doc_commit_sha: these are direct session actions, not build-doc-gated

SpawnSessionOutputSchema:
  type: z.literal('spawn-session')
  sessionName: z.string().min(1)
  repoPath: z.string().min(1)
  initialPrompt: z.string().optional()              // for initial-prompt preview in card
  rationale: z.string().min(1)

KillSessionOutputSchema:
  type: z.literal('kill-session')
  sessionName: z.string().min(1)
  reason: z.string().optional()
  rationale: z.string().min(1)

PullHandoffFromSessionOutputSchema:
  type: z.literal('pull-handoff-from-session')
  sessionName: z.string().min(1)
  rationale: z.string().min(1)

AssignTaskOutputSchema:
  type: z.literal('assign-task')
  sessionName: z.string().min(1)
  taskDescription: z.string().min(1)
  parameters: z.record(z.string(), z.unknown()).optional()  // parameter table for card
  rationale: z.string().min(1)
```

All schemas use `.strict()`. `build_doc_commit_sha` is NOT included (these are swarm action
types, not build-doc-gated orchestrator chat outputs; the field applies to §3 chat-output
types which derive from build-doc context). If operator requires `build_doc_commit_sha`,
surface as amendment before WB2.

**Confidence:** [MODELED] from §1.4 card rendering spec + existing schema convention.

---

## Q-MBT11A-6 — OrchestratorCard prop extension pattern

**Context:** Current `OrchestratorCardProps.card: CardOutput | MultiChoiceCardOutput`.
MB-T11-A needs the component to also render the 5 new action variant types.

**Default disposition:** Extend `OrchestratorCardProps.card` prop union:

```typescript
card: CardOutput | MultiChoiceCardOutput
    | SendPromptToSessionOutput | SpawnSessionOutput | KillSessionOutput
    | PullHandoffFromSessionOutput | AssignTaskOutput;
```

Add new `approvalRequired?: boolean` prop (optional for backward compat; defaults to false
behavior if omitted — "fires automatically" indicator shown only when `approvalRequired === true`).

New variant rendering: switch on `card.type` literal for the 5 new types; existing card/multi-choice
handling unchanged. New action variants render in a new `ActionVariantBody` sub-component family
(one per variant, all sharing the existing card tint + border convention).

**Confidence:** [MODELED] from existing component pattern.

---

## §2 — Operative ladder with corrected probe locations

Per dispositions above (pending operator ack), the corrected WB ladder:

**WB1 RED:** Author 6 dispatch-core `.test.ts` probes + 6 dispatch-web `.test.tsx` probes.
12 total RED targets.

**WB2 GREEN — schema:** Add §14 to `dispatch-core/src/v3/schema.ts`. Extend `OrchestratorOutputSchema`
at §3 with 5 new members. Run dispatch-core probes + typecheck all 5 packages (per consumer
non-regression memory entry).

**WB3 GREEN — card rendering:** Extend `dispatch-web/src/orchestrator-cards/orchestrator-card.tsx`
with action variant rendering. Run dispatch-web card render probes.

**WB4 GREEN — approval-required indicator:** Add `approvalRequired` prop + visual indicator.
Run approval-required indicator probe. Full dispatch-web test suite.

**WB5 docs + closure:** Findings doc + decisions doc + FOLLOWUPS.md amendments + forward-
propagation memory. §3.22 mandatory pre-WB5 cross-session check.

---

## §3 — Frozen-contract caveat acknowledgment

Per prompt §1 and §0.1:

> If mid-WB you discover that extending `OrchestratorOutputSchema` requires modifying an
> existing zone (not just appending variants to the discriminated union), halt and surface.

Q-MBT11A-2 surfaces this pre-WB1. The planned extension (append to §3 union + add §14 section)
is additive. If during WB2 implementation a hidden dependency on an existing frozen zone
surface is found, halt immediately per §3.4.
