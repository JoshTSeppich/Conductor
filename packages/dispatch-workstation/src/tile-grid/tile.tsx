// MB-T12 WB5 — single-tile wrapper for the tile-grid React tree.
//
// Composition:
//   <Tile>
//     <header>
//       status-indicator | session-name |
//       <slot:picker>     (MB-T16 future)
//       <slot:autopilot>  (MB-T17 future)
//       collapse-btn      (WB10 wires)
//       detach-btn        (WB11 wires)
//       kill-btn          (sess-mbt11 session-kill IPC; parent plumbs callback)
//     </header>
//     <body>
//       <ConsolePanel targetSessionName={sessionName} ... />   (or hidden when collapsed)
//     </body>
//     <slot:footer>       (MB-T18 future)
//   </Tile>
//
// All click handlers are callback props the parent (tile-grid.tsx, WB6)
// plumbs; this keeps the Tile component free of direct IPC bridge calls
// and testable in isolation. WB6+ wires the callbacks to the appropriate
// bridge methods + tile-grid-state mutations.
//
// Per Q-MBT12-7=a (operator-arbitrated 2026-05-07): picker dropdown
// (MB-F-T13-TILE-HEADER-PICKER-INTEGRATION) and autopilot toggle
// (MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION) are placeholder slots in
// WB5; their respective followups populate them. Footer slot is also
// placeholder for MB-T18.

import { ConsolePanel } from '../console-panel/console-panel.js';
import { TileHeader } from './tile-header.js';
import type { ConsoleBridge } from '../main/console-bridge.js';
import type { TerminalAdapter } from '../console-panel/terminal-adapter.js';
import type { TileStatus } from './types.js';

// Re-export TileStatus so existing consumers (tile-grid.tsx) keep
// importing from './tile.js'. MB-T15 WB1 extracted the type into
// types.ts so non-JSX modules (color-helpers.ts) can import it without
// pulling tile.tsx into tsc scope.
export type { TileStatus };

export interface TileProps {
  readonly sessionName: string;
  readonly consoleBridge: ConsoleBridge;
  readonly createTerminal: () => TerminalAdapter;
  readonly collapsed: boolean;
  readonly status?: TileStatus;
  readonly onKill: (sessionName: string) => void;
  readonly onCollapse: (sessionName: string) => void;
  readonly onDetach: (sessionName: string) => void;
  /** WB8 drag-swap source: fires on header mousedown (excluding button targets). */
  readonly onSwapDragStart?: (sessionName: string) => void;
  /** WB8 drag-swap target: fires on header mouseup (excluding button targets). */
  readonly onSwapDrop?: (sessionName: string) => void;
  // ── MB-T15 WB4: tile-header chrome plumb-through ──────────────────
  /** Branch name displayed in the tile-header chrome (MB-T15).
   *  Defaults to 'main' inside TileHeader per Q-MBT15-2 stub. */
  readonly branchName?: string;
  /** Repo name (basename(cwd)) displayed in the tile-header chrome.
   *  Hidden when empty or unset. */
  readonly repoName?: string;
  /** SDK model name (e.g., 'claude-sonnet-4-6'). Defaults to
   *  'claude-sonnet-4-6' inside TileHeader per Q-MBT15-2 stub. */
  readonly model?: string;
  /** Tokens consumed in the current session window (MB-T15 token meter).
   *  Default 0 per Q-MBT15-2 stub. */
  readonly tokensUsed?: number;
  /** Token budget (model context window). Default 200_000 per
   *  Q-MBT15-2 stub. */
  readonly tokenBudget?: number;
}

// Skip drag-swap when the user clicks an interactive header element
// (kill/collapse/detach buttons + future picker/autopilot inputs).
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.closest('button') !== null ||
    target.closest('input') !== null ||
    target.closest('select') !== null ||
    target.closest('textarea') !== null
  );
}

export function Tile({
  sessionName,
  consoleBridge,
  createTerminal,
  collapsed,
  status = 'idle',
  onKill,
  onCollapse,
  onDetach,
  onSwapDragStart,
  onSwapDrop,
  branchName,
  repoName,
  model,
  tokensUsed,
  tokenBudget,
}: TileProps): JSX.Element {
  return (
    <div
      data-testid={`tile-${sessionName}`}
      data-collapsed={collapsed ? 'true' : 'false'}
      data-status={status}
      style={
        collapsed
          ? { height: '40px', overflow: 'hidden', alignSelf: 'start' }
          : undefined
      }
      onClick={
        collapsed
          ? (e) => {
              // WB10: click anywhere on a collapsed tile (excluding the
              // kill/detach/picker/autopilot buttons) toggles expand.
              if (isInteractiveTarget(e.target)) return;
              onCollapse(sessionName);
            }
          : undefined
      }
    >
      <div
        data-testid="tile-header"
        onMouseDown={(e) => {
          if (isInteractiveTarget(e.target)) return;
          onSwapDragStart?.(sessionName);
        }}
        onMouseUp={(e) => {
          if (isInteractiveTarget(e.target)) return;
          onSwapDrop?.(sessionName);
        }}
      >
        {/* MB-T15 WB4: TileHeader provides the read-only chrome (status
            dot, session name truncated, branch, repo, model chip,
            token meter) per Q-MBT15-3=a operator-confirmed disposition.
            Per Q-MBT15-3=a: TileHeader emits the legacy `tile-status-
            indicator` + `tile-session-name` testids (with `data-status`
            preserved on the indicator) so MB-T12 probe-01..04 tests
            stay GREEN without migration. */}
        <TileHeader
          sessionName={sessionName}
          status={status}
          branchName={branchName}
          repoName={repoName}
          model={model}
          tokensUsed={tokensUsed}
          tokenBudget={tokenBudget}
        />
        <div data-slot="picker" data-testid={`tile-picker-slot-${sessionName}`} />
        <div
          data-slot="autopilot"
          data-testid={`tile-autopilot-slot-${sessionName}`}
        />
        <button
          type="button"
          data-testid="tile-collapse-btn"
          onClick={() => onCollapse(sessionName)}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
        <button
          type="button"
          data-testid="tile-detach-btn"
          onClick={() => onDetach(sessionName)}
        >
          Detach
        </button>
        <button
          type="button"
          data-testid="tile-kill-btn"
          onClick={() => onKill(sessionName)}
        >
          Kill
        </button>
      </div>
      {!collapsed && (
        <div data-testid="tile-body">
          {status === 'detached' ? (
            <div data-testid="tile-detached-placeholder">
              detached — close window to reattach
            </div>
          ) : (
            <ConsolePanel
              targetSessionName={sessionName}
              consoleBridge={consoleBridge}
              createTerminal={createTerminal}
            />
          )}
        </div>
      )}
      <div data-slot="footer" data-testid={`tile-footer-slot-${sessionName}`} />
    </div>
  );
}
