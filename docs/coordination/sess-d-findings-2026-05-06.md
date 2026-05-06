# Session D — parallel-batch-5-2026-05-05 — Findings (append-only)

**Branch:** `sess-d/install-paths-fix`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-d-install-paths-fix`
**Cut from:** `main` HEAD `1098ebb`
**Date opened:** 2026-05-05

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the reserved #150-#154 range (parallel-batch-5
sess-d slot). Numbers below are working entries; operator may
renumber on merge.

---

## Finding #150 — MB-F-INSTALL-PATHS-WORKTREE-FIX

**Date filed:** 2026-05-05
**Tier:** 3 — test maintenance. Pre-existing brittleness flagged
three times across parallel-batch-3 + parallel-batch-4 sessions
(`sess-2-findings-2026-05-06.md` §G3, `sess-a-findings-2026-05-06.md`
§Followups #3, `sess-c-findings-2026-05-06.md` §G11) before being
addressed. Each flagging batch's territory boundaries (test-only
scope-fences elsewhere) prevented inline fixes; parallel-batch-5
turned a dedicated session on the followup.
**Origin:** P3 in `packages/dispatch-daemon/test/unit/install-paths.test.ts`
asserted `expect(result).toMatch(/foxworks-dispatch$/)`, which
hard-codes the canonical clone basename. In any worktree (e.g.
`sess-d-install-paths-fix`, `sess-c-concurrent-race`,
`sess-a-core-unification`) `resolveRepoRoot(import.meta.dirname)`
returns the worktree dirname, not `foxworks-dispatch`, so P3
failed on clean main HEAD too.
**Discovered by:** parallel-batch-3 sess-2 §G3 (first sighting,
during DAEMON-T18 follow-on work). Re-flagged by sess-a and sess-c
in successor batches.
**Resolution status:** SHIPPED on `sess-d/install-paths-fix`,
ladder commit `3c4e5f4` (WB1 — P3 marker-walk-up roundtrip +
sanity); WB2 (this entry) is the final commit.

### Surface (KNOWN — direct read of source files at HEAD `1098ebb`)

Two files in scope; one modified.

| File | Role | Touched this batch |
|---|---|---|
| `packages/dispatch-daemon/src/install/paths.ts` | Production: `resolveRepoRoot` walks up from `startDir` looking for `CONDUCTOR_API_CONTRACT.md` marker; returns absolute path to dir containing it. **Synchronous** (uses `existsSync`). | NO (Q3 scope-fence: test-only) |
| `packages/dispatch-daemon/test/unit/install-paths.test.ts` | Test: 2 probes — P3 inside-repo roundtrip, P4 outside-repo error string. P4 production-controlled string, fine in worktrees. P3 was the brittle one. | YES (P3 only) |

### Fix shipped (KNOWN)

P3 now mirrors production's marker walk-up to compute `expectedRoot`
inline, then asserts `resolveRepoRoot(import.meta.dirname) ===
expectedRoot` — roundtrip semantics, not a literal-basename
property:

  1. Inline IIFE walks up from `import.meta.dirname` looking for
     `existsSync(join(current, 'CONDUCTOR_API_CONTRACT.md'))`. Same
     marker constant + termination condition (`parent === current`)
     as production at `paths.ts:29-45`.
  2. `expect(result).toBe(expectedRoot)` — roundtrip.
  3. Sanity (preserved): `result.startsWith('/')` confirms absolute.
  4. Sanity (NEW per Q1 arbitration): `existsSync(join(result,
     MARKER))` — defends against future `resolveRepoRoot`
     regressions returning a wrong-but-plausible parent dir.

P4 unchanged — operator-verified its regexes test the production
ERROR STRING (`/foxworks-dispatch/i`, `/run.+from inside.+foxworks-
dispatch/i`), not path semantics, so P4 worked in worktrees from
the start.

P3 stays SYNCHRONOUS (production `resolveRepoRoot` uses `existsSync`,
not async fs/promises; KNOWN from `paths.ts:23,33`). No async
refactor of the `it()` callback was needed.

### Verification (KNOWN — ran in this worktree)

  Pre-fix RED: P3 fails with
    `expected '/Users/.../foxworks-worktrees/sess-d-install-paths-fix'`
    `to match /foxworks-dispatch$/`
  Post-fix GREEN: 2/2 install-paths probes pass
  Full daemon suite: 41 files / 197 tests pass — no regressions
  Production source: byte-identical to HEAD `1098ebb` (test-only
    change per Q3)

### Operator-arbitrated decisions applied

Per Phase 1 close report §7 Q1-Q4 + Phase 2 brief:

| Q | Decision | Status |
|---|---|---|
| Q1 (Phase 1 brief) | Compute expected dynamically via marker walk-up — test asserts roundtrip behavior, not literal | APPLIED |
| Q2 (Phase 1 brief) | Just fix P3; do NOT audit `install-paths.test.ts` for other worktree-brittle assertions | APPLIED — P3 only modified, P4 untouched, no other tests scanned |
| Q3 (Phase 1 brief) | TEST-ONLY — do NOT modify `paths.ts` or any production source | APPLIED — production tree byte-identical |
| Q1 (Phase 1 §7) | ADD `existsSync(join(result, MARKER))` sanity check alongside roundtrip | APPLIED |
| Q2 (Phase 1 §7) | SKIP separate REPORT.md aggregate; 3-commit batch doesn't warrant one. Ladder is now 2 commits (WB1 + WB2) | APPLIED |
| Q3 (Phase 1 §7) | Confirmed `docs/coordination/sess-d-findings-2026-05-06.md` filename | APPLIED |
| Q4 (Phase 1 §7) | Proceed despite brief's line-number drift (brief said line 39; actual line 35) — non-load-bearing drafting noise | APPLIED |

### Methodology lesson

**Tier-3 worktree-brittleness is valid parallel-batch followup
material — but multi-batch latency is the cost of strict territory
fences.** This brittleness was flagged in three consecutive batches
(parallel-batch-3 sess-2, parallel-batch-4 sess-a + sess-c) before
being addressed in parallel-batch-5. Each flagging session was
operating under a scope-fence that excluded a quick inline fix,
so the followup accumulated.

The pattern *worked*: the divergence-flagged-then-fixed arc
preserves territory discipline at the cost of one batch of latency
per such followup. The alternative (allow inline fixes whenever
spotted) erodes the scope-fence guarantee that downstream sessions
rely on.

KNOWN: the fix itself is ~25 lines in a single test file — the
"cost of waiting three batches" was operator + LLM attention, not
engineering complexity. Cheap followups still benefit from explicit
batch turn-on because the *territory verification* is what the
batch ladder actually buys.

### Followups (operator-deferred to separate batches)

1. **Audit other tests for worktree-name brittleness** (Tier-3,
   separate batch). Q2 scope-fence prevented this batch from
   sweeping `packages/dispatch-{daemon,web,core}/test/**` for
   assertions matching `/foxworks-dispatch/` or other clone-basename
   hard-codes. A dedicated audit batch should grep the codebase and
   convert any such assertions to roundtrip / property-style. KNOWN
   — sess-c §G11 noted this fix would unblock similar work; no
   evidence either way of additional sites because no scan was run.
2. **Windows path support for `resolveRepoRoot` test** (only
   relevant if Windows install ever ships). The test's
   `result.startsWith('/')` assertion is Unix-only; production's
   walk-up termination check (`parent === current` via `dirname`)
   *is* cross-platform but unverified on Windows. MODELED.
3. **Brief drafting hygiene — line numbers should be read from
   HEAD at brief-author time, not from a stale snapshot.** This
   batch's brief stated the brittle assertion was at line 39;
   actual line was 35. Non-load-bearing here (file structure
   matched FACT-D2 semantics exactly), but a future brief could
   drift further and induce a halt-class-5 (drafting failure
   suspected). KNOWN.

### §G gaps surfaced this batch (not load-bearing for the resolution)

- **G6.1 — Other-tests audit deferred** (see Followup 1).
- **G6.2 — Brief line-number drift** (see Followup 3).
- **G6.3 — Sanity assertion strengthening was in scope per Q1 §7**
  — applied; not deferred.
- **G6.4 — Windows path support** (see Followup 2).
- **G6.5 — Test file consolidation pressure** if T19/T20 grow
  install-paths tests beyond 2 probes; not actionable now.
  SPECULATIVE.

### Cross-session coordination

- **Session E (`sess-e/layout-data-mock`)** — dispatch-web Layout
  per-field data-mock backfill. NO overlap with Session D
  territory (D is daemon test-only; E is dispatch-web src + tests).
  Confirmed via initial mis-routed Phase 2 authorization that
  named files in `packages/dispatch-web/` — Session D halted and
  flagged; correct sess-d authorization arrived next turn.
- **Session F (`sess-f/core-read-recovery`)** — dispatch-core
  `read.ts` recovery semantics. NO overlap with Session D
  territory. KNOWN per parallel-batch-5 brief.

### Anti-fabrication

Every factual claim in this entry is one of: (a) a quoted source-
file location verifiable by reading the cited path:line at HEAD
`1098ebb` or HEAD `3c4e5f4`, (b) a test-execution observation
reproducible via `pnpm --filter dispatch-daemon test
test/unit/install-paths.test.ts`, or (c) labeled MODELED /
SPECULATIVE with the basis named. No claim asserts behavior that
did not ship. This batch's scope is one test-file edit + one
findings entry; production source is byte-identical to main HEAD.
