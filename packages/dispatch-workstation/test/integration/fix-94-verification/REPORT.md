# Fix-94 verification probe suite report

**Branch:** `mb-t09/permission-mode-flag`
**Branch HEAD pre-REPORT-commit:** `5518a36abf771a315fa8ca472f8d2af398de783b`
**GREEN commit (production code):** `46c7f7c`
**Last individual-mode probe runs:** 2026-05-05
**Aggregate result:** **3 / 3 PROBES PASS** (individual-mode invocation; see §3 for suite-mode known-issue)

This document is the aggregate report for the Fix-94 verification
probe suite. Probe-94 closes the regression net for cairn finding
#94 (MB-F-CONDUCTOR-SPAWN-DEFAULT-PERMISSION-MODE) RESOLVED via
MB-T09 Phase 2 (backend layer only; UI deferred to Phase 3 per
operator §7.4 arbitration).

Every entry below cites a specific test file and the evidence
class (KNOWN / MODELED / SPECULATIVE) for its assertions.

## §1 Suite identity

- **3 probe files**, all under `test/integration/fix-94-verification/`:
  - `probe-01-source-and-build-wiring.test.ts` (5 cases, KNOWN, pure-fs)
  - `probe-02-permission-mode-auto-live.test.ts` (1 deterministic + 1 MANUAL `it.skip`)
  - `probe-03-permission-mode-ask-default.test.ts` (2 deterministic)
- **9 test cases total** (5 + 2 + 2).
- Plus the unit-test seam at `test/unit/mb-t09/` — 3 files, 8 cases
  (4 in auto-mode, 3 in default-ask, 3 in IPC pass-through).
  Workstation full unit suite post-MB-T09: **103 / 103 files
  PASS · 440 / 440 cases PASS** (was 100 / 432 pre-MB-T09).
  **Confidence: KNOWN.**

## §2 Per-probe results

| # | Probe | Individual-mode result | Evidence class | Test file |
|---|---|---|---|---|
| 1 | Source + build-artifact wiring grep | 5 / 5 PASS | KNOWN | `probe-01-source-and-build-wiring.test.ts` |
| 2 | Live ps-aux assertion: auto-mode flag | 1 / 1 PASS in 735ms (live) + 1 MANUAL `it.skip` | KNOWN-when-ran + MANUAL | `probe-02-permission-mode-auto-live.test.ts` |
| 3 | Live ps-aux negative-evidence: ask/default | 2 / 2 PASS in 313ms (live) | KNOWN-when-ran | `probe-03-permission-mode-ask-default.test.ts` |

### Probe 1 — Source + build-artifact wiring — PASS (5 / 5)

**Asserts (5):**
1. `spawn-handler.ts` exports `SpawnPermissionMode = 'auto' | 'ask'` type.
2. `SpawnSessionRequest` declares optional `permissionMode?` field.
3. `buildTmuxArgs` has the conditional + flag literal + append-
   direction anchor (`[...base, '--dangerously-skip-permissions']`).
4. `dist/main/spawn-handler.js` carries the bundled flag literal +
   `'auto'` string + `permissionMode` reference (build-pipeline
   survival).
5. Fail-loud cross-ref: 3 `mb-t09/` unit-test files exist and still
   reference the flag literal (gut-detector against rename / delete).

**Evidence class:** KNOWN — direct fs reads, no runtime.

**Catches regressions:** bundler dead-code-elim, sentinel-region
edits, conditional inversion, channel/literal rename, unit-suite
drift.

### Probe 2 — Live ps-aux assertion: auto-mode flag — PASS (1 / 1, live) + 1 MANUAL

**Mechanism:** standalone-node-script style. Imports
`dist/main/spawn-handler.js` directly (electron-free; spawn-handler
imports only spawn-env + session-cap, no electron). Assembles real
production-shape deps inline (real tmux execFile, real daemon
fetch, `which claude` resolution). Drives `spawnSession` with
`permissionMode: 'auto'`. ps-aux greps for the line containing
both `claudeBinPath` AND `--dangerously-skip-permissions`.

**Auto-skip-with-MANUAL pattern (per operator §7.5):** runtime
preconditions checked — daemon up + token + tmux on PATH + claude
on PATH. Any missing → `ctx.skip()` with explicit loud reason.

**This run (individual-mode, 2026-05-05):** all preconditions met
on operator's machine. Probe ran full path; flag found in ps argv
in 735ms wall-clock. Cleanup verified post-run (PATCH state→killed
left no cap-counted record, no orphan tmux session).

**Evidence class:** KNOWN-when-ran.

**MANUAL designation (one `it.skip`):** operator-experiential
auto-mode validation — operator opens CC console panel via
Conductor strip (Phase 3 UI, not yet shipped), types prompt that
would normally trigger CC's per-action approval, observes NO
prompt fires. Non-deterministic at the human boundary; documented
operator-step in §6 below.

### Probe 3 — Live ps-aux negative-evidence: default/ask mode — PASS (2 / 2, live)

**Mechanism:** same standalone-node-script + dist-import pattern
as Probe 2. Difference: assertion is negative — the line(s)
containing the unique sessionName in `ps -ef -o command` output
must NOT contain `--dangerously-skip-permissions`. Two cases:
1. Default-mode (omitted `permissionMode`).
2. Explicit `permissionMode: 'ask'` (proves the conditional gates
   strictly on `=== 'auto'`, not on truthy/defined).

**This run (individual-mode):** 2 / 2 PASS in 313ms. Both
sessions cleaned up to `killed` state.

**Evidence class:** KNOWN-when-ran (negative-evidence).

**Catches regressions:** conditional inversion, default-on flag
injection, anchor predicate drift (e.g., `'auto'` vs `'AUTO'`).

## §3 Suite-mode behavior — KNOWN-ISSUE

When the same suite is invoked via `vitest run test/integration/fix-94-verification/`
(directory pattern, vitest fork-pool parallelism), behavior
differs from individual-file invocation:

### Observed behavior

| Run | Mode | Result | Skip count |
|---|---|---|---|
| 1 | suite (fork-pool) | **1 failed** + 6 passed + 2 skipped | 2 |
| 2 | suite (fork-pool) | 5 passed + 4 skipped | 4 |
| 3 | suite (fork-pool) | 5 passed + 4 skipped | 4 |
| 4 | suite (fork-pool) | 5 passed + 4 skipped | 4 |
| individual probe-02 | single-file | 1 passed + 1 MANUAL | 1 (MANUAL only) |
| individual probe-03 | single-file | 2 passed | 0 |

**Confidence: KNOWN-state** (run counts and outcomes captured
from vitest output). **Confidence: SPECULATIVE-cause** (root cause
not investigated per Phase-2 §3.7 halt discipline).

### Operator-arbitrated triage outcome

Per operator decision (post-Phase-2 HALT, this session):

> Production code (440/440 unit tests + 3 probes individually
> green) is verified. Ship as RESOLVED. Suite-mode skip behavior
> is probe-infrastructure flakiness, not a production defect.
> Document as known-issue in REPORT.md with explicit operator-step
> for re-verification.

### Hypothesis (SPECULATIVE — banked for future probe-infrastructure work)

Most likely causes of the suite-mode auto-skip + first-run failure:
- vitest fork-pool worker context: `execSync('which claude')`
  PATH propagation may differ between workers and parent shell,
  causing the precondition gate to false-trip.
- Daemon ping race when 3 workers ping `/v2/sessions` concurrently
  during file-load.
- ps-aux race in probe-94-03 if CC binary exits fast under
  no-API-key conditions, before `ps` samples the tmux child argv.
  This is the most plausible cause of the first-run failure
  (file 03 failing on length≥1 assertion when the process had
  already exited).

These are SPECULATIVE — not investigated per §3.7 halt at this
phase boundary.

### Operator re-verification step

When suite-mode invocation reports skips for Probes 02 / 03,
re-run individually to obtain KNOWN evidence:

```sh
pnpm --filter dispatch-workstation exec vitest run \
  test/integration/fix-94-verification/probe-02-permission-mode-auto-live.test.ts

pnpm --filter dispatch-workstation exec vitest run \
  test/integration/fix-94-verification/probe-03-permission-mode-ask-default.test.ts
```

Deterministic green expected when daemon + claude + tmux are
available. Reference timings from this report's individual runs:
probe-02 in ~735ms, probe-03 in ~313ms.

### "1 failed" first-run identity — UNRECOVERABLE

The first-ever suite invocation reported `1 failed | 6 passed |
2 skipped`. The vitest output for that run was overwritten by
subsequent re-invocations before the failure-detail block was
captured. From the count alone (probe-01 contributes 5, probe-02
contributes 1 deterministic + 1 MANUAL), the failure was almost
certainly in probe-94-03 (one of its 2 deterministic cases) — but
WHICH case failed and the assertion text are not recoverable.

**Confidence: SPECULATIVE** — flake hypothesis above is plausible
but not proven; operator triage may want to attempt repro under
sustained suite invocation if the issue resurfaces.

## §4 What's verified — KNOWN evidence catalog

### §4.1 Unit-test seam (8 cases, deterministic)

- `test/unit/mb-t09/test_spawn_executes_tmux_new_session_with_auto_permission_mode.spec.ts`
  — 2 cases. Auto-mode `SpawnSessionRequest` produces 8-element
  argv ending in `--dangerously-skip-permissions`. Anchor on
  bin-path-penultimate + flag-last position invariant.
- `test/unit/mb-t09/test_spawn_executes_tmux_new_session_default_ask_mode.spec.ts`
  — 3 cases. Default + explicit-ask both produce 7-element argv
  unchanged from pre-#94 contract; positional invariants
  (sessionName at index 3, repoPath at index 5, claudeBinPath at
  index 6).
- `test/unit/mb-t09/test_spawn_ipc_passes_through_permission_mode.spec.ts`
  — 3 cases. SpawnIpcController.handleSpawnRequest threads
  permissionMode payload field verbatim through to buildTmuxArgs
  (cross-layer contract fence).

**Confidence: KNOWN** — captured at GREEN commit `46c7f7c`; full
workstation unit suite at 103/103 files, 440/440 cases.

### §4.2 Build-pipeline survival (probe-94-01)

- Source `spawn-handler.ts` carries the typed contract +
  conditional.
- Bundled `dist/main/spawn-handler.js` carries `--dangerously-
  skip-permissions` literal (≥ 1 occurrence, currently 2:
  conditional comparison + appended array element) +
  `'auto'` literal + `permissionMode` field reference.

**Confidence: KNOWN** — direct fs reads of artifacts at branch
HEAD `5518a36`.

### §4.3 Live process-level evidence (probe-94-02 + probe-94-03)

- Auto-mode spawn produces a CC process whose argv (via `ps -ef
  -o command`) contains the flag literal — observed live, 735ms.
- Default-mode + explicit-ask spawns produce CC processes whose
  argv does NOT contain the flag — observed live, 313ms total
  for both cases.

**Confidence: KNOWN-when-ran** — observed in individual-file
invocation. Suite-mode behavior is the §3 known-issue.

### §4.4 What is NOT verified at this phase

- **Phase 3 UI toggle** — wireframe Auto/Ask buttons + state
  persistence. Deferred per operator §7.4 arbitration ("BACKEND
  ONLY this phase, UI deferred until BUILD.md parser ships").
  Backend is shipped + verified; UI ships in Phase 3.
- **Operator-experiential validation** — Probe-02's `it.skip`
  MANUAL designation. Non-deterministic at human boundary; see
  §6 below for operator-step.
- **Cross-process audit-row write through the Conductor's card
  flow under permissionMode='auto'** — exercised via finding #84
  resolution probes; not duplicated here.

## §5 Methodology bank — probe-precondition stability under suite parallelism

This phase surfaced a probe-infrastructure gap distinct from any
production defect: `ctx.skip()`-driven preconditions interact non-
trivially with vitest's fork-pool parallelism. The same probe
that runs deterministically green in single-file mode auto-skips
in suite mode.

**Banked observations:**
- Affected probes share an `execSync('which claude')` precondition.
- Affected probes share a daemon-ping precondition (`fetch
  http://localhost:7878/v2/sessions`).
- Probes that pass in suite mode (`probe-94-01`, plus probe-92
  suite per the test-batch-1 ship-gate run) do not depend on
  `execSync` or daemon-ping at module-load time.

**Cross-ref:** `docs/probe-coverage-gap-analysis-2026-05-05.md`
banks the broader probe-coverage gap pattern for the dedicated
probe-additions session per operator-authorized scope.

**Recommendation (deferred):** investigate whether running
vitest with `--no-file-parallelism` or `pool: 'threads'` (single
fork) stabilizes the precondition gate. If yes, that's a vitest
config tweak; if no, the precondition pattern itself may need
restructuring (e.g., move daemon-ping to a `beforeAll` shared
across the file rather than per-test invocation).

**Confidence: SPECULATIVE** — recommendation is hypothesis; not
authorized for implementation in MB-T09 Phase 2 scope.

## §6 MANUAL operator-step (Probe 2)

To exercise the operator-experiential auto-mode validation that
Probe 2's `it.skip` defers:

1. Workstation launched with operator's real daemon up at `:7878`,
   valid `~/.foxworks-dispatch/token`, onboarding completed
   (`anthropic-api-key.enc` on disk), Phase 3 UI shipped (Auto/Ask
   toggle in the Conductor strip).
2. Toggle Auto-mode in the Conductor strip.
3. Spawn a fresh session via the standard `+ Spawn Session`
   workflow. KNOWN-precondition (per Probe 2 deterministic path):
   the spawned tmux session's `claude` argv contains
   `--dangerously-skip-permissions`.
4. Open the spawned CC session's console panel via the menu trigger.
5. Type a prompt that would normally trigger CC's per-action
   approval (e.g., a tool-use prompt requiring file edit or bash
   execution).
6. Observe: CC executes the action WITHOUT raising the per-action
   approval prompt. Operator-in-the-loop control surface is the
   Conductor card flow, not per-CC-session prompts.

If steps 4-6 produce the observable no-prompt-fires behavior,
the manual surface PASSES.

**Cross-ref to Phase 3:** until the UI ships, this validation
exercises only via operator-set IPC payloads (e.g., DevTools
`window.workstationBridge.requestSpawn({...permissionMode:
'auto'})`). The Probe 2 deterministic ps-aux assertion already
covers the launch-argv side; the chat-runtime no-prompt
observation is the part that requires Phase 3 UI + dogfood.

## §7 Findings filed during probe development

- **None.** No probe surfaced a fix-batch-1 (#94 / MB-T09 Phase 2)
  defect or unanticipated regression. All wiring chains observed
  at branch HEAD `5518a36` behave per the resolution documented
  in finding #94's RESOLVED entry.

The §3 suite-mode behavior is a **probe-infrastructure
known-issue**, not a production defect — operator-arbitrated
explicitly during Phase 2 HALT triage.

## §8 Recommended next steps

All 3 probes PASS individually. Production unit suite +
build-pipeline + live process-level evidence are KNOWN-green at
this branch HEAD.

Phase 2 deliverable status:
- Backend code change: COMPLETE (GREEN at `46c7f7c`).
- Unit-test seam: COMPLETE (8/8 cases, 3 RED + 1 GREEN commits).
- Probe suite: COMPLETE (3 probes, individual-mode green; suite-
  mode known-issue documented).
- Documentation: this REPORT.md + finding #94 status update
  (next commit on this branch).

**Recommended:** operator authors merge of
`mb-t09/permission-mode-flag` → `main`. Per operator §7.4
arbitration, Phase 3 (UI) is deferred until BUILD.md parser
ships (Tier C); the backend resolution is independently shippable.

## §9 Hash / commit references

| Commit | Body |
|---|---|
| `09a444b` | red(MB-T09): permissionMode: auto produces 7-element argv |
| `db0e0dc` | red(MB-T09): default/ask mode preserves 7-element argv (regression guard) |
| `4d56a82` | red(MB-T09): SpawnIpcController threads permissionMode payload field |
| `46c7f7c` | green(MB-T09): conditional --dangerously-skip-permissions flag |
| `254ba54` | green(probe-94-01): source + build-artifact wiring grep |
| `c100755` | green(probe-94-02): live ps-aux assertion for auto-mode flag |
| `5518a36` | green(probe-94-03): live ps-aux negative-evidence for default/ask mode |
| this commit | docs(probe-94): REPORT.md aggregate |
| (next) | docs(cairn): finding #94 RESOLVED at MB-T09 Phase 2 |

Branch HEAD will advance with each commit; merge SHA is operator-
authored on merge to main.
