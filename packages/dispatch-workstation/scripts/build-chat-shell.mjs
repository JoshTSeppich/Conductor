// MB-T20 WB1 — esbuild script for chat-shell renderer bundle.
// Mirrors scripts/build-coarchitect.mjs flags per MB-S05 ADR.
// Entry: src/chat-shell/mount.ts → dist/chat-shell/renderer.js
// Standalone HTML harness deferred — chat-shell mounts directly into
// workstation-shell.html#root via line-555 swap at WB4 (Q-MBT20-4=a).
import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/chat-shell'), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/chat-shell/mount.ts')],
  bundle: true,
  outfile: resolve(PKG_ROOT, 'dist/chat-shell/renderer.js'),
  platform: 'browser',
  target: 'chrome130',
  jsx: 'automatic',
  minify: false,
  logLevel: 'info',
});

console.log('BUILD_COMPLETE');
