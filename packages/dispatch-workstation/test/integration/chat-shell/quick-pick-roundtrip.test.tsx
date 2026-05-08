// @vitest-environment happy-dom
//
// MB-T21 WB3 — quick-pick → IPC roundtrip integration test (Q-MBT21-6=a).
//
// Exercises the full renderer-side path:
//   mountChatShell({ bridge: fakeBridge })
//     → ChatShell renders Chat tab body via renderChatTab slot
//     → ChatPanel mounts, calls bridge.fetchHistory()
//     → fetchHistory resolves with assistant message containing QUICK_PICK marker
//     → ChatPanel parses marker via parseQuickPickMarker
//     → Renders QuickPickButtons with parsed options
//     → User clicks option button
//     → onSelect callback fires bridge.sendAndStream(optionText)
//
// Q-MBT21-4=a verifies: clicked option text is the literal sendAndStream
// argument — exactly as if the operator typed the option into the chat-input.
//
// happy-dom only; no Electron boot. Bridge is a vi.fn-spied fake mirroring
// the CoarchitectBridge surface (fetchHistory + postMessage + sendAndStream
// + onStream*). preload.mts unchanged — we exercise the StreamingBridge
// contract surface that the real coarchitectBridge implements.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import {
  mountChatShell,
  type CoarchitectBridge,
} from '../../../src/chat-shell/mount.js';

let target: HTMLDivElement;

beforeEach(() => {
  target = document.createElement('div');
  target.id = 'qp-mount-target';
  document.body.appendChild(target);
});

afterEach(() => {
  if (target.parentNode) target.remove();
});

interface BridgeSpies {
  readonly fetchHistory: ReturnType<typeof vi.fn>;
  readonly postMessage: ReturnType<typeof vi.fn>;
  readonly sendAndStream: ReturnType<typeof vi.fn>;
  readonly onStreamChunk: ReturnType<typeof vi.fn>;
  readonly onStreamDone: ReturnType<typeof vi.fn>;
  readonly onStreamError: ReturnType<typeof vi.fn>;
}

function makeBridgeWithQuickPickHistory(): CoarchitectBridge & {
  readonly _spies: BridgeSpies;
} {
  const fetchHistory = vi.fn().mockResolvedValue([
    {
      id: 'hist-1',
      role: 'user',
      content: 'plan the next family-A ticket',
      created_at: '2026-05-07T00:00:00.000Z',
      build_doc_id: null,
      build_doc_commit_sha: null,
    },
    {
      id: 'hist-2',
      role: 'assistant',
      content:
        'Possible routings for the next family-A ticket:\n\nQUICK_PICK: ["MB-T15 header", "MB-T16 picker", "MB-T18 footer"]',
      created_at: '2026-05-07T00:00:01.000Z',
      build_doc_id: null,
      build_doc_commit_sha: null,
    },
  ]);
  const postMessage = vi.fn();
  const sendAndStream = vi.fn();
  const onStreamChunk = vi.fn(() => () => undefined);
  const onStreamDone = vi.fn(() => () => undefined);
  const onStreamError = vi.fn(() => () => undefined);
  return {
    fetchHistory,
    postMessage,
    sendAndStream,
    onStreamChunk,
    onStreamDone,
    onStreamError,
    _spies: {
      fetchHistory,
      postMessage,
      sendAndStream,
      onStreamChunk,
      onStreamDone,
      onStreamError,
    },
  };
}

describe('MB-T21 WB3 — quick-pick → IPC roundtrip', () => {
  it('renders quick-pick buttons parsed from assistant message marker', async () => {
    const bridge = makeBridgeWithQuickPickHistory();
    await act(async () => {
      mountChatShell({ rootElementId: 'qp-mount-target', bridge });
    });
    // Allow ChatPanel's mount-effect fetchHistory().then(setHistory) to flush.
    await act(async () => {
      await Promise.resolve();
    });

    const container = document.querySelector('[data-testid="quick-pick-options"]');
    expect(container).not.toBeNull();
    expect(
      document.querySelector('[data-testid="quick-pick-option-0"]')?.textContent,
    ).toBe('MB-T15 header');
    expect(
      document.querySelector('[data-testid="quick-pick-option-1"]')?.textContent,
    ).toBe('MB-T16 picker');
    expect(
      document.querySelector('[data-testid="quick-pick-option-2"]')?.textContent,
    ).toBe('MB-T18 footer');
  });

  it('strips QUICK_PICK marker from displayed assistant bubble body', async () => {
    const bridge = makeBridgeWithQuickPickHistory();
    await act(async () => {
      mountChatShell({ rootElementId: 'qp-mount-target', bridge });
    });
    await act(async () => {
      await Promise.resolve();
    });

    const assistantBubble = document.querySelector(
      '[data-testid="chat-bubble-assistant"]',
    );
    expect(assistantBubble).not.toBeNull();
    expect(assistantBubble?.textContent).not.toContain('QUICK_PICK');
    expect(assistantBubble?.textContent).toContain(
      'Possible routings for the next family-A ticket:',
    );
  });

  it('clicking a quick-pick option fires bridge.sendAndStream(optionText)', async () => {
    const bridge = makeBridgeWithQuickPickHistory();
    await act(async () => {
      mountChatShell({ rootElementId: 'qp-mount-target', bridge });
    });
    await act(async () => {
      await Promise.resolve();
    });

    const btn = document.querySelector(
      '[data-testid="quick-pick-option-1"]',
    ) as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    await act(async () => {
      fireEvent.click(btn!);
    });

    // Q-MBT21-4=a: literal option text becomes the sendAndStream argument.
    expect(bridge._spies.sendAndStream).toHaveBeenCalledTimes(1);
    expect(bridge._spies.sendAndStream).toHaveBeenCalledWith('MB-T16 picker');
  });

  it('preserves chat-input + send-button testids alongside quick-pick buttons', async () => {
    const bridge = makeBridgeWithQuickPickHistory();
    await act(async () => {
      mountChatShell({ rootElementId: 'qp-mount-target', bridge });
    });
    await act(async () => {
      await Promise.resolve();
    });
    // Q-MBT21-1=a invariant: refactor preserves chat-input + send-button
    // testids alongside the new quick-pick UI (probe-03 + coarch-t02 contract).
    expect(document.querySelector('[data-testid="chat-input"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="send-button"]')).not.toBeNull();
  });
});
