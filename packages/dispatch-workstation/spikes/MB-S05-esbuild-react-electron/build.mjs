// MB-S05 build script: esbuild standalone, no bundler plugin or webpack.
// E1 validates this script exits 0 and produces dist/renderer/index.js.
import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist/renderer', { recursive: true });
await mkdir('dist/main', { recursive: true });

// --- Renderer bundle ---
// E1 core: esbuild compiles React 18 TSX with jsx:'automatic'.
// jsx:'automatic' uses react/jsx-runtime (React 17+ transform) — no import React needed.
// platform:'browser' ensures no Node built-ins are bundled.
// target:'chrome130' matches Electron 41's Chromium version.
await esbuild.build({
  entryPoints: ['src/renderer/index.tsx'],
  bundle: true,
  outfile: 'dist/renderer/index.js',
  platform: 'browser',
  target: 'chrome130',
  jsx: 'automatic',
  minify: false,
  logLevel: 'info',
});

// Copy HTML alongside the JS so file:// relative paths resolve correctly.
await copyFile('src/renderer/index.html', 'dist/renderer/index.html');

// --- Main process bundle ---
// Bundles spike main.ts for Electron's main process.
// external:['electron'] keeps the Electron import as-is (native to Electron runtime).
// format:'esm' matches "type":"module" in package.json — Electron 28+ supports ESM main.
await esbuild.build({
  entryPoints: ['src/main/main.ts'],
  bundle: true,
  outfile: 'dist/main/main.js',
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  format: 'esm',
  logLevel: 'info',
});

console.log('BUILD_COMPLETE');
