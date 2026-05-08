// MB-T22 WB1 RED — Commits tab renderer stub.
//
// Throws at render time so probe-03 (commits-tab render tests) fails
// RED. Real implementation lands at WB4 green: groups (Today/Yesterday/
// Older) → rows (short SHA + session attribution + subject + diff stat
// + time-ago) + 60s setInterval to refresh time-ago text.
//
// Type-only import of CommitGroup from ./commits-reader.js is erased by
// esbuild at bundle time — the browser bundle does NOT pull
// node:child_process from commits-reader.ts. WB4 will fetch real data
// at mount time via window.commitsBridge.listCommits() per Q-MBT22-7.
import type { ReactNode } from 'react';
import type { CommitGroup } from './commits-reader.js';

export interface CommitsTabProps {
  /** Pre-grouped commits (WB4 wires window.commitsBridge → groups). */
  readonly groups?: readonly CommitGroup[];
  /** Loading flag — WB4 renders skeleton row when true. */
  readonly loading?: boolean;
  /** Error string — WB4 renders error row when non-null. */
  readonly error?: string | null;
  /** Injected for deterministic time-ago tests; defaults to new Date(). */
  readonly now?: Date;
}

/**
 * data-testid contract (probe-03 + WB4 wiring):
 *   - commits-tab-root            outer container
 *   - commits-tab-loading         loading skeleton (loading=true)
 *   - commits-tab-error           error row (error non-null)
 *   - commits-tab-empty           empty-state row (no groups)
 *   - commits-tab-group-{label}   per-group container ("today" | "yesterday" | "older")
 *   - commits-tab-row-{shortSha}  per-commit row
 *   - commits-tab-row-{shortSha}-attribution   session attribution chip
 *   - commits-tab-row-{shortSha}-time-ago      time-ago text (auto-updates 60s)
 *
 * WB1 RED — throws unconditionally.
 */
export function CommitsTab(_props: CommitsTabProps = {}): ReactNode {
  throw new Error(
    'MB-T22 WB1 RED — CommitsTab not implemented (lands at WB4 green)',
  );
}
