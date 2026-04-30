# ADR MB-S04: Vitest spawn-and-observe Electron for the MB-T01 Red criterion

- **Status:** Accepted (spike validated 2026-04-30)
- **Date:** 2026-04-30
- **Session:** B (UI / dispatch-workstation)
- **Ticket:** MB-S04 (spike) — informs MB-T01 (Red criterion test design)
- **Informs:** MB-T01 (`test_app_launches_clean.spec.ts` shape per V3_TICKETS.md L104)
- **Cites:** UI-S02 ADR (Electron locked 2026-04-23) for KNOWN Electron behaviors

## Context

V3_TICKETS.md L104 specifies the MB-T01 Red criterion as
*"`test_app_launches_clean.spec.ts` — spawn built app, assert process starts,
window appears, exits cleanly on quit."* The frozen UI-S02 ADR establishes
Electron 33+ as the chosen framework (KNOWN: hello-world worked first try;
TS/TS stack; electron-builder packaging path available; macOS Tray + Notification
APIs validated). What UI-S02 did **not** establish:

- (SPECULATIVE before this spike) Whether vitest can orchestrate a child Electron
  process robustly enough to assert spawn → window-rendered → clean-exit.
- (SPECULATIVE) The signal mechanism for window-rendered detection from outside
  the spawned process (stdout sentinel? IPC? file-touch?).
- (SPECULATIVE) The quit-signal mechanism that produces deterministic exit code 0
  (SIGTERM? stdin? Cmd+Q via osascript?).
- (SPECULATIVE) Whether the test should target a packaged `.app` (production
  parity, slower) or `electron <main.js>` directly (mechanics-equivalent, faster).
- (SPECULATIVE) The Electron binary path under pnpm workspace install.

This ADR resolves all five via direct experiment.

## Evidence

5/5 experiments pass at `packages/dispatch-workstation/spikes/MB-S04-vitest-electron-spawn/`.
Full numbers in `<spike>/results/evidence.md`.

```
 ✓ S-04-01: dev-mode spawn + SPIKE_READY stdout sentinel        448 ms
 ✓ S-04-02: SIGTERM clean-exit (either shape acceptable)        1482 ms
 ✓ S-04-03: stdin "QUIT" line — deterministic exit code 0        1290 ms
 ✓ S-04-04: full-cycle dev-mode timing                           1297 ms
            spawn→ready 401 ms; ready→exit 895 ms
 ✓ S-04-05: packaged .app spawn-and-observe                      2632 ms
            spawn→ready 2383 ms; ready→exit 245 ms; exit code 0
```

### KNOWN findings (validated this spike)

| # | Finding | Evidence |
|---|---|---|
| K1 | Vitest can spawn `electron <main.mjs>` via `node:child_process.spawn`, capture stdout/stderr/stdin via `stdio: ['pipe','pipe','pipe']`, and observe a window-ready sentinel reliably. | S-04-01, S-04-04 |
| K2 | `webContents.on('did-finish-load', () => process.stdout.write('SENTINEL\n'))` produces a clean stdout sentinel observable by the parent vitest process. | S-04-01, S-04-04, S-04-05 |
| K3 | An in-band stdin-line "QUIT" channel (`process.stdin.on('data', chunk => chunk.toString().trim() === 'QUIT' && app.quit())`) yields **deterministic exit code 0** in both dev-mode and packaged-app mode. | S-04-03, S-04-05 |
| K4 | SIGTERM yields a "clean" shape but **non-deterministic between** `code === 0` (handler ran first) and `code === null && signal === 'SIGTERM'` (signal beat handler). Acceptable as cleanup safety net; not recommended as primary quit channel. | S-04-02 |
| K5 | Packaged `.app` mode works via direct invocation of `<App>.app/Contents/MacOS/<binary>` (bypasses LaunchServices/Gatekeeper UX). Same primitives as dev-mode. | S-04-05 |
| K6 | `@electron/packager` (npm-org name for `electron-packager`) builds a minimal Electron app to `.app` in **8.4 s** on darwin-arm64. Output: 263 MB .app; 281 MB parent dir. Reproducible via npx. | spike `npx --yes @electron/packager` invocation |
| K7 | The Electron binary under pnpm install resolves at `packages/dispatch-workstation/node_modules/.bin/electron` — **not** workspace-root `node_modules/.bin/`. Initial spike run failed with ENOENT until path was corrected. | spike commit history; first run failure |
| K8 | Full dev-mode cycle (spawn → ready → quit) completes in ~1.3 s. Packaged-mode cycle in ~2.6 s. Both well under vitest's 30 s test timeout. | S-04-04, S-04-05 |

### MODELED (extrapolated, not directly validated)

| # | Claim | Why MODELED |
|---|---|---|
| M1 | The same test approach works for the production `dist/main/main.js` (post-tsc-compile of `src/main/main.ts`) green-commit artifact. | Not directly tested in spike (spike main.mjs is throwaway); extrapolated from K1+K2 holding equally for any Electron entry script. |
| M2 | Local-mac dev-loop reliability extrapolates to GitHub Actions macOS runners. | Not tested in CI; macOS runners may have different Gatekeeper / display-server behavior. v3.0 acceptance does not require CI per UI-S02 ADR's deferred-revisit note (no signing yet). |

### SPECULATIVE (left open, not blocking MB-T01)

| # | Question | Disposition |
|---|---|---|
| S1 | Will Electron's `app.quit()` always exit code 0, or are there teardown failure modes (orphan listeners, unfinished IPC) that produce non-zero exits? | Not exercised by spike's minimal main. Watch for in MB-T02+ when production main has more lifecycle attachments. |
| S2 | Does packaged-mode behavior change after code-signing / notarization (v3.x maintenance)? | Re-validate at signing-introduction time. |

## Decision

**Use dev-mode `electron <built-main.js>` for the MB-T01 Red criterion.** The
mechanics K1-K4 hold equivalently in both modes per K5; dev-mode is ~5× faster
on the spawn-to-ready phase (401 ms vs 2383 ms) and avoids requiring the
`pnpm package` step as a test prerequisite. The packaged-app smoke is
already separately covered by V3_TICKETS.md L106 acceptance criterion
(*"`pnpm --filter dispatch-workstation package` produces runnable .app"*).

**Quit channel: stdin-line `QUIT` (K3, deterministic exit code 0).** Not
SIGTERM (K4, non-deterministic shape). SIGKILL is reserved for cleanup-on-test-failure
safety net only.

**Window-ready signal: stdout `WINDOW_READY` sentinel** triggered from
`webContents.on('did-finish-load', ...)` in `main.ts`. Captured via
parent-process `child.stdout.on('data', ...)` accumulator with line
search. (K2.)

**Electron binary path: `packages/dispatch-workstation/node_modules/.bin/electron`.**
Resolved relative to the test file's `import.meta.url`. Tests must NOT resolve
to workspace-root `node_modules/.bin/electron` — that path does not exist
under pnpm install (K7).

### Recommended Red criterion test shape (concrete skeleton)

See `<spike>/results/evidence.md` § *Recommended Red criterion implementation*
for the full vitest source. Summary:

```ts
const child = spawn(ELECTRON_BIN, [MAIN_JS], { stdio: ['pipe','pipe','pipe'] });
// await stdout 'WINDOW_READY' sentinel (15 s timeout)
// child.stdin.write('QUIT\n')
// await child 'exit' event
// expect(exitInfo.code).toBe(0)
// test timeout: 30 s
```

### Corresponding `main.ts` requirements (for green commit MB-T01)

The green-commit `src/main/main.ts` must include:

1. `app.whenReady().then(() => createWindow())` — opens a `BrowserWindow`.
2. `win.webContents.on('did-finish-load', () => process.stdout.write('WINDOW_READY\n'))`
   — emits the test sentinel.
3. `process.stdin.on('data', chunk => { if (chunk.toString().trim() === 'QUIT') app.quit(); })`
   — accepts the in-band quit channel.
4. `app.on('window-all-closed', () => app.quit())` — defensive teardown.

Items 2 and 3 are test-instrumentation that ride along in the production
main.ts. They have negligible cost (single stdout write; single stdin
listener). Could be feature-flagged behind `process.env.MB_TEST_HOOKS`
later if undesired in production builds. **Out of scope for v3.0.**

## Consequences

### What this ADR commits MB-T01 to

- `red(MB-T01)` test file: `packages/dispatch-workstation/test/app-launches-clean.test.ts` per skeleton above.
- `green(MB-T01)` main.ts requirements 1-4 above.
- Test runtime: ~1.3 s per invocation (K8). Acceptable for `pnpm test`.
- No CI integration in v3.0 (deferred per UI-S02).

### What this ADR does NOT prescribe

- The packaging mechanism for `pnpm --filter dispatch-workstation package`.
  `@electron/packager` worked in this spike but is not the only option;
  `electron-builder` is the path UI-S02 ADR's "Update / distribution" axis
  cited (Sparkle integration). Green commit picks one.
- Renderer-process content. The Red test only validates window-rendered,
  not what the window contains. MB-T02 covers content (`test_dispatch_web_renders_in_shell`).
- Code signing / notarization. v3.0 ships unsigned per UI-S02.

### Halt-and-surface paths NOT taken

The operator's MB-S04 framing reserved a halt-and-surface for the case
*"V3_TICKETS.md MB-T01 Red criterion is intractable as-written."* That
case did not materialize: the criterion is fully tractable as evidenced
by 5/5 experiments. **No V3_TICKETS amendment needed.**

## References

- `packages/dispatch-workstation/spikes/MB-S04-vitest-electron-spawn/results/evidence.md`
  — full measurements + recommended Red-criterion source code
- `packages/dispatch-workstation/spikes/MB-S04-vitest-electron-spawn/test/spawn-observe.test.mjs`
  — the 5 experiments (executable)
- `docs/adr/UI-S02-menubar-framework.md` — Electron locked 2026-04-23 (KNOWN baseline)
- `docs/build-docs/V3_TICKETS.md` L104, L106 — MB-T01 Red + Acceptance criteria
- `CONDUCTOR_API_CONTRACT.md` §10.5 — self-check schema

## Self-check (CONDUCTOR_API_CONTRACT.md §10.5)

1. **Is the API I called verified by a spike in this repo?** yes — this ADR *is* the spike artifact; `node:child_process.spawn` against `electron` binary verified directly via 5 vitest experiments.
2. **Does my test exercise behavior, or my mocks?** behavior — spawned real Electron 41.3.0 binary in both dev and packaged modes; no mocks.
3. **If implementation deleted, would test still pass?** no — tests exercise the throwaway `src/main.mjs` (and packaged-app/main.mjs); deletion would fail S-04-01 with ENOENT or `did-finish-load` would never fire.
4. **Did I add anything outside this contract's specification?** no — spike scoped to operator's MB-S04 framing (vitest-orchestrated spawn; packaged .app launch; signal handling for clean quit). No production code added; spike artifacts only.
5. **Did I modify this contract without operator approval?** no.
6. **Is any claim in my commit body unlabeled?** no — KNOWN (K1-K8), MODELED (M1-M2), SPECULATIVE (S1-S2) labels applied throughout.
7. **Did this commit touch any file the other parallel session might also modify?** no — spike is self-contained at `packages/dispatch-workstation/spikes/MB-S04-vitest-electron-spawn/` + this ADR file. No overlap with COARCH-T01 / dispatch-conductor paths.
8. **Does this commit change session state via direct registry write, bypassing PATCH /v2/sessions/:name/state?** no — n/a (spike commit; no daemon endpoint exercise).
9. **Did I do work during a halt state that wasn't explicitly authorized?** no — operator's "Begin MB-S04" message of 2026-04-30 explicitly authorized this spike.
