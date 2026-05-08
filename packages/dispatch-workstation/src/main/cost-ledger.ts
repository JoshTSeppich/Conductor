// MB-T26 WB2 — cost-ledger green: date-keyed JSON persistence.
//
// Operator-confirmed Q-MBT26-4=a (date-keyed JSON ledger in userData,
// mirrors splitter-state.ts per CLAUDE.md §3.5) + Q-MBT26-7=a (date-key
// derived midnight reset) 2026-05-07.
//
// Storage shape: <stateDir>/conductor-cost-ledger.json
//   { "YYYY-MM-DD": [CostLedgerEntry, ...], ... }
// Date-key is local-TZ via Date.prototype.toLocaleDateString('en-CA') (the
// 'en-CA' locale yields YYYY-MM-DD format reliably across Node + browsers).
// Midnight reset is implicit: after midnight, the next call writes under a
// new date-key and todaysTotalCost() reads only today's bucket.
//
// Env-var override MB_COST_LEDGER_DIR mirrors splitter-state.ts's
// MB_SPLITTER_STATE_DIR for test isolation.
//
// Persistence is best-effort (try/catch): write failures are silent
// (mirrors splitter-state.ts pattern). Cost meter is observability, not
// load-bearing — operator-visible cost reset on disk-full / permission
// error is acceptable failure mode.
//
// Prune: entries older than 7 days (PRUNE_RETENTION_DAYS) are removed at
// each appendCostLedgerEntry call. Bounds ledger size; documented in
// diagnose §IV R-MBT26-7.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app as appSingleton } from 'electron';

const LEDGER_FILENAME = 'conductor-cost-ledger.json';
const PRUNE_RETENTION_DAYS = 7;

export interface CostLedgerEntry {
  /** ISO 8601 timestamp (e.g., "2026-05-07T18:32:00.000Z"). */
  readonly timestamp: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  /** Pre-computed cost in USD (computeCost result snapshotted at append time). */
  readonly costUsd: number;
}

export type CostLedger = Readonly<Record<string, ReadonlyArray<CostLedgerEntry>>>;

function stateDir(): string {
  return process.env['MB_COST_LEDGER_DIR'] ?? appSingleton.getPath('userData');
}

function ledgerPath(): string {
  return join(stateDir(), LEDGER_FILENAME);
}

/** Local-TZ YYYY-MM-DD per Q-MBT26-7=a (date-key derived midnight reset). */
export function todaysDateKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

function readLedgerInternal(): Record<string, CostLedgerEntry[]> {
  try {
    const raw = readFileSync(ledgerPath(), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, CostLedgerEntry[]>;
    }
    return {};
  } catch {
    return {};
  }
}

function writeLedgerInternal(
  ledger: Record<string, CostLedgerEntry[]>,
): void {
  try {
    const dir = stateDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(ledgerPath(), JSON.stringify(ledger), 'utf8');
  } catch {
    // Non-fatal — best-effort persistence.
  }
}

function pruneOlderThan(
  ledger: Record<string, CostLedgerEntry[]>,
  retainDays: number,
): void {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retainDays);
  const cutoffKey = cutoff.toLocaleDateString('en-CA');
  for (const dateKey of Object.keys(ledger)) {
    if (dateKey < cutoffKey) {
      delete ledger[dateKey];
    }
  }
}

export function appendCostLedgerEntry(entry: CostLedgerEntry): void {
  const ledger = readLedgerInternal();
  const todayKey = todaysDateKey();
  const todayEntries = ledger[todayKey] ?? [];
  ledger[todayKey] = [...todayEntries, entry];
  pruneOlderThan(ledger, PRUNE_RETENTION_DAYS);
  writeLedgerInternal(ledger);
}

export function todaysTotalCost(): number {
  const ledger = readLedgerInternal();
  const todayEntries = ledger[todaysDateKey()] ?? [];
  return todayEntries.reduce((sum, e) => sum + e.costUsd, 0);
}
