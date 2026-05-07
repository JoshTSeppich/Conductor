// MB-T12 WB6 + WB7 — top-level tile-grid React component.
//
// WB6: Renders N <Tile> children inside a CSS Grid sized via
//      computeGridLayout(N). Empty state (N=0) returns null.
// WB7: Adds drag-resize support via per-border <div> handles. On drag-end,
//      fires onResizeEnd(GridOverride) which the parent persists via
//      writeGridOverride(...) (tile-grid-state.ts).
//
// Per Q-MBT12-1=a: pure-fn calc + CSS Grid (no layout libs).
// Per Q-MBT12-2=a: vanilla mousedown/move/up handlers (no react-dnd).
// Per Q-MBT12-9=a: empty state (N=0) returns null — the parent shell region
// collapses to height:0 (style applied externally by WB12).
// Per Q-MBT12-10=a: overflow at N≥9 uses CSS Grid auto-flow (implicit rows
// + container `overflow-y: auto`); tab-strip deferred to v3.1.

import { useEffect, useRef, useState } from 'react';
import { Tile, type TileStatus } from './tile.js';
import { computeGridLayout, computeNewSizesAfterDrag } from './tile-layout.js';
import type { GridOverride } from '../main/tile-grid-state.js';
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
  /**
   * Initial grid override (drag-resize state) loaded from
   * tile-grid-state.ts. Only applied when its (rows, cols) shape
   * matches the current layout — otherwise discarded (e.g., session
   * count change shifted the grid from 2×2 to 2×3).
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
   * default reads via getBoundingClientRect on the grid root (equal-share
   * since computeGridLayout outputs `repeat(N, 1fr)`). Tests inject
   * deterministic sizes to avoid happy-dom layout quirks.
   */
  readonly getCurrentPixelSizes?: () => { colPx: number[]; rowPx: number[] };
  /**
   * WB8 drag-swap: fires when the operator drags one tile's header onto
   * another's. Parent swaps the orderIndex of the two sessions in
   * tile-grid-state and re-renders sessions in the new order. The
   * callback is NOT fired when source === target (no-op drop on same tile).
   */
  readonly onSwap?: (a: string, b: string) => void;
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
  readonly otherAxisSizes: number[];
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
}: TileGridProps): JSX.Element | null {
  if (sessions.length === 0) {
    return null;
  }
  const draggingSwapRef = useRef<string | null>(null);

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

  const layout = computeGridLayout(sessions.length);
  const explicitCellCount = layout.rows * layout.cols;

  // gridOverride only applies if its (rows, cols) shape matches current
  // layout. Otherwise discarded (session count drift since persistence).
  const overrideMatchesShape =
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

  // Working CSS sizes — initially from gridOverride (if shape-matched)
  // or undefined (use repeat(N, 1fr)). Drag updates these in real time.
  const [colCss, setColCss] = useState<readonly string[] | undefined>(
    initialColCss,
  );
  const [rowCss, setRowCss] = useState<readonly string[] | undefined>(
    initialRowCss,
  );
  const dragRef = useRef<DragState | null>(null);
  const gridRootRef = useRef<HTMLDivElement | null>(null);

  // Reset working sizes when layout shape changes (sessions count change
  // shifts rows/cols from a different layout → discard stale override).
  useEffect(() => {
    setColCss(initialColCss);
    setRowCss(initialRowCss);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.rows, layout.cols, gridOverride]);

  function readCurrentSizes(): { colPx: number[]; rowPx: number[] } {
    if (getCurrentPixelSizes) return getCurrentPixelSizes();
    const root = gridRootRef.current;
    if (!root) {
      return {
        colPx: Array(layout.cols).fill(MIN_BAND_PX),
        rowPx: Array(layout.rows).fill(MIN_BAND_PX),
      };
    }
    const rect = root.getBoundingClientRect();
    return {
      colPx: Array.from({ length: layout.cols }, () => rect.width / layout.cols),
      rowPx: Array.from(
        { length: layout.rows },
        () => rect.height / layout.rows,
      ),
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
      otherAxisSizes: orientation === 'vertical' ? [...rowPx] : [...colPx],
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
    if (onResizeEnd) {
      const override: GridOverride = {};
      // Preserve the other axis if it was already overridden, otherwise
      // emit only the axis that was dragged.
      if (drag.orientation === 'vertical') {
        // Read latest colCss state via setState callback to avoid stale closure
        setColCss((latest) => {
          if (latest) override.colSizes = latest;
          if (rowCss) override.rowSizes = rowCss;
          onResizeEnd(override);
          return latest;
        });
      } else {
        setRowCss((latest) => {
          if (latest) override.rowSizes = latest;
          if (colCss) override.colSizes = colCss;
          onResizeEnd(override);
          return latest;
        });
      }
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
      // Tile-header onMouseUp would have already cleared the ref before
      // this runs (React synthetic events fire before document handlers
      // in our test harness), but defensively reset here anyway.
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

  // Build resize handles for the explicit grid only. Cols-1 vertical
  // handles, rows-1 horizontal handles. Skip overflow rows.
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
            // Allow the handle to overlap the column boundary by half its
            // width so it sits centered on the line.
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
