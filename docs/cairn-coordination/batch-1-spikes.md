# Batch 1 Spike Sessions Coordination

**Purpose:** Real-time coordination across parallel spike sessions.
**Initial scope:** 3 sessions (MB-S01, MB-S02, MB-S03). MB-S04 added when first of three closes.
**Protocol:** Each session reads on start, appends notices on session-start, milestone, session-end. Per-commit-push mandatory. Per-path git add mandatory.

## Amendment numbering coordination

MB-S03 will draft amendment proposal for /v3/orchestrator/* + /v3/tickets/* endpoints.
MB-S04 will draft amendment proposal for /v3/sessions/:name/console/* endpoints.
First to draft claims §11. Second accepts §12. Append claim notice below when claiming.

## Session log

(append below this line)


---

## Batch update — 2026-05-02

Original Batch 1 plan (4 spike sessions MB-S01/S02/S03/S04) is OBSOLETE — all five MB-S0X spikes already shipped (MB-S01-S05 ADRs on disk). MB-S04 ADR slot occupied by vitest-electron-spawn (different scope).

NEW batch composition: 3 parallel sessions on different territories of the v3 build.

- Session A: MB-S06 — tmux PTY stdin/stdout bidirectional streaming (CC-console new-work spike per vision §10).
- Session B: MB-T04 — spawn button + repo picker modal in shell (Tier B spawn flow start).
- Session C: COARCH-T03 — Anthropic SDK + Sonnet 4.6 real wiring of COARCH-T02 chat panel scaffold.

Coordination surfaces:
- Session A territory: docs/adr/MB-S06-*, packages/dispatch-daemon/spikes/MB-S06/. Disjoint from B and C.
- Session B territory: packages/dispatch-workstation/src/spawn/ (or per shell layout), docs/adr/MB-T04-*. Disjoint from A and C.
- Session C territory: packages/dispatch-workstation/coarchitect/ (existing scaffold). Disjoint from A and B.
- Shared read-only: WORKSTATION_CONTRACT.md, CONDUCTOR_API_CONTRACT.md (both frozen at v2.1.0), v3 schema (frozen at 232fbaa), SECTION_10_CC_CONSOLE.md (frozen at eac381e), all MB-S0X ADRs (read-only reference).

Per-commit-push mandatory. Per-path git add mandatory. Pre-commit territory check via `git status --short` showing only own files.

[2026-05-02 14:53] Session A (MB-S06) starting. Branch: main. HEAD SHA: 3549330b40986d7f8313010f30627f5ae36ca599.
[2026-05-02 14:54] Session B (MB-T04) starting. Branch: main. HEAD SHA: 3549330b40986d7f8313010f30627f5ae36ca599.
[2026-05-02 15:18] Session C (COARCH-T03) starting. Branch: main. HEAD SHA: bacd6cf195f079c950cd51e69b6f8eed227cd858.
[2026-05-02 14:59] Session B (MB-T04) milestone: red-test-drafted. SHA: 0ce67ce. Two failing tests at packages/dispatch-workstation/test/integration/mb-t04/ (modal-opens timeout on SPAWN_MODAL_OPENED; emits-intent timeout on SPAWN_MODAL_OPENED).
[2026-05-02 15:06] Session A (MB-S06) milestone: harness-coded + harness-validated. 6 experiments at packages/dispatch-daemon/spikes/MB-S06/pty-harness/. Recorded results in results/exp{1..6}-*.json. Headlines: bytes-integrity OK with paste-buffer -r (LF→CR translation gotcha is KNOWN); backpressure bounded (consumer-paced, tmux RSS bounded); SIGINT deliverable via PTY byte 0x03 OR kill(2), SIGTERM/SIGHUP via kill(2) only; ring buffer FIFO eviction OK; WS reconnect backfill OK; multi-consumer fan-out OK with single PTY reader. Amendment-numbering coordination question pending — see ADR-draft section.
[2026-05-02 15:35] Session C (COARCH-T03) milestone: red-tests-drafted. SHA: 95f7139. Tests 1–4 failing as expected (unit: ERR_MODULE_NOT_FOUND for src/main/anthropic-client.ts; integration: existsSync=false for dist/main/anthropic-client.js). @anthropic-ai/sdk ^0.92.0 installed. All 8 prior tests still pass.
[2026-05-02 15:08] Session B (MB-T04) milestone: green-impl-passing. SHA: 9ed0233. Both tests pass: spawn-modal-opens (3.4s) + spawn-modal-emits-intent (3.1s). Files: src/main/spawn-ipc.ts (new), main.ts/preload.mts/workstation-shell.html (modified). IPC payload shape committed: {repoPath: string, sessionName: string} per WORKSTATION_CONTRACT.md §3.3. No regressions in 9 prior GREEN tests; coarch-t03 RED state untouched (Session C territory).
[2026-05-02 15:10] Session A (MB-S06) milestone: ADR-draft-complete + HALT-AND-SURFACE on amendment numbering. ADR at docs/adr/MB-S06-tmux-pty-bidirectional-streaming.md. ADR §9 surfaces a discrepancy with this coord file's amendment-numbering plan: the original plan said "First to draft claims §11" but §11 in CONDUCTOR_API_CONTRACT.md is the unchanged "Operator review checklist" section, and 952f857 placed the existing /v3/* coordination at §4.6 (NOT §11). Three plausible placements for the new console-endpoint amendment: (a) §4.7 parallel to §4.6, (b) §13 new top-level section, (c) extend §4.6 in-place. Per spike halt discipline, halting amendment-proposal commit pending operator arbitration of (a)/(b)/(c). Amendment proposal will ship as a stub with placeholder section number until operator decides.
[2026-05-02 15:11] Session B (MB-T04) milestone: followups-filed. SHA: 4130ba8. Filed 4 followups in docs/FOLLOWUPS.md Session B band: MB-F-MB-T04-PROJECT-LIST (Tier 2), MB-F-MB-T04-INITIAL-PROMPT (Tier 2), MB-F-MB-T04-PAYLOAD-VALIDATION (Tier 2), MB-F-MB-T04-EMPTY-INPUT-UX (Tier 3). All non-blocking for MB-T04 acceptance.
[2026-05-02 15:12] Session B (MB-T04) complete. Final SHA: 4130ba8. Tests passing: 2 of 2 in test/integration/mb-t04/. Acceptance per V3_TICKETS.md L134 met: button → modal → spawn intent fires with payload {repoPath, sessionName}. No actual session spawned (MB-T05 territory). MB-T05 readiness: ipcMain.on('workstation:spawn-requested') listener in spawn-ipc.ts is the integration point — MB-T05 replaces the test-hook stdout echo with the actual tmux+claude+daemon registration handler per MB-S02 ADR + MB-T05 env-allowlist amendment proposal (operator-pending).
[2026-05-02 15:14] Session A (MB-S06) milestone: amendment-proposal-drafted (STUB pending operator arbitration). At docs/adr/MB-S06-conductor-amendment-proposal.md. Section number is `<<<§N>>>` placeholder. Operator picks placement: (a) §4.7 parallel to §4.6, (b) §13 new top-level, (c) extend §4.6 in-place. Proposed amendment text is otherwise complete: cross-cutting expectations (auth, error envelope, route-order, 404, WS, backfill protocol, sequence-number space, PTY reader sharing, ring buffer storage, signal dispatch table, versioning bump to v2.2.0). Five open questions listed in §5: placement choice, bytes encoding, dedicated WS vs multiplex, SQLite DDL scope, backfill_complete UX scope.
[2026-05-02 15:14] Session A (MB-S06) complete. ADR at docs/adr/MB-S06-tmux-pty-bidirectional-streaming.md. Amendment proposal at docs/adr/MB-S06-conductor-amendment-proposal.md. Final SHA: b8a1c04. Halt-and-surface: amendment-numbering ambiguity in §9 of main ADR + §1 of proposal (operator picks (a)/(b)/(c)) AND five open questions in proposal §5. Spike work itself is complete; deliverable list satisfied. Recommended CONSOLE-T01/T02/T03 implications captured throughout main ADR.
[2026-05-02 15:48] Session C (COARCH-T03) milestone: green-impl-passing. SHA: 7f15c78. 18/18 tests pass (all prior + 4 COARCH-T03: sdk-call-shape, sdk-error-states, streaming-renders, self-check-renders). Files: src/main/anthropic-client.ts (new), src/main/http-daemon-client.ts (new), src/main/coarchitect-ipc.ts (streaming handler + real clients), src/main/preload.mts (streaming bridge), src/coarchitect/chat-panel.tsx (streaming state + sentinels), src/coarchitect/mount.ts (bridge adapter), src/main/main.ts (TYPE_AND_SEND + STREAM_* sentinels). Followups closed: MB-F-COARCH-T02-REAL-DAEMON-WIRING, MB-F-ZIPPER-2-COARCH-T03-IPC.
[2026-05-02 15:48] Session C (COARCH-T03) complete. Final SHA: 7f15c78 (GREEN) + FOLLOWUPS update + this notice (pending commit). Acceptance per V3_TICKETS.md: Anthropic SDK wired (Sonnet 4.6, stream:true), streaming IPC tested with mock (MB_MOCK_ANTHROPIC=1), error states classified, self-check block renders without crash. No REFACTOR scope items filed (GREEN implementation is clean — no tech debt surfaced). HALT-AND-SURFACE: none. V3_TICKETS.md daemon-persistence acceptance criterion ("survives app restart with history intact") deferred to COARCH-T04+ (requires running daemon; HttpDaemonClient gracefully fails in offline tests).

---

## Batch 2 — 2026-05-02

§4.7 amendment landed at a7e8d4f. CC-console contract surface frozen. CONSOLE-T01/T02/T03 unblocked. COARCH-T04 also draftable.

3-session composition (3-session ratchet ratified per Batch 1 close):

- Session A: CONSOLE-T01 — daemon-side CC-console implementation per §4.7. New territory: packages/dispatch-daemon/src/console/. New SQLite table: cc_console_buffer. Disjoint from B and C.
- Session B: CONSOLE-T02 — Workstation IPC layer per vision §10.7. New territory: packages/dispatch-workstation/src/main/console-ipc.ts + preload bridge additions in preload.mts. Disjoint from A and C.
- Session C: COARCH-T04 — build-doc upload + git-resolved reader + schema validator + tiered context injection per build-doc-schema-spec.md. Territory: packages/dispatch-workstation/coarchitect/ (extends what COARCH-T03 shipped). Disjoint from A and B.

Shared read-only references: WORKSTATION_CONTRACT.md (frozen), CONDUCTOR_API_CONTRACT.md (frozen at v2.2.0 per a7e8d4f), v3 schema (frozen at 232fbaa), vision §10 (frozen at eac381e), MB-S06 ADR (b641e58 reference for daemon impl), build-doc-schema-spec.md (P-0.5 ratified for COARCH-T04).

Per-commit-push mandatory. Per-path git add mandatory. Pre-commit territory check via git status --short showing only own files.

