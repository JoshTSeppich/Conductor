// MB-T15 WB3 — TileHeader chrome implementation.
//
// Read-only header chrome for the tile (MB-T15 ticket). Renders status
// dot, session name (truncated), branch name, repo name, model chip,
// and token meter bar. Per Q-MBT15 dispositions:
//   Q-MBT15-1=a — model chip uses fixed color palette via modelChipColor
//   Q-MBT15-3=a — TileHeader is a CHILD of the existing tile-header div
//                 in tile.tsx (WB4 integration); existing testids
//                 (tile-header, tile-status-indicator, tile-session-name)
//                 stay intact for probe-01..04 backward-compat
//   Q-MBT15-4=a — inline-style for dynamic; flex layout primitives
//   Q-MBT15-5=b — status dot color via statusDotColor (gray/green/red;
//                 yellow unused v3.0)
//   Q-MBT15-6=a — token meter horizontal bar with tint thresholds
//                 (>0.7 warn, >0.85 danger)
//   Q-MBT15-7=a — flex + ellipsis truncation for min-width 240px

import {
  modelChipColor,
  modelChipShortcode,
  statusDotColor,
  tokenMeterTint,
  type StatusDotColor,
  type TokenMeterTint,
} from './color-helpers.js';
import type { TileStatus } from './types.js';

export interface TileHeaderProps {
  readonly sessionName: string;
  readonly status: TileStatus;
  /** Branch name; defaults to 'main' per Q-MBT15-2 stub for v3.0. */
  readonly branchName?: string;
  /** Repo name; default basename(cwd) at the parent. Hidden when empty. */
  readonly repoName?: string;
  /** SDK model name (e.g., 'claude-sonnet-4-6'); modelChipShortcode
   *  maps to the chip. Default per Q-MBT15-2 stub. Chip is hidden if
   *  the SDK name doesn't map to a known shortcode. */
  readonly model?: string;
  /** Tokens consumed in the current session window. v3.0 ships stubbed
   *  per Q-MBT15-2; real data lands with autopilot integration. */
  readonly tokensUsed?: number;
  /** Token budget (model context window). v3.0 ships stubbed per
   *  Q-MBT15-2 (default 200_000 = Sonnet 4.6 context window). */
  readonly tokenBudget?: number;
}

// ── Color tables (placeholder hex; operator confirms in followup) ─────

const STATUS_DOT_HEX: Record<StatusDotColor, string> = {
  gray: '#6b7280',
  green: '#10b981',
  yellow: '#facc15',
  red: '#ef4444',
};

const TOKEN_TINT_HEX: Record<TokenMeterTint, string> = {
  normal: '#3b82f6', // blue — within budget
  warn: '#facc15', // amber — >0.7
  danger: '#ef4444', // red — >0.85
};

// ── Style primitives (Q-MBT15-4=a: inline-style for dynamic) ─────────

const HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  minWidth: 0, // allows flex children to shrink + truncate
  padding: '4px 8px',
  fontSize: '11px',
  color: '#e0e0e0',
  overflow: 'hidden',
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

const STATUS_DOT_STYLE_BASE: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  flexShrink: 0,
};

const TRUNCATE_STYLE_BASE: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flexShrink: 1,
  minWidth: 0,
};

const SESSION_NAME_STYLE: React.CSSProperties = {
  ...TRUNCATE_STYLE_BASE,
  fontWeight: 600,
};

const BRANCH_STYLE: React.CSSProperties = {
  ...TRUNCATE_STYLE_BASE,
  color: '#9ca3af',
  fontSize: '10px',
};

const REPO_STYLE: React.CSSProperties = {
  ...TRUNCATE_STYLE_BASE,
  color: '#6b7280',
  fontSize: '10px',
};

const CHIP_STYLE_BASE: React.CSSProperties = {
  color: '#0a0a0a',
  padding: '1px 6px',
  borderRadius: '3px',
  fontSize: '10px',
  fontWeight: 700,
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

const METER_OUTER_STYLE: React.CSSProperties = {
  width: '40px',
  height: '6px',
  backgroundColor: '#1f2937',
  borderRadius: '3px',
  flexShrink: 0,
  position: 'relative',
  overflow: 'hidden',
};

// MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB6 — ctx N% inline label
// rendered as a sibling of the token-meter (Sub-Q-MBTWTWS-A=(iv) +
// Sub-Q-MBTWTWS-B=(a) inline-not-stacked). Sits adjacent to the bar,
// preserving the existing color-coded tint signal.
const CTX_TEXT_STYLE: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '10px',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};

// ── Component ────────────────────────────────────────────────────────

export function TileHeader(props: TileHeaderProps): JSX.Element {
  const {
    sessionName,
    status,
    branchName = 'main',
    repoName = '',
    model = 'claude-sonnet-4-6',
    tokensUsed = 0,
    tokenBudget = 200_000,
  } = props;

  const dotColor = statusDotColor(status);
  const dotStyle: React.CSSProperties = {
    ...STATUS_DOT_STYLE_BASE,
    backgroundColor: STATUS_DOT_HEX[dotColor],
  };

  const chipShortcode = modelChipShortcode(model);

  const tokenRatio = tokenBudget > 0 ? tokensUsed / tokenBudget : 0;
  const tint = tokenMeterTint(tokenRatio);
  const fillStyle: React.CSSProperties = {
    width: `${Math.min(100, Math.max(0, tokenRatio * 100))}%`,
    height: '100%',
    backgroundColor: TOKEN_TINT_HEX[tint],
    transition: 'width 0.3s, background-color 0.3s',
  };

  return (
    <div data-testid="tile-header-content" style={HEADER_STYLE}>
      <span
        data-testid="tile-status-indicator"
        data-status={status}
        data-status-color={dotColor}
        style={dotStyle}
      />
      <span
        data-testid="tile-session-name"
        title={sessionName}
        style={SESSION_NAME_STYLE}
      >
        {sessionName}
      </span>
      <span
        data-testid="tile-header-branch-name"
        title={branchName}
        style={BRANCH_STYLE}
      >
        ⎇ {branchName}
      </span>
      {repoName && (
        <span
          data-testid="tile-header-repo-name"
          title={repoName}
          style={REPO_STYLE}
        >
          {repoName}
        </span>
      )}
      {chipShortcode && (
        <span
          data-testid="tile-header-model-chip"
          data-chip={chipShortcode}
          style={{
            ...CHIP_STYLE_BASE,
            backgroundColor: modelChipColor(chipShortcode),
          }}
        >
          {chipShortcode}
        </span>
      )}
      <span
        data-testid="tile-header-ctx-text"
        style={CTX_TEXT_STYLE}
      >
        ctx {Math.round(tokenRatio * 100)}%
      </span>
      <div
        data-testid="tile-header-token-meter"
        data-tint={tint}
        title={`${tokensUsed.toLocaleString()} / ${tokenBudget.toLocaleString()} tokens`}
        style={METER_OUTER_STYLE}
      >
        <div data-testid="tile-header-token-meter-fill" style={fillStyle} />
      </div>
    </div>
  );
}
