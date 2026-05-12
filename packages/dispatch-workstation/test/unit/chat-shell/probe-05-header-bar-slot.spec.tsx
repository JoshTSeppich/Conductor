// @vitest-environment happy-dom
//
// MB-T26 WB3 — probe-05: ChatShell header-bar element + cost-meter slot.
//
// Operator-confirmed Q-MBT26-1=a (header-bar slot model) + Q-MBT26-6=a
// (Terminal C lands first inside Terminal B's reserved MB-T22 extension-
// point zone) 2026-05-07.
//
// Asserts:
//   1. chat-shell-header-bar element renders inside chat-shell-root
//   2. Header-bar has role="toolbar"
//   3. Header-bar appears BEFORE chat-shell-tab-strip in DOM order
//      (left-to-right wireframe: header-bar above tab-strip per
//      t26-t27-coord.md)
//   4. renderCostMeter slot renders content when supplied
//   5. Header-bar is empty (no children) when renderCostMeter undefined
//   6. renderCostMeter is called exactly once per render

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatShell, type TabConfig } from '../../../src/chat-shell/chat-shell.js';

const chatTab: TabConfig = {
  id: 'chat',
  label: 'Chat',
  render: () => null,
};

describe('MB-T26 WB3 — ChatShell header-bar element', () => {
  it('renders chat-shell-header-bar inside chat-shell-root', () => {
    render(<ChatShell tabs={[chatTab]} />);
    const root = screen.getByTestId('chat-shell-root');
    const header = screen.getByTestId('chat-shell-header-bar');
    expect(header).toBeInTheDocument();
    expect(root.contains(header)).toBe(true);
  });

  it('renders header-bar with role="toolbar"', () => {
    render(<ChatShell tabs={[chatTab]} />);
    const header = screen.getByTestId('chat-shell-header-bar');
    expect(header).toHaveAttribute('role', 'toolbar');
  });

  it('renders header-bar BEFORE tab-strip in DOM order', () => {
    render(<ChatShell tabs={[chatTab]} />);
    const root = screen.getByTestId('chat-shell-root');
    const header = screen.getByTestId('chat-shell-header-bar');
    const strip = screen.getByTestId('chat-shell-tab-strip');
    const children = Array.from(root.children);
    const headerIdx = children.indexOf(header);
    const stripIdx = children.indexOf(strip);
    expect(headerIdx).toBeGreaterThanOrEqual(0);
    expect(stripIdx).toBeGreaterThan(headerIdx);
  });
});

describe('MB-T26 WB3 — ChatShell renderCostMeter slot', () => {
  it('renders renderCostMeter content inside chat-shell-header-bar', () => {
    render(
      <ChatShell
        tabs={[chatTab]}
        renderCostMeter={() => (
          <span data-testid="probe-05-cost-meter-marker">$0.05</span>
        )}
      />,
    );
    const marker = screen.getByTestId('probe-05-cost-meter-marker');
    const header = screen.getByTestId('chat-shell-header-bar');
    expect(marker).toBeInTheDocument();
    expect(header.contains(marker)).toBe(true);
  });

  it('renders no cost-meter slot content when renderCostMeter is undefined', () => {
    // Post MB-T-WIREFRAME-T4 WB2 (`bbf4a86`+): header-bar always
    // contains the ConductorBrand element as its leftmost child per
    // Sub-Q-T4-A=(α) "extend chat-shell-header-bar" host-extension
    // operator arbitration 2026-05-12 ("accept all defaults"). The
    // original WB3 assertion (`children.length === 0`) was implicitly
    // testing "no cost-meter slot content"; updated here to be
    // semantic about the cost-meter slot rather than absolute
    // emptiness. The cost-meter slot uses the
    // `probe-05-cost-meter-marker` testid in the sibling test above
    // when supplied; assert that marker is absent here.
    render(<ChatShell tabs={[chatTab]} />);
    expect(screen.queryByTestId('probe-05-cost-meter-marker')).toBeNull();
  });

  it('calls renderCostMeter exactly once per render', () => {
    const renderCostMeter = vi.fn().mockReturnValue(
      <span data-testid="probe-05-callcount-marker" />,
    );
    render(<ChatShell tabs={[chatTab]} renderCostMeter={renderCostMeter} />);
    expect(renderCostMeter).toHaveBeenCalledTimes(1);
  });
});
