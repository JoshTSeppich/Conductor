// @vitest-environment happy-dom
//
// MB-T16 WB4 probe-04 — TileGridApp picker-bridge adapter integration.
//
// Verifies that:
//   - When workstationBridge has BOTH getSessionApprovalPolicy +
//     putSessionApprovalPolicy: TileGridApp constructs the slim
//     TileApprovalPickerBridge adapter and passes it to each tile's
//     TileApprovalPicker → picker renders 'ready' state after fetch.
//   - When EITHER method is missing: adapter is null, picker
//     renders 'unavailable' state (Q-MBT16-2=a).
//   - The bridge adapter is keyed by sessionName (each tile gets its
//     own picker fetch).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type {
  ApprovalPolicy,
  ApprovalPolicyGetResponse,
} from 'dispatch-core/dist/v3/schema.js';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

function noop(): void {
  /* noop */
}

function makeBaseBridge(): WorkstationBridgeShape {
  return {
    onSpawnResult: () => noop,
  };
}

function makeBridgeWithApprovalMethods(
  overrides: {
    get?: (name: string) => Promise<ApprovalPolicyGetResponse>;
    put?: (
      name: string,
      policy: ApprovalPolicy,
    ) => Promise<ApprovalPolicyGetResponse>;
  } = {},
): WorkstationBridgeShape {
  return {
    onSpawnResult: () => noop,
    getSessionApprovalPolicy:
      overrides.get ??
      ((name: string) =>
        Promise.resolve({
          session_name: name,
          approval_policy: 'medium',
          updated_at: '2026-05-07T12:00:00.000Z',
        })),
    putSessionApprovalPolicy:
      overrides.put ??
      ((name: string, policy: ApprovalPolicy) =>
        Promise.resolve({
          session_name: name,
          approval_policy: policy,
          updated_at: new Date().toISOString(),
        })),
  };
}

function renderApp(
  bridge: WorkstationBridgeShape,
  initialSessions: { name: string }[] = [{ name: 'sess-x' }],
): void {
  const consoleBridge = makeFakeConsoleBridge().bridge;
  render(
    <TileGridApp
      workstationBridge={bridge}
      consoleBridge={consoleBridge}
      createTerminal={() => makeFakeTerminalAdapter()}
      initialSessions={initialSessions}
    />,
  );
}

describe('MB-T16 WB4 — TileGridApp picker-bridge adapter (Q-MBT16-2=a + Q-MBT16-6=a)', () => {
  it('with both bridge methods: picker renders inside the picker slot', async () => {
    renderApp(makeBridgeWithApprovalMethods());
    // The picker renders inside the tile-picker-slot-{name} wrapper
    // and resolves to ready state after the fetch promise resolves.
    await waitFor(() => {
      const picker = screen.getByTestId('tile-approval-picker');
      expect(picker.getAttribute('data-state')).toBe('ready');
    });
  });

  it('with only getSessionApprovalPolicy: adapter is null → picker renders unavailable', async () => {
    const bridge: WorkstationBridgeShape = {
      onSpawnResult: () => noop,
      getSessionApprovalPolicy: () =>
        Promise.resolve({
          session_name: 'sess-x',
          approval_policy: 'medium',
          updated_at: null,
        }),
      // putSessionApprovalPolicy intentionally omitted
    };
    renderApp(bridge);
    const picker = screen.getByTestId('tile-approval-picker') as HTMLSelectElement;
    expect(picker.getAttribute('data-state')).toBe('unavailable');
    expect(picker.disabled).toBe(true);
  });

  it('with only putSessionApprovalPolicy: adapter is null → picker renders unavailable', () => {
    const bridge: WorkstationBridgeShape = {
      onSpawnResult: () => noop,
      // getSessionApprovalPolicy intentionally omitted
      putSessionApprovalPolicy: () =>
        Promise.resolve({
          session_name: 'sess-x',
          approval_policy: 'medium',
          updated_at: '2026-05-07T12:00:00.000Z',
        }),
    };
    renderApp(bridge);
    const picker = screen.getByTestId('tile-approval-picker') as HTMLSelectElement;
    expect(picker.getAttribute('data-state')).toBe('unavailable');
    expect(picker.disabled).toBe(true);
  });

  it('with neither bridge method: picker renders unavailable', () => {
    renderApp(makeBaseBridge());
    const picker = screen.getByTestId('tile-approval-picker') as HTMLSelectElement;
    expect(picker.getAttribute('data-state')).toBe('unavailable');
    expect(picker.disabled).toBe(true);
  });

  it('bridge methods called with correct sessionName (per-tile keying)', async () => {
    const get = vi.fn((name: string) =>
      Promise.resolve({
        session_name: name,
        approval_policy: 'tight' as ApprovalPolicy,
        updated_at: null,
      }),
    );
    renderApp(
      makeBridgeWithApprovalMethods({ get }),
      [{ name: 'sess-a' }, { name: 'sess-b' }],
    );
    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('sess-a');
      expect(get).toHaveBeenCalledWith('sess-b');
    });
  });

  it('multiple tiles each get their own picker (keyed by sessionName)', async () => {
    renderApp(makeBridgeWithApprovalMethods(), [
      { name: 'a' },
      { name: 'b' },
      { name: 'c' },
    ]);
    await waitFor(() => {
      // 3 tiles → 3 pickers with the same testid; getAllByTestId returns all 3.
      const pickers = screen.getAllByTestId('tile-approval-picker');
      expect(pickers).toHaveLength(3);
      pickers.forEach((p) => {
        expect(p.getAttribute('data-state')).toBe('ready');
      });
    });
  });
});
