# MB-F-DAEMON-REGISTRY-FIX — REPORT

**Cluster:** sessions.json corruption fix + defensive write hardening
**Branch:** `sess-2/daemon-registry-fix` cut from `main` HEAD `c7c1a3a`
**Phase:** 2 (build + ship)
**Date:** 2026-05-06
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-2-daemon-registry-fix`

This report aggregates the WB1-WB7 ladder commits, the probes shipped,
the evidence chain, and the specific failure mode each WB defends
against. Confidence labels (KNOWN / MODELED / SPECULATIVE) appear
inline.

---

## §1 What was shipped

### §1.1 New module — `packages/dispatch-daemon/src/persist/`

| File | Surface |
|---|---|
| `atomic-write.ts` | `writeAtomicJson<T>(path, value, opts?)` — Zod-validate FIRST → mkdir-p → open + write + fsync + close → rename → readback + parse + retry-from-input (default 3 retries). Generic over `T`. |
| `read-with-recovery.ts` | `readJsonWithRecovery<T>(path, opts)` — readFile → JSON.parse → validate → on corrupt: `'rethrow'` (default) or `'quarantine'` (rename → `<path>.corrupt-<ISO-timestamp>` + writeAtomicJson empty + return empty + log ERROR). ENOENT → returns `emptyValue` without quarantining. |
| `index.ts` | Barrel. |

### §1.2 Integrations

| File | Change |
|---|---|
| `src/migration/schema-v2.ts` | `writeRegistryV2` + `readRegistryV2` are now thin wrappers around the persist module. WB6 refactor — behavior-preserving. New `ReadRegistryV2Opts {onCorrupt, logger}` exposed for callers that opt into recovery. |
| `src/lifecycle/startup.ts` | Initial registry read opts into `{onCorrupt: 'quarantine', logger: app.log}`. New `StartupOpts.recoveryHook` observation seam fires alongside the ERROR-level Pino emit. |
| `test/fixtures/server.ts` | `SpawnTestServerOpts.recoveryHook` forwards into `StartupOpts.recoveryHook`. |

### §1.3 Manual-recovery script — `packages/dispatch-daemon/scripts/recover-sessions-json.mjs`

Self-contained .mjs (no runtime TypeScript / zod dep). Recovery
strategies in order: parse-as-is → trim trailing whitespace + retry
→ drop one trailing `}` + retry. Backup written via `writeFile(sidecar, raw)`
BEFORE any in-place rewrite. Atomic write recipe duplicates
`src/persist/atomic-write.ts` because the script must run via plain
`node` without tsx (Phase 2 brief requirement).

CLI:

```
node scripts/recover-sessions-json.mjs --in <PATH> [--out <PATH>] [--dry-run] [--backup-suffix <SUFFIX>]
```

Exit codes: 0 (no work or repair done) / 1 (unrecoverable or
`--dry-run` reports work) / 2 (argv or IO error).

---

## §2 Probes ran (KNOWN unless labeled otherwise)

19 new probes across 7 files; all KNOWN-pass on the worktree at HEAD
of `sess-2/daemon-registry-fix`.

### §2.1 Unit — `packages/dispatch-daemon/test/unit/`

| File | Probes | Result |
|---|---|---|
| `persist-atomic-write.test.ts` | P1 round-trip, P2 validate-fail-no-disk-touch, P3 atomic-no-tmp-residue | 3/3 KNOWN-pass |
| `persist-atomic-write-fsync.test.ts` | P1 write→sync→close→rename ordering, P2 `fsync:false` skips sync | 2/2 KNOWN-pass |
| `persist-atomic-write-retry.test.ts` | P1 first readback bad → retry succeeds, P2 all readbacks bad → throws after `opts.retries` with path in message | 2/2 KNOWN-pass |
| `persist-read-with-recovery.test.ts` | P1 read-valid, P2 corrupt+rethrow names path, P3 corrupt+quarantine sidecar+empty target+empty return, P4 ENOENT returns empty no sidecar | 4/4 KNOWN-pass |
| `recover-sessions-json.test.ts` | R1 dry-run on valid no-op exit 0, R2 dry-run on corruption non-zero + diagnosis, R3 in-place repair backup + canonical, R4 unrecoverable garbage non-zero no mutation, R5 trailing-whitespace normalized to canonical | 5/5 KNOWN-pass |

### §2.2 Integration — `packages/dispatch-daemon/test/integration/`

| File | Probes | Result |
|---|---|---|
| `sessions-corruption-recovery.test.ts` | P1+P2+P3+P4 corrupt-on-load → daemon spawns + GET /v2/sessions returns 200 + quarantine sidecar bytes-equal original + target file fresh empty v2 | 1/1 KNOWN-pass |
| `startup-corrupt-registry-recovery.test.ts` | P1+P2+P3+P4 startup-recovery + sidecar matches strict ISO-timestamp pattern + POST /v2/sessions persists after recovery + recoveryHook fires with `{path, sidecar, err}`; P5 sequential corruption events → two distinct sidecars | 2/2 KNOWN-pass |

### §2.3 Behavior-preservation evidence

| File | Probes | Result |
|---|---|---|
| `test/unit/migration-schema-v2.test.ts` (existing, UNMODIFIED) | P1 ENOENT, P2 v1→v2, P3 round-trip, P4 no-tmp, P5 malformed throws with path, P6 idempotent migration, P7 zod-reject-no-disk-touch | 7/7 KNOWN-pass |
| Full `npx vitest run` for `packages/dispatch-daemon/` | All 207 production probes | 207/208 KNOWN-pass; 1 KNOWN-pre-existing fail (`test/unit/install-paths.test.ts P3` — worktree-path regex assumes `/foxworks-dispatch$/` ending; this branch lives at `foxworks-worktrees/sess-2-daemon-registry-fix`. Unrelated to this batch; predates at commit `49f2c2a`.) |

---

## §3 Ladder commits (KNOWN — `git log --oneline`)

```
bed2c99  red(MB-F-DAEMON-REGISTRY-FIX): WB1 — persist module tests fail without files
257b50a  green(MB-F-DAEMON-REGISTRY-FIX): WB1 — persist module skeleton + barrel export
eb5eb87  red(MB-F-DAEMON-REGISTRY-FIX): WB2 — fsync test fails without sync invocation
11f9111  green(MB-F-DAEMON-REGISTRY-FIX): WB2 — fsync gate between writeFile and rename
7cddb28  red(MB-F-DAEMON-REGISTRY-FIX): WB3 — re-parse retry test fails on first-attempt failure
89d5372  green(MB-F-DAEMON-REGISTRY-FIX): WB3 — post-write re-parse with retry-from-input
6a3b2f7  red(MB-F-DAEMON-REGISTRY-FIX): WB4 — quarantine integration test fails without recovery wiring
b5c3a6e  green(MB-F-DAEMON-REGISTRY-FIX): WB4 — readJsonWithRecovery quarantine + readRegistryV2 wiring
1469070  red(MB-F-DAEMON-REGISTRY-FIX): WB5 — recovery script tests fail (no script)
ad6ee3d  green(MB-F-DAEMON-REGISTRY-FIX): WB5 — scripts/recover-sessions-json.mjs ships
83508eb  refactor(MB-F-DAEMON-REGISTRY-FIX): WB6 — writeRegistryV2 + readRegistryV2 delegate to persist module
e890f1e  red(MB-F-DAEMON-REGISTRY-FIX): WB7 — startup-corrupt-registry-recovery test fails today
830c9ff  green(MB-F-DAEMON-REGISTRY-FIX): WB7 — startup.ts amendment for corrupt-on-load recovery
```

Per cairn discipline: per-commit-push (`git push origin sess-2/daemon-registry-fix` after each
commit; verified by `git log -1 --stat` post-push). Per-path `git add`
(no `git add -A`). Pre-commit `git status --short` recorded in each
green commit's §10.5 self-check Q7.

---

## §4 What this defends against

| Failure mode | Confidence | Defense | Ladder rung |
|---|---|---|---|
| writeFile completes but data blocks not flushed before rename; power loss leaves renamed-but-zero-content file | MODELED (POSIX semantics + macOS APFS write reordering — common in defensive-write literature; not directly observed in this finding) | `fsync` between write and rename via `handle.sync()` | WB2 |
| Bytes-on-disk ≠ bytes-written corner case (filesystem fault; concurrent writer between rename + readback) | SPECULATIVE (no specific in-tree reproduction) | Post-write read-back-and-parse with retry-from-input loop, default 3 retries | WB3 |
| Daemon cold-start with operator-style corrupted registry (extra `}\n` past valid JSON; Phase 1 §2 KNOWN; FACT-F) | KNOWN-symptom (operator's live `~/.foxworks-dispatch/sessions.json` reproduced byte-for-byte; 13241-byte file with extra `}\n`) | Startup-time `onCorrupt: 'quarantine'` quarantines `<path>.corrupt-<ISO-timestamp>`, writes fresh empty v2, daemon serves | WB4 + WB7 |
| Operator wants surgical repair preserving non-empty registry | KNOWN-need (operator brief Q5) | Manual recovery script with strategies: trim trailing whitespace → drop one trailing `}` → structural-validate against v2 shape → backup + atomic-write canonical | WB5 |
| Repeated corruption events on the same path | MODELED-need (operator may hand-edit again post-recovery) | Each spawn produces a distinct `.corrupt-<ISO-timestamp>` sidecar; no overwrite | WB7 P5 |

---

## §5 What this does NOT prevent (operator-acked at Phase 2 brief Q2)

- **Recurrence of the original corruption event.** The byte signature
  (extra `}\n`) cannot be produced by `writeFile + rename` (atomic
  rename always replaces fully; writeFile always serialises balanced
  braces). Most likely cause is hand-edit / external tool. Defensive
  infrastructure DETECTS + RECOVERS but cannot PREVENT a non-daemon
  writer from corrupting the file.
- **Concurrent-writer races between fd v1 CLI (`writeRegistry` in
  `dispatch-core/src/registry/write.ts`) and daemon
  (`writeRegistryV2`).** Both atomic-write the same file but at
  different schema versions. Out of scope for this batch (Phase 2
  brief Q8); filed as Tier-2 followup. Not addressed by anything in
  this report.
- **`data.db` (SQLite via better-sqlite3) corruption.** Out of scope
  per Phase 2 brief Q7. better-sqlite3 has its own WAL atomicity.

---

## §6 §G gaps surfaced during execution

**§G1 — WB7 vs WB4 overlap.** Both rungs amend `startup.ts`. WB4
already wired `onCorrupt: 'quarantine'` to make WB4's API-surface
test pass. WB7's RED was therefore not "startup throws or routes
return 500" (operator brief literal); the actual RED state was
"recovery hook not threaded so test cannot capture the recovery
record without enabling Pino in the silenced fixture." WB7 GREEN
adds the `recoveryHook` observation seam — minimum delta to satisfy
the WB7 RED while preserving WB4's API guarantees.

**§G2 — `dispatch-cli` cross-package effect.** No code in
`packages/dispatch-cli/` was touched; `dispatch-core/src/registry/write.ts`
remains the v1 atomic-write path used by fd CLI. Per Phase 2 brief Q8,
this duplication is left in place as a Tier-2 followup.

**§G3 — Pre-existing `install-paths.test.ts` P3 failure.** The test
asserts `resolveRepoRoot(...)` returns a path ending with
`foxworks-dispatch$`. In a worktree (`foxworks-worktrees/sess-2-...`)
this fails. KNOWN unrelated to this batch (commit `49f2c2a` predates).
Not addressed; filed as observation.

---

## §7 Operator next steps

1. Merge `sess-2/daemon-registry-fix` into main.
2. Run the recovery script against the live registry to repair the
   currently-corrupt operator file (Phase 2 brief promise):
   ```
   node packages/dispatch-daemon/scripts/recover-sessions-json.mjs \
     --in $HOME/.foxworks-dispatch/sessions.json
   ```
   Backup will land at
   `$HOME/.foxworks-dispatch/sessions.json.corrupt-<ISO-timestamp>`.
3. Restart the daemon. The startup-time auto-recovery is now active
   for any FUTURE corruption event.
4. Move finding entry from `docs/coordination/sess-2-findings-2026-05-06.md`
   into `docs/cairn-findings.md` under the operator-assigned final
   number (#125-#129 reserved range; suggested #125 per Phase 2 brief WB9).
