# Session F — parallel-batch-5-2026-05-05 — Findings (append-only)

**Branch:** `sess-f/core-read-recovery`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-f-core-read-recovery`
**Cut from:** `main` HEAD `1098ebb`
**Date opened:** 2026-05-05

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the reserved #160-#164 range (parallel-batch-5
sess-f slot). Numbers below are working entries; operator may
renumber on merge.

---

## Finding #160 — MB-F-CORE-READ-RECOVERY-OPT-IN

**Date filed:** 2026-05-05
**Tier:** 3 — architectural symmetry. Closes sess-a finding #135
§Followups #2 (`sess-a-findings-2026-05-06.md`) — v1 `readRegistry`
parallel recovery semantics. Sess-a refactored the v1 WRITE path to
use `writeAtomicJson` (gaining `fsync` + readback-retry transparent
to fd CLI). The v1 READ path stayed bare per operator Q3 in sess-a's
brief. Sess-f closes the symmetry by adding caller-controlled opt-in
quarantine recovery on the READ side.
**Origin:** sess-a finding #135 §Followups #2 — `dispatch-core/src/registry/read.ts`
parallel recovery semantics. Operator-promoted to parallel-batch-5
Session F scope, brief authored Phase 1 turn-on at HEAD `1098ebb`.
**Discovered by:** Session F (this batch) Phase 1 reading + Phase 2
implementation. Recovery surface verified at HEAD `1098ebb` (43-line
bare `readRegistry`, no recovery + no quarantine).
**Resolution status:** SHIPPED on `sess-f/core-read-recovery`, ladder
commits `c9815f7` (WB1 RED), `c361b78` (WB2 GREEN), `061f704` (WB3
verify), `cdda861` (WB4 REPORT); WB5 (this entry) is the final
commit.

### Surface change (KNOWN — direct read of source files at HEAD `1098ebb` + `c361b78`)

| | Before (HEAD `1098ebb`) | After (HEAD `c361b78`) |
|---|---|---|
| Signature | `readRegistry(path?: string): Promise<Registry>` | `readRegistry(path?: string, opts?: ReadRegistryOpts): Promise<Registry>` |
| LOC | 43 lines | 67 lines (+24, mostly type + jsdoc) |
| ENOENT | Inline fresh empty | Helper-delegated; inline literal `emptyValue` at binding site |
| readFile other err | Rethrow native | Helper rethrows native |
| JSON.parse fail | Throw with path | Default rethrow path; opt-in quarantine recovery |
| safeParse fail | Throw with path | Default rethrow path; opt-in quarantine recovery |
| Recovery | none | `opts.onCorrupt:'quarantine'` opt-in |

`ReadRegistryOpts` shape:
```ts
interface ReadRegistryOpts {
  onCorrupt?: 'rethrow' | 'quarantine';                          // default 'rethrow'
  logger?: { error: (...args: unknown[]) => void };
}
```

Mirrors `ReadRegistryV2Opts` at
`packages/dispatch-daemon/src/migration/schema-v2.ts:59-75` — by
intent, the v1 and v2 reader surfaces converge on a single shape.

### Verification (KNOWN — test-execution observations)

8 probes in `packages/dispatch-core/test/unit/registry-read-recovery.test.ts`:
- **R1** behavior-preservation pin (sess-a's WB4 byte-stable fixture)
- **R2** ENOENT default + fresh-object isolation (Q-F1 invariant)
- **R3** corrupt JSON + default opts → rejects with path-naming Error
- **R4** schema-fail + default opts → rejects with path-naming Error
- **R5** corrupt JSON + `onCorrupt:'quarantine'` → empty + sidecar
- **R6** schema-fail + `onCorrupt:'quarantine'` → empty + sidecar
- **R7** ENOENT + `onCorrupt:'quarantine'` → empty + NO sidecar
- **R8** forensic preservation: sidecar bytes byte-equal corrupt bytes

WB1 RED: 5 pass + 3 fail (R5/R6/R8 RED; R7 alignment-pin pass
documented in test header).
WB2 GREEN: 8/8 pass.

Regression sweep (WB3 commit `061f704`):
- dispatch-core: 10 files / 46 tests pass
- dispatch-cli: 13 files / 61 tests pass (5 fd CLI call sites
  backward-compat verified)
- dispatch-daemon registry-touching subset: 5 files / 22 tests pass
  (sess-a's batch-4 invariants intact)

### Operator-arbitrated decisions Q-F1 through Q-F4

| ID | Decision | Status |
|---|---|---|
| **Q-F1** | **CRITICAL.** Inline literal `{ version: 1, sessions: {} }` at the call site each invocation. NO module-level `EMPTY_REGISTRY` constant. Preserves the design choice from pre-refactor `read.ts:18-21` ("Fresh object each call... let callers pollute it via reference mutation"). | ✅ APPLIED (read.ts:62; pinned by R2). |
| **Q-F2** | Accept merged-error-wording from helper. Path preserved; no fd CLI call site pattern-matches on wording (FACT-F3). | ✅ APPLIED (R3/R4 assert path-presence only). |
| **Q-F3** | Reuse sess-a's WB4 `EXPECTED_BYTES` + `FIXTURE` verbatim. Pins `.passthrough()` invariant on read side. | ✅ APPLIED (test file lines 87-141). |
| **Q-F4** | Include `logger` field on `ReadRegistryOpts`, mirroring `ReadRegistryV2Opts`. | ✅ APPLIED (read.ts:28-29; forwarded). |

The Q-F1 invariant is load-bearing. R2 probe explicitly tests
mutation isolation: two consecutive `readRegistry` calls on a
non-existent path with mutation between calls; second call's
`sessions` must remain empty. **If R2 fails, there is a bug in the
binding** (per operator brief). Verified GREEN at WB2 `c361b78`.

### Methodology lessons

1. **Caller-controlled opt-in pattern** preserves backward compat
   while exposing capability. fd CLI signature unchanged at all 5
   call sites; quarantine surface available for future opt-in
   callers (e.g., a future `fd recover` command). KNOWN — pattern
   originated in sess-a's `readRegistryV2` at `schema-v2.ts:77-91`;
   sess-f mirrors verbatim with v1-specific schema substitution.

2. **Phase 1 scout caught a real hazard** that would have shipped
   a regression if missed. Phase 1 §6 G1 surfaced the fresh-object-
   vs-shared-constant pollution risk (`init.ts:36` mutates
   `registry.sessions` in place; a shared `EMPTY_REGISTRY` constant
   bound directly as `emptyValue` would have aliased the inner
   `sessions` object across calls). Operator arbitrated Q-F1 in
   response → inline-literal binding shipped. R2 probe pins the
   invariant. **Pre-Phase-1-verification + Phase-1-scout pattern
   working as designed for catching subtle pre-existing-design-
   invariant violations.** KNOWN — design hazard documented in
   pre-refactor `read.ts:18-21`; resolved without re-introduction.

3. **Wording-shift documentation is part of the deliverable.**
   Helper merges error-message paths (JSON-parse + schema-validate
   → one wording). No fd CLI call site pattern-matches on wording,
   so functional contract intact, but operator-visible stderr
   differs. Documented in WB2 commit + WB4 REPORT §2 / §5 for
   future operator-visible-error tracking. KNOWN.

4. **Empty-commit verification step** (WB3 `061f704`) records the
   regression-sweep outcome on the ladder without polluting the
   tree with verification-only artifacts. Cairn-discipline-friendly
   pattern — every WB has a SHA, every WB has a self-check block,
   the WB3 SHA documents the sweep occurred without claiming
   ownership of code it didn't author. KNOWN — verified by
   `git log -1 --stat` showing 0 file changes.

### Followups (operator-deferred to separate batches)

1. **MB-F-CORE-EMPTY-REGISTRY-EXPORT** (Tier-3 SPECULATIVE) — if
   `dispatch-core/src/registry/schema.ts` ever unfreezes, consider
   exporting an `EMPTY_REGISTRY_V1` constant + cloning at use sites
   (`structuredClone(EMPTY_REGISTRY_V1)`). DRY win + same fresh-
   object guarantee. Currently blocked by frozen-schema scaffold
   (Q-F1 brief: schema.ts FORBIDDEN). NOT in scope; out of band.

2. **MB-F-DAEMON-CONCURRENT-RACE-FIX** (Tier-2, deferred). Sess-c's
   finding #145 documents the race; sess-f's read-side recovery is
   independent of that work. The recovery handles single-writer-
   corruption events (hand-edit, partial write); the race is a
   multi-writer protocol-level issue (two atomic writers sharing
   `<target>.tmp`). Different scope, different fix.

3. **MB-F-DAEMON-INSTALL-PATHS-WORKTREE-AWARE** (Tier-3,
   SPECULATIVE) — adapt `dispatch-daemon/test/unit/install-paths.test.ts`
   P3 regex (`/foxworks-dispatch$/`) to accept worktree directories
   cut under `foxworks-worktrees/`. Same observation as sess-c's
   G11 (`sess-c-findings-2026-05-06.md` line 158-163). Failure
   reproduces in any sess-* worktree at any HEAD; not a regression
   of any specific batch. Out of sess-f territory (FORBIDDEN:
   dispatch-daemon source unchanged).

4. **fd CLI opt-in callers for quarantine** — no fd CLI call site
   currently passes `onCorrupt:'quarantine'`; the surface is
   available but unused. A future `fd recover` or
   `fd init --recover-corrupt` command could opt in. Out of scope
   this batch.

### §G gaps surfaced this batch

From Phase 1 (`/tmp/sess-f-core-read-recovery-diagnose.md` §6):

- **G1** fresh-object vs shared-constant on ENOENT — RESOLVED via
  Q-F1 (inline literal) + R2 probe.
- **G2** error-message wording shift on rethrow — RESOLVED via
  Q-F2 (accept merged wording; path preserved).
- **G3** `writeOpts` always provided even when `onCorrupt='rethrow'`
  — DOCUMENTED as defensive design choice in WB2 commit + WB4
  REPORT §6.
- **G4** `EMPTY_REGISTRY` DRY follow-up — DEFERRED (followup 1).
- **G5** path-only first-arg signature backward compat — KNOWN;
  verified at all 5 fd CLI call sites.
- **G6** `.passthrough()` fields and validate semantics — KNOWN;
  R1 probe pins on read side.

From Phase 2 execution:

- **G7** pre-existing `install-paths.test.ts` P3 environmental
  failure — DOCUMENTED (followup 3); same observation as sess-c
  G11 cited above.
- **G8** WB1 RED count was 5+3 vs operator-expected 4+4 — surfaced
  transparently in WB1 commit body + REPORT §3. R7 passes against
  current code because ENOENT semantic shared between pre-WB2 and
  post-WB2 paths; deliberate alignment-pin design.

### Cross-session coordination

- **Session D** (dispatch-daemon test only). NO overlap (sess-f
  modifies dispatch-core source + dispatch-core tests only). KNOWN
  per parallel-batch-5 brief.
- **Session E** (dispatch-web). NO overlap. KNOWN.
- **Session A** (parallel-batch-4 sess-a/core-unification, already
  merged at HEAD `1098ebb`). Sess-f consumes sess-a's batch-4
  helper (`readJsonWithRecovery` + `writeAtomicJson`); no
  re-modification of sess-a's territory. KNOWN — `persist/*`
  FORBIDDEN per brief; verified untouched.
- **Session C** (parallel-batch-4 sess-c/concurrent-race, already
  merged at HEAD `1098ebb`). Sess-c's race tests + REPORT
  unchanged by sess-f. NO interaction (different writer-vs-reader
  surfaces).

### Anti-fabrication

Every factual claim in this entry is one of: (a) a quoted source-
file location verifiable by reading the cited path:line, (b) a
test-execution observation reproducible via `pnpm --filter
dispatch-core test test/unit/registry-read-recovery.test.ts`, or
(c) labeled MODELED / SPECULATIVE with the basis named. No claim
asserts a fix that did not ship. This batch's scope is the v1
read-side recovery surface only — the helper itself, the v2 daemon
binding, and the schema were all FORBIDDEN territory and remain
untouched.
