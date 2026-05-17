# Decisions — MB-F-CONSOLE-T02-RECONNECT-BACKOFF

**Session**: `r12-cw2-console-t02-reconnect-backoff`
**Date**: 2026-05-17
**Arbitration source**: operator 2026-05-17 ~17:00 MDT (OPERATOR-CONTAMINATION-NOTICE), gen-7 manifest amendment at `433d331` 2026-05-17 (EXPANSION-1).
**Findings doc**: `docs/coordination/mb-f-console-t02-reconnect-backoff-findings-2026-05-17.md`

---

## §I — Closure path: RESOLVED-BY-OPERATOR-CONTAMINATION [KNOWN-OPERATOR-ARBITRATED]

**Question**: how to close `MB-F-CONSOLE-T02-RECONNECT-BACKOFF` when the session's WB1 GREEN code shipped via cross-session `.git/index` staging contamination at operator-authored commit `37d1f26` ("operator-decision: worktree migration ... DEFERRED") rather than via the session's planned cairn-grammar WB-final commit?

**Decision**: treat the row as **CLOSED via RESOLVED-BY-OPERATOR-CONTAMINATION**, an envelope analogous to RESOLVED-BY-EQUIVALENCE used previously for cross-session supersession (e.g., MB-F-MB-T07-KANBAN-COLUMN-INTEGRATION at `1d6da9c`). Audit-trail attribution is preserved in this decisions doc, the findings doc, and the FOLLOWUPS:133 stamp text — readers grep'ing for `MB-F-CONSOLE-T02-RECONNECT-BACKOFF` get the full chain.

**Rationale**:
- The session's WB1 GREEN code is byte-identical between the session's staged version and what landed at `37d1f26` (verified via `git show 37d1f26 -- packages/dispatch-workstation/src/console-panel/reconnect-backoff.ts`). The code review surface is the same regardless of authorship attribution.
- The probe-01 4/4 GREEN + ws-reconnection-handling 4/4 regression are stable against HEAD (8/8 verified pre-contamination at 16:59:58 MDT).
- Reverting `37d1f26` would also revert the operator's coord doc; redoing the commit with proper subject is high churn for an audit-trail-only gap.
- The Round 11 §5.C.3 KNOWN-load-bearing-via-counter-example verdict for §3.9.A commit-pathspec mandate is reinforced (not undermined) by this incident — see §V below.

## §II — Outcome class per CLAUDE.md §2.11 [KNOWN per file inspection at `37d1f26`]

**Capability enabled with known limitations.**

The operator offered two choices: "No regression; wiring verified; improvement case not exercised" OR "Improved (binary flip)". Neither fits cleanly:

- "No regression; wiring verified; improvement case not exercised" understates sub-deliverable (A). The exponential backoff IS exercised — probe-01's 4/4 GREEN exercises the doubling sequence + 30s cap directly, and the controller integration replaces a real production code path (the fixed-1s `setTimeout(..., 1_000)`) with the computed-delay path. The operator-experience improvement under a daemon outage is real: 96.7% reduction in steady-state retry frequency (1Hz → 1/30Hz).
- "Improved (binary flip + behavioral quality)" overstates the closure. Sub-deliverable (B) — max-attempts ceiling + terminal error surface — was scoped by the row body and was NOT shipped at this closure (`shouldGiveUp` is exported but uncalled).
- **"Capability enabled with known limitations"** is the honest middle. The capability (exponential backoff with cap and counter-reset) is enabled. The limitation (no ceiling, no terminal surface) is known and forward-tracked.

## §III — Audit-trail attribution decision [KNOWN per shared bootstrap §F.7]

The FOLLOWUPS:133 stamp text (per operator instruction) explicitly attributes:
- Sub-deliverable (A) shipped at operator-authored `37d1f26` via cross-session contamination
- WB1 RED probe scaffolding at session-authentic `f13344c`
- Mitigation gap: `cairn-atomic-commit.sh` (path-β at `173ead7`) was not used by operator at `37d1f26`

Future `git log --grep "MB-F-CONSOLE-T02-RECONNECT-BACKOFF"` queries will surface `f13344c` (the WB1 RED) and the WB-final commit (which references the row in its subject) — providing the discoverability anchor. `37d1f26` itself does not match the grep but is cited from the stamp text and this decisions doc.

## §IV — Sub-deliverable (B) forward-tracking recommendation

**Recommendation**: file a NEW follow-up row `MB-F-CONSOLE-T02-RECONNECT-CEILING` (Tier 2) tracking the unshipped max-attempts ceiling + terminal error surface work. This decisions doc only recommends — actual row authoring is operator-arbitrated (the session's manifest FORBIDS arbitrary `docs/FOLLOWUPS.md` writes except for the operator-stamp envelope at WB-final).

Proposed row body:

```
| `MB-F-CONSOLE-T02-RECONNECT-CEILING` | MB-F-CONSOLE-T02-RECONNECT-BACKOFF closed sub-deliverable (A) exponential backoff state machine but did NOT ship sub-deliverable (B) max-attempts ceiling + terminal `console:error` surface (per RESOLVED-BY-OPERATOR-CONTAMINATION decisions doc §IV). The `shouldGiveUp(attempt)` predicate is already exported by `packages/dispatch-workstation/src/console-panel/reconnect-backoff.ts` with `MAX_RECONNECT_ATTEMPTS=5`; integration scope is to (a) gate `scheduleReconnect` on `shouldGiveUp(state.reconnectAttempt)` and emit `console:error` with `errorType:'reconnect-exhausted'` + skip further scheduling, (b) author probe-mbf-console-t02-02 asserting the terminal event after N failed attempts and no-further-schedule. Tier 2 — operator-experience under sustained daemon outages still lacks a "give up" surface; current behavior is a 30s-interval reconnect loop indefinitely. Closure cost ~1 WB. Discoverability: `docs/coordination/mb-f-console-t02-reconnect-backoff-findings-2026-05-17.md` §III + §VII. | CONSOLE-T02 backoff WB-final |
```

Closure cost is small (predicate already exported; integration is a 5-line edit + one probe spec). Operator may opt to inline this in a future ticket (e.g., MB-T11 settings UI work) or stand it up as a standalone closure-class dispatch in Round 12 Wave R12-CLOSURE-Wave-3.

## §V — Methodology gap: §3.9.A symmetric-extension proposal [SPECULATIVE — operator-arbitration recommended]

Round 11 §5.C.3 + §5.C.5 declared §3.9.A commit-pathspec mandate KNOWN-load-bearing-via-counter-example for **agent-side** broad-pathspec sweeps (30+ commit zero-contamination interval at `722a0ab` validating the mandate). This incident is the symmetric **operator-side** variant — the discipline that protects agents from each other has no counterpart protecting agents from broad-pathspec operator commits.

Sketch of closure-path candidates (for operator/orchestrator arbitration):

- **(α) Operator-side discipline expansion**: CLAUDE.md §2.7 amendment requiring per-path `git add` and per-path `git commit -o` from the operator side too in shared-working-tree contexts with ≥1 active parallel-cairn session. Operator-self-discipline addition; no tooling.
- **(β) Tooling-level mitigation**: `cairn-atomic-commit.sh` (path-β at `173ead7`) becomes mandatory for operator commits during active cascades; pre-commit hook refuses broad-pathspec operator commits if `.git/index` already contains foreign staged paths.
- **(γ) Worktree migration**: deferred at `37d1f26` per operator's own decision; the migration to per-session worktrees would structurally prevent both agent-side and operator-side index-leak entirely. The current decision (deferral with re-evaluation gate) explicitly cites path-β at `173ead7` as the cascade's path-β stress test — this incident is data for that stress test's evaluation.

**Recommendation**: surface as `MB-F-CAIRN-METHODOLOGY-3-9-A-OPERATOR-SIDE-SYMMETRIC-EXTENSION` (Tier 1 methodology incident, since this is the first observed operator-side variant in the round corpora and the gap is structurally analogous to the §3.9.A counterexample that established load-bearing).

Not filed here (manifest envelope concern); recommended for operator-arbitrated authoring at next methodology-archive cycle (`docs/cairn-under-stress-round-12.md` extension).

## §VI — Self-check Q-block recovery for the contamination-absorbed code

The session's planned WB1 GREEN commit body would have contained the Q1-Q9 self-check block (drafted at the time of `git commit -o` attempt; the commit failed because the files were no longer staged). For audit-trail recovery, the Q1-Q9 answers as they would have been recorded at WB1 GREEN landing:

1. **API verified by spike?** N/A — pure-fn module; constants pinned by probe-01 verbatim against closure-target FOLLOWUPS row body.
2. **Test exercises behavior or MOCKS?** Behavior — pure-fn assertions for probe-01; integration regression for ws-reconnection-handling exercises the seam path with mock WS factory (already in place pre-incident).
3. **If implementation deleted, test passes?** No — deleting `reconnect-backoff.ts` yields ESM module-not-found (verified at WB1 RED commit `f13344c`).
4. **Anything outside contract spec?** No — WB1 strictly within FOLLOWUPS row body sub-deliverable (A) scope; sub-deliverable (B) was planned for WB2 (never authored due to contamination).
5. **Modified contract without approval?** No — no frozen-surface touch. §4.7.3 reconnection semantics preserved (terminal-close-code filter unchanged; only the delay formula changed).
6. **Any unlabeled claim in commit body?** Would have had confidence labels on RED anchor + GREEN evidence; recovered in this decisions doc + findings doc.
7. **Touched files another parallel session might modify?** TERRITORY-local per manifest EXPANSION-1 2026-05-17 (`433d331`). Per-path `git add` was used per §2.7; the contamination was operator-side, not agent-side. **§3.9.A mandate was honored by the session; the gap is symmetric operator-side per §V.**
8. **Bypass PATCH /v2/sessions/:name/state?** N/A — pure unit-test scope; daemon-side state-machine untouched.
9. **Work during unauthorized halt?** No — gen-7 manifest amendment `433d331` 2026-05-17 ratified TERRITORY add per path-α arbitration; WB1 GREEN authored against ratified TERRITORY.

[KNOWN — these answers are the session's actual Q1-Q9 at the moment of WB1 GREEN commit attempt; the answers themselves are not contamination-affected, only the commit anchor that would have carried them.]
