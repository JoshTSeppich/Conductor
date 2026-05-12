// MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS WB1 RED —
// probe-mbtphase4-spawn-result-01-shape: contract probe for the (β)-style
// narrowed ship-envelope.
//
// Round 11 §3.9 Wave 3 — operator-arbitrated (β) narrowing
// (HALT-TERRITORY-MISMATCH-CLUSTER-A turn-N items 1-4):
//   - Sub-Q-C=(ii) sibling-only for spawnMode arm (commit-plan-doc-1334).
//   - Option (b) NEW MODULE — author entirely in
//     `spawn-session-result-extensions.ts`; zero touch of
//     `spawn-handler.ts` (sibling working-tree-modified at authoring time).
//   - Cluster A scope = model + spawnedAtMs ONLY.
//
// Encoded contract (4 conditions, all RED at HEAD 2d938dc):
//   (1) `packages/dispatch-core/src/v3/spawn-result-fields.ts` exists
//       at filesystem.
//   (2) Dispatch-core exports `SpawnResultExtensionFields` type contract
//       — verified via dynamic-import of compiled artifact + presence-of-
//       export type-shape probe.
//   (3) `packages/dispatch-workstation/src/main/spawn-session-result-extensions.ts`
//       exists at filesystem.
//   (4) Workstation exports `populateSpawnSessionResultExtensions(input)`
//       pure-fn returning `{ model?, spawnedAtMs }` shape — verified via
//       dynamic-import + behavior contract:
//         - input.now → output.spawnedAtMs (testable deterministic injection)
//         - input.model present → output.model = input.model
//         - input.model absent → output.model = input.defaultModel ?? undefined
//
// RED state at HEAD `2d938dc` (post-build-doc commit, pre-WB2/WB3):
//   - (1) FAILS: dispatch-core extension file absent.
//   - (2) FAILS: type contract not importable (dispatch-core dist not rebuilt with new export).
//   - (3) FAILS: workstation extension file absent.
//   - (4) FAILS: populator fn not importable; behavior contract unverifiable.
//
// Flips RED → GREEN at WB2 (dispatch-core type) + WB3 (workstation populator).
//
// Anti-fabrication §2.1: file-existence sentinels via fs.existsSync
// against absolute paths; behavior sentinel via dynamic-import (catches
// module-absent + export-missing + signature-wrong as distinct failures).

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../../..');

const DISPATCH_CORE_FIELDS_SOURCE = resolve(
  REPO_ROOT,
  'packages/dispatch-core/src/v3/spawn-result-fields.ts',
);
const WORKSTATION_EXTENSIONS_SOURCE = resolve(
  REPO_ROOT,
  'packages/dispatch-workstation/src/main/spawn-session-result-extensions.ts',
);

describe('MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS WB1 RED — extension shape contract', () => {
  describe('Condition (1): dispatch-core spawn-result-fields.ts exists', () => {
    it('module `dispatch-core/src/v3/spawn-result-fields.ts` exists at filesystem', () => {
      expect(
        existsSync(DISPATCH_CORE_FIELDS_SOURCE),
        `expected file at ${DISPATCH_CORE_FIELDS_SOURCE} — WB2 GREEN authors`,
      ).toBe(true);
    });
  });

  describe('Condition (2): dispatch-core exports SpawnResultExtensionFields type contract', () => {
    it('dispatch-core dist exports SpawnResultExtensionFields (verified via import-resolution)', async () => {
      // Type-only module: verify via type-import + structural sentinel.
      // Import resolves to dist/v3/spawn-result-fields.js post-build.
      // A type-only module has no runtime exports, so we sentinel via
      // module-resolution success + a synthetic structural literal that
      // would fail TypeScript compilation if the type is absent — but
      // at vitest runtime we cannot typecheck, so we sentinel via
      // dynamic-import success (resolves to dist artifact) + presence
      // of any exported symbol OR a marker constant.
      //
      // To make this RED→GREEN robust, WB2 authors the module with a
      // re-export of an empty marker const `SPAWN_RESULT_FIELDS_MARKER`
      // so this probe has a runtime sentinel.
      let mod: unknown;
      let importError: Error | undefined;
      try {
        mod = await import(
          /* @vite-ignore */ '../../../../dispatch-core/dist/v3/spawn-result-fields.js'
        );
      } catch (e) {
        importError = e instanceof Error ? e : new Error(String(e));
      }
      expect(
        importError,
        importError
          ? `dispatch-core dist artifact not importable: ${importError.message}`
          : undefined,
      ).toBeUndefined();
      expect(mod).toBeDefined();
      expect(
        (mod as { SPAWN_RESULT_FIELDS_MARKER?: string })
          .SPAWN_RESULT_FIELDS_MARKER,
      ).toBe('MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS');
    });
  });

  describe('Condition (3): workstation spawn-session-result-extensions.ts exists', () => {
    it('module `dispatch-workstation/src/main/spawn-session-result-extensions.ts` exists at filesystem', () => {
      expect(
        existsSync(WORKSTATION_EXTENSIONS_SOURCE),
        `expected file at ${WORKSTATION_EXTENSIONS_SOURCE} — WB3 GREEN authors`,
      ).toBe(true);
    });
  });

  describe('Condition (4): populateSpawnSessionResultExtensions behavior contract', () => {
    it('exports pure-fn returning { model?, spawnedAtMs } with deterministic now-injection', async () => {
      let populate: unknown;
      let importError: Error | undefined;
      try {
        const mod = await import(
          /* @vite-ignore */ '../../../src/main/spawn-session-result-extensions.js'
        );
        populate = (
          mod as {
            populateSpawnSessionResultExtensions?: unknown;
          }
        ).populateSpawnSessionResultExtensions;
      } catch (e) {
        importError = e instanceof Error ? e : new Error(String(e));
      }
      expect(
        importError,
        importError ? `import failed: ${importError.message}` : undefined,
      ).toBeUndefined();
      expect(typeof populate).toBe('function');

      const fn = populate as (input: {
        model?: string;
        defaultModel?: string;
        now?: number;
      }) => { model?: string; spawnedAtMs: number };

      // (a) deterministic now-injection
      const r1 = fn({ now: 1_700_000_000_000 });
      expect(r1.spawnedAtMs).toBe(1_700_000_000_000);

      // (b) explicit model takes precedence over defaultModel
      const r2 = fn({ model: 'claude-opus-4-7', defaultModel: 'fallback', now: 0 });
      expect(r2.model).toBe('claude-opus-4-7');

      // (c) defaultModel used when model absent
      const r3 = fn({ defaultModel: 'claude-sonnet-4-6', now: 0 });
      expect(r3.model).toBe('claude-sonnet-4-6');

      // (d) neither → model undefined
      const r4 = fn({ now: 0 });
      expect(r4.model).toBeUndefined();

      // (e) Date.now fallback when now omitted (within reasonable bounds)
      const before = Date.now();
      const r5 = fn({});
      const after = Date.now();
      expect(r5.spawnedAtMs).toBeGreaterThanOrEqual(before);
      expect(r5.spawnedAtMs).toBeLessThanOrEqual(after);
    });
  });
});
