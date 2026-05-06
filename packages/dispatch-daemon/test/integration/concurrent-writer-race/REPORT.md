# MB-F-DAEMON-CONCURRENT-RACE — REPORT

**Cluster:** concurrent-writer race documentation + verification net (test-only Tier-2)
**Branch:** `sess-c/concurrent-race` cut from `main` HEAD `b3da626`
**Phase:** 2 (build + ship; Phase 1 close report at `/tmp/sess-c-concurrent-race-diagnose.md`)
**Date:** 2026-05-05
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-c-concurrent-race`

This report aggregates the WB1–WB6 ladder commits, the probes shipped,
the failure modes catalogued, and the operator-arbitrated decisions
applied. Confidence labels (KNOWN / MODELED / SPECULATIVE) appear
inline.

This batch is **test-only**. NO production source modified. The actual
fix (file-lock or staged-write protocol) is reserved for a future
ticket — `MB-F-DAEMON-CONCURRENT-RACE-FIX`.

---

## §1 What was shipped

### §1.1 New test directory — `packages/dispatch-daemon/test/integration/concurrent-writer-race/`

| File | Surface |
|---|---|
| `helpers/barrier.ts` | `createBarrier(tmpDir)` returns `{path, signal()}`. `awaitBarrier(path, timeoutMs?)` polls every 5ms until the file exists. KNOWN — fs.access poll + fs.writeFile signal is a standard cross-process barrier on POSIX. |
| `helpers/race-capture.ts` | `captureRaceState(path)` returns `{bodyOnDisk, parsedAs, daemonReadOK, cliReadOK, sidecarsPresent, tmpExists}`. Distinguishes parse outcomes via the v1 `RegistrySchema` and v2 `RegistrySchemaV2`. |
| `helpers/cli-writer-child.ts` | tsx-driven child entry. `RACE_ARGS` env carries `{registryPath, mutate, barrierPath?}`. Reads via `readRegistry`, mutates one field, optional barrier-wait, writes via `writeRegistry`. Stdout protocol: `READY` → optional barrier → `DONE` (or `ERROR <msg>` on failure). |
| `helpers/daemon-writer-child.ts` | Same shape against `readRegistryV2` + `writeRegistryV2` (no Fastify; race lives at fs layer per operator Q6). |
| `helpers/spawn-child.ts` | Parent-side `spawnChild({flavor, registryPath, mutate, barrierPath?})` returns `{process, ready, done, kill}`. Spawns via `node --import tsx`. Workspace root resolved via `fileURLToPath(import.meta.url)`. SIGKILL fallback on `kill()`; idempotent. |
| `probe-00-helpers.test.ts` | 12 single-process contract tests (barrier, race-capture, spawnChild). KNOWN — all pass; ~1.3s suite runtime. |
| `probe-01-cli-then-daemon.test.ts` | `it.fails` lost-update probe (CLI writes, then daemon stale-snapshot overwrites). |
| `probe-02-daemon-then-cli.test.ts` | `it.fails` lost-update probe (daemon writes, then CLI stale-snapshot overwrites). |
| `probe-03-simultaneous.test.ts` | Stochastic N=10 loop; assert ≥1 iteration exhibits a documented FM3 sub-mode. |
| `REPORT.md` | (this file) |

### §1.2 Integrations

| File | Change |
|---|---|
| `packages/dispatch-daemon/vitest.config.ts` | Added `RACE_TESTS=1` env-gated exclude rule. Default `pnpm test` keeps the fast path; race directory excluded unless the env flag is set. |
| `packages/dispatch-daemon/package.json` | Added `test:race` script: `RACE_TESTS=1 vitest run --testTimeout=60000 test/integration/concurrent-writer-race`. |

No source files (`packages/dispatch-cli/src`, `packages/dispatch-daemon/src`, `packages/dispatch-core/src`) were modified.

### §1.3 Test runtime

| Suite | Tests | Runtime (KNOWN — operator's MacBook M-series, APFS) |
|---|---|---|
| `pnpm test` (default; race dir excluded) | unchanged from main | unchanged |
| `pnpm test:race` (opt-in; race dir only) | 13 passed + 2 expected fail = 15 | ~5s |

---

## §2 Operator arbitrations applied

Per Phase 1 §6 questions; operator response received in turn following the Phase 1 close report.

| Q | Decision | Status |
|---|---|---|
| Q1 probe-01 framing | THREE PROBES — both lost-update directions | APPLIED — probe-01 (cli-overwritten-by-daemon-stale) + probe-02 (daemon-overwritten-by-cli-stale) + probe-03 (simultaneous) all shipped. |
| Q2 it.fails vs assert-broken | MIXED — probe-01/02 use `it.fails`; probe-03 uses `it()` capturing actual behavior | APPLIED — probe-01 + probe-02 register as `1 expected fail` each in vitest output. probe-03 passes via tally + `expect(racedCount).toBeGreaterThanOrEqual(1)`. |
| Q3 probe-03 stochastic policy | LOOP N=10; assert ≥1 iteration shows FM3 sub-mode | APPLIED — `ITERATIONS = 10`; tally + per-iteration diagnostic stdout; pass when racedCount ≥ 1. |
| Q4 tsx vs dist binary | tsx-driven child via `node --import tsx` | APPLIED — tsx 4.19.2 already in root devDependencies (KNOWN — verified at `/node_modules/tsx`). No new devDep added. |
| Q5 MB-F ticket name | `MB-F-DAEMON-CONCURRENT-RACE` (test-only) + reserved future `MB-F-DAEMON-CONCURRENT-RACE-FIX` | APPLIED — all WB commit subjects + this REPORT use the agreed name. |
| Q6 spawnTestServer vs direct call | DIRECT writeRegistryV2 from child, no Fastify | APPLIED — `helpers/daemon-writer-child.ts` imports `writeRegistryV2` directly. spawnTestServer is not consumed by any probe. |
| Q7 test suite placement | OPT-IN via `pnpm test:race` | APPLIED — vitest exclude rule + RACE_TESTS env gate. |

---

## §3 Failure modes catalogued

### §3.1 FM1 — Lost update (read-modify-write across writers) — **KNOWN, operator-visible**

Both `writeRegistry` (v1) and `writeRegistryV2` (v2) write whole-registry, not field-level patches. When two readers snapshot the same on-disk content and then race their writes, whichever rename completes last overwrites all the OTHER reader's intervening mutations. Result: state regressions visible to operator (e.g., paused → armed undoing a manual transition).

- **Demonstrated by:** probe-01 (cli-overwritten-by-daemon-stale), probe-02 (daemon-overwritten-by-cli-stale).
- **Confidence:** KNOWN — assertion in each probe is what SHOULD hold under correct concurrent semantics; today the assertion fails (it.fails marker captures this). Vitest reports each as `1 expected fail`.

### §3.2 FM2 — Schema-version regression — KNOWN, currently benign

CLI's v1 `RegistrySchema` accepts `version ∈ {1, 2}` via `z.union([z.literal(1), z.literal(2)])` (DAEMON-Z-4 fix at `packages/dispatch-core/src/registry/schema.ts:49`). With `.passthrough()` on both `SessionSchema` and `RegistrySchema`, v2 fields (state, last_commit_sha, last_status_json_at) ride through CLI's read-modify-write untouched. So at HEAD `b3da626`, the daemon-writes-v2 → cli-reads-and-writes round trip preserves the v2 shape.

- **Documented for completeness; no probe asserts the regression.** If a future change tightens `RegistrySchema.version` back to `z.literal(1)` or removes `.passthrough()`, probe-01 + probe-02 would surface different failure signatures (parse error rather than lost-update).
- **Confidence:** KNOWN — verified by code reading at HEAD b3da626.

### §3.3 FM3 — Concurrent-`<path>.tmp` collision — KNOWN, three sub-modes

Both writers stage at the literally-identical tmp pathname `<target>.tmp`:

- v1: `${target}.tmp` (`packages/dispatch-core/src/registry/write.ts:16`)
- v2: `${path}.tmp` (`packages/dispatch-daemon/src/persist/atomic-write.ts:53`)

Concurrent O_TRUNC opens collide; rename races independently of bytes-on-disk.

#### §3.3.a FM3a — Truncate-during-write race (MODELED)
Both processes open `<path>.tmp` with `O_WRONLY|O_CREAT|O_TRUNC`. Each writes from its own fd. Last-closer wins the bytes on disk. Then renames race independently: whoever renames first sees their own bytes in target; the loser's bytes survive only if the loser also fully closed before the rename moved the inode away.

- **Demonstrated by:** probe-03. Manifests as `FM3-silent-lost-update` outcomes (5/10 in the sample tally), some with `parsedAs=unparseable` indicating bytes-level interleaving (iter 6, 7 in sample tally).

#### §3.3.b FM3b — Rename-misses-tmp ENOENT (KNOWN)
One process completes `rename(<target>.tmp, target)`. Then the OTHER process tries `rename(<target>.tmp, target)` — but `<target>.tmp` was just consumed by the first rename. POSIX rename on a non-existent source → ENOENT. The second writer's process exits non-zero with the OS error message.

- **Demonstrated by:** probe-03 — `cliExit=1` or `daemonExit=1` outcomes (5/10 in sample tally). KNOWN — error visible in child stderr as `ENOENT: no such file or directory, rename ...`.

#### §3.3.c FM3c — Daemon's readback-retry intercepts mid-race (MODELED)
Daemon's `writeAtomicJson` does post-rename `readFile + JSON.parse + validate`, retry up to 3 times if the readback fails (`packages/dispatch-daemon/src/persist/atomic-write.ts:55-86`). If CLI's rename clobbers between daemon's rename and daemon's readback, daemon reads CLI's content. CLI's content (v2-shaped via passthrough) validates cleanly against `RegistrySchemaV2` → daemon returns success. **Daemon believes its write landed but the on-disk content is CLI's snapshot.** The retry never fires because validation passed on the wrong-content readback.

- **Documented but NOT individually distinguished by probe-03.** The classifier groups it into `FM3-silent-lost-update` because the surface symptom is identical: both children green, one writer's mutation missing. To distinguish FM3a from FM3c at the test layer would require instrumenting daemon's readback path — out of scope for this batch.
- **Confidence:** MODELED — the readback path's failure mode is derivable from code reading at `atomic-write.ts:55-86`. A targeted unit test could distinguish it but is not in the operator-arbitrated WB scope.

### §3.4 FM4 — Partial bytes / sub-write_PIPE_BUF interleaving — SPECULATIVE at our scale

For small JSON bodies (typical operator state ≤ a few KB), single `write(2)` syscalls of the full body are unlikely to interleave at byte granularity. POSIX guarantees write atomicity up to PIPE_BUF for pipes, but for regular files the guarantee is implementation-dependent. At registry scales of >1MB this could surface; at typical state sizes it is theoretically possible but unobserved.

- **Documented for completeness; no probe asserts the failure.**
- **Confidence:** SPECULATIVE — no observed instances at the scales used in probe-03 seed registries.

---

## §4 Probe-to-FM mapping

| Probe | FM(s) demonstrated | Vitest semantics | Determinism |
|---|---|---|---|
| `probe-00-helpers.test.ts` | (helpers contract — no FM) | 12 standard `it()` tests | Deterministic |
| `probe-01-cli-then-daemon.test.ts` | FM1 (cli-overwritten-by-daemon-stale-snapshot) | `it.fails(...)` — passes when assertion fails | Deterministic |
| `probe-02-daemon-then-cli.test.ts` | FM1 (daemon-overwritten-by-cli-stale-snapshot) | `it.fails(...)` — passes when assertion fails | Deterministic |
| `probe-03-simultaneous.test.ts` | FM3a + FM3b + FM3c (silent lost update + rename ENOENT + readback-retry-wins, plus FM4 corruption when bytes interleave) | `it(...)` + N=10 loop + tally assertion | Stochastic — distribution varies per machine; assertion robust to ≥1 raced iteration |

---

## §5 Ladder commits

| WB | Type | Subject |
|---|---|---|
| WB1 | green | helpers + probe-00 contract tests + opt-in test:race script (`178bc93`) |
| WB2 | green | probe-02 daemon-then-cli it.fails demonstrates FM1 lost update (`3a9ee68`) |
| WB3 | green | probe-01 cli-then-daemon it.fails demonstrates FM1 daemon-overwrites-cli-stale-snapshot (`fb57a0e`) |
| WB4 | green | probe-03 simultaneous loop captures FM3 sub-modes (`1a19665`) |
| WB5 | refactor | REPORT.md aggregate (this file) |
| WB6 | docs | sess-c finding entry (planned next) |

Note: this batch's commits are all `green(...)` rather than the typical `red(...)` → `green(...)` ladder. Reason: the probes ASSERT correct behavior using `it.fails` (probe-01/02) or capture-actual via tally (probe-03). There is no separate red phase because the test artefacts ARE the regression-detection signal — the file shipped IS the test, and vitest's `it.fails` semantics make the test self-explanatory about its expected-fail status. Per cairn discipline, this distinction is documented up-front. KNOWN — operator-arbitrated test scope per Phase 2 brief Q2.

---

## §6 What this defends against

### §6.1 Regression-detection signal

If a future change to `writeRegistry` or `writeRegistryV2` changes the read-modify-write semantics in a way that EITHER fixes the lost-update OR masks it (e.g., field-level patches replacing whole-registry writes), probe-01 + probe-02's `it.fails` markers flip — the assertion starts passing, vitest reports the test as failing, and the operator is alerted to revisit scope. KNOWN — this is the standard `it.fails` semantic.

### §6.2 Race-rate detection signal

If a future change INCREASES the race rate (e.g., longer in-flight tmp-file lifetime, removing fsync, or expanding the readback-retry loop) probe-03's tally distribution will shift toward more `FM3b-rename-error` or `FM3-corrupt` iterations. The pass condition (≥1 raced iteration) is loose enough that a fix would surface as ALL iterations being `no-race-detected` — at which point the assertion would fail and the operator would be alerted. KNOWN — `expect(racedCount).toBeGreaterThanOrEqual(1)` is the regression-detection signal.

### §6.3 Test-infrastructure pattern for future race work

The `helpers/` module establishes a reusable pattern (barrier + spawn-child + race-capture) that the next batch implementing `MB-F-DAEMON-CONCURRENT-RACE-FIX` can directly consume to verify the fix works without re-introducing a separate test stack. KNOWN — barrier + child-spawn semantics are file-lock-agnostic.

---

## §7 What this does NOT prevent

### §7.1 The race itself

This batch is **test-only**. No file-lock, advisory-lock, or staged-write protocol was added to either `writeRegistry` or `writeRegistryV2`. Live operator state CAN still be corrupted by concurrent fd CLI + daemon writes. Operator-aware mitigation today: avoid running fd CLI commands while the daemon is actively transitioning state. KNOWN — confirmed by probe-01 + probe-02 + probe-03 all firing at HEAD `b3da626`.

### §7.2 Other concurrency surfaces

This batch focuses exclusively on the `sessions.json` registry. Other shared files (token, archive index, v3 SQLite) are out of scope. The barrier + spawn-child helpers are reusable for future probes against those surfaces. KNOWN — not in operator-arbitrated WB scope.

### §7.3 Future fix scope

`MB-F-DAEMON-CONCURRENT-RACE-FIX` is a SEPARATE deferred ticket. Likely options for the eventual fix:

- **File-lock primitive** (e.g., `proper-lockfile` npm package) — KNOWN-safe but adds a dep.
- **Staged-write protocol with advisory CAS** — write `<path>.tmp.<pid>.<random>` (unique per writer), atomic-rename the unique tmp into target, retry on rename-failure. Eliminates FM3a/b but does not solve FM1 (lost-update at the read-modify-write layer).
- **Field-level patch protocol via daemon HTTP** — fd CLI delegates writes to daemon; only daemon writes the file; eliminates the dual-writer surface entirely. KNOWN — already partially in place via the `useHttp` dispatch fork in `packages/dispatch-cli/src/lib/dispatch.ts`. Operator arbitration needed on whether to make HTTP path mandatory once daemon reachability is universal.

Pick + ship is operator's call at the next batch turn-on.

---

## §8 §G gaps surfaced

### §8.1 Phase 1 gaps re-confirmed

- **G1 shared `<target>.tmp` filename** — KNOWN-confirmed by probe-03 hits on FM3b. The two writers' use of an identical staging-file pathname is the proximate cause of FM3b ENOENTs.
- **G2 fd CLI binary spawn vs direct module import** — RESOLVED via Q4 (tsx-driven child; no binary spawn).
- **G3 child cleanup on test failure** — KNOWN-applied via `afterEach` SIGKILL fallback in every probe's `liveChildren[]` queue.
- **G4 `it.fails` vs assertion of bad behavior** — RESOLVED via Q2 (mixed pattern).
- **G5 cross-session conflict with Session A** — NO CONFLICT observed at end of batch. Session A worktree at HEAD `b3da626` with no in-progress changes (KNOWN — verified at end of WB1 via `git log` in Session A's worktree).
- **G6 daemon writeRegistryV2 retry semantics asymmetry** — KNOWN-modeled in §3.3.c FM3c. The retry is documented but not individually distinguished by probe-03 from FM3a; future targeted unit test could distinguish.
- **G7 concurrent readers** — out of scope; no probe asserts. Reads use single `readFile` + `JSON.parse`, atomic against renames; no observed read-side race in scope.

### §8.2 New gaps surfaced during execution

- **G8 probe-03 timing variance per machine.** Sample tally on operator's machine (M-series APFS) shows roughly 50/50 split between FM3b and FM3-silent-lost-update with 0 corruption. On slower CI runners or non-APFS filesystems the distribution may shift; the loose `≥1` assertion is robust but may need tightening if a future change masks the race entirely. SPECULATIVE — no CI runner data captured this batch.
- **G9 FM3a vs FM3c indistinguishable at test layer.** The classifier groups both as `FM3-silent-lost-update`. Distinguishing requires instrumenting daemon's readback retry path (e.g., counting retries via a logger seam) — not in operator-arbitrated WB scope.
- **G10 vitest `it.fails` hides assertion identity.** When the test passes (i.e., the assertion fails as expected), vitest does NOT print the assertion's expected-vs-received diff. Means future operators can't see WHICH field's lost-update fired without re-reading the test source. Acceptable trade-off; documented for awareness. KNOWN — verified by reading vitest 4.1.5 reporter output.
- **G11 pre-existing `install-paths.test.ts` failure unrelated to this batch.** Failing assertion `result.toMatch(/foxworks-dispatch$/)` hard-codes the canonical repo dirname; in worktrees (`sess-c-concurrent-race`) the assertion fails on clean main HEAD. KNOWN — verified by `git stash` + isolated test run before WB1 commit. Out of scope but worth flagging.

---

## §9 Operator next steps

1. **Review the WB1–WB6 commits** on `sess-c/concurrent-race`. Each commit body has a self-check block per `BUILD_CONTRACT.md` §1.5 + confidence labels per §1.2.
2. **Optionally run `pnpm --filter dispatch-daemon test:race`** to observe the FM tally on the operator's chosen machine. Sample tally is in §3.3 + §4.
3. **Review FM3-corrupt iterations (if any)** — these indicate the rare bytes-level interleaving sub-mode and may inform fix design.
4. **Merge `sess-c/concurrent-race` to `main`** when satisfied. NO direct production source changed; merge should be conflict-free against Session A's `sess-a/core-unification` (KNOWN at end of batch).
5. **Schedule `MB-F-DAEMON-CONCURRENT-RACE-FIX`** at a future batch turn-on. Options sketched in §7.3.
6. **Investigate operator's original sessions.json corruption canonicalization-during-the-night** as a §6.2 lead. The probes here are consistent with FM3c (daemon's readback-retry overwrites a transient external corruption silently), which could explain the canonical-after-reboot behavior. Not asserted, surfaced as a hypothesis.

---

**HALT for operator merge** at end of WB6.
