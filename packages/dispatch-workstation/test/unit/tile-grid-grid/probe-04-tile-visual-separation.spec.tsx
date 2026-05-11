// @vitest-environment happy-dom
//
// §B.1 red probe — tile visual separation
//   - grid root has gap (4px) so tiles are spaced
//   - each tile-cell wrapper has border, borderRadius, background, overflow:hidden
//   - assertions are on inline style; before green change all fail (red)

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  TileGrid,
  type TileGridSessionEntry,
} from '../../../src/tile-grid/tile-grid.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

function makeFixtures(names: string[]): {
  bridge: ReturnType<typeof makeFakeConsoleBridge>;
  sessions: TileGridSessionEntry[];
  createTerminal: () => ReturnType<typeof makeFakeTerminalAdapter>;
} {
  return {
    bridge: makeFakeConsoleBridge(),
    sessions: names.map((name) => ({ name })),
    createTerminal: () => makeFakeTerminalAdapter(),
  };
}

describe('§B.1 tile visual separation — grid gap', () => {
  it('grid root carries gap: 4px between tiles', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    const root = screen.getByTestId('tile-grid-root');
    expect(root.style.gap).toBe('4px');
  });
});

describe('§B.1 tile visual separation — cell wrapper chrome', () => {
  it('each tile-cell wrapper has border, borderRadius, background, overflow:hidden', () => {
    const { bridge, sessions, createTerminal } = makeFixtures(['a', 'b']);
    render(
      <TileGrid
        sessions={sessions}
        consoleBridge={bridge.bridge}
        createTerminal={createTerminal}
      />,
    );
    for (const name of ['a', 'b']) {
      const cell = screen.getByTestId(`tile-cell-${name}`);
      expect(cell.style.borderRadius).toBe('4px');
      expect(cell.style.background).toBe('#111111');
      expect(cell.style.overflow).toBe('hidden');
      expect(cell.style.border).toBeTruthy();
    }
  });
});
