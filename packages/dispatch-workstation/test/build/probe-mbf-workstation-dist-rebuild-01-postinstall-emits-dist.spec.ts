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

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  readFileSync,
  existsSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '..', '..', 'package.json');
const workstationRoot = resolve(__dirname, '..', '..');
const repoRoot = resolve(__dirname, '..', '..', '..', '..');
const tscBin = resolve(repoRoot, 'node_modules', '.bin', 'tsc');

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

/**
 * WB2 — content-propagation verification (mirrors gen-6 dispatch-core
 * probe-mbf-postpull-02 LIVE+MECHANISM split).
 *
 * Consolidated into this probe file (rather than authored as a separate
 * probe-02 path) because the session manifest TERRITORY enumerates only
 * probe-01's exact path. The file name "postinstall-emits-dist" covers
 * content-propagation semantically: emission only counts if it's faithful.
 *
 * LIVE invariant: the postinstall-produced dist/main/* artifacts (a) exist
 * and (b) contain the named exports declared in their src counterparts.
 * If postinstall is stale, the dist .js file will lack a recently-added
 * export — that's the workstation-runtime analog of the gen-6 TS2724
 * stale-.d.ts failure mode at FOLLOWUPS:172.
 *
 * MECHANISM invariant: in an isolated tmpdir, run the local tsc binary
 * on a sample.ts → assert sample.js contains the export → add a new
 * export to src → re-run tsc → assert the new export now appears in
 * dist sample.js. This isolates the rebuild mechanism that postinstall
 * invokes from any state in the real workstation tree (which is FORBIDDEN
 * to modify per manifest).
 *
 * Per MB-F-MTIME-PROBE-UNSOUNDNESS (FOLLOWUPS:372) + the design pattern
 * established at MB-F-BUILD-OUTPUT-FRESHNESS-PROBE-DESIGN-PATTERN
 * (FOLLOWUPS:379): mtime-based freshness assertions are unsound when src
 * mtimes can be artificially set; content-equivalence checks are the
 * honest signal. This probe uses content checks throughout.
 */

describe('MB-F-WORKSTATION-DIST-REBUILD-PARITY — dist content propagation (WB2)', () => {
  describe('LIVE invariant: dispatch-workstation/dist/main mirrors src/main exports', () => {
    it('dist/main/main.js exists (Electron entry-point per package.json `main` field)', () => {
      const distMain = resolve(workstationRoot, 'dist', 'main', 'main.js');
      expect(existsSync(distMain)).toBe(true);
    });

    it('dist/main/splitter-state.js exists and contains the named exports declared in src/main/splitter-state.ts', () => {
      const srcSplitter = readFileSync(
        resolve(workstationRoot, 'src', 'main', 'splitter-state.ts'),
        'utf8',
      );
      const distSplitterPath = resolve(workstationRoot, 'dist', 'main', 'splitter-state.js');
      expect(existsSync(distSplitterPath)).toBe(true);
      const distSplitter = readFileSync(distSplitterPath, 'utf8');

      // Stable named exports at CLAUDE.md §3.5 persistence pattern.
      // If postinstall is stale, the dist .js will lack one of these.
      const exportNamesToCheck = ['readSplitterPosition', 'writeSplitterPosition'];
      for (const name of exportNamesToCheck) {
        expect(srcSplitter, `pre-condition: src/main/splitter-state.ts declares ${name}`).toMatch(
          new RegExp(`\\bexport\\s+function\\s+${name}\\b`),
        );
        expect(distSplitter, `dist .js missing src export ${name}`).toMatch(
          new RegExp(`\\bexport\\s+function\\s+${name}\\b`),
        );
      }
    });
  });

  describe('MECHANISM invariant: tsc propagates new src exports into dist .js (sandboxed)', () => {
    let workdir: string;

    beforeAll(() => {
      workdir = mkdtempSync(join(tmpdir(), 'mbf-workstation-dist-rebuild-'));
      writeFileSync(
        join(workdir, 'sample.ts'),
        'export function ExistingFn(): number { return 42; }\n',
        'utf8',
      );
      writeFileSync(
        join(workdir, 'tsconfig.json'),
        JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'NodeNext',
              moduleResolution: 'NodeNext',
              strict: true,
              outDir: 'dist',
            },
            include: ['sample.ts'],
          },
          null,
          2,
        ),
        'utf8',
      );
    });

    afterAll(() => {
      rmSync(workdir, { recursive: true, force: true });
    });

    it('initial tsc build produces dist/sample.js containing the existing export', () => {
      const result = spawnSync(tscBin, ['-p', 'tsconfig.json'], {
        cwd: workdir,
        encoding: 'utf8',
      });
      expect(result.status, result.stderr || result.stdout).toBe(0);

      const js = readFileSync(join(workdir, 'dist', 'sample.js'), 'utf8');
      expect(js).toMatch(/\bExistingFn\b/);
      expect(js).not.toMatch(/\bAddedFn\b/);
    });

    it('after adding a new src export and rebuilding, dist .js contains the new member', () => {
      writeFileSync(
        join(workdir, 'sample.ts'),
        'export function ExistingFn(): number { return 42; }\nexport function AddedFn(): string { return "new"; }\n',
        'utf8',
      );

      const result = spawnSync(tscBin, ['-p', 'tsconfig.json'], {
        cwd: workdir,
        encoding: 'utf8',
      });
      expect(result.status, result.stderr || result.stdout).toBe(0);

      const js = readFileSync(join(workdir, 'dist', 'sample.js'), 'utf8');
      expect(js).toMatch(/\bExistingFn\b/);
      expect(js).toMatch(/\bAddedFn\b/);
    });
  });
});
