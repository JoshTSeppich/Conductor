# MB-S05: esbuild + React + Electron Renderer Spike

**Date:** 2026-04-30  
**Session:** Pre-flight for Round 2 Session D (COARCH-T02)  
**Contract ref:** `docs/parallel-cairn-round-2-contract.md` §5 (frozen 2026-04-30)

## Purpose

Validates the assumed integration pattern for Session D's React renderer build pipeline before the dep-installation commit lands. Finding #55 territory: the contract §5.5 assumption that "esbuild + React + Electron renderer works" is MODELED, not KNOWN. This spike makes it KNOWN or surfaces the actual working pattern.

## What this spike validates

### KNOWN (if experiments pass)

- esbuild standalone compiles React 18 TSX → browser bundle without errors
- `jsx: 'automatic'` resolves `react/jsx-runtime` correctly (React 17+ transform)
- `platform: 'browser'` + `target: 'chrome130'` produces valid output for Electron 41 renderer
- Electron `BrowserWindow.loadFile()` loads a `file://` HTML that references a bundled JS
- React 18 `createRoot().render()` executes in a sandboxed renderer (`sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`)
- `webContents.on('console-message')` surfaces renderer `console.log()` to the main process stdout — valid sentinel channel for harness assertions
- stdin QUIT → `app.quit()` → exit code 0 (MB-S04 K3 pattern holds for this architecture)

### MODELED (extrapolated, not directly validated in this spike)

- esbuild `--watch` mode can trigger incremental rebuilds on file-change. Not tested end-to-end; tested only that build pipeline is idempotent across multiple runs (E5).
- Electron auto-reload when renderer bundle changes requires additional wiring beyond esbuild standalone. Options: `electron-reload` package or `mainWindow.webContents.reloadIgnoringCache()` called from a main-process file watcher. Not in scope for Session D's frozen exports.
- Production Session D files will live in `src/coarchitect/` not `src/renderer/`. The path difference is cosmetic; the same build pipeline applies.

### SPECULATIVE (unverified, not blocking Session D)

- Behavior with code-signing / notarization (v3.x maintenance — out of scope for v3.0).
- Whether `window.coarchitectBridge` (Pattern B, RESOLUTION-3) is accessible immediately on React mount vs. after `DOMContentLoaded`. Session D's tests mock the bridge directly; Zipper-2 validates the live bridge.

## Experiments

| # | Experiment | Sentinel / Evidence |
|---|---|---|
| E1 | esbuild bundles React TSX without errors | `dist/renderer/index.js` exists, size > 0, contains 'react' string |
| E2 | Electron loads `file://` HTML | `WINDOW_READY` on stdout within 15 s |
| E3 | React mounts in sandboxed renderer | `RENDER_OK` on stdout (via `console-message` event) |
| E4 | Full cycle exits 0 | exit code 0 after stdin `QUIT` |
| E5 | esbuild rebuild is idempotent | Second `node build.mjs` succeeds |

## Running

```bash
cd packages/dispatch-workstation/spikes/MB-S05-esbuild-react-electron
chmod +x run.sh
./run.sh
```

The script installs its own `node_modules` via `npm install` (isolated from the workspace),
builds, and runs the Electron harness. Parent `package.json` is not touched.

## File map

```
src/main/main.ts          — spike Electron main process (NOT the production main.ts)
src/renderer/index.tsx    — React component emitting RENDER_OK sentinel
src/renderer/index.html   — HTML with #root div, loads ./index.js (relative to dist/)
build.mjs                 — esbuild build script (E1)
harness.mjs               — Electron spawn-and-observe harness (E2/E3/E4)
run.sh                    — orchestrator (all 5 experiments)
```

## ADR

`docs/adr/MB-S05-esbuild-react-electron-renderer.md`
