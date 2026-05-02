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
