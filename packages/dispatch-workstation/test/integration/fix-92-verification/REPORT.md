# Probe-92 / Fix-92 verification report

**Branch:** `probe-92/fix-verification`
**Last full-suite run:** 2026-05-05
**Aggregate result:** **10 / 10 PROBES PASS** (24 / 24 individual assertions)

This document is the aggregate report for the Fix-92 verification probe
suite. It is generated as Probe 10 of the suite (the final aggregation
step). Every entry below cites a specific test file and the evidence
class (KNOWN / MODELED / SPECULATIVE) for its assertions.

## Summary table

| # | Probe | Result | Evidence class | Test file |
|---|-------|--------|----------------|-----------|
| 1 | Token file precondition | PASS | KNOWN | `probe-01-token-file-precondition.test.ts` |
| 2 | Daemon precondition (positive + negative) | PASS | KNOWN | `probe-02-daemon-precondition.test.ts` |
| 3 | Build artifact bootstrap wiring (3 greps) | PASS | KNOWN | `probe-03-build-artifact-bootstrap-wiring.test.ts` |
| 4 | IPC handler reachable in main process | PASS | KNOWN | `probe-04-ipc-handler-reachable.test.ts` |
| 5 | Kanban localStorage populated post-launch | PASS | KNOWN (length + sha256-prefix) | `probe-05-kanban-localstorage-populated.test.ts` |
| 6 | useAuthBootstrap connected, no TokenPrompt | PASS | KNOWN | `probe-06-no-tokenprompt-connected.test.ts` |
| 7 | Daemon connectivity from inside webview | PASS | KNOWN | `probe-07-daemon-connectivity-from-webview.test.ts` |
| 8 | Cold-launch race condition timing | PASS | KNOWN (no race fired) + forensic delta | `probe-08-race-condition-timing.test.ts` |
| 9 | TokenPrompt fallback intact for no-token | PASS | KNOWN (negative-evidence) | `probe-09-tokenprompt-fallback-intact.test.ts` |
| 10 | This REPORT.md | this file | aggregate | `REPORT.md` |

Plus the obs-infra defense-in-depth unit tests in
`test/unit/probe-92-test-hooks-env/test_test_hooks_env.spec.ts`:
**12 / 12 gating tests pass.** These pin the contract that
`MB_TEST_HOOKS_DAEMON_TOKEN_PATH` and `MB_USER_DATA_DIR` overrides take
effect ONLY when `MB_TEST_HOOKS=1` is also set — production builds
ignore them.

## Per-probe detail

### Probe 1 — Token file precondition — PASS

**Asserts:** `~/.foxworks-dispatch/token` exists, is mode 0o600, non-empty,
trims to a single string with no internal whitespace.

**Evidence class:** KNOWN — exercises the same `statSync` + `readFileSync`
the production code uses.

**Notes:** OPERATOR-STATE probe. If this fails, the operator's environment
is misconfigured (no daemon installed, or token file corrupted). Probe 9
verifies the no-token fallback path explicitly so a no-daemon operator
isn't locked out.

### Probe 2 — Daemon precondition — PASS

**Asserts:**
- (a) `GET /v2/sessions` with valid `x-conductor-token` returns 200 + JSON.
- (b) `GET /v2/sessions` WITHOUT token returns non-200 (auth is real).

**Evidence class:** KNOWN — live HTTP roundtrip against the operator's
running daemon.

**Notes:** The negative assertion (b) is critical — without it the whole
suite could pass against a wide-open daemon and prove nothing.

### Probe 3 — Build artifact bootstrap wiring — PASS

**Asserts:**
- `dist/main/card-bridge.cjs` contains `'workstation:get-daemon-token'`
- `dist/main/card-bridge.cjs` contains `'x-conductor-token'`
- `dist/main/main.js` contains `'workstation:get-daemon-token'`

**Evidence class:** KNOWN — direct fs read of built artifacts.

**Notes:** Catches build-pipeline regressions specifically (esbuild flag
changes, dead-code-elim, sentinel-region exclusion) — orthogonal to
source-tree assertions.

### Probe 4 — IPC handler reachable in main process — PASS

**Asserts:** `BOOTSTRAP_TOKEN_WRITTEN <length>` sentinel fires with
length matching `~/.foxworks-dispatch/token` trimmed length. Plus
`WINDOW_READY` ordering (real Electron lifecycle).

**Evidence class:** KNOWN end-to-end. Sentinel firing proves:
ipcMain.handle registered before webview attach → readDaemonTokenForBootstrap
returned non-null → preload's branch taken → setItem succeeded →
did-attach-webview forwarder routed to stdout.

**Reframe:** Original task brief specified CDP / `--remote-debugging-port=9222`.
Reframed by operator-acked scout-phase Q5 to use the existing sentinel
pattern; same KNOWN evidence with no new dependency.

**Defense-in-depth:** length-only assertion. Token value never echoed.

### Probe 5 — Kanban localStorage populated post-launch — PASS

**Asserts:** Kanban webview's `localStorage['x-conductor-token']` length +
SHA-256 prefix (8 hex chars) match the disk file.

**Evidence class:** KNOWN. Length match + 8-hex-char SHA-256 prefix
collision is 2^-32 likely; combined, this is effectively certain proof
of byte-equivalence.

**Reframe:** Original task brief specified leveldb-binary-parse + wipe.
Reframed by operator-acked scout-phase Q2 to use webview-side
`localStorage.getItem` via KANBAN_EVAL — no destructive leveldb wipe,
no binary parser dependency.

**Defense-in-depth:** value never echoed. Hash computed inside webview
via `crypto.subtle.digest('SHA-256', ...)`; only `{length, sha256_prefix:
hex.slice(0,8)}` returned.

**Surfaced constraint:** the existing `main.ts` stdin handler is
per-line (`.trim()` + regex without `s` flag), so KANBAN_EVAL eval
code must be SINGLE-LINE JS. First Probe 5 attempt timed out for this
reason; switched to single-line form. Documented in the test file.

### Probe 6 — useAuthBootstrap connected, no TokenPrompt — PASS

**THE VISUAL CHECK, AUTOMATED.** Three DOM assertions via KANBAN_EVAL
after a 2.5s settling window post-`BOOTSTRAP_TOKEN_WRITTEN`:
- `hasTokenPromptHeading: false` (no "Conductor authentication" h1)
- `hasBootstrappingStatus: false` ("Connecting to daemon…" transitioned away)
- `hasKanbanColumns: true` (post-bootstrap connected children rendered)

**Evidence class:** KNOWN.

**Significance:** This is the pre-fix-92 regression signature. If Fix-92
were broken, `hasTokenPromptHeading` would be `true` and this probe would
go red.

### Probe 7 — Daemon connectivity from inside webview — PASS

**Asserts:** Webview-side `fetch('/v2/sessions', {headers: {'x-conductor-
token': localStorage.getItem(...)}})` returns status 200, valid JSON,
with a `sessions` array.

**Evidence class:** KNOWN end-to-end — closes the loop with Probe 2
(daemon accepts disk token) and Probe 5 (localStorage value matches disk
token byte-for-byte). Together: KNOWN end-to-end functional.

**Defense-in-depth:** session metadata never echoed; only shape primitives
(status, isJson, hasSessionsArray, sessionsLength).

### Probe 8 — Cold-launch race condition timing — PASS

**Asserts:** `TokenPrompt` is absent at `BOOTSTRAP_TOKEN_WRITTEN` arrival
time AND 2.5s later. Plus forensic side-channel: wall-clock SHELL_READY +
BOOTSTRAP_TOKEN_WRITTEN timestamps.

**Evidence class:** KNOWN — no race fired in this run.

**Reframe:** Original brief specified observing a `phase:prompt` sentinel
from dispatch-web. No such sentinel exists today (cross-package edit,
out-of-scope). Reframed: observe DOM at the BTW arrival moment — if
TokenPrompt is rendered there, the race fired (preload's IPC roundtrip
resolved AFTER useAuthBootstrap's first readToken).

**Forensic observations across runs on this machine:**
- Solo run: SHELL_READY → BTW = **122ms**
- Concurrent suite run: SHELL_READY → BTW = **465ms** (vitest test pressure)

Both well under the time required for dispatch-web mount + first
useAuthBootstrap readToken. Race did not fire in either run.

**SPECULATIVE (not asserted, noted for forensics):** The race COULD fire
on a sufficiently slow machine where dispatch-web bundle parsing and
React mount complete before the IPC roundtrip. If it ever does, this
probe goes red with the timing context needed to triage.

### Probe 9 — TokenPrompt fallback intact for no-token case — PASS

**NEGATIVE-EVIDENCE PROBE.** Asserts:
- `BOOTSTRAP_TOKEN_WRITTEN` does NOT fire (IPC returned null per absent
  override path → preload's branch skipped).
- `TokenPrompt` IS rendered (useAuthBootstrap reads localStorage null in
  fresh tmpdir userData → `setPhase('prompt')` → TokenPrompt mounts).

**Evidence class:** KNOWN-NEGATIVE + KNOWN-POSITIVE.

**Operator-acked design (scout-phase Q3, Option B):** Used
`MB_TEST_HOOKS_DAEMON_TOKEN_PATH` env override pointing at a non-existent
path. No destructive mutation of operator's real
`~/.foxworks-dispatch/token`.

**Defense-in-depth:** override gating verified by 12 unit tests pinning
that overrides take effect ONLY with `MB_TEST_HOOKS=1`. Production builds
ignore the override entirely.

### Probe 10 — REPORT.md aggregation — this file

## Findings filed during probe development

- **None.** No probe surfaced a fix-92 defect or unanticipated regression.

The two pre-existing observations surfaced at the obs-infra commit
boundary (33 unrelated unit-test failures and pre-existing integration-
suite hang under operator-runtime contention) were flagged to the
operator and are out-of-scope for probe-92. Both predate the probe
suite and remain triable as separate findings if the operator chooses.

## Recommended next steps

Per the operator's Definition of Done:

> Branch ready for either: (a) merge alongside fix-92 if all PASS, or
> (b) holding fix-92 from merge if any FAIL

All 10 probes PASS. **Recommendation: (a)** — merge `probe-92/fix-
verification` alongside fix-92's parent branch (`fix-92/daemon-token-
bootstrap` HEAD `f3eceda`) into `main`. The probe suite then becomes a
permanent regression net for any future #92-class defect:

- Build-pipeline regressions: caught by Probe 3 grep failures.
- IPC handler regressions: caught by Probe 4 sentinel timeout.
- Preload setItem regressions: caught by Probe 5 length/hash mismatch.
- TokenPrompt-resurfacing regressions: caught by Probe 6 DOM assertion.
- Token-rejection regressions: caught by Probe 7 status≠200.
- Race condition surfacing on slower runtimes: caught by Probe 8 DOM
  state at BTW time.
- Fallback-eliminating regressions: caught by Probe 9 negative-evidence.

## Observability infrastructure shipped alongside

The probe suite required ~55 LOC of new observability infrastructure
(operator-acked at the obs-infra commit boundary, commit `d8ab92f`).
All MB_TEST_HOOKS=1 gated; production builds see byte-equivalent behavior
to pre-obs-infra:

- `src/main/test-hooks-env.ts` — pure-function gating helpers.
- `src/main/main.ts` — five sentinel-region edits: imports, userData
  setPath pre-whenReady, kanbanWebContents capture, did-attach-webview
  console-forwarder, KANBAN_EVAL stdin handler, IPC handler override.
- `src/main/card-bridge-preload.mts` — 3 LOC inside the existing
  Fix-92 region: `BOOTSTRAP_TOKEN_WRITTEN <length>` sentinel after
  successful localStorage.setItem (length only, never echoes value).
- `test/unit/probe-92-test-hooks-env/test_test_hooks_env.spec.ts` —
  12 unit tests pinning the gating contract.

## Hash / commit references

- Fix-92 parent branch HEAD: `f3eceda` (`fix-92/daemon-token-bootstrap`)
- Fix-92 RED commit: `3347114` red(MB-F-#92): daemon token bootstrap from disk to runtime
- Fix-92 GREEN commit: `90abbb5` green(MB-F-#92): bootstrap daemon token at app-ready
- Probe-92 obs-infra commit: `d8ab92f` green(probe-92-obs-infra): webview console forwarder + KANBAN_EVAL + env-var gating
- This branch HEAD will be the REPORT.md commit.
