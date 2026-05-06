# MB-F-DISPATCH-CORE-PERSIST-UNIFIED — Aggregate REPORT (sess-a/core-unification)

**Branch:** `sess-a/core-unification` (cut from `main` HEAD `b3da626`)
**Ladder:** WB1 → WB7 (7 commits, per-WB push)
**Origin:** parallel-batch-3 sess-2 finding #125 §Followups #1 — "core-side
generalization deferred" → ratified for parallel-batch-4 as Sess-A scope.
**Confidence legend:** KNOWN = directly verified this batch (file inspection,
test output). MODELED = inferred from inspected primitives. SPECULATIVE =
flagged concern, not directly verified.

---

## §1 What was shipped

A pure-refactor unification of the registry atomic-write recipe:

- The persist module (`atomic-write.ts` + `read-with-recovery.ts` + barrel
  `index.ts`) **moved from `dispatch-daemon/src/persist/` to
  `dispatch-core/src/persist/`** via `git mv` (rename detection on 3-of-3
  files; history preserved). KNOWN.
- The 4 persist unit tests **moved from `dispatch-daemon/test/unit/` to
  `dispatch-core/test/unit/`** (rename detection on 4-of-4). KNOWN.
- `dispatch-daemon/src/migration/schema-v2.ts` switched its 2 import lines
  from local `../persist/` paths to cross-package `dispatch-core/src/persist/`
  paths — continues the daemon's existing 7+ pre-existing
  `dispatch-core/src/*` deep-import pattern. KNOWN.
- A new `dispatch-core/test/unit/registry-write-byte-stability.test.ts`
  (4 probes) **pinned the on-disk byte output of v1 `writeRegistry`** so the
  WB5 refactor was provably byte-equivalent. KNOWN.
- `dispatch-core/src/registry/write.ts` (v1, the fd CLI write path)
  **refactored to delegate to `writeAtomicJson`** with `{ validate:
  RegistrySchema.parse, fsync: true, retries: 3 }`. Signature preserved;
  fd CLI callers untouched. KNOWN.

End state: ONE atomic-write recipe in tree (`dispatch-core/src/persist/atomic-write.ts`),
used by both v1 (fd CLI: `init.ts`, `send.ts`, `pull.ts`) and v2 (daemon:
`writeRegistryV2`).

---

## §2 Probes ran

### §2.A New probes (WB4)

| Probe | What it pins | Result |
|---|---|---|
| B1 round-trip identity | bytes-on-disk == EXPECTED_BYTES literal (a 24-line JSON snapshot covering 2 sessions with all v2-passthrough fields populated in both null and non-null states) | ✅ green pre-WB5, ✅ green post-WB5 |
| B2 trailing-newline | `bytes.endsWith('\n')` AND NOT `bytes.endsWith('\n\n')` (defends against operator's prior `}\n}\n` corruption signature) | ✅ green pre/post-WB5 |
| B3 2-space indent | `bytes.includes('\n  "version": 1')` AND `bytes.includes('\n  "sessions": {')` | ✅ green pre/post-WB5 |
| B4 fd CLI parity | two writeRegistry calls with same fixture produce byte-identical files AND match EXPECTED_BYTES | ✅ green pre/post-WB5 |

### §2.B Behavior-preservation evidence: existing 7 P-probes for daemon-side wrapper

`packages/dispatch-daemon/test/unit/migration-schema-v2.test.ts` covers the
v2 readRegistryV2 / writeRegistryV2 wrappers with 7 probes (P1-P7). All
green post-WB5 — confirming the daemon-side seam still consumes the
relocated persist helpers identically.

### §2.C Regression net (full gauntlet post-WB5)

| Package | Files | Tests | Result |
|---|---|---|---|
| `dispatch-core` | 9 | 38 | 38 ✅ |
| `dispatch-cli` | 13 | 61 | 61 ✅ |
| `dispatch-daemon` (registry-touching subset: migration, sessions-corruption-recovery, startup-corrupt-registry-recovery, sessions-read/write/state, prompts, handoff) | 8 | 41 | 41 ✅ |
| `dispatch-daemon` (FULL) | 41 | 197 | 196 ✅ / 1 ❌ — *pre-existing, see §G2* |

KNOWN. All counts directly observed in vitest output captured in WB1-WB5
commit messages.

---

## §3 Ladder commits

| WB | Commit | Verb | Subject |
|---|---|---|---|
| WB1 | `7979c82` | refactor | move persist module from dispatch-daemon to dispatch-core |
| WB2 | `3dd9a7d` | refactor | update dispatch-daemon imports to dispatch-core/persist |
| WB3 | `bc6dd8d` | refactor | move persist tests to dispatch-core |
| WB4 | `e8a4c84` | green | byte-stability test for v1 writeRegistry |
| WB5 | `9e28e39` | refactor | v1 writeRegistry delegates to writeAtomicJson |
| WB6 | _this commit_ | refactor | REPORT.md aggregate |
| WB7 | _next commit_ | docs | sess-a finding entry |

Each commit:
- Pushed to `origin/sess-a/core-unification` immediately (per-commit-push
  discipline).
- Single-path `git add` (never `-A`).
- Pre-commit `git status --short` + post-commit `git log -1 --stat`
  recorded in shell history.
- 9-question self-check block in body per CONDUCTOR_API_CONTRACT.md §10.5,
  Q7 territory check answered against actual git status.

---

## §4 What this defends against

KNOWN unless otherwise marked.

- **Durability under power loss**: fsync between write and rename closes
  the gap from prior `writeFile`-without-sync mode. macOS APFS may flush
  data after rename completes; power loss between writeFile-completes
  and the kernel flushing data blocks could leave a renamed-but-zero-
  content file. The post-refactor v1 path now does
  `open → write → handle.sync() → close → rename` (atomic-write.ts:58-68).
- **Transient corrupt-readback recovery**: writeAtomicJson reads the
  target back after rename and re-validates; if parse or validate fails,
  it retries the entire write cycle up to 3 times. Defends against
  filesystem corner cases (different bytes than written) and concurrent
  writers replacing the file between rename + readback.
- **Byte-level regression in v1 `writeRegistry`**: WB4's pinned
  EXPECTED_BYTES literal traps any future change that perturbs JSON
  serialization order, indent depth, or trailing-newline handling.
- **Cross-package drift**: persist module now lives in dispatch-core
  alongside the schema it secures. Future v3 schema changes can extend
  the same persist primitives without forking the recipe.
- **Daemon-side regression at the persist seam**: the 4 daemon-relocated
  persist tests (11 probes) keep their full coverage from the
  dispatch-core test root; vi.mock interception of `node:fs/promises`
  is module-id-keyed and survived the move (FACT-A6 confirmed by the
  fsync + retry tests passing post-move with no path edits).

---

## §5 What this does NOT prevent

KNOWN unless otherwise marked.

- **Concurrent-writer protocol races**: rename is still last-writer-wins.
  fd CLI's writeRegistry + daemon's writeRegistryV2 racing each other can
  still produce a "lost update" where one writer's full registry replaces
  the other's. The new readback + retry NARROWS the corruption window
  but does NOT serialize writers. Sess-C territory; deferred to batch-5
  per operator Q4.
- **v1 read-side recovery**: `dispatch-core/src/registry/read.ts` stays
  bare — bare `readFile` + `JSON.parse` + `safeParse` + rethrow on parse
  failure. No quarantine on the v1 read path. Operator-arbitrated out of
  scope per Phase 2 brief Q3 (v1 gets durability hardening on writes
  only; recovery is v2-specific).
- **Schema evolution**: persist module is schema-agnostic by design
  (caller injects `validate`). Schema changes (v1 → v2 → v3) flow
  through the same helpers without persist-module changes.
- **`recover-sessions-json.mjs` script convergence**: this manual recovery
  script (in `dispatch-daemon/scripts/`) re-implements its own inline
  `writeAtomicJson` (lines 169-181) for the no-runtime-TS / no-zod
  constraint. It documents this divergence intentionally. SPECULATIVE
  followup: a future batch could DRY this against the moved core helper
  if the script's runtime constraints are relaxed.

---

## §6 §G gaps surfaced during execution

### §G1 — `install-paths.test.ts` P3 fails on any worktree (KNOWN, pre-existing)

`packages/dispatch-daemon/test/unit/install-paths.test.ts:35` asserts
`expect(result).toMatch(/foxworks-dispatch$/)` against
`resolveRepoRoot(import.meta.dirname)`. In any worktree (e.g.
`sess-a-core-unification`), the resolved repo root ends with the worktree
name, NOT `foxworks-dispatch`. Verified pre-existing at HEAD `b3da626`
(commit `49f2c2a` last touched line 35; content unchanged across this
batch). ZERO persist coupling — test imports `../../src/install/paths.js`.

**Action**: surface to operator as a worktree-friendliness improvement.
Suggested fix (NOT taken in this batch — out of scope): change the assertion
to `/foxworks-dispatch|sess-[a-z0-9-]+$/` or similar worktree-tolerant
regex, OR weaken to `expect(result).toBe(<computed-from-marker>)` where
the marker location is computed by the same resolveRepoRoot helper used
in production. Could be sess-a follow-up if approved, OR a separate
maintenance ticket.

### §G2 — Identity-validation runs more frequently than pre-refactor (KNOWN, behavior-equivalent)

writeAtomicJson calls `validate(value)` once before mkdir AND `validate(parsed)`
once per readback. With `retries: 3` and a happy-path success, validate
runs exactly TWICE per writeRegistry call (input + first readback);
pre-refactor v1 ran it ONCE. `RegistrySchema.parse` is pure + idempotent —
running it twice produces no side effects, and the registry is small
enough that the double-validate cost is invisible (~µs). Behavior impact:
ZERO (same successful inputs produce same outputs; same failing inputs
throw before any disk touch).

### §G3 — Error-message wording on readback exhaustion (MODELED, low-severity)

If a v1 caller (fd init/send/pull) hits the new readback-retry path AND
fails 3 times, the thrown error message becomes:

`writeAtomicJson at ${target} failed readback after 4 attempts: ${lastErr.message}`

Pre-refactor, this exact scenario could only manifest as the underlying
node:fs error (`ENOSPC`, `EACCES`, etc.). The fd CLI commands don't
pattern-match on writeRegistry error strings (verified at call sites
init.ts:37, send.ts:55, pull.ts:77 — all let the error bubble or
re-throw with their own context). No CLI test asserts the error message
text. Behavior-preserving for happy-path; failure-path wording is new
but not contractually pinned.

### §G4 — `dispatch-core/src/persist/index.ts` barrel kept (operator Q5)

Operator-arbitrated KEEP. Cost: 1 file, 2 re-exports, 10 lines. Benefit:
cheap "import everything" path if/when a future ESM `exports` field
consolidates the public surface. Currently has zero importers (daemon
deep-imports specific files), but this is fine — a barrel doesn't hurt
unused.

### §G5 — `package.json` `exports` field NOT required (KNOWN, retired gap)

Phase 1 §G2 retired this concern; WB1+WB2 confirmed empirically. NodeNext
+ pnpm workspace linkage resolves `dispatch-core/src/persist/atomic-write.js`
without an `exports` field, identical to the existing 7+ deep imports of
`dispatch-core/src/v2/schema.js` etc.

### §G6 — `recover-sessions-json.mjs` standalone (KNOWN, retired gap)

Phase 1 §G9 deferred-check resolved at Phase 2 entry: the script imports
`{ writeFile, readFile, rename, open, mkdir }` from `node:fs/promises`
directly + has its own inline `writeAtomicJson` function. Zero coupling
to the moved persist module. No collateral. SPECULATIVE followup logged
in §5.

### §G7 — Sess-C concurrent-writer race remains open (KNOWN, deferred)

Per operator Q4, Sess-A's refactor is purely additive (fsync + retry, no
protocol change). It NARROWS the race window without changing protocol.
If Sess-C's read-only investigation surfaces a deeper fix (e.g.,
lockfile, staged-write protocol, sequence-number CAS), that lands in
batch-5 — NOT here.

### §G8 — v1 read.ts recovery stays bare (KNOWN, scope fence)

`dispatch-core/src/registry/read.ts` was NOT touched. The persist
module's `readJsonWithRecovery` lives in core after the move, but the
v1 read path does not consume it. Operator-arbitrated; intentional. v2
daemon path is the only consumer, and it opts in via
`opts.onCorrupt: 'quarantine'` at startup-time only (everywhere else
defaults to `'rethrow'`). KNOWN per Phase 2 brief Q3.

### §G9 — vi.mock module-id keying preserved across move (KNOWN, validated)

The 2 dynamic-import persist tests (`persist-atomic-write-fsync.test.ts`,
`persist-atomic-write-retry.test.ts`) use `vi.mock('node:fs/promises', ...)`
followed by `await import('../../src/persist/atomic-write.js')`. Both
ran green from the new dispatch-core/test/unit/ location with the same
relative path. FACT-A6 (Phase 1 §2.D, Phase 2 brief) verified
empirically.

---

## §7 Operator next steps

1. **Review** this REPORT + the WB1-WB7 commit chain on
   `origin/sess-a/core-unification`.
2. **Optional acceptance probe**: spawn a fresh tmux session, run `fd init`
   + `fd send <name> <prompt>` against a tmpdir registry, kill the parent
   process abruptly mid-write (simulating power loss), inspect
   `<registry>.tmp` and `<registry>` for atomicity. Expected: either
   target contains a complete pre-refactor write OR target contains a
   complete post-refactor write — never both, never partial.
3. **Merge** to main when satisfied. No follow-on coordination required
   for Sess-B (orthogonal: dispatch-web FocusedDetailPanel) or Sess-C
   (read-only at time of this REPORT).
4. **§G1 worktree-friendliness fix** (`install-paths.test.ts`): consider
   adding to a maintenance backlog or assigning to a follow-up batch.
   Pre-existed this batch; persist refactor did NOT introduce it.
5. **Sess-C's batch-5 concurrent-writer race fix** (per operator Q4): can
   build on top of this unification — both v1 and v2 now share the same
   recipe surface, so any protocol change (lockfile, sequence numbers,
   etc.) lands in ONE place.

---

## §8 Methodology notes

KNOWN.

- **The persist module was already generic by design.** The move was a
  file-relocation + 2-line import update + 4-line refactor of v1
  `writeRegistry`. Zero architectural redesign. Phase 1 §1.C correctly
  predicted this.
- **fd CLI hardening for free**: by delegating to `writeAtomicJson`,
  fd init/send/pull get fsync + retry without any signature change or
  caller awareness. This is the cleanest possible "additive hardening"
  shape.
- **Behavior-preservation testing via byte snapshots**: locking the
  exact on-disk bytes via a literal constant (`EXPECTED_BYTES`) gave
  the highest-resolution regression trap available — any perturbation
  to JSON.stringify args, indent, newline handling, or key ordering
  surfaces immediately on a single test run. Cheap and decisive.
- **Operator-arbitrated decisions held the scope tight**: the v1 read
  path stays bare; recovery semantics stay v2-specific; concurrent-writer
  races defer to Sess-C; package.json `exports` not introduced.
  Sess-A finished without expanding scope into adjacent territory.

End of REPORT.
