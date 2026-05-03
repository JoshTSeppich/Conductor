// esbuild script for the CONSOLE-T03 renderer bundle.
// Entry: src/console-panel/mount.ts → dist/console-panel/renderer.js
// HTML:  src/console-panel/console-panel.html → dist/console-panel/console-panel.html (copy)
// CSS:   node_modules/@xterm/xterm/css/xterm.css → dist/console-panel/xterm.css (copy)
//
// Mirrors scripts/build-coarchitect.mjs (COARCH-T02 b1ed79c precedent):
// platform:browser, target:chrome130 (Electron 41 bundled Chromium), jsx:automatic
// (React 18 new transform; no React import needed in TSX), bundle:true so
// react/jsx-runtime + @xterm/xterm + console-bridge types resolve inline (sandbox
// compatibility — preload runs in CJS context but the renderer is a normal browser).
import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/console-panel'), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/console-panel/mount.ts')],
  bundle: true,
  outfile: resolve(PKG_ROOT, 'dist/console-panel/renderer.js'),
  platform: 'browser',
  target: 'chrome130',
  jsx: 'automatic',
  minify: false,
  logLevel: 'info',
});

await copyFile(
  resolve(PKG_ROOT, 'src/console-panel/console-panel.html'),
  resolve(PKG_ROOT, 'dist/console-panel/console-panel.html'),
);

await copyFile(
  resolve(PKG_ROOT, 'node_modules/@xterm/xterm/css/xterm.css'),
  resolve(PKG_ROOT, 'dist/console-panel/xterm.css'),
);

console.log('CONSOLE_PANEL_BUILD_COMPLETE');
