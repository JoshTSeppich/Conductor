/**
 * MB-F-WORKSTATION-DIST-REBUILD-PARITY WB1 — closure probe.
 *
 * Closure path: mirror the `postinstall: tsc` hook from
 * `packages/dispatch-core/package.json` (gen-6 closure `6eaf194` for
 * FOLLOWUPS row 172) into `packages/dispatch-workstation/package.json`
 * so `pnpm install` (post-pull / post-clone) automatically refreshes
 * `dist/main/main.js` — the Electron entry-point declared at
 * `dispatch-workstation/package.json` `main` field. Without the hook,
 * a fresh worktree or post-pull tree can leave dist/main/* absent
 * while `node_modules` is up-to-date; runtime `electron dist/main/main.js`
 * then fails ERR_MODULE_NOT_FOUND (CLAUDE.md §4.6 class).
 *
 * Scope decision (Phase-1 Q-MBFWDR-1=(a)): postinstall mirrors
 * dispatch-core's bare `tsc` — NOT `pnpm build` (which chains tsc +
 * 9 esbuild scripts and would add ~30-60s to every `pnpm install`,
 * matching the row body's Tier-2 concern (2) about install-cycle
 * slowdown). The esbuild renderer-bundle freshness is operator-rebuild-
 * gated at dogfood time and remains so post-closure; sibling
 * followup at WB-final captures renderer-bundle parity as Tier 3.
 *
 * Manifest-deviation note: the workstation `build` script is
 * `tsc && node scripts/build-coarchitect.mjs && ...` (9 esbuild
 * scripts after the `&&`). So `postinstall === build` (gen-6
 * probe-01 assertion 3) does NOT hold here — instead this probe
 * asserts `build` STARTS WITH `postinstall`, i.e. postinstall is a
 * proper prefix subset of the full build pipeline. This is the
 * honest invariant: postinstall does a strict subset of what build
 * does.
 *
 * At RED (pre-edit), `scripts.postinstall` is undefined and all
 * three assertions fail. At GREEN, postinstall = "tsc" and all
 * three pass.
 *
 * Discoverability anchors: FOLLOWUPS.md row 373; gen-6 reference
 * `packages/dispatch-core/test/post-pull-rebuild/probe-mbf-postpull-01-*`;
 * findings doc `docs/coordination/mb-f-workstation-dist-rebuild-parity-findings-2026-05-17.md`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '..', '..', 'package.json');

describe('MB-F-WORKSTATION-DIST-REBUILD-PARITY — postinstall hook (workstation parity)', () => {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    scripts?: Record<string, string>;
  };

  it('declares scripts.postinstall in dispatch-workstation/package.json', () => {
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts!.postinstall).toBeDefined();
  });

  it('postinstall invokes the TypeScript compiler (tsc) so dist/main/main.js is refreshed on pnpm install', () => {
    const postinstall = pkg.scripts!.postinstall;
    expect(postinstall).toMatch(/\btsc\b/);
  });

  it('postinstall is a prefix subset of build (build performs at least what postinstall does)', () => {
    const postinstall = pkg.scripts!.postinstall;
    const build = pkg.scripts!.build;
    expect(build).toBeDefined();
    expect(build!.startsWith(postinstall)).toBe(true);
  });
});
