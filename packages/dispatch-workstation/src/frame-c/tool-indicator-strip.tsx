// MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB8 (green) — strip
// rendering parsed tool-invocation indicators above the terminal body.
//
// Per ticket body 30ab109 §4 WB8 + Sub-Q-MBTWFT2-B=(i) regex.
//
// Cooking row: `Cooking ${MM}m ${SS}s · ${queued} tools queued`. The
// elapsed cursor advances client-side at 1Hz via useEffect+setInterval,
// resetting to state.cooking.elapsedMs whenever the parent re-parses
// the chunk buffer and emits a new value (typical: every chunk
// re-parse). This keeps the visible counter alive between PTY emissions
// without requiring the parent to re-render on every second.
//
// Recent events: compact horizontal/stacked list of the latest N
// events from state.recent (parser ring-buffer cap = 20; strip caps
// display at 5 for visual density). Each event renders as a single
// line with its kind-specific label.
//
// nextTool: italic dim preview row below the cooking line; renders
// literal `next: ${nextTool}` when nextTool is non-null.
//
// Empty state: strip container renders with no children — honest
// "no indicators yet" UX matching detail-pane.tsx:213-214 placeholder
// posture.

import { useEffect, useState, type CSSProperties } from 'react';
import type {
  ToolEvent,
  ToolIndicatorState,
} from './tool-indicator-parser.js';

const STRIP_ROOT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '6px 12px',
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#9ca3af',
  borderBottom: '1px solid #303030',
  boxSizing: 'border-box',
  minHeight: '0',
};

const COOKING_ROW_STYLE: CSSProperties = {
  color: '#dddddd',
  fontVariantNumeric: 'tabular-nums',
};

const NEXT_ROW_STYLE: CSSProperties = {
  fontStyle: 'italic',
  color: '#6b7280',
};

const RECENT_LIST_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const RECENT_DISPLAY_CAP = 5;

export interface ToolIndicatorStripProps {
  readonly state: ToolIndicatorState;
}

export function ToolIndicatorStrip({
  state,
}: ToolIndicatorStripProps): JSX.Element {
  const cookingBaseMs = state.cooking?.elapsedMs ?? null;
  const cookingQueued = state.cooking?.queued ?? null;

  const [tickMs, setTickMs] = useState<number>(cookingBaseMs ?? 0);

  // 1Hz tick. Reset on cookingBaseMs change (parent re-parsed chunk
  // buffer and emitted a new state.cooking.elapsedMs). When cooking is
  // null, the interval is not started.
  useEffect(() => {
    if (cookingBaseMs === null) return undefined;
    setTickMs(cookingBaseMs);
    const handle = setInterval(() => {
      setTickMs((prev) => prev + 1000);
    }, 1000);
    return () => {
      clearInterval(handle);
    };
  }, [cookingBaseMs]);

  const displayedRecent = state.recent.slice(-RECENT_DISPLAY_CAP);

  return (
    <div data-testid="frame-c-tool-indicator-strip" style={STRIP_ROOT_STYLE}>
      {cookingBaseMs !== null && cookingQueued !== null && (
        <div style={COOKING_ROW_STYLE}>{formatCookingLine(tickMs, cookingQueued)}</div>
      )}
      {state.nextTool !== null && state.nextTool.length > 0 && (
        <div style={NEXT_ROW_STYLE}>next: {state.nextTool}</div>
      )}
      {displayedRecent.length > 0 && (
        <div style={RECENT_LIST_STYLE}>
          {displayedRecent.map((event, idx) => (
            <div key={idx}>{formatToolEvent(event)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatCookingLine(elapsedMs: number, queued: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ss = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `Cooking ${minutes}m ${ss}s · ${queued} tools queued`;
}

function formatToolEvent(event: ToolEvent): string {
  switch (event.kind) {
    case 'bash':
      return `Bash: ${event.cmd}`;
    case 'read':
      return `Read: ${event.path}`;
    case 'edit':
      return `Edit ${event.path} (+${event.added} -${event.deleted})`;
    case 'write':
      return `Write ${event.path}`;
  }
}
