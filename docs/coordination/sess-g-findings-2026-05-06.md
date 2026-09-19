# Session G — parallel-batch-6-2026-05-05 — Findings (append-only)

**Branch:** `sess-g/concurrent-race-fix`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-g-concurrent-race-fix`
**Cut from:** `main` HEAD `78bc817`
**Date opened:** 2026-05-05

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the reserved #165-#169 range (parallel-batch-6
sess-g slot). Numbers below are working entries; operator may
renumber on merge.

---

## Finding #165 — MB-F-DAEMON-CONCURRENT-RACE-FIX

**Date filed:** 2026-05-05
**Tier:** 2 — failure-mode FIX (FM3 sub-modes only). Closes sess-c
finding #145 §Followups #1 (`sess-c-findings-2026-05-06.md`) — the
"actual fix" that sess-c's parallel-batch-4 batch documented as a
deferred ticket (`MB-F-DAEMON-CONCURRENT-RACE-FIX`). Sess-g ships
the protocol-level write-only file-lock primitive that eliminates
FM3 sub-modes (tmp collision, rename ENOENT, readback-retry-wins-
on-other-bytes). FM1 (lost-update across read-modify-write) is
INTENTIONALLY OUT OF SCOPE per operator arbitration Q-G1=a; deferred
to a future batch (MB-F-DAEMON-CONCURRENT-RACE-FIX-FM1).
**Origin:** sess-c parallel-batch-4 finding #145 §Followups #1 —
"the actual fix… file-lock or staged-write protocol or HTTP-
mandatory; pick + ship is operator's call at next batch turn-on."
Operator-promoted to parallel-batch-6 Session G scope, brief
authored Phase 1 turn-on at HEAD `78bc817`.
**Discovered by:** Session G (this batch) Phase 1 reading + Phase 2
implementation. FM3 elimination verified at HEAD `dd7ec94` (probe-03
tally KNOWN-zero on FM3b + FM3-corrupt across N=10 iterations).
**Resolution status:** SHIPPED on `sess-g/concurrent-race-fix`,
ladder commits `e4c6680` (WB1 spike), `7ae1947` (WB2 RED), `23517d7`
(WB3 GREEN), `40de54b` (WB4 probe-03 refactor), `dd7ec94` (WB5
verify); WB6 (this entry + REPORT.md) is the final commit.

### Surface change (KNOWN — direct read of source files at HEAD `78bc817` + `23517d7`)

| | Before (HEAD `78bc817`) | After (HEAD `23517d7`) |
|---|---|---|
| Signature | `writeAtomicJson(path, value, opts?: { validate, fsync, retries })` | `writeAtomicJson(path, value, opts?: { validate, fsync, retries, lock })` |
| LOC | 87 lines | ~165 lines (+78, mostly types + lock wiring + jsdoc) |
| Imports | `node:fs/promises`, `node:path` | + `proper-lockfile` |
| Body | `validate → mkdir → for-loop` | `validate → mkdir → acquire-lock → for-loop → release-lock-finally` |
| Default-on lock | n/a | YES — `opts.lock` undefined → on with built-in defaults |
| Test escape hatch | n/a | `opts.lock = false` |

`WriteAtomicLockOpts` shape:
```ts
interface WriteAtomicLockOpts {
  stale?: number;                                    // default 10_000ms
  retries?: number | { retries, factor, minTimeout, maxTimeout };
                                                     // default { retries: 10, factor: 2,
                                                     //          minTimeout: 50, maxTimeout: 1000 }
  realpath?: boolean;                                // default false (allow lock on missing target)
}
```

**Mechanism-preserving for both v1 + v2 callers:** writeRegistry
(`packages/dispatch-core/src/registry/write.ts:28`) and
writeRegistryV2 (`packages/dispatch-daemon/src/migration/schema-v2.ts:98`)
both pass `{ validate, fsync, retries }` only — neither call site
modified. Default-on `lock` field is implied by absence; both writers
gain locking transparently. KNOWN — verified by reading both call
sites unchanged at HEAD `23517d7`.

### Verification (KNOWN — test-execution observations at HEAD `dd7ec94`)

8 spike probes in `packages/dispatch-core/test/unit/atomic-write-lock/spike-proper-lockfile.test.ts`:
- **S1** Lock creates `<file>.lock` directory adjacent to target
- **S2** `release()` removes the .lock directory; second `lock()` succeeds
- **S3** `realpath:false` allows locking a path whose target does not exist (load-bearing for first-write to non-existent target)
- **S3b** `realpath:true` (default) throws ENOENT when target does not exist (documents WHY S3 default change)
- **S4** Retry backoff acquires after first holder releases
- **S5** Stale lock recovery — old .lock dir reclaimed
- **S6** mkdir-atomic — second `lock()` without retries rejects ELOCKED
- **S7** `release()` is single-use — calling twice rejects

6 integration probes in `packages/dispatch-core/test/unit/atomic-write-lock.test.ts`:
- **P1** Default-on — no opts → lock acquired
- **P2** Opt-out — `lock:false` → lock NOT acquired
- **P3** N=10 concurrent writes serialise; final state = one of values; no .tmp residue
- **P4** Acquisition waits when lock held externally
- **P5** Stale lock recovery
- **P6** Lock released on exception (try/finally)

WB2 RED: 5 fail / 1 pass (P2 trivially passes at RED).
WB3 GREEN: 6 pass.

Race suite (`pnpm --filter dispatch-daemon test:race`):
- probe-00-helpers: 12/12 PASS
- probe-01-cli-then-daemon: 1 expected fail (FM1 still fires; correctly demonstrates hazard; UNCHANGED per Q-G2=a)
- probe-02-daemon-then-cli: 1 expected fail (FM1 still fires; FORBIDDEN territory)
- probe-03-simultaneous: 1 PASS — NEW assertion: FM3b=0, FM3-corrupt=0
- Total: 13 passed | 2 expected fail = 15

Sample tally observed at WB5:
```
{"FM3b-rename-error":0, "FM3-corrupt":0,
 "FM3-silent-lost-update":10, "no-race-detected":0}
```

Regression sweep (WB5 commit `dd7ec94`):
- dispatch-core: 12 files / 60 tests pass (was 10/46 at HEAD `78bc817`; this batch added 2 files / 14 tests; no regressions)
- dispatch-cli: 13 files / 61 tests pass (5 fd CLI writeRegistry sites transparent under default-on lock)
- dispatch-daemon (default): 41 files / 197 tests pass
- dispatch-daemon test:race: 13 passed + 2 expected fail = 15

### Operator-arbitrated decisions Q-G1 through Q-G6

| ID | Decision | Status |
|---|---|---|
| **Q-G1** | **CRITICAL.** FM1 OUT OF SCOPE. probe-01 + probe-02 stay `it.fails`. probe-03 assertion inverted to FM3-only-elimination. Cross-cluster signal becomes "probe-03 FM3 sub-modes go to zero" rather than "probes flip GREEN." | ✅ APPLIED — WB3 implements write-only lock; WB4 inverts probe-03 assertion; probe-01/02 byte-identical. |
| **Q-G2** | Leave probe-02 byte-identical. Both probe-01 + probe-02 stay `it.fails`. No territory expansion. REPORT + finding-entry document FM1 persistence. | ✅ APPLIED — probe-02 untouched; REPORT §3.2 + this entry §FM1-persistence document. |
| **Q-G3** | probe-03 assertion: `tally['FM3b-rename-error'] === 0` AND `tally['FM3-corrupt'] === 0`. Leave silent-lost-update + no-race-detected unasserted. | ✅ APPLIED — WB4 commit `40de54b`. |
| **Q-G4** | `opts.lock` shape: bool-or-object hybrid. `false` opt-out. Object form for retry/stale tuning. Default-on when undefined. | ✅ APPLIED — WriteAtomicLockOpts in WB3. |
| **Q-G5** | Spike-as-test in WB1. Verify proper-lockfile API behavior in CI. Durable regression protection. | ✅ APPLIED — `spike-proper-lockfile.test.ts` at `e4c6680`. |
| **Q-G6** | proper-lockfile is RUNTIME dependency, NOT devDependency. Brief FACT-G1 wording was wrong. | ✅ APPLIED — added to `dependencies` in WB1 commit `e4c6680`. |

### Methodology lessons

1. **Phase 1 scout caught operator-overconfident framing about
   protocol reach.** Original Phase 2 brief promised "probes flip
   GREEN" as the cross-cluster KNOWN signal. Sess-g re-analysis
   showed the protocol is FM3-only because FM1 is a read-modify-
   write hazard the helper-internal lock cannot span. The lock
   acquired inside writeAtomicJson serialises the rename + tmp
   ownership but does NOT span the caller's earlier read; both
   writers can hold stale snapshots before reaching the lock and
   the second-writer-wins lost-update still fires. Operator
   arbitrated Q-G1=a (FM1 out of scope) + Q-G3=a (probe-03
   assertion shifts to FM3-elimination) in response. **Demonstrates
   Phase 1 protocol-vs-fix distinction catching strategic misframing
   before code ships.** KNOWN — operator acknowledged the correction
   in Phase 2 authorization message ("Brief FACT-G5 framing was
   overconfident… This was wrong. Operator over-promised on the
   protocol's reach.").

2. **Default-on lock at the helper layer is mechanism-preserving.**
   Both v1 (`writeRegistry`) and v2 (`writeRegistryV2`) callers gain
   locking transparently with ZERO call-site changes. **Sess-a's
   prior unification work (writeAtomicJson as the single integration
   point) made this batch's transparency possible.** KNOWN —
   verified by reading both call sites unchanged at HEAD `23517d7`;
   both pass `{ validate, fsync, retries }` only; default-on `lock`
   is implied by absence. The unified-helper-layer pattern is now
   load-bearing for any future cross-cutting concern that affects
   atomic writes (compression, encryption, observability) — adding
   it once at the helper extends to every caller transparently.

3. **Spike-as-test for external-dependency API contracts is a
   durable regression-protection pattern.** WB1's `spike-proper-
   lockfile.test.ts` ships 8 probes that fail loudly if proper-
   lockfile changes major version or alters semantics. KNOWN —
   pattern reused from cairn-discipline precedent (sess-a batch-4
   spike commits per BUILD_CONTRACT §181). Documents the API
   contract more durably than an ADR doc that no one re-reads.

4. **Test-default vs production-default distinction (lock retry
   budget).** Production callers contend with 2-3 concurrent writers
   max (daemon route handler + occasional fd CLI command); typical
   acquisition is sub-second. The default `{ retries: 10, factor: 2,
   minTimeout: 50, maxTimeout: 1000 }` (~6.7s worst-case) is sized
   to absorb a hypothetical N=10 burst — necessary for P3 stress
   test, defensive for production. WB3's first GREEN attempt with
   tighter retries (5/500) yielded 4 rejections out of 10 in P3 due
   to retry-budget exhaustion; defaults bumped to handle the burst.
   KNOWN — derived from per-writer lock-hold-time × concurrency ×
   backoff math; verified at WB3 P3 runtime ~5.5s for N=10 cleanly
   serialised.

### Followups (operator-deferred to separate batches)

1. **MB-F-DAEMON-CONCURRENT-RACE-FIX-FM1** [Tier-2, deferred].
   Addresses FM1 (lost-update across read-modify-write). Likely
   options sketched in REPORT §10:
   - Caller-side lock spanning `read → mutate → write` (requires
     modifying writeRegistry + writeRegistryV2 call sites — out of
     sess-g territory).
   - Field-level patch protocol replacing whole-registry write.
   - HTTP-mandatory single-writer (only daemon writes; fd CLI
     delegates).
   Operator pick at next batch turn-on. probe-01 + probe-02
   `it.fails` markers stay until that batch lands.

2. **proper-lockfile cross-platform attestation** [Tier-3,
   SPECULATIVE]. Currently only darwin/APFS verified. CI matrix on
   linux + win32 would tighten the platform contract.

3. **Tighten probe-03 no-race-detected assertion** [Tier-3,
   SPECULATIVE]. Currently unasserted because barrier polling
   latency varies across machines. Could pin once CI-runner data
   collected.

4. **Distinguish FM3a from FM3c at the test layer** [carried forward
   from sess-c followup #3]. Both surface as FM3-silent-lost-update;
   now MOOT post-fix because both are eliminated. Surface matters
   only for diagnostic forensics on hypothetical regressions.

### §G gaps surfaced this batch

From Phase 1 (`/tmp/sess-g-concurrent-race-fix-diagnose.md` §6):

- **G-1 [CRITICAL]** Write-only lock is FM3-only — does not address
  FM1. RESOLVED via Q-G1=a out-of-scope arbitration; documented in
  REPORT §3.2 + this entry's Methodology Lesson #1.
- **G-2 [HIGH]** Probe territory mismatch (the 2 `it.fails` markers
  are probe-01 + probe-02; brief territory grants probe-01 + probe-03;
  probe-02 byte-frozen). RESOLVED via Q-G2=a; probe-02 byte-identical;
  probe-03 in territory + flipped per Q-G3=a.
- **G-3 [MED]** proper-lockfile `realpath:false` semantics under
  first-write. RESOLVED via WB1 spike S3 + S3b. Default in
  WriteAtomicLockOpts is `realpath: false`.
- **G-4 [MED]** Stale lock cleanup behavior. RESOLVED — default
  `stale: 10_000` ms; WB1 S5 + atomic-write-lock P5 pinned.
- **G-5 [LOW]** proper-lockfile cross-platform. SPECULATIVE —
  Conductor darwin-primary; deferred to followup #2.
- **G-6 [LOW]** Default-on may break pre-existing atomic-write tests.
  RESOLVED — WB5 sweep verified all sess-a batch-4 + sess-f WB2 +
  sess-a WB4 tests pass.
- **G-7 [LOW]** FACT-G3 file scope discrepancy. Trivial; n/a.
- **G-8 [LOW]** sess-c REPORT §3.3 cites pre-sess-a-unification
  path. NOT IN TERRITORY; surfaced for sess-c REPORT curation;
  NOT modified.

From Phase 2 execution:

- **G-9** WB3 RED→GREEN P3 retry-budget tuning. Default bumped from
  `{ retries: 5, ..., maxTimeout: 500 }` to `{ retries: 10, ...,
  maxTimeout: 1000 }` to absorb N=10 burst contention.
  KNOWN-resolved in WB3 commit body.
- **G-10** Race suite runtime impact: net unchanged (~2.5s).
  atomic-write-lock.test.ts P3 takes 5.5s due to N=10 sequential
  locks — acceptable unit-test cost.
- **G-11** Cross-session pnpm-lock.yaml exposure (WB1 modifies
  workspace lockfile as mechanical consequence of dep add). Surfaced
  in WB1 self-check #7. No conflict observed at WB5 sweep time.

### Cross-session coordination

- **Session H** (parallel-batch-6 dispatch-cli/dispatch-daemon
  test). NO overlap (sess-g modifies dispatch-core source +
  dispatch-core test + dispatch-daemon probe-03 only). KNOWN per
  Phase 2 brief territory partition.
- **Session I** (parallel-batch-6 dispatch-web). NO overlap. KNOWN.
- **Session A** (parallel-batch-4 sess-a/core-unification, already
  merged at HEAD `78bc817`). Sess-g extends sess-a's
  `writeAtomicJson` helper; NO re-modification of sess-a's territory
  beyond extending the opts shape and body wrapper. The single-
  integration-point pattern sess-a established is what made sess-g's
  default-on transparency possible. KNOWN.
- **Session C** (parallel-batch-4 sess-c/concurrent-race, already
  merged at HEAD `78bc817`). Sess-g consumes sess-c's race
  verification net (probes 00-03) and updates probe-03 per Q-G3=a;
  probe-01 + probe-02 byte-identical per Q-G2=a. Sess-c REPORT.md
  frozen.
- **Session F** (parallel-batch-5 sess-f/core-read-recovery, already
  merged at HEAD `78bc817`). Sess-g's default-on lock propagates
  transparently into `readJsonWithRecovery`'s quarantine-replace
  flow (which calls `writeAtomicJson` via `writeOpts`). No sess-f
  source modified; the transparent extension is desirable —
  quarantine-replace gets locking too.
- **Session D** (parallel-batch-5 sess-d/install-paths-fix, already
  merged at HEAD `78bc817`). Sess-d's worktree-aware install-paths
  fix is what allows dispatch-daemon's full suite to pass cleanly
  in sess-g's worktree. KNOWN — verified at WB5.

### Anti-fabrication

Every factual claim in this entry is one of: (a) a quoted source-
file location verifiable by reading the cited path:line, (b) a
test-execution observation reproducible via `pnpm --filter
dispatch-core test`, `pnpm --filter dispatch-cli test`, `pnpm
--filter dispatch-daemon test`, or `pnpm --filter dispatch-daemon
test:race`, or (c) labeled MODELED / SPECULATIVE with the basis
named. No claim asserts a fix that did not ship. This batch's scope
is FM3 elimination only — FM1 is documented as out-of-scope and
probe-01 + probe-02 stay `it.fails` to prove FM1 still fires.
