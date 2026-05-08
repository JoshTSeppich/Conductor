// MB-T12 WB6 + WB7 + WB8 + WB9 — top-level tile-grid React component.
//
// WB6: Renders N <Tile> children inside a CSS Grid sized via
//      computeGridLayout(N). Empty state (N=0) returns null.
// WB7: Adds drag-resize support via per-border <div> handles. On drag-end,
//      fires onResizeEnd(GridOverride).
// WB8: Adds drag-swap on tile headers. Fires onSwap(a, b) on header→header drop.
// WB9 (cleanup): hooks moved above the early-return so the hook order
//      is consistent across N=0 ↔ N>0 transitions (React Rules of Hooks).
//
// Per Q-MBT12-1=a: pure-fn calc + CSS Grid (no layout libs).
// Per Q-MBT12-2=a: vanilla mousedown/move/up handlers (no react-dnd).
// Per Q-MBT12-9=a: empty state (N=0) returns null — the parent shell region
// collapses to height:0 (style applied externally by WB12).
// Per Q-MBT12-10=a: overflow at N≥9 uses CSS Grid auto-flow (implicit rows
// + container `overflow-y: auto`); tab-strip deferred to v3.1.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Tile, type TileStatus } from './tile.js';
import { computeGridLayout, computeNewSizesAfterDrag } from './tile-layout.js';
import type { GridOverride } from '../main/tile-grid-state.js';
import type { ConsoleBridge } from '../main/console-bridge.js';
import type { TerminalAdapter } from '../console-panel/terminal-adapter.js';

export interface TileGridSessionEntry {
  readonly name: string;
  readonly status?: TileStatus;
  readonly collapsed?: boolean;
  // ── MB-T15 WB4: tile-header chrome plumb-through ────────────────────
  /** Branch name displayed in the tile-header chrome (MB-T15). */
  readonly branchName?: string;
  /** Repo name (basename of cwd) displayed in tile-header. */
  readonly repoName?: string;
  /** SDK model name (e.g., 'claude-sonnet-4-6') for the model chip. */
  readonly model?: string;
  /** Tokens consumed in the current session window (MB-T15 token meter). */
  readonly tokensUsed?: number;
  /** Token budget (model context window). */
  readonly tokenBudget?: number;
  // ── MB-T18 WB3: per-tile footer chrome plumb-through ────────────────
  /** Full session working-directory path. Sourced from the extended
   *  SpawnSessionResult (workstation-internal — see spawn-handler.ts
   *  cwd field, MB-T18 WB2). Consumed by the renderFooterSlot closure
   *  which constructs <TileFooter cwd={...} /> per Q-MBT18-1=e. Absent
   *  for sessions seeded via initialSessions without explicit cwd; the
   *  footer's cwd line is omitted in that case (Q-MBT18-7=d). */
  readonly cwd?: string;
}

export interface TileGridProps {
  readonly sessions: readonly TileGridSessionEntry[];
  readonly consoleBridge: ConsoleBridge;
  readonly createTerminal: () => TerminalAdapter;
  readonly onKill?: (sessionName: string) => void;
  readonly onCollapse?: (sessionName: string) => void;
  readonly onDetach?: (sessionName: string) => void;
  /**
   * Initial grid override (drag-resize state) loaded from
   * tile-grid-state.ts. Only applied when its (rows, cols) shape
   * matches the current layout — otherwise discarded.
   */
  readonly gridOverride?: GridOverride;
  /**
   * Fires on drag-end with the resulting GridOverride. Parent persists
   * via writeGridOverride(...). v3.0 ship-minimum: pixel sizes (CSS
   * "Npx" strings).
   */
  readonly onResizeEnd?: (override: GridOverride) => void;
  /**
   * Test seam: returns the current pixel sizes of grid bands. Production
   * default reads via getBoundingClientRect on the grid root.
   */
  readonly getCurrentPixelSizes?: () => { colPx: number[]; rowPx: number[] };
  /**
   * WB8 drag-swap: fires when one tile's header is dropped on another's.
   */
  readonly onSwap?: (a: string, b: string) => void;
  /**
   * MB-T16 WB4 — tile-header picker slot render-prop. Plumbed through
   * to each <Tile> via direct pass-through. See Tile's prop docstring
   * for semantics.
   */
  readonly renderPickerSlot?: (sessionName: string) => ReactNode;
  /**
   * MB-T17 WB4 — tile-header autopilot slot render-prop. Plumbed
   * through to each <Tile> via direct pass-through. See Tile's prop
   * docstring for semantics.
   */
  readonly renderAutopilotSlot?: (sessionName: string) => ReactNode;
  /**
   * MB-T18 WB3 — per-tile footer slot render-prop. Plumbed through to
   * each <Tile> via direct pass-through. See Tile's prop docstring
   * for semantics. Closure typically looks up cwd from session entry
   * + renders <TileFooter sessionName cwd />.
   */
  readonly renderFooterSlot?: (sessionName: string) => ReactNode;
}

const noop = (): void => {
  /* default no-op for optional callback props */
};

const MIN_BAND_PX = 80;
const HANDLE_THICKNESS_PX = 6;

interface DragState {
  readonly orientation: 'vertical' | 'horizontal';
  readonly borderIdx: number;
  readonly startX: number;
  readonly startY: number;
  readonly initialSizes: number[];
}

export function TileGrid({
  sessions,
  consoleBridge,
  createTerminal,
  onKill = noop,
  onCollapse = noop,
  onDetach = noop,
  gridOverride,
  onResizeEnd,
  getCurrentPixelSizes,
  onSwap,
  renderPickerSlot,
  renderAutopilotSlot,
  renderFooterSlot,
}: TileGridProps): JSX.Element | null {
  // Hooks must be unconditional and run in the same order on every
  // render (React Rules of Hooks). Layout / shape checks happen below
  // the hook calls so the empty-state branch (return null) does NOT
  // skip any hooks. WB9 fix: prior to this restructure the early
  // return was above useState/useRef/useEffect, which produced
  // "Internal React error: Expected static flag was missing" warnings
  // on N=0 ↔ N>0 transitions (e.g., spawn auto-mount).
  const isEmpty = sessions.length === 0;
  const layout = isEmpty ? null : computeGridLayout(sessions.length);

  const overrideMatchesShape =
    !isEmpty &&
    layout !== null &&
    gridOverride !== undefined &&
    (gridOverride.colSizes === undefined ||
      gridOverride.colSizes.length === layout.cols) &&
    (gridOverride.rowSizes === undefined ||
      gridOverride.rowSizes.length === layout.rows);
  const initialColCss = overrideMatchesShape
    ? gridOverride?.colSizes
    : undefined;
  const initialRowCss = overrideMatchesShape
    ? gridOverride?.rowSizes
    : undefined;

  const [colCss, setColCss] = useState<readonly string[] | undefined>(
    initialColCss,
  );
  const [rowCss, setRowCss] = useState<readonly string[] | undefined>(
    initialRowCss,
  );
  const dragRef = useRef<DragState | null>(null);
  const draggingSwapRef = useRef<string | null>(null);
  const gridRootRef = useRef<HTMLDivElement | null>(null);

  // Reset working sizes when layout shape changes (sessions count drift
  // shifts rows/cols → discard stale override).
  useEffect(() => {
    setColCss(initialColCss);
    setRowCss(initialRowCss);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout?.rows, layout?.cols, gridOverride]);

  function readCurrentSizes(): { colPx: number[]; rowPx: number[] } {
    if (getCurrentPixelSizes) return getCurrentPixelSizes();
    const root = gridRootRef.current;
    const cols = layout?.cols ?? 1;
    const rows = layout?.rows ?? 1;
    if (!root) {
      return {
        colPx: Array(cols).fill(MIN_BAND_PX),
        rowPx: Array(rows).fill(MIN_BAND_PX),
      };
    }
    const rect = root.getBoundingClientRect();
    return {
      colPx: Array.from({ length: cols }, () => rect.width / cols),
      rowPx: Array.from({ length: rows }, () => rect.height / rows),
    };
  }

  function startDrag(
    orientation: 'vertical' | 'horizontal',
    borderIdx: number,
    startX: number,
    startY: number,
  ): void {
    const { colPx, rowPx } = readCurrentSizes();
    dragRef.current = {
      orientation,
      borderIdx,
      startX,
      startY,
      initialSizes: orientation === 'vertical' ? [...colPx] : [...rowPx],
    };
  }

  function applyDrag(currentX: number, currentY: number): void {
    const drag = dragRef.current;
    if (!drag) return;
    const delta =
      drag.orientation === 'vertical'
        ? currentX - drag.startX
        : currentY - drag.startY;
    const next = computeNewSizesAfterDrag(
      drag.initialSizes,
      drag.borderIdx,
      delta,
      MIN_BAND_PX,
    );
    const cssNext = next.map((px) => `${px}px`);
    if (drag.orientation === 'vertical') {
      setColCss(cssNext);
    } else {
      setRowCss(cssNext);
    }
  }

  function endDrag(): void {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (!onResizeEnd) return;
    // Build the override as a literal (GridOverride fields are readonly).
    if (drag.orientation === 'vertical') {
      setColCss((latest) => {
        const override: GridOverride = {
          ...(latest ? { colSizes: latest } : {}),
          ...(rowCss ? { rowSizes: rowCss } : {}),
        };
        onResizeEnd(override);
        return latest;
      });
    } else {
      setRowCss((latest) => {
        const override: GridOverride = {
          ...(latest ? { rowSizes: latest } : {}),
          ...(colCss ? { colSizes: colCss } : {}),
        };
        onResizeEnd(override);
        return latest;
      });
    }
  }

  function handleSwapDragStart(name: string): void {
    draggingSwapRef.current = name;
  }
  function handleSwapDrop(targetName: string): void {
    const source = draggingSwapRef.current;
    draggingSwapRef.current = null;
    if (source !== null && source !== targetName) {
      onSwap?.(source, targetName);
    }
  }

  // Document-level mouse listeners during a drag — captures mousemove /
  // mouseup even when cursor leaves the handle's bounding box. Also
  // handles WB8 swap-drag cancellation (mouseup without a header drop).
  useEffect(() => {
    function onMove(e: MouseEvent): void {
      if (!dragRef.current) return;
      applyDrag(e.clientX, e.clientY);
    }
    function onUp(): void {
      if (dragRef.current) endDrag();
      // Cancel any in-flight swap-drag that didn't drop on a tile header.
      draggingSwapRef.current = null;
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Empty state (N=0) — null after all hooks have run.
  if (isEmpty || layout === null) {
    return null;
  }

  const explicitCellCount = layout.rows * layout.cols;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateRows: rowCss ? rowCss.join(' ') : `repeat(${layout.rows}, 1fr)`,
    gridTemplateColumns: colCss
      ? colCss.join(' ')
      : `repeat(${layout.cols}, 1fr)`,
    gridTemplateAreas: layout.gridTemplateAreas
      .map((row) => `"${row}"`)
      .join(' '),
    height: '100%',
    width: '100%',
    position: 'relative',
  };
  if (layout.overflow) {
    gridStyle.gridAutoRows = '1fr';
    gridStyle.overflowY = 'auto';
  }

  const verticalHandles: number[] = [];
  for (let i = 0; i < layout.cols - 1; i++) verticalHandles.push(i);
  const horizontalHandles: number[] = [];
  for (let j = 0; j < layout.rows - 1; j++) horizontalHandles.push(j);

  return (
    <div
      ref={gridRootRef}
      data-testid="tile-grid-root"
      data-tile-count={sessions.length}
      style={gridStyle}
    >
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
              onSwapDragStart={onSwap ? handleSwapDragStart : undefined}
              onSwapDrop={onSwap ? handleSwapDrop : undefined}
              branchName={s.branchName}
              repoName={s.repoName}
              model={s.model}
              tokensUsed={s.tokensUsed}
              tokenBudget={s.tokenBudget}
              renderPickerSlot={renderPickerSlot}
              renderAutopilotSlot={renderAutopilotSlot}
              renderFooterSlot={renderFooterSlot}
            />
          </div>
        );
      })}
      {verticalHandles.map((borderIdx) => (
        <div
          key={`v-${borderIdx}`}
          data-testid={`tile-resize-handle-vertical-${borderIdx}`}
          data-resize-handle="vertical"
          data-border-idx={borderIdx}
          style={{
            gridColumn: `${borderIdx + 1} / ${borderIdx + 2}`,
            gridRow: '1 / -1',
            justifySelf: 'end',
            width: `${HANDLE_THICKNESS_PX}px`,
            height: '100%',
            cursor: 'col-resize',
            zIndex: 10,
            position: 'relative',
            transform: `translateX(${HANDLE_THICKNESS_PX / 2}px)`,
            background: 'transparent',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            startDrag('vertical', borderIdx, e.clientX, e.clientY);
          }}
        />
      ))}
      {horizontalHandles.map((borderIdx) => (
        <div
          key={`h-${borderIdx}`}
          data-testid={`tile-resize-handle-horizontal-${borderIdx}`}
          data-resize-handle="horizontal"
          data-border-idx={borderIdx}
          style={{
            gridRow: `${borderIdx + 1} / ${borderIdx + 2}`,
            gridColumn: '1 / -1',
            alignSelf: 'end',
            height: `${HANDLE_THICKNESS_PX}px`,
            width: '100%',
            cursor: 'row-resize',
            zIndex: 10,
            position: 'relative',
            transform: `translateY(${HANDLE_THICKNESS_PX / 2}px)`,
            background: 'transparent',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            startDrag('horizontal', borderIdx, e.clientX, e.clientY);
          }}
        />
      ))}
    </div>
  );
}
