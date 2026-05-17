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
import {
  computeHeroSquadLayout,
  type HeroSquadLayout,
} from './tile-hero-squad-layout.js';
import { computeAgentGridLayout } from './agent-grid-layout.js';
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
  // ── MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING closure (a) ──────────
  /** Per-spawn permission mode for the session. Mirrors
   *  SpawnPermissionMode in spawn-handler.ts:91 — 'auto' ⇔ tmux argv
   *  carried `--dangerously-skip-permissions`; 'ask' ⇔ default prompt-
   *  on-each-action CC behavior. Sourced from the extended
   *  SpawnSessionResult (spawn-handler.ts populates `req.permissionMode
   *  ?? 'ask'`) and threaded into entries by FrameCRoot's bridge
   *  subscription. Consumed downstream by DetailPaneProps.spawnMode
   *  (detail-pane.tsx:144) which forwards to ActionBarProps.spawnMode;
   *  ActionBar renders `[data-testid="action-bar-bypass-perms-indicator"]`
   *  iff this value === 'auto' (T3 WB8 contract at commit e713cbd).
   *  Optional: entries seeded without spawn-result data (e.g.,
   *  initialSessions prop from test fixtures, daemon-recovery rehydrate
   *  before the spawn-result envelope is replayed) leave this undefined
   *  → indicator hidden (ship-shy preserved as the absent-data fallback). */
  readonly spawnMode?: 'auto' | 'ask';
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
  /**
   * MB-T19 WB3 — hero/squad layout activation. When provided AND
   * matches a session name in `sessions[]`, the layout switches to
   * hero/squad geometry: hero on top (~75% vertical) spanning all
   * cols, squad strip below (~25% vertical) with one cell per
   * remaining tile. When undefined/null OR doesn't match any session,
   * falls back to the uniform `computeGridLayout` (existing default
   * — preserves all MB-T12 ladder tests). Per Q-MBT19-5=b: vertical
   * resize handles between squad cols are SKIPPED in hero mode for
   * v3.0 (within-strip resize deferred to v3.1); only the horizontal
   * handle at the hero/squad boundary is operator-draggable.
   */
  readonly heroSessionName?: string | null;
  /**
   * MB-T-MVP-W2-AGENT-GRID WB2 — agent-grid layout activation
   * (operator-vision Component 2: docs/coordination/operator-vision-
   * three-pane-conductor-2026-05-17.md:80-85).
   *
   * When `true` AND hero-mode is INACTIVE (heroSessionName is null/
   * undefined or doesn't match any session), the layout switches to
   * `computeAgentGridLayout`: 2x2/2x3/3x3/3x4 explicit grid honoring
   * operator vision's "1-12 concurrent tiles gracefully" requirement.
   *
   * When `false` / undefined, the layout defaults to the uniform
   * `computeGridLayout` (existing MB-T12 default — preserves all
   * MB-T12 ladder tests including probe-01-grid-renders-n-tiles which
   * exercises <TileGrid> directly without setting this prop).
   *
   * Hero-mode takes precedence (Q-W2-2 disposition (b): FLAG-PRESERVE
   * hero-squad — no state-file migration). When both heroSessionName
   * matches and agentGridMode === true, hero-mode wins.
   *
   * Production wiring: TileGridApp defaults this prop to `true` for
   * MVP (mount.ts → <TileGridApp> with no explicit override → flips
   * to agent-grid). Tests using <TileGrid> directly opt-in explicitly.
   */
  readonly agentGridMode?: boolean;
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
  heroSessionName,
  agentGridMode,
}: TileGridProps): JSX.Element | null {
  // Hooks must be unconditional and run in the same order on every
  // render (React Rules of Hooks). Layout / shape checks happen below
  // the hook calls so the empty-state branch (return null) does NOT
  // skip any hooks. WB9 fix: prior to this restructure the early
  // return was above useState/useRef/useEffect, which produced
  // "Internal React error: Expected static flag was missing" warnings
  // on N=0 ↔ N>0 transitions (e.g., spawn auto-mount).
  const isEmpty = sessions.length === 0;
  // MB-T19 WB3 — hero/squad mode activates when heroSessionName matches
  // a session in the array. When unmatched OR null, falls back to
  // uniform layout (existing MB-T12 behavior unchanged).
  const heroIndex =
    heroSessionName != null && !isEmpty
      ? sessions.findIndex((s) => s.name === heroSessionName)
      : -1;
  const isHeroMode = heroIndex >= 0;
  // MB-T-MVP-W2 WB2 — agent-grid layout activation. Hero-mode takes
  // precedence (Q-W2-2 FLAG-PRESERVE); when both flags suggest layout
  // selection, hero wins. agentGridMode === true → computeAgentGridLayout
  // (operator-vision Component 2 default for MVP). Otherwise →
  // computeGridLayout (existing uniform default).
  const isAgentGridMode = !isHeroMode && agentGridMode === true;
  const layout = isEmpty
    ? null
    : isHeroMode
      ? computeHeroSquadLayout(sessions.length, heroIndex)
      : isAgentGridMode
        ? computeAgentGridLayout(sessions.length)
        : computeGridLayout(sessions.length);

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

  // MB-T19 WB3 — hero mode uses HeroSquadLayout.defaultRowSizes
  // (75%/25%) by default; uniform mode uses repeat(rows, 1fr). Drag-
  // resize override (rowCss state) takes precedence when present
  // (Q-MBT19-5=b: hero/squad boundary is operator-draggable).
  const defaultRowsCss =
    isHeroMode && 'defaultRowSizes' in layout
      ? (layout as HeroSquadLayout).defaultRowSizes.join(' ')
      : `repeat(${layout.rows}, 1fr)`;
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateRows: rowCss ? rowCss.join(' ') : defaultRowsCss,
    gridTemplateColumns: colCss
      ? colCss.join(' ')
      : `repeat(${layout.cols}, 1fr)`,
    gridTemplateAreas: layout.gridTemplateAreas
      .map((row) => `"${row}"`)
      .join(' '),
    height: '100%',
    width: '100%',
    position: 'relative',
    gap: '4px',
  };
  if (layout.overflow) {
    gridStyle.gridAutoRows = '1fr';
    gridStyle.overflowY = 'auto';
  }
  // MB-T19 WB3 — hero mode allows horizontal scroll on squad strip
  // overflow (Q-MBT19-10: horizontal scroll for v3.0). The squad
  // strip will scroll horizontally when its tiles underflow available
  // width; CSS overflow-x: auto handles the runtime decision.
  if (isHeroMode) {
    gridStyle.overflowX = 'auto';
  }

  const verticalHandles: number[] = [];
  // MB-T19 WB3 — Q-MBT19-5=b: in hero mode, vertical (col-border)
  // resize handles are SUPPRESSED for v3.0. Only the horizontal
  // (row-border) handle at the hero/squad boundary is operator-
  // draggable; within-squad-strip resize is deferred to v3.1.
  if (!isHeroMode) {
    for (let i = 0; i < layout.cols - 1; i++) verticalHandles.push(i);
  }
  const horizontalHandles: number[] = [];
  for (let j = 0; j < layout.rows - 1; j++) horizontalHandles.push(j);

  return (
    <div
      ref={gridRootRef}
      data-testid="tile-grid-root"
      data-tile-count={sessions.length}
      data-hero-mode={isHeroMode ? 'true' : 'false'}
      data-agent-grid-mode={isAgentGridMode ? 'true' : 'false'}
      style={gridStyle}
    >
      {sessions.map((s, idx) => {
        const cellChrome: React.CSSProperties = {
          border: '1px solid #303030',
          borderRadius: '4px',
          background: '#111111',
          overflow: 'hidden',
        };
        const cellStyle: React.CSSProperties =
          idx < explicitCellCount
            ? { gridArea: `t${idx}`, ...cellChrome }
            : { ...cellChrome };
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
