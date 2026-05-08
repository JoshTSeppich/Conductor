# MB-T26 Findings — Cost Meter (Conductor API spend)

**Date:** 2026-05-07
**Final HEAD:** WB4 docs commit (this file)
**WB ladder:** Phase 1 → WB1 red → WB2 green-calc → WB3 green-integration → WB4 docs (4-WB ladder per Q-MBT26-8=b)
**Outcome classification (CLAUDE.md §2.11):** **Capability enabled with known limitations.** Cost meter ships with hardcoded MODEL_RATES, push-based bridge, date-keyed local-TZ ledger. Operator-editable rate table deferred to MB-T33 profile system. Initial-mount empty-state UX deferred per Tier 3 followup.

---

## I. Summary

MB-T26 ships a cost meter that displays per-day Conductor API spend at the top of `chat-shell` (left of where MB-T27 model-mix and MB-T25 plan-usage will land). Cost is captured via an `onUsage` callback in `AnthropicChatClient.streamMessages` (Q-MBT26-3=c), persisted to a date-keyed JSON ledger at `<userData>/conductor-cost-ledger.json` (Q-MBT26-4=a, mirrors splitter-state.ts per CLAUDE.md §3.5), and pushed to the renderer via a new `coarchitectBridge.onCostUpdate` method (Q-MBT26-5=d, **re-disposed mid-WB3** from initial Q-MBT26-5=c after the design-contradiction surface — see §VIII).

The sentinel-zoned `chat-shell-header-bar` element above the tab-strip hosts the cost-meter slot inside Terminal B's MB-T22 reserved extension-point zone (a08b406). Terminal D's MB-T27 model-mix slot will land as a sibling sentinel zone in the same header-bar element.

`MODEL_RATES` ships with one entry: `claude-sonnet-4-6` at $3/$15 per Mtok ([MODELED] from operator's knowledge cutoff Jan 2026; drift risk tracked in MB-F-T26-RATE-TABLE-PROFILE-MIGRATION). Daily reset is implicit via date-key derivation in local timezone — no timer required.

---

## II. WB ladder reference

| WB | Commit | Type | Tests | Note |
|---|---|---|---|---|
| Phase 1 | (under e02aa52 by T21 sweep — content correct, attribution off per Q-MBT26-METHO-1=c) | spike | n/a | Surface inventory + Q-MBT26-1..9 + R-MBT26-1..8 with tentative dispositions |
| WB1 | `a1e41fc` | red | 4 fail / 1 incidental pass (5 tests) | Scaffold cost-calc + cost-ledger + cost-meter + probe-01 + cross-session coord doc |
| WB2 | `16e2302` | green | 11/11 pass (probe-01: 5, probe-02: 6) | MODEL_RATES + computeCost + cost-ledger persistence (read/append/sum/prune) |
| WB3 | `09b38ce` | green | 15 new + 3 stale-contract test edits (76/77 pass; 1 pre-existing fail unrelated) | onUsage callback + IPC wiring + chat-shell-header-bar slot + push-based onCostUpdate + preload.mts +1 method |
| WB4 | this commit | docs | n/a | Findings + FOLLOWUPS amendments + 8 followups + t26-t27-coord update |

**Total tests authored: 26** (probe-01 cost-calc: 5, probe-02 cost-ledger: 6, probe-01 anthropic-client: 6, probe-01 cost-meter: 8 — counted as 8 due to nested describes; probe-05 chat-shell: 6 = 5 unique scenarios — actual run shows 5+6 = total grouped distinct).

[KNOWN] from `pnpm exec vitest run`: at HEAD before this WB4 commit, scoped suite shows 76 passed / 1 failed (77 total) where the 1 failure is the pre-existing `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` per CLAUDE.md §4.5.

---

## III. Acceptance verification

Per ticket scope (operator-given prompt):

| Acceptance | Verification |
|---|---|
| Cost updates on each conductor API call | `coarchitect-ipc.ts` MB-T26 zone wires `captureUsageToLedger` as onUsage callback into 3 streamMessages/streamMessage call sites; on each invocation, computes cost + appends to ledger + broadcasts `coarchitect:cost-update` to all webContents. probe-01 anthropic-client (6 tests) verifies onUsage fires once per stream completion with correct field provenance. |
| Reset at midnight local time | `cost-ledger.ts` `todaysDateKey()` derives via `Date.toLocaleDateString('en-CA')` (yields YYYY-MM-DD in operator-machine-local TZ). `todaysTotalCost()` reads only today's bucket. After local-midnight, the next call writes under a new date-key and the meter reads $0.0000. probe-02 cost-ledger (6 tests) verifies date-key format + read-back + sum + prune. |
| Per-model rate table operator-editable in profile | **DEFERRED** to MB-T33 profile system per Q-MBT26-2=a (operator-confirmed 2026-05-07). v3.0 ships hardcoded `MODEL_RATES['claude-sonnet-4-6']`; followup `MB-F-T26-RATE-TABLE-PROFILE-MIGRATION` (Tier 2; closes at MB-T33) tracks the migration. |
| Unit tests for cost calc | probe-01 cost-calc (5 tests): MODEL_RATES table shape (entry exists + positive rates) + computeCost (rate multiplication + zero-token short-circuit + throw-on-unknown-model). 5/5 pass at WB2 green. |
| Out-of-scope: historical cost charts | Not implemented per ticket scope. Date-keyed ledger persists 7 days of history (PRUNE_RETENTION_DAYS) which is an architectural enabler for future history charting. |
| Out-of-scope: per-feature cost breakdown | Not implemented. Each ledger entry records `{timestamp, model, inputTokens, outputTokens, costUsd}` — sufficient for future feature-tagging if added. |
| Out-of-scope: budget alerts | Not implemented. |

Header-bar visual placement (Q-MBT26-1=a): `chat-shell-header-bar` element renders ABOVE the tab-strip with role="toolbar" and aria-label="Chat shell header". probe-05 chat-shell (6 tests) verifies element renders inside chat-shell-root, has role=toolbar, appears BEFORE tab-strip in DOM order, hosts the renderCostMeter slot. Slot ordering left-to-right per t26-t27-coord.md: [plan-usage MB-T25 future] | [cost-meter MB-T26 — this] | [model-mix MB-T27 — Terminal D].

Push-based bridge (Q-MBT26-5=d): `preload.mts` MB-T26 zone adds `coarchitectBridge.onCostUpdate(cb)` method. Implementation: invokes `coarchitect:getDailyCost` for initial value; subscribes to `coarchitect:cost-update` events for live updates; returns cleanup-fn. probe-01 cost-meter (8 tests) verifies subscription at mount + display update + 4-decimal formatting + cleanup on unmount.

---

## IV. Runtime-launch smoke (CLAUDE.md §4.6)

Workstation merges that touch `src/main/*.ts` MUST include runtime smoke before merge to main. WB3 touched `anthropic-client.ts`, `coarchitect-ipc.ts`, `preload.mts` — all in `src/main/`. Smoke run from this session at WB4 (CLAUDE.md §4.6 trigger):

```
$ MB_TEST_HOOKS=1 pnpm --filter dispatch-workstation exec electron dist/main/main.js
WINDOW_STATE 1024 768
SPLITTER_LOADED 380
SHELL_READY
RENDER_OK              ← ChatPanel mounted (chat flow exercised)
WINDOW_READY           ← within 3 seconds (under §4.6 ~10s gate)
TILE_GRID_MOUNTED
APPROVAL_POLICY_IPC_MOUNTED
AUTOPILOT_IPC_MOUNTED
ONBOARDING_READY
BOOTSTRAP_TOKEN_WRITTEN 44
```

All 10 expected sentinels fired. Zero stderr errors. WINDOW_READY at ~3s (well under the §4.6 ~10s gate). RENDER_OK is load-bearing — proves the chat-shell renderer mounted, ChatPanel initialized, coarchitectBridge passthrough held.

`CHAT_SHELL_MOUNTED` not in allowlist (`MB-F-T20-CHAT-SHELL-MOUNTED-SENTINEL-FORWARDING` Tier 3, deferred). RENDER_OK substitutes as load-bearing evidence.

**No MB-T26-specific sentinel emitted** (cost-meter mounts as a child of chat-shell-header-bar; surrounding ChatShell mount is verified by RENDER_OK + probe-05 unit tests). For v3.0 this is sufficient; if a future ticket wants live-API cost capture verified end-to-end, file a sentinel for the `coarchitect:cost-update` broadcast emission.

---

## V. Cross-session events (parallel-cairn — 4-session run with A/B/D)

| Event | Timing | Resolution | Tracked at |
|---|---|---|---|
| **Incident #1**: Terminal A's `e02aa52 spike(MB-T21):` swept Terminal C's mb-t26-diagnose-2026-05-07.md into their commit (per-path discipline failure at Terminal A) | Phase 1 → WB1 | Q-MBT26-METHO-1=c (operator-arbitrated): accept-as-is + file finding at WB4. Phase 1 content correct under wrong attribution. | MB-F-T26-METHO-1-T21-T26-CROSS-SESSION-SWEEP (this WB4) |
| Atomic-chain diff-verify caught the contamination at MY end | WB1 commit attempt | Aborted commit before push; no double-commit. Validated `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (Tier 1) defense | (existing followup) |
| **Incident #2**: Terminal B's uncommitted MB-T22 WB2 in shared working tree (chat-shell.tsx + mount.ts dirty) blocked my WB3 design — could not stage without sweeping foreign authorship | mid-WB3 | Halt + surface to operator. Operator confirmed Terminal B's WB2 had landed at a08b406 by then; pulled, re-read against committed shape, authored MY MB-T26 zone INSIDE Terminal B's reserved sentinel zone | MB-F-PARALLEL-CAIRN-WORKING-TREE-BLOCKING (Tier 1; this WB4) |
| **Q-MBT26-5 design contradiction** discovered post-arbitration: Q-MBT26-5=c assumed a generic IPC invoke surface that doesn't exist in preload.mts | mid-WB3 | Halt + surface. Operator re-disposed Q-MBT26-5=d (push-based via onCostUpdate); 1-line preload.mts addition (additive method). | MB-F-T26-Q-DISPOSITION-INFEASIBILITY-ROUND-2 (Tier 2; this WB4) |
| **Incident #3**: Content-sweep of preload.mts at 09b38ce — my WB3 commit captured Terminal B's uncommitted MB-T22 commits-bridge addition (lines 158-179) in the same file where I added MB-T26 cost-meter bridge (lines 32-55) | WB3 commit | NOT detected by atomic-chain diff-verify (which protects path-set, not content provenance). Detected post-commit by operator inspection + Terminal B's WB3 commit body explicitly cites `09b38ce content-sweep`. Forward fix: git worktree-per-session per CLAUDE.md §4.3. | MB-F-PARALLEL-CAIRN-SHARED-TREE-CONTENT-SWEEP (Tier 1; this WB4) |
| `§3.11 courtesy delay` (operator-prescribed 30s halt before atomic-chain) harness-blocked across all forms (chained, standalone, with trailing echo) in Claude Code 2.1.133 | WB1, WB2, WB3 | Round 2 evidence (operator's message). Continue without; atomic-chain diff-verify is load-bearing protection. §3.11 is per-session-conditional (Terminal A executed sleep chains successfully — operator verified). | MB-F-§3.11-COURTESY-DELAY-HARNESS-INCOMPATIBILITY-ROUND-2 (Tier 3; this WB4) |
| Q-MBT26-5 originally =c (polling, no preload edit) → re-disposed =d (push-based, +1 method) after technical infeasibility surfaced | WB3 | Operator-arbitrated re-disposition; supersedes the original Q-MBT26-5=c. preload.mts gain of 1 method confirmed additive (not contract amendment). | (this row + MB-F-T26-Q-DISPOSITION-INFEASIBILITY-ROUND-2) |

**Methodology takeaway:** parallel-cairn discipline is robust against index-race (atomic-chain protects both before and after), but reveals **two distinct shared-tree failure modes** that atomic-chain does NOT address:
1. **Working-tree-blocking** — uncommitted authoring in another session's territory that overlaps with this session's needed authoring location. Workaround: halt-and-coordinate; durable fix: worktree-per-session.
2. **Content-sweep** — my own uncommitted edit to a file (legitimate own-territory) co-mingled with another session's uncommitted edit to the same file. atomic-chain confirms path is mine; it does NOT confirm content slice within the path is exclusively mine. Workaround: per-section read-back before stage; durable fix: worktree-per-session.

Round 3 evidence (per operator) of §3.12 worktree-pivot trigger threshold met.

---

## VI. Q-MBT26-N + R-MBT26-N final dispositions

All Q-MBT26-1..9 = (a) or (d) operator-confirmed 2026-05-07. Q-MBT26-5 re-disposed =c → =d mid-WB3 (operator-arbitrated).

| ID | Disposition | Verified by |
|---|---|---|
| Q-MBT26-1 | (a) header-bar slot model | probe-05 chat-shell (6 tests) verify chat-shell-header-bar element + slot prop + DOM order ABOVE tab-strip; commit 09b38ce diff confirms structural placement |
| Q-MBT26-2 | (a) hardcoded MODEL_RATES + TODO MB-T33 followup | cost-calc.ts MODEL_RATES const + MB-F-T26-RATE-TABLE-PROFILE-MIGRATION filed at this WB4 |
| Q-MBT26-3 | (c) onUsage callback in AnthropicChatClient signature | probe-01 anthropic-client (6 tests) verify onUsage fires + field provenance (inputTokens from message_start, outputTokens from message_delta cumulative, model from message_start) |
| Q-MBT26-4 | (a) date-keyed JSON ledger in userData | cost-ledger.ts mirrors splitter-state.ts pattern; probe-02 cost-ledger (6 tests) verify persistence + sum + prune + isolation via MB_COST_LEDGER_DIR env-var |
| Q-MBT26-5 | (d) push-based via onCostUpdate (re-disposed mid-WB3 from =c) | preload.mts MB-T26 zone adds onCostUpdate method (1 line addition); probe-01 cost-meter verifies subscription pattern; commit 09b38ce diff confirms additive surface |
| Q-MBT26-6 | (a) Terminal C lands first inside Terminal B's reserved zone | t26-t27-coord.md authored at WB1; chat-shell.tsx MB-T26 sentinel zone at 09b38ce nested INSIDE Terminal B's MB-T22 zone (a08b406) |
| Q-MBT26-7 | (a) date-key derived midnight reset | cost-ledger.ts `todaysDateKey()` returns `Date.toLocaleDateString('en-CA')`; probe-02 verifies YYYY-MM-DD format |
| Q-MBT26-8 | (b) 4 WBs (red → green-calc → green-integration → docs) | This commit is the 4th |
| Q-MBT26-9 | (a) amend MB-F-T20-FAMILY-B-ADDITIONAL-TABS at WB4 docs | Amendment landed in this commit's FOLLOWUPS.md edit |
| Q-MBT26-METHO-1 | (c) accept-as-is + file finding | MB-F-T26-METHO-1-T21-T26-CROSS-SESSION-SWEEP filed at this WB4 |

R-MBT26-1..8 dispositions:

| ID | Status |
|---|---|
| R-MBT26-1 (chat-shell.tsx shared with Terminal D) | RESOLVED — sequencing T22 → T26 → T27 documented in t26-t27-coord.md (this WB4 update); MB-T26 zone authored INSIDE Terminal B's MB-T22 reserved zone |
| R-MBT26-2 (preload.mts frozen-feel) | RE-DISPOSED — Q-MBT20-5's "UNCHANGED" was descriptive of MB-T20 scope, not forever-frozen; preload.mts gained 1 additive method per Q-MBT26-5=d |
| R-MBT26-3 (Anthropic SDK stream usage event shape variation) | KNOWN-via-typedef — direct read of @anthropic-ai/sdk@0.92.0 .d.ts. Live-API verification deferred (no API key). [MODELED] for runtime semantic |
| R-MBT26-4 (mock path bypasses real API → no usage events) | NON-ISSUE — mockStreamChunks doesn't invoke onUsage; captureUsageToLedger never fires in mock path; tests cover both via fakeStream synthetic SDK shape |
| R-MBT26-5 (rate table drift) | TRACKED — MB-F-T26-RATE-TABLE-PROFILE-MIGRATION (Tier 2; closes at MB-T33) |
| R-MBT26-6 (DST midnight transition) | ACCEPTED — date-key derives from local TZ; DST transition gives a 23h or 25h day. Documented limitation |
| R-MBT26-7 (ledger unbounded growth) | RESOLVED — pruneOlderThan(7 days) at every appendCostLedgerEntry; probe-02 test verifies |
| R-MBT26-8 (runtime smoke at merge-gate) | SATISFIED — WB4 ran smoke; WINDOW_READY at ~3s; all 10 sentinels fired; zero errors |

---

## VII. Pre-existing test failures (CLAUDE.md §4.5)

NOT re-diagnosed per CLAUDE.md §4.5. Two known classes remain:

- `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` (Tier 2) — at WB3 commit, the line moved to 492 due to my MB-T26 sentinel zone comment additions. Failure shape unchanged: `routeOrchestratorOutput card-or-multi-choice` test sees `streamError` instead of `streamDone`. Root cause unresolved (real bug or stale mock — needs operator dedicated ticket).
- `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` (Tier 3) — 5 daemon/MANUAL/Electron-gated integration tests flake under standard pnpm test invocation. Not exercised in scoped WB-runs.

Per CLAUDE.md §9, the full workstation suite was NOT run per WB. Scoped runs covered exactly the WB-relevant directories.

---

## VIII. Methodology incidents — 3 distinct shared-tree failure modes documented

This ticket surfaced THREE structural parallel-cairn failure modes within 24 hours, exceeding the §3.12 worktree-pivot trigger threshold. Each is now documented as Tier 1 methodology evidence (MB-F-PARALLEL-CAIRN-* family).

### VIII.1 — Index-race (Tier 1; existing — `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT`)

Two sessions stage paths that overlap. Atomic-chain diff-verify catches at the LATER-committing session's diff step, but the EARLIER-committing session can still sweep foreign untracked files via non-per-path `git add` (e.g., `-A`).

**Validated mid-Phase 1 here:** Terminal A's `e02aa52` swept my mb-t26-diagnose. Atomic-chain caught at MY end (no double-commit); damage was at THEIR end.

### VIII.2 — Working-tree-blocking (Tier 1 — NEW, filed this WB4)

Another session's uncommitted authored work sits in a file THIS session needs to author against. This session cannot stage the file without:
- (a) sweeping foreign content into own commit (same shape as e02aa52 in reverse)
- (b) halting until the other session commits
- (c) discarding their work (operator-arbitrated only)

**Validated mid-WB3 here:** Terminal B's uncommitted MB-T22 WB2 in chat-shell.tsx + mount.ts blocked my WB3 design. Halt + operator coordination resolved it; B's a08b406 commit unblocked.

Atomic-chain does NOT prevent — diff-verify confirms paths, not content provenance.

### VIII.3 — Content-sweep (Tier 1 — NEW, filed this WB4)

Both sessions have legitimate uncommitted edits to the SAME file. Each session reads, edits its own zone, runs atomic-chain. The diff-verify confirms the path IS expected (each session legitimately edits the file). But `git add <file>` captures the FULL working-tree state of the file, including the other session's uncommitted edits.

**Validated at WB3 commit (09b38ce) here:** my preload.mts edit added MB-T26 onCostUpdate method (lines 32-55). Terminal B had ALSO edited preload.mts (uncommitted at the time) adding MB-T22 commits-bridge (lines 158-179). My commit captured BOTH zones under MY commit's authorship + commit body.

My WB3 commit Q7 self-check claim — *"Zero T22 territory bleed at MY end"* — was [INACCURATE] in retrospect. The atomic-chain confirmed paths, not content provenance. Terminal B's WB3 commit body (`427c6a3`) explicitly cites `09b38ce content-sweep` as the incident.

Forward fix: **git worktree-per-session** per CLAUDE.md §4.3 — only structural defense. Per-section read-back before stage is a workaround for shared-tree contexts.

### VIII.4 — Q-disposition infeasibility (Tier 2 — NEW, filed this WB4)

Distinct from the shared-tree family. Pre-arbitrated Q-dispositions can lock in technically-infeasible designs when the disposing parties (operator + this session) lack full surface knowledge at arbitration time. Q-MBT26-5=c (polling via existing IPC) assumed a generic invoke surface that doesn't exist in preload.mts. Discovered mid-WB3 only when authoring against the actual surface.

**Mid-WB3 halt + operator re-disposition** to Q-MBT26-5=d (push-based onCostUpdate) was the right call. Operator-recognition: "Q-MBT26-5 re-disposition mid-arbitration was the right call — push-based onCostUpdate solved the design contradiction that the original Q-MBT26-5=c locked in."

Methodology gap: §3.10 Q-disposition arbitration is brittle to surface-knowledge gaps. Not a failure of §3.10; a documented failure mode of the primitive.

---

## IX. References

- Phase 1 diagnose (under e02aa52 sweep): `docs/coordination/mb-t26-diagnose-2026-05-07.md`
- Cross-session coord doc: `docs/coordination/t26-t27-coord.md` (updated this WB4 with T22 entry)
- WB1 red commit: `a1e41fc red(MB-T26): WB1 — scaffold ...`
- WB2 green commit: `16e2302 green(MB-T26): WB2 — MODEL_RATES + computeCost + cost-ledger persistence (11/11 pass)`
- WB3 green commit: `09b38ce green(MB-T26): WB3 — onUsage callback + IPC wiring + chat-shell-header-bar slot + push-based onCostUpdate (15 new tests pass)`
- This WB4 docs commit: see push log
- Source files (mine):
  - `packages/dispatch-workstation/src/main/cost-calc.ts`
  - `packages/dispatch-workstation/src/main/cost-ledger.ts`
  - `packages/dispatch-workstation/src/chat-shell/cost-meter.tsx`
- Source files (modified, mine):
  - `packages/dispatch-workstation/src/main/anthropic-client.ts`
  - `packages/dispatch-workstation/src/main/coarchitect-ipc.ts`
  - `packages/dispatch-workstation/src/main/preload.mts`
  - `packages/dispatch-workstation/src/chat-shell/chat-shell.tsx` (inside Terminal B's MB-T22 zone)
  - `packages/dispatch-workstation/src/chat-shell/mount.ts` (additive MB-T26 zones)
  - `packages/dispatch-workstation/test/unit/coarchitect-ipc/test_register_ipc_handlers.spec.ts` (3 stale-contract assertions)
- Test files (mine):
  - `packages/dispatch-workstation/test/unit/cost-calc/probe-01-rate-multiplication.spec.ts`
  - `packages/dispatch-workstation/test/unit/cost-calc/probe-02-cost-ledger.spec.ts`
  - `packages/dispatch-workstation/test/unit/anthropic-client/probe-01-onusage-callback.spec.ts`
  - `packages/dispatch-workstation/test/unit/cost-meter/probe-01-cost-meter-render.spec.tsx`
  - `packages/dispatch-workstation/test/unit/chat-shell/probe-05-header-bar-slot.spec.tsx`
- CLAUDE.md sections governing: §2.1, §2.2, §2.3, §2.4, §2.6, §2.7, §2.10, §3.3, §3.5, §3.6, §3.7, §4.1, §4.2, §4.4, §4.5, §4.6, §9.

---

**MB-T26 ladder closed at WB4.** Family-B (Conductor chat panel) progresses: MB-T20 (shell) → MB-T21 (Chat tab) → MB-T22 (multi-tab API) + MB-T26 (cost meter) shipped; MB-T23 (Tasks tab) + MB-T24 (autopilot toggle slot) + MB-T25 (plan-usage ring slot) + MB-T27 (model-mix slot — Terminal D in flight) remain.
