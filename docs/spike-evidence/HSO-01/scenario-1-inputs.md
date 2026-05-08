# Scenario 1 Inputs — SPIKE-HSO-01
# 10 scenarios, 2 per action type. Each is a self-contained operator message.
# Expected output column populated after scenario runs.

## Notional swarm-state.md context (injected with each scenario)

Active peer sessions:
- mb-t35-worker: state=idle, last-summary="Completed WB2 — authored test for send-prompt-to-session marker; 6/12 GREEN"
- mb-t36-worker: state=idle, last-summary="Replaced fireSpawn placeholder; unit tests passing"
- mb-t37-worker: state=idle, last-summary="Just spawned; no work done yet"
- mb-t38-worker: state=errored, last-summary="ENOENT loop on swarm-state-writer.ts; 8 retries, no progress"
- mb-stale-probe: state=idle, last-summary="Running 4 hours; assigned task was superseded 2 hours ago"

Outstanding decisions: none.

---

## S01 — Expected: send-prompt-to-session → mb-t36-worker

"Peer session 'mb-t36-worker' is idle and confirmed fireSpawn replacement complete. The next step is to run the existing unit tests in packages/dispatch-workstation/test/unit/coarchitect-ipc/ to verify no regressions were introduced. Decide the next swarm action."

---

## S02 — Expected: send-prompt-to-session → mb-t35-worker

"Peer session 'mb-t35-worker' is idle at WB2 completion. WB3 requires authoring the test for [ACTION:kill-session] marker parsing in the chat-content-markers.ts extension. The session is waiting for its WB3 prompt. Decide the next swarm action."

---

## S03 — Expected: spawn-session (new session for MB-T38)

"swarm-state.md shows mb-t35-worker and mb-t36-worker are both idle but both have active ticket assignments. MB-T38 (swarm-state-writer module) is unblocked per BUILD.md and needs to begin. No available idle session is unassigned. Decide the next swarm action."

---

## S04 — Expected: spawn-session (replacement for crashed mb-t37-worker)

"Peer session 'mb-t37-worker' crashed unrecoverably during WB4 of MB-T37. swarm-state.md shows it completed WB1–WB3 before the crash. A replacement session needs to continue from WB4. Decide the next swarm action."

---

## S05 — Expected: kill-session → mb-stale-probe

"Peer session 'mb-stale-probe' has been running for 4 hours. swarm-state.md shows the ticket it was assigned was superseded by operator decision 2 hours ago. The session is idle and consuming registry capacity. Decide the next swarm action."

---

## S06 — Expected: kill-session → mb-t38-worker

"Peer session 'mb-t38-worker' is in an error loop. Its console output shows 'ENOENT: no such file or directory, open swarm-state-writer.ts' repeated 8 times in the last 5 minutes, with no sign of recovery. The session cannot make progress. Decide the next swarm action."

---

## S07 — Expected: pull-handoff-from-session → mb-t36-worker

"Peer session 'mb-t36-worker' just went idle after a 30-minute working stretch. swarm-state.md's entry for that session is 30 minutes old and predates the fireSpawn replacement work. Before assigning its next task, current state needs to be captured. Decide the next swarm action."

---

## S08 — Expected: pull-handoff-from-session → mb-t35-worker

"Hot-swap is about to trigger. swarm-state.md shows mb-t35-worker's last recorded summary is from 20 turns ago. The successor orchestrator needs accurate state for that session. Decide the appropriate preparation action before hot-swap fires."

---

## S09 — Expected: assign-task → mb-t37-worker (or newly spawned; session present in notional state)

"mb-t37-worker has just been spawned fresh. BUILD.md identifies MB-T37 (orchestrator pool manager module) as the next unblocked ticket and mb-t37-worker as its assigned session. The session is idle and waiting for its initial task assignment. Decide the next swarm action."

---

## S10 — Expected: assign-task → mb-t35-worker (continuing MB-T35-revised)

"Peer session 'mb-t35-worker' completed WB1–WB3 of MB-T35-revised and is idle. WB4 involves implementing the ACTION block validation logic against dispatch-core schema field names. The session is waiting for its WB4 task. Decide the next swarm action."
