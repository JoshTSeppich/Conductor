# Session 2 — parallel-batch-3-2026-05-06 — Findings (append-only)

**Branch:** `sess-2/daemon-registry-fix`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-2-daemon-registry-fix`
**Cut from:** `main` HEAD `c7c1a3a`
**Date opened:** 2026-05-06

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the reserved #125-#129 range (Phase 1 brief §5).
Numbers below are working entries; operator may renumber on merge.

---

## Finding #125 — MB-F-DAEMON-REGISTRY-DEFENSIVE-WRITES-LANDED

**Date filed:** 2026-05-06
**Tier:** 1 (production-runtime defect closed; daemon previously
500-stormed every `/v2/sessions*` request when
`~/.foxworks-dispatch/sessions.json` was corrupt; symptom KNOWN
from operator-banked observation inside finding #115).
**Origin:** Operator-state observation banked at finding #115 lines
2487-2499 ("Operator-state observation banked"); promoted to a
stand-alone finding via parallel-batch-3 Phase 2 (operator-authored
brief, ack via Phase 1 §6 Q4).
**Discovered by:** Session 3 (probe-additions) operator-state
observation; reproduced byte-for-byte in Session 2 (this batch)
Phase 1 §2 KNOWN.
**Resolution status:** SHIPPED on `sess-2/daemon-registry-fix`,
ladder commits `bed2c99` … `7fd00b1` (13 commits across WB1-WB8);
WB9 (this entry) is the final commit.

### Symptom (KNOWN — direct read of operator file)

`~/.foxworks-dispatch/sessions.json` is 13241 bytes, mtime
2026-05-05 14:19. Last 50 bytes (xxd, KNOWN):

```
00000000: 2c0a 2020 2020 2020 226c 6173 745f 7374  ,.      "last_st
00000010: 6174 7573 5f6a 736f 6e5f 6174 223a 206e  atus_json_at": n
00000020: 756c 6c0a 2020 2020 7d0a 2020 7d0a 7d0a  ull.    }.  }.}.
00000030: 7d0a                                     }.
```

The file ends in **four** `}` chars instead of three. A valid v2
registry produced by `writeRegistryV2` ends with three (one for the
inner session record, one for `sessions`, one for the top-level
object). Bytes 13239-13240 are an **APPEND** of `}\n` past the valid
JSON. Parser stops at byte 13238, then errors at byte 13239:
*"Unexpected non-whitespace character after JSON at position 13239"*.

This **directly contradicts** the original Phase 1 brief hypothesis
("trailing 2-byte truncation, likely partial write during shutdown").
A truncation would be missing data; the observed signature is **extra**
data. Operator confirmed and acked at Phase 2 brief Q2.

### Defect class

Production-runtime defect — daemon's read of a corrupt registry
threw an unrecovered Error at every `/v2/sessions*` route call,
returning 500 to every API consumer until manual operator
intervention. Defensive-write infrastructure was **partially**
implemented (atomic tmp+rename was present pre-batch in
`writeRegistryV2`) but lacked: `fsync` between write+rename;
post-write re-parse + retry; corruption-aware READ path; quarantine
sidecar mechanism; manual recovery script.

### Resolution

8 work blocks (WB1-WB8) shipped via 13 ladder commits with cairn
RED→GREEN discipline (per-commit-push, per-path `git add`,
`git status --short` pre-commit verification, `git log -1 --stat`
post-commit verification, §10.5 self-check block in every GREEN
commit body):

| WB | Surface | Evidence |
|---|---|---|
| WB1 | New persist module (`src/persist/`) — generic `writeAtomicJson` + `readJsonWithRecovery` helpers | 7 unit probes KNOWN-pass |
| WB2 | `fsync` between writeFile + rename via `handle.sync()` (was missing pre-batch) | 2 unit probes KNOWN-pass; vi.mock pass-through verifies fs ordering write→sync→close→rename |
| WB3 | Post-write re-parse + retry-from-input loop (default 3 retries) | 2 unit probes KNOWN-pass; mocked truncated readback simulates filesystem fault |
| WB4 | `readJsonWithRecovery` quarantine path; `readRegistryV2` accepts `{onCorrupt, logger}` opts; `startup.ts` opts into quarantine on initial read | 1 integration probe KNOWN-pass; spawnTestServer with corrupt registry returns 200 + sidecar + canonical target |
| WB5 | Manual recovery script `scripts/recover-sessions-json.mjs` — surgical drop-trailing-`}` strategy + structural-validate + canonical rewrite | 5 unit probes KNOWN-pass; child_process spawns real node binary; real fs |
| WB6 | Behavior-preserving refactor — `writeRegistryV2` + `readRegistryV2` delegate to persist module | Existing `migration-schema-v2.test.ts` P1-P7 stay green UNMODIFIED |
| WB7 | `recoveryHook` observation seam in `StartupOpts` + fixture passthrough | 2 integration probes KNOWN-pass; one verifies POST after recovery (proves writability); one verifies sequential corruption events produce distinct sidecars |
| WB8 | Aggregate REPORT.md at `packages/dispatch-daemon/test/integration/sessions-corruption-recovery/REPORT.md` | KNOWN; documents probes, ladder, evidence chain, defends-against matrix |

**Net source LOC:** +~360 in production code (`src/persist/` +
`src/migration/schema-v2.ts` net diff + `src/lifecycle/startup.ts`
diff + `scripts/recover-sessions-json.mjs`); +~700 in test code
(7 new test files); +~180 in REPORT.md; +~150 in this finding entry.

### Source-side seam additions

- **`src/persist/`** — new package-internal directory with three
  files (`atomic-write.ts`, `read-with-recovery.ts`, `index.ts`).
- **`src/migration/schema-v2.ts:ReadRegistryV2Opts`** — additive opts
  param on `readRegistryV2(path, opts)`. Default
  `onCorrupt: 'rethrow'` preserves all existing caller behavior.
- **`src/lifecycle/startup.ts:StartupOpts.recoveryHook`** —
  observation seam. Production observability layers can wire alerting
  / metrics here; tests use it to capture the recovery record without
  enabling the otherwise-silenced fixture Pino logger. Mirrors the
  established TmuxOps / WatcherFactory injection pattern.
- **`test/fixtures/server.ts:SpawnTestServerOpts.recoveryHook`** —
  pass-through to `StartupOpts.recoveryHook`.

### What this DOES NOT prevent (operator-acked)

Per Phase 2 brief Q2 + Q7 + Q8:

- **Recurrence of the original corruption event.** The byte signature
  (extra `}\n`) cannot be produced by `writeFile + rename` (atomic
  rename always replaces fully; writeFile always serialises balanced
  braces). Most likely cause is hand-edit / external tool. Defensive
  infrastructure DETECTS + RECOVERS but cannot PREVENT a non-daemon
  writer from corrupting the file. Methodology lesson:
  defensive-write infrastructure has value even when root cause is
  external — the next corruption event is now SURVIVABLE without
  operator intervention.
- **Concurrent-writer races between fd v1 CLI
  (`dispatch-core/src/registry/write.ts:writeRegistry`) and daemon
  (`writeRegistryV2`).** Both atomic-write the same file but at
  different schema versions. Out of scope for this batch (Phase 2
  brief Q8 OUT-OF-SCOPE); filed as Tier-2 followup. Not addressed.
- **`data.db` (SQLite via better-sqlite3) corruption.** Out of scope
  per Phase 2 brief Q7. better-sqlite3 has its own WAL atomicity.
- **Root-cause investigation of the original corruption event.** Not
  attempted; the byte signature is consistent with hand-edit /
  external tool but no in-tree forensics or operator-machine inspection
  was performed.

### Followups (not addressed; for operator triage)

1. **dispatch-core v1 `writeRegistry` unification** with the new
   persist module. Two duplicate atomic-write recipes survive in-tree
   after this batch. Tier-2.
2. **Concurrent-writer race investigation** — fd CLI + daemon writing
   to same file at different schema versions. Tier-2.
3. **Original corruption event root cause** — operator-machine
   inspection / `fs_usage` / shell-history audit to identify what
   appended the `}\n` past valid JSON. Tier-3.
4. **Apply `fsync` to `dispatch-core/src/registry/write.ts:writeRegistry`**
   if/when (1) lands. Currently the v1 path lacks fsync (same
   pre-WB2 state as the daemon path).
5. **Pre-existing `test/unit/install-paths.test.ts P3` worktree-path
   regex failure** — KNOWN unrelated (predates this branch at commit
   `49f2c2a`). Tier-3.

### Cross-references

- Finding #115 — `docs/cairn-findings.md` lines 2487-2499 banked the
  operator-state observation that this finding closes. #115 itself
  (MB-F-PROBE-COVERAGE-GAP-CLOSURES-2026-05-05) closed 5 ship-gate
  probe gaps; the corruption observation was banked there because
  Session 3 territory excluded daemon-side fixes.
- `packages/dispatch-daemon/test/integration/sessions-corruption-recovery/REPORT.md`
  — aggregate REPORT for this cluster's WB1-WB8 ladder.
- Phase 1 close report — `/tmp/sess-2-daemon-registry-fix-diagnose.md`
  (operator-reviewed; operator-arbitrated Phase 2 brief is the
  in-conversation message that authorized Phase 2).

### Confidence

- **Symptom**: KNOWN per direct read of operator file (xxd in
  Phase 1 §2; reproduced byte-for-byte in
  `test/integration/sessions-corruption-recovery.test.ts`).
- **Resolution structure**: KNOWN per WB1-WB8 ladder; 19 new probes
  shipped, all KNOWN-pass; 7 existing P1-P7 stay green UNMODIFIED;
  full daemon suite 207/208 (1 pre-existing worktree failure KNOWN
  unrelated).
- **Recovery script efficacy**: KNOWN for the operator-observed
  signature (R3 probe). MODELED for other corruption modes
  (truncation mid-key etc. — recovery script may or may not handle).
- **Root cause**: SPECULATIVE (most likely hand-edit / external tool
  per Phase 2 brief Q2 ack; not investigated).

### §10.5 self-check (resolution append)

1. **API verified by spike?** n/a — atomic-write + readback + retry
   are textbook defensive recipes; no novel transport. fsync
   semantics are POSIX-standard.
2. **Test exercises behavior or mocks?** exercises — 11 unit probes
   use real `fs` on `mkdtemp` paths; 3 integration probes spawn real
   Fastify via `spawnTestServer`; 5 recovery-script probes spawn real
   `node` binary via `child_process`. Mocks are limited to
   `vi.mock('node:fs/promises')` for fsync ordering + retry simulation
   in the unit suite — both verify call sequences against
   importOriginal pass-through, not behavior.
3. **Implementation deleted, test still passes?** no — verified
   per-WB:
   - WB2: delete `handle.sync()` → fsync ordering test fails.
   - WB3: delete readback retry loop → both retry probes fail.
   - WB4: delete `onCorrupt: 'quarantine'` from `startup.ts` →
     integration test 500s again.
   - WB5: delete strategy 1 (drop trailing brace) → R3 fails.
   - WB7: delete `opts.recoveryHook?.(info)` → P4 + P5 fail.
4. **Anything outside contract?** no — `CONDUCTOR_API_CONTRACT.md`
   unchanged; `REGISTRY.md` unchanged; v2 schema unchanged.
   Recovery infrastructure is internal to dispatch-daemon.
5. **Modified contract?** no.
6. **Unlabeled claims?** no — KNOWN / MODELED / SPECULATIVE
   throughout this entry, REPORT.md, and per-commit bodies.
7. **Touched a file another session may modify?** no — all changes
   inside `packages/dispatch-daemon/` (Session 2 territory per
   Phase 2 brief). Cross-checked: no edits to
   `packages/dispatch-web/` (Session 1 — closed as no-op),
   `packages/dispatch-workstation/` (Session 3 — owns
   cardbridge-shape integration tests),
   `packages/dispatch-core/` (frozen for this batch per Phase 2
   brief Q8). Per-commit `git status --short` recorded in each
   GREEN commit's §10.5 Q7. Per-path `git add` enforced.
8. **Pre-push protocol?** per-commit-push (`git push origin
   sess-2/daemon-registry-fix` after each of 13 commits;
   per-commit `git log -1 --stat` verification). Per-path
   `git add` (no `git add -A`). Pre-commit `git status --short`.
9. **Confidence labels?** KNOWN / MODELED / SPECULATIVE used
   per-claim; defends-against matrix in REPORT.md §4 labels each
   row.
