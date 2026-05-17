# Findings — MB-F-CONSOLE-T02-RECONNECT-BACKOFF

**Session**: `r12-cw2-console-t02-reconnect-backoff`
**Closure-target row**: `MB-F-CONSOLE-T02-RECONNECT-BACKOFF` (Tier 2; FOLLOWUPS row now at line 133 post-t25 commit; previously line 132 per gen-7 dispatch)
**Wave**: R12-CLOSURE-Wave-2 first cohort (V4 high-concurrency stress cascade; 12-cap concurrent)
**Date**: 2026-05-17
**Closure verdict**: **RESOLVED-BY-OPERATOR-CONTAMINATION** (operator arbitration 2026-05-17 ~17:00 MDT)

---

## §I — Closure-target scope [KNOWN per FOLLOWUPS.md row body]

The followup row body specifies: "exponential backoff (e.g., 1s/2s/4s/8s capped at 30s) with a max-attempts ceiling that surfaces a terminal `console:error` after N failed reconnects."

Two sub-deliverables in one row:
- (A) Exponential backoff state machine (replace fixed 1s loop)
- (B) Max-attempts ceiling + terminal `console:error` surface

The session's 2-WB ladder (per gen-7 boot prompt §C) split these as WB1=(A) and WB2=(B).

## §II — Shipped behavior at `37d1f26` [KNOWN per `git show 37d1f26`]

**Sub-deliverable (A) — SHIPPED.** The exponential-backoff state machine replaced the fixed 1s reconnect loop. Files at `37d1f26`:

- `packages/dispatch-workstation/src/console-panel/reconnect-backoff.ts` (NEW, 53 lines): exports `BASE_DELAY_MS=1_000`, `MAX_DELAY_MS=30_000`, `MAX_RECONNECT_ATTEMPTS=5`, `computeBackoffDelay(attempt)`, `shouldGiveUp(attempt)`. Pure-functional; counter is owned by the caller.
- `packages/dispatch-workstation/src/main/console-ipc.ts` (+19 lines): imports `computeBackoffDelay`, adds `reconnectAttempt: number` to `PanelState`, resets to 0 on socket `'open'`, increments on `scheduleReconnect`, uses computed delay (was hardcoded `setTimeout(..., 1_000)`). Test seam `testReconnectNow()` preserved verbatim.

Behavioral sequence: 1s → 2s → 4s → 8s → 16s → 30s (cap) → 30s → … . Successful reconnect resets the counter so subsequent disconnect-streaks restart at 1s.

## §III — Unshipped scope [KNOWN per file inspection at `37d1f26`]

**Sub-deliverable (B) — NOT SHIPPED.** The `shouldGiveUp` predicate is exported by `reconnect-backoff.ts` but is **not imported or called** by `console-ipc.ts`. There is no max-attempts ceiling enforcement; reconnect attempts continue indefinitely (with 30s cap). There is no terminal `console:error` event with `errorType:'reconnect-exhausted'`.

**Materialization**: under a sustained daemon outage, the bridge now backs off to a steady-state 30s-interval reconnect storm instead of a 1s storm. The connection-storm problem cited in the row body is meaningfully mitigated (96.7% reduction in steady-state retry frequency, from 1Hz to 1/30Hz) but not fully closed — the operator never sees an explicit "give up" surface.

## §IV — Operator-contamination incident chain [KNOWN per local git state + tool log]

The closure landed via a cross-session `.git/index` staging contamination, not via the session's planned cairn-grammar WB-final commit. Sequence:

| t | Event | Commit / state |
|---|---|---|
| 1 | Gen-7 dispatched session with manifest TERRITORY referencing non-existent `console-panel/console-bridge.ts` | Boot prompt at `/tmp/r12-cw2-console-t02-reconnect-backoff-boot.md` |
| 2 | Session HALT-MANIFEST-STALE surface (manifest paths mismatched actual reconnect loop location at `src/main/console-ipc.ts:308-319`) | tmux pane surface |
| 3 | Gen-7 manifest amendment (EXPANSION-1): TERRITORY adds `src/main/console-ipc.ts`, drops non-existent `console-bridge.ts` | `433d331` 2026-05-17 |
| 4 | Operator-correction-III: ration cairn-phase-1-diagnose subagent for ≤2-WB closures; direct Read survey only | 2026-05-17 ~11:58 MDT |
| 5 | Session WB1 RED: probe-mbf-console-t02-01-reconnect-backoff.spec.ts (4 it-blocks, RED via ESM module-not-found) | `f13344c` — **session-authentic cairn-grammar commit** |
| 6 | Session WB1 GREEN authored: `reconnect-backoff.ts` (new) + `console-ipc.ts` (+19 lines). 8/8 GREEN locally (probe-01 4/4 + reconnection-handling regression 4/4). | local worktree only |
| 7 | Session staged both files via `git add packages/dispatch-workstation/src/console-panel/reconnect-backoff.ts packages/dispatch-workstation/src/main/console-ipc.ts` (per §2.7 per-path discipline) | `.git/index` |
| 8 | **Operator-side broad-pathspec sweep**: operator ran `git commit` (or equivalent) without per-path restriction while drafting their `coord-worktree-migration-deferral-2026-05-17.md` commit; index already contained the session's two staged TERRITORY files; broad commit absorbed them | `37d1f26` "operator-decision: worktree migration ... DEFERRED" — subject does NOT mention MB-F-CONSOLE-T02; no `green(...)` cairn-grammar prefix; no Q1-Q9 self-check block |
| 9 | Session's subsequent `git commit -o <session-paths>` reported "no changes added to commit" — correct, files were already gone from staging | n/a |
| 10 | Session HALT-CROSS-SESSION-COMMIT-LEAK surface to operator | tmux pane surface |
| 11 | Operator arbitration: RESOLVED-BY-OPERATOR-CONTAMINATION (analogous to RESOLVED-BY-EQUIVALENCE); audit-trail attribution preserved in this findings doc + decisions doc + FOLLOWUPS:133 stamp text | 2026-05-17 ~17:00 MDT |

## §V — Contamination class anchor [KNOWN per round corpora]

This incident is the **operator-side broad-pathspec sweep** variant of the cross-session-staging-area-commit-contamination class. Round corpus precedents:

- Round 9 §1.1 — agent-side broad-pathspec sweep (`docs/cairn-under-stress-round-9.md`)
- Round 11 §1.6 — byte-identical-untracked-file conflicts (`MB-F-PUSH-RACE-BYTE-IDENTICAL-UNTRACKED-FILE-CONFLICT-2026-05-13` at `30e4aa8`)
- Round 11 §1.RC1 — recurrence-prevention via §3.9.A commit-pathspec mandate (KNOWN-load-bearing-via-counter-example per Round 11 §5.C.3 30+ commit zero-contamination interval)
- Round 12 §1.x — symmetric operator-side variant **(THIS INCIDENT)** — §3.9.A mandate validated on agent side; the same mandate needs symmetric extension to operator-initiated commits in shared-working-tree contexts with active parallel-cairn sessions

`cairn-atomic-commit.sh` (path-β at `173ead7`) provides the mechanical mitigation: it atomically stages + commits + verifies a single pathspec, eliminating the agent-side leak window. Per the operator's own note in the FOLLOWUPS stamp text, **it was not used at `37d1f26`** — surfacing the operator-discipline gap.

## §VI — Test evidence [KNOWN per local vitest run pre-contamination, re-verifiable against HEAD]

Verified at 16:59:58 MDT 2026-05-17 against the post-WB1-GREEN local tree (which is identical to what shipped at `37d1f26`):

```
pnpm --filter dispatch-workstation exec vitest run \
  test/unit/console-panel/probe-mbf-console-t02-01-reconnect-backoff.spec.ts \
  test/unit/console-t02/test_ws_reconnection_handling.spec.ts

 ✓ test/unit/console-t02/test_ws_reconnection_handling.spec.ts (4 tests) 51ms
 ✓ test/unit/console-panel/probe-mbf-console-t02-01-reconnect-backoff.spec.ts (4 tests) 63ms

 Test Files  2 passed (2)
      Tests  8 passed (8)
```

- probe-01 (4/4): constants exposed, doubling sequence + 30s cap (attempts 5/6/20), negative-clamp, `shouldGiveUp` threshold flip.
- ws-reconnection-handling regression (4/4): testReconnectNow seam, last_seq carry across reconnect, `console:gap-detected` emit on backfill_complete:false, no-reconnect-after-closeConsolePanel.

The probe at `test/unit/console-panel/probe-mbf-console-t02-01-reconnect-backoff.spec.ts` is the session's authentic WB1 RED probe, landed at `f13344c` with proper cairn-grammar.

## §VII — Outcome classification (per CLAUDE.md §2.11)

**Capability enabled with known limitations.**

- Capability enabled: exponential backoff (1s→2s→4s→8s→16s→30s cap) with successful-reconnect counter-reset, replacing the prior fixed-1s steady-state storm.
- Known limitations:
  - Max-attempts ceiling not enforced — `shouldGiveUp` is exported but uncalled; reconnect attempts continue indefinitely (clamped to 30s interval).
  - No terminal `console:error` event with `errorType:'reconnect-exhausted'`; operator gets no explicit "give up" surface.
- Recommended forward path: file `MB-F-CONSOLE-T02-RECONNECT-CEILING` (Tier 2) tracking sub-deliverable (B); see decisions doc §IV. (Filing the new row is operator-arbitrated; this findings doc only recommends.)

Not honest to call this "Improved (binary flip + behavioral quality)" — the binary flip applies only to (A); (B) was scoped, not delivered. "Improvement case not exercised" (the operator's offered alternative class) understates (A)'s real shipment. "Capability enabled with known limitations" is the honest framing.

## §VIII — Closure evidence chain (for FOLLOWUPS:133 stamp)

- `f13344c` — session-authentic WB1 RED probe (cairn-grammar, Q1-Q9 self-check block in commit body)
- `37d1f26` — operator-authored commit that absorbed the session's staged WB1 GREEN files; landing point for sub-deliverable (A) exponential backoff state machine + controller integration. No cairn-grammar prefix; no Q1-Q9 self-check; subject references unrelated worktree-migration decision.
- Sub-deliverable (B) ceiling + terminal error: NOT shipped at this closure; deferred to a new follow-up row per decisions doc recommendation.
