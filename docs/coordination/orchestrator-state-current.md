---
schema_version: 1
schema_contract: docs/coordination/ORCHESTRATOR_STATE_CONTRACT.md
session_id: orchestrator-2026-05-10-21:07
predecessor_session_id: null
session_started_at: 2026-05-10T21:07:06-06:00
session_ended_at: 2026-05-11T12:41:27-06:00
status: deprecated
context_token_count_at_snapshot: ~920000-940000
context_window_max: 1000000
origin_main_head_at_snapshot: 6217ea0
---

# Orchestrator State — Current Snapshot

Authored 2026-05-11 at predecessor context-pressure threshold per restart protocol. Snapshot for successor to resume coordination autonomously.

## §1 — strategic_frame

- **ship_gate_status**: `alpha-partial` (v3.5-alpha architectural-readiness ✅; measurement-readiness BLOCKED by `MB-F-HSO-CLARIFICATION-FIRST-VS-Q-V35-7A-THRESHOLD-DEFINITION` Tier 1 pending operator path α MB-T41 revision)
- **active_workstream**: wireframe-reconciliation Tier 1 — W3 PHASE 2 execution mid-Wave-A.2 (T3 #4 compact tile closure commit just landed); Waves B + C pending
- **pending_tier1_arbitrations**:
  - `MB-F-HSO-CLARIFICATION-FIRST-VS-Q-V35-7A-THRESHOLD-DEFINITION` — operator path α/β/γ; operator chose α (revise MB-T41) but MB-T41 revision is operator-only per §5.1; execution-side blocked pending operator's revised prompt
  - `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` — inconclusive per T2 Fix-92 finding (Phase B partial); MB-T-DISPATCH-WEB-AUTH-INJECTION ticket body authored 4fb8d41; WB7 will close after Frame C surface dependencies clear

## §2 — frozen_contracts

Canonical entries per schema; SUCCESSOR MUST NOT modify without operator authorization:

- `REGISTRY.md §2`
- `docs/build-docs/CONDUCTOR_API_CONTRACT.md` (3ddca60)
- `packages/dispatch-core/src/v3/schema.ts` §1-§13
- `docs/build-docs/WORKSTATION_CONTRACT.md` §6 (may need amendment for Frame C — sub-Q-MBTWBFCS-A pending)
- `packages/dispatch-workstation/src/main/hso-system-prompts/orchestrator.md` (c88048c; operator-only per §5.1; α path pending revision)

## §3 — arbitrations

| id | question | resolution | commit_sha |
|---|---|---|---|
| Q-OR-1 | v3.5 PTY-replaces-API or alongside? | PTY-replaces-API; REMOVE v3.0 | `28761d1` (ticket body §2.1) |
| Q-OR-2 | pool auto-spawn vs manual? | auto-spawn at workstation startup | `28761d1` (§2.2) |
| Q-OR-3 | WHO calls dispatchActionVariant? | chat-marker-parse on PTY emission (option a) | `28761d1` (§2.3) |
| Q-GATE-2-4 | MB-F-DISPATCH-WEB-AUTH-PERSISTENCE closure path | token-injection | `28761d1` (§2.4) |
| Q-GATE-2-5 | §A.4.R checklist interpretation | operational-readiness reading | `28761d1` (§2.5) |
| Q-GATE-2-6 | Q-V35-7(a) thresholds | confirmed as stated (60-min/≥2 handoffs/≥80%) | `28761d1` (§2.6) |
| D-1 | MB-T40 PtyStreamingBridgeImpl dead-code | absorbed into Q-OR-1 v3.0 removal scope | `28761d1` (§2.7) |
| D-2 | plan-doc edit window timing | deferred to after MB-T-HSO-WIRE merge | `28761d1` (§2.8) |
| Sub-Q-A | argv injection mechanism | (b) env-var injection (`CLAUDE_APPEND_SYSTEM_PROMPT`) | `a02ddae` (WB11 GREEN impl) |
| Sub-Q-B | token-injection scope packaging | (Y) separate `MB-T-DISPATCH-WEB-AUTH-INJECTION` parallel ticket | `4fb8d41` (parallel ticket body) |
| Sub-Q-C | PtyStreamingBridgeImpl disposition | (β) remove entirely | `d50ee08` (WB14a removal) |
| Q-GATE-1 | MB-T41 content review timing | (A) trust c88048c authoring; skip re-read | recorded session-only; no commit |
| Q-WB3-GREEN-PATH | T3 probe-04 reauthor vs T2 WB3 impl shape | (A) T3 reauthors per Path A | `cd135e4` (WB4-revised) |
| Q-WB7-1 | parser observer architecture | (Y) sibling action-marker-router.ts | `d9b5722` (WB7 GREEN) |
| Q-WB7-2 | fire- deps | Sub-Y-1 stub-fires | `d9b5722` |
| Q-WB7-3 | buffer cleanup on session end | defer per WB1 ADR | `d9b5722` |
| Q-WB7-4 | onError sink | `coarchitect:streamError` IPC | `d9b5722` |
| Q-WB12-1 | collision detection mechanism | (β) spawn-side error-mapping | `27ee149` (WB13 GREEN) |
| Q-WB14-1 | v3.0 removal scope split | β with 4-commit split (a/b/c/d) | `c8dd797` (WB14d) |
| Q-WB14-2 | anthropic-api-client.ts disposition | delete | `d50ee08` (WB14a) |
| Q-WB14-3 | test-fixture cleanup scope | delete v3.0 test dirs in WB14c | `66847b2` |
| Q-WB14-4 | schema.ts stale comments | leave per §2.10 | `c8dd797` |
| Q-CLOSEOUT-1..5 (Phase 1) | T3 forward-fix path / T1 ack / etc. | various | `b312f4a` (forward-fix) + `0a8af68` |
| Q-D3-OPTION | Phase D-3 disposition under HSO clarification-first | (d) characterize (skip PASS/FAIL) | `88b7215` |
| Q-D3-α-OR-β-OR-γ | Q-V35-7(a) operationalization | (α) revise MB-T41 (pending operator-side) | `3be4c6b` (Tier 1 row filed) |
| Q-W0 | canonical wireframe reference identified | `~/Downloads/conductor/project/wireframes.jsx` 601 lines | session-only |
| Q-W1 | gap inventory + tier disposition | 5-ticket Tier 1 queue + 3-wave order | session-only |
| Q-W2-Q1..Q5 | sub-session assignments + frozen-contract envelope | as proposed; sub-Q-Y1/Y2 flagged for W3 | session-only |
| Q-MBT-W3-B1 | §B.1 ticket disposition | SUPERSEDED-BY-PRE-SHIPPING (510071e pre-shipped) | `111b788` (audit re-anchor closure) |
| Sub-Q-MBTWBCTM-A,B,C | #4 compact tile sub-Qs | A=(i) hide-all + B=(α) prop-drilled + C deferred WB3 | `a5febe6` + `30e362c` + `6217ea0` |
| Sub-Q-MBTWBFCS-A,B | #2 Frame C sub-Qs | A=α renderer-only + B=i session-summary (WB10 keep HALT) | `a1f7a03` (body) |
| Sub-Q-MBTWBDPFA-A,B,C | #3 detail-pane sub-Qs | (deferred to execution time per body) | `32c7eee` (body) |
| Sub-Q-MBTWTWS-A,B | #5 token-wiring sub-Qs | A=iv +tile-header sibling + B=a inline next to bar | `8ff40a8` (body) |
| Q-FIX01E-PATH | Phase D-1 blocker closure | (a)+(d) path-(E) state machine | `deca210` (WB1 spike + GREEN) |
| Q-FIX01E-CITE | filename cite correction | sessions.json (NOT registry-v2.json) | `3a02373` |
| Q-PATH-E-INSTANCE | path E retry test approach | option (i) surgical jq cleanup | `fc6c512` (D-1 retry PASS) + `9dc19eb` |
| Q-D1-DRIVER | D-3 driver disposition under clarification-first | option (d) halt + characterize | `88b7215` |

## §4 — operational_primitives

```bash
# tmux paste-buffer dispatch (multi-line content; double-Enter submit)
tmux load-buffer -b <buf-id> - <<'EOF'
<content>
EOF
tmux paste-buffer -b <buf-id> -t <session>
sleep 1
tmux send-keys -t <session> Enter
sleep 1
tmux send-keys -t <session> Enter
```
**Why**: dispatched content with special chars (backticks, $, etc.) needs literal preservation; double-Enter submits per Claude Code submission pattern; pre-clear input buffer via BSpace to handle operator-direct-typed artifacts.

```bash
# Pre-dispatch input-buffer clear (Q-INPUT-1=i orchestrator-from-chat pattern)
for i in $(seq 1 50); do tmux send-keys -t <session> BSpace; done
sleep 1
```
**Why**: Q-INPUT-1=i pattern — operator-direct-typed buffers in sub-session inputs should be cleared before orchestrator-relayed dispatches to avoid concatenation; observed throughout session.

```bash
# Pathspec-restricted commit (avoids same-path-cross-session-sweep per MB-F-WORKTREE-SAMEPATH-CROSSSESSION-SWEEP)
git add <specific-path>
git commit -m "..." -- <specific-path>
# OR
git commit -o <specific-path> -m "..."
```
**Why**: shared-worktree parallel-cairn requires per-path discipline; pathspec ON COMMIT (not just add) is the belt-and-suspenders for cross-session safety.

```bash
# §2.6 post-push verification
git push origin main
git --no-pager log --oneline origin/main..HEAD  # expect empty
```
**Why**: confirm push fast-forwarded cleanly; non-empty result = local commits diverged.

```bash
# Sub-session liveness verification
tmux capture-pane -p -t <session> | tail -10  # banner + last lines
# Active: "esc to interrupt" in banner
# Idle: bare banner without "esc to interrupt"
```
**Why**: definitive active/idle signal independent of token-count or regex matching surface prose.

```bash
# Token-count extraction from pane footer (for context-pressure monitoring)
tmux capture-pane -p -t <session> | tail -3 | grep -oE '[0-9]+ tokens' | tail -1 | awk '{print $1}'
```
**Why**: footer reports current session token consumption; surface to operator if approaching 1M context limit.

## §5 — sessions

| name | role | token_count | status | territory | in_flight_ticket_id |
|---|---|---|---|---|---|
| `verify-chat-mount` (T2) | Multi-ticket executor; D-3 + path-E + verification + W3 closure | ~938496 | `idle-standby` (heavy; context-pressure rest recommended) | docs/coordination/ + docs/FOLLOWUPS.md (closure-doc work this session) | none current |
| `c5-ticket-wb1` (T3) | W3 PHASE 2 execution + body authoring | ~721246 | `idle-standby` (just landed 6217ea0 closure commit) | tile.tsx + tile-grid-app.tsx (future) + audit doc + FOLLOWUPS | none current |
| `commit-plan-doc` (T4) | Ticket-body authoring + main.ts/sentinel-zone heavy executor | ~807805 | `idle-standby` | main.ts + hso-pool.ts (prior cycles); future Frame C surface | none current |
| `orchestrator` (this) | Coordination + W3 PHASE 1+2 dispatch | ~920000-940000 | `active` (authoring this snapshot) | docs/coordination/orchestrator-state-* + this restart protocol | this state-snapshot work |
| `__orchestrator_active` | **role=hso_peer_infrastructure** (HSO active peer; spawned by OrchestratorPoolManager at app.whenReady per WB11) | N/A (raw claude CLI; not Claude Code) | `idle-armed` (daemon state=`held` per `/v2/sessions`; tmux alive; created 2026-05-11T10:20:43) | tmux session `__orchestrator_active`; PID 40432; reserved-name registry row in `~/.foxworks-dispatch/sessions.json` | none — peer infra, not orchestrator-dispatched |
| `__orchestrator_standby` | **role=hso_peer_infrastructure** (HSO standby peer; spawned 1s after active per pool sequential await) | N/A | `idle-armed` (daemon state=`held`; tmux alive; created 2026-05-11T10:20:44) | tmux session `__orchestrator_standby`; PID 40445; reserved-name registry row | none — peer infra |

**[KNOWN]** All 6 sessions alive per `tmux list-sessions` at snapshot time (4 orchestrator-coord + 2 HSO peer infrastructure). Successor MUST `tmux list-sessions` on boot per INVARIANT-5.

**HSO peer infrastructure note**: `__orchestrator_active` + `__orchestrator_standby` are pool-managed peer sessions running raw claude CLI with MB-T41 prompt injected via `--append-system-prompt`. They are NOT orchestrator-coordination sub-sessions; successor does NOT dispatch coordination work to them. They are alive as part of v3.5 HSO autonomy infrastructure (per MB-T-HSO-WIRE Phase C verification at `673d5d6`). Successor should verify they remain alive at boot but does NOT manage their lifecycle (that's the workstation's OrchestratorPoolManager via the `held↔armed` Path E state machine at fix01e `deca210`).

## §6 — open_tier1

Best-effort list; successor SHOULD `grep 'Tier 1' docs/FOLLOWUPS.md` + filter to OPEN status via row-body inspection. INVARIANT-6 — gaps surface at successor-side HALT.

| id | closure_paths | blocks |
|---|---|---|
| `MB-F-HSO-CLARIFICATION-FIRST-VS-Q-V35-7A-THRESHOLD-DEFINITION` | (α) revise MB-T41 [operator-only]; (β) document operator-prompt directive-form convention + re-D-3; (γ) revise Q-V35-7(a) threshold def | v3.5-alpha ship-gate measurement rows |
| `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` | (a) token-injection [partial; Fix-92 shipped]; (b) auth-bypass; (c) accept-as-onboarding-step. Status: INCONCLUSIVE per T2 Phase B finding | dogfood Phase B; v3.5 ship-gate |
| `MB-F-W3-BATCH-1-STALE-DISPATCH-2026-05-11` | Already addressed: e41c9ea SUPERSEDED-BY-PRE-SHIPPING at 111b788; methodology finding documented | none (informational; closed) |
| (other historical Tier 1 from `grep`) | Many CLOSED; successor to filter via row-body status anchors | various |

**[MODELED]** Several `MB-F-MB-T07-*` / `MB-F-MB-T08-*` / `MB-F-MB-T05-*` rows from earlier ticket cycles may still be Tier 1 OPEN per `grep`. Successor verify each row's CLOSED-or-OPEN status before assuming ship-gate-blocking.

## §7 — gates

| id | status | commit_references | notes |
|---|---|---|---|
| GATE 0 (orientation) | `complete` | session-only | post-Phase-1 close-out |
| GATE 1 (MB-T41 verify) | `complete` | `c88048c` | KNOWN-shipped-and-loadable; Q-GATE-1=A operator skipped re-read |
| GATE 2 (arbitrations) | `complete` | `28761d1` (ticket body) | 8 arbitrations + 2 dispositions recorded |
| GATE 3 (ticket-body authoring) | `complete` | `28761d1` | MB-T-HSO-WIRE ticket body |
| GATE 4 (execution) | `complete` | `a600493` (WB17 docs) | 21 commits across 17 WBs (incl. WB14 4-split + fix01e + path-E + crash-recovery + shutdown-hook + auth-injection partial) |
| GATE 5 Phase A (liveness) | `complete` | session-direct verification | daemon healthy on :7878 (HTTP 401 auth-gate); tmux 4 sessions alive |
| GATE 5 Phase B (UI render) | `partial` | `eb69cc0` + `7a610b8` (Phase B docs + 2 followups filed) | webview-forwarder-gap; Fix-92 partial-verify only |
| GATE 5 Phase C (auto-spawn) | `complete` | `673d5d6` + `870e991` | path-E end-to-end verified; 2 new followups filed |
| GATE 5 Phase D-1 | `complete` (retry-PASS) | `fc6c512` (5-min PASS post-fix01e) | original blocked at `7c175f0`; fix01e at `deca210`; retry-stale-dist + cleanup |
| GATE 5 Phase D-2 | `complete` (MIXED) | `4986b69` (15-min sustained + held↔armed) | 3 new followups filed |
| GATE 5 Phase D-3 | `complete` (CHARACTERIZED) | `88b7215` + `3be4c6b` | Q-V35-7(a) characterized not PASS/FAIL; Tier 1 row filed |
| GATE 6 (v3.5-alpha ship-gate eval) | `halted-pending-operator` | session-direct §E.1 evaluation | PARTIAL PASS per orchestrator; BLOCKED on path α MB-T41 revision |
| W0 (wireframe discovery) | `complete` | session-only + audit-doc anchor | canonical at `~/Downloads/conductor/project/wireframes.jsx` |
| W1 (gap inventory) | `complete` | session-only | 5-ticket Tier 1 queue surfaced |
| W2 (sequencing) | `complete` | session-only | 3-wave plan acked; tile.tsx contention noted |
| W3 PHASE 1 (body authoring) | `complete` | `e41c9ea` (SUPERSEDED) + `dec21c1` + `a1f7a03` + `32c7eee` + `8ff40a8` + `111b788` (closure) | 4 valid bodies; 1 superseded; closure landed |
| W3 PHASE 2 Wave A.2 | `complete` | `a5febe6` + `30e362c` + `6217ea0` | #4 compact tile WB1+WB2+WB3 docs |
| W3 PHASE 2 Wave B (Frame C #2) | `not-entered` | — | next dispatchable; recommend T4 |
| W3 PHASE 2 Wave C (#3 + #5) | `not-entered` | — | depends on Wave B Frame C surface landing |
| W4 (execution dispatch loop) | `partial` | various | continuing per W3 PHASE 2 |
| W5 (wireframe audit re-anchor) | `not-entered` | — | LOAD-BEARING per A-W1-5; runs after Wave A/B/C lands |

## §8 — discipline

- **strict_mode**: `true` (CLAUDE.md §2 cairn discipline)
- **auto_ack_scope** (table — what auto-acks without operator chat-ack per current dispatch):

| category | auto_ack? | rationale |
|---|---|---|
| RED probe commits (auto-fail tests; no production code) | YES | red-only; production behavior preserved |
| GREEN impl commits with passing probes + clean typecheck + cross-session staging verified | YES | mechanical verification suffices |
| Push commits after §2.6 verification | YES | per CLAUDE.md §4.2 separate ack cycle BUT operator delegated under autonomous mode |
| docs/FOLLOWUPS.md row appends | YES | mechanical content; row body per operator-acked template |
| Pathspec-restricted commits | YES | discipline-only |

- **hard_escalation_triggers** (operator chat-ack required):

  1. NEW arbitration question surfaces (operator-territory per §3.4)
  2. Frozen-contract amendment needed (REGISTRY.md §2, CONDUCTOR_API_CONTRACT.md, schema.ts §1-§13, WORKSTATION_CONTRACT.md §6)
  3. Cross-session same-path-sweep collision (`MB-F-WORKTREE-SAMEPATH-CROSSSESSION-SWEEP` recurrence)
  4. Test failure outside CLAUDE.md §4.5 pre-existing baseline
  5. Anti-fabrication concern from sub-session
  6. Destructive operator-data operation (e.g., sessions.json edit, kill of operator-named tmux session)
  7. Sub-Q-A/B/C entry points (WB11 argv injection / WB14 v3.0 removal / WB15 token-injection)
  8. Force-push / amend-published / git config / no-verify hooks
  9. Operator-only-territory work (MB-T41 content revision, schema/contract authoring)

## §9 — next_actions

| priority | description | target_session | blockers |
|---|---|---|---|
| 1 | Dispatch Wave B execution (#2 §C1P2 Frame C surface) | T4 (sentinel-zone-context advantage; 808k tokens manageable) | none — body landed `a1f7a03`; T4 idle-standby |
| 2 | After Wave B lands, dispatch Wave C parallel (#3 detail-pane + #5 token-wiring) | T3 + T2 or T4 (path-disjoint files) | depends on #1 |
| 3 | GATE W5 audit re-anchor: re-run wireframe audit at post-Wave-C HEAD | new sub-session OR orchestrator-direct | depends on #2 |
| 4 | After GATE W5 produces post-anchor audit: gap-closure verification per W1 disposition | orchestrator-direct | depends on #3 |
| 5 | Operator-side: Path α MB-T41 revision for Q-V35-7(a) operationalization | operator-only (§5.1) | unblocks re-D-3 measurement |
| 6 | After Path α revision: re-D-3 60-min Q-V35-7(a) ship-gate measurement | T2 or new dogfood-driver session | depends on #5 |
| 7 | D-2 plan-doc edit window batch (8 items: SHA correction; §A.4.R re-arbitration outcome; §7.4 KNOWN promotions + claim 3 correction; §11 GATE 2 outcomes summary; §6.3 zone enumeration; MB-T17 dual-AutopilotLoop) | operator-edit (not delegable) | none |

## §10 — anti_patterns

Quick-reference subset; full discipline in CLAUDE.md §9:

- ❌ Modify MB-T41 prompt content (operator-only §5.1)
- ❌ Modify frozen contracts without operator arbitration
- ❌ `git add -A` (per-path always per §2.7)
- ❌ Chain operator-arbitrated actions behind verification commands
- ❌ Bundle followup-row writes with WB execution commits (separate commits)
- ❌ Force-push / amend-published / --no-verify
- ❌ Pretend a stale-dispatch is fresh (cairn discipline §2.1 anti-fabrication)
- ❌ Submit operator-direct-typed buffered text without chat ack (Q-INPUT-1=i)
- ❌ "Useful prep" during halt (§2.5)
- ❌ Force "Improved" outcome framing where evidence is mixed (§2.11)

---

## §12 — protocol_file_local_deferred

Per HALT-CONTEXT-CHECK=(D) operator disposition 2026-05-11: COMMIT 3 (restart protocol) DEFERRED to successor-first-action post-boot.

Local file present, untracked:
- Path: `docs/coordination/orchestrator-self-restart-protocol.md`
- Lines: 168
- Authored under §3.4 mechanical translation in this orchestrator session
- Contains: §1 trigger threshold (~750k) + §2 spawn command + §3 first-message prompt for successor + §4 cleanup + §5 deprecation commit + §6 drift-handling + §7 invariants (INV-RP-1 to INV-RP-5) + §8 anti-patterns + §9 future enhancements

**Successor's first post-boot action** (after HALT-ORCHESTRATOR-N-LOADED + operator ack):
1. Read local `docs/coordination/orchestrator-self-restart-protocol.md`
2. Verify content integrity (line count ≥160; no truncation indicators; mid-section breaks)
3. If intact: commit as `docs(orchestrator-self-restart-protocol): author self-restart protocol [deferred-from-predecessor per HALT-CONTEXT-CHECK]` with Co-Authored-By
4. If truncated/missing: re-author from this §12 description + first-message template OR escalate to operator

This is mechanical commit work; no operator arbitration required for the commit ITSELF (the content is operator-acked at HALT-FROZEN-CONTRACT-PRE-COMMIT 2026-05-11).

---

## Synthesis for successor

**The session's central thread**: v3.5 critical path execution from mechanism-shipped/wiring-missing (HEAD `dd08d24` at session start) → MB-T-HSO-WIRE authored + executed (21 commits) → Phase A/B/C dogfood PASS → Phase D characterized with Tier 1 ship-gate-affecting finding → wireframe reconciliation Tier 1 queue (5 tickets; 1 SUPERSEDED, 1 executed, 3 remaining).

**Key load-bearing arbitrations**: Q-OR-1 (PTY-replaces-API), Sub-Q-A=b (env-var injection), Sub-Q-B=Y (parallel auth ticket), Sub-Q-C=β (remove dead code), Q-D3=d (characterize not PASS/FAIL), W3-B1-SUPERSEDED.

**Critical successor knowledge**:
1. Path α MB-T41 revision is operator-side gating ship-gate measurement
2. Wave B #2 Frame C surface is heaviest remaining ticket; T4 has sentinel-zone context advantage
3. GATE W5 audit re-anchor is LOAD-BEARING per A-W1-5; current audit anchored at stale `5704dd2`
4. T2 at 938k tokens — near context limit; defer heavy work to T3 + T4
5. `tile-grid-app.tsx` does NOT subscribe to FrameMode (MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP Tier 2 filed at `6217ea0`) — compact tile mode INERT until threading lands

**Operator's autonomous-mode delegation**: explicit since 2026-05-11; auto-ack scope per §8 above; hard-escalation triggers strict.

---

**End of state snapshot.**
