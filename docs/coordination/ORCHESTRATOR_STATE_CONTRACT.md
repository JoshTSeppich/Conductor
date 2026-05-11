---
schema_version: 1
frozen_contract: true
operator_arbitration_required: true
authoring_session: orchestrator-2026-05-10-21:07
authoring_date: 2026-05-11
---

# Orchestrator State Contract v1

**Frozen contract per CLAUDE.md §1.** Schema changes require operator arbitration. CC-delegable: live state INSTANCES conforming to this schema (e.g., `orchestrator-state-current.md`). Operator-only: schema modifications to this file.

## §0 — Purpose

Defines the schema for orchestrator coordination state. Any orchestrator session (predecessor or successor) reads a conforming INSTANCE file on boot to resume coordination autonomously without operator-mediated handoff briefs.

Enables the **cold-standby-with-trigger** restart pattern (mirrors HSO peer architecture): predecessor writes final state at context-pressure threshold → operator invokes restart spawn → successor boots from state file → predecessor deep-halts.

## §1 — strategic_frame

Captures the high-level scope of orchestrator work in flight.

**Required fields:**

- `ship_gate_status` (enum): `pre-alpha` | `alpha-partial` | `alpha-ready` | `alpha-shipped` | `v3.5-partial` | `v3.5-shipped` | `v3.5.1-partial` | `v3.5.1-shipped`
- `active_workstream` (string): freeform; e.g., "wireframe-reconciliation Tier 1 Wave A.2 execution"
- `pending_tier1_arbitrations` (list of `MB-F-*` IDs): Tier 1 ship-gate-affecting followups awaiting operator decision

## §2 — frozen_contracts

Paths + sections of operator-arbitrated surfaces. SUCCESSOR MUST NOT modify without operator authorization per CLAUDE.md §1.

**Required fields per row:**

- `path` (string): repo-relative path
- `sections` (optional list): specific §/line ranges within file
- `authority` (enum): `operator-only` | `operator-arbitrated`

Canonical entries (must be in every INSTANCE):

- `REGISTRY.md §2` — Registry binary contracts
- `docs/build-docs/CONDUCTOR_API_CONTRACT.md` — Conductor v2/v3 API contract (committed `3ddca60`)
- `packages/dispatch-core/src/v3/schema.ts` §1-§13 — Zod schema spine
- `docs/build-docs/WORKSTATION_CONTRACT.md` §6 — IPC + endpoints
- `packages/dispatch-workstation/src/main/hso-system-prompts/orchestrator.md` — MB-T41 HSO system prompt (operator-only per §5.1)

## §3 — arbitrations

Every operator-arbitrated decision made in any orchestrator session. **INVARIANT-2 (per §INVARIANTS): every row REQUIRES `commit_sha` citation.** Cite the commit where the arbitration's evidence landed (followup row, ticket body, findings doc, etc.), not a placeholder.

**Required fields per row:**

- `id` (string): canonical arbitration identifier (e.g., `Q-OR-1`, `Sub-Q-A`, `Q-GATE-2-4`)
- `question` (string): one-line question text
- `resolution` (string): operator's chosen answer
- `commit_sha` (string): commit citation per anti-fabrication §2.1 — verifiable via `git log --grep` or `git show`
- `session` (string): which orchestrator session captured the decision

**Anti-fabrication discipline:** if `commit_sha` cannot be located via direct verification, mark as `[FAB-RISK]` and HALT-and-surface to operator — do not author placeholder SHAs.

## §4 — operational_primitives

Mechanical procedures the orchestrator actually used this session. **Verbatim syntax required** — not theoretical or paraphrased. If a primitive wasn't used, it doesn't go in this section.

**Required fields per primitive:**

- `name` (string): canonical name (e.g., `paste-buffer-dispatch`, `pathspec-restricted-commit`)
- `verbatim_syntax` (string, code block): exact command/sequence
- `why` (string): one-line rationale

## §5 — sessions

State of every sub-session at snapshot time.

**Required fields per session:**

- `name` (string): tmux session name
- `role` (string): functional role (e.g., "WIREFRAME-C1P4 executor", "HSO-WIRE post-merge cleanup")
- `token_count` (int): from `tmux capture-pane | grep tokens`
- `status` (enum): `active` | `idle-standby` | `idle-awaiting-dispatch` | `halted-pre-commit` | `halted-awaiting-operator` | `killed`
- `territory` (list of paths): files in this session's exclusive write scope
- `in_flight_ticket_id` (optional string): current ticket being executed if `status=active`

## §6 — open_tier1

Tier 1 followups currently OPEN (not CLOSED/RESOLVED/SUPERSEDED). These are ship-gate-affecting.

**Required fields per row:**

- `id` (string): `MB-F-*` identifier
- `closure_paths` (list): operator-surfaced closure options (α / β / γ / etc.)
- `blocks` (list): what ship-gate row(s) this followup gates

Derived via `grep -E 'Tier 1' docs/FOLLOWUPS.md` filtered to non-closed status.

## §7 — gates

State of every named gate (W0-W5 + GATE 0-6 + any session-specific HALT-* markers).

**Required fields per gate:**

- `id` (string): gate identifier (e.g., `GATE-2`, `W1`, `Phase-D-3`)
- `status` (enum): `not-entered` | `entered` | `partial` | `complete` | `halted-pending-operator` | `superseded`
- `commit_references` (list): commits where evidence landed
- `notes` (optional string): brief context

## §8 — discipline

Operational-mode flags + scope tables.

**Required fields:**

- `strict_mode` (bool): CLAUDE.md §2 cairn discipline strict mode (must be `true` for orchestrator operation)
- `auto_ack_scope` (table): which HALT categories auto-ack without operator (e.g., red-probe commits, post-commit pushes after staging verification) vs which require explicit operator decision (e.g., new arbitration, contract amendment, destructive operation)
- `hard_escalation_triggers` (list): conditions that force HALT-and-surface to operator regardless of auto-ack scope

## §9 — next_actions

Ordered list of next dispatches the successor should consider. Predecessor's understanding of what to do next; successor may revise after reading current state.

**Required fields per action:**

- `priority` (int): 1 = highest
- `description` (string): one-line action
- `target_session` (optional string): if applicable, which sub-session
- `blockers` (list): preconditions

## §10 — anti_patterns

Do-not list captured from CLAUDE.md + accumulated orchestrator-session experience. Subset for quick reference; full discipline lives in CLAUDE.md §9.

## §INVARIANTS

Schema invariants enforced across all conforming INSTANCES:

1. **INVARIANT-1 (state-file-update-on-gate-transition):** When any gate transitions status (e.g., `entered → complete`), the INSTANCE file is updated within the same commit chain (atomic capture). Drift between actual gate state and recorded state = invariant violation.

2. **INVARIANT-2 (commit-SHA-citation-required):** Every §3 arbitration row requires `commit_sha`. Anti-fabrication §2.1 — verify via `git log --grep` or `git show` before authoring. No placeholder SHAs.

3. **INVARIANT-3 (schema-changes-operator-arbitrated):** This file (the schema/contract) is frozen per CLAUDE.md §1. Adding/removing sections, changing field semantics, or modifying invariants requires operator arbitration. INSTANCES may be authored freely under §3.4 mechanical translation.

4. **INVARIANT-4 (predecessor-writes-final-state):** Before a predecessor orchestrator deep-halts (post-handoff), it MUST commit a final state-snapshot capturing `session_ended_at` + `status: deprecated`. Successor depends on this for archaeological clarity.

5. **INVARIANT-5 (successor-reads-before-dispatch):** On boot, a successor orchestrator MUST read CLAUDE.md + this contract + the current INSTANCE file + verify sub-sessions via `tmux capture-pane` BEFORE issuing any dispatch. INSTANCE-claims about sub-session state must be cross-validated against actual `tmux list-sessions` output.

6. **INVARIANT-6 (state-survives-restart):** The INSTANCE file is the single source of truth across orchestrator generations. Anything the successor needs to know must be in the file. If predecessor neglected a load-bearing fact, the gap surfaces at successor-side HALT-and-surface (not silent absorption).

---

## Format conventions

- YAML-front-matter at top of INSTANCE files for machine parseability
- Markdown sections for human readability
- Code blocks for verbatim syntax in §4
- Tables for §3, §5, §6, §7 where structure matters
- `[KNOWN]` / `[MODELED]` / `[SPECULATIVE]` labels per CLAUDE.md §2.2 where claims are not direct observations

## Cross-references

- `CLAUDE.md` §1 (authority + frozen contracts)
- `CLAUDE.md` §2 (cairn methodology)
- `CLAUDE.md` §3.4 (operator-arbitrated decisions vs supervised mechanical translation)
- `docs/coordination/orchestrator-state-current.md` (current live INSTANCE)
- `docs/coordination/orchestrator-self-restart-protocol.md` (boot procedure)

---

**End of Orchestrator State Contract v1.**

Authored under §3.4 operator-supervised mechanical translation; ratification pending operator HALT-FROZEN-CONTRACT-PRE-COMMIT review.
