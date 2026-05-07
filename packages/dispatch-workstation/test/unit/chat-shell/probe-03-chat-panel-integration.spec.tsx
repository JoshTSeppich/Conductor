// @vitest-environment happy-dom
//
// MB-T20 WB4 — chat-shell ↔ ChatPanel integration tests (probe-03).
//
// Asserts the WB4 wrap contract:
//   - mountChatShell({ bridge }) renders ChatPanel inside chat-shell-tab-content
//     (Q-MBT20-3=a wrap; ChatPanel is the existing coarchitect/chat-panel.tsx
//     consumer surface — NOT modified by MB-T20)
//   - chat-input + send-button (ChatPanel's testids) appear inside the
//     active-tab content slot, NOT outside the tab-host
//   - bridge.fetchHistory is called once on ChatPanel mount (Q-MBT20-5=a
//     coarchitectBridge passthrough — the bridge IS the data source)
//   - bridge.onStream{Chunk,Done,Error} subscriptions register on mount
//     (StreamingBridge wiring preserved end-to-end via the wrap)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { mountChatShell, type CoarchitectBridge } from '../../../src/chat-shell/mount.js';

let target: HTMLDivElement;

beforeEach(() => {
  target = document.createElement('div');
  target.id = 'chat-shell-mount-target';
  document.body.appendChild(target);
});

afterEach(() => {
  if (target.parentNode) target.remove();
});

function makeFakeBridge(): CoarchitectBridge & {
  readonly _spies: {
    readonly fetchHistory: ReturnType<typeof vi.fn>;
    readonly postMessage: ReturnType<typeof vi.fn>;
    readonly sendAndStream: ReturnType<typeof vi.fn>;
    readonly onStreamChunk: ReturnType<typeof vi.fn>;
    readonly onStreamDone: ReturnType<typeof vi.fn>;
    readonly onStreamError: ReturnType<typeof vi.fn>;
  };
} {
  const fetchHistory = vi.fn().mockResolvedValue([]);
  const postMessage = vi.fn().mockResolvedValue({
    id: 'fake-1',
    role: 'user',
    content: '',
    created_at: '2026-05-07T00:00:00.000Z',
    build_doc_id: null,
    build_doc_commit_sha: null,
  });
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

describe('MB-T20 WB4 — chat-shell ↔ ChatPanel integration', () => {
  it('renders ChatPanel inside chat-shell-tab-content when bridge is provided', async () => {
    const bridge = makeFakeBridge();
    await act(async () => {
      mountChatShell({ rootElementId: 'chat-shell-mount-target', bridge });
    });
    // Allow ChatPanel's mount effect (fetchHistory().then(setHistory)) to flush.
    await act(async () => {
      await Promise.resolve();
    });

    const chatInput = document.querySelector('[data-testid="chat-input"]');
    expect(chatInput).not.toBeNull();
    const sendButton = document.querySelector('[data-testid="send-button"]');
    expect(sendButton).not.toBeNull();

    // Both ChatPanel testids MUST be inside chat-shell-tab-content (active
    // tab body slot) — not adjacent to it, not outside the tab host.
    const slot = document.querySelector('[data-testid="chat-shell-tab-content"]');
    expect(slot).not.toBeNull();
    expect(slot?.contains(chatInput)).toBe(true);
    expect(slot?.contains(sendButton)).toBe(true);
  });

  it('preserves the chat-shell tab-host chrome when bridge is provided', async () => {
    const bridge = makeFakeBridge();
    await act(async () => {
      mountChatShell({ rootElementId: 'chat-shell-mount-target', bridge });
    });
    expect(document.querySelector('[data-testid="chat-shell-root"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="chat-shell-tab-strip"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="chat-shell-tab-chat"]')).not.toBeNull();
  });

  it('calls bridge.fetchHistory once on ChatPanel mount', async () => {
    const bridge = makeFakeBridge();
    await act(async () => {
      mountChatShell({ rootElementId: 'chat-shell-mount-target', bridge });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(bridge._spies.fetchHistory).toHaveBeenCalledTimes(1);
  });

  it('registers streaming-bridge subscriptions on ChatPanel mount', async () => {
    const bridge = makeFakeBridge();
    await act(async () => {
      mountChatShell({ rootElementId: 'chat-shell-mount-target', bridge });
    });
    expect(bridge._spies.onStreamChunk).toHaveBeenCalledTimes(1);
    expect(bridge._spies.onStreamDone).toHaveBeenCalledTimes(1);
    expect(bridge._spies.onStreamError).toHaveBeenCalledTimes(1);
  });

  it('does NOT render the WB3 default stub when bridge is provided', async () => {
    const bridge = makeFakeBridge();
    await act(async () => {
      mountChatShell({ rootElementId: 'chat-shell-mount-target', bridge });
    });
    expect(document.querySelector('[data-testid="chat-shell-chat-tab-stub"]')).toBeNull();
  });
});
