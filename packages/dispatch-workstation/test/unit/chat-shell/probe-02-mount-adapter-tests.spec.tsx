// @vitest-environment happy-dom
//
// MB-T20 WB3 → MB-T22 WB2 migrated — mountChatShell adapter tests (probe-02).
//
// Migrated 2026-05-07 from the MB-T20 single-tab `renderChatTab` option
// to the MB-T22 multi-tab `tabs: TabConfig[]` option (Q-MBT22-3=a;
// closes MB-F-T20-FAMILY-B-ADDITIONAL-TABS).
//
// Asserts mount adapter contract:
//   - mountChatShell(opts) mounts ChatShell into the target element
//   - returns an unmount fn that tears down the React tree
//   - throws when target element is missing
//   - renders the default chat-tab stub when neither tabs nor bridge
//     provided
//   - renders custom tabs when provided (WB3 of MB-T22 wires the
//     Commits TabConfig; future tickets add Tasks tab, etc.)
//
// Auto-mount block in mount.ts is gated on window.coarchitectBridge
// existence; test env has no bridge, so importing mount.js is safe.
//
// React 18 createRoot.render is concurrent — every mount/unmount is
// wrapped in act() so DOM assertions observe the post-flush tree.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { mountChatShell } from '../../../src/chat-shell/mount.js';

let target: HTMLDivElement;

beforeEach(() => {
  target = document.createElement('div');
  target.id = 'chat-shell-mount-target';
  document.body.appendChild(target);
});

afterEach(() => {
  if (target.parentNode) target.remove();
});

describe('MB-T20 WB3 — mountChatShell adapter', () => {
  it('mounts ChatShell into the target element', async () => {
    await act(async () => {
      mountChatShell({ rootElementId: 'chat-shell-mount-target' });
    });
    expect(document.querySelector('[data-testid="chat-shell-root"]')).not.toBeNull();
  });

  it('returns an unmount fn that tears down the React tree', async () => {
    let unmount: () => void = () => undefined;
    await act(async () => {
      unmount = mountChatShell({ rootElementId: 'chat-shell-mount-target' });
    });
    expect(document.querySelector('[data-testid="chat-shell-root"]')).not.toBeNull();
    await act(async () => {
      unmount();
    });
    expect(document.querySelector('[data-testid="chat-shell-root"]')).toBeNull();
  });

  it('throws when target element is missing', () => {
    expect(() => mountChatShell({ rootElementId: 'non-existent-id' })).toThrow(
      /not found/,
    );
  });

  it('renders default chat-tab stub when neither tabs nor bridge provided', async () => {
    await act(async () => {
      mountChatShell({ rootElementId: 'chat-shell-mount-target' });
    });
    const stub = document.querySelector('[data-testid="chat-shell-chat-tab-stub"]');
    expect(stub).not.toBeNull();
    expect(stub?.textContent).toContain('Chat tab body');
  });

  it('renders custom tabs when provided (overrides default Chat-tab construction)', async () => {
    await act(async () => {
      mountChatShell({
        rootElementId: 'chat-shell-mount-target',
        tabs: [
          {
            id: 'chat',
            label: 'Chat',
            render: () => (
              <div data-testid="chat-shell-custom-body">custom</div>
            ),
          },
        ],
      });
    });
    const body = document.querySelector('[data-testid="chat-shell-custom-body"]');
    expect(body).not.toBeNull();
    expect(body?.textContent).toBe('custom');
  });
});
