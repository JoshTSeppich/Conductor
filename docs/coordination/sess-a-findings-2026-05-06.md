# Session A — parallel-batch-4-2026-05-06 — Findings (append-only)

**Branch:** `sess-a/core-unification`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-a-core-unification`
**Cut from:** `main` HEAD `b3da626`
**Date opened:** 2026-05-06

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the reserved #135-#139 range (parallel-batch-4
Sess-A slot). Numbers below are working entries; operator may renumber
on merge.

---

## Finding #135 — MB-F-DISPATCH-CORE-PERSIST-UNIFIED

**Date filed:** 2026-05-06
**Tier:** 2 (architecture cleanup; closes parallel-batch-3 Session 2
finding #125 §Followups #1 + #4 — "core-side generalization deferred"
+ "apply fsync to dispatch-core writeRegistry").
**Origin:** Operator-arbitrated promotion from finding #125 followups
to a stand-alone parallel-batch-4 cluster. Phase 1 close report at
`/tmp/sess-a-core-unification-diagnose.md` (operator-reviewed);
Phase 2 brief authored by operator in-conversation.
**Discovered by:** Session 2 (parallel-batch-3) banked the followup
when scope-fenced from dispatch-core; Session A (this batch) executed
the unification.
**Resolution status:** SHIPPED on `sess-a/core-unification`, ladder
commits `7979c82` … `81242f7` (6 commits across WB1-WB6); WB7
(this entry) is the final commit.

### Defect class (KNOWN)

Architecture duplication, not production-runtime defect. Two parallel
atomic-write recipes existed in tree post-batch-3:

1. `packages/dispatch-daemon/src/persist/atomic-write.ts` —
   generic, fsync + readback + retry, used by `writeRegistryV2`.
2. `packages/dispatch-core/src/registry/write.ts` (the v1 fd CLI
   path) — naïve `writeFile` + `rename`, NO fsync, NO retry.

Followups #1 + #4 from finding #125 explicitly flagged this for
unification. Sess-A's mandate: ONE atomic-write recipe in tree, used
by both v1 and v2 paths. v1 stays bare on the READ path (operator-
arbitrated); v1 gets durability hardening on the WRITE path
(fsync + retry).

### Resolution

7 work blocks (WB1-WB7) shipped via 7 ladder commits with cairn
RED→GREEN discipline (per-commit-push, per-path `git add`,
`git status --short` pre-commit verification, `git log -1 --stat`
post-commit verification, §10.5 self-check block in every commit body):

| WB | Surface | Evidence |
|---|---|---|
| WB1 | Move 3 persist src files (atomic-write.ts, read-with-recovery.ts, index.ts) from dispatch-daemon to dispatch-core via `git mv`. Delete empty daemon dir. | rename detection 3-of-3; history preserved |
| WB2 | Update 2 import lines in `dispatch-daemon/src/migration/schema-v2.ts` from `../persist/*` to `dispatch-core/src/persist/*`. | targeted daemon test suite 10/10 green (migration + sessions-corruption-recovery + startup-corrupt-registry-recovery) |
| WB3 | Move 4 persist test files from `dispatch-daemon/test/unit/` to `dispatch-core/test/unit/` via `git mv`. | rename detection 4-of-4; dispatch-core suite 11/11 green from new location; vi.mock module-id keying preserved (FACT-A6) |
| WB4 | Add `dispatch-core/test/unit/registry-write-byte-stability.test.ts` with 4 probes (B1 round-trip identity vs pinned EXPECTED_BYTES, B2 trailing-newline, B3 2-space indent, B4 fd CLI parity). Green-on-arrival; locks bytes for WB5. | 4/4 probes green pre-WB5 |
| WB5 | Refactor `dispatch-core/src/registry/write.ts` to delegate to `writeAtomicJson` with `{ validate: RegistrySchema.parse, fsync: true, retries: 3 }`. Signature unchanged; fd CLI callers (init/send/pull) untouched. Imports pruned. | dispatch-core 38/38; dispatch-cli 61/61; daemon registry-touching subset 41/41; full daemon 196/197 (1 pre-existing worktree failure) |
| WB6 | Aggregate REPORT.md at `packages/dispatch-core/test/unit/registry-write-byte-stability/REPORT.md` (8 sections: shipped, probes, ladder, defends-against, does-not-prevent, §G gaps, operator next steps, methodology). | KNOWN per direct file inspection |
| WB7 | This finding entry. | KNOWN |

**Net source LOC:** −12 / +25 in production code
(`dispatch-core/src/registry/write.ts` shrank as the inline recipe
collapsed into a single `writeAtomicJson` call); +0 in
`dispatch-daemon/src/migration/schema-v2.ts` (2 lines edited in
place); +142 in test code (1 new byte-stability test); +294 in
REPORT.md; +~140 in this finding entry. The persist module's 184
lines of source migrated package without LOC change (pure relocation).

### Source-side seam additions

NONE in dispatch-daemon. dispatch-core gained:

- **`packages/dispatch-core/src/persist/`** — new package-internal
  directory with three files (`atomic-write.ts`, `read-with-recovery.ts`,
  `index.ts`) relocated from dispatch-daemon. Generic by design;
  schema-agnostic via caller-injected `validate`.
- **`packages/dispatch-core/src/registry/write.ts`** — refactored
  from inline `mkdir + writeFile + rename` to single `writeAtomicJson`
  call. fd CLI consumers (init/send/pull) get fsync + retry
  hardening transparent — no API change, no caller awareness.
- **`packages/dispatch-core/test/unit/registry-write-byte-stability.test.ts`**
  — new test (4 probes) pinning v1 writeRegistry's exact on-disk byte
  output via an `EXPECTED_BYTES` literal snapshot.

### What this DOES NOT prevent (operator-acked)

Per Phase 2 brief Q3 + Q4:

- **Concurrent-writer protocol races.** rename is still last-writer-wins;
  fd CLI's writeRegistry + daemon's writeRegistryV2 racing each other
  can still produce a "lost update". The new readback + retry NARROWS
  the window but does NOT serialize writers. Sess-C territory; deferred
  to batch-5 per operator Q4.
- **v1 read-side recovery.** `dispatch-core/src/registry/read.ts` stays
  bare (bare `readFile` + `JSON.parse` + `safeParse` + rethrow on parse
  failure). Operator-arbitrated out of scope per Phase 2 brief Q3.
  v2 daemon path is the only consumer of `readJsonWithRecovery`, opting
  in via `opts.onCorrupt: 'quarantine'` at startup-time only.
- **`recover-sessions-json.mjs` script convergence.** This manual
  recovery script (in `dispatch-daemon/scripts/`) re-implements its
  own inline `writeAtomicJson` for the no-runtime-TS / no-zod
  constraint. Intentional divergence; SPECULATIVE followup logged
  below.

### Followups (not addressed; for operator triage)

1. **Concurrent-writer race investigation** — fd CLI + daemon writing
   to same file at different schema versions. Tier-2. Sess-C is
   investigating in parallel; deeper protocol fix (lockfile or
   sequence-number CAS) lands in batch-5. With this batch's unified
   recipe, any protocol change lands in ONE place.
2. **`dispatch-core/src/registry/read.ts` parallel recovery semantics**
   — currently bare-rethrow on corrupt-read. If/when v1 corruption
   events surface in the wild, consider extending the v1 read path to
   use `readJsonWithRecovery` with caller-controlled `onCorrupt`.
   Tier-3. Out of scope this batch per operator Q3.
3. **`packages/dispatch-daemon/test/unit/install-paths.test.ts P3`**
   — pre-existing worktree-name brittleness. Test asserts
   `expect(result).toMatch(/foxworks-dispatch$/)` against
   `resolveRepoRoot(import.meta.dirname)`, which fails in any
   non-canonical-named worktree (e.g. `sess-a-core-unification`).
   Verified pre-existing at HEAD `b3da626` (commit `49f2c2a` last
   touched line 35; content unchanged across this batch). ZERO
   coupling to persist refactor. Already flagged in finding #125
   §Followups #5; restated here for visibility. Tier-3 maintenance
   ticket. Suggested fix: weaken regex to
   `/foxworks-dispatch|sess-[a-z0-9-]+$/` or compute expected from
   the same marker-resolution helper used in production.
4. **`recover-sessions-json.mjs` DRY-up.** Script currently re-implements
   `writeAtomicJson` inline (lines 169-181) due to no-runtime-TS /
   no-zod constraint. If those constraints relax, converge to the
   moved core helper. Tier-3. SPECULATIVE.

### Cross-references

- **Finding #125** — `docs/coordination/sess-2-findings-2026-05-06.md`
  banked the unification followup as items #1 + #4 in §Followups.
  This finding closes them.
- **REPORT.md** —
  `packages/dispatch-core/test/unit/registry-write-byte-stability/REPORT.md`
  — aggregate REPORT for this cluster's WB1-WB6 ladder, full
  defends-against / does-not-prevent matrices, methodology notes.
- **Phase 1 close report** — `/tmp/sess-a-core-unification-diagnose.md`
  (operator-reviewed; operator-arbitrated Phase 2 brief is the
  in-conversation message that authorized Phase 2 with explicit
  responses to §7 Q1-Q5).

### Methodology lessons (KNOWN)

- **The persist module was already generic by design.** Phase 1 §1.C
  correctly predicted that the move was a file-relocation + 2-line
  import update + 4-line refactor of v1 `writeRegistry` — zero
  architectural redesign. The original WB6 of finding #125 had already
  done the heavy lifting (extracting v2-coupling out of the helpers);
  this batch was harvesting that prep work.
- **fd CLI hardening for free**: by delegating v1 `writeRegistry` to
  `writeAtomicJson`, fd init/send/pull get fsync + retry without any
  signature change or caller awareness. Cleanest possible "additive
  hardening" shape. The fd CLI layer doesn't need to learn anything
  new.
- **Behavior-preservation testing via byte snapshots** (WB4): pinning
  the exact on-disk bytes via a literal `EXPECTED_BYTES` constant gave
  the highest-resolution regression trap available. Any perturbation
  to `JSON.stringify` args, indent depth, newline handling, or key
  ordering surfaces immediately on a single test run. Cheap to author
  (~120 lines incl. fixture); decisive evidence for behavior
  preservation across the WB5 refactor.
- **Operator-arbitrated decisions held the scope tight**: Phase 2
  brief Q1-Q5 closed five potential scope-creep vectors (migration
  shim, test relocation strategy, WB ordering, Sess-C coordination,
  barrel retention). Sess-A finished without expanding scope into
  adjacent territory.

### Confidence

- **Move + import update**: KNOWN — git rename detection 3-of-3
  (src) + 4-of-4 (test); content-zero diff per `git log -1 --stat`.
- **Behavior preservation**: KNOWN — WB4 byte-stability snapshot
  green pre/post-WB5; full-gauntlet test pass (dispatch-core 38/38,
  dispatch-cli 61/61, dispatch-daemon registry-surface 41/41).
- **Hardening additivity**: MODELED — fsync + retry are textbook
  POSIX defensive recipes (validated by sess-2 batch-3 unit probes,
  now relocated to dispatch-core/test/unit). The v1 path now exhibits
  the same observed behavior the v2 path exhibited at end of
  parallel-batch-3.
- **Pre-existing install-paths brittleness as non-regression**: KNOWN
  per `git show b3da626:packages/dispatch-daemon/test/unit/install-paths.test.ts`
  showing line 35 identical to current.
- **§Followups triage tiers**: SPECULATIVE — operator may renumber
  or re-tier on merge.

### §10.5 self-check (resolution append)

1. **API verified by spike?** n/a — pure-refactor unification; no
   novel transport. The persist module's primitives were proven by
   sess-2 batch-3; this batch relocates the existing implementation
   and consumers.
2. **Test exercises behavior or mocks?** exercises — WB4
   byte-stability test uses real `fs` on `mkdtemp` paths; full
   gauntlet (dispatch-core + dispatch-cli + dispatch-daemon) runs
   real production code paths. The 4 relocated persist tests retain
   their original mocking strategy (vi.mock for fsync ordering +
   retry simulation in 2 of them); module-id keying preserves
   interception across the package move.
3. **Implementation deleted, test still passes?** verified per-WB:
   - WB1: revert the file move → daemon imports break + persist
     tests fail to load.
   - WB4: revert → byte-stability probes never registered, but
     refactor proceeds blind. Test EXISTS post-WB4 specifically so
     the WB5 refactor can demonstrate byte equivalence.
   - WB5: revert (restore inline recipe) → byte-stability probes
     still pass (recipe was the byte-equivalent), but fsync + retry
     hardening reverts. Behavior-equivalent at the byte level by
     design; durability + retry are added value, not regression
     traps.
4. **Anything outside contract?** no — `CONDUCTOR_API_CONTRACT.md`
   unchanged; `REGISTRY.md` unchanged; v1 + v2 schemas unchanged.
   Persist infrastructure migrated package; consumer signatures
   unchanged.
5. **Modified contract?** no.
6. **Unlabeled claims?** no — KNOWN / MODELED / SPECULATIVE used
   throughout this entry, REPORT.md, and per-commit bodies.
7. **Touched a file another session may modify?**
   - Sess-B (dispatch-web FocusedDetailPanel) — NO overlap. Verified
     by per-commit `git status --short`; all paths in
     `packages/dispatch-core/`, `packages/dispatch-daemon/`, or
     `docs/coordination/`.
   - Sess-C (dispatch-cli + dispatch-daemon read-only) — Sess-A
     modified `packages/dispatch-daemon/src/migration/schema-v2.ts`
     in WB2 (2-line import-path swap). Sess-C reads this file
     read-only; the swap doesn't alter exported symbols, signatures,
     or runtime behavior — only the module dependency-graph edges.
     Per Phase 2 brief Q4: no coordination event required; Sess-A's
     refactor is purely additive (fsync + retry, no protocol
     change).
   Per-commit `git status --short` recorded in each commit's §10.5
   Q7. Per-path `git add` enforced (no `-A`).
8. **Pre-push protocol?** per-commit-push (`git push origin
   sess-a/core-unification` after each of 7 commits; per-commit
   `git log -1 --stat` verification before push). Per-path
   `git add` always (no `git add -A`). Pre-commit
   `git status --short`.
9. **Confidence labels?** KNOWN / MODELED / SPECULATIVE used
   per-claim throughout this entry, REPORT.md (§4 defends-against
   matrix labels each row), and per-commit body confidence statements.
