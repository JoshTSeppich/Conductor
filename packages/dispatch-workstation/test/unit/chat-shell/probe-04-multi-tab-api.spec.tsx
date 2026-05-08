// @vitest-environment happy-dom
//
// MB-T22 WB1 RED → WB2 GREEN — ChatShell multi-tab API probe.
//
// WB1 (RED) authored these tests against the future multi-tab API. WB2
// (GREEN) lands the implementation: TabConfig + tabs[] + activeTabId +
// onTabChange replace renderChatTab. Closes
// MB-F-T20-FAMILY-B-ADDITIONAL-TABS at WB2 commit body.
//
// data-testid contract preserved verbatim from MB-T20 — only the props
// API changes.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatShell, type TabConfig } from '../../../src/chat-shell/chat-shell.js';

function makeTabs(): readonly TabConfig[] {
  return [
    {
      id: 'chat',
      label: 'Chat',
      render: () => <div data-testid="probe-04-chat-body">chat body</div>,
    },
    {
      id: 'commits',
      label: 'Commits',
      render: () => (
        <div data-testid="probe-04-commits-body">commits body</div>
      ),
    },
  ];
}

describe('MB-T22 WB1 RED — ChatShell multi-tab API surface', () => {
  it('renders a tab chip per TabConfig entry (chat-shell-tab-{id})', () => {
    render(<ChatShell tabs={makeTabs()} />);
    expect(screen.getByTestId('chat-shell-tab-chat')).toBeInTheDocument();
    expect(screen.getByTestId('chat-shell-tab-commits')).toBeInTheDocument();
  });

  it('renders each tab chip with role=tab and its label as text', () => {
    render(<ChatShell tabs={makeTabs()} />);
    const chat = screen.getByTestId('chat-shell-tab-chat');
    const commits = screen.getByTestId('chat-shell-tab-commits');
    expect(chat).toHaveAttribute('role', 'tab');
    expect(commits).toHaveAttribute('role', 'tab');
    expect(chat).toHaveTextContent('Chat');
    expect(commits).toHaveTextContent('Commits');
  });

  it('marks the first tab aria-selected when activeTabId is omitted', () => {
    render(<ChatShell tabs={makeTabs()} />);
    expect(screen.getByTestId('chat-shell-tab-chat')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('chat-shell-tab-commits')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('marks the activeTabId tab aria-selected when supplied', () => {
    render(
      <ChatShell tabs={makeTabs()} activeTabId="commits" />,
    );
    expect(screen.getByTestId('chat-shell-tab-commits')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('chat-shell-tab-chat')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('renders only the active tab body inside chat-shell-tab-content', () => {
    render(
      <ChatShell tabs={makeTabs()} activeTabId="commits" />,
    );
    const slot = screen.getByTestId('chat-shell-tab-content');
    expect(slot).toBeInTheDocument();
    expect(screen.getByTestId('probe-04-commits-body')).toBeInTheDocument();
    expect(slot.contains(screen.getByTestId('probe-04-commits-body'))).toBe(
      true,
    );
    expect(screen.queryByTestId('probe-04-chat-body')).not.toBeInTheDocument();
  });

  it('invokes onTabChange(id) when an inactive tab chip is clicked', () => {
    const onTabChange = vi.fn();
    render(
      <ChatShell
        tabs={makeTabs()}
        activeTabId="chat"
        onTabChange={onTabChange}
      />,
    );
    fireEvent.click(screen.getByTestId('chat-shell-tab-commits'));
    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith('commits');
  });

  it('does not invoke onTabChange when the already-active chip is clicked', () => {
    const onTabChange = vi.fn();
    render(
      <ChatShell
        tabs={makeTabs()}
        activeTabId="chat"
        onTabChange={onTabChange}
      />,
    );
    fireEvent.click(screen.getByTestId('chat-shell-tab-chat'));
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('renders empty content slot AND no tab chips when tabs is an empty array', () => {
    render(<ChatShell tabs={[]} />);
    const slot = screen.getByTestId('chat-shell-tab-content');
    expect(slot).toBeInTheDocument();
    expect(slot.children.length).toBe(0);
    // WB2 must not render any hardcoded chip — including the legacy
    // single-tab "Chat" chip — when tabs is an empty array. This RED
    // assertion forces multi-tab impl to honor tabs[] strictly.
    expect(screen.queryByTestId('chat-shell-tab-chat')).not.toBeInTheDocument();
  });

  it('preserves chat-shell-root + chat-shell-tab-strip + chat-shell-tab-content data-testid contract', () => {
    render(<ChatShell tabs={makeTabs()} />);
    expect(screen.getByTestId('chat-shell-root')).toBeInTheDocument();
    expect(screen.getByTestId('chat-shell-tab-strip')).toHaveAttribute(
      'role',
      'tablist',
    );
    expect(screen.getByTestId('chat-shell-tab-content')).toHaveAttribute(
      'role',
      'tabpanel',
    );
  });
});
