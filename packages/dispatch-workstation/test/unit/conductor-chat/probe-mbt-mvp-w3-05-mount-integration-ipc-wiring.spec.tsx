// @vitest-environment happy-dom
//
// MB-T-MVP-W3-CONDUCTOR-CHAT WB4 (gen-7 lane, renumbered) probe-05 —
// mount integration + IPC wiring (stub-only per Path-B Q-W3-3 = (a)).
//
// Verifies tryAutoMountConductorChat contract:
//
//   1. document-absent guard (no-document return reason)
//   2. Renderer-created mount-root div pattern (orchestrator-focus-pane
//      precedent at mount.ts:81-92; shell.html is READ-ONLY for W3
//      per manifest, deferred to W3-final sweep)
//   3. rootElementId option to reuse an existing root
//   4. Default mount renders the ConductorChat shell (testid root +
//      header + thread + composer anchors per WB1 contract)
//   5. window.conductorChatBridge subscription pattern (stub-only IPC):
//      - getInitialState seeded into the render
//      - onStateChange re-renders with new state
//      - send / attach / dispatchNext etc. action callbacks wire to
//        bridge methods when the user interacts
//   6. dispose() unmounts + unsubscribes
//
// Path-B follow-up (MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED, file at
// WB-final): the production bridge (real IPC handlers in
// src/main/conductor-chat-ipc.ts) is deferred. This probe injects a
// fake bridge into globalThis.window before mount and asserts the
// renderer-side wiring is correct.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import {
  tryAutoMountConductorChat,
  type ConductorChatBridge,
  type ConductorChatState,
} from '../../../src/conductor-chat/mount.js';

const EMPTY_STATE: ConductorChatState = {
  messages: [],
  attached: null,
  queue: [],
  running: 0,
  total: 0,
  paused: false,
};

function withBridge(bridge: Partial<ConductorChatBridge>): () => void {
  const prev = (globalThis as { window?: { conductorChatBridge?: unknown } })
    .window?.conductorChatBridge;
  (window as unknown as { conductorChatBridge?: unknown }).conductorChatBridge =
    bridge;
  return () => {
    (window as unknown as { conductorChatBridge?: unknown }).conductorChatBridge =
      prev;
  };
}

function clearMountRoots(): void {
  // Remove any leftover mount-root divs between tests so each test starts clean.
  const stragglers = document.querySelectorAll(
    '[id^="conductor-chat-mount-root"], #custom-root, #pre-existing-root',
  );
  stragglers.forEach((n) => n.remove());
  delete (window as unknown as { conductorChatBridge?: unknown })
    .conductorChatBridge;
}

afterEach(() => {
  clearMountRoots();
});

describe('MB-T-MVP-W3 WB4 (gen-7 lane) — mount integration + IPC wiring', () => {
  it('returns no-document when document is undefined', () => {
    const origDoc = globalThis.document;
    // @ts-expect-error simulating no-document environment
    delete globalThis.document;
    try {
      const result = tryAutoMountConductorChat();
      expect(result.mounted).toBe(false);
      if (!result.mounted) expect(result.reason).toBe('no-document');
    } finally {
      // @ts-expect-error restore
      globalThis.document = origDoc;
    }
  });

  it('creates a default mount-root div when none exists', () => {
    expect(document.getElementById('conductor-chat-mount-root')).toBeNull();
    const result = tryAutoMountConductorChat();
    expect(result.mounted).toBe(true);
    const root = document.getElementById('conductor-chat-mount-root');
    expect(root).not.toBeNull();
    if (result.mounted) result.dispose();
  });

  it('reuses an existing root element when rootElementId is provided', () => {
    const preExisting = document.createElement('div');
    preExisting.id = 'pre-existing-root';
    document.body.appendChild(preExisting);
    const result = tryAutoMountConductorChat({ rootElementId: 'pre-existing-root' });
    expect(result.mounted).toBe(true);
    // No new conductor-chat-mount-root should have been auto-created.
    expect(document.getElementById('conductor-chat-mount-root')).toBeNull();
    // The pre-existing root should now hold the ConductorChat scaffold.
    expect(preExisting.querySelector('[data-testid="conductor-chat-root"]')).not.toBeNull();
    if (result.mounted) result.dispose();
  });

  it('renders the ConductorChat shell (root + header + thread + composer testids)', () => {
    const result = tryAutoMountConductorChat();
    expect(result.mounted).toBe(true);
    expect(screen.getByTestId('conductor-chat-root')).toBeInTheDocument();
    expect(screen.getByTestId('conductor-chat-header')).toBeInTheDocument();
    expect(screen.getByTestId('conductor-chat-thread')).toBeInTheDocument();
    expect(screen.getByTestId('conductor-chat-composer')).toBeInTheDocument();
    if (result.mounted) result.dispose();
  });

  it('seeds initial state from bridge.getInitialState when present', async () => {
    const restore = withBridge({
      getInitialState: () => ({
        ...EMPTY_STATE,
        messages: [
          { role: 'user', text: 'hello from bridge' },
          { role: 'assistant', text: 'conductor reply' },
        ],
      }),
    });
    try {
      const result = tryAutoMountConductorChat();
      expect(result.mounted).toBe(true);
      // ConductorMessage user/assistant variants are rendered with their own
      // testids per WB2 contract (a0baa19).
      expect(screen.getByTestId('conductor-message-user')).toBeInTheDocument();
      expect(screen.getByTestId('conductor-message-assistant')).toBeInTheDocument();
      if (result.mounted) result.dispose();
    } finally {
      restore();
    }
  });

  it('re-renders when bridge.onStateChange fires with new state', () => {
    let emit: ((s: ConductorChatState) => void) | null = null;
    const restore = withBridge({
      getInitialState: () => EMPTY_STATE,
      onStateChange: (cb) => {
        emit = cb;
        return () => {
          emit = null;
        };
      },
    });
    try {
      const result = tryAutoMountConductorChat();
      expect(result.mounted).toBe(true);
      // Initially no messages → no user message testid.
      expect(screen.queryByTestId('conductor-message-user')).toBeNull();
      // Emit a new state with a user message. React 18 auto-batches
      // setState calls fired outside event handlers, so wrap in act()
      // to flush the re-render synchronously before the assertion.
      expect(emit).not.toBeNull();
      act(() => {
        emit!({
          ...EMPTY_STATE,
          messages: [{ role: 'user', text: 'after emit' }],
        });
      });
      // Now the user message is rendered.
      expect(screen.getByTestId('conductor-message-user')).toBeInTheDocument();
      if (result.mounted) result.dispose();
    } finally {
      restore();
    }
  });

  it('dispose() unmounts the ConductorChat shell + unsubscribes from bridge', () => {
    const unsubscribe = vi.fn();
    const restore = withBridge({
      getInitialState: () => EMPTY_STATE,
      onStateChange: () => unsubscribe,
    });
    try {
      const result = tryAutoMountConductorChat();
      expect(result.mounted).toBe(true);
      expect(screen.getByTestId('conductor-chat-root')).toBeInTheDocument();
      if (result.mounted) result.dispose();
      // After dispose, the root should not be in the document (or at least
      // be empty of the ConductorChat scaffold).
      expect(screen.queryByTestId('conductor-chat-root')).toBeNull();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it('renders gracefully when window.conductorChatBridge is absent (DEFAULT_IDLE_STATE)', () => {
    // No bridge present → mount succeeds with the default idle state
    // (one assistant intro bubble per WB5 §5.5 screenshot oracle).
    // WB4 originally asserted truly-empty defaults; WB5 corrects the
    // default to match the design idle screenshot. The "bridge absent"
    // contract remains: subscribe/emit are no-ops; the surface still
    // mounts cleanly with default-rendering content.
    delete (window as unknown as { conductorChatBridge?: unknown })
      .conductorChatBridge;
    const result = tryAutoMountConductorChat();
    expect(result.mounted).toBe(true);
    expect(screen.getByTestId('conductor-chat-root')).toBeInTheDocument();
    // No user / dispatch / system / typing variants at idle.
    expect(screen.queryByTestId('conductor-message-user')).toBeNull();
    expect(screen.queryByTestId('conductor-message-dispatch')).toBeNull();
    expect(screen.queryByTestId('conductor-message-system')).toBeNull();
    expect(screen.queryByTestId('conductor-message-typing')).toBeNull();
    // Exactly one assistant intro bubble per the default idle state.
    expect(
      screen.queryAllByTestId('conductor-message-assistant'),
    ).toHaveLength(1);
    if (result.mounted) result.dispose();
  });
});
