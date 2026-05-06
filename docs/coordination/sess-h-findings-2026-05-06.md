# Session H — parallel-batch-6-2026-05-05 — Findings (append-only)

**Branch:** `sess-h/worktree-brittleness`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-h-worktree-brittleness`
**Cut from:** `main` HEAD `78bc817`
**Date opened:** 2026-05-05

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the reserved #170-#174 range (parallel-batch-6
sess-h slot). Numbers below are working entries; operator may
renumber on merge.

---

## Finding #170 — MB-F-WORKTREE-BRITTLENESS-AUDIT

**Date filed:** 2026-05-05
**Tier:** 3 — audit close-out. Closes sess-d (parallel-batch-5
finding #150) §Followups #1 — audit other tests for worktree-name
brittleness. **Null-result audit**: zero source changes shipped.
The audit IS the work; REPORT.md is the artifact.
**Origin:** sess-d finding #150 §Followups #1
(`sess-d-findings-2026-05-06.md` lines 122-130). Sess-d's commit
`3c4e5f4` fixed the only-then-known worktree-basename brittleness
(`install-paths.test.ts` P3) but Q2 scope-fence excluded a broader
sweep. parallel-batch-6 Session H is that sweep.
**Discovered by:** Session H Phase 1 scout (this batch). Audit
methodology + null result documented in REPORT at
`packages/dispatch-cli/test/worktree-brittleness-audit/REPORT.md`
(WB1 commit `83893b0`).
**Resolution status:** SHIPPED on `sess-h/worktree-brittleness`,
ladder commits `83893b0` (WB1 REPORT) and (this commit, WB2 sess-h
finding entry).

### Surface (KNOWN — direct read of source files at HEAD `78bc817`)

Two files added; zero source files modified.

| File | Role | Touched this batch |
|---|---|---|
| `packages/dispatch-cli/test/worktree-brittleness-audit/REPORT.md` | NEW. Audit-trail aggregate documenting categorization rules, FACT-H1 + FACT-H2 categorization, additional sweep results, null-result conclusion, methodology lessons, §G gaps, operator next steps, anti-fabrication block. | YES (NEW dir + REPORT.md) |
| `docs/coordination/sess-h-findings-2026-05-06.md` | NEW. Sess-h finding entry (this file). | YES (NEW file) |
| `packages/dispatch-cli/test/fixtures/real-daemon.ts` | Phase 1 audit-confirmed INTENTIONAL (line 45 stale comment; line 46 basename-agnostic walk-up). | NO — DO NOT MODIFY per Phase 2 brief |
| `packages/dispatch-daemon/test/unit/install-plist.test.ts` | Phase 1 audit-confirmed INTENTIONAL (fixture data fed to pure XML generator). | NO — DO NOT MODIFY per Phase 2 brief |
| `packages/dispatch-daemon/test/unit/install-paths.test.ts` | Sess-d's territory; closed by commit `3c4e5f4`. | NO — DO NOT MODIFY per Phase 2 brief |

### Operator-arbitrated decisions Q-H1 + Q-H2

| ID | Decision | Status |
|---|---|---|
| **Q-H1** | **a** — Null-result close-out. ~2 commits (WB1 REPORT + WB2 sess-h finding entry). Fixes nothing in source; documents methodology so the next audit doesn't re-walk the 99-hit grep. Operator-arbitrated H-Q1=a ("fix all genuine brittleness") trivially holds when there are zero candidates. | ✅ APPLIED — REPORT.md shipped at WB1 `83893b0`; this entry is WB2. KNOWN. |
| **Q-H2** | **a** — REPORT.md location: `packages/dispatch-cli/test/worktree-brittleness-audit/REPORT.md` (NEW dir). Mirrors sess-d/c/f/e REPORT-under-test pattern. dispatch-cli location chosen because real-daemon.ts is the only file actually inspected in cli/; install-plist.test.ts categorization didn't lead to modification, so REPORT shouldn't live next to a file it makes no claim about. | ✅ APPLIED — file created at the specified path. KNOWN. |
| **Q-H3** | n/a — Branch 2 (cosmetic improvements) declined per Q-H1=a. | n/a |
| **Q-H4** | n/a — Territory expansion (dispatch-workstation /Users/test/... fixture data) declined per Q-H1=a. | n/a |

### Verification (KNOWN — Phase 1 source-reads + grep)

  Phase 1 source-reads at HEAD 78bc817:
    real-daemon.ts (99 lines, full read)
    install-plist.test.ts (102 lines, full read)
    install-paths.test.ts (74 lines, full read; sess-d's fixed shape)
    git log -p of install-paths.test.ts (sess-d precedent commit
      3c4e5f4 read in full)
  Phase 1 additional grep patterns (6 patterns):
    Desktop/Automata/foxworks-dispatch    → 0 hits
    dirname.*foxworks-dispatch            → 0 hits
    endsWith/basename.*foxworks-dispatch  → 0 hits
    toBe/toEqual/toMatch/toContain        → 1 substantive hit
                                            (workstation; production
                                             constant)
    process.cwd / cwd()                   → 0 hits
    relative walk-up (4-5 levels)         → 2 hits (basename-agnostic)
  Phase 1 dispatch-workstation spot-check:
    coarch-t04 + fix-orchestrator-flow + http-daemon-client all
    audit-confirmed INTENTIONAL (out of sess-h territory; informational)
  Marker file existence check:
    CONDUCTOR_API_CONTRACT.md confirmed at sess-h worktree root
    (validates real-daemon.ts:46's relative walk-up logic resolves
     correctly in this worktree despite basename != "foxworks-dispatch")

  Phase 2 ladder (this batch):
    WB1: REPORT.md created and committed at 83893b0; pushed to origin.
    WB2: this entry created and committed (this commit).
    Source files: byte-identical to HEAD 78bc817.

### Methodology lessons

**1. Null-result audit is a valid cairn deliverable.** The audit IS
the work; REPORT.md is the artifact. Source unchanged when there
is nothing to fix. Sess-h's REPORT documents the categorization rules
(REPORT §1) and the 99-hit bucket breakdown (REPORT §4) so future
audits skip the grep walk. The deliverable is the categorization
artifact, not source modification. KNOWN — pattern adapted from
sess-d's WB2 docs-only finding-entry precedent (sess-d shipped one
test file modification + one finding entry; sess-h ships zero test
modifications + one REPORT.md + one finding entry — the docs-only
end of the same spectrum).

**2. Brief pre-categorization needs function-under-test reading
depth.** FACT-H1 and FACT-H2 looked brittle by line-citation pattern
matching but were categorized INTENTIONAL by tracing the function
under test (pure XML generator `generatePlist` for install-plist;
basename-agnostic walk-up at `real-daemon.ts:46` for the cli
fixture). Phase 1 scout caught the drafting failure before any code
shipped — full source-reads + import-trace verified that the
suspect strings flow through opaque pure functions and never reach
real-fs comparison.

This is a meaningful methodology adaptation: brief drafting for
worktree-brittleness sweeps (and similar pattern-match audits) needs
the function-under-test traced, not just the line citation pattern-
matched. Pure-function-fixture-data is the most common false
positive — strings that *look* like real paths but flow through
opaque pure functions. KNOWN — verified by Phase 1 source-reads of
both candidate files + their function-under-test imports.

**3. Multi-batch latency for cheap fixes is real.** Sess-d
originally flagged worktree brittleness in 3 prior batches before
parallel-batch-5 turned a session on it (`sess-2-findings-2026-05-06.md`
§G3, `sess-a-findings-2026-05-06.md` §Followups #3,
`sess-c-findings-2026-05-06.md` §G11). Each flagging session was
operating under a scope-fence that excluded the inline fix.

parallel-batch-6 Session H closed sess-d's followup #1 with audit
confirming the suite is already portable — zero source changes.
**Followup turn-around for audits should not be confused with
followup turn-around for fixes.** A fix waits the full multi-batch
latency cost (sess-d: 4 batches from first sighting); a null-result
audit can close in a single batch with a categorization REPORT.
KNOWN — sess-d finding entry §"Methodology lesson" already documented
the multi-batch latency pattern for fixes; sess-h's null result
documents the audit side of the same pattern.

**4. Cosmetic improvements declined as scope-creep beyond H-Q1=a.**
Phase 1 §3 surfaced two optional improvements (Optional A: comment
update; Optional B: marker walk-up port for stylistic consistency
with sess-d's precedent). Operator arbitrated Q-H1=a (null-result
close-out) — the literal scope of "fix all genuine brittleness"
trivially holds with zero candidates. Optional A + B are stylistic
work, not defect-fix work, and were declined as scope-creep beyond
H-Q1=a. Available as separate Tier-3 followup tickets per REPORT
§7. KNOWN.

### Followups (operator-deferred to separate batches; informational only)

1. **MB-F-CLI-FIXTURE-REAL-DAEMON-COMMENT-CLEANUP** (Tier-3
   SPECULATIVE) — Optional A. Update `real-daemon.ts:45` comment
   from `// up 4 = .../foxworks-dispatch` to `// up 4 = repo root
   (canonical clone OR worktree dir, basename varies)`. 1-line
   change. Cosmetic only; logic at line 46 is already correct.

2. **MB-F-CLI-FIXTURE-REAL-DAEMON-MARKER-WALKUP** (Tier-3
   SPECULATIVE) — Optional B. Port `real-daemon.ts:46` repoRoot
   computation from relative `..×4` to marker walk-up via
   `existsSync(join(current, 'CONDUCTOR_API_CONTRACT.md'))`,
   mirroring sess-d's `install-paths.test.ts` P3 algorithm. ~12-line
   diff. Defends against hypothetical future fixture relocation;
   stylistic consistency with sess-d's precedent.

3. **MB-F-DAEMON-INSTALL-PLIST-FIXTURE-INTENT-COMMENT** (Tier-3
   SPECULATIVE) — REPORT §6 G3. One-line comment near
   `install-plist.test.ts:35` clarifying "fake operator-shaped
   paths; generatePlist is pure" for future audit clarity. The
   operator-shaped form (`/Users/op/foxworks-dispatch/...`)
   invites a drafting-failure-by-pattern-match like the one Phase 1
   caught. Trivial.

4. **dispatch-workstation `/Users/test/Desktop/foxworks-dispatch`
   FAKE_REPO_ROOT constant introduction** (Tier-3 SPECULATIVE) —
   REPORT §6 G1. ~13 fixture-data instances across `coarch-t04/*`
   and `fix-orchestrator-flow/*`. All audit-confirmed INTENTIONAL
   but a `FAKE_REPO_ROOT` constant would prevent future audit
   confusion. Out of sess-h territory. Q-H1=d would have addressed
   this; declined per Q-H1=a.

### §G gaps surfaced this batch (informational, not load-bearing)

- **G1** — dispatch-workstation `/Users/test/Desktop/foxworks-dispatch`
  fixture data (~13 instances across coarch-t04 + fix-orchestrator-
  flow). All audit-confirmed INTENTIONAL (fixture data fed to pure
  `checkReadScope`-shape functions). Out of territory. Reported for
  future-audit reference. KNOWN.

- **G2** — `dispatch-daemon/test/integration/concurrent-writer-race/
  helpers/spawn-child.ts:27` 6× relative walk-up. Same shape as
  `real-daemon.ts:46`; basename-agnostic. Out of territory (sess-c
  probes; Session G owns probe-01/03 modifications). Filed for
  visibility. KNOWN.

- **G3** — `install-plist.test.ts` could benefit from a one-line
  fixture-intent comment near line 35 stating "fake operator-shaped
  paths; generatePlist is pure". Optional clarification (Followup #3).
  Not in scope this batch. KNOWN.

- **G4** — `checkReadScope` production source NOT read by sess-h
  (territory-cautious; out of scope). Categorization of dispatch-
  workstation `coarch-t04/*.spec.ts` files as INTENTIONAL rests on
  MODELED-confidence assertion of `checkReadScope` purity based on
  probe behavior, not on direct source-read. MODELED.

- **G5** — REPORT.md cross-references in registry-{read,write}-
  recovery|byte-stability/REPORT.md, concurrent-writer-race/
  REPORT.md, sessions-corruption-recovery/REPORT.md, etc. NOT
  re-read by sess-h. KNOWN per operator pre-categorization;
  MODELED per spot-check (saw "REPORT.md" only in grep output paths).

### Cross-session coordination

- **Session G** (parallel-batch-6) — territory: `dispatch-core/src/
  persist/atomic-write.ts` + `dispatch-daemon/test/integration/
  concurrent-writer-race/probe-01,03` modifications. NO overlap with
  Session H territory (sess-h is docs-only; no code touched).
  Confirmed via Phase 2 brief FORBIDDEN list. Bidirectional §3.4
  territory fence held — no instructions naming Session G files
  appeared in sess-h Phase 1 or Phase 2 briefs. KNOWN.

- **Session I** (parallel-batch-6) — territory: `dispatch-core/src/
  v2/schema.ts` (frozen contract per §3.4) + `dispatch-web/src/
  Layout.tsx` + sessions route. NO overlap with Session H territory.
  Confirmed via Phase 2 brief FORBIDDEN list. Bidirectional §3.4
  territory fence held — no instructions naming Session I files
  appeared in sess-h Phase 1 or Phase 2 briefs. KNOWN.

- **Session D** (parallel-batch-5, already merged at HEAD `78bc817`
  via commit `1098ebb`-and-prior). Sess-d's `install-paths.test.ts`
  fix at commit `3c4e5f4` consumed by sess-h as the audit precedent
  pattern (marker walk-up via existsSync(CONDUCTOR_API_CONTRACT.md)).
  No re-modification of sess-d's territory; `install-paths.test.ts`
  byte-identical to its post-`3c4e5f4` state. KNOWN — verified by
  full source-read + git log -p.

- **Session E** (parallel-batch-5, already merged) — `Layout.tsx`
  per-field data-mock backfill. NO overlap. KNOWN.

- **Session F** (parallel-batch-5, already merged at HEAD `78bc817`
  via merge commit) — `dispatch-core/src/registry/read.ts`
  caller-controlled recovery semantics. NO overlap with Session H
  territory. Sess-f's REPORT.md format consumed as precedent for
  sess-h's REPORT.md structure (§1-§8 section pattern). KNOWN.

- **No cross-worktree §0 staging observed.** Sess-h operated entirely
  within its worktree; no files outside `~/Desktop/Automata/
  foxworks-worktrees/sess-h-worktree-brittleness` were modified.

### Anti-fabrication

Every factual claim in this entry is one of: (a) a quoted source-
file location verifiable by reading the cited `path:line` at HEAD
`78bc817` or HEAD `83893b0` (this branch's WB1), (b) a Phase 1
grep result captured during scout (six patterns enumerated in
REPORT §3 with reproducible commands), (c) a function-under-test
purity claim verified by tracing the test's act-phase
(`generatePlist` purity verified by reading `plist.ts` import at
`install-plist.test.ts:25`; `spawnRealDaemon` repo-root usage
verified by reading `real-daemon.ts:42-98`), or (d) labeled
MODELED / SPECULATIVE with the basis named (G4, G5, Tier-3
followups #1-#4).

No claim asserts code behavior that did not ship — **this batch
ships zero code changes**. The deliverable is the categorization
artifact (REPORT.md) plus this finding entry. Sess-d's finding #150
§Followups #1 closes by null-result audit confirming the test
surface is already worktree-portable.

WB1 SHA: `83893b0` (pushed to origin/sess-h/worktree-brittleness).
WB2 SHA: pinned at commit time. Per-commit-push discipline observed.
Per-path `git add <path>` (no `git add -A`). Self-check block in
every commit body per CONDUCTOR_API_CONTRACT.md §10.5.
