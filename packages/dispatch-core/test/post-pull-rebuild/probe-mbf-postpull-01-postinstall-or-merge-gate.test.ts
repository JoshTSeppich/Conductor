/**
 * MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE WB1 — closure probe.
 *
 * Closure path (a): dispatch-core/package.json carries a `postinstall`
 * lifecycle script that runs `tsc` so `pnpm install` (post-pull or
 * post-clone) automatically refreshes `dist/` and prevents the
 * workstation-typecheck-fails-until-rebuild incident pattern
 * documented at FOLLOWUPS.md row 172 (manifested 2026-05-06 post
 * sess-mbt13 merge).
 *
 * This probe is a static assertion against package.json. At RED
 * (pre-hook), `scripts.postinstall` is undefined and the probe fails.
 * At GREEN, the hook is set to `tsc` and the probe passes.
 *
 * Manifest-deviation note: manifest named this probe `.spec.ts`, but
 * dispatch-core vitest.config.ts include glob is `*.test.{ts,tsx}` —
 * `.spec.ts` files would not run. Using `.test.ts` to preserve probe
 * executability; vitest.config.ts is not in WB1 WRITE territory.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '..', '..', 'package.json');

describe('MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE — postinstall hook (path-(a))', () => {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    scripts?: Record<string, string>;
  };

  it('declares scripts.postinstall in dispatch-core/package.json', () => {
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts!.postinstall).toBeDefined();
  });

  it('postinstall invokes the TypeScript compiler (tsc) so dist/ is refreshed on pnpm install', () => {
    const postinstall = pkg.scripts!.postinstall;
    expect(postinstall).toMatch(/\btsc\b/);
  });

  it('postinstall is functionally equivalent to the existing build script', () => {
    const postinstall = pkg.scripts!.postinstall;
    const build = pkg.scripts!.build;
    expect(build).toBeDefined();
    expect(postinstall).toBe(build);
  });
});
