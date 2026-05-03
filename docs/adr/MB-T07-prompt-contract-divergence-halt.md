# MB-T07 — halt-and-surface on prompt-vs-contract divergence

**Status:** HALT pending operator arbitration. MB-T07 implementation work
has NOT begun pending resolution; only the procedural session-start
commit (`34ad9e4`) and this halt artifact have landed on
`session-B/mb-t07`.

**Authority chain:**

- Frozen contract: `WORKSTATION_CONTRACT.md` (frozen at `cf1848a`),
  specifically §5 (card UI surface) and §6 (`/v3/*` endpoints).
- Frozen runtime schema: `packages/dispatch-core/src/v3/schema.ts`
  (operator-arbitrated freeze anchor at commit `232fbaa`, per
  `WORKSTATION_CONTRACT.md` §2.2 — "the runtime schema is the source
  of truth for runtime validation").
- Frozen ticket spec: `docs/build-docs/V3_TICKETS.md` MB-T07 lines
  194–204.
- Frozen daemon contract: `CONDUCTOR_API_CONTRACT.md` (frozen at
  v2.2.0) §4.6 (coordinated `/v3/*` surface).
- Frozen system prompt: `packages/dispatch-workstation/coarchitect/system-prompt.md`
  (operator-authored, frozen as contract artifact per ratified
  P-0.4 Q6).
- Ticket prompt: MB-T07 (operator-relay-issued in this session,
  2026-05-02).
- Cairn primitives: `cairn.md` §3.4 frozen-contract respect, §3.7
  halt discipline, §3.1 anti-fabrication.
- Per session-prompt CAIRN DISCIPLINE clause: "Halt discipline: if
  you encounter ambiguity in proposal endpoint semantics (does
  /v3/orchestrator/proposals exist? what's the streaming protocol?),
  halt and surface".
- Precedent: cairn-findings #64 (CONSOLE-T02 direction halt,
  2026-05-02 mid-Batch-2) — relay-drafted ticket prompts that
  contradicted frozen vision; halt-discipline + §3.4 caught it
  before any code shipped.

**Date:** 2026-05-02

---

## §1 — The contradiction

The MB-T07 ticket prompt specifies a REST proposal surface, a
WebSocket proposal-stream protocol, a `Proposal` shape, a separate
"Orchestrator Proposals" lane, and an Accept/Reject + optimistic
`proposed → in-progress → complete` status state machine. None of
these surfaces exist in the frozen contracts or the frozen runtime
schema. They also contradict the frozen V3_TICKETS.md MB-T07 spec.

### §1.1 What the MB-T07 prompt asks for (verbatim)

```
RED cluster 2 — proposal data fetch + state:
- test_proposals_fetch_from_orchestrator.spec.ts: ProposalsLane
  component mounts, asserts fetch call to GET /v3/orchestrator/proposals
  (or whatever endpoint exists per CONDUCTOR_API_CONTRACT.md §4.6 —
  verify endpoint exists; if not, surface as followup).
- test_proposals_render_as_cards.spec.ts: fetch returns 3 proposals,
  asserts 3 ProposalCard components rendered.
- test_proposals_empty_state.spec.ts: fetch returns 0 proposals,
  asserts empty-state message rendered.

RED cluster 3 — accept/reject IPC:
- test_accept_invokes_endpoint.spec.ts: Accept button clicked,
  asserts POST /v3/orchestrator/proposals/:id/accept (or per contract —
  verify endpoint exists; surface if missing).
- test_reject_invokes_endpoint.spec.ts: Reject button clicked,
  asserts POST /v3/orchestrator/proposals/:id/reject.
- test_action_optimistic_status_update.spec.ts: Accept clicked,
  status badge updates optimistically to "in-progress" before server
  response.

RED cluster 4 — proposal stream (live updates):
- test_proposal_added_via_stream.spec.ts: WebSocket or SSE event
  'proposal:created' received, asserts new ProposalCard appears in
  lane.
- test_proposal_status_changed_via_stream.spec.ts:
  'proposal:status-changed' event, asserts existing card status
  updates.
- test_proposal_removed_via_stream.spec.ts: 'proposal:removed'
  event, asserts card disappears.
```

The prompt also asserts:

> "Proposal structure (from orchestrator-system-prompt.md):
> orchestrator emits proposals with shape `{id, title, description,
> action_type, target, status (proposed|accepted|rejected|in-progress|complete),
> metadata}`."

And:

> "MB-T07 adds an 'Orchestrator Proposals' lane (or a separate
> Proposals view, your design choice — surface to operator if
> uncertain) where each proposal renders as a card with accept/reject
> buttons."

### §1.2 What the frozen contracts and schema actually say

#### §1.2.a `WORKSTATION_CONTRACT.md` §6 — `/v3/*` endpoint enumeration

`WORKSTATION_CONTRACT.md` §6 is the authoritative list of `/v3/*`
endpoints. It enumerates exactly the following:

- §6.1 `POST /v3/orchestrator/messages`,
  `GET /v3/orchestrator/history`,
  `DELETE /v3/orchestrator/history`.
- §6.2 `POST /v3/orchestrator/audit`,
  `GET /v3/orchestrator/audit`.
- §6.3 `POST /v3/tickets/state`,
  `GET /v3/tickets/state`,
  `GET /v3/tickets/state/:ticket_id`.
- §6.4 cross-reference: orchestrator-fired actions route to existing
  `/v2/*` endpoints (no new REST resource for proposals).

There is **no** `/v3/orchestrator/proposals` resource. There is **no**
`/v3/orchestrator/proposals/:id/accept`. There is **no**
`/v3/orchestrator/proposals/:id/reject`. Repo-wide grep confirms zero
references to either (verified 2026-05-02 against
`session-B/mb-t07` worktree at HEAD `34ad9e4`).

#### §1.2.b `CONDUCTOR_API_CONTRACT.md` §4.6 — WS surface

§4.6 line 177 (verbatim):

> **WebSocket.** v3.0 ships with no `/v3/*` WS endpoints. The existing
> `/v2/events/stream` endpoint remains the sole real-time channel;
> orchestrator IPC for the embedded webview rides the existing v2 WS
> stream where applicable.

There is no `proposal:created` / `proposal:status-changed` /
`proposal:removed` WS event surface. The prompt's RED cluster 4 wires
to a stream protocol that does not exist.

#### §1.2.c `WORKSTATION_CONTRACT.md` §7.1 — IPC schemas

§7.1 enumerates the directional IPC unions for the embedded webview.
The actual proposal-delivery surface is IPC, not REST:

**Shell → Webview (`ShellToWebviewMessageSchema`):**
- `orchestrator-card-rendered` — new card to display.
- `orchestrator-card-superseded` — mark prior cards stale with lineage.
- `orchestrator-card-update` — card content changed (rare).
- `escape-block-surfaced`, `daemon-state-update`, `settings-changed`.

**Webview → Shell (`WebviewToShellMessageSchema`):**
- `card-approved` — operator clicked Approve with optional free-form
  modification.
- `card-declined` — operator clicked Decline with required reason.
- `multi-choice-selected`, `escape-block-copied`,
  `kanban-filter-changed`.

The contract terms are "Approve / Decline" (vision §7.4 + ratified
P-0 leftover Q3), not "Accept / Reject". The contract direction is
IPC `webContents.send` / `ipcRenderer` (per COARCH-T03 chat-panel
precedent), not REST POST.

#### §1.2.d `dispatch-core/src/v3/schema.ts` — proposal/card shape

The frozen v3 runtime schema defines the actual shapes. Verbatim:

```ts
export const CardOutputSchema = z
  .object({
    type: z.literal('card'),
    action: ActionTypeEnum,
    target: z.string().min(1),
    payload: z.unknown().optional(),
    rationale: z.string().min(1),
    free_form_prompt: z.string().min(1),
    superseded_card_ids: z.array(z.string()).default([]),
    build_doc_commit_sha: z.string().min(1),
  })
  .strict();

export const MultiChoiceCardOutputSchema = z
  .object({
    type: z.literal('multi-choice-card'),
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
    rationale: z.string().min(1),
    build_doc_commit_sha: z.string().min(1),
    superseded_card_ids: z.array(z.string()).default([]),
  })
  .strict();
```

There is no `id`, `title`, `description`, `status`, or `metadata`
field on the card. There is no
`proposed | accepted | rejected | in-progress | complete` status
enumeration on the card.

Card lifecycle is captured separately, in the audit row, via
`OperatorResponseEnum` (`approve | decline | multi-choice-A..D |
copied-escape-block | pending`) and `StalenessStatusEnum`
(`current | stale | superseded`). The `card_id` for IPC referencing
is supplied by the
`OrchestratorCardRenderedMessage` envelope, not the card payload
itself:

```ts
const OrchestratorCardRenderedMessage = z
  .object({
    type: z.literal('orchestrator-card-rendered'),
    card_id: z.string().min(1),
    card: z.discriminatedUnion('type', [
      CardOutputSchema,
      MultiChoiceCardOutputSchema,
    ]),
  })
  .strict();
```

#### §1.2.e `WORKSTATION_CONTRACT.md` §5.5 — column placement

§5.5 (verbatim):

> Orchestrator-proposed cards live in the existing dispatch-web kanban
> columns (AWAITING REVIEW for new proposals; STALE for superseded;
> etc.) with the visual distinction per §5.2. **No dedicated
> "PROPOSALS" column in v3.0.** Operator can filter via existing
> filter dropdowns to "orchestrator proposals only" if needed.

The MB-T07 prompt's "Orchestrator Proposals lane" / "ProposalsLane
component" contradicts §5.5 directly. dispatch-web already has the
four-status kanban (`awaiting_review`, `stale`, `running`, `idle`)
plus optional `archived`; orchestrator cards plug into the existing
columns, not a new lane.

#### §1.2.f `V3_TICKETS.md` MB-T07 — named tests

V3_TICKETS.md lines 202–204:

> Red: `test_card_renders.spec.ts`, `test_approve_fires_action.spec.ts`,
> `test_decline_dismisses.spec.ts`,
> `test_multi_choice_routes.spec.ts`,
> `test_stale_card_rolls_over.spec.ts`.
> Green: implement card React components in dispatch-web, IPC
> protocol shell ↔ webview for card events, audit-log writes per
> locked vision §7.8.

The frozen ticket spec names five RED tests aligned with the
contract-frozen vocabulary (Approve/Decline, IPC, multi-choice,
stale-rollover, audit-log writes). The MB-T07 prompt's thirteen
RED tests across five clusters do not name any of these; they
specify a different surface entirely.

### §1.3 Per-axis reconciliation

| Axis                     | Frozen contract / schema authority                                                  | MB-T07 prompt assertion                                          | Match? |
|--------------------------|-------------------------------------------------------------------------------------|------------------------------------------------------------------|--------|
| Delivery transport       | IPC (`orchestrator-card-rendered`, etc.) per WC §7.1 + v3/schema.ts                 | REST `GET /v3/orchestrator/proposals` (cluster 2)                | **NO** |
| Approval transport       | IPC `card-approved` / `card-declined` per WC §7.1 + v3/schema.ts                    | REST `POST .../accept`, `POST .../reject` (cluster 3)            | **NO** |
| Live-update protocol     | `/v2/events/stream` only per CONDUCTOR_API §4.6; v3.0 ships no `/v3/*` WS           | WebSocket `proposal:created` / `:status-changed` / `:removed`    | **NO** |
| Card payload shape       | `CardOutput` / `MultiChoiceCardOutput` in v3/schema.ts                              | `{id, title, description, action_type, target, status, metadata}`| **NO** |
| Card lifecycle status    | `OperatorResponseEnum` + `StalenessStatusEnum` on audit row                         | Card-side status `proposed|accepted|rejected|in-progress|complete`| **NO** |
| Approval vocabulary      | Approve / Decline per WC §5.3 + vision §7.4                                         | Accept / Reject (clusters 1 + 3)                                 | **NO** |
| Free-form field          | Required free-form (Decline; state-mutating Approve) per WC §5.3                    | Not mentioned anywhere                                           | **NO** |
| Multi-choice card        | 2–4 dynamic options per v3/schema.ts MultiChoiceCardOutputSchema                    | Not mentioned anywhere                                           | **NO** |
| Stale rollover           | Visual-on-card `superseded_card_ids` per WC §5.4                                    | Not mentioned anywhere                                           | **NO** |
| Column placement         | Existing AWAITING REVIEW / STALE columns per WC §5.5                                | New "Orchestrator Proposals" lane                                | **NO** |
| Named RED tests          | `test_card_renders`, `test_approve_fires_action`, etc. per V3_TICKETS.md MB-T07     | `test_proposal_card_renders`, `test_accept_invokes_endpoint`, etc.| **NO** |

Eleven of eleven axes diverge. Three axes that the prompt omits
entirely (free-form field, multi-choice, stale rollover) are
explicitly named in the frozen V3_TICKETS.md MB-T07 acceptance
surface. The prompt is not a near-miss requiring minor inference; it
is a substantively different ticket from the V3_TICKETS.md MB-T07
that the operator ratified.

### §1.4 Why this is not inferable

The prompt itself says (verbatim):

> "Halt discipline: if you encounter ambiguity in proposal endpoint
> semantics (does /v3/orchestrator/proposals exist? what's the
> streaming protocol?), halt and surface".
>
> "Anti-fabrication: every claim about orchestrator endpoint behavior
> cites either CONDUCTOR_API_CONTRACT.md §4.6 or working test".
>
> "Frozen contract respect: do NOT modify any frozen contract".

`/v3/orchestrator/proposals` does not exist (verified §1.2.a). The
v3 streaming protocol for proposals does not exist (verified
§1.2.b). Picking the prompt over the frozen surfaces would fabricate
endpoint behavior in violation of the prompt's own anti-fabrication
clause. Picking the frozen surfaces and writing the MB-T07 work
against them would deliver a different ticket than the prompt
specifies — that's a §3.4 frozen-contract scope decision, not a
session call.

This matches finding #64's pattern exactly: relay-drafted ticket
prompt contradicts a frozen vision/contract surface; halt-discipline
fires; session does not infer past the contradiction.

---

## §2 — Three plausible resolutions for operator

The operator-only call per cairn §3.4. The relay can recommend; the
operator decides.

### §2.1 (a) Vision/contract authoritative; relay redrafts the prompt

WORKSTATION_CONTRACT.md §5/§6/§7 + v3/schema.ts + V3_TICKETS.md
MB-T07 stay frozen as ratified. The MB-T07 ticket prompt is
redrafted to align with the frozen surfaces:

- **Delivery:** dispatch-web cards consume IPC
  `orchestrator-card-rendered` / `-superseded` / `-update` from the
  Electron shell via the contextBridge / preload layer (the
  COARCH-T03 chat-panel precedent extended to kanban cards). NOT
  REST + WS.
- **Approval:** dispatch-web emits `card-approved` / `card-declined`
  / `multi-choice-selected` IPC messages back to the shell (the
  shell handles audit-log writes + `/v2/sessions/*` action routing
  per WC §6.4). NOT REST.
- **Card shape:** render `CardOutput` and `MultiChoiceCardOutput`
  from v3/schema.ts (`type, action, target, payload, rationale,
  free_form_prompt, superseded_card_ids, build_doc_commit_sha`).
  NOT a fabricated `Proposal` type.
- **Pills:** Approve (green) / Decline (red) with required free-form
  for Decline (and required free-form for state-mutating Approve
  per ratified P-0 leftover Q3). NOT Accept / Reject + optimistic
  status state machine.
- **Multi-choice variant:** 2–4 dynamic option buttons per
  v3/schema.ts `MultiChoiceCardOutputSchema`.
- **Stale rollover:** visual-on-card `superseded_card_ids` rendering
  per WC §5.4 + vision §7.6 Item B.
- **Column placement:** plug card rendering into the existing
  dispatch-web `KanbanColumn` (`SessionCard.tsx` precedent), with
  the §5.2 visual distinction (subtle blue tint) versus standard
  CC-session cards. NOT a new "Orchestrator Proposals" lane.
- **RED tests:** match V3_TICKETS.md MB-T07 names —
  `test_card_renders.spec.ts`, `test_approve_fires_action.spec.ts`,
  `test_decline_dismisses.spec.ts`,
  `test_multi_choice_routes.spec.ts`,
  `test_stale_card_rolls_over.spec.ts`.

This is the precedent path per finding #64 resolution. No contract
amendment required.

### §2.2 (b) Prompt authoritative; operator amends contract + schema

Operator amends `WORKSTATION_CONTRACT.md` §6 to introduce a
`/v3/orchestrator/proposals` REST resource plus
`/v3/orchestrator/proposals/:id/accept` and `.../reject`. Operator
amends `CONDUCTOR_API_CONTRACT.md` §4.6 to introduce
`/v3/orchestrator/proposals/stream` (or equivalent WS surface). All
amendments are operator-only authoring per cairn §3.4. Operator
also extends `dispatch-core/src/v3/schema.ts` with a `Proposal`
schema:

```ts
export const ProposalSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  action_type: ActionTypeEnum,
  target: z.string().min(1),
  status: z.enum(['proposed', 'accepted', 'rejected',
                  'in-progress', 'complete']),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();
```

Operator either (b.i) amends the existing IPC `orchestrator-card-*`
surface to bridge to the new REST surface, or (b.ii) deprecates the
IPC surface and migrates to REST end-to-end. Either path requires a
contract version bump and an MB-S\* spike to validate that the new
REST surface co-exists with the existing IPC bridge that
COARCH-T03's chat-panel already uses.

This is the most disruptive path. It changes the v3.0 architecture
mid-implementation, three Phase-1 tickets after the schema was
freeze-anchored. Recommended only if the operator concludes that
the prompt's REST + status-state-machine model is meaningfully
better than the IPC + audit-row model already ratified.

### §2.3 (c) Hybrid — keep prompt's territory naming, replace prompt's surface with frozen surface

Build the dispatch-web kanban card surface in
`packages/dispatch-web/src/orchestrator-cards/` (the prompt's named
deliverable territory) but replace every cluster's RED tests with
frozen-contract-aligned tests:

- The directory name `orchestrator-cards/` is preserved (the prompt
  asserts it as the new subdirectory; nothing in the contract
  forbids it).
- Inside, the components consume the actual frozen IPC + schema:
  `OrchestratorCard.tsx` renders `CardOutput` /
  `MultiChoiceCardOutput`; the wiring layer subscribes to
  `orchestrator-card-rendered` via the preload bridge and emits
  `card-approved` / `card-declined` / `multi-choice-selected` back.
- Integration into the existing `KanbanColumn` follows §5.5 — cards
  appear in `awaiting_review` / `stale` columns alongside session
  cards, with the §5.2 blue-tint visual distinction.
- RED tests follow V3_TICKETS.md MB-T07's named tests.

Effectively (a) but preserves the operator-relay-issued territory
choice. Smallest delta from the prompt that still respects the
frozen contracts. No contract amendment required.

---

## §3 — Relay recommendation

Per cairn §3.4 the call is operator-only. The relay recommends (c)
hybrid — preserves the operator-issued territory choice while
respecting eleven of eleven frozen-contract axes. (a) is also clean
and slightly simpler if territory is renegotiated. (b) is
disruptive and not recommended unless the operator has independent
reason to revisit the v3.0 architecture.

The relay further recommends adding a finding entry — provisionally
#66 — to `docs/cairn-findings.md` once the operator arbitrates,
documenting MB-T07 as the second relay-drafted-prompt-vs-frozen
divergence event in v3 work (after #64 CONSOLE-T02). Two events in
two batches suggests the relay's modeled understanding of v3
endpoint surfaces is unreliable enough that future ticket-prompt
drafts in v3 territory should explicitly cross-reference the
endpoint enumeration in WC §6 + the schema discriminated unions in
v3/schema.ts at draft time, not rely on modeled recall.

---

## §4 — Out of scope for this halt

This halt artifact does not pre-judge:

- Which resolution path the operator picks.
- Whether the redrafted prompt should ship in this batch (Batch 5)
  or defer to Batch 6.
- Whether Session B's worktree should remain open for the redraft
  or be closed and reopened on the redraft.
- Whether other Batch 5 sessions (Session A MB-T06, Session C
  MB-T08) are affected — they are in different territories
  (`packages/dispatch-workstation/src/main/spawn-*`,
  `packages/dispatch-workstation/src/onboarding/`,
  `packages/dispatch-workstation/test/smoke/`) and are not impacted
  by the MB-T07 surface question. Both should continue without
  pause.

These are operator calls.

---

## §5 — Procedural facts

- Worktree: `~/Desktop/Automata/foxworks-worktrees/session-B`.
- Branch: `session-B/mb-t07`.
- Pre-halt commits: `34ad9e4` (procedural session-start coord
  append), this halt commit.
- No RED test written. No production code written. No file outside
  `docs/adr/` and `docs/cairn-coordination/batch-5/session-b-mb-t07.md`
  modified.
- Per-path discipline maintained: only this ADR + the coord file
  staged for the halt commit, verified via
  `git diff --cached --stat`.
- No frozen contract file touched.

---

**End of halt artifact.**
