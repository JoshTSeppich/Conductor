// esbuild script for the MB-T-MVP-CONDUCTOR-CHAT-MOUNT-WIRING bundle.
// Entry: src/conductor-chat/mount-entry.ts → dist/conductor-chat/renderer.js
//
// Mirrors scripts/build-orchestrator-focus-pane.mjs (MB-T-MVP-W1 precedent):
// platform:browser, target:chrome130 (Electron 41 bundled Chromium), jsx:automatic
// (React 18 new transform; no React import needed in TSX), bundle:true.
//
// Q1=(d) per operator arbitration: render-only mount-wiring. The bundle's
// entry (mount-entry.ts) imports tryAutoMountConductorChat from mount.ts
// and fires the auto-mount on DOMContentLoaded targeting the shell.html
// anchor `#chat-region #root` (workstation-shell.html lines 297-299).
//
// Closes MB-F-W3-FINAL-PRODUCTION-CHAT-REGION-BLANK-UNTIL-EXPANSION-2
// (FOLLOWUPS row 401): the chat-shell sweep at aef0ac8 removed the
// `<script src="../chat-shell/renderer.js">` tag; this bundle replaces
// the renderer for `#chat-region #root`, restoring dogfood-visible content.

import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

await mkdir(resolve(PKG_ROOT, 'dist/conductor-chat'), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(PKG_ROOT, 'src/conductor-chat/mount-entry.ts')],
  bundle: true,
  outfile: resolve(PKG_ROOT, 'dist/conductor-chat/renderer.js'),
  platform: 'browser',
  target: 'chrome130',
  jsx: 'automatic',
  minify: false,
  logLevel: 'info',
});

console.log('CONDUCTOR_CHAT_BUILD_COMPLETE');
