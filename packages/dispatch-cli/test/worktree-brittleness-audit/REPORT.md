# MB-F-WORKTREE-BRITTLENESS-AUDIT — REPORT

Phase 2 aggregate report for the **worktree-brittleness audit** of
`packages/*/test/`. Closes sess-d (parallel-batch-5 finding #150)
§Followups #1.

Branch: `sess-h/worktree-brittleness` (cut from main `78bc817`).
Ladder commits: WB1 REPORT (this file) → WB2 sess-h finding entry.

Mirror of sess-f's `registry-read-recovery/REPORT.md` and sess-d's
in-line-finding-entry conventions, adapted for a **null-result audit**
(no source modified; the audit IS the work; this REPORT is the
artifact).

---

## §1 — Audit scope + methodology

### Origin

Sess-d's finding #150 (parallel-batch-5) addressed a single brittle
assertion in `packages/dispatch-daemon/test/unit/install-paths.test.ts`
P3 (`expect(result).toMatch(/foxworks-dispatch$/)`) — hard-coded the
canonical clone basename, failing in any worktree cut under
`foxworks-worktrees/`. Sess-d's commit `3c4e5f4` replaced the regex
with a marker-walk-up roundtrip assertion (production-mirroring
algorithm using `existsSync(join(current, 'CONDUCTOR_API_CONTRACT.md'))`).

Sess-d §Followups #1 deferred the broader sweep to a separate batch:

> **Audit other tests for worktree-name brittleness** (Tier-3,
> separate batch). Q2 scope-fence prevented this batch from sweeping
> `packages/dispatch-{daemon,web,core}/test/**` for assertions
> matching `/foxworks-dispatch/` or other clone-basename hard-codes.
> A dedicated audit batch should grep the codebase and convert any
> such assertions to roundtrip / property-style.
> *(`sess-d-findings-2026-05-06.md` §Followups #1)*

Parallel-batch-6 Session H is that batch.

### Methodology

Two-pass grep + categorization:

**Pass 1 (pre-Phase-1 brief, operator-curated)**: 99-hit grep of
`foxworks-dispatch` across `packages/*/test/`. Brief categorized hits
into REAL BRITTLENESS CANDIDATES vs INTENTIONAL pre-buckets, listing
two suspect line citations to verify in Phase 1:
  - **FACT-H1** — `packages/dispatch-cli/test/fixtures/real-daemon.ts:45`
    (comment says `// up 4 = .../foxworks-dispatch`; needs source-read
    to determine if logic is actually brittle or just a comment hint).
  - **FACT-H2** — `packages/dispatch-daemon/test/unit/install-plist.test.ts:41,43,44,71,80,83`
    (hardcoded `/Users/op/foxworks-dispatch/...` and
    `/Users/op/.foxworks-dispatch/...` paths; needs source-read to
    determine if these are assertion strings or fixture data).

**Pass 2 (Phase 1 scout, sess-h)**: 6 additional grep patterns beyond
the pre-brief sweep, plus full source-reads of each FACT-H1 / FACT-H2
candidate file plus the function-under-test trace.

### Categorization rules

A line citation is **REAL brittleness** iff:
  - it appears in an `expect(...)` assertion or a path-walk
    termination check, AND
  - the assertion's pass/fail is conditioned on the runtime path
    basename (i.e., would fail in a worktree dir not named exactly
    `foxworks-dispatch`).

A line citation is **INTENTIONAL** iff at least one of:
  - **production-constant**: `~/.foxworks-dispatch/` (operator's
    daemon data dir name; production source-of-truth).
  - **fixture-data**: opaque input string passed to a pure function
    under test, where the function never compares the string against
    real-fs state (the substring `foxworks-dispatch` flows through
    unchanged).
  - **comment-only**: documentation text in a comment block; not load-
    bearing.
  - **REPORT.md / docs**: cross-references in markdown files; not code.
  - **MSW fixture**: mock service worker handler URL paths; mock data,
    not assertions.
  - **path-walk relative-count**: `join(import.meta.dirname, '..',
    '..', ...)` walks a fixed count up; basename-agnostic logic; the
    assertion is never on basename equality.

This categorization rule is the load-bearing artifact of the audit.
Future audits should reference this REPORT before re-walking the
99-hit grep.

---

## §2 — FACT-H1 + FACT-H2 categorization (Phase 1 §1 verbatim)

| file:line | code excerpt | category | basis | proposed action |
|---|---|---|---|---|
| `dispatch-cli/test/fixtures/real-daemon.ts:45` | `// up 4 = .../foxworks-dispatch` | **COMMENT-only stale label** | KNOWN — line 45 is a comment; line 46 is the actual logic, basename-agnostic | none (optional cosmetic deferred — see §5 Followups) |
| `dispatch-cli/test/fixtures/real-daemon.ts:46` (logic; not in FACT-H1) | `const repoRoot = join(import.meta.dirname, '..', '..', '..', '..');` | **NOT REAL brittleness** — relative-count walk-up, basename-agnostic | KNOWN — confirmed worktree marker `CONDUCTOR_API_CONTRACT.md` exists at this worktree's root; logic resolves correctly regardless of basename | none |
| `dispatch-daemon/test/unit/install-plist.test.ts:41` | `'/Users/op/foxworks-dispatch/packages/dispatch-daemon/src/index.ts'` | **INTENTIONAL — fixture data INPUT** | KNOWN — element of `programArguments` array passed to `generatePlist({...})` | none |
| `dispatch-daemon/test/unit/install-plist.test.ts:43` | `stdoutPath: '/Users/op/.foxworks-dispatch/logs/daemon.out.log'` | **INTENTIONAL — fixture data INPUT** | KNOWN — INPUT to `generatePlist`; fake operator-shaped string | none |
| `dispatch-daemon/test/unit/install-plist.test.ts:44` | `stderrPath: '/Users/op/.foxworks-dispatch/logs/daemon.err.log'` | **INTENTIONAL — fixture data INPUT** | KNOWN — same as line 43 | none |
| `dispatch-daemon/test/unit/install-plist.test.ts:71` | `expect(argsBlock![1]).toContain('<string>/Users/op/foxworks-dispatch/.../index.ts</string>')` | **INTENTIONAL — input/output preservation assertion** | KNOWN — asserts the line-41 input string is preserved verbatim in the rendered XML; substring is fixture data flowing through, not derived from real fs | none |
| `dispatch-daemon/test/unit/install-plist.test.ts:80` | `expect(xml).toContain('<string>/Users/op/.foxworks-dispatch/logs/daemon.out.log</string>')` | **INTENTIONAL — preservation assertion** | KNOWN — asserts line-43 input preserved | none |
| `dispatch-daemon/test/unit/install-plist.test.ts:83` | `expect(xml).toContain('<string>/Users/op/.foxworks-dispatch/logs/daemon.err.log</string>')` | **INTENTIONAL — preservation assertion** | KNOWN — asserts line-44 input preserved | none |

### Function-under-test trace (load-bearing for the categorization)

**`generatePlist`** (`packages/dispatch-daemon/src/install/plist.ts`,
imported at `install-plist.test.ts:25`) is a pure XML renderer: takes
`{label, programArguments, stdoutPath, stderrPath}` and returns a
plist XML string. No filesystem access. No comparison against
runtime path basename. The `/Users/op/foxworks-dispatch/...` strings
flow through unchanged from input to rendered output, and the test's
assertion verifies that flow-through. The substring `foxworks-dispatch`
is fixture data; it could be `/Users/foo/bar/...` and the test would
work identically. **NOT REAL brittleness**. KNOWN per source-read +
function-under-test trace.

**`spawnRealDaemon`** (`real-daemon.ts:42-98`) computes `repoRoot`
via `join(import.meta.dirname, '..', '..', '..', '..')` at line 46.
From `packages/dispatch-cli/test/fixtures/real-daemon.ts`, walking
4 levels up lands at the repo root (canonical clone OR worktree dir,
basename varies). The function never compares the resulting path
against any literal — it just uses `repoRoot` as `cwd` for
`spawn('npx', ['tsx', daemonScript])`. **NOT REAL brittleness**.
KNOWN per source-read + spawn-call trace.

---

## §3 — Additional sweep results (Phase 1 §2 verbatim)

Six additional grep patterns run beyond the pre-Phase-1 sweep:

```
grep -rn "Desktop/Automata/foxworks-dispatch" packages/*/test/    → 0 hits
grep -rn "dirname.*foxworks-dispatch|foxworks-dispatch.*dirname" packages/*/test/    → 0 hits
grep -rn "endsWith.*foxworks-dispatch|...basename..." packages/*/test/    → 0 hits
grep -rn "toBe|toEqual|toMatch|toContain.*foxworks-dispatch" packages/*/test/    → 1 substantive hit (workstation, see below)
grep -rn "process\.cwd|cwd\(\)" packages/*/test/    → 0 hits (no workdir-coupled assertions)
grep -rn "\.\./\.\./\.\./\.\.|\.\./\.\./\.\./\.\./\.\." packages/*/test/    → 2 hits (relative-count walk-ups, basename-agnostic)
```

Substantive findings outside FACT-H1 + FACT-H2 territory (informational
only — not in scope to modify):

| file:line | code excerpt | category | basis |
|---|---|---|---|
| `dispatch-workstation/test/unit/http-daemon-client/test_http_daemon_client_class.spec.ts:47` | `expect(String(path)).toMatch(/\.foxworks-dispatch\/token$/);` | **INTENTIONAL — production data-dir constant** (leading dot `\.foxworks-dispatch`) | KNOWN — leading `.` makes this `~/.foxworks-dispatch/token` (operator's daemon data dir, hard-coded by design); line-46 comment confirms intent ("Path varies by host but must end in '.foxworks-dispatch/token'") |
| `dispatch-workstation/test/unit/coarch-t04/read-scope.spec.ts:17,21,27,37,38,41,47,48,51` | `allowed: ['/Users/test/Desktop/foxworks-dispatch']` (and similar) | **INTENTIONAL — fixture data INPUT to pure `checkReadScope`** | KNOWN — full-file read confirmed every reference is INPUT; `/Users/test/` prefix vs operator's real `/Users/joshuatseppich/` confirms fake-fs intent |
| `dispatch-workstation/test/unit/coarch-t04/build-doc-state.spec.ts:45,47` | `repoRoot: '/Users/test/Desktop/foxworks-dispatch'` (fixture config) | **INTENTIONAL — fixture data** (same pattern) | MODELED — same fixture-feeding pattern as read-scope.spec.ts |
| `dispatch-workstation/test/unit/fix-orchestrator-flow/test_build_doc_state_fallback.spec.ts:76,78` | same pattern | **INTENTIONAL — fixture data** | MODELED — same pattern |
| `dispatch-daemon/test/integration/concurrent-writer-race/helpers/spawn-child.ts:27` | `const WORKSPACE_ROOT = resolve(__dirname, '../../../../../..');` | **NOT REAL brittleness** — relative-count walk-up | KNOWN — same shape as `real-daemon.ts:46`; basename-agnostic logic |

dispatch-workstation territory is **out of scope** for sess-h
(territory fence per Phase 2 brief). The three `/Users/test/...`-fixture
test files are categorized here for future-audit reference; no
modification proposed or attempted.

---

## §4 — Null-result conclusion

**Sess-d's commit `3c4e5f4` was the only real test-suite worktree-
basename brittleness in the repo.** Sess-h's audit found zero
additional REAL brittleness candidates within scope.

### 99-hit grep total breakdown

| Bucket | Approx count | Categorization |
|---|---|---|
| Brittle-pattern matches in pre-Phase-1 (FACT-H1 + FACT-H2) | 5 lines (1 in real-daemon.ts; 6 in install-plist.test.ts grouped as 4 fixture-input + 2 preservation-assertions; sess-d's already-fixed P3 NOT in this 99-hit grep against current HEAD) | All audit-confirmed INTENTIONAL (§2) |
| Production-constant `.foxworks-dispatch/` data-dir references (workstation + cli + daemon test files) | ~25 hits | INTENTIONAL — operator's daemon data dir, hard-coded by design |
| Comment-text references (`migration-orchestrator.test.ts`, `recover-sessions-json.test.ts`, `auth.test.ts`, `server.ts`, `real-daemon.ts:9-19,45`, etc.) | ~15 hits | INTENTIONAL — comment documentation, not load-bearing |
| REPORT.md cross-references (registry-read-recovery, registry-write-byte-stability, concurrent-writer-race, sessions-corruption-recovery, mb-t08-onboarding, fix-92/94 verification, etc.) | ~30 hits | INTENTIONAL — markdown documentation, not code |
| MSW handler fixture URL paths (`dispatch-web/test/msw/handlers.ts`) | 2 hits | INTENTIONAL — mock service worker fixture data |
| dispatch-workstation `/Users/test/...` fixture-data inputs to pure functions (coarch-t04 + fix-orchestrator-flow) | ~13 hits | INTENTIONAL — fake-fs fixture data; `/Users/test/` prefix is operator-distinct |
| Already-fixed in sess-d's `install-paths.test.ts` (P4 production-error-string regex `/foxworks-dispatch/i` + `/run.+from inside.+foxworks-dispatch/i`) | ~3 hits | INTENTIONAL — P4 tests the production ERROR STRING (operator-helpful message), not path semantics; works in any worktree |
| Comment / docstring header in `recover-sessions-json.test.ts` and `migration-orchestrator.test.ts` and `auth.test.ts` | ~6 hits | INTENTIONAL — comment-text only |

Total ≈ 99. All categorized INTENTIONAL or NOT REAL brittleness.
**Net result: zero REAL brittleness candidates in scope.**

### Codebase has internalized the lesson

Where it matters, the test surface uses portable patterns:
- `homedir() + path.join(...)` for operator-data-dir paths
  (`real-daemon.ts:89`, dispatch-workstation probe-* files for
  `~/.foxworks-dispatch/token`).
- `import.meta.dirname` + relative `..` for repo-relative path-walk
  (`real-daemon.ts:46`, `spawn-child.ts:27`).
- Marker walk-up via `existsSync('CONDUCTOR_API_CONTRACT.md')` for
  production-mirroring assertions (sess-d's `install-paths.test.ts:36-49`).
- Static fake-fs strings (`/Users/op/...`, `/Users/test/...`) for
  pure-function fixture inputs.

Sess-d's fix at `install-paths.test.ts` P3 was the structural lesson;
the rest of the test surface had already adopted portable patterns
before that fix. Multi-batch flagging (sess-2 §G3 → sess-a §Followups
#3 → sess-c §G11 → sess-d → sess-h) was on a single brittleness, not
on a pattern of brittleness.

---

## §5 — Methodology lessons

### Lesson 1 — Null-result audit is a valid cairn deliverable

The audit IS the work; REPORT.md is the artifact. Source unchanged
when there is nothing to fix. This REPORT documents the categorization
rules (§1) and the 99-hit breakdown (§4) so future audits skip
the grep walk and reference categorization rules directly. KNOWN.

### Lesson 2 — Brief pre-categorization needs function-under-test reading depth

Phase 1 brief stated FACT-H1 and FACT-H2 were "REAL BRITTLENESS
CANDIDATES (your scope to verify and fix)". Phase 1 scout (full
source-reads + function-under-test trace) found both INTENTIONAL:
  - `real-daemon.ts:45` is a comment, not an assertion. Line 46
    logic is basename-agnostic.
  - `install-plist.test.ts` feeds `/Users/op/foxworks-dispatch/...`
    as opaque input strings to a pure XML generator; the assertions
    are input/output preservation, never compared against real-fs
    state.

This is a **brief-drafting failure** caught by the Phase 1 scout
pattern. Brief-author categorized by line-citation pattern matching
(`/Users/op/foxworks-dispatch` looks brittle → flag as REAL); did not
trace the function under test. Phase 1 scout's full-source-read +
function-under-test trace caught the drafting failure before any
code shipped.

**Methodology adaptation banked**: brief pre-categorization for
worktree-brittleness (and similar pattern-match audits) needs
function-under-test reading depth, not just line-citation pattern
matching. Pure-function-fixture-data is the most common false
positive — strings that *look* like real paths but flow through
opaque pure functions.

KNOWN — verified by Phase 1 source-reads of both files.

### Lesson 3 — Multi-batch latency for cheap fixes is real

Sess-d's commit `3c4e5f4` fixed ~25 lines in a single test file. The
fix took 1 batch of LLM + operator attention. The brittleness was
flagged in 3 prior batches before that fix shipped (sess-2 §G3,
sess-a §Followups #3, sess-c §G11). Each flagging session was
operating under a scope-fence that excluded the inline fix.

Sess-h closes the followup #1 audit with **zero source changes** —
audit confirming the suite is already portable. The followup
turn-around for an *audit* (which can be cheaply concluded with
null result) should not be confused with the followup turn-around
for a *fix* (which still pays the multi-batch latency cost on
strict scope-fence territory).

KNOWN — sess-d finding entry §"Methodology lesson" documented the
multi-batch latency pattern; sess-h's null result confirms the audit
side of the pattern.

### Lesson 4 — Cosmetic improvements declined as scope-creep

Phase 1 §3 surfaced two optional improvements:
  - **Optional A**: update stale comment at `real-daemon.ts:45`
    (1-line change).
  - **Optional B**: port `real-daemon.ts:46` repoRoot to marker walk-
    up via `existsSync(CONDUCTOR_API_CONTRACT.md)` for stylistic
    consistency with sess-d's precedent (~12-line change).

Operator arbitrated Q-H1=a (null-result close-out). H-Q1=a's literal
scope is "fix all genuine brittleness"; with zero candidates, the
arbitration trivially holds. Optional A + B are stylistic-consistency
work, not defect-fix work, and were declined as scope-creep beyond
H-Q1=a. Available as separate Tier-3 followup tickets (§7).

KNOWN — operator decision recorded in Phase 2 brief.

---

## §6 — §G gaps surfaced (informational, not actionable this batch)

- **G1 — dispatch-workstation `/Users/test/Desktop/foxworks-dispatch`
  fixture data** (read-scope.spec.ts, build-doc-state.spec.ts,
  fix-orchestrator-flow). 13+ instances. All audit-confirmed
  INTENTIONAL (fixture data fed to pure `checkReadScope`-shape
  functions; `/Users/test/` prefix vs operator's real home confirms
  fake-fs intent). Out of territory for sess-h. Reported here for
  future-audit reference.

- **G2 — `spawn-child.ts:27` 6× relative walk-up** in
  `dispatch-daemon/test/integration/concurrent-writer-race/helpers/`.
  Same shape as `real-daemon.ts:46`; basename-agnostic and not
  brittleness, but file-relocation-fragile. Out of territory (sess-c
  probes; Session G owns probe-01/03 modifications). Filed for
  visibility.

- **G3 — `install-plist.test.ts` could benefit from a one-line
  fixture-intent comment** near line 35 stating "fake operator-shaped
  paths; generatePlist is pure". Optional clarification to prevent
  future audit confusion (the operator-shaped form invites a
  drafting-failure-by-pattern-match like the one Phase 1 caught).
  Not in scope this batch; available as separate Tier-3 followup.

- **G4 — `checkReadScope` production source NOT read** by sess-h
  (territory-cautious; out of scope). Categorization of
  dispatch-workstation `coarch-t04/*.spec.ts` files as INTENTIONAL
  rests on MODELED-confidence assertion of `checkReadScope` purity
  based on probe behavior, not on direct source-read. If
  `checkReadScope` were to call into real-fs scope checks, there
  *could* be hidden brittleness — but probes pass on main HEAD
  `78bc817` which makes that scenario unlikely.

- **G5 — REPORT.md cross-references not re-read** by sess-h
  (registry-{read,write}-recovery|byte-stability/REPORT.md,
  concurrent-writer-race/REPORT.md, sessions-corruption-recovery/
  REPORT.md, etc.). Pre-categorized as INTENTIONAL by operator brief;
  sess-h spot-checked grep output (saw "REPORT.md" only in line
  paths) but did not full-read each. KNOWN per pre-categorization;
  MODELED per spot-check.

---

## §7 — Operator next steps

1. **Review this REPORT** + WB2 sess-h finding entry.
2. **Merge `sess-h/worktree-brittleness` → main**. No source changes
   ship; net delta is 2 new docs files (this REPORT + sess-h finding
   entry). No regression risk.
3. **Optional follow-up tickets** (deferred; available if operator
   wants to file as separate Tier-3 work):
   - **MB-F-CLI-FIXTURE-REAL-DAEMON-COMMENT-CLEANUP** (Tier-3
     SPECULATIVE) — Optional A from Phase 1 §3. Update
     `real-daemon.ts:45` comment from `// up 4 = .../foxworks-dispatch`
     to `// up 4 = repo root (canonical clone OR worktree dir, basename
     varies)`. 1-line change. Cosmetic only; no defect.
   - **MB-F-CLI-FIXTURE-REAL-DAEMON-MARKER-WALKUP** (Tier-3
     SPECULATIVE) — Optional B from Phase 1 §3. Port
     `real-daemon.ts:46` repoRoot to marker walk-up via
     `existsSync(join(current, 'CONDUCTOR_API_CONTRACT.md'))`,
     mirroring sess-d's `install-paths.test.ts` P3 algorithm. ~12-line
     diff. Defends against hypothetical future fixture relocation;
     stylistic consistency with sess-d precedent.
   - **MB-F-DAEMON-INSTALL-PLIST-FIXTURE-INTENT-COMMENT** (Tier-3
     SPECULATIVE) — G3 from §6. One-line comment near
     `install-plist.test.ts:35` clarifying "fake operator-shaped
     paths; generatePlist is pure" for future audit clarity. Trivial.
4. **Future audit batches reference this REPORT** to skip the
   99-hit grep walk. The categorization rules in §1 + the bucket
   breakdown in §4 are reusable for any future "pattern looks
   brittle" sweep.

No production source modified. No test source modified. Sess-d's
finding #150 §Followups #1 closes by null-result audit confirming
the test surface is already worktree-portable.

---

## §8 — Anti-fabrication

Every factual claim in this REPORT is one of:
  - (a) a quoted source-file location verifiable by reading the cited
    `path:line` at HEAD `78bc817` (or earlier HEADs cited inline);
  - (b) a grep result captured during Phase 1 scout (six patterns
    enumerated in §3; commands reproducible);
  - (c) a function-under-test purity claim verified by tracing the
    test's act-phase (§2 `generatePlist` purity verified by reading
    `packages/dispatch-daemon/src/install/plist.ts`'s import at
    `install-plist.test.ts:25`; `spawnRealDaemon` repo-root usage
    verified by reading `real-daemon.ts:42-98`); or
  - (d) labeled MODELED / SPECULATIVE with the basis named (G2 G4 G5
    in §6; Tier-3 followups in §7).

No claim asserts code behavior that did not ship — **this batch ships
zero code changes**. The deliverable is the categorization rules in
§1, the FACT-H1/H2 audit results in §2, the additional-sweep results
in §3, the null-result conclusion in §4, the methodology lessons in
§5, the §G gaps in §6, and the followups in §7.

WB1 SHA pinned in WB2 sess-h finding entry. Per-commit-push discipline
observed. Per-path `git add <path>` (no `git add -A`). Self-check block
in commit body per CONDUCTOR_API_CONTRACT.md §10.5. Confidence labels
(KNOWN / MODELED / SPECULATIVE) on every factual claim above.

**End of REPORT.**
