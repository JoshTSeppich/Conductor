// @vitest-environment happy-dom
//
// MB-T-MVP-W2-AGENT-GRID WB-final probe-04 — cross-tile live-stream
// isolation (operator-vision Component 2: "live tmux output stream"
// per tile).
//
// Phase-1 diagnose verified the live-stream primitive EXISTS:
//   - tile.tsx:258 mounts <ConsolePanel targetSessionName={sessionName}>
//     per session
//   - console-panel.tsx:92-93 subscribes to consoleBridge.onStdoutChunk
//     and filters by `p.sessionName === targetSessionName`
//
// This probe verifies the cross-tile isolation invariant: a stdout
// chunk emitted for sessionName=A is consumed ONLY by tile-A's terminal
// adapter, never by tile-B's. This is the "harness, do NOT rebuild"
// verification per boot-prompt §B.

import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import {
  makeFakeTerminalAdapter,
  type FakeTerminalAdapter,
} from '../console-t03/fake-terminal-adapter.js';

interface FakeBridge extends WorkstationBridgeShape {
  emitSpawnResult: (reply: unknown) => void;
}

function makeFakeBridge(): FakeBridge {
  const spawnHandlers = new Set<(reply: unknown) => void>();
  return {
    onSpawnResult: (cb) => {
      spawnHandlers.add(cb);
      return () => {
        spawnHandlers.delete(cb);
      };
    },
    emitSpawnResult: (reply) => {
      spawnHandlers.forEach((h) => h(reply));
    },
  };
}

describe('MB-T-MVP-W2 WB-final — cross-tile live-stream isolation', () => {
  it('stdoutChunk for sessionName=A is consumed only by tile-A, not tile-B', () => {
    const workstation = makeFakeBridge();
    const fakeConsole = makeFakeConsoleBridge();
    const adapters: FakeTerminalAdapter[] = [];
    const createTerminal = (): FakeTerminalAdapter => {
      const a = makeFakeTerminalAdapter();
      adapters.push(a);
      return a;
    };

    render(
      <TileGridApp
        workstationBridge={workstation}
        consoleBridge={fakeConsole.bridge}
        createTerminal={createTerminal}
      />,
    );

    // Spawn 2 sessions → tile-A and tile-B mount ConsolePanels.
    act(() => {
      workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'A' },
      });
      workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'B' },
      });
    });

    // ConsolePanel uses console:open to gate terminal-adapter creation
    // (state.open must be true for the adapter useEffect to fire).
    act(() => {
      fakeConsole.emitOpen({ sessionName: 'A' });
      fakeConsole.emitOpen({ sessionName: 'B' });
    });

    // Both tiles should now have created their adapters.
    expect(adapters.length).toBeGreaterThanOrEqual(2);

    // Emit stdoutChunk for sessionName=A only.
    act(() => {
      fakeConsole.emitChunk({
        sessionName: 'A',
        bytes: 'hello-from-A',
        encoding: 'utf8',
        stdout_seq: 1,
      });
    });

    // Find adapters per session name. The first two adapters created
    // correspond to A and B in spawn order; assert exclusivity by union
    // of all writes.
    const allWrites = adapters.map((a) => a.writes.join(''));
    const writesContaining = allWrites.filter((w) =>
      w.includes('hello-from-A'),
    );
    expect(writesContaining.length).toBe(1);
  });

  it('chunks for distinct sessions interleave without cross-talk', () => {
    const workstation = makeFakeBridge();
    const fakeConsole = makeFakeConsoleBridge();
    const adapters: FakeTerminalAdapter[] = [];
    const createTerminal = (): FakeTerminalAdapter => {
      const a = makeFakeTerminalAdapter();
      adapters.push(a);
      return a;
    };

    render(
      <TileGridApp
        workstationBridge={workstation}
        consoleBridge={fakeConsole.bridge}
        createTerminal={createTerminal}
      />,
    );

    act(() => {
      workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'alpha' },
      });
      workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'bravo' },
      });
      workstation.emitSpawnResult({
        type: 'success',
        result: { sessionName: 'charlie' },
      });
    });
    act(() => {
      fakeConsole.emitOpen({ sessionName: 'alpha' });
      fakeConsole.emitOpen({ sessionName: 'bravo' });
      fakeConsole.emitOpen({ sessionName: 'charlie' });
    });

    // Interleave chunks: alpha-1, bravo-1, alpha-2, charlie-1, bravo-2
    act(() => {
      fakeConsole.emitChunk({
        sessionName: 'alpha',
        bytes: 'A1',
        encoding: 'utf8',
        stdout_seq: 1,
      });
      fakeConsole.emitChunk({
        sessionName: 'bravo',
        bytes: 'B1',
        encoding: 'utf8',
        stdout_seq: 1,
      });
      fakeConsole.emitChunk({
        sessionName: 'alpha',
        bytes: 'A2',
        encoding: 'utf8',
        stdout_seq: 2,
      });
      fakeConsole.emitChunk({
        sessionName: 'charlie',
        bytes: 'C1',
        encoding: 'utf8',
        stdout_seq: 1,
      });
      fakeConsole.emitChunk({
        sessionName: 'bravo',
        bytes: 'B2',
        encoding: 'utf8',
        stdout_seq: 2,
      });
    });

    const allConcatenated = adapters.map((a) => a.writes.join(''));
    // Each session's payload lands in EXACTLY one adapter's writes.
    expect(allConcatenated.filter((w) => w.includes('A1')).length).toBe(1);
    expect(allConcatenated.filter((w) => w.includes('A2')).length).toBe(1);
    expect(allConcatenated.filter((w) => w.includes('B1')).length).toBe(1);
    expect(allConcatenated.filter((w) => w.includes('B2')).length).toBe(1);
    expect(allConcatenated.filter((w) => w.includes('C1')).length).toBe(1);

    // The adapter containing A1 also contains A2 (same tile).
    const alphaAdapter = allConcatenated.find((w) => w.includes('A1'));
    expect(alphaAdapter).toBeTruthy();
    expect(alphaAdapter!.includes('A2')).toBe(true);
    // And does NOT contain bravo or charlie payloads.
    expect(alphaAdapter!.includes('B1')).toBe(false);
    expect(alphaAdapter!.includes('B2')).toBe(false);
    expect(alphaAdapter!.includes('C1')).toBe(false);
  });
});
