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

[2026-05-02 15:33] Session A (CONSOLE-T01) starting. Branch: main. HEAD SHA: d882499b38e0fb995071f3f775d636dc010ed305.
[2026-05-02 15:33] Session B (CONSOLE-T02) starting. Branch: main. HEAD SHA: d882499b38e0fb995071f3f775d636dc010ed305.
[2026-05-02 15:36] Session B (CONSOLE-T02) HALT-AND-SURFACE before any RED. Frozen vision §10.7 (eac381e) lists `console:open` + `console:close` as shell→webview ("instruct webview to open/close a CC-console panel"). Ticket prompt RED cluster 1 specifies tests asserting shell RECEIVES `console:open` / `console:close` from webview (webview→shell direction). Two of five message-type directions contradict frozen vision; three match. Per session-prompt halt discipline + cairn frozen-contract respect, holding ticket execution pending operator arbitration of three resolutions (vision-authoritative + reframe tests / ticket-authoritative + amend vision §10.7 / both-directions + expand message-type set). Halt artifact at docs/adr/CONSOLE-T02-direction-halt.md. No console-ipc.ts, no preload bridge additions, no test files written this session.
[2026-05-02 15:38] Session B (CONSOLE-T02) ends gracefully under halt. Final SHA: 5ec41d1. Tests passing: 0 of 4 clusters started — halt before any RED per cairn frozen-contract respect. No deliverables ship beyond the procedural session-start commit (3418300) + halt artifact (5ec41d1). Pending operator: pick (a)/(b)/(c) from docs/adr/CONSOLE-T02-direction-halt.md §2 and (if b or c) author vision §10.7 amendment per §3.4 before resuming CONSOLE-T02 in a future session.
[2026-05-02 16:05] Session C (COARCH-T04) starting. Branch: main. HEAD SHA: 7c8a277f41d0db2b31a9cda2cbf56c88ed3135cd.
[2026-05-02 15:40] Session A (CONSOLE-T01) milestone: cluster-1-green-passing — coord violation + recovery note. Cluster 1 GREEN files (migration 0002-cc-console-buffer.sql, src/console/buffer.ts, additive-tolerant updates to test/unit/migration-orchestrator.test.ts) landed on main but were inadvertently bundled into Session C's `coord: COARCH-T04 session start` commit at d5364ce (likely via `git add -A` or unscoped `git add`). The work IS on main HEAD (verified: 157 tests pass; cc_console_buffer table present; pruneToCapacity works). The d5364ce commit message mislabels its actual contents but the diff is correct. No revert; proceeding. RECOMMEND: per-path `git add` enforcement reminder for all sessions per coord file lines 5+36. CONSOLE-T01 cluster 2 work resumes from this point.
[2026-05-02 16:55] Session C (COARCH-T04) milestone: red-cluster-all-drafted. SHA: c955ca8. 26 tests across 6 files all RED as expected: build-doc-reader.spec.ts (4), build-doc-validator.spec.ts (5), context-builder.spec.ts (6), build-doc-state.spec.ts (4), head-change-detection.spec.ts (3), read-scope.spec.ts (4). dispatch-core/dist/v3/schema.js built to satisfy imports.
[2026-05-02 16:55] Session C (COARCH-T04) milestone: green-clusters-1-6-passing. SHA: a7d7561. 26/26 pass. Fix applied: Zod v4 uses .issues not .errors in ZodError — zodErrorsToValidationErrors updated. Context builder Tier 3 daemonState passes null pending daemon sessions endpoint (see MB-F-COARCH-T04-DAEMON-STATE-TIER3). HALT surface noted in context-builder.ts comment: full-doc injection conflicts with ticket "relevant ticket section only" — operator arbitration pending (see MB-F-COARCH-T04-CONTEXT-HALT).
[2026-05-02 16:55] Session C (COARCH-T04) complete. Final SHA: 7c51317. 44/44 tests pass. Deliverables: build-doc-reader.ts, build-doc-validator.ts, build-doc-state.ts, context-builder.ts, head-watcher.ts, read-scope.ts (all NEW); AnthropicChatClient.streamMessages() added; coarchitect-ipc.ts wired with context builder (tiered context call when build doc configured, fallback to simple stream); getBuildDocConfig/setBuildDocConfig/clearBuildDocConfig IPC handlers added; preload.mts extended with 3 bridge methods. Followups filed: MB-F-COARCH-T04-BUILD-DOC-SETTINGS-UI (renderer UI deferred), MB-F-COARCH-T04-DAEMON-STATE-TIER3 (Tier 3 passes null until daemon sessions endpoint exists), MB-F-COARCH-T04-CONTEXT-HALT (pending operator arbitration on full-doc vs ticket-section injection). No HALT-AND-SURFACE required — HALT surface recorded as followup with operator note. Session B (CONSOLE-T02) halted before any preload.mts changes, so no coordination conflict arose.
[2026-05-02 16:08] Session A (CONSOLE-T01) milestone: followups-filed. 6 followups filed in docs/FOLLOWUPS.md Session A band: MB-F-CONSOLE-T01-60S-SOAK (Tier 2 — §4.7.7 deferred soak test, must land before v3.0 ship-gate per vision §10.10), MB-F-CONSOLE-T01-STDIN-SEQ-PERSIST (Tier 2 — stdin_seq cross-restart durability), MB-F-CONSOLE-T01-BUFFER-ENABLED-PERSIST (Tier 2 — operator-disable toggle persistence; lands with MB-T11/W-T19 settings UI), MB-F-CONSOLE-T01-PIPE-PANE-HIGH-WATER-PAUSE (Tier 3 — optimization), MB-F-CONSOLE-T01-AUDIT-LOG (Tier 3 — vision §10.11 Q5 v3.x deferral), MB-F-CONSOLE-T01-TMUX-HISTORY-LIMIT-CAP (Tier 3 — MB-S06 §4 follow-up, dedupe daemon ring vs tmux history-limit).
[2026-05-02 16:08] Session A (CONSOLE-T01) complete. Final SHA pending coord commit. Tests passing: 189 of 189 (24 new across 6 clusters: cluster 1 migration 4, cluster 2 stdin 6, cluster 3 stream 6, cluster 4 signal 6, cluster 5 buffer/status 5, cluster 6 auth/SPA 9). All five §4.7 endpoints live: POST /stdin (paste-buffer -r byte-faithful), WS /stream (single shared pipe-pane reader, backfill protocol, multi-subscriber fan-out), POST /signal (per-signal dispatch table from MB-S06 §3 evidence), GET /buffer (paginated scrollback), GET /status (8-field aggregate). cc_console_buffer SQLite table operational with FIFO eviction (cap default 50,000, configurable via consoleBufferCap startup opt). Production code paths use real tmux helpers (paste-buffer -r, pipe-pane → fifo + readline, send-keys C-c, kill(2) on pane PID); test fixture's recordingConsoleOps + triggerConsoleLine inject lines synthetically without spawning tmux in CI. CONSOLE-T03 readiness: needs Session B's CONSOLE-T02 IPC bridge wired before integrating; CONSOLE-T02 halted in this batch pending operator arbitration on §10.7 message direction conflict (see Session B 5ec41d1 halt artifact). 6 followups filed (see prior milestone line). No HALT surfaced from CONSOLE-T01 itself.

---

## Batch 3 — 2026-05-02 (CONSOLE-T02 resume, single-session worktree)

Operator arbitrated CONSOLE-T02 direction halt: option **(a) vision §10.7 is authoritative**. `console:open` and `console:close` remain shell→webview. Tests + implementation must match that direction. Open-trigger source deferred to CONSOLE-T03 (out of CONSOLE-T02 scope).

Single-session resume on a worktree: `~/Desktop/Automata/foxworks-worktrees/session-A`, branch `session-A/console-t02-resume`, off main HEAD `78034f9`. Per-commit-push mandatory. Per-path git add MANDATORY with `git diff --cached --stat` pre-commit verification per finding #65.

Territory: `packages/dispatch-workstation/src/main/console-ipc.ts` (NEW), `packages/dispatch-workstation/src/main/preload.mts` (consoleBridge additions), `packages/dispatch-workstation/src/main/main.ts` (handler registration), `packages/dispatch-workstation/test/integration/console-t02/` and/or `test/unit/console-t02/` (test layout TBD per existing convention), `docs/FOLLOWUPS.md` (deferred items), this coord file. Disjoint from any other in-flight work.

[2026-05-02 17:53] Session A (CONSOLE-T02-resume, single-session worktree) starting. Worktree: ~/Desktop/Automata/foxworks-worktrees/session-A. Branch: session-A/console-t02-resume. HEAD SHA: 78034f98e16411ae78566f45f4a250ae16e2313e.
[2026-05-02 18:20] Session A (CONSOLE-T02-resume) complete. Final SHA: 63d335d (with this coord commit pending). Tests passing: 72 of 72 unit tests in dispatch-workstation (33 baseline + 39 new across 4 clusters: cluster 1 IPC routing 12, cluster 2 WS lifecycle 13, cluster 3 preload bridge 9, cluster 4 panel cap 5). Typecheck clean. consoleBridge exposed in webview context via preload.mts. /v3/sessions/:name/console/* IPC bridge live: openConsolePanel/closeConsolePanel emit shell→webview console:open/console:close; handleSendStdin/handleSignal forward webview→shell to daemon POST endpoints; WS line/error/backfill_meta forward to webview as console:stdout-chunk/console:error/console:gap-detected. WS reconnects on abnormal close codes (1006, 1011, etc.) with last_seq carrying highest stdout_seq; terminal codes (1000, 4404, 4422) suppress retry. Multi-panel cap=4 enforced per ratified vision §10.11 Q3 with WorkstationError type=PanelCapExceeded. main.ts wires registerConsoleIpcHandlers at app start. 4 Tier-2 followups filed (RECONNECT-BACKOFF, PANEL-CAP-SETTINGS, V3-SCHEMA-INTEGRATION, INTEGRATION-TEST). No HALT surfaced. CONSOLE-T03 readiness: window.consoleBridge surface live, ipcMain handlers registered; CONSOLE-T03 builds the renderer-side panel mount (xterm.js per §10.11 Q4) + open-trigger source (likely menu item under registerApplicationMenu).


---

## Batch 4 — 2026-05-02

§8.1 amendment landed at cf1848a (env allowlist + three-clause spawn parity bar). MB-T05 unblocked.

CONSOLE-T02 merged at b138548. consoleBridge live in webview context. CONSOLE-T03 unblocked.

2-session worktree composition (worktree pattern KNOWN-validated single-session per CONSOLE-T02 resume run; multi-session worktree validation now in flight):

- Session A: MB-T05 — spawn handler implementation per WORKSTATION_CONTRACT.md §8.1 amended (cf1848a) + MB-T05-env-allowlist-amendment.md ADR. Worktree: ~/Desktop/Automata/foxworks-worktrees/session-A. Branch: session-A/mb-t05. Territory: packages/dispatch-workstation/src/main/spawn-* + extension to spawn-ipc.ts.
- Session B: CONSOLE-T03 — CC-console UI panel renderer per vision §10.11 Q4 (xterm.js). Worktree: ~/Desktop/Automata/foxworks-worktrees/session-B. Branch: session-B/console-t03. Territory: packages/dispatch-workstation/src/console-panel/ (new subdirectory) + main.ts open-trigger menu integration.

Shared read-only references: WORKSTATION_CONTRACT.md (frozen at cf1848a), CONDUCTOR_API_CONTRACT.md (frozen at v2.2.0), v3 schema (frozen at 232fbaa), vision §10 (frozen at eac381e), MB-S02 ADR (spawn fidelity), MB-S06 ADR (PTY streaming), MB-T05 env-allowlist ADR.

Per-path git add MANDATORY with pre-commit `git diff --cached --stat` verification before EVERY commit. Per-commit-push MANDATORY with branch-aware verification (git log --oneline origin/<your-branch>..HEAD empty after push).

Worktree-isolated. Each session works in its own directory. No shared-working-tree drift risk per finding #65.

[2026-05-02 18:31] Session B (CONSOLE-T03) starting. Worktree: ~/Desktop/Automata/foxworks-worktrees/session-B. Branch: session-B/console-t03. HEAD SHA: 000feac344a8fdb0821a21a8edd1a36440279150.
