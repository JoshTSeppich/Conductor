// MB-T13 WB8: esbuild script for the audit-modal renderer bundle.
//
// Mirrors scripts/build-onboarding.mjs (but does NOT ship a separate
// sandboxed preload — the audit-modal BrowserWindow reuses the main
// preload.mts at v3.0 per WB8 minimum-scope design; least-privilege
// audit-modal preload deferred as future-work if needed).
//
// Outputs:
//   1. dist/audit-modal/renderer.js — React mount entry, browser target
//   2. dist/audit-modal/audit-modal.html — copied from src/audit-modal/

import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/audit-modal'), { recursive: true });

// 1. Renderer bundle (React mount entry).
await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/audit-modal/mount.tsx')],
  bundle: true,
  outfile: resolve(PKG_ROOT, 'dist/audit-modal/renderer.js'),
  platform: 'browser',
  target: 'chrome130',
  jsx: 'automatic',
  minify: false,
  logLevel: 'info',
});

// 2. HTML copy (source-of-truth in src/, dist/ is build output).
await copyFile(
  resolve(PKG_ROOT, 'src/audit-modal/audit-modal.html'),
  resolve(PKG_ROOT, 'dist/audit-modal/audit-modal.html'),
);

console.log('AUDIT_MODAL_BUILD_COMPLETE');
