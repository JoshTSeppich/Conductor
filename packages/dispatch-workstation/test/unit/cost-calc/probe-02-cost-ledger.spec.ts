// MB-T26 WB2 — probe-02 green: cost-ledger persistence.
//
// Tests the WB2 cost-ledger contract:
//   1. todaysDateKey() returns local YYYY-MM-DD format
//   2. todaysTotalCost() returns 0 when no ledger file exists
//   3. appendCostLedgerEntry persists; todaysTotalCost reflects it
//   4. multiple same-day entries sum correctly
//   5. entries older than 7 days are pruned at next append
//   6. entries within last 7 days are NOT pruned
//
// Test isolation: MB_COST_LEDGER_DIR env var points at a per-test
// mkdtempSync directory; vi.mock('electron') prevents the static import
// from failing at module-load time (vitest 'node' env, no Electron).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('electron', () => ({
  app: {
    getPath: () =>
      '/should-not-be-reached-tests-set-MB_COST_LEDGER_DIR-env-var',
  },
}));

import {
  appendCostLedgerEntry,
  todaysTotalCost,
  todaysDateKey,
  type CostLedgerEntry,
} from '../../../src/main/cost-ledger.js';

describe('MB-T26 WB2 — cost-ledger persistence', () => {
  let tempDir: string;
  let originalEnv: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mb-t26-cost-ledger-'));
    originalEnv = process.env['MB_COST_LEDGER_DIR'];
    process.env['MB_COST_LEDGER_DIR'] = tempDir;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env['MB_COST_LEDGER_DIR'];
    else process.env['MB_COST_LEDGER_DIR'] = originalEnv;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('todaysDateKey() returns local YYYY-MM-DD format', () => {
    const key = todaysDateKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('todaysTotalCost() returns 0 when no ledger file exists yet', () => {
    expect(todaysTotalCost()).toBe(0);
  });

  it('appendCostLedgerEntry persists; todaysTotalCost reflects it', () => {
    const entry: CostLedgerEntry = {
      timestamp: '2026-05-07T18:00:00.000Z',
      model: 'claude-sonnet-4-6',
      inputTokens: 1000,
      outputTokens: 500,
      costUsd: 0.0105,
    };
    appendCostLedgerEntry(entry);
    expect(todaysTotalCost()).toBeCloseTo(0.0105, 6);
  });

  it('sums multiple same-day entries correctly', () => {
    appendCostLedgerEntry({
      timestamp: '2026-05-07T18:00:00.000Z',
      model: 'claude-sonnet-4-6',
      inputTokens: 1000,
      outputTokens: 500,
      costUsd: 0.0105,
    });
    appendCostLedgerEntry({
      timestamp: '2026-05-07T19:00:00.000Z',
      model: 'claude-sonnet-4-6',
      inputTokens: 2000,
      outputTokens: 1000,
      costUsd: 0.021,
    });
    expect(todaysTotalCost()).toBeCloseTo(0.0315, 6);
  });

  it('prunes entries older than 7 days at next append', () => {
    // Seed a stale entry under a date-key 8 days ago.
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    const staleKey = eightDaysAgo.toLocaleDateString('en-CA');
    const ledgerFile = join(tempDir, 'conductor-cost-ledger.json');
    writeFileSync(
      ledgerFile,
      JSON.stringify({
        [staleKey]: [
          {
            timestamp: eightDaysAgo.toISOString(),
            model: 'claude-sonnet-4-6',
            inputTokens: 999,
            outputTokens: 999,
            costUsd: 999,
          },
        ],
      }),
      'utf8',
    );
    // Append fresh — triggers prune.
    appendCostLedgerEntry({
      timestamp: new Date().toISOString(),
      model: 'claude-sonnet-4-6',
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.001,
    });
    const persisted = JSON.parse(
      readFileSync(ledgerFile, 'utf8'),
    ) as Record<string, CostLedgerEntry[]>;
    expect(persisted[staleKey]).toBeUndefined();
    expect(persisted[todaysDateKey()]).toBeDefined();
    expect(persisted[todaysDateKey()]).toHaveLength(1);
  });

  it('does NOT prune entries within last 7 days', () => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const recentKey = fiveDaysAgo.toLocaleDateString('en-CA');
    const ledgerFile = join(tempDir, 'conductor-cost-ledger.json');
    writeFileSync(
      ledgerFile,
      JSON.stringify({
        [recentKey]: [
          {
            timestamp: fiveDaysAgo.toISOString(),
            model: 'claude-sonnet-4-6',
            inputTokens: 100,
            outputTokens: 50,
            costUsd: 0.001,
          },
        ],
      }),
      'utf8',
    );
    appendCostLedgerEntry({
      timestamp: new Date().toISOString(),
      model: 'claude-sonnet-4-6',
      inputTokens: 200,
      outputTokens: 100,
      costUsd: 0.002,
    });
    const persisted = JSON.parse(
      readFileSync(ledgerFile, 'utf8'),
    ) as Record<string, CostLedgerEntry[]>;
    expect(persisted[recentKey]).toBeDefined();
    expect(persisted[recentKey]).toHaveLength(1);
  });
});
