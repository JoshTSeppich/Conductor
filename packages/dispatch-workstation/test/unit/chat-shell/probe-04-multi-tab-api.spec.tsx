// @vitest-environment happy-dom
//
// MB-T22 WB1 RED — ChatShell multi-tab API probe.
//
// Operator-confirmed (Q-MBT22-3=a, decisions doc 2026-05-07): WB2 lands
// the multi-tab state machine that closes MB-F-T20-FAMILY-B-ADDITIONAL-
// TABS. This probe asserts the future API and currently fails RED
// because the WB1 ChatShell still ships the MB-T20 single-tab signature
// (`renderChatTab?: () => ReactNode`).
//
// data-testid contract preserved verbatim from MB-T20 — only the props
// API changes. Existing test/unit/chat-shell/probe-01-render-tests.spec
// .tsx (single-tab) MIGRATES at WB2 green to pass `tabs={[{...}]}`.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatShell } from '../../../src/chat-shell/chat-shell.js';

// Local TabConfig shape mirrors the WB2 contract (decisions doc §
// Q-MBT22-3). Probe defines it locally so the RED assertions don't
// depend on the export landing at WB1.
interface TabConfig {
  readonly id: string;
  readonly label: string;
  readonly render: () => React.ReactNode;
}

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
    // @ts-expect-error WB1 RED — ChatShellProps.tabs lands at WB2.
    render(<ChatShell tabs={makeTabs()} />);
    expect(screen.getByTestId('chat-shell-tab-chat')).toBeInTheDocument();
    expect(screen.getByTestId('chat-shell-tab-commits')).toBeInTheDocument();
  });

  it('renders each tab chip with role=tab and its label as text', () => {
    // @ts-expect-error WB1 RED — ChatShellProps.tabs lands at WB2.
    render(<ChatShell tabs={makeTabs()} />);
    const chat = screen.getByTestId('chat-shell-tab-chat');
    const commits = screen.getByTestId('chat-shell-tab-commits');
    expect(chat).toHaveAttribute('role', 'tab');
    expect(commits).toHaveAttribute('role', 'tab');
    expect(chat).toHaveTextContent('Chat');
    expect(commits).toHaveTextContent('Commits');
  });

  it('marks the first tab aria-selected when activeTabId is omitted', () => {
    // @ts-expect-error WB1 RED — ChatShellProps.tabs lands at WB2.
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
      // @ts-expect-error WB1 RED — multi-tab props land at WB2.
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
      // @ts-expect-error WB1 RED — multi-tab props land at WB2.
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
      // @ts-expect-error WB1 RED — multi-tab props land at WB2.
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
      // @ts-expect-error WB1 RED — multi-tab props land at WB2.
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
    // @ts-expect-error WB1 RED — multi-tab props land at WB2.
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
    // @ts-expect-error WB1 RED — multi-tab props land at WB2.
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
