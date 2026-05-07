// MB-T12 WB6 — top-level tile-grid React component.
//
// Renders N <Tile> children inside a CSS Grid sized via computeGridLayout(N).
// Per Q-MBT12-1=a: pure-fn calc + CSS Grid (no layout libs).
// Per Q-MBT12-9=a: empty state (N=0) returns null — the parent shell region
// collapses to height:0 (style applied externally by WB12).
// Per Q-MBT12-10=a: overflow at N≥9 uses CSS Grid auto-flow (implicit rows
// + container `overflow-y: auto`); tab-strip deferred to v3.1.

import { Tile, type TileStatus } from './tile.js';
import { computeGridLayout } from './tile-layout.js';
import type { ConsoleBridge } from '../main/console-bridge.js';
import type { TerminalAdapter } from '../console-panel/terminal-adapter.js';

export interface TileGridSessionEntry {
  readonly name: string;
  readonly status?: TileStatus;
  readonly collapsed?: boolean;
}

export interface TileGridProps {
  readonly sessions: readonly TileGridSessionEntry[];
  readonly consoleBridge: ConsoleBridge;
  readonly createTerminal: () => TerminalAdapter;
  readonly onKill?: (sessionName: string) => void;
  readonly onCollapse?: (sessionName: string) => void;
  readonly onDetach?: (sessionName: string) => void;
}

const noop = (): void => {
  /* default no-op for optional callback props */
};

export function TileGrid({
  sessions,
  consoleBridge,
  createTerminal,
  onKill = noop,
  onCollapse = noop,
  onDetach = noop,
}: TileGridProps): JSX.Element | null {
  if (sessions.length === 0) {
    return null;
  }

  const layout = computeGridLayout(sessions.length);
  const explicitCellCount = layout.rows * layout.cols;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
    gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
    gridTemplateAreas: layout.gridTemplateAreas
      .map((row) => `"${row}"`)
      .join(' '),
    height: '100%',
    width: '100%',
  };
  if (layout.overflow) {
    gridStyle.gridAutoRows = '1fr';
    gridStyle.overflowY = 'auto';
  }

  return (
    <div data-testid="tile-grid-root" data-tile-count={sessions.length} style={gridStyle}>
      {sessions.map((s, idx) => {
        const cellStyle: React.CSSProperties =
          idx < explicitCellCount ? { gridArea: `t${idx}` } : {};
        return (
          <div
            key={s.name}
            data-testid={`tile-cell-${s.name}`}
            data-tile-index={idx}
            style={cellStyle}
          >
            <Tile
              sessionName={s.name}
              consoleBridge={consoleBridge}
              createTerminal={createTerminal}
              collapsed={s.collapsed ?? false}
              status={s.status}
              onKill={onKill}
              onCollapse={onCollapse}
              onDetach={onDetach}
            />
          </div>
        );
      })}
    </div>
  );
}
