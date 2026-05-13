// MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB4 (green) — React
// presentational component rendering a colored dot per TileStatus
// via the frame-c/status-color.ts statusToColor mapping (READ-ONLY
// consumed per manifest territory).
//
// Ticket body anchor: CONDUCTOR_MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW
// _BUILD.md (commit 832c03b) §1.1 row 4 + §4 WB4.
//
// Renders:
//   <span data-testid="tile-status-indicator-{sessionName}"
//         data-status="{status}"
//         style="display:inline-block; width:10px; height:10px;
//                border-radius:50%; backgroundColor:{hex}; ..."/>
//
// Returns null when statusToColor returns null (TileStatus 'killed').
// Production callers (tile-header chrome slot, downstream ticket)
// SHOULD filter killed sessions before invoking; this null-return is
// a defensive call-site contract so a stray 'killed' entry does not
// render a misleading colored dot.
//
// No props beyond { status, sessionName } — width/height are fixed
// at 10px for v3.0 ship; theming + size variants deferred to follow-on.

import type { JSX } from 'react';
import type { TileStatus } from './types.js';
import { statusToColor } from '../frame-c/status-color.js';

export interface StatusIndicatorProps {
  readonly status: TileStatus;
  /** Used only for `data-testid` composition; not rendered as text. */
  readonly sessionName: string;
}

const DOT_SIZE_PX = 10;

export function StatusIndicator(
  props: StatusIndicatorProps,
): JSX.Element | null {
  const color = statusToColor(props.status);
  if (color === null) {
    // TileStatus 'killed' or any future null-mapping value — render
    // nothing. Production callers filter before invocation; this is
    // the defensive fallback.
    return null;
  }
  return (
    <span
      data-testid={`tile-status-indicator-${props.sessionName}`}
      data-status={props.status}
      style={{
        display: 'inline-block',
        width: `${DOT_SIZE_PX}px`,
        height: `${DOT_SIZE_PX}px`,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}
