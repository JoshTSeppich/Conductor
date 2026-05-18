// esbuild script for the MB-T-MVP-W4 topbar mount bundle.
// Entry: src/topbar/mount.ts → dist/topbar/renderer.js
//
// Mirrors scripts/build-conductor-chat.mjs verbatim. The mount.ts entry
// auto-mounts <Topbar /> as a body-level fixed-position overlay on
// DOMContentLoaded, subscribes to window.orchestratorStateBridge for
// live state, and re-renders on each Channel #9 broadcast.
//
// Closes MB-F-MVP-W1-EXP2-BUILD-SCRIPT-CHAIN-WIRING-PENDING (row 396)
// topbar-half + MB-F-MVP-W1-EXP2-MOUNT-WIRING-PENDING (row 397) topbar-
// half at WB-final.

import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/topbar'), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/topbar/mount.ts')],
  bundle: true,
  outfile: resolve(PKG_ROOT, 'dist/topbar/renderer.js'),
  platform: 'browser',
  target: 'chrome130',
  jsx: 'automatic',
  minify: false,
  logLevel: 'info',
});

console.log('TOPBAR_BUILD_COMPLETE');
