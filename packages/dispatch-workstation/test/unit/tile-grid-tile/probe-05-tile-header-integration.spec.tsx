// @vitest-environment happy-dom
//
// MB-T15 WB4 probe-05 — Tile.tsx + TileHeader integration.
//
// Verifies that:
//   - TileHeader is rendered as a child of the existing tile-header div
//     (Q-MBT15-3=a operator-confirmed disposition)
//   - New TileProps fields (branchName, repoName, model, tokensUsed,
//     tokenBudget) plumb through to TileHeader
//   - Default values apply when fields are unset (Q-MBT15-2=a stubs)
//   - LEGACY testids (`tile-status-indicator`, `tile-session-name`)
//     still resolve — TileHeader emits them now per WB4 rename
//   - `data-status` attribute on tile-status-indicator preserved
//     (MB-T12 contract; probe-01..04 regression-safe)
//   - Drag-swap onMouseDown on tile-header still fires (not blocked by
//     TileHeader's spans/divs which aren't interactive targets)

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Tile } from '../../../src/tile-grid/tile.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

function makeProps(
  overrides: Partial<React.ComponentProps<typeof Tile>> = {},
): React.ComponentProps<typeof Tile> {
  const fake = makeFakeConsoleBridge();
  const adapter = makeFakeTerminalAdapter();
  return {
    sessionName: 'sess-x',
    consoleBridge: fake.bridge,
    createTerminal: () => adapter,
    collapsed: false,
    onKill: vi.fn(),
    onCollapse: vi.fn(),
    onDetach: vi.fn(),
    ...overrides,
  };
}

describe('MB-T15 WB4 — TileHeader rendered inside Tile.tile-header (Q-MBT15-3=a)', () => {
  it('TileHeader content (tile-header-content) is rendered inside the tile-header div', () => {
    render(<Tile {...makeProps()} />);
    const header = screen.getByTestId('tile-header');
    expect(within(header).getByTestId('tile-header-content')).toBeInTheDocument();
  });

  it('LEGACY tile-status-indicator testid resolves (now emitted by TileHeader)', () => {
    render(<Tile {...makeProps({ status: 'open' })} />);
    expect(screen.getByTestId('tile-status-indicator')).toBeInTheDocument();
  });

  it('LEGACY tile-session-name testid resolves (now emitted by TileHeader)', () => {
    render(<Tile {...makeProps({ sessionName: 'beta' })} />);
    expect(screen.getByTestId('tile-session-name')).toHaveTextContent('beta');
  });

  it('MB-T12 contract preserved: status-indicator has data-status attribute', () => {
    render(<Tile {...makeProps({ status: 'killed' })} />);
    expect(
      screen.getByTestId('tile-status-indicator').getAttribute('data-status'),
    ).toBe('killed');
  });

  it('header also exposes the WB3 data-status-color attribute (additive, non-breaking)', () => {
    render(<Tile {...makeProps({ status: 'killed' })} />);
    expect(
      screen.getByTestId('tile-status-indicator').getAttribute('data-status-color'),
    ).toBe('red');
  });
});

describe('MB-T15 WB4 — props plumb-through to TileHeader', () => {
  it('branchName plumb-through: prop → TileHeader → tile-header-branch-name text', () => {
    render(<Tile {...makeProps({ branchName: 'feat/abc' })} />);
    expect(screen.getByTestId('tile-header-branch-name')).toHaveTextContent('feat/abc');
  });

  it('branchName default ("main") applies when prop is unset (Q-MBT15-2 stub)', () => {
    render(<Tile {...makeProps()} />);
    expect(screen.getByTestId('tile-header-branch-name')).toHaveTextContent('main');
  });

  it('repoName plumb-through: prop → TileHeader → tile-header-repo-name text', () => {
    render(<Tile {...makeProps({ repoName: 'foxworks-dispatch' })} />);
    expect(screen.getByTestId('tile-header-repo-name')).toHaveTextContent(
      'foxworks-dispatch',
    );
  });

  it('repoName unset → tile-header-repo-name not rendered (default empty string)', () => {
    render(<Tile {...makeProps()} />);
    expect(screen.queryByTestId('tile-header-repo-name')).not.toBeInTheDocument();
  });

  it('model plumb-through: claude-opus-4-7 → O4.7·1M chip', () => {
    render(<Tile {...makeProps({ model: 'claude-opus-4-7' })} />);
    expect(
      screen.getByTestId('tile-header-model-chip').getAttribute('data-chip'),
    ).toBe('O4.7·1M');
  });

  it('model default ("claude-sonnet-4-6") applies when prop is unset (Q-MBT15-2 stub)', () => {
    render(<Tile {...makeProps()} />);
    expect(
      screen.getByTestId('tile-header-model-chip').getAttribute('data-chip'),
    ).toBe('S4.6');
  });

  it('model unknown → no chip rendered (graceful)', () => {
    render(<Tile {...makeProps({ model: 'unknown-llm-9000' })} />);
    expect(screen.queryByTestId('tile-header-model-chip')).not.toBeInTheDocument();
  });

  it('tokensUsed + tokenBudget plumb-through: ratio drives token-meter tint', () => {
    render(
      <Tile
        {...makeProps({ tokensUsed: 180_000, tokenBudget: 200_000 })}
      />,
    );
    expect(
      screen.getByTestId('tile-header-token-meter').getAttribute('data-tint'),
    ).toBe('danger');
  });

  it('tokensUsed default (0) → tint=normal, fill width=0%', () => {
    render(<Tile {...makeProps()} />);
    expect(
      screen.getByTestId('tile-header-token-meter').getAttribute('data-tint'),
    ).toBe('normal');
    expect(
      screen.getByTestId('tile-header-token-meter-fill').style.width,
    ).toBe('0%');
  });

  it('all-fields-plumbed end-to-end render', () => {
    render(
      <Tile
        {...makeProps({
          sessionName: 'e2e',
          status: 'open',
          branchName: 'feat/e2e',
          repoName: 'foxworks-dispatch',
          model: 'claude-haiku-4-5-20251001',
          tokensUsed: 80_000,
          tokenBudget: 100_000,
        })}
      />,
    );
    expect(screen.getByTestId('tile-session-name')).toHaveTextContent('e2e');
    expect(screen.getByTestId('tile-status-indicator').getAttribute('data-status')).toBe('open');
    expect(screen.getByTestId('tile-header-branch-name')).toHaveTextContent('feat/e2e');
    expect(screen.getByTestId('tile-header-repo-name')).toHaveTextContent('foxworks-dispatch');
    expect(screen.getByTestId('tile-header-model-chip').getAttribute('data-chip')).toBe('H');
    // ratio = 80_000 / 100_000 = 0.8 → warn
    expect(screen.getByTestId('tile-header-token-meter').getAttribute('data-tint')).toBe('warn');
    expect(screen.getByTestId('tile-header-token-meter-fill').style.width).toBe('80%');
  });
});

describe('MB-T15 WB4 — drag-swap regression (WB8 contract preserved)', () => {
  it('mousedown on tile-header div (background, not in TileHeader children) fires onSwapDragStart', () => {
    const onSwapDragStart = vi.fn();
    render(<Tile {...makeProps({ sessionName: 'src', onSwapDragStart })} />);
    fireEvent.mouseDown(screen.getByTestId('tile-header'));
    expect(onSwapDragStart).toHaveBeenCalledWith('src');
  });

  it('mousedown on tile-session-name (inside TileHeader, NOT a button/input) fires onSwapDragStart', () => {
    const onSwapDragStart = vi.fn();
    render(<Tile {...makeProps({ sessionName: 'span-mousedown', onSwapDragStart })} />);
    fireEvent.mouseDown(screen.getByTestId('tile-session-name'));
    expect(onSwapDragStart).toHaveBeenCalledWith('span-mousedown');
  });

  it('mousedown on tile-status-indicator fires onSwapDragStart (span, not interactive)', () => {
    const onSwapDragStart = vi.fn();
    render(<Tile {...makeProps({ sessionName: 'dot-mousedown', onSwapDragStart })} />);
    fireEvent.mouseDown(screen.getByTestId('tile-status-indicator'));
    expect(onSwapDragStart).toHaveBeenCalledWith('dot-mousedown');
  });

  it('mousedown on tile-kill-btn does NOT fire onSwapDragStart (button = interactive target)', () => {
    const onSwapDragStart = vi.fn();
    render(<Tile {...makeProps({ onSwapDragStart })} />);
    fireEvent.mouseDown(screen.getByTestId('tile-kill-btn'));
    expect(onSwapDragStart).not.toHaveBeenCalled();
  });
});

describe('MB-T15 WB4 — collapsed-tile click-to-expand regression (WB10 contract preserved)', () => {
  it('clicking tile-session-name on collapsed tile triggers onCollapse (toggle expand)', () => {
    const onCollapse = vi.fn();
    render(<Tile {...makeProps({ sessionName: 'cx', collapsed: true, onCollapse })} />);
    fireEvent.click(screen.getByTestId('tile-session-name'));
    expect(onCollapse).toHaveBeenCalledWith('cx');
  });

  it('clicking tile-status-indicator on collapsed tile triggers onCollapse', () => {
    const onCollapse = vi.fn();
    render(<Tile {...makeProps({ sessionName: 'cy', collapsed: true, onCollapse })} />);
    fireEvent.click(screen.getByTestId('tile-status-indicator'));
    expect(onCollapse).toHaveBeenCalledWith('cy');
  });
});
