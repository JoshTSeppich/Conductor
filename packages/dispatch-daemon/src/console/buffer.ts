/**
 * CONSOLE-T01 — cc_console_buffer accessor + ring-eviction helpers.
 *
 * Per CONDUCTOR_API_CONTRACT.md §4.7.1 (frozen at a7e8d4f, v2.2.0): the
 * STDOUT ring buffer is per-session, FIFO-eviction, with monotonic
 * stdout_seq that never resets within a session lifetime. Default cap
 * 50,000 lines per vision §10.5.
 *
 * This module is the single SQLite touchpoint for the cc_console_buffer
 * table. Route handlers (POST /stdin updates the cc_console_state
 * counter — separate concern; WS /stream replays from this buffer; GET
 * /buffer slices from this buffer; GET /status aggregates from this
 * buffer) consume the helpers below rather than embedding SQL.
 *
 * MB-S06 ADR §6 (frozen at b641e58) verified the FIFO eviction pattern
 * KNOWN at 100-line cap with 500 produced lines. This module's
 * implementation matches that pattern at production scale.
 */

import type Database from 'better-sqlite3';

/** Default ring buffer capacity per vision §10.5. */
export const DEFAULT_CAPACITY = 50_000;

/**
 * Encoding flag stored alongside `bytes`. `utf8` means the bytes
 * decode cleanly to a UTF-8 string for the WS line message; `base64`
 * means the bytes contain invalid UTF-8 sequences and the WS line
 * message should carry a base64-encoded payload (per §4.7.3).
 */
export type LineEncoding = 'utf8' | 'base64';

export interface BufferLine {
  stdout_seq: number;
  bytes: Buffer;
  encoding: LineEncoding;
  ts: number;
}

export interface BufferStats {
  count: number;
  earliest_in_buffer_seq: number | null;
  latest_in_buffer_seq: number | null;
  last_stdout_activity_at: number | null;
}

/**
 * Append a line to the buffer for `session_name`. Caller owns the
 * stdout_seq value (monotonically next per session). Returns nothing
 * — failure throws (likely UNIQUE constraint violation if the caller
 * passes a stale seq, which is a programmer error, not an
 * operator-recoverable runtime condition).
 *
 * Caller is responsible for invoking pruneToCapacity(...) periodically
 * (e.g., every N appends or every M seconds) to keep the table bounded.
 * Per MB-S06 §6 KNOWN behavior the eviction is FIFO; per-write prune is
 * cheap (a single DELETE WHERE seq < threshold).
 */
export function appendLine(
  db: Database.Database,
  sessionName: string,
  stdoutSeq: number,
  bytes: Buffer,
  encoding: LineEncoding,
  tsMs: number,
): void {
  db.prepare(
    `INSERT INTO cc_console_buffer (session_name, stdout_seq, bytes, encoding, ts)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(sessionName, stdoutSeq, bytes, encoding, tsMs);
}

/**
 * FIFO-evict rows for `sessionName` so at most `capacity` rows remain.
 * Returns the number of rows evicted (0 if buffer was already at or
 * below capacity).
 *
 * Implementation: compute the cutoff stdout_seq (the (N - capacity)-th
 * smallest value), then DELETE rows with stdout_seq below the cutoff.
 * Single SQL statement; no transaction needed because better-sqlite3 is
 * synchronous and SQLite's per-statement atomicity covers it.
 */
export function pruneToCapacity(
  db: Database.Database,
  sessionName: string,
  capacity: number,
): number {
  if (capacity < 0) throw new Error(`pruneToCapacity: capacity must be >= 0, got ${capacity}`);
  const countRow = db
    .prepare(`SELECT COUNT(*) as c FROM cc_console_buffer WHERE session_name = ?`)
    .get(sessionName) as { c: number };
  if (countRow.c <= capacity) return 0;

  // Find the cutoff seq: the smallest stdout_seq such that all rows
  // with stdout_seq >= cutoff form the newest `capacity` rows.
  const offset = countRow.c - capacity;
  const cutoffRow = db
    .prepare(
      `SELECT stdout_seq FROM cc_console_buffer
       WHERE session_name = ?
       ORDER BY stdout_seq ASC
       LIMIT 1 OFFSET ?`,
    )
    .get(sessionName, offset) as { stdout_seq: number } | undefined;
  if (!cutoffRow) return 0;

  const result = db
    .prepare(
      `DELETE FROM cc_console_buffer
       WHERE session_name = ? AND stdout_seq < ?`,
    )
    .run(sessionName, cutoffRow.stdout_seq);
  return result.changes;
}

/**
 * Return the current MAX(stdout_seq) for `sessionName`, or 0 if no rows
 * exist (so the next append uses seq=1).
 */
export function maxStdoutSeq(db: Database.Database, sessionName: string): number {
  const row = db
    .prepare(`SELECT MAX(stdout_seq) as mx FROM cc_console_buffer WHERE session_name = ?`)
    .get(sessionName) as { mx: number | null };
  return row.mx ?? 0;
}

/**
 * Return the smallest stdout_seq still present for `sessionName`, or
 * null if the buffer is empty.
 */
export function earliestStdoutSeq(
  db: Database.Database,
  sessionName: string,
): number | null {
  const row = db
    .prepare(`SELECT MIN(stdout_seq) as mn FROM cc_console_buffer WHERE session_name = ?`)
    .get(sessionName) as { mn: number | null };
  return row.mn;
}

/**
 * Return rows for `sessionName` with stdout_seq in (afterSeq, +∞],
 * ordered ASC, capped at `limit`. Used by:
 *   - WS /stream backfill: caller passes the client's last_seq; the
 *     range from MAX(last_seq, earliest-1)+1 onward is replayed.
 *   - GET /buffer when scanning from a given seq forward.
 */
export function getLinesAfter(
  db: Database.Database,
  sessionName: string,
  afterSeq: number,
  limit: number,
): BufferLine[] {
  const rows = db
    .prepare(
      `SELECT stdout_seq, bytes, encoding, ts
       FROM cc_console_buffer
       WHERE session_name = ? AND stdout_seq > ?
       ORDER BY stdout_seq ASC
       LIMIT ?`,
    )
    .all(sessionName, afterSeq, limit) as BufferLine[];
  return rows;
}

/**
 * Return rows for `sessionName` with stdout_seq < beforeSeq, ordered
 * DESC, capped at `limit`. Used by GET /buffer scrollback.
 */
export function getLinesBefore(
  db: Database.Database,
  sessionName: string,
  beforeSeq: number | null,
  limit: number,
): BufferLine[] {
  const sql = beforeSeq == null
    ? `SELECT stdout_seq, bytes, encoding, ts FROM cc_console_buffer
       WHERE session_name = ?
       ORDER BY stdout_seq DESC
       LIMIT ?`
    : `SELECT stdout_seq, bytes, encoding, ts FROM cc_console_buffer
       WHERE session_name = ? AND stdout_seq < ?
       ORDER BY stdout_seq DESC
       LIMIT ?`;
  const rows = beforeSeq == null
    ? (db.prepare(sql).all(sessionName, limit) as BufferLine[])
    : (db.prepare(sql).all(sessionName, beforeSeq, limit) as BufferLine[]);
  return rows;
}

export function getStats(db: Database.Database, sessionName: string): BufferStats {
  const row = db
    .prepare(
      `SELECT COUNT(*) as count,
              MIN(stdout_seq) as earliest,
              MAX(stdout_seq) as latest,
              MAX(ts) as last_ts
       FROM cc_console_buffer WHERE session_name = ?`,
    )
    .get(sessionName) as {
      count: number;
      earliest: number | null;
      latest: number | null;
      last_ts: number | null;
    };
  return {
    count: row.count,
    earliest_in_buffer_seq: row.earliest,
    latest_in_buffer_seq: row.latest,
    last_stdout_activity_at: row.last_ts,
  };
}
