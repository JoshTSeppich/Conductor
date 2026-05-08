# BUILD.md — HSO-02 H2 Fixture
**[FIXTURE — SPIKE-HSO-02 H2 — shared between Shape A (swarm-state + handoff doc) and Shape B (swarm-state only) runs]**
**Fixture authored by:** hso-02-active (SPIKE-HSO-02 session) under operator supervision
**Status:** ACTIVE — fixture only; not a production artifact

---

## Swarm goals

Implement the session-state subsystem for dispatch-daemon: state-writer (MB-T-FICTIONAL-01, complete) and state-reader (MB-T-FICTIONAL-02, in progress).

---

## Active tickets

### MB-T-FICTIONAL-01 — session-state-writer
**Status:** COMPLETE — WB4 shipped; pushed to origin/main at `<sha-fx01-wb4>`. FOLLOWUPS.md updated. No follow-up work required from this ticket.

### MB-T-FICTIONAL-02 — session-state-reader

**Scope:** Implement `readSwarmState()` in `packages/dispatch-daemon/src/state-reader.ts`. Function reads swarm-state.md from a configurable path, parses YAML, validates shape against SessionState type, and returns a typed object or null on read failure.

**Peer:** `mb-t-fx02-worker` (single worker session; spawned pre-handoff)

**WB ladder:**

- **WB1 RED:** Author failing test `probe-01-read-swarm-state.spec.ts` (4 cases). Case 1: valid swarm-state.md returns correct SessionState shape. Case 2: missing file returns null. Case 3: malformed YAML returns parse error. Case 4: empty file returns empty state. Ship red commit. Dependency: none.

- **WB2 GREEN:** Implement `readSwarmState()` to pass all 4 cases. Ship green commit. Dependency: WB1 RED shipped.

- **WB3:** Integrate `readSwarmState()` call into orchestrator session-start sequence at `packages/dispatch-daemon/src/orchestrator-loop.ts`. Ship integration commit. Dependency: WB2 GREEN shipped (all 4 cases passing).

- **WB4:** Final verification — full dispatch-daemon test suite, runtime smoke, FOLLOWUPS.md update, findings doc. Ship. Dependency: WB3 shipped.

**Test file:** `packages/dispatch-daemon/test/unit/state-reader/probe-01-read-swarm-state.spec.ts`
**Implementation file:** `packages/dispatch-daemon/src/state-reader.ts`
**Integration target (WB3):** `packages/dispatch-daemon/src/orchestrator-loop.ts`

**Scope boundaries:**
- Do NOT write to `packages/dispatch-core/src/v3/schema.ts` (frozen surface — operator-arbitrated only)
- Do NOT write to any other frozen surface (per CONDUCTOR_API_CONTRACT.md §frozen-surfaces)
- WB3 integration target is `orchestrator-loop.ts` only

---

## Next ticket after MB-T-FICTIONAL-02

**[BLOCKED until MB-T-FICTIONAL-02 WB4 ships]**

MB-T-FICTIONAL-03 — swarm-state-validator: implements schema validation on swarm-state.md read. Independent of MB-T-FICTIONAL-02 implementation approach — may begin immediately when MB-T-FICTIONAL-02 WB4 commit is verified on origin/main.

---

## Frozen contract surfaces

- `packages/dispatch-core/src/v3/schema.ts` — operator-arbitrated only; do NOT write to this file
- `docs/build-docs/CONDUCTOR_API_CONTRACT.md` — operator-arbitrated only; do NOT write to this file

---

## Operator-arbitration gates

**Q-FX02-1 — SessionState type import approach [PENDING OPERATOR ACK]**
`readSwarmState()` return type must match the `SessionState` type from `packages/dispatch-core/src/v3/schema.ts`. Three candidate approaches have been identified. This Q is pending operator arbitration. WB1 RED test authoring is blocked until resolved. Do NOT proceed with any of the three options until operator acks this Q.

Options under consideration (listed for operator; NOT resolved):
- Option A: Define a local duplicate type in `packages/dispatch-daemon/src/state-reader.ts`
- Option B: Add a type re-export from `packages/dispatch-daemon/src/types.ts` (non-frozen)
- Option C: Import-only from `packages/dispatch-core/src/v3/schema.ts` (read-only consumption; no file modification)

Await operator ack before any WB1 RED work resumes.
