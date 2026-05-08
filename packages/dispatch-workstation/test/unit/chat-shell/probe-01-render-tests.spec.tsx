// @vitest-environment happy-dom
//
// MB-T20 WB2 → MB-T22 WB2 migrated — ChatShell render tests (probe-01).
//
// Migrated 2026-05-07 from the MB-T20 single-tab API to the MB-T22
// multi-tab API (Q-MBT22-3=a; closes MB-F-T20-FAMILY-B-ADDITIONAL-TABS).
// The data-testid contract is preserved verbatim — chat-shell-root,
// chat-shell-tab-strip, chat-shell-tab-chat (now via tabs[]),
// chat-shell-tab-content. Only the props shape changes:
//   MB-T20:  <ChatShell renderChatTab={() => ...} />
//   MB-T22:  <ChatShell tabs={[{ id:'chat', label:'Chat', render:... }]} />
//
// Multi-tab API behavioral assertions (controlled mode, click-to-switch,
// onTabChange, etc.) live in probe-04-multi-tab-api.spec.tsx (the WB1
// RED probe that flips GREEN at WB2).

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatShell, type TabConfig } from '../../../src/chat-shell/chat-shell.js';

const chatTab: TabConfig = {
  id: 'chat',
  label: 'Chat',
  render: () => null,
};

describe('MB-T22 WB2 — ChatShell tab-host render (Chat tab via tabs[])', () => {
  it('renders chat-shell-root container', () => {
    render(<ChatShell tabs={[chatTab]} />);
    expect(screen.getByTestId('chat-shell-root')).toBeInTheDocument();
  });

  it('renders chat-shell-tab-strip in the tab-host header position', () => {
    render(<ChatShell tabs={[chatTab]} />);
    const strip = screen.getByTestId('chat-shell-tab-strip');
    expect(strip).toBeInTheDocument();
    expect(strip).toHaveAttribute('role', 'tablist');
  });

  it('renders the Chat tab (chat-shell-tab-chat) selected by default', () => {
    render(<ChatShell tabs={[chatTab]} />);
    const tab = screen.getByTestId('chat-shell-tab-chat');
    expect(tab).toBeInTheDocument();
    expect(tab).toHaveAttribute('role', 'tab');
    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(tab).toHaveTextContent('Chat');
  });

  it('renders the active-tab content slot (chat-shell-tab-content)', () => {
    render(<ChatShell tabs={[chatTab]} />);
    const content = screen.getByTestId('chat-shell-tab-content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveAttribute('role', 'tabpanel');
  });
});

describe('MB-T22 WB2 — ChatShell tab body render (TabConfig.render slot)', () => {
  it('renders the active TabConfig.render() output inside chat-shell-tab-content', () => {
    render(
      <ChatShell
        tabs={[
          {
            id: 'chat',
            label: 'Chat',
            render: () => (
              <div data-testid="chat-shell-test-tab-body">tab body content</div>
            ),
          },
        ]}
      />,
    );
    const body = screen.getByTestId('chat-shell-test-tab-body');
    expect(body).toBeInTheDocument();
    expect(body).toHaveTextContent('tab body content');
    const slot = screen.getByTestId('chat-shell-tab-content');
    expect(slot.contains(body)).toBe(true);
  });

  it('renders empty chat-shell-tab-content when active tab render returns null', () => {
    render(<ChatShell tabs={[chatTab]} />);
    const slot = screen.getByTestId('chat-shell-tab-content');
    expect(slot).toBeInTheDocument();
    expect(slot.children.length).toBe(0);
  });

  it('calls active TabConfig.render exactly once per render', () => {
    let callCount = 0;
    render(
      <ChatShell
        tabs={[
          {
            id: 'chat',
            label: 'Chat',
            render: () => {
              callCount += 1;
              return <span data-testid="chat-shell-callcount-marker" />;
            },
          },
        ]}
      />,
    );
    expect(screen.getByTestId('chat-shell-callcount-marker')).toBeInTheDocument();
    expect(callCount).toBe(1);
  });
});
