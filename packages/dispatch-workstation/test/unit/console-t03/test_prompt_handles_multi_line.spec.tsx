// @vitest-environment happy-dom
//
// CONSOLE-T03 Cluster 3 — Test 3/3: multi-line prompts flow through verbatim.
//
// Authority chain:
//  - MB-S06 §1 (KNOWN): bytes-integrity round-trip across CJK + emoji + tab
//    + LF when the daemon uses `tmux paste-buffer -r` (no LF→CR translation).
//  - CONDUCTOR_API_CONTRACT.md §4.7.2: server-side `pasteRawBytes` helper
//    handles the LF preservation; the panel just sends the bytes.
//
// The panel's job at the renderer boundary: send whatever the operator typed
// without re-encoding line endings. Vitest's fireEvent + happy-dom textarea
// already handles \n correctly; this test verifies the contract by
// asserting an exact round-trip.
//
// RED state: pre-cluster-3 the panel has no Send wiring at all → FAIL.
import { describe, it, expect } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from './fake-console-bridge.js';
import { makeFakeTerminalAdapter } from './fake-terminal-adapter.js';

describe('CONSOLE-T03 cluster 3 — multi-line preservation', () => {
  it('multi-line prompt with embedded LFs sends bytes verbatim (no LF→CR)', async () => {
    const fake = makeFakeConsoleBridge();
    render(
      <ConsolePanel
        consoleBridge={fake.bridge}
        createTerminal={() => makeFakeTerminalAdapter()}
      />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    const input = screen.getByTestId('console-prompt-input') as HTMLTextAreaElement;
    const multi = 'first line\nsecond line\nthird line\n';
    fireEvent.change(input, { target: { value: multi } });
    fireEvent.click(screen.getByTestId('console-prompt-send'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(fake.sendStdinCalls).toEqual([
      { sessionName: 'alpha', bytes: multi, encoding: 'utf8' },
    ]);

    // Defensive byte-by-byte check: no CR (0x0D) substitution happened.
    const sentBytes = fake.sendStdinCalls[0]?.bytes ?? '';
    for (let i = 0; i < sentBytes.length; i++) {
      expect(sentBytes.charCodeAt(i)).not.toBe(0x0d);
    }
    // And the LF count survives.
    const lfCount = (sentBytes.match(/\n/g) ?? []).length;
    expect(lfCount).toBe(3);
  });
});
