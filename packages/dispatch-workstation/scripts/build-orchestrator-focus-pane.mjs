// esbuild script for the MB-T-MVP-W1 orchestrator-focus-pane renderer bundle.
// Entry: src/orchestrator-focus-pane/mount.ts → dist/orchestrator-focus-pane/renderer.js
//
// Mirrors scripts/build-tile-grid.mjs (MB-T12 precedent):
// platform:browser, target:chrome130 (Electron 41 bundled Chromium), jsx:automatic
// (React 18 new transform; no React import needed in TSX), bundle:true.
//
// Per Q-MVP-W1-6=(c) operator ack: the bundle attaches via an overlay div it
// creates itself at runtime (mount.ts:DEFAULT_AUTO_MOUNT_ROOT_ID), so the
// READ-ONLY workstation-shell.html does NOT need an additional script tag /
// anchor div for the overlay strategy to function.
//
// R-MVP-W1-R1: package.json `build` script chain is NOT (yet) amended to
// invoke this script — per operator R1=defer ack 17:55 MDT. Either operator
// amends the manifest to permit a tsconfig+package.json edit OR this script
// is invoked manually for runtime smoke. Tracked at WB-final as Tier-2
// MB-F-MVP-W1-BUILD-SCRIPT-CHAIN-WIRING-PENDING.

import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/orchestrator-focus-pane'), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/orchestrator-focus-pane/mount.ts')],
  bundle: true,
  outfile: resolve(PKG_ROOT, 'dist/orchestrator-focus-pane/renderer.js'),
  platform: 'browser',
  target: 'chrome130',
  jsx: 'automatic',
  minify: false,
  logLevel: 'info',
});

console.log('ORCHESTRATOR_FOCUS_PANE_BUILD_COMPLETE');
