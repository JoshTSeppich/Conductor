// esbuild script for COARCH-T02 renderer bundle (MB-S05 ADR recommended pattern).
// Entry: src/coarchitect/mount.ts → dist/coarchitect/renderer.js
// HTML: src/coarchitect/chat-panel.html → dist/coarchitect/chat-panel.html (copy)
// Flags per MB-S05 ADR: platform:browser, target:chrome130, jsx:automatic (K1+K2),
// bundle:true so react/jsx-runtime resolves inline (K4 sandbox compatibility).
import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/coarchitect'), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/coarchitect/mount.ts')],
  bundle: true,
  outfile: resolve(PKG_ROOT, 'dist/coarchitect/renderer.js'),
  platform: 'browser',
  target: 'chrome130',
  jsx: 'automatic',
  minify: false,
  logLevel: 'info',
});

await copyFile(
  resolve(PKG_ROOT, 'src/coarchitect/chat-panel.html'),
  resolve(PKG_ROOT, 'dist/coarchitect/chat-panel.html'),
);

console.log('BUILD_COMPLETE');
