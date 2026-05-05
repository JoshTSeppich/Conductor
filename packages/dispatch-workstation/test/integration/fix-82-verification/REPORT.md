# Fix-82 verification probe suite report

**Branch:** `test-A/probe-suites-fix-batch-1`
**Last full-suite run:** 2026-05-05
**Aggregate result:** **5 / 5 PROBES PASS** (15 / 15 individual assertions)

This document is the aggregate report for the Fix-82 verification probe
suite. Probe-82 closes the regression net for cairn finding #82
(MB-F-CONSOLE-T03-OPERATOR-TRIGGER-UNREACHABLE) PARTIAL-RESOLVED at
`320f707` (Fix-C green-bridge HEAD) and completed by finding #89
(menu rebuild propagation, RESOLVED at `cf77a10`).

Every entry below cites a specific test file and the evidence class
(KNOWN / MODELED / SPECULATIVE) for its assertions.

## Summary table

| # | Probe | Result | Evidence class | Test file |
|---|-------|--------|----------------|-----------|
| 1 | Source + build-artifact wiring grep | PASS | KNOWN | `probe-01-source-and-build-wiring.test.ts` |
| 2 | Bootstrap GET /v2/sessions fires at app-ready | PASS | KNOWN (live HTTP stub) | `probe-02-bootstrap-fetch-fires.test.ts` |
| 3 | WS-event-driven refetch debounce collapse | PASS | KNOWN (live HTTP+WS stubs) | `probe-03-ws-trigger-debounce.test.ts` |
| 4 | consoleBridge.openPanel renderer surface | PASS | KNOWN | `probe-04-bridge-openpanel-surface.test.ts` |
| 5 | Menu propagation cross-ref to probe-89 | PASS | KNOWN-by-cross-reference | `probe-05-menu-rebuild-cross-ref.test.ts` |

Plus the existing Fix-C unit-test suite at
`test/unit/fix-console-trigger/` (10 / 10 pass at this branch HEAD —
6 in `test_menu_subscription.spec.ts`, 4 in
`test_console_bridge_open_panel.spec.ts`). Probe-82 complements the
unit tests by covering the end-to-end behavioral surface (real
Electron boot, real WebSocket client, build-pipeline survival) that
unit tests cannot reach.

## Per-probe detail

### Probe 1 — Source + build-artifact wiring grep — PASS

**Asserts (5):**
- `console-mount.ts` exports `subscribeConsoleMenuToDaemon` + the
  `SubscribeConsoleMenuDeps` interface.
- `console-bridge.ts` factory exposes `openPanel(sessionName: string):
  Promise<void>` and references `'console:open-panel'`.
- `main.ts` wires the helper inside the Fix-C sentinel pair (BEGIN /
  END markers, import, call) — single integration point for #82.
- `dist/main/console-mount.js` + `dist/main/main.js` carry the
  bundled symbol + `/v2/sessions` + `refreshConsoleMenu` references.
- `console:open-panel` channel string present in
  `dist/main/console-ipc.js` (main-side handler), `console-bridge.js`
  (renderer-side bridge), and `preload.cjs` (bundled preload).

**Evidence class:** KNOWN — direct fs reads of source + dist artifacts.

**Catches regressions:** sentinel-region edits, bundler dead-code-
elim, preload bundling that drops the channel string, channel rename.

### Probe 2 — Bootstrap GET /v2/sessions fires at app-ready — PASS

**Asserts:** local `node:http` test stub records exactly one
`GET /v2/sessions` request landing during `ONBOARDING_READY` + 500ms
settle. Token header presence + length + sha256-prefix match the
fake-token byte sequence (defense-in-depth: value never echoed).

**Evidence class:** KNOWN — live HTTP roundtrip from real Electron
boot to test-controlled stub server.

**Pattern:** `HOME` redirected to tmpdir + fake token written so
Fix-C's direct fs read of `~/.foxworks-dispatch/token` lands on
probe-controlled bytes (not operator's real token).
`FOXWORKS_DAEMON_URL` points at stub; `FOXWORKS_DAEMON_WS_URL`
unreachable so WS-driven refetches don't race the bootstrap.

**Catches regressions:** bootstrap fetch never fires (menu would
stay empty; same operator-visible symptom as pre-fix-82 defect),
bootstrap fires more than once (polling regression), token header
missing (auth roundtrip silently broken).

### Probe 3 — WS-event-driven refetch debounce collapse — PASS

**Asserts:** with both HTTP stub (port A) and minimal-WS stub
(port B) running, after a 5-event burst within ~50ms (well inside
the 150ms debounce window), `httpStub.getSessionsHits === 2`
exactly (1 bootstrap + 1 trailing-edge debounced refetch). Without
debounce, a 5-event burst produces 6 hits.

**Evidence class:** KNOWN — live timing observation against the
shipped `subscribeConsoleMenuToDaemon` debounce (default 150ms).

**Implementation detail:** minimal RFC 6455 server (handshake +
unmasked text-frame writer; ~50 LOC). The `console-mount.ts` WS
adapter only consumes events from the server direction, so the
stub never needs to parse client→server frames.

**Catches regressions:** per-event refetch (debounce broken; would
produce 6 hits), WS-event handler entirely broken (would produce 1
hit baseline), debounce window shrunk (≤50ms would let bursts
through as 2-3 hits).

### Probe 4 — consoleBridge.openPanel renderer surface — PASS

**Asserts (5):**
- `console-bridge.ts` factory wires `openPanel` to
  `ipc.invoke('console:open-panel', { sessionName })` with
  `Promise<void>` shape.
- `console-ipc.ts` main-side registers the channel.
- `preload.mts` exposes `consoleBridge` via
  `contextBridge.exposeInMainWorld`.
- `dist/main/console-bridge.js` + `preload.cjs` carry the bundled
  symbol + channel string.
- Fail-loud cross-ref: existing unit test at
  `test/unit/fix-console-trigger/test_console_bridge_open_panel.spec.ts`
  exists AND still asserts `openPanel` + `console:open-panel`
  literals (gut-detector: no-op'd unit test would trip this probe).

**Evidence class:** KNOWN — pure-fs assertions + cross-ref. The
unit test's deterministic seam (Promise resolution, error
propagation, payload shape) is the behavioral counterpart this
probe leans on.

### Probe 5 — Menu propagation cross-ref to probe-89 — PASS

**Asserts (3):**
- `fix-89-menu-rebuild/probe-01-menu-rebuild-propagates.test.ts`
  exists at expected path.
- The cross-referenced probe still contains the substantive
  REFRESH_CONSOLE_MENU stdin drive + AppleScript / System Events
  introspection + `PROBE_SESSION_NAME 'toContain'` assertion
  (gut-detector for the load-bearing OS-level menu observation).
- The cross-referenced probe platform-gates to darwin (constraint
  documented for porters).

**Evidence class:** KNOWN-by-cross-reference. Per operator
arbitration on cross-ref scope: cross-references stay as test files
(not compressed into REPORT.md prose) so suite renames or deletions
trip the test runner immediately. Re-implementing the ~450 LOC of
AppleScript + descendant-PID resolution from probe-89 here would be
redundant.

**Why the cross-ref matters:** without #89's `setApplicationMenu
(null)` precursor (RESOLVED at `cf77a10`), Fix-C wiring would
invoke `refreshConsoleMenu(<sessions>)` JS-side correctly but the
OS menu cache would remain pinned to the initial empty-state — the
operator-visible symptom (#82) would persist. The composed
end-to-end coverage requires both probe-82's wiring chain AND
probe-89's OS-propagation.

## Findings filed during probe development

- **None.** No probe surfaced a fix-batch-1 (#82 / Fix-C) defect or
  unanticipated regression. All wiring chains observed at branch
  HEAD `f5c0a8b + probe additions` behave per the resolution
  documented in finding #82.

## Recommended next steps

All 5 probes PASS. Combined with the 10 / 10 unit tests in
`test/unit/fix-console-trigger/` and the 1 / 1 platform-gated
probe-89 OS-level assertion, the regression net for finding #82 is:

- Build-pipeline regressions: caught by Probe 1.
- Bootstrap-fetch regressions: caught by Probe 2.
- Debounce regressions: caught by Probe 3.
- Bridge surface regressions: caught by Probe 4 + unit test.
- OS menu propagation regressions: caught by probe-89 (cross-
  referenced as Probe 5).

Recommend merge alongside Session B (per coordination scaffold §2:
Session A merges first; both ship green if both green).
