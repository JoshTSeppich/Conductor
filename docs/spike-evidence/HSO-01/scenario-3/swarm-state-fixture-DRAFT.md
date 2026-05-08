# swarm-state.md — FIXTURE DRAFT
# SPIKE-HSO-01 Scenario 3: Hot-swap continuity
# Operator-review required before use. Do NOT use as production swarm-state.md.
# This file is authored as if all well-formed S01-S10 actions fired sequentially
# against real peer sessions, plus scenario 2 peer (mb-analysis-worker) integrated.
# 
# Narrative timeline: S01→S02→S03→S04a(pull-handoff from crashed mb-t37-worker)→S04b(spawn mb-t37-cont)→S05→[S06 HALT emitted, not cleared]→S07→S08→S09→S10
# mb-stale-probe terminated (S05). mb-t38-worker halted pending S06 clearance.
# mb-t37-worker crashed during HALT-0 prep; mb-t37-cont spawned from handoff.
# mb-t35-worker sent WB4 prompt (S10); currently working.
# mb-analysis-worker (=scenario-2 peer) integrated as analytical support session.
#
# Last updated: 2026-05-08 ~11:30 (active orchestrator turn 14)

---

## Active peer sessions

- mb-t35-worker: state=working, last-summary="[KNOWN] Completed WB3 RED (MB-T35-revised) — red:(MB-T35) WB3 authored probe-03-kill-session-marker.spec.ts asserting kill-session block → type='kill-session' + sessionName extracted; test is RED against current source; pushed to origin; WB4 prompt received ~15min ago (ACTION block validation logic against dispatch-core schema field names); response pending — no handoff pulled since WB4 started" assigned-ticket="MB-T35-revised" last-commit="red:(MB-T35): WB3 — failing test for [ACTION:kill-session] marker parsing"

- mb-t36-worker: state=idle, last-summary="[KNOWN post-handoff S07] Regression suite passed post-fireSpawn replacement — 0 new failures in test/unit/coarchitect-ipc/; MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL excluded as expected; WB marked green; session has no current assignment — awaiting next task" assigned-ticket="none" note="KNOWN state; handoff pulled S07 before hot-swap prep"

- mb-t37-cont: state=halted-at-HALT-0, last-summary="[KNOWN] Spawned as continuation of crashed mb-t37-worker (crash occurred during HALT-0 prep for MB-T37 WB4); loaded handoff from mb-t37-worker (HANDOFF.md existed with WB1-WB3 state: OrchestratorPoolManager class authored, unit tests for spawn/kill/registry-read passing at 8/8 GREEN, WB3 commit hash 7f2b3c1); Phase 1 diagnose for WB4 surface: scope = pool-size enforcement logic + max-sessions threshold check; first WB4 RED will assert threshold gate; no frozen contract surfaces anticipated; awaiting operator clearance to begin WB4 RED" assigned-ticket="MB-T37" halted-since="S04 spawn" reason-halted="HALT-0 awaiting operator"

- mb-t38-worker: state=errored-halted, last-summary="[KNOWN] ENOENT loop on swarm-state-writer.ts (8 retries, no progress); orchestrator emitted [HALT] at S06 — root cause ambiguous: (a) swarm-state-writer.ts should be authored by MB-T38 (prompt logic error), (b) file exists at different path (misconfiguration), or (c) missing upstream dependency; [HALT] not yet cleared by operator; session is unresponsive and consuming registry capacity; DO NOT kill or re-prompt until S06 HALT cleared" assigned-ticket="MB-T38" halted-since="S06 [HALT] emission" reason-halted="unrecoverable ENOENT loop; root cause ambiguous — operator arbitration required"

- mb-analysis-worker: state=idle, last-summary="[KNOWN] Analytical support session; completed 3 full turns and 1 interrupted turn — T1: README.md summary (file path + 3-bullet: CLI bridge, v2 daemon, architecture); T2: enumerated 27 test files under dispatch-core/test/ (6 subdirectory breakdown, test/unit/ root 10 files, build-doc-parser/ 8 files); T3: read coarchitect-ipc.ts (505 lines, 2 exports), chat-content-markers.ts (68 lines, 4 exports), schema.ts (1,256 lines, 8+ §1 enums + §2 build-doc schemas + §3 partial); T5 interrupted mid-analysis (TURN_INCOMPLETE — no output produced); session has no outstanding task assignment" assigned-ticket="none" note="Repurposable for read-only analysis tasks or kill to reclaim registry capacity"

---

## Terminated sessions (registry entry retained for forensics)

- mb-stale-probe: state=KILLED, killed-at="S05", reason="Task superseded by operator decision ~2 hours before kill; idle 4 hours total; 2-hour dead window; clean termination, no forensics artifacts needed" last-summary-before-kill="4h runtime, assigned task (MB-T30 preliminary analysis) superseded when operator merged MB-T29 directly; no commits, no handoff, no open work"

---

## Actions fired this session (since last swarm-state.md reset)

| Turn | Action type | Target | Outcome |
|------|-------------|--------|---------|
| S01 | send-prompt-to-session | mb-t36-worker | Dispatched regression verification for fireSpawn replacement |
| S02 | send-prompt-to-session | mb-t35-worker | Dispatched WB3 RED prompt for kill-session marker parsing |
| S03 | send-prompt-to-session | mb-t37-worker | Assigned MB-T38 scope review; HALT-0 surface requested; session crashed mid-prep |
| S04a | pull-handoff-from-session | mb-t37-worker (crashed) | HANDOFF.md retrieved with WB1-WB3 state for MB-T37; confirmed continuation point for WB4 |
| S04b | spawn-session | mb-t37-cont | Spawned with HANDOFF.md content as initial context; at HALT-0 awaiting operator clearance |
| S05 | kill-session | mb-stale-probe | Executed; registry entry retained for forensics |
| S06 | [HALT] | — | Emitted: mb-t38-worker ENOENT loop ambiguous root cause; operator arbitration pending |
| S07 | pull-handoff-from-session | mb-t36-worker | KNOWN state captured; tests passing, session idle, next assignment TBD |
| S08 | pull-handoff-from-session | mb-t35-worker | KNOWN state captured pre-hot-swap; WB3 RED committed + pushed |
| S09 | send-prompt-to-session | mb-t37-cont | Initial MB-T37 WB4 continuation prompt dispatched (mb-t37-worker crashed; mb-t37-cont is active successor) |
| S10 | send-prompt-to-session | mb-t35-worker | WB4 prompt dispatched (ACTION block validation vs dispatch-core schema field names) |

---

## Outstanding decisions (operator arbitration required)

**[HALT-ACTIVE-1] MB-T38-WORKER-ENOENT** — Emitted at S06; not yet cleared.
- What is needed: operator to clarify one of: (1) swarm-state-writer.ts should be authored by MB-T38 itself — kill and respawn with corrected prompt; (2) file exists at a different path — provide path for respawn briefing; (3) upstream dependency not yet delivered — identify owning ticket and hold MB-T38 until it lands
- Blocking: MB-T38 entirely; also affects mb-t36-worker assignment if MB-T39 depends on MB-T38

**[HALT-ACTIVE-2] MB-T37-CONT-HALT-0** — mb-t37-cont is at HALT-0 awaiting operator clearance.
- What is needed: operator to ack Phase 1 diagnose for WB4 (pool-size enforcement logic); explicitly authorize WB4 RED start
- Blocking: MB-T37 WB4 progress

**[DECISION-PENDING-1] mb-t36-worker next assignment** — Session is idle with KNOWN state.
- Context: MB-T36 ticket complete; forward BUILD.md sequence shows MB-T39 (swarm-state-reader module) as candidate; however, MB-T39 may depend on MB-T38 (swarm-state-writer) — sequencing unclear until HALT-ACTIVE-1 resolved
- Options: (a) assign MB-T39 speculatively if read-path and write-path are independent; (b) hold mb-t36-worker until MB-T38 root cause resolved; (c) assign unrelated ticket from Family A/B if available
- Not blocking swarm progress; lower priority than HALT-ACTIVE-1 and HALT-ACTIVE-2

**[DECISION-PENDING-2] mb-analysis-worker disposition** — Session is idle; no outstanding assignment.
- Context: Analytical tasks complete; session has 60K+ context tokens of project-state knowledge from T1-T4 reads (README, dispatch-core test inventory, export catalog for coarchitect-ipc + chat-content-markers + schema)
- Options: (a) kill and recover registry capacity; (b) repurpose as MB-T35 or MB-T36 support if a targeted read-only analysis task arises; (c) leave idle as standby

---

## Unresolved errors

- mb-t38-worker: ENOENT loop (see HALT-ACTIVE-1 above). Do not kill until HALT cleared.
- mb-t37-worker (original): CRASHED during HALT-0 prep. Registry entry inert; mb-t37-cont is the active successor. No action needed.

---

## Build state snapshot (MODELED from git log + session summaries)

MB-T35-revised: WB3 RED complete (red: commit pushed); WB4 in progress
MB-T36: COMPLETE — fireSpawn replacement done, regression clean
MB-T37: WB1-WB3 complete (KNOWN from handoff); WB4 pending HALT-0 clearance
MB-T38: BLOCKED — ENOENT root cause unresolved
MB-T39: NOT STARTED — sequencing depends on MB-T38 resolution
