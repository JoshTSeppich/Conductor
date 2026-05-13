// MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF WB1 RED —
// probe-mbtphase4-epsilon-01-config-shape: contract probe for the
// visual-diff-config primitive module.
//
// Round 11 §3.9 Wave 4 — operator-arbitrated (β)-style narrowing per
// build-doc §1.5 at `7e623a3`. Sub-Q-A=(ii) 3-module split (config /
// runner / CLI); Sub-Q-B=(iii) hybrid programmatic + file loader.
//
// Encoded contract (4 conditions, all RED at HEAD 7e623a3):
//   (1) Module `packages/dispatch-workstation/scripts/visual-diff-config.mjs`
//       exists at filesystem.
//   (2) Exports `defineVisualDiffTarget(input)` returning a frozen target
//       descriptor with required fields: name, screenshotPath,
//       targetImagePath; optional: thresholdPercent, capturePreFn.
//   (3) Exports `loadVisualDiffConfigFromObject(obj)`: pure-fn that
//       validates + normalizes a config object → { targets: [...] }.
//   (4) Exports `loadVisualDiffConfigFromFile(path)`: graceful-degradation
//       when file absent — returns { targets: [] } rather than throwing
//       (anti-fabrication §2.3 contract inherited from γ).
//
// Flips RED → GREEN at WB2 (config module ship).
//
// Anti-fabrication §2.1: file-existence sentinel via fs.existsSync;
// behavior sentinel via dynamic-import of real module + structural
// assertions on fn output.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const CONFIG_MODULE_PATH = resolve(
  WORKSTATION_ROOT,
  'scripts/visual-diff-config.mjs',
);

describe('MB-T-PHASE-4-EPSILON WB1 RED — visual-diff-config shape', () => {
  describe('Condition (1): module file exists', () => {
    it('scripts/visual-diff-config.mjs exists at filesystem', () => {
      expect(
        existsSync(CONFIG_MODULE_PATH),
        `expected file at ${CONFIG_MODULE_PATH} — WB2 GREEN authors`,
      ).toBe(true);
    });
  });

  describe('Condition (2): defineVisualDiffTarget shape', () => {
    it('returns target descriptor with required + optional fields', async () => {
      let define: unknown;
      let importError: Error | undefined;
      try {
        const mod = await import(
          /* @vite-ignore */ '../../../scripts/visual-diff-config.mjs'
        );
        define = (mod as { defineVisualDiffTarget?: unknown }).defineVisualDiffTarget;
      } catch (e) {
        importError = e instanceof Error ? e : new Error(String(e));
      }
      expect(
        importError,
        importError ? `import failed: ${importError.message}` : undefined,
      ).toBeUndefined();
      expect(typeof define).toBe('function');

      const fn = define as (input: {
        name: string;
        screenshotPath: string;
        targetImagePath: string;
        thresholdPercent?: number;
      }) => Readonly<{
        name: string;
        screenshotPath: string;
        targetImagePath: string;
        thresholdPercent: number;
      }>;

      const target = fn({
        name: 'frame-c-default',
        screenshotPath: '/tmp/snap.png',
        targetImagePath: '/tmp/target.png',
      });
      expect(target.name).toBe('frame-c-default');
      expect(target.screenshotPath).toBe('/tmp/snap.png');
      expect(target.targetImagePath).toBe('/tmp/target.png');
      // Default thresholdPercent = 1.0 (mirrors γ default)
      expect(target.thresholdPercent).toBe(1.0);

      // Explicit threshold honored
      const tight = fn({
        name: 'tight',
        screenshotPath: '/a',
        targetImagePath: '/b',
        thresholdPercent: 0.5,
      });
      expect(tight.thresholdPercent).toBe(0.5);
    });
  });

  describe('Condition (3): loadVisualDiffConfigFromObject', () => {
    it('normalizes config object → { targets } and validates entries', async () => {
      const mod = await import(
        /* @vite-ignore */ '../../../scripts/visual-diff-config.mjs'
      );
      const load = (
        mod as {
          loadVisualDiffConfigFromObject?: (o: unknown) => {
            targets: ReadonlyArray<{ name: string }>;
          };
        }
      ).loadVisualDiffConfigFromObject;
      expect(typeof load).toBe('function');

      const cfg = load!({
        targets: [
          {
            name: 'frame-c-default',
            screenshotPath: '/x.png',
            targetImagePath: '/y.png',
          },
        ],
      });
      expect(cfg.targets).toHaveLength(1);
      expect(cfg.targets[0]?.name).toBe('frame-c-default');

      // Empty config → empty targets list (not error)
      const empty = load!({ targets: [] });
      expect(empty.targets).toHaveLength(0);

      // Missing targets key → empty targets (graceful)
      const missing = load!({});
      expect(missing.targets).toHaveLength(0);
    });
  });

  describe('Condition (4): loadVisualDiffConfigFromFile graceful-degradation', () => {
    it('returns { targets: [] } when path absent (anti-fabrication §2.3)', async () => {
      const mod = await import(
        /* @vite-ignore */ '../../../scripts/visual-diff-config.mjs'
      );
      const loadFile = (
        mod as {
          loadVisualDiffConfigFromFile?: (p: string) => {
            targets: ReadonlyArray<{ name: string }>;
          };
        }
      ).loadVisualDiffConfigFromFile;
      expect(typeof loadFile).toBe('function');

      const absent = loadFile!('/tmp/nonexistent-visual-diff-config-mbtphase4.json');
      expect(absent.targets).toHaveLength(0);
    });
  });
});
