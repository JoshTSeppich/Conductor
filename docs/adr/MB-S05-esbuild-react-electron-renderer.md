# ADR MB-S05: esbuild + React + Electron renderer integration pattern

- **Status:** KNOWN — 5/5 spike experiments pass (see Evidence section)
- **Date:** 2026-04-30
- **Session:** MB-S05 (spike) — pre-flight for Round 2 Session D (COARCH-T02)
- **Ticket:** MB-S05 (spike) — informs COARCH-T02 (Session D frozen exports §5, contract §5.5)
- **Cites:** `docs/parallel-cairn-round-2-contract.md` §5 (frozen 2026-04-30); Finding #55 (frozen-contract-verification primitive); MB-S04 ADR (spawn-and-observe K1–K3 re-confirmed)

## Context

Round 2 contract §5.5 resolves React dependency strategy as "RESOLUTION-1: operator commits a `chore:` dep-addition commit before sessions launch, adding `react`, `react-dom`, `@types/react`, `@types/react-dom`, and the renderer build tooling to `packages/dispatch-workstation/package.json`." The operator acknowledged at contract review that the esbuild + Electron + React integration pattern is **MODELED, not KNOWN** in this repository — finding #55 territory.

What was unverified before this spike:

- (SPECULATIVE before E1) Whether esbuild `jsx: 'automatic'` resolves React 18's `react/jsx-runtime` correctly without a bundler plugin or webpack.
- (SPECULATIVE before E2) Whether `BrowserWindow.loadFile()` works with a `file://` HTML referencing a bundled JS, in Electron 41 with `sandbox: true` + `contextIsolation: true`.
- (SPECULATIVE before E3) Whether React 18 `createRoot().render()` executes in a renderer process with `sandbox: true` (no Node.js APIs) and `contextIsolation: true`.
- (SPECULATIVE before E3) Whether `webContents.on('console-message')` reliably surfaces renderer `console.log()` to the main process for sentinel assertion.
- (SPECULATIVE before E4) Whether the MB-S04 K3 stdin-QUIT → exit-0 pattern holds in this more complex architecture (React-rendering renderer).
- (SPECULATIVE before E5) Whether esbuild rebuild produces updated output without errors on repeated invocation.

This spike answers all six.

## Evidence

**Platform:** darwin-arm64. Node v20.19.6, npm 10.9.2, Electron 41.3.0, esbuild 0.25.4, React 18.3.1.

**Spike location:** `packages/dispatch-workstation/spikes/MB-S05-esbuild-react-electron/`

**Run command:** `cd packages/dispatch-workstation/spikes/MB-S05-esbuild-react-electron && ./run.sh`

```
=== Step 2: E1 — esbuild build ===
  dist/renderer/index.js  1.0mb ⚠️   ← unminified dev build
  ⚡ Done in 41ms
  dist/main/main.js  1.2kb
  ⚡ Done in 1ms
BUILD_COMPLETE
✓ E1: dist/renderer/index.js exists (1098741 bytes)
✓ E1: bundle contains 'react' — jsx:automatic transform resolved react/jsx-runtime

=== Step 3: E5 — rebuild pipeline check ===
✓ E5: Second build run succeeds (1098741 bytes) — esbuild rebuild is idempotent

=== Step 4: E2/E3/E4 — Electron spawn-and-observe harness ===
[e-stderr] (electron) 'console-message' arguments are deprecated and will be removed.
           Please use Event<WebContentsConsoleMessageEventParams> object instead.
[e-stdout] RENDER_OK
[e-stdout] WINDOW_READY
✓ E2: WINDOW_READY (1099ms) — file:// HTML loaded in BrowserWindow
✓ E3: RENDER_OK (0ms after WINDOW_READY) — React mounted in sandboxed renderer
✓ E4: Exit code 0 (198ms after QUIT) — deterministic clean exit
✓ E4: Full cycle: spawn→WINDOW_READY=1099ms, →RENDER_OK=1099ms, →exit=1297ms
HARNESS_PASS

================================================================
MB-S05: ALL EXPERIMENTS PASS
================================================================
```

**Timing summary:**

| Phase | MB-S05 (React bundle, file://) | MB-S04 baseline (data: URL) |
|---|---|---|
| spawn → WINDOW_READY | 1099 ms (warm), 3001 ms (cold) | 401 ms |
| WINDOW_READY → RENDER_OK | ~0 ms (same buffer chunk) | n/a |
| QUIT → exit 0 | 198–616 ms | 895 ms |
| Full cycle | ~1.3 s (warm) | ~1.3 s |

Cold-start delta (~2.6 s extra) is 1 MB JS parse overhead. Warm-start is comparable to MB-S04 (~1.3 s). Both well within vitest's 30 s timeout.

## KNOWN findings (validated this spike)

| # | Finding | Citation |
|---|---|---|
| K1 | esbuild `jsx: 'automatic'` compiles React 18 TSX with no plugin. Resolves `react/jsx-runtime` automatically (React 17+ new JSX transform). No `import React from 'react'` required. | E1 pass; `build.mjs` L13 |
| K2 | `platform: 'browser'`, `target: 'chrome130'`, `bundle: true` produces a valid browser bundle (1.0 MB unminified) that Electron 41's Chromium 130 renderer executes without error. | E1 + E3 pass |
| K3 | `BrowserWindow.loadFile(absolutePath)` successfully loads a `file://` HTML in Electron 41. The HTML's `<script src="./index.js">` resolves relative to the HTML's directory — works because esbuild places both `index.html` and `index.js` in the same `dist/renderer/` directory. | E2 pass; `src/main/main.ts` L21, `build.mjs` L24 |
| K4 | React 18 `createRoot().render()` executes correctly in a renderer with `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`. esbuild bundles React inline — no `require()` call reaches the sandboxed renderer. | E3 pass; `src/renderer/index.tsx` L18–20 |
| K5 | `webContents.on('console-message')` surfaces renderer `console.log()` to the main process. Arrival order: RENDER_OK (from `useEffect`) arrives in the same stdout flush as WINDOW_READY (from `did-finish-load`). Harness correctly detects both via buffer accumulation regardless of IPC ordering. | E3 pass; `harness.mjs` sentinel logic; observed ordering in Evidence section |
| K6 | **`console-message` argument deprecation (Electron 41):** The positional-argument listener form `(event, level, message, ...)` is deprecated. Electron emits a warning: *"'console-message' arguments are deprecated and will be removed. Please use Event<WebContentsConsoleMessageEventParams> object instead."* Spike harness still functions but production code must use the Event-object form. | E3 pass with stderr warning; `harness.mjs` L39 |
| K7 | stdin QUIT → `app.quit()` → exit code 0 holds in this architecture (React-rendered BrowserWindow with file:// load). MB-S04 K3 extrapolates correctly. | E4 pass; `src/main/main.ts` L37–41 |
| K8 | esbuild rebuild is idempotent: second invocation of `node build.mjs` succeeds, produces identical byte count. Build pipeline is safe to call on every code change. | E5 pass |
| K9 | Spike-local electron binary installs correctly via `npm install` in the spike directory, isolated from the parent workspace. Binary at `node_modules/.bin/electron`. | install step + harness invocation |

## MODELED findings (extrapolated, not directly observed)

| # | Claim | Why MODELED |
|---|---|---|
| M1 | esbuild `--watch` mode triggers incremental rebuilds on file-change. Build pipeline can be used for a continuous dev-rebuild loop. | Not tested end-to-end; E5 validates idempotent rebuild only, not file-watch trigger. esbuild `--watch` is documented behavior not validated in this spike. |
| M2 | True hot-reload (Electron reloads the renderer when bundle changes) requires additional wiring. esbuild standalone does NOT trigger Electron reload. Options: `electron-reload` package or `mainWindow.webContents.reloadIgnoringCache()` called from a main-process file watcher on `dist/renderer/index.js` change. | Not tested. esbuild's responsibility ends at writing the output file. Electron's BrowserWindow does not monitor the file system for changes automatically. |
| M3 | Production Session D files in `src/coarchitect/` (e.g., `chat-panel.tsx`, `mount.ts`) compile and run identically to the spike's `src/renderer/index.tsx`. The path difference is cosmetic; the same esbuild flags apply. | Not directly tested. Spike uses `src/renderer/` for isolation; production uses `src/coarchitect/`. No mechanism in esbuild cares about the source path name. |
| M4 | `window.coarchitectBridge.*` (Pattern B, RESOLUTION-3) is accessible from the React component immediately after mount when Zipper-2 wires `preload.ts`. Session D's tests mock the bridge directly; this spike does not exercise the contextBridge/IPC path. | Not tested. Session D's `DaemonClient` interface is injected at mount time (directly from `createStubDaemonClient()`), not via bridge. Zipper-2 owns the bridge wiring. |

## SPECULATIVE (left open, not blocking Session D)

| # | Question | Disposition |
|---|---|---|
| S1 | Build size: the unminified React bundle is 1.0 MB. Production may want `minify: true` for shipping. | Out of scope for Round 2 scaffold; deferred. |
| S2 | Whether code-signing / notarization changes file:// loading behavior (v3.x maintenance). | Re-validate at signing-introduction time per MB-S04 S2. |
| S3 | `useEffect` ordering vs. `did-finish-load` across Electron versions. The spike observes RENDER_OK arriving at the same time as WINDOW_READY. This ordering is reliable enough for buffer-based sentinel detection but should not be assumed stable if sentinel ordering is made strict. | Acceptable for Round 2 testing. Harness uses buffer accumulation (K5), not strict ordering. |

## Recommended Session D production patterns

### Build script (`build.mjs` or equivalent)

```js
import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist/coarchitect', { recursive: true });

// Renderer bundle: chat-panel.tsx + mount.ts entry
await esbuild.build({
  entryPoints: ['src/coarchitect/mount.ts'],  // mount.ts imports chat-panel.tsx
  bundle: true,
  outfile: 'dist/coarchitect/renderer.js',
  platform: 'browser',
  target: 'chrome130',       // Electron 41 Chromium version
  jsx: 'automatic',          // React 18 new JSX transform
  minify: false,             // enable for production
  logLevel: 'info',
});

await copyFile('src/coarchitect/chat-panel.html', 'dist/coarchitect/chat-panel.html');
```

HTML ref: `<script src="./renderer.js"></script>` (relative to `dist/coarchitect/` where both files land).

### BrowserWindow loading (Zipper-2 territory)

```ts
// In Zipper-2's main.ts addition (NOT Session D territory):
import { resolve } from 'node:path';
const CHAT_HTML_PATH = resolve(__dirname, '../coarchitect/chat-panel.html');
chatWindow.loadFile(CHAT_HTML_PATH);
```

### console-message sentinel (production form — avoids deprecation warning)

```ts
// Use Event object form (K6 — positional args are deprecated in Electron 41):
mainWindow.webContents.on('console-message', (event) => {
  if (event.message === 'RENDER_OK') {
    process.stdout.write('RENDER_OK\n');
  }
});
```

### `mount.ts` entry point

Session D's `mountChatPanel()` mounts with `createRoot()` — same pattern as spike:

```ts
import { createRoot } from 'react-dom/client';
import { ChatPanel } from './chat-panel.js';
import type { ChatPanelMountOptions } from './mount.js';

export function mountChatPanel(opts: ChatPanelMountOptions): () => void {
  const rootEl = document.getElementById(opts.rootElementId);
  if (!rootEl) throw new Error(`#${opts.rootElementId} not found`);
  const root = createRoot(rootEl);
  root.render(<ChatPanel daemonClient={opts.daemonClient} />);
  return () => root.unmount();
}
```

### Operator `chore:` dep-addition (confirmed required deps)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "esbuild": "^0.25.0"
  }
}
```

Note: `typescript` not required if esbuild handles all transpilation. If `tsc --noEmit` typecheck is desired for CI, add `typescript` to devDependencies separately.

## Decision

**KNOWN: esbuild + Electron + React works as assumed. Session D can proceed with frozen exports as drafted in contract §5.**

The five integration steps are validated:
1. esbuild bundles `src/renderer/index.tsx` → `dist/renderer/index.js` — **KNOWN (K1, K2)**
2. HTML at `dist/renderer/index.html` loads the bundled JS via relative `<script>` — **KNOWN (K3)**
3. `main.ts` BrowserWindow loads `file://dist/renderer/index.html` via `loadFile()` — **KNOWN (K3)**
4. React 18 renders into `#root` in a sandboxed renderer — **KNOWN (K4)**
5. Hot rebuild on src change: esbuild can rebuild (K8); Electron does not auto-reload without additional wiring — **K8 KNOWN + M2 MODELED**

One action before Session D launches: the operator `chore:` dep-addition commit (RESOLUTION-1, §5.5) must include `react`, `react-dom`, `@types/react`, `@types/react-dom`, and `esbuild` at the versions confirmed above (React 18.3.1+, esbuild 0.25.x).

One production-code note: the `console-message` event positional-argument listener form is deprecated in Electron 41. Session D's tests use jsdom (not Electron spawn), so this does not directly affect the test harness. If any test or main-process code uses `webContents.on('console-message', (event, level, message) => ...)`, it must be updated to the Event-object form (K6).

## Consequences

### What this ADR commits Session D to

- Build entry: `src/coarchitect/mount.ts` → `dist/coarchitect/renderer.js` (esbuild with flags per Recommended Patterns above)
- HTML entry: `src/coarchitect/chat-panel.html` → copy to `dist/coarchitect/chat-panel.html` at build time
- No `import React from 'react'` needed in `.tsx` files — `jsx: 'automatic'` handles it
- React 18 `createRoot` API (not legacy `ReactDOM.render`)
- `mountChatPanel()` returns an unmount function (session D contract §5.4, confirmed compatible with `root.unmount()`)

### What this ADR does NOT prescribe

- Whether the chat panel lives in a separate BrowserWindow or bottom drawer (OPEN-Q-ZIPPER-1 — Zipper-2 territory)
- Hot-reload DX wiring (out of scope for Session D frozen exports)
- Production minification (out of scope for Round 2 scaffold)

### Halt-and-surface paths NOT taken

No experiment failed. No unexpected behavior blocked the spike. The deprecation warning (K6) is noted and a production-safe alternative is specified. **No contract amendment needed.**

## References

- `packages/dispatch-workstation/spikes/MB-S05-esbuild-react-electron/` — spike artifacts (run.sh, harness.mjs, build.mjs, src/)
- `docs/parallel-cairn-round-2-contract.md` §5 — Session D frozen exports (validated against)
- `docs/adr/MB-S04-vitest-electron-spawn.md` — K1–K3 spawn-and-observe pattern (re-confirmed K7)
- `docs/cairn-findings.md` #55 — frozen-contract-verification primitive (this spike is an application of it)
- `docs/build-docs/V3_TICKETS.md` L163–L170 — COARCH-T02 acceptance criteria
- `CONDUCTOR_API_CONTRACT.md` §10.5 — self-check schema

## Self-check (CONDUCTOR_API_CONTRACT.md §10.5)

1. **Is the API I called verified by a spike in this repo?** yes — this ADR *is* the spike artifact; esbuild + BrowserWindow.loadFile + React 18 + console-message sentinel all directly exercised via 5 experiments.
2. **Does my test exercise behavior, or my mocks?** behavior — spawned real Electron 41.3.0 binary, executed a real esbuild bundle, observed real React mount via console sentinel. No mocks.
3. **If implementation deleted, would test still pass?** no — harness.mjs spawns `dist/main/main.js` and asserts file-system artifacts from build.mjs; deletion of either would fail E1 or E2/E3/E4.
4. **Did I add anything outside this contract's specification?** no — spike scoped to operator's MB-S05 framing. No production code added. One finding outside original 5 experiments: K6 (console-message deprecation) — surfaced from stderr observation, not invented.
5. **Did I modify this contract without operator approval?** no.
6. **Is any claim in my commit body unlabeled?** no — KNOWN (K1–K9), MODELED (M1–M4), SPECULATIVE (S1–S3) labels applied throughout.
7. **Did this commit touch any file the other parallel session might also modify?** no — spike is self-contained at `packages/dispatch-workstation/spikes/MB-S05-esbuild-react-electron/` + this ADR. Sessions B and C are main-process territory; no overlap.
8. **Does this commit change session state via direct registry write, bypassing PATCH /v2/sessions/:name/state?** no — n/a (spike commit; no daemon endpoint exercise).
9. **Did I do work during a halt state that wasn't explicitly authorized?** no — operator ACK'd MB-S05 plan before implementation began (2026-04-30).
