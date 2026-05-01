// esbuild script for the Electron sandboxed preload.
// Must output CommonJS (format:'cjs') — Electron's sandboxed renderer loads preloads
// as CJS regardless of package.json "type":"module". ESM import statements cause
// "Cannot use import statement outside a module" in the sandbox context.
// Output: dist/main/preload.cjs (Electron accepts any extension as CJS if format is right)
import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/main'), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/main/preload.mts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  outfile: resolve(PKG_ROOT, 'dist/main/preload.cjs'),
  minify: false,
  logLevel: 'info',
});

console.log('PRELOAD_BUILD_COMPLETE');
