// MB-T26 WB1 — cost-ledger red scaffold.
//
// Operator-confirmed Q-MBT26-4=a (date-keyed JSON ledger in userData,
// mirrors splitter-state.ts per CLAUDE.md §3.5) + Q-MBT26-7=a (date-key
// derived midnight reset) 2026-05-07.
//
// Persistence layer for per-day Conductor API spend. Storage shape:
//   <userData>/conductor-cost-ledger.json
//   { "YYYY-MM-DD": [CostLedgerEntry, ...], ... }
// "Today" derived from new Date().toLocaleDateString('en-CA') (yields
// YYYY-MM-DD in operator-machine-local timezone). Midnight reset is
// implicit: the next call after midnight writes under a new date-key
// and todaysTotalCost() reads only today's bucket.
//
// Env-var override MB_COST_LEDGER_DIR mirrors splitter-state.ts's
// MB_SPLITTER_STATE_DIR for test isolation.
//
// WB2 (green) implements append + sum + 7-day prune. WB1 only exposes
// the public-API shape so probe-02 (WB1) can import-resolve and fail
// at the assertion level (RED).

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

export function appendCostLedgerEntry(_entry: CostLedgerEntry): void {
  throw new Error(
    'MB-T26 WB1: appendCostLedgerEntry not yet implemented (red scaffold; WB2 green)',
  );
}

export function todaysTotalCost(): number {
  throw new Error(
    'MB-T26 WB1: todaysTotalCost not yet implemented (red scaffold; WB2 green)',
  );
}
