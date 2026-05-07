// @vitest-environment happy-dom
//
// MB-T20 WB3 — mountChatShell adapter tests (probe-02).
//
// Asserts mount adapter contract:
//   - mountChatShell(opts) mounts ChatShell into the target element
//   - returns an unmount fn that tears down the React tree
//   - throws when target element is missing
//   - renders the WB3 default chat-tab stub when no renderChatTab
//   - renders custom renderChatTab when provided (WB4 will pass a
//     closure that wraps coarchitect/chat-panel.js's ChatPanel)
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

  it('renders default chat-tab stub when neither renderChatTab nor bridge provided', async () => {
    await act(async () => {
      mountChatShell({ rootElementId: 'chat-shell-mount-target' });
    });
    const stub = document.querySelector('[data-testid="chat-shell-chat-tab-stub"]');
    expect(stub).not.toBeNull();
    expect(stub?.textContent).toContain('Chat tab body');
  });

  it('renders custom renderChatTab when provided', async () => {
    await act(async () => {
      mountChatShell({
        rootElementId: 'chat-shell-mount-target',
        renderChatTab: () => <div data-testid="chat-shell-custom-body">custom</div>,
      });
    });
    const body = document.querySelector('[data-testid="chat-shell-custom-body"]');
    expect(body).not.toBeNull();
    expect(body?.textContent).toBe('custom');
  });
});
