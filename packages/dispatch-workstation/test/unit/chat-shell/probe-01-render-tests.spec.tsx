// @vitest-environment happy-dom
//
// MB-T20 WB1 — ChatShell red scaffold tests.
// Operator-confirmed Q-MBT20-1=a (Family-B tab-host shell) 2026-05-07.
//
// WB2 green ships the contract these assertions verify:
//   - chat-shell-root      → outer container (panel chrome)
//   - chat-shell-tab-strip → tab header position
//   - chat-shell-tab-chat  → initial Chat tab (active by default; only
//                            tab at WB2 — Commits/Tasks/etc. tabs are
//                            MB-T22..T27 territory)
//   - chat-shell-tab-content → active-tab content slot (Chat tab body
//                              is wired to coarchitect/chat-panel.js
//                              at WB4 via direct import + Q-MBT20-5=a
//                              coarchitectBridge passthrough)
//
// WB1 stub returns null → all four assertions fail (red verified).

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatShell } from '../../../src/chat-shell/chat-shell.js';

describe('MB-T20 WB1 — ChatShell red scaffold', () => {
  it('renders chat-shell-root container', () => {
    render(<ChatShell />);
    expect(screen.getByTestId('chat-shell-root')).toBeInTheDocument();
  });

  it('renders chat-shell-tab-strip in the tab-host header position', () => {
    render(<ChatShell />);
    expect(screen.getByTestId('chat-shell-tab-strip')).toBeInTheDocument();
  });

  it('renders the initial Chat tab (chat-shell-tab-chat)', () => {
    render(<ChatShell />);
    expect(screen.getByTestId('chat-shell-tab-chat')).toBeInTheDocument();
  });

  it('renders the active-tab content slot (chat-shell-tab-content)', () => {
    render(<ChatShell />);
    expect(screen.getByTestId('chat-shell-tab-content')).toBeInTheDocument();
  });
});
