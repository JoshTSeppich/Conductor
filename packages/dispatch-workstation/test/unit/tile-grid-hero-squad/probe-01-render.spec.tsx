// @vitest-environment happy-dom
//
// MB-T19 WB3 probe-01 — TileGrid hero/squad render tests.
//
// Verifies WB3 acceptance:
//   - heroSessionName prop detection: null/undefined/nonexistent →
//     uniform mode; matches session → hero mode (Q-MBT19-1).
//   - data-hero-mode attribute reflects mode for test discoverability.
//   - gridTemplateAreas reflects HeroSquadLayout output (hero spans
//     all cols row 0; squad tiles in row 1 source-order minus hero).
//   - gridTemplateRows: hero mode default = "75% 25%"; uniform mode =
//     "repeat(rows, 1fr)" (Q-MBT19-1 + Q-MBT19-5=b).
//   - Drag handles: hero mode SKIPS vertical (col-border) handles
//     for v3.0 (Q-MBT19-5=b — within-squad-strip resize deferred);
//     horizontal (row-border) handle at hero/squad boundary remains.
//
// Pattern mirrors test/unit/tile-grid-tile/probe-07-autopilot-slot-
// integration.spec.tsx (MB-T17 WB4) for fixture shape.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TileGrid } from '../../../src/tile-grid/tile-grid.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

function makeSessions(names: string[]): { name: string }[] {
  return names.map((name) => ({ name }));
}

function renderGrid(props: Partial<React.ComponentProps<typeof TileGrid>> = {}): void {
  const fake = makeFakeConsoleBridge();
  const adapter = makeFakeTerminalAdapter();
  render(
    <TileGrid
      sessions={props.sessions ?? makeSessions(['a', 'b', 'c', 'd'])}
      consoleBridge={fake.bridge}
      createTerminal={() => adapter}
      {...props}
    />,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mode detection (heroSessionName prop)
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB3 — hero mode detection', () => {
  it('heroSessionName=null: uniform mode (data-hero-mode="false")', () => {
    renderGrid({ heroSessionName: null });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-hero-mode')).toBe('false');
  });

  it('heroSessionName=undefined: uniform mode', () => {
    renderGrid({ heroSessionName: undefined });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-hero-mode')).toBe('false');
  });

  it('heroSessionName="nonexistent": uniform mode (no match in sessions)', () => {
    renderGrid({ heroSessionName: 'nonexistent' });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-hero-mode')).toBe('false');
  });

  it('heroSessionName matches a session: hero mode (data-hero-mode="true")', () => {
    renderGrid({
      sessions: makeSessions(['a', 'b', 'c', 'd']),
      heroSessionName: 'b',
    });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-hero-mode')).toBe('true');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Layout output: gridTemplateAreas
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB3 — gridTemplateAreas in hero mode', () => {
  it('N=4 hero="b" (idx 1): "t1 t1 t1" / "t0 t2 t3"', () => {
    renderGrid({
      sessions: makeSessions(['a', 'b', 'c', 'd']),
      heroSessionName: 'b',
    });
    const root = screen.getByTestId('tile-grid-root');
    const areas = root.style.gridTemplateAreas;
    // happy-dom may serialize differently; check the key tokens.
    expect(areas).toContain('"t1 t1 t1"');
    expect(areas).toContain('"t0 t2 t3"');
  });

  it('N=2 hero="a" (idx 0): "t0" / "t1"', () => {
    renderGrid({
      sessions: makeSessions(['a', 'b']),
      heroSessionName: 'a',
    });
    const root = screen.getByTestId('tile-grid-root');
    const areas = root.style.gridTemplateAreas;
    expect(areas).toContain('"t0"');
    expect(areas).toContain('"t1"');
  });

  it('N=1 hero="a" (degenerate): "t0" only', () => {
    renderGrid({
      sessions: makeSessions(['a']),
      heroSessionName: 'a',
    });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-hero-mode')).toBe('true');
    const areas = root.style.gridTemplateAreas;
    expect(areas).toContain('"t0"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// gridTemplateRows: 75/25 split in hero, repeat(N,1fr) in uniform
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB3 — gridTemplateRows defaults', () => {
  it('hero mode N=4 default rows: "75% 25%"', () => {
    renderGrid({
      sessions: makeSessions(['a', 'b', 'c', 'd']),
      heroSessionName: 'a',
    });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.style.gridTemplateRows).toBe('75% 25%');
  });

  it('uniform mode N=4 default rows: "repeat(2, 1fr)"', () => {
    renderGrid({
      sessions: makeSessions(['a', 'b', 'c', 'd']),
      heroSessionName: null,
    });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.style.gridTemplateRows).toBe('repeat(2, 1fr)');
  });

  it('hero mode N=1 default rows: "100%" (degenerate)', () => {
    renderGrid({
      sessions: makeSessions(['a']),
      heroSessionName: 'a',
    });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.style.gridTemplateRows).toBe('100%');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Drag handles in hero mode: vertical SKIPPED, horizontal RENDERED
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB3 — drag handles in hero mode (Q-MBT19-5=b)', () => {
  it('uniform mode N=4 (2×2): 1 vertical handle + 1 horizontal handle', () => {
    renderGrid({
      sessions: makeSessions(['a', 'b', 'c', 'd']),
      heroSessionName: null,
    });
    const verticals = screen.queryAllByTestId(/^tile-resize-handle-vertical-/);
    const horizontals = screen.queryAllByTestId(/^tile-resize-handle-horizontal-/);
    expect(verticals.length).toBe(1);
    expect(horizontals.length).toBe(1);
  });

  it('hero mode N=4 (cols=3): 0 vertical handles + 1 horizontal handle', () => {
    renderGrid({
      sessions: makeSessions(['a', 'b', 'c', 'd']),
      heroSessionName: 'b',
    });
    const verticals = screen.queryAllByTestId(/^tile-resize-handle-vertical-/);
    const horizontals = screen.queryAllByTestId(/^tile-resize-handle-horizontal-/);
    expect(verticals.length).toBe(0);
    expect(horizontals.length).toBe(1);
  });

  it('hero mode N=8 (cols=7): 0 vertical handles + 1 horizontal handle', () => {
    renderGrid({
      sessions: makeSessions([
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
      ]),
      heroSessionName: 'd',
    });
    const verticals = screen.queryAllByTestId(/^tile-resize-handle-vertical-/);
    const horizontals = screen.queryAllByTestId(/^tile-resize-handle-horizontal-/);
    expect(verticals.length).toBe(0);
    expect(horizontals.length).toBe(1);
  });

  it('hero mode N=2 (cols=1, rows=2): 0 vertical + 1 horizontal handle', () => {
    renderGrid({
      sessions: makeSessions(['a', 'b']),
      heroSessionName: 'a',
    });
    const verticals = screen.queryAllByTestId(/^tile-resize-handle-vertical-/);
    const horizontals = screen.queryAllByTestId(/^tile-resize-handle-horizontal-/);
    expect(verticals.length).toBe(0);
    expect(horizontals.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Existing-behavior preservation
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB3 — uniform-mode defaults preserve MB-T12 behavior', () => {
  it('N=0 (empty) returns null in either mode', () => {
    const fake = makeFakeConsoleBridge();
    const adapter = makeFakeTerminalAdapter();
    const { container } = render(
      <TileGrid
        sessions={[]}
        consoleBridge={fake.bridge}
        createTerminal={() => adapter}
        heroSessionName="anything"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('uniform mode N=4 preserves "repeat(2, 1fr)" rows + "repeat(2, 1fr)" cols', () => {
    renderGrid({
      sessions: makeSessions(['a', 'b', 'c', 'd']),
      heroSessionName: null,
    });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.style.gridTemplateRows).toBe('repeat(2, 1fr)');
    expect(root.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
  });
});
