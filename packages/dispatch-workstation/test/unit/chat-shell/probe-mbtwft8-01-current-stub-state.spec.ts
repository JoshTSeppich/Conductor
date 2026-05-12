// MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW WB1 (red) —
// probe-mbtwft8-01-current-stub-state: source-text sentinel that the
// `coarchitect:getDailyCost` STUB has been replaced.
//
// Per ticket body §4 WB1 + P5 dispatch /tmp/dispatch-p5.txt P5a:
//   - Asserts `coarchitect-ipc.ts:89` no longer contains the literal
//     `ipcMain.handle('coarchitect:getDailyCost', () => 0)` STUB.
//   - Asserts the cost-meter aggregator module exists at
//     `src/main/cost-meter-aggregator.ts` (Sub-Q-T8-A default path =(c)
//     workstation-side daemon-polling aggregator; presence-check only,
//     not behavior).
//
// Investigation finding [KNOWN, at HEAD a34f519]:
//   `coarchitect-ipc.ts:86-89` shows the STUB body:
//     ```
//     // Cost-meter renderer ring data source is currently UN-WIRED post-WB14
//     // v3.0 removal. MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION (Tier 3)
//     // tracks the PTY-scrape-based replacement; until migrated, returns 0.
//     ipcMain.handle('coarchitect:getDailyCost', () => 0);
//     ```
//   The 3-line comment block + 1-line handler must be replaced at WB5
//   GREEN with an aggregator-driven response.
//
// Encoded contract (2 conditions):
//   (1) `coarchitect-ipc.ts` source-text does NOT match the STUB literal
//       `ipcMain.handle('coarchitect:getDailyCost', () => 0)`.
//   (2) Module `src/main/cost-meter-aggregator.ts` exists at filesystem
//       (Sub-Q-T8-A=(c) default; presence-check; behavior probe at WB2).
//
// RED state at HEAD `a34f519`:
//   - Condition (1) FAILS: STUB literal present at line 89.
//   - Condition (2) FAILS: aggregator module absent.
// Both flip GREEN at WB3 (module ship) + WB5 (handler rewrite).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const COARCHITECT_IPC_PATH = resolve(
  WORKSTATION_ROOT,
  'src/main/coarchitect-ipc.ts',
);
const COST_METER_AGGREGATOR_PATH = resolve(
  WORKSTATION_ROOT,
  'src/main/cost-meter-aggregator.ts',
);

// Literal pattern from coarchitect-ipc.ts:89 at HEAD a34f519. The STUB
// is recognized by the exact arrow-fn `() => 0` returning 0 paired with
// the `coarchitect:getDailyCost` channel name.
const STUB_PATTERN =
  /ipcMain\.handle\(\s*['"]coarchitect:getDailyCost['"]\s*,\s*\(\s*\)\s*=>\s*0\s*\)/;

describe('MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW WB1 — cost-meter data-flow STUB state', () => {
  describe('Condition (1): coarchitect-ipc.ts getDailyCost STUB removed', () => {
    it('coarchitect-ipc.ts must NOT contain the `() => 0` STUB literal for `coarchitect:getDailyCost` handler', () => {
      expect(
        existsSync(COARCHITECT_IPC_PATH),
        `coarchitect-ipc.ts must exist at ${COARCHITECT_IPC_PATH}`,
      ).toBe(true);
      const source = readFileSync(COARCHITECT_IPC_PATH, 'utf8');
      expect(
        source,
        'coarchitect-ipc.ts:89 currently registers `coarchitect:getDailyCost` as `() => 0` STUB; WB5 GREEN must replace with aggregator-driven handler',
      ).not.toMatch(STUB_PATTERN);
    });
  });

  describe('Condition (2): cost-meter-aggregator module exists', () => {
    it('module `src/main/cost-meter-aggregator.ts` must exist (Sub-Q-T8-A=(c) default workstation-side daemon-polling aggregator)', () => {
      expect(
        existsSync(COST_METER_AGGREGATOR_PATH),
        `cost-meter-aggregator.ts must exist at ${COST_METER_AGGREGATOR_PATH} — WB3 GREEN authors the module`,
      ).toBe(true);
    });
  });
});
