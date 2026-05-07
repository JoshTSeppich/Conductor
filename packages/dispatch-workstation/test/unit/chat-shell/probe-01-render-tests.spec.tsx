// @vitest-environment happy-dom
//
// MB-T20 WB2 — ChatShell render tests (probe-01).
// Operator-confirmed Q-MBT20-1=a (Family-B tab-host shell) 2026-05-07.
//
// Asserts the WB2 contract:
//   - chat-shell-root      → outer container (panel chrome)
//   - chat-shell-tab-strip → tab header position (role=tablist)
//   - chat-shell-tab-chat  → initial Chat tab (role=tab; aria-selected)
//   - chat-shell-tab-content → active-tab content slot (role=tabpanel)
//   - renderChatTab render-prop slot (mirrors MB-T16 picker pattern):
//     called when provided; empty when undefined.
//
// WB4 wires renderChatTab to render coarchitect/chat-panel.js's ChatPanel
// inline (Q-MBT20-3=a wrap; Q-MBT20-5=a coarchitectBridge passthrough).

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatShell } from '../../../src/chat-shell/chat-shell.js';

describe('MB-T20 WB2 — ChatShell tab-host render', () => {
  it('renders chat-shell-root container', () => {
    render(<ChatShell />);
    expect(screen.getByTestId('chat-shell-root')).toBeInTheDocument();
  });

  it('renders chat-shell-tab-strip in the tab-host header position', () => {
    render(<ChatShell />);
    const strip = screen.getByTestId('chat-shell-tab-strip');
    expect(strip).toBeInTheDocument();
    expect(strip).toHaveAttribute('role', 'tablist');
  });

  it('renders the initial Chat tab (chat-shell-tab-chat) selected by default', () => {
    render(<ChatShell />);
    const tab = screen.getByTestId('chat-shell-tab-chat');
    expect(tab).toBeInTheDocument();
    expect(tab).toHaveAttribute('role', 'tab');
    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(tab).toHaveTextContent('Chat');
  });

  it('renders the active-tab content slot (chat-shell-tab-content)', () => {
    render(<ChatShell />);
    const content = screen.getByTestId('chat-shell-tab-content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveAttribute('role', 'tabpanel');
  });
});

describe('MB-T20 WB2 — ChatShell renderChatTab slot (Q-MBT20-3=a wrap)', () => {
  it('renders renderChatTab content inside chat-shell-tab-content when provided', () => {
    render(
      <ChatShell
        renderChatTab={() => (
          <div data-testid="chat-shell-test-tab-body">tab body content</div>
        )}
      />,
    );
    const body = screen.getByTestId('chat-shell-test-tab-body');
    expect(body).toBeInTheDocument();
    expect(body).toHaveTextContent('tab body content');
    const slot = screen.getByTestId('chat-shell-tab-content');
    expect(slot.contains(body)).toBe(true);
  });

  it('renders empty chat-shell-tab-content when renderChatTab is undefined', () => {
    render(<ChatShell />);
    const slot = screen.getByTestId('chat-shell-tab-content');
    expect(slot).toBeInTheDocument();
    expect(slot.children.length).toBe(0);
  });

  it('calls renderChatTab exactly once per render', () => {
    let callCount = 0;
    render(
      <ChatShell
        renderChatTab={() => {
          callCount += 1;
          return <span data-testid="chat-shell-callcount-marker" />;
        }}
      />,
    );
    expect(screen.getByTestId('chat-shell-callcount-marker')).toBeInTheDocument();
    expect(callCount).toBe(1);
  });
});
