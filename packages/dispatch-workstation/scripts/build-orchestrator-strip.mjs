// esbuild script for the MB-T-MVP-W4 orchestrator-strip mount bundle.
// Entry: src/orchestrator-strip/mount.ts → dist/orchestrator-strip/renderer.js
//
// Mirrors scripts/build-conductor-chat.mjs verbatim. The mount.ts entry
// auto-mounts <OrchestratorStrip /> as a body-level fixed-position
// overlay on DOMContentLoaded, subscribes to window.orchestrator-
// StateBridge for live state, derives ProgressBar/SlotGrid/throughput
// props renderer-side per §6.6 derived-fields contract, and re-renders
// on each Channel #9 broadcast.

import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/orchestrator-strip'), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/orchestrator-strip/mount.ts')],
  bundle: true,
  outfile: resolve(PKG_ROOT, 'dist/orchestrator-strip/renderer.js'),
  platform: 'browser',
  target: 'chrome130',
  jsx: 'automatic',
  minify: false,
  logLevel: 'info',
});

console.log('ORCHESTRATOR_STRIP_BUILD_COMPLETE');
