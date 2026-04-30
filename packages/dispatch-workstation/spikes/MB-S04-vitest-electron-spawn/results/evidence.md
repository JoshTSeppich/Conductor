# MB-S04 — vitest-spawn-and-observe Electron evidence

Run date: 2026-04-30. Tooling: Node v20.19.6, pnpm v10.33.0, vitest v4.1.5,
Electron v41.3.0, @electron/packager (latest, npx-resolved). Platform:
darwin-arm64.

## Spike question

Can vitest orchestrate spawn-and-observe of an Electron application — both
dev-mode (`electron <main.mjs>`) and packaged `.app` — to satisfy the
MB-T01 Red criterion: *"spawn built app, assert process starts, window
appears, exits cleanly on quit"* (V3_TICKETS.md L104)?

## Result: Yes — both modes tractable. 5/5 experiments pass.

```
 ✓ S-04-01: spawn electron + main.mjs, observe SPIKE_READY on stdout    448ms
 ✓ S-04-02: SIGTERM triggers clean exit (code 0)                        1482ms
 ✓ S-04-03: stdin "QUIT" line triggers clean exit (code 0)              1290ms
 ✓ S-04-05: packaged .app spawn-and-observe                             2632ms
 ✓ S-04-04: full cycle timing                                           1297ms
 Test Files  1 passed (1)
      Tests  5 passed (5)
   Duration  7.15s
```

## Timing measurements

| Phase | Dev-mode (`electron <main.mjs>`) | Packaged `.app` |
|---|---|---|
| spawn → window-ready (stdout sentinel) | 401 ms | 2383 ms |
| window-ready → process-exit (after stdin "QUIT") | 895 ms | 245 ms |
| **Total cycle** | **~1.3 s** | **~2.6 s** |
| Vitest test duration (incl. setup/teardown) | ~1.3-1.5 s | ~2.6 s |

Packaged `.app` cold-start is ~6× slower than dev-mode spawn (Electron
runtime + framework load from disk). Exit phase is faster in packaged
mode — likely because the packaged binary keeps fewer dev-mode
diagnostic listeners alive.

## Quit-signal mechanisms tested

| Mechanism | Behavior | Recommendation |
|---|---|---|
| `child.kill('SIGTERM')` | Either exit code 0 (handler runs) OR null + signal SIGTERM (kernel kill before handler). Both are "clean" but non-deterministic. | Use as cleanup safety net only. |
| `child.stdin.write('QUIT\n')` + `process.stdin` listener in main | Deterministic exit code 0. In-band channel, survives across modes. | **Primary quit channel for the Red criterion.** |
| `app.quit()` triggered by `window-all-closed` | Yes, via window.close() from renderer or main. Adds renderer round-trip. | Secondary; not used in spike (window stays open during test). |

## stdout-sentinel ready signal

`win.webContents.on('did-finish-load', () => process.stdout.write('SPIKE_READY\n'))`
proved reliable in both modes. The sentinel arrives on the spawned
child's stdout stream, captured by the parent vitest process via standard
`spawn` `stdio: ['pipe', 'pipe', 'pipe']`.

## .app packaging tooling

`@electron/packager` (npm-org-renamed `electron-packager`) packages a
minimal Electron app in **8.4 seconds** on darwin-arm64. Output bundle
size: **263 MB** (.app), 281 MB (parent dir incl. licenses/notices).

`npx --yes @electron/packager <source-dir> <output-name> --platform=darwin
--arch=arm64 --out=<out-dir> --overwrite --electron-version=<version>`

Reproduce:
```
cd packages/dispatch-workstation/spikes/MB-S04-vitest-electron-spawn
npx --yes @electron/packager packaged-app MB-S04-target \
  --platform=darwin --arch=arm64 \
  --out=results/packaged-out --overwrite \
  --electron-version=$(node -p "require('../../node_modules/electron/package.json').version")
```

Note: invoking the packaged binary directly (`<App>.app/Contents/MacOS/<binary-name>`)
bypasses LaunchServices Gatekeeper UX prompts that `open -a` would
trigger. This is what the test exercises.

## Path resolution finding (KNOWN)

The Electron binary is at `packages/dispatch-workstation/node_modules/.bin/electron`
under pnpm — **not hoisted to workspace-root `node_modules/.bin/`**. Initial
spike attempt resolved to repo-root path and failed with ENOENT. Tests
must resolve from the consumer package's `node_modules`.

Confirmed via:
```
$ ls /…/foxworks-dispatch/node_modules/.bin/electron
ls: ... No such file
$ ls /…/foxworks-dispatch/packages/dispatch-workstation/node_modules/.bin/electron
-rwxr-xr-x@ 1 ... 1110 ...
```

## Recommended Red criterion implementation (MB-T01)

```ts
// test/app-launches-clean.test.ts
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');

describe('MB-T01 app launches clean', () => {
  it('spawns Electron, opens BrowserWindow, exits cleanly on QUIT', async () => {
    const child = spawn(ELECTRON_BIN, [MAIN_JS], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    // Await window-ready sentinel
    await new Promise((resolveP, rejectP) => {
      const t = setTimeout(() => rejectP(new Error('timeout')), 15000);
      child.stdout.on('data', () => {
        if (stdout.includes('WINDOW_READY')) {
          clearTimeout(t);
          resolveP();
        }
      });
    });

    // Trigger clean quit
    child.stdin.write('QUIT\n');
    const exitInfo = await new Promise((resolveP, rejectP) => {
      const t = setTimeout(() => rejectP(new Error('quit timeout')), 10000);
      child.once('exit', (code, signal) => {
        clearTimeout(t);
        resolveP({ code, signal });
      });
    });

    expect(exitInfo.code, `stderr=${stderr}`).toBe(0);
  }, 30000);
});
```

Corresponding `main.ts` requirements (for green commit):
- `app.whenReady().then(() => createWindow())` opens a `BrowserWindow`
- `win.webContents.on('did-finish-load', () => process.stdout.write('WINDOW_READY\n'))`
- `process.stdin.on('data', (chunk) => { if (chunk.toString().trim() === 'QUIT') app.quit(); })`
- `app.on('window-all-closed', () => app.quit())` (defensive)

## What this spike does NOT cover (deferred / out-of-scope)

- **Code signing / notarization.** v3.0 ships unsigned per UI-S02 ADR
  deferred-revisit note. MB-T01 acceptance does not require signing.
- **Packaged-mode in CI.** macOS GitHub Actions runners may behave
  differently re: Gatekeeper / LaunchServices. Local-mac dev is the
  only validated environment.
- **Headless mode.** Electron's `--headless` flag disables BrowserWindow
  rendering entirely; defeats the test. Window will visually pop briefly
  during test. Acceptable — vitest tests run on the developer's machine,
  not CI for v3.0.
- **Window-content assertions.** Test only validates window-rendered,
  not what the window contains. MB-T02 (`test_dispatch_web_renders_in_shell`)
  covers content assertions.

## What's in this spike's git footprint

Committed:
- `src/main.mjs` — minimal Electron entry (throwaway; not the production
  main.ts)
- `test/spawn-observe.test.mjs` — vitest experiments
- `vitest.config.mjs` — spike-local vitest config
- `run.sh` — operator runner
- `packaged-app/{main.mjs,package.json}` — minimal package-target source
  for `@electron/packager`
- `results/{evidence.md,run-output.txt}` — this file + raw vitest output
- `README.md` — spike intent + repro steps
- `.gitignore` — excludes node_modules/, results/packaged-out/

NOT committed (see .gitignore):
- `node_modules/` — created by `npx --yes @electron/packager`; transient
- `results/packaged-out/` — 281 MB packaged .app; reproducible via run.sh
