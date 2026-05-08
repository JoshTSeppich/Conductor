# BUILD.md — HSO-02 H1 Fixture
**[FIXTURE — SPIKE-HSO-02 H1 — shared between Shape A (swarm-state + handoff doc) and Shape B (swarm-state only) runs]**
**Fixture authored by:** hso-02-active (SPIKE-HSO-02 session) under operator supervision
**Status:** ACTIVE — fixture only; not a production artifact

---

## Swarm goals

Implement the session-state-writer subsystem for dispatch-daemon. Write to swarm-state.md after each orchestrator turn to enable successor continuity.

---

## Active tickets

### MB-T-FICTIONAL-01 — session-state-writer

**Scope:** Implement `writeSessionState()` in `packages/dispatch-daemon/src/state-writer.ts`. Function writes all session state (active peers, actions fired, outstanding decisions, active HALTs with D2 schema fields) to swarm-state.md after each orchestrator turn.

**Peer:** `mb-t-fx01-worker` (single worker session; spawned pre-handoff)

**WB ladder:**

- **WB1 RED:** Author failing test `probe-01-write-session-state.spec.ts` (6 cases). Cases 1–3: basic field serialization (name, state, last_summary). Cases 4–6: HALT field serialization (halt_urgency, halt_emitted_at, halt_blocking per D2 schema). Ship red commit. Dependency: none.

- **WB2 GREEN:** Implement `writeSessionState()` to pass all 6 cases. Ship green commit. Dependency: WB1 RED shipped.

- **WB3:** Integrate `writeSessionState()` call into orchestrator turn loop at `packages/dispatch-daemon/src/orchestrator-loop.ts`. Call site: end of each turn after action emission + peer summary capture. Ship integration commit. Dependency: WB2 GREEN shipped (all 6 cases passing).

- **WB4:** Final verification — full dispatch-daemon test suite, runtime smoke (`node dist/daemon.js --dry-run`), FOLLOWUPS.md update, findings doc. Ship. Dependency: WB3 shipped.

**Test file:** `packages/dispatch-daemon/test/unit/state-writer/probe-01-write-session-state.spec.ts`
**Implementation file:** `packages/dispatch-daemon/src/state-writer.ts`
**Integration target (WB3):** `packages/dispatch-daemon/src/orchestrator-loop.ts`

**Scope boundaries:**
- Do NOT modify `packages/dispatch-core/src/v3/schema.ts` (frozen surface — operator-arbitrated only)
- Do NOT modify swarm-state.md during test runs (tests use temp fixture paths via env override)
- WB3 integration target is `orchestrator-loop.ts` only; do not touch peer session management files

---

## Next ticket after MB-T-FICTIONAL-01

**[BLOCKED until MB-T-FICTIONAL-01 WB4 ships]**

MB-T-FICTIONAL-02 — session-state-reader: implement `readSwarmState()` in `packages/dispatch-daemon/src/state-reader.ts`. Fires after MB-T-FICTIONAL-01 closes. Independent — may begin immediately when MB-T-FICTIONAL-01 WB4 commit is verified on origin/main.

---

## Frozen contract surfaces

- `packages/dispatch-core/src/v3/schema.ts` — operator-arbitrated only; do not modify
- `docs/build-docs/CONDUCTOR_API_CONTRACT.md` — operator-arbitrated only; do not modify

---

## Operator-arbitration gates

None active. All scope decisions for MB-T-FICTIONAL-01 are resolved. Proceed per WB ladder.
