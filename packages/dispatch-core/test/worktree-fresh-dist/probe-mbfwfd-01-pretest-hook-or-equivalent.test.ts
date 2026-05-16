// probe-mbfwfd-01 — closure mechanism declaration for MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH
// (FOLLOWUPS.md row 155, Tier 1).
//
// Failure mode (KNOWN per row 155 body):
//   Fresh worktrees created via `git worktree add` lack dist/ artifacts. Workstation tests
//   that import from `dispatch-core/dist/v3/schema.js` crash at import-time on a freshly-
//   created worktree until dispatch-core is built locally. `pnpm install` is never re-run
//   on the new worktree (workspace symlinks already resolved at root .pnpm-store), so the
//   row-172 `postinstall: tsc` hook does NOT fire and dist/ stays missing/stale.
//
// Closure path (per row body verbatim):
//   "pnpm pre-test hook that runs dispatch-core build if dist/ is absent or older than src/"
//
// This probe is the WB1 RED declaration. It asserts the mechanism that closes the row:
//   (1) a `pretest` lifecycle key exists in `packages/dispatch-core/package.json`,
//   (2) the `pretest` script invokes the helper at `scripts/worktree-fresh-dist-prebuild.sh`,
//   (3) the existing `postinstall` from row-172 closure is preserved (regression guard).

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_JSON_PATH = resolve(HERE, '..', '..', 'package.json');

interface PkgJson {
  scripts?: Record<string, string>;
}

function readPkg(): PkgJson {
  return JSON.parse(readFileSync(PKG_JSON_PATH, 'utf8')) as PkgJson;
}

describe('MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH closure mechanism', () => {
  it('declares a pretest hook in dispatch-core/package.json', () => {
    const pkg = readPkg();
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts?.pretest).toBeDefined();
    expect(typeof pkg.scripts?.pretest).toBe('string');
    expect(pkg.scripts!.pretest!.length).toBeGreaterThan(0);
  });

  it('pretest hook references the worktree-fresh-dist-prebuild helper script', () => {
    const pkg = readPkg();
    const pretest = pkg.scripts?.pretest ?? '';
    expect(pretest).toMatch(/worktree-fresh-dist-prebuild\.sh/);
  });

  it('preserves the row-172 postinstall hook (regression guard)', () => {
    const pkg = readPkg();
    expect(pkg.scripts?.postinstall).toBe('tsc');
  });
});
