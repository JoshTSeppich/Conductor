# Fix-83 verification probe suite report

**Branch:** `test-A/probe-suites-fix-batch-1`
**Last full-suite run:** 2026-05-05
**Aggregate result:** **5 / 5 PROBES PASS** (15 / 15 individual assertions, including the daemon-gated live SPAWN_RESULT_OK probe)

This document is the aggregate report for the Fix-83 verification
probe suite. Probe-83 closes the regression net for cairn finding #83
(MB-F-MB-T05-SPAWN-FAILURE-SILENTLY-SWALLOWED) RESOLVED at
`05d9636` (Fix-B in fix-batch-1).

Every entry below cites a specific test file and the evidence class
(KNOWN / MODELED / SPECULATIVE) for its assertions.

## Summary table

| # | Probe | Result | Evidence class | Test file |
|---|-------|--------|----------------|-----------|
| 1 | Source + build-artifact wiring grep | PASS | KNOWN | `probe-01-source-and-build-wiring.test.ts` |
| 2 | workstationBridge.onSpawnResult surface | PASS | KNOWN | `probe-02-bridge-surface-cross-ref.test.ts` |
| 3 | SPAWN_RESULT_ERROR DaemonUnreachable end-to-end | PASS | KNOWN (live Electron + closed port) | `probe-03-spawn-result-error-daemon-unreachable.test.ts` |
| 4 | SPAWN_RESULT_OK live (daemon-gated) | PASS | KNOWN (when ran) / loud-skip with operator-step (when preconditions absent) | `probe-04-spawn-result-ok-live-daemon.test.ts` |
| 5 | Banner→sentinel call-order proof | PASS | KNOWN-redundant | `probe-05-banner-sentinel-chained.test.ts` |

Plus the existing Fix-B unit-test suite at
`test/unit/fix-spawn-result/test_spawn_result_subscription.spec.ts`
(5 / 5 pass at this branch HEAD — channel registration, success-
payload propagation, error-payload propagation, cleanup-fn returned,
repeated-cycle leak-free per Fix-B resolution doc). Probe-83
complements the unit test by covering end-to-end Electron-boot
behavioral paths the unit test cannot reach.

## Per-probe detail

### Probe 1 — Source + build-artifact wiring grep — PASS

**Asserts (5):**
- `spawn-result-listener.ts` exports `attachSpawnResultListener` +
  ships `'workstation:spawn-result'` channel literal.
- `preload.mts` exposes `workstationBridge.onSpawnResult` wired to
  `attachSpawnResultListener(ipcRenderer, cb)`.
- `workstation-shell.html` subscribes via
  `window.workstationBridge.onSpawnResult`; `handleSpawnResult`
  emits `SPAWN_RESULT_OK` / `SPAWN_RESULT_ERROR` sentinels after
  `showSpawnResultBanner`.
- `main.ts` wires `SPAWN_RESULT_SUBSCRIPTION` sentinel region
  (BEGIN/END markers + forwarder body inside MB_TEST_HOOKS=1
  guard).
- Dist artifacts (spawn-result-listener.js, preload.cjs, main.js,
  workstation-shell.html bundle) carry the bundled wiring.

**Evidence class:** KNOWN — direct fs reads of source + dist.

**Catches regressions:** bundler dead-code-elim, sentinel-region
edits, DOM template-literal escaping (cairn #80 class), channel
rename or removal.

### Probe 2 — workstationBridge.onSpawnResult surface — PASS

**Asserts (4):**
- `preload.mts` wires `onSpawnResult` member with helper invocation
  shape (member name + arrow + `attachSpawnResultListener
  (ipcRenderer, cb)` — pattern split across two anchored matches
  due to nested cb-type parens).
- `spawn-result-listener.ts` returns cleanup-fn via
  `ipc.removeListener('workstation:spawn-result', ...)`.
- `dist/main/preload.cjs` bundles `onSpawnResult` + channel string
  + `removeListener`.
- Fail-loud cross-ref: `test/unit/fix-spawn-result/
  test_spawn_result_subscription.spec.ts` exists and has ≥ 5
  it/test cases (gut-detector for Fix-B resolution doc's "5/5
  pass" claim).

**Evidence class:** KNOWN — pure-fs assertions + cross-ref.

### Probe 3 — SPAWN_RESULT_ERROR DaemonUnreachable end-to-end — PASS

**Asserts:** real Electron boot with `FOXWORKS_DAEMON_URL=http://
127.0.0.1:1` (closed port). Drive spawn modal via stdin
(`CLICK_SPAWN_BUTTON` → `SPAWN_MODAL_OPENED` →
`FILL_AND_SUBMIT_SPAWN`); spawn-handler's pre-spawn cap-check
fetch fails ECONNREFUSED, throws `DaemonUnreachable`; envelope
flows back through ipc → renderer onSpawnResult →
handleSpawnResult → console.log → main.ts forwarder → stdout.
Three load-bearing assertions:

1. `error_type === 'DaemonUnreachable'` (anchor on type)
2. message body non-empty (handleSpawnResult fallback to '(no
   message)' would indicate envelope corruption)
3. negative: `SPAWN_RESULT_OK` does NOT appear before the error
   (double-handling guard)

**Evidence class:** KNOWN — live Electron + real fetch failure.

**Encodes:** the ad-hoc verification cited in Fix-B resolution
section as a permanent regression net.

### Probe 4 — SPAWN_RESULT_OK live (daemon-gated) — PASS

**Auto-skip-with-MANUAL pattern (per operator arbitration).**
Runtime preconditions checked via `checkPreconditions()`:
- `~/.foxworks-dispatch/token` readable + non-empty
- `GET http://localhost:7878/v2/sessions` returns 200 + valid
  `sessions[]` JSON
- `which claude` succeeds
- `which tmux` succeeds

Any failure → `ctx.skip(...)` with explicit loud reason per
operator instruction format ("SKIPPED: <missing thing> — re-run
with full daemon stack for KNOWN evidence").

**On the run that produced this report:** all 4 preconditions met
on the operator's machine. Probe ran the full path: `ONBOARDING_
READY` → `SHELL_READY` → `CLICK_SPAWN_BUTTON` →
`SPAWN_MODAL_OPENED` → `FILL_AND_SUBMIT_SPAWN` →
`SPAWN_RESULT_OK probe-83-04-<timestamp>` observed in 2.5s wall-
clock end-to-end. Post-cleanup verified: PATCH state→killed left
no cap-counted record, no orphan tmux session.

**Asserts when ran (2):**
1. `SPAWN_RESULT_OK <name>` matches the submitted timestamped
   session name exactly (regex anchored to unique suffix so
   unrelated sentinels in stdout buffer cannot satisfy).
2. Negative: `SPAWN_RESULT_ERROR` did NOT appear before OK
   (failure-then-recovery guard).

**Best-effort cleanup (failure does not fail probe):**
- `PATCH /v2/sessions/<name>/state → killed` (releases cap, marks
  the daemon record as not-cap-counted)
- `tmux kill-session -t <name>` (belt-and-suspenders for tmux
  side; daemon-side state→killed should kill tmux already)

**Evidence class:** KNOWN (when ran). On a SKIPPED run, the
existing Fix-B resolution + the Probe 5 lexical proof + the unit
test deterministic seam exercise the same surface modulo
end-to-end glue.

### Probe 5 — Banner→sentinel call-order proof — PASS

**Asserts (4):**
- Success branch: success-block start → `showSpawnResultBanner
  ('success', ...)` → `console.log('SPAWN_RESULT_OK ')` (ascending
  source-text indices).
- Error branch: error-block start → `showSpawnResultBanner
  ('error', ...)` → `console.log('SPAWN_RESULT_ERROR ')`
  (ascending).
- Asymmetric auto-dismiss: success has 3000ms timer; error has
  0ms (operator-arbitrated UX requirement: errors must be
  consciously dismissed).
- Fail-loud cross-ref: probes 3 + 4 exist and still observe the
  sentinels (lexical proof is vestigial without runtime
  observers).

**Evidence class:** KNOWN-redundant by-design. The DOM banner
visibility is *not* directly observed in this probe (would
require >50 LOC of new SHELL_EVAL or CDP infra; halt-condition
territory). Instead, the probe pins the lexical-ordering
invariant that makes runtime observation of the sentinels (probes
3 + 4) implicit verification of the banner code path. Reordering
sentinel-before-banner would silently degrade observability AND
make the redundancy claim false; this probe is the canary.

## Findings filed during probe development

- **None.** No probe surfaced a fix-batch-1 (#83 / Fix-B) defect
  or unanticipated regression. All wiring chains observed at
  branch HEAD `f5c0a8b + probe additions` behave per the
  resolution documented in finding #83.

## Recommended next steps

All 5 probes PASS (with probe 4 ran KNOWN under operator's local
daemon stack; auto-skip-with-MANUAL would apply on a CI host
without daemon + claude installed).

Combined with the 5 / 5 unit tests in
`test/unit/fix-spawn-result/`, the regression net for finding #83
is:

- Build-pipeline regressions: caught by Probe 1.
- Bridge surface regressions: caught by Probe 2 + unit test.
- Error-path UX regressions: caught by Probe 3 (DaemonUnreachable
  is the most-common production failure mode per finding #83).
- Success-path UX regressions: caught by Probe 4 when daemon stack
  is up; otherwise gated to MANUAL (operator dogfood).
- Banner ordering regressions: caught by Probe 5 lexical proof.

Recommend merge alongside Session B per coordination scaffold §2.
