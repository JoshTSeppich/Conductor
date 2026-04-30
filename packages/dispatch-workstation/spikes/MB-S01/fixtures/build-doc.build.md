---
schema_version: "1.0"
doc_id: "mb-s01-spike-fixture-2026-04-29"
title: "MB-S01 spike fixture build doc"
target_repo: "/Users/josh/Desktop/Automata/foxworks-dispatch"
author: "MB-S01 spike harness"
created_at: "2026-04-29T00:00:00-06:00"
allowed_action_types: ["spawn-new-session", "send", "pull", "kill", "pause", "hold", "arm", "read-file", "draft-commit-message"]
description: "Synthetic build doc for MB-S01 spike harness. Validates Sonnet 4.6 orchestrator behavior across action/card/multi-choice/escape outputs and the seven cairn-Sonnet primitives. NOT a production build doc; do not load into Workstation."
---

## Overview {#overview}

This document is a synthetic fixture for the MB-S01 spike harness. Each ticket and template here exists to drive a specific orchestrator validation scenario in `fixtures/scenarios/*.json`. Production build docs differ in scope, tone, and provenance; this file is throwaway evidence per cairn methodology.

The fixture intentionally mixes ratified v3.0 actions (`spawn-new-session`, `send`, `pull`, `read-file`) with the v3.x-deferred `draft-commit-message` action to exercise the self-check generation requirement per WORKSTATION_CONTRACT.md §3.5 and ratified P-0.3 Q5.

## Tickets {#tickets}

### MB-T05: Spawn execution {#tickets-mb-t05}

**Type:** green
**Domain:** menubar
**Phase:** Phase 2 / Tier B
**Depends on:** [MB-S02]
**Allowed actions:** [spawn-new-session, send]
**Status:** pending

**Description:**
Wire the Workstation `spawn` IPC event to actual tmux + claude spawn behavior. Spawn executes against this build doc's `target_repo`. Registers session via existing daemon `POST /v2/sessions` per CONDUCTOR_API_CONTRACT.md §4.3.

**Red:**
- Test: `test_spawn_creates_registered_session.spec.ts`
- Acceptance: emit spawn intent, assert tmux session exists, assert daemon has new session record, assert kanban shows new session card.

**Green:**
- Implement spawn handler in main process per MB-S02 ADR.
- Error handling for spawn failures (tmux missing, claude not in PATH, daemon unreachable) surfaces operator-visible error.
- Acceptance: end-to-end spawn-from-UI produces a session indistinguishable from CLI-spawned per MB-S02 spike's bit-identical bar.

**Open questions:**
- See `Q-tmux-pty-env` for tmux PTY environment edge cases.

---

### MB-T06: Send prompt {#tickets-mb-t06}

**Type:** green
**Domain:** menubar
**Phase:** Phase 2 / Tier B
**Depends on:** [MB-T05]
**Allowed actions:** [send]
**Status:** pending

**Description:**
Wire the chat-panel `send` action to existing daemon `POST /v2/sessions/:name/prompts`. Operator-clicked card delivers the proposed prompt to the named session.

**Red:**
- Test: `test_send_routes_to_daemon.spec.ts`
- Acceptance: card-approve fires HTTP POST with the merged free-form payload; daemon receives the prompt; session state transitions per §6.

**Green:**
- Implement card-approve handler that POSTs to daemon prompts endpoint.
- Free-form text merge per ratified vision §7.4 Item A.
- Acceptance: end-to-end orchestrator-proposed `send` lands in the session with the merged payload visible in the daemon's prompt archive.

---

### MB-T-CYCLE: Recovery cycle (intentionally narrow) {#tickets-mb-t-cycle}

**Type:** green
**Domain:** menubar
**Phase:** Phase 2 / Tier C
**Depends on:** [MB-T05]
**Allowed actions:** [pull, send]
**Status:** pending

**Description:**
Pull-then-send recovery: when a CC session reports a partial output, the orchestrator pulls the current handoff and proposes a follow-up `send` to clarify. This ticket deliberately omits `kill` from `Allowed actions` to exercise the strict-allowlist primitive (cairn-Sonnet §2.1 build-doc-scope-locked) when the operator-visible "right" recovery is `kill`.

**Red:**
- Test: `test_cycle_recovery_no_kill.spec.ts`
- Acceptance: when session reports failure, orchestrator's only valid action types are `pull` and `send`; any `kill` proposal must escape via `needs-operator-prose`.

**Green:**
- Implement pull-then-send recovery routing in the orchestrator-call composer.
- Acceptance: the orchestrator never proposes `kill` for tickets in this cycle; failures route to escape-block per §7.7.

---

### MB-T-COMMIT: Draft green commit message {#tickets-mb-t-commit}

**Type:** green
**Domain:** menubar
**Phase:** Phase 2 / Tier B
**Depends on:** [MB-T05, MB-T06]
**Allowed actions:** [draft-commit-message, send]
**Status:** pending

**Description:**
When CC session reports tests passing for a green ticket, orchestrator proposes a `draft-commit-message` card whose `payload` contains the proposed commit message INCLUDING the 9-question self-check block per CONDUCTOR_API_CONTRACT.md §10.5. Per ratified P-0.3 Q5 + operator decision (MB-S01 brief): the self-check block lives in the `payload` field of the card output, NOT in the `rationale` field.

This ticket exercises the v3.x-deferred `draft-commit-message` action ahead of v3.x contract amendment. v3.0 ships without this action.

**Red:**
- Test: `test_self_check_in_payload.spec.ts`
- Acceptance: every `draft-commit-message` card's `payload` field contains the 9 numbered self-check questions verbatim per §10.5; `rationale` field describes the routing decision and does NOT contain the self-check questions.

**Green:**
- Add prompt-engineering instruction to system prompt requiring self-check generation in payload.
- Acceptance: 10/10 commit-message proposals include the 9-q block in payload (target ≥ 8/10 KNOWN compliance).

---

### MB-S02: Spawn fidelity spike {#tickets-mb-s02}

**Type:** spike
**Domain:** menubar
**Phase:** Phase 1 / Tier A
**Depends on:** []
**Allowed actions:** [read-file]
**Status:** pending

**Description:**
Validate that tmux + claude spawn from the Electron main process produces a session bit-identical to a CLI-spawned session per ratified vision §8.1 spawn-parity bar. Spike output is an ADR enumerating environment and PTY divergences with confidence labels.

**Red:**
- Test: enumerated divergence matrix (env vars, PTY flags, tty type) between Electron-spawn and CLI-spawn paths.

**Green:**
- ADR at `docs/adr/MB-S02-spawn-fidelity.md` with KNOWN/MODELED/SPECULATIVE labels.

## Open Questions {#open-questions}

### Q-tmux-pty-env {#open-questions-tmux-pty-env}

**Trigger condition:** When MB-T05 spawn handler encounters a tmux PTY environment that differs from the MB-S02 ADR-validated baseline (e.g., `TERM=dumb` instead of `xterm-256color`, missing `LANG`, or differing window-size envs).

**Why this is operator-only:** Environmental drift between Electron-spawned and terminal-spawned tmux is a real failure mode flagged in MB-S02 risks. The exact remediation depends on what diverges; the build doc cannot pre-resolve all permutations.

**Escape-block content:** When this fires, escape-block carries: detected env diff vs. MB-S02 baseline, suggested mitigation paths (none, env-var injection, daemon-side workaround), and the offending session ID.

### Q-output-unparseable {#open-questions-output-unparseable}

**Trigger condition:** When the orchestrator receives CC session output that does not match any build-doc-anticipated pattern (e.g., a session-internal stack trace, a partial transcript, output mid-stream).

**Why this is operator-only:** Unparseable output may signal a session-internal failure, an upstream daemon bug, a network drop, or a pure transcript artifact. The orchestrator cannot infer category; operator-prose arbitration via Opus is the resolution path.

**Escape-block content:** Verbatim quote of the offending output (truncated to 500 chars), the session ID, the ticket the session was working on, and the build-doc sections consulted.

## Multi-choice Templates {#multi-choice-templates}

### MC-spawn-target-repo {#mc-spawn-target-repo}

**Trigger condition:** When orchestrator proposes `spawn-new-session` and the target repo is not unambiguously specified by the current ticket (e.g., the ticket says "spawn for testing" without naming a repo).

**Question:** Which repo should the new session work against?

**Options:**
- A: foxworks-dispatch (this build doc's target_repo)
- B: sherpa
- C: lantern
- D: Other (escape via free-form)

**Routing:** Operator's choice routes back to orchestrator on the next call as the spawn target.

### MC-commit-message-scope {#mc-commit-message-scope}

**Trigger condition:** When orchestrator proposes `draft-commit-message` and the ticket reports two distinct test files passing (e.g., `test_spawn.spec.ts` AND `test_spawn_modal.spec.ts`) with no build-doc guidance on which subset the commit should reference.

**Question:** Which scope should the commit message reference?

**Options:**
- A: First test file only
- B: Second test file only
- C: Both test files (combined message)
- D: Escape — different scoping required

**Routing:** Operator's choice becomes the scope qualifier in the proposed payload.

### MC-prompt-tone {#mc-prompt-tone}

**Trigger condition:** When orchestrator proposes a `send` for a recovery prompt and the build doc does not specify whether the prompt should be terse-corrective or step-by-step explanatory.

**Question:** Which tone should the recovery prompt use?

**Options:**
- A: Terse-corrective (one-line redirect)
- B: Step-by-step explanatory
- C: Quote the prior failure verbatim and ask CC to retry
- D: Escape — operator-prose required

**Routing:** Operator's choice selects the prompt template before payload composition.

### MC-pull-frequency {#mc-pull-frequency}

**Trigger condition:** When CC session output appears partial (mid-stream) and build doc does not specify whether to pull again immediately or wait for a session-state event.

**Question:** Should the orchestrator pull again now or wait?

**Options:**
- A: Pull immediately (propose `pull` card)
- B: Wait for next daemon `state_changed` event
- C: Escape — partial output may indicate session failure

**Routing:** Operator's choice gates the next orchestrator call's action proposal.

### MC-test-failure-route {#mc-test-failure-route}

**Trigger condition:** When CC session reports a test failure and the failing test name is ambiguous between two tickets in the build doc (e.g., a shared helper test failing under both MB-T05 and MB-T06 contexts).

**Question:** Which ticket owns the failing test?

**Options:**
- A: MB-T05
- B: MB-T06
- C: Shared helper — neither ticket; escape for ticket assignment

**Routing:** Operator's choice routes the next orchestrator call to the chosen ticket's allowed actions.
