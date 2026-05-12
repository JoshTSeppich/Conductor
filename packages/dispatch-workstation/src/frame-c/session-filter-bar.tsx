// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB11 (green) — session filter
// bar component per ticket body §1.1 item 5 + Sub-Q-T1-E=(α) operator-
// acked "renderer-only useState filter" (2026-05-12, ec60622).
//
// Renders the wireframe filter row (status dropdown + repo dropdown +
// Clear button) above the SessionList. Receives filter state from
// FrameCRoot and reports changes via onChange callback; FrameCRoot
// holds the state via useState<FilterState> and applies the filter to
// the sessions array before passing to SessionList.
//
// Filter state lost on Frame A↔C toggle + workstation re-launch
// (renderer-only; no persistence). Tier 3 followup MB-F-FRAME-C-
// FILTER-STATE-NOT-PERSISTED filed at WB-final per ticket body §5.2
// + §3.5 default Sub-Q-E=(α).
//
// Status options derived from TileStatus union + 'all' sentinel:
//   'all' | 'idle' | 'open' | 'detached' | 'error' | 'warning'
// ('killed' filtered out — sessions in killed state are not rendered
// anyway per SessionList's null-status-color from statusToColor).
//
// Repo options derived dynamically from sessions[].repoName unique set
// + 'all' sentinel. Sessions without repoName are still shown when
// repo='all' but cannot be filtered to a specific repo value.

import { useMemo, type CSSProperties } from 'react';
import type { TileGridSessionEntry } from '../tile-grid/tile-grid.js';
import type { TileStatus } from '../tile-grid/types.js';

export type StatusFilter = 'all' | TileStatus;
export type RepoFilter = 'all' | string;

export interface FilterState {
  readonly status: StatusFilter;
  readonly repo: RepoFilter;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  status: 'all',
  repo: 'all',
};

export interface SessionFilterBarProps {
  readonly sessions: readonly TileGridSessionEntry[];
  readonly filterState: FilterState;
  readonly onFilterStateChange: (next: FilterState) => void;
}

// Status filter options — subset of TileStatus + 'all'. 'killed' is
// omitted (killed sessions are filtered out before render anyway).
const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All status' },
  { value: 'open', label: 'Open' },
  { value: 'idle', label: 'Idle' },
  { value: 'detached', label: 'Detached' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

const BAR_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 8px',
  borderBottom: '1px solid #1a1a1a',
  fontSize: '11px',
  color: '#aaaaaa',
  boxSizing: 'border-box',
};

const SELECT_STYLE: CSSProperties = {
  background: '#1a1a1a',
  color: '#cccccc',
  border: '1px solid #303030',
  borderRadius: '3px',
  fontSize: '11px',
  padding: '2px 4px',
  cursor: 'pointer',
};

const BUTTON_STYLE: CSSProperties = {
  ...SELECT_STYLE,
  marginLeft: 'auto',
};

export function SessionFilterBar(props: SessionFilterBarProps): JSX.Element {
  const { sessions, filterState, onFilterStateChange } = props;

  // Dynamic repo option list from sessions[].repoName. Sorted for
  // stable ordering. Empty/undefined repoName values are excluded
  // (filter shows 'all' + actual repo names only).
  const repoOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      if (s.repoName !== undefined && s.repoName.length > 0) {
        set.add(s.repoName);
      }
    }
    return Array.from(set).sort();
  }, [sessions]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onFilterStateChange({
      ...filterState,
      status: e.target.value as StatusFilter,
    });
  };

  const handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onFilterStateChange({
      ...filterState,
      repo: e.target.value as RepoFilter,
    });
  };

  const handleClear = (): void => {
    onFilterStateChange(DEFAULT_FILTER_STATE);
  };

  return (
    <div data-testid="frame-c-filter-bar" style={BAR_STYLE}>
      <select
        data-testid="frame-c-filter-status"
        value={filterState.status}
        onChange={handleStatusChange}
        style={SELECT_STYLE}
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        data-testid="frame-c-filter-repo"
        value={filterState.repo}
        onChange={handleRepoChange}
        style={SELECT_STYLE}
        aria-label="Filter by repository"
      >
        <option value="all">All repos</option>
        {repoOptions.map((repo) => (
          <option key={repo} value={repo}>
            {repo}
          </option>
        ))}
      </select>
      <button
        type="button"
        data-testid="frame-c-filter-clear"
        onClick={handleClear}
        style={BUTTON_STYLE}
        aria-label="Clear filters"
      >
        Clear
      </button>
    </div>
  );
}

/**
 * Apply filter state to a sessions array. Returns the subset matching
 * BOTH status (or 'all') AND repo (or 'all').
 */
export function applyFilter(
  sessions: readonly TileGridSessionEntry[],
  filterState: FilterState,
): readonly TileGridSessionEntry[] {
  return sessions.filter((s) => {
    if (filterState.status !== 'all') {
      const status = s.status ?? 'open';
      if (status !== filterState.status) return false;
    }
    if (filterState.repo !== 'all') {
      if (s.repoName !== filterState.repo) return false;
    }
    return true;
  });
}
