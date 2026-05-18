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

import type { ReactNode } from 'react';
import { ConsolePanel } from '../console-panel/console-panel.js';
import { TileHeader } from './tile-header.js';
import type { ConsoleBridge } from '../main/console-bridge.js';
import type { TerminalAdapter } from '../console-panel/terminal-adapter.js';
import type { FrameMode } from '../main/frame-mode-state.js';
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
  // ── MB-T-MVP-W2-AGENT-GRID WB3: spawnedAtMs end-to-end prop-drill ─
  /** Spawn-time (ms-since-epoch) for the session. Threaded to
   *  <TileHeader spawnedAtMs> where `formatUptimeLabel(spawnedAtMs,
   *  Date.now())` renders the operator-vision-Component-2 uptime
   *  chrome element. Optional — when undefined, uptime label is
   *  conditionally suppressed inside TileHeader (graceful absent-data).
   *  Source: TileGridSessionEntry.spawnedAtMs populated by tile-grid-
   *  app.tsx spawn-result handler from the SpawnSessionResult envelope. */
  readonly spawnedAtMs?: number;
  // ── MB-T16 WB4: tile-header picker slot render-prop ───────────────
  /** Render-prop for the picker slot (Q-MBT16-4=a). When provided,
   *  the closure is called with the tile's `sessionName` and the
   *  result is rendered INSIDE the existing
   *  `<div data-slot="picker" data-testid="tile-picker-slot-{name}">`
   *  wrapper (per Q-MBT16-3=a-equivalent slot-population semantics).
   *  When undefined, the wrapper renders empty (preserves the legacy
   *  MB-T12 WB5 picker slot affordance for tests not exercising
   *  MB-T16). */
  readonly renderPickerSlot?: (sessionName: string) => ReactNode;
  // ── MB-T17 WB4: tile-header autopilot slot render-prop ────────────
  /** Render-prop for the autopilot slot (Q-MBT17-4=a). Mirrors
   *  renderPickerSlot semantics: when provided, closure is called with
   *  the tile's `sessionName` and the result renders INSIDE the
   *  existing `<div data-slot="autopilot" data-testid="tile-autopilot-
   *  slot-{name}">` wrapper. When undefined, the wrapper renders empty
   *  (preserves MB-T12 WB5 autopilot slot affordance for tests not
   *  exercising MB-T17). */
  readonly renderAutopilotSlot?: (sessionName: string) => ReactNode;
  // ── MB-T18 WB3: per-tile footer slot render-prop ──────────────────
  /** Render-prop for the footer slot (Q-MBT18-4=a). Mirrors
   *  renderPickerSlot / renderAutopilotSlot semantics: when provided,
   *  closure is called with the tile's `sessionName` and the result
   *  renders INSIDE the existing `<div data-slot="footer"
   *  data-testid="tile-footer-slot-{name}">` wrapper. When undefined,
   *  the wrapper renders empty (preserves MB-T12 WB5 footer slot
   *  affordance for tests not exercising MB-T18). The closure typically
   *  captures `cwd` from the session entry + renders <TileFooter
   *  sessionName cwd /> per Q-MBT18-1=e. */
  readonly renderFooterSlot?: (sessionName: string) => ReactNode;
  // ── MB-T-WIREFRAME-C1P4 WB2: compact-mode gate ────────────────────
  /** Frame-shell mode toggle per §C.1′ Frame Router (44764fd).
   *  When `'A'`, the Tile renders in compact wireframe-aligned variant:
   *  SHIPPED-BEYOND-WIREFRAME chrome (collapse + detach buttons + picker
   *  + autopilot slot children) is suppressed per audit §4.1 +
   *  Sub-Q-MBTWBCTM-A=(i) strict alignment. TileHeader chrome
   *  (status-indicator + session-name + branch + repo + model-chip +
   *  token-meter) renders under both modes — wireframe-aligned subset
   *  preserved per probe-04. When omitted or `'C'`, the Tile renders
   *  full chrome (bit-identical to pre-WB2 default render).
   *
   *  Sub-Q-MBTWBCTM-B=(α) prop-drilled (recommended default): the
   *  parent (TileGridApp) reads FrameMode via the §C.1′ subscription
   *  + threads as a prop to each <Tile>. NOTE: at WB2 ship time,
   *  TileGridApp does NOT yet subscribe to FrameMode (verified at WB1
   *  RED authoring: grep tile-grid-app.tsx for FrameMode → 0 matches).
   *  Until that upstream wiring lands (separate amendment commit or
   *  follow-on ticket per body §5.2), the `frameMode` prop is undefined
   *  in production renders → `isCompact === false` → full chrome
   *  renders unconditionally. WB1 probe asserts the COMPONENT contract
   *  (Tile branches correctly when prop is supplied) — not the
   *  end-to-end production behavior. */
  readonly frameMode?: FrameMode;
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
  spawnedAtMs,
  renderPickerSlot,
  renderAutopilotSlot,
  renderFooterSlot,
  frameMode,
}: TileProps): JSX.Element {
  // MB-T-WIREFRAME-C1P4 WB2: compact-mode gate. Strict equality on 'A'
  // so undefined / 'C' / any unknown value renders full chrome (defaults
  // are conservative — only the explicit Frame A toggle activates the
  // compact branch).
  const isCompact = frameMode === 'A';
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
          spawnedAtMs={spawnedAtMs}
        />
        <div data-slot="picker" data-testid={`tile-picker-slot-${sessionName}`}>
          {/* MB-T-WIREFRAME-C1P4: closure suppressed under compact;
              wrapper preserved for testid-stability per body §1.1 bullet 3. */}
          {!isCompact && renderPickerSlot ? renderPickerSlot(sessionName) : null}
        </div>
        <div
          data-slot="autopilot"
          data-testid={`tile-autopilot-slot-${sessionName}`}
        >
          {!isCompact && renderAutopilotSlot ? renderAutopilotSlot(sessionName) : null}
        </div>
        {!isCompact && (
          <button
            type="button"
            data-testid="tile-collapse-btn"
            onClick={() => onCollapse(sessionName)}
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        )}
        {!isCompact && (
          <button
            type="button"
            data-testid="tile-detach-btn"
            onClick={() => onDetach(sessionName)}
          >
            Detach
          </button>
        )}
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
      <div data-slot="footer" data-testid={`tile-footer-slot-${sessionName}`}>
        {renderFooterSlot ? renderFooterSlot(sessionName) : null}
      </div>
    </div>
  );
}
