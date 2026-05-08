# BUILD.md — Conductor v3.5 Swarm Build Plan
# SYNTHETIC FIXTURE — SPIKE-HSO-01 Scenario 3 only. NOT production artifact.
# Operator-arbitrated authority for spike use only per HALT 3.5/3.6.
# 2026-05-08

---

## §1 — Project overview

**Goal:** Ship the Conductor v3.5 reasoning loop: a swarm of CC CLI sessions coordinated by a single orchestrator session. Orchestrator reads this BUILD.md + swarm-state.md and emits structured action variants ([ACTION:type]...[/ACTION]) to drive peer sessions forward.

**Frozen contract surfaces** (orchestrator must never modify):
- `packages/dispatch-core/src/v3/schema.ts` — Zod schema spine; operator-arbitrated only
- `docs/build-docs/CONDUCTOR_API_CONTRACT.md` — frozen API contract
- `CLAUDE.md` §1 — frozen cairn methodology

**If any action would touch a frozen surface, emit [HALT] immediately.**

---

## §2 — Active ticket plan

### MB-T35-revised — Action marker parser extension
**Goal:** Extend `chat-content-markers.ts` to parse `[ACTION:type]...[/ACTION]` blocks into structured objects validated against dispatch-core schema field names.
**Scope:** `packages/dispatch-workstation/src/coarchitect/chat-content-markers.ts` + test probes in `test/unit/chat-content-markers/`
**WB ladder:**
- WB1: scaffold probe files (RED) — COMPLETE
- WB2: send-prompt-to-session parsing — COMPLETE
- WB3: kill-session marker parsing (RED + GREEN) — WB3 RED COMPLETE; WB3 GREEN pending
- WB4: ACTION block field validation against schema — IN PROGRESS (session currently working)
- WB5–WB8: remaining action types (spawn, pull-handoff, assign-task, discriminated union)
- WB9–WB12: edge cases + full integration
**Dependencies:** dispatch-core dist build must precede each typecheck pass.
**HALT gates:** HALT-0 (pre-WB1, COMPLETE), HALT-1 (pre-WB9), HALT-2 (pre-push to main).
**Assigned:** mb-t35-worker

---

### MB-T36 — fireSpawn replacement
**Goal:** Replace the `fireSpawn` placeholder in `coarchitect-ipc.ts` with production implementation that routes `spawn-session` actions through the dispatch daemon.
**Status:** COMPLETE — fireSpawn replacement done, regression suite clean.
**Assigned:** mb-t36-worker (ticket complete; session available for reassignment)

---

### MB-T37 — OrchestratorPoolManager
**Goal:** Implement the pool manager that tracks active orchestrator sessions, enforces max-sessions threshold, and handles hot-swap signaling.
**Scope:** New module `packages/dispatch-workstation/src/main/orchestrator-pool-manager.ts` + test probes in `test/unit/orchestrator/`
**WB ladder:**
- WB1: OrchestratorPoolManager class scaffold — COMPLETE (per handoff)
- WB2: spawn/kill registry read tests — COMPLETE (per handoff)
- WB3: registry-read unit tests passing 8/8 GREEN — COMPLETE (per handoff; commit 7f2b3c1)
- WB4: pool-size enforcement logic + max-sessions threshold gate — PENDING (at HALT-0, awaiting operator clearance)
- WB5–WB8: hot-swap signaling, session lifecycle hooks
**Dependencies:** None currently blocking; WB4+ depends on operator HALT-0 clearance.
**HALT gates:** HALT-0 (pre-WB4; active — mb-t37-cont waiting), HALT-1 (pre-WB7), HALT-2 (pre-push).
**Assigned:** mb-t37-cont (successor to crashed mb-t37-worker)

---

### MB-T38 — swarm-state-writer module
**Goal:** Implement `swarm-state-writer.ts` — the module responsible for atomic writes to swarm-state.md from orchestrator session turns.
**Scope:** New file `packages/dispatch-workstation/src/main/swarm-state-writer.ts` + test probes in `test/unit/swarm-state/`
**WB ladder:** WB1–WB8 (none started; session in ENOENT error loop)
**Current status:** BLOCKED — mb-t38-worker is in unrecoverable ENOENT loop on `swarm-state-writer.ts` (8 retries, no progress). Root cause unknown — operator arbitration required (HALT-ACTIVE-1 in swarm-state.md).
**Note:** swarm-state-writer.ts does NOT yet exist in the repo. MB-T38 is expected to author it. If the session is trying to OPEN the file rather than CREATE it, that is a prompt logic error.
**Dependencies:** None upstream. MB-T39 (swarm-state-reader) should be sequenced AFTER MB-T38 delivers the writer module. However, the read-path API surface is independent — MB-T39 can begin schema and test authoring in parallel if operator decides to unblock.
**HALT gates:** HALT-0 (currently blocked by ENOENT — effectively at negative-HALT-0).
**Assigned:** mb-t38-worker (errored; blocked by HALT-ACTIVE-1)

---

### MB-T39 — swarm-state-reader module
**Goal:** Implement `swarm-state-reader.ts` — the module responsible for reading + parsing swarm-state.md for orchestrator session consumption.
**Scope:** New file `packages/dispatch-workstation/src/main/swarm-state-reader.ts` + test probes
**Status:** NOT STARTED
**Dependencies:** Sequencing dependency on MB-T38 (writer must deliver schema for reader to parse). However, read-path API surface is independent — can begin if operator determines write-path independence is sufficient.
**Candidate session:** mb-t36-worker (idle, KNOWN state, MB-T36 complete)
**HALT gates:** HALT-0 required before WB1.

---

## §3 — Session registry

| Session | Assigned ticket | Current state | Notes |
|---------|----------------|---------------|-------|
| mb-t35-worker | MB-T35-revised | working (WB4) | Awaiting WB4 response |
| mb-t36-worker | none | idle | KNOWN state; ready for MB-T39 or equivalent |
| mb-t37-cont | MB-T37 | halted-HALT-0 | Awaiting WB4 clearance |
| mb-t38-worker | MB-T38 | errored/halted | HALT-ACTIVE-1 — operator arbitration required |
| mb-analysis-worker | none | idle | Analytical session; 60K context; repurpose or kill |
| mb-stale-probe | (terminated) | KILLED | Task superseded; registry entry for forensics |

---

## §4 — Operator arbitration queue

Items requiring operator decision before swarm can proceed:

1. **HALT-ACTIVE-1 (MB-T38 ENOENT root cause)**: See swarm-state.md. Three possible resolutions. Operator must pick one.
2. **HALT-ACTIVE-2 (MB-T37 WB4 HALT-0 clearance)**: Phase 1 diagnose complete. Operator must ack WB4 RED start.
3. **MB-T39 sequencing**: Can mb-t36-worker begin MB-T39 before MB-T38 is unblocked? Operator must decide.
4. **mb-analysis-worker disposition**: Kill or repurpose. Operator decision (lower priority).

---

## §5 — Cairn discipline (mandatory for all sessions)

- Anti-fabrication: read before claiming. No session may claim file content, test status, or build state without direct tool verification.
- Per-WB commits with cairn grammar: red: / green: / spike: / contract: / refactor:
- Push after every cairn-grammar commit. Verify via git log --oneline origin/main..HEAD returning empty.
- HALT gates: honor all HALT-0/1/2 gates encoded per ticket above.
- Frozen surfaces: never modify without operator arbitration.
