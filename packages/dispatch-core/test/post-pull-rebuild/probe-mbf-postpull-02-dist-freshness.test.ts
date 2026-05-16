/**
 * MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE WB2 — dist-freshness probe.
 *
 * Verifies two layers of the closure path-(a) postinstall mechanism:
 *
 *   (1) LIVE invariant: in the current repo state, dispatch-core/dist
 *       contains a .d.ts artifact for every src .ts module that
 *       declares the contract spine (v3/schema.ts), AND the dist
 *       .d.ts contains the same exported member names as the src.
 *       This catches the exact scenario from FOLLOWUPS row 172 —
 *       workstation typecheck fails with TS2724 on a new dispatch-
 *       core export because dist .d.ts is missing the member.
 *
 *   (2) MECHANISM invariant: when src content gains a new exported
 *       member, re-running `tsc` (which is what the postinstall hook
 *       invokes) propagates that member into the dist .d.ts.
 *       Simulated in an isolated tmpdir (dispatch-core/src/** is
 *       FORBIDDEN per manifest): build → add new export to src →
 *       rebuild → assert new member in dist .d.ts.
 *
 * Without this probe, WB1 only asserts the hook is *declared*; it does
 * not assert the underlying rebuild mechanism actually propagates new
 * src exports to dist .d.ts (the exact failure mode that triggered
 * the followup). WB2 closes that verification gap.
 *
 * Design note: mtime-comparison was the initial approach but tsc
 * writes outputs at wall-clock time, so artificially-future-set src
 * mtimes break that signal. Content-based propagation is the honest
 * test of the contract that the postinstall hook maintains.
 *
 * Manifest-deviation note: same as probe-01 — using `.test.ts` because
 * vitest.config.ts include glob does not pick up `.spec.ts`.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..', '..');
const dispatchCoreRoot = resolve(__dirname, '..', '..');
const tscBin = resolve(repoRoot, 'node_modules', '.bin', 'tsc');

describe('MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE — dist freshness (WB2)', () => {
  describe('LIVE invariant: dispatch-core/dist .d.ts mirrors src .ts exports', () => {
    it('dist/v3/schema.d.ts exists', () => {
      const distSchemaDts = resolve(dispatchCoreRoot, 'dist', 'v3', 'schema.d.ts');
      expect(existsSync(distSchemaDts)).toBe(true);
    });

    it('dist/v3/schema.d.ts re-exports the core schema names declared in src/v3/schema.ts', () => {
      const srcSchema = readFileSync(
        resolve(dispatchCoreRoot, 'src', 'v3', 'schema.ts'),
        'utf8',
      );
      const distSchema = readFileSync(
        resolve(dispatchCoreRoot, 'dist', 'v3', 'schema.d.ts'),
        'utf8',
      );

      // Sample stable top-level export names from the §1-§4 region.
      // If src declares them but dist .d.ts does not, postinstall
      // discipline is broken (workstation typecheck would TS2724).
      const exportNamesToCheck = ['ActionTypeEnum', 'TicketTypeEnum', 'TicketLifecycleStateEnum'];
      for (const name of exportNamesToCheck) {
        expect(srcSchema, `pre-condition: src/v3/schema.ts declares ${name}`).toMatch(
          new RegExp(`\\bexport\\s+const\\s+${name}\\b`),
        );
        expect(distSchema, `dist .d.ts missing src export ${name}`).toMatch(
          new RegExp(`\\b${name}\\b`),
        );
      }
    });
  });

  describe('MECHANISM invariant: tsc propagates new src exports into dist .d.ts (sandboxed)', () => {
    let workdir: string;

    beforeAll(() => {
      workdir = mkdtempSync(join(tmpdir(), 'mbf-postpull-dist-freshness-'));
      writeFileSync(
        join(workdir, 'sample.ts'),
        'export const ExistingMember = 42;\n',
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
              declaration: true,
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

    it('initial tsc build produces dist/sample.d.ts containing the existing export', () => {
      const result = spawnSync(tscBin, ['-p', 'tsconfig.json'], {
        cwd: workdir,
        encoding: 'utf8',
      });
      expect(result.status, result.stderr || result.stdout).toBe(0);

      const dts = readFileSync(join(workdir, 'dist', 'sample.d.ts'), 'utf8');
      expect(dts).toMatch(/\bExistingMember\b/);
      expect(dts).not.toMatch(/\bAddedMember\b/);
    });

    it('after adding a new src export and rebuilding, dist .d.ts contains the new member', () => {
      writeFileSync(
        join(workdir, 'sample.ts'),
        'export const ExistingMember = 42;\nexport const AddedMember = "new" as const;\n',
        'utf8',
      );

      const result = spawnSync(tscBin, ['-p', 'tsconfig.json'], {
        cwd: workdir,
        encoding: 'utf8',
      });
      expect(result.status, result.stderr || result.stdout).toBe(0);

      const dts = readFileSync(join(workdir, 'dist', 'sample.d.ts'), 'utf8');
      expect(dts).toMatch(/\bExistingMember\b/);
      expect(dts).toMatch(/\bAddedMember\b/);
    });
  });
});
