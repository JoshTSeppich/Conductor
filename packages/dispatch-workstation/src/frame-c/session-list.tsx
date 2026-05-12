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
//   - Per-row `ctx N%` text rendering shipped by
//     MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB2 (Sub-Q-MBTWTWS-B=(a)
//     inline format): span as direct child of the row, right-aligned
//     via flex marginLeft:auto. tokenBudget undefined/0 falls back to
//     `ctx 0%` (no NaN/Infinity per probe-mbtwtws-01 Condition 4).
//   - Selection-state visual (aria-selected, highlight) DEFERRED to
//     WB6 GREEN; WB4 ships rows without selection awareness.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { TileGridSessionEntry } from '../tile-grid/tile-grid.js';
import { statusToColor } from './status-color.js';
import { modelToLabel } from './model-badge.js';
import { formatUptime } from './uptime-format.js';

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

// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB6 — status-color mapping
// extracted to frame-c/status-color.ts (Sub-Q-T1-C=(i)). Removes the
// inline STATUS_DOT_HEX literal (which had dead-code 'collapsed' key
// and incomplete 'idle'/'error'/'warning' coverage) in favor of the
// exhaustive switch-based mapping in status-color.ts. Fallback color
// for unknown / killed status: green (matches prior STATUS_DOT_HEX[x]
// ?? STATUS_DOT_HEX['open']! pattern; statusToColor returns null for
// 'killed' so the !! coalesce here yields green).
const FALLBACK_DOT_HEX = '#5b9d6e';

// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB8 — model-badge inline style
// (short-form label between status dot and session name per wireframe
// left-to-right layout). Subtle muted color so it doesn't compete with
// the primary session-name typography; T7 visual-polish ticket may
// refine.
const MODEL_BADGE_STYLE: CSSProperties = {
  fontSize: '10px',
  color: '#7a8290',
  fontWeight: 500,
  letterSpacing: '0.5px',
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB10 — uptime inline style.
// Right-aligned via marginLeft:auto adjacency before the ctx text
// (which also uses marginLeft:auto — first marginLeft:auto wins the
// flex space, the other is pushed to the right). Both ctx + uptime
// render as siblings; the visual order is name · meta · [auto-space]
// · uptime · ctx.
const UPTIME_STYLE: CSSProperties = {
  fontSize: '11px',
  color: '#9ca3af',
  marginLeft: 'auto',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
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

// MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB2 — ctx N% inline label.
// marginLeft:auto right-aligns within the flex row (Sub-Q-MBTWTWS-B=a).
const CTX_TEXT_STYLE: CSSProperties = {
  fontSize: '11px',
  color: '#9ca3af',
  marginLeft: 'auto',
  flexShrink: 0,
  whiteSpace: 'nowrap',
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

  // MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB10 — renderer-internal
  // mount-time per Sub-Q-T1-D=(i). Mount-times for each session live
  // in a useRef<Map> (no re-render on mutation); a 1s setInterval-
  // driven `now` useState drives re-renders so the uptime label ticks.
  // Mount-times register in useEffect when new sessions appear in the
  // prop array; first render of a session reads `now` as the mount-time
  // (yields formatUptime(0) → '00:00' on initial paint).
  // Semantics caveat: this is renderer-mount-time, NOT session-spawn-
  // time. Resets on Frame A↔C toggle. Tier 3 followup MB-F-FRAME-C-
  // UPTIME-LOST-ON-FRAME-TOGGLE filed at WB-final.
  const mountTimesRef = useRef<Map<string, number>>(new Map());
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    for (const s of sessions) {
      if (!mountTimesRef.current.has(s.name)) {
        mountTimesRef.current.set(s.name, Date.now());
      }
    }
  }, [sessions]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div data-testid="frame-c-session-list" style={LIST_ROOT_STYLE}>
      {sessions.map((s) => {
        const statusKey = s.status ?? 'open';
        const dotColor = statusToColor(statusKey) ?? FALLBACK_DOT_HEX;
        const mountTime = mountTimesRef.current.get(s.name) ?? now;
        const uptimeLabel = formatUptime(now - mountTime);
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
        // ctx N% percent — guard tokenBudget undefined/0 to avoid
        // NaN (0/0) or Infinity (n/0). Fallback "ctx 0%" is the honest
        // "no data yet" surface (sessions pre-first-scrape).
        const ctxPct =
          s.tokenBudget !== undefined && s.tokenBudget > 0
            ? Math.round(((s.tokensUsed ?? 0) / s.tokenBudget) * 100)
            : 0;
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
              data-testid={`frame-c-session-row-model-${s.name}`}
              style={MODEL_BADGE_STYLE}
            >
              {modelToLabel(s.model)}
            </span>
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
            <span
              data-testid={`frame-c-session-row-uptime-${s.name}`}
              style={UPTIME_STYLE}
            >
              {uptimeLabel}
            </span>
            <span
              data-testid={`frame-c-session-row-ctx-text-${s.name}`}
              style={CTX_TEXT_STYLE}
            >
              ctx {ctxPct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
