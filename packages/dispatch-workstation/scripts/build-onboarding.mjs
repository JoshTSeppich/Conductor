// MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT — esbuild script for the
// onboarding renderer + sandboxed preload bundles.
//
// Mirrors scripts/build-console-panel.mjs (renderer) +
// scripts/build-preload.mjs (CJS preload). Two outputs:
//   1. dist/onboarding/renderer.js — React mount entry, browser target
//   2. dist/main/preload-onboarding.cjs — sandboxed preload, CJS target
// Plus an onboarding.html copy (source-of-truth in src/onboarding/).
//
// Why a dedicated preload (not preload.mts): least-privilege. The
// onboarding window only needs onboardingBridge.saveApiKey + .complete;
// it does not need kanban / spawn / coarchitect / console bridges that
// the main shell's preload exposes. Keeping them separate means a
// compromised onboarding renderer cannot reach daemon-touching invoke
// paths.
import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/onboarding'), { recursive: true });
await mkdir(resolve(PKG_ROOT, 'dist/main'), { recursive: true });

// 1. Renderer bundle (React mount entry).
await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/onboarding/mount.tsx')],
  bundle: true,
  outfile: resolve(PKG_ROOT, 'dist/onboarding/renderer.js'),
  platform: 'browser',
  target: 'chrome130',
  jsx: 'automatic',
  minify: false,
  logLevel: 'info',
});

// 2. HTML copy (source-of-truth in src/, dist/ is build output).
await copyFile(
  resolve(PKG_ROOT, 'src/onboarding/onboarding.html'),
  resolve(PKG_ROOT, 'dist/onboarding/onboarding.html'),
);

// 3. Sandboxed preload bundle (CJS — Electron preloads cannot use ESM
//    in the sandbox context; see MB-F-ZIPPER-2-ESM-PRELOAD).
await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/main/preload-onboarding.mts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  outfile: resolve(PKG_ROOT, 'dist/main/preload-onboarding.cjs'),
  minify: false,
  logLevel: 'info',
});

console.log('ONBOARDING_BUILD_COMPLETE');
