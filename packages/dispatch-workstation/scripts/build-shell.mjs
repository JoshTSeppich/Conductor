// Copies workstation-shell.html from src/main/ to dist/main/ after tsc build.
// Run: node scripts/build-shell.mjs
// Part of the unified build sequence alongside build-coarchitect.mjs.
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/main'), { recursive: true });

await copyFile(
  resolve(PKG_ROOT, 'src/main/workstation-shell.html'),
  resolve(PKG_ROOT, 'dist/main/workstation-shell.html'),
);

console.log('BUILD_SHELL_COMPLETE');
