// esbuild script for the kanban webview's sandboxed preload (cardBridge).
// Output CommonJS (format:'cjs') per MB-F-ZIPPER-2-ESM-PRELOAD lesson —
// Electron's sandboxed webview preloads load as CJS regardless of
// package.json "type":"module".
// Output: dist/main/card-bridge.cjs
import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/main'), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/main/card-bridge-preload.mts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  outfile: resolve(PKG_ROOT, 'dist/main/card-bridge.cjs'),
  minify: false,
  logLevel: 'info',
});

console.log('CARD_BRIDGE_BUILD_COMPLETE');
