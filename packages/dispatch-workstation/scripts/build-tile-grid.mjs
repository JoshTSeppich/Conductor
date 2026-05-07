// esbuild script for the MB-T12 tile-grid renderer bundle.
// Entry: src/tile-grid/mount.ts → dist/tile-grid/renderer.js
//
// Mirrors scripts/build-console-panel.mjs (CONSOLE-T03 precedent):
// platform:browser, target:chrome130 (Electron 41 bundled Chromium), jsx:automatic
// (React 18 new transform; no React import needed in TSX), bundle:true.
//
// No HTML or CSS copy: tile-grid mounts into #tile-grid-root inside the
// existing workstation-shell.html (WB12 wires the script + region rewire).
// xterm.css is consumed by per-tile ConsolePanel children; that load path
// is finalized at WB12 when the shell HTML is updated.
//
// Bundle-size concern (R-MBT12-1): this bundle re-bundles react/react-dom
// alongside the console-panel bundle, doubling first-load weight. Mitigation
// deferred to MB-F-T12-BUNDLE-SHARED-CHUNK-DEDUP (Tier 2) per WB14.
import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/tile-grid'), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/tile-grid/mount.ts')],
  bundle: true,
  outfile: resolve(PKG_ROOT, 'dist/tile-grid/renderer.js'),
  platform: 'browser',
  target: 'chrome130',
  jsx: 'automatic',
  minify: false,
  logLevel: 'info',
});

console.log('TILE_GRID_BUILD_COMPLETE');
