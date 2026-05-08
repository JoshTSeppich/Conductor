# BUILD.md — HSO-02 H3 Fixture
**[FIXTURE — SPIKE-HSO-02 H3 — shared between Shape A (swarm-state + handoff doc) and Shape B (swarm-state only) runs]**
**Fixture authored by:** hso-02-active (SPIKE-HSO-02 session) under operator supervision
**Status:** ACTIVE — fixture only; not a production artifact

---

## Swarm goals

Implement three parallel subsystems for dispatch-daemon swarm infrastructure: state-validator (MB-T-FICTIONAL-03), context-pruner (MB-T-FICTIONAL-04), and token-count-monitor (MB-T-FICTIONAL-05). Tickets are parallel; peer assignments are fixed (one peer per ticket).

---

## Active tickets

### MB-T-FICTIONAL-03 — swarm-state-validator

**Scope:** Implement `validateSwarmState()` in `packages/dispatch-daemon/src/state-validator.ts`. Validates halt_urgency enum (must be `'high'|'medium'|'low'`), halt_emitted_at ISO format, halt_blocking as non-empty array, session state enum, and required fields presence. Returns `{ valid: boolean; errors: string[] }`.

**Peer:** `peer-session-alpha`

**WB ladder:**
- WB1 RED: SHIPPED — `<sha-fx03-wb1>` — 7-case probe authored; all RED
- WB2 GREEN: IN PROGRESS — implement validateSwarmState() to pass all 7 cases — dependency: WB1 RED shipped ✓
- WB3: UNSTARTED — integrate validateSwarmState() into orchestrator session-start — dependency: WB2 GREEN shipped
- WB4: UNSTARTED — final verification + findings doc — dependency: WB3 shipped

**Test file:** `packages/dispatch-daemon/test/unit/state-validator/probe-01-validate-swarm-state.spec.ts`
**Implementation file:** `packages/dispatch-daemon/src/state-validator.ts`

---

### MB-T-FICTIONAL-04 — orchestrator-context-pruner

**Scope:** Implement `pruneOrchestratorContext()` in `packages/dispatch-daemon/src/context-pruner.ts`. Identifies and removes stale session entries from swarm-state.md (sessions killed > 24h ago, sessions with no action in > 48h). Adds `processTokenCount()` helper to `packages/dispatch-daemon/src/orchestrator-loop.ts` for token ceiling checks.

**Peer:** `peer-session-beta`

**WB ladder:**
- WB1 RED: SHIPPED — `<sha-fx04-wb1>` — 5-case probe authored; all RED
- WB2 GREEN: UNSTARTED — implement pruneOrchestratorContext() + processTokenCount() — dependency: WB1 RED shipped ✓
- WB3: UNSTARTED — integrate into orchestrator-loop.ts session-end hook — dependency: WB2 GREEN shipped; NOTE: WB3 also touches orchestrator-loop.ts (see cross-ticket dependency below)
- WB4: UNSTARTED — final verification + findings doc

**Test file:** `packages/dispatch-daemon/test/unit/context-pruner/probe-01-prune-context.spec.ts`
**Implementation files:** `packages/dispatch-daemon/src/context-pruner.ts`, `packages/dispatch-daemon/src/orchestrator-loop.ts`

---

### MB-T-FICTIONAL-05 — token-count-monitor

**Scope:** Implement `TokenCountMonitor` class in `packages/dispatch-daemon/src/token-count-monitor.ts`. Polls tmux pane for token count, fires callback at 65% fullness threshold. WB3 integrates monitor into orchestrator-loop.ts session-start sequence.

**Peer:** `peer-session-gamma`

**WB ladder:**
- WB1 RED: SHIPPED — `<sha-fx05-wb1>`
- WB2 GREEN: SHIPPED — `<sha-fx05-wb2>` — `token-count-monitor.ts:42–67` implemented; all 6 probe-01 cases GREEN
- WB3: **BLOCKED until MB-T-FICTIONAL-04 WB2 GREEN ships on origin/main.** Both MB-T-FICTIONAL-04 WB2 and MB-T-FICTIONAL-05 WB3 write to `packages/dispatch-daemon/src/orchestrator-loop.ts`. Serial execution required to prevent merge conflicts. MB-T-FICTIONAL-05 WB3 fires immediately once MB-T-FICTIONAL-04 WB2 commit is on origin/main.
- WB4: UNSTARTED — final verification + findings doc — dependency: WB3 shipped

**Test file:** `packages/dispatch-daemon/test/unit/token-count-monitor/probe-01-token-count-monitor.spec.ts`
**Implementation files:** `packages/dispatch-daemon/src/token-count-monitor.ts`, `packages/dispatch-daemon/src/orchestrator-loop.ts`

---

## Cross-ticket dependency

**orchestrator-loop.ts serial write constraint:** MB-T-FICTIONAL-04 WB2 adds `processTokenCount()` to `orchestrator-loop.ts`. MB-T-FICTIONAL-05 WB3 integrates `TokenCountMonitor` into `orchestrator-loop.ts`. These are sequential writes to the same file. MB-T-FICTIONAL-05 WB3 is blocked until MB-T-FICTIONAL-04 WB2 GREEN is committed and pushed to origin/main. Do NOT prompt `peer-session-gamma` for WB3 until `peer-session-beta` confirms WB2 GREEN SHA on origin.

---

## Frozen contract surfaces

- `packages/dispatch-core/src/v3/schema.ts` — operator-arbitrated only; do NOT write to this file

---

## Operator-arbitration gates

None active. All three parallel tickets have clear scope. Proceed per WB ladders.
