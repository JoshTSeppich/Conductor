// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB4 (green) — SessionList component.
//
// Per ticket body a1f7a03 §1.1 item 3 + §4 WB4 acceptance:
//   - Consumes `readonly TileGridSessionEntry[]` prop (existing shape
//     from `tile-grid/tile-grid.tsx:29-52`).
//   - Renders one row per entry as a compact list-item form factor
//     (NOT the full tile-header chrome — Frame C is the wireframe-
//     author primary list-view mode per audit §3 + §A.1.R=(2)).
//   - Each row carries:
//       data-testid="frame-c-session-row-{name}"
//       data-session-name="{name}"  (for test-friendly + a11y)
//     and contains:
//       <span data-testid="frame-c-session-row-status-{name}"
//         data-status="{status}" />  (status badge)
//       session name
//       branchName + repoName when present
//   - `onSelect(sessionName)` callback prop wired by WB6 selection
//     wiring. WB4 scope ships the prop signature + click handler
//     plumbing; WB6 GREEN connects it to FrameCRoot's
//     useState<string | null>(selectedSessionName).
//   - Token meter rendering DEFERRED to MB-T-WIREFRAME-C5-TOKEN-
//     WIRING-SURFACE (separate ticket; body authored at `8ff40a8`).
//   - Selection-state visual (aria-selected, highlight) DEFERRED to
//     WB6 GREEN; WB4 ships rows without selection awareness.

import type { CSSProperties } from 'react';
import type { TileGridSessionEntry } from '../tile-grid/tile-grid.js';

// ─── Inline style constants (no external CSS at WB4) ─────────────────────────

const LIST_ROOT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  padding: '4px 0',
  boxSizing: 'border-box',
};

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 10px',
  borderBottom: '1px solid #1a1a1a',
  cursor: 'pointer',
  color: '#cccccc',
  fontSize: '12px',
  lineHeight: '1.4',
  boxSizing: 'border-box',
};

const STATUS_DOT_STYLE_BASE: CSSProperties = {
  display: 'inline-block',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  flexShrink: 0,
};

// Mirror tile-header.tsx STATUS_DOT_HEX semantics (color-by-status).
// Subset values per TileStatus enum from tile-grid.tsx:29.
const STATUS_DOT_HEX: Record<string, string> = {
  open: '#5b9d6e', // green
  collapsed: '#888888', // grey
  detached: '#c97a3a', // amber
};

const NAME_STYLE: CSSProperties = {
  fontWeight: 500,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const META_STYLE: CSSProperties = {
  fontSize: '11px',
  color: '#888888',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

// ─── Component ───────────────────────────────────────────────────────────────

export interface SessionListProps {
  readonly sessions: readonly TileGridSessionEntry[];
  /**
   * Click handler invoked when a row is selected. WB4 ships the prop
   * + plumbing; WB6 GREEN connects to FrameCRoot's useState.
   */
  readonly onSelect?: (sessionName: string) => void;
  /**
   * Currently-selected session name. WB6 GREEN wires from FrameCRoot
   * state. WB4 accepts the prop but does NOT render selection state
   * yet (no aria-selected / highlight) — deferred to keep WB4 scope
   * minimal per ticket §4 WB4 "compact list-item form factor; NOT the
   * full tile-header chrome".
   */
  readonly selectedSessionName?: string | null;
}

export function SessionList(props: SessionListProps): JSX.Element {
  const { sessions, onSelect, selectedSessionName } = props;

  return (
    <div data-testid="frame-c-session-list" style={LIST_ROOT_STYLE}>
      {sessions.map((s) => {
        const statusKey = s.status ?? 'open';
        const dotColor = STATUS_DOT_HEX[statusKey] ?? STATUS_DOT_HEX['open']!;
        const dotStyle: CSSProperties = {
          ...STATUS_DOT_STYLE_BASE,
          backgroundColor: dotColor,
        };

        // Compose meta line: "⎇ branch · repo" when fields present.
        // Conditional spread prevents undefined-text artifacts.
        const metaParts: string[] = [];
        if (s.branchName !== undefined && s.branchName.length > 0) {
          metaParts.push(`⎇ ${s.branchName}`);
        }
        if (s.repoName !== undefined && s.repoName.length > 0) {
          metaParts.push(s.repoName);
        }
        const metaText = metaParts.join(' · ');

        const handleClick = onSelect ? () => onSelect(s.name) : undefined;
        const isSelected = selectedSessionName === s.name;
        // WB6 — Sub-Q-A=α selection-state visual. aria-selected emitted
        // as "true"/"false" string per ARIA spec for listbox-pattern
        // selection. Background tint added when selected for visual
        // affordance (subtle highlight; details polished at WB11 smoke
        // operator review).
        const rowStyle: CSSProperties = isSelected
          ? { ...ROW_STYLE, backgroundColor: '#1f2a3f' }
          : ROW_STYLE;

        return (
          <div
            key={s.name}
            data-testid={`frame-c-session-row-${s.name}`}
            data-session-name={s.name}
            aria-selected={isSelected ? 'true' : 'false'}
            style={rowStyle}
            onClick={handleClick}
            role={handleClick ? 'button' : undefined}
            tabIndex={handleClick ? 0 : undefined}
          >
            <span
              data-testid={`frame-c-session-row-status-${s.name}`}
              data-status={statusKey}
              style={dotStyle}
              aria-label={`status: ${statusKey}`}
            />
            <span
              data-testid={`frame-c-session-row-name-${s.name}`}
              style={NAME_STYLE}
              title={s.name}
            >
              {s.name}
            </span>
            {metaText.length > 0 && (
              <span
                data-testid={`frame-c-session-row-meta-${s.name}`}
                style={META_STYLE}
                title={metaText}
              >
                {metaText}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
