# Session C — parallel-batch-4-2026-05-05 — Findings (append-only)

**Branch:** `sess-c/concurrent-race`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-c-concurrent-race`
**Cut from:** `main` HEAD `b3da626`
**Date opened:** 2026-05-05

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the reserved #145-#149 range (parallel-batch-4
sess-c slot). Numbers below are working entries; operator may
renumber on merge.

---

## Finding #145 — MB-F-DAEMON-CONCURRENT-RACE-DOCUMENTED

**Date filed:** 2026-05-05
**Tier:** 2 — verification net + failure-mode documentation. Closes
parallel-batch-3 Session 2 followup #2 from finding #125
(`sess-2-findings-2026-05-06.md` §Followups). The fix itself is a
deferred ticket (`MB-F-DAEMON-CONCURRENT-RACE-FIX`); this batch
ships only the test-only Tier-2 deliverable demonstrating the
failure modes and providing a regression-detection signal for
future change.
**Origin:** parallel-batch-3 sess-2 finding #125 §Followups #2 —
"fd CLI (writeRegistry) and daemon (writeRegistryV2) both atomic-
write the same `~/.foxworks-dispatch/sessions.json` at different
schema versions; race conditions possible". Operator-promoted to
parallel-batch-4 Session C scope, brief authored Phase 1 turn-on.
**Discovered by:** Session C (this batch) Phase 1 reading +
Phase 2 reproduction. Race surface verified at HEAD `b3da626`.
**Resolution status:** SHIPPED on `sess-c/concurrent-race`, ladder
commits `178bc93` (WB1) … `59d48af` (WB5); WB6 (this entry) is the
final commit.

### Surface (KNOWN — direct read of source files at HEAD `b3da626`)

Two writers, ONE file, TWO atomic-write recipes that share a tmp
filename:

| Writer | Module | Tmp path |
|---|---|---|
| fd CLI v1 fallback (`init`/`send`/`pull` commands) | `packages/dispatch-core/src/registry/write.ts:writeRegistry` | `${target}.tmp` |
| dispatch-daemon (route handlers + transitions) | `packages/dispatch-daemon/src/migration/schema-v2.ts:writeRegistryV2` → `packages/dispatch-daemon/src/persist/atomic-write.ts:writeAtomicJson` | `${path}.tmp` |

Both target `~/.foxworks-dispatch/sessions.json` (or test-isolated
path in probes). Both atomic individually; the race is in the
INTERLEAVING of two atomic operations PLUS the staging-file
collision (the literally-identical `<target>.tmp` filename).

### Failure modes catalogued (KNOWN unless labeled)

- **FM1 — Lost update (read-modify-write across writers).** KNOWN-
  operator-visible. Demonstrated by probe-01 + probe-02 deterministic
  `it.fails` probes.
- **FM2 — Schema-version regression.** KNOWN, currently benign at
  HEAD `b3da626` due to DAEMON-Z-4 fix (`RegistrySchema.version`
  union of `{1, 2}` + `.passthrough()` on `SessionSchema` and
  `RegistrySchema`). Documented for completeness.
- **FM3a — Truncate-during-write race.** MODELED. Demonstrated by
  probe-03 stochastic loop (manifests as `FM3-silent-lost-update`
  outcomes; some with `parsedAs=unparseable`).
- **FM3b — Rename-misses-tmp ENOENT.** KNOWN. Demonstrated by
  probe-03 (cliExit=1 or daemonExit=1 outcomes).
- **FM3c — Daemon's readback-retry validates the OTHER writer's
  bytes.** MODELED. Surface symptom indistinguishable from FM3a at
  the test layer; classifier groups both as `FM3-silent-lost-update`.
- **FM4 — Partial bytes / sub-PIPE_BUF interleaving.** SPECULATIVE
  at our scale (typical state ≤ a few KB).

Full taxonomy + confidence labels in
`packages/dispatch-daemon/test/integration/concurrent-writer-race/REPORT.md` §3.

### Verification net shipped

| Probe | FM(s) | Vitest semantics | Outcome at HEAD `b3da626` |
|---|---|---|---|
| `probe-00-helpers.test.ts` | (helpers contract) | 12 standard `it()` tests | 12/12 KNOWN-pass |
| `probe-01-cli-then-daemon.test.ts` | FM1 (cli-overwritten-by-daemon-stale) | `it.fails(...)` | 1 expected fail (i.e., assertion fires the lost-update signal) |
| `probe-02-daemon-then-cli.test.ts` | FM1 (daemon-overwritten-by-cli-stale) | `it.fails(...)` | 1 expected fail |
| `probe-03-simultaneous.test.ts` | FM3a + FM3b + FM3c (+ FM4 corruption) | `it()` + N=10 loop tally | passes via `expect(racedCount).toBeGreaterThanOrEqual(1)`; sample tally 5 FM3b + 5 FM3-silent-lost-update + 0 corrupt + 0 no-race |

Suite total: 13 passed + 2 expected fail = 15 (KNOWN —
`pnpm --filter dispatch-daemon test:race` runtime ~5s).

### Operator-arbitrated decisions applied

Per Phase 1 close report §6 Q1-Q7 + Phase 2 brief acknowledgement:

| Q | Decision | Status |
|---|---|---|
| Q1 | THREE PROBES (both lost-update directions) | APPLIED |
| Q2 | MIXED — `it.fails` for probe-01/02; `it()` capture-actual for probe-03 | APPLIED |
| Q3 | LOOP N=10; assert ≥1 raced iteration | APPLIED |
| Q4 | tsx-driven child sub-process; no fd binary spawn | APPLIED — tsx 4.19.2 already in root devDependencies |
| Q5 | `MB-F-DAEMON-CONCURRENT-RACE` (test-only) + reserved future `MB-F-DAEMON-CONCURRENT-RACE-FIX` | APPLIED |
| Q6 | DIRECT writeRegistryV2 from child; no Fastify | APPLIED |
| Q7 | OPT-IN via `pnpm test:race` (RACE_TESTS=1 env gate) | APPLIED |

### Methodology lesson

**Race demonstration is a valid Tier-2 deliverable independent of fix.**
Shipping a test that exhibits a known-broken behavior — and
documenting which assertions WOULD hold under correct semantics —
gives the operator three things even before the fix:

1. **Regression-detection signal.** When the fix lands, the
   `it.fails` markers flip; vitest surfaces the test as failing,
   alerting the operator that the bug-state has changed.
2. **Test-infrastructure investment that future fix work
   inherits.** The barrier + spawn-child + race-capture helpers
   are file-lock-agnostic; the fix batch can directly consume them
   to verify the fix works without re-introducing a separate test
   stack.
3. **Failure-mode catalogue with confidence labels.** Future
   batches debating the fix design have a derived FM taxonomy
   (FM1/FM2/FM3a-c/FM4) cited from code rather than re-derived.

The vitest `it.fails` pattern is the load-bearing primitive. KNOWN
from vitest 4.1.5 docs + verified by execution.

### Followups (operator-deferred to separate batches)

1. **MB-F-DAEMON-CONCURRENT-RACE-FIX** — the actual fix. Significant
   scope (file-lock or staged-write protocol or HTTP-mandatory).
   Three options sketched in REPORT.md §7.3. Pick + ship is operator's
   call at next batch turn-on.
2. **Investigate operator's original `sessions.json` corruption
   canonicalization-during-the-night** — finding #125 noted that
   the corrupt file appeared "canonicalized" on subsequent inspect.
   Hypothesis: daemon's `writeRegistryV2` readback-retry loop
   (FM3c-class) silently overwrote the transient external corruption
   with daemon's own valid bytes after a route-handler write fired
   on next operator action. SPECULATIVE — not asserted; surfaced as
   a candidate explanation for the canonicalization observation.
3. **Distinguish FM3a from FM3c at the test layer** — currently
   indistinguishable (both manifest as `FM3-silent-lost-update`).
   Distinguishing requires instrumenting the daemon's readback-retry
   logger seam. Out of scope this batch.
4. **CI runner FM-tally distribution** — sample tally is from
   operator's MacBook (M-series, APFS). Slower runners or non-APFS
   filesystems may shift the distribution. Probe's loose `≥1`
   assertion is robust to variance but the tally itself is a
   useful diagnostic; could be aggregated across CI runs as future
   intelligence.

### §G gaps surfaced this batch (not load-bearing for the resolution)

- **G8 probe-03 timing variance per machine** — sample tally only
  represents one machine.
- **G9 FM3a vs FM3c indistinguishable at test layer** — see
  followup 3.
- **G10 vitest `it.fails` hides assertion identity** — when the
  test passes (assertion fails as expected), reporter does not show
  the expected-vs-received diff. Future operators must read source
  to identify which field's lost-update fired.
- **G11 pre-existing `install-paths.test.ts` failure unrelated to
  this batch** — assertion `result.toMatch(/foxworks-dispatch$/)`
  hard-codes the canonical repo dirname; in worktrees
  (`sess-c-concurrent-race`) the assertion fails on clean main
  HEAD too. KNOWN — verified by `git stash` + isolated test run.
  Out of scope; flagged for future workstation-contract attention.

### Cross-session coordination

- **Session A (`sess-a/core-unification`)** — refactoring
  `packages/dispatch-core/src/registry/write.ts`. Worktree at HEAD
  `b3da626` with no in-progress changes at end of this batch (KNOWN —
  verified end of WB1 via `git log` in Session A worktree). NO
  CONFLICT observed. Per Phase 2 brief, A's refactor is behavior-
  preserving; if it lands first, Session C's race tests will
  continue to fire identical FM signatures because the atomic-write
  recipe is unchanged.
- **Session B (`sess-b/detail-pane-rearb`)** — dispatch-web detail
  pane. NO overlap with Session C territory.

### Anti-fabrication

Every factual claim in this entry is one of: (a) a quoted source-
file location verifiable by reading the cited path:line, (b) a
test-execution observation reproducible via `pnpm --filter
dispatch-daemon test:race`, or (c) labeled MODELED / SPECULATIVE
with the basis named. No claim asserts a fix that did not ship.
This batch's scope is documentation + verification net only.
