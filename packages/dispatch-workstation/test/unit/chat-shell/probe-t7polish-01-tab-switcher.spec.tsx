// @vitest-environment happy-dom
//
// MB-F-CHATSHELL-POLISH-REMAINING WB1 (red) — TabSwitcher component
// contract probe.
//
// Per dispatch /tmp/dispatch-p3.txt successor Round 11 §3.9 Wave 2
// SPECULATIVE + territorial manifest verify-chat-mount-t7polish.txt:
// authors `tab-switcher.tsx` as a self-contained TabSwitcher component
// targeting drop-in replacement of the inline tab-strip block at
// chat-shell.tsx:306-322 (chat-shell.tsx is outside my write
// territory; t1 sub-session owns the wiring per dispatch
// coordination note).
//
// Component contract asserted (matches chat-shell.tsx inline
// implementation VERBATIM for drop-in compatibility):
//   - <div data-testid="chat-shell-tab-strip" role="tablist">
//   - N <button data-testid={`chat-shell-tab-${id}`} role="tab"
//       aria-selected="true|false" onClick> per `tabs` prop
//   - <div data-testid="chat-shell-tab-content" role="tabpanel">
//       rendering activeTab.render() output
//
// Visual polish layer asserted (the T7-narrowing scope per
// MB-F-T7-CHATSHELL-POLISH-REMAINING-DOGFOOD-DRIVEN Tier 3
// FOLLOWUPS.md:357 — non-subjective structural-style additions only):
//   - tab-strip has CSS display:flex (NOT default browser block;
//     wireframe target shows horizontal tab row per dispatch §1
//     "Tab switcher: Chat (dark/active) / Commits / BUILD.md")
//   - tab-strip has border-bottom (visual divider beneath tabs
//     vs adjacent content; standard tablist affordance — NOT
//     subjective hex refinement, but the structural presence of
//     a divider per ARIA/tab-pattern convention)
//   - active tab button has fontWeight ≠ inactive tab button's
//     (the "Chat (dark/active)" wireframe semantic — assert
//     differential typography, not the specific weights chosen)
//
// Anti-fabrication discipline `[KNOWN]`:
//   - probe asserts STRUCTURAL contract (display:flex, border-bottom,
//     fontWeight-differential) NOT specific hex values OR specific
//     px widths. Subjective refinement (operator visual-diff input
//     absent at probe authoring time) deferred per Tier 3 row.
//   - probe queries via testids + computed styles — no implementation-
//     coupling beyond the contract.
//
// RED state at HEAD `d009e6f` (my last commit landing):
//   - `packages/dispatch-workstation/src/chat-shell/tab-switcher.tsx`
//     does NOT exist (per `ls packages/dispatch-workstation/src/
//     chat-shell/` — 15 files; no tab-switcher.tsx).
//   - Import resolution fails; ALL conditions fail RED.

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TabSwitcher } from '../../../src/chat-shell/tab-switcher.js';

interface FixtureTab {
  readonly id: string;
  readonly label: string;
  readonly render: () => JSX.Element;
}

const FIXTURE_TABS: readonly FixtureTab[] = [
  { id: 'chat', label: 'Chat', render: () => <div data-testid="fixture-chat-body">CHAT_BODY</div> },
  { id: 'commits', label: 'Commits', render: () => <div data-testid="fixture-commits-body">COMMITS_BODY</div> },
  { id: 'buildmd', label: 'BUILD.md', render: () => <div data-testid="fixture-buildmd-body">BUILDMD_BODY</div> },
];

describe('MB-F-CHATSHELL-POLISH-REMAINING WB1 — TabSwitcher contract', () => {
  describe('Condition (1): chat-shell-tab-strip with role=tablist + N tab buttons', () => {
    it('renders tablist + 3 tab buttons with chat-shell-tab-{id} testids', () => {
      const onTabClick = vi.fn();
      const { queryByTestId } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="chat" onTabClick={onTabClick} />,
      );
      const strip = queryByTestId('chat-shell-tab-strip');
      expect(strip, 'chat-shell-tab-strip element must exist').not.toBeNull();
      expect(
        strip!.getAttribute('role'),
        'chat-shell-tab-strip must have role="tablist"',
      ).toBe('tablist');
      for (const tab of FIXTURE_TABS) {
        const btn = queryByTestId(`chat-shell-tab-${tab.id}`);
        expect(btn, `tab button for "${tab.id}" must exist`).not.toBeNull();
        expect(
          btn!.getAttribute('role'),
          `tab button "${tab.id}" must have role="tab"`,
        ).toBe('tab');
      }
    });
  });

  describe('Condition (2): aria-selected="true" on active tab; "false" on others', () => {
    it('aria-selected reflects activeId prop', () => {
      const { queryByTestId } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="commits" onTabClick={vi.fn()} />,
      );
      expect(
        queryByTestId('chat-shell-tab-chat')!.getAttribute('aria-selected'),
        'chat (inactive) must have aria-selected="false"',
      ).toBe('false');
      expect(
        queryByTestId('chat-shell-tab-commits')!.getAttribute('aria-selected'),
        'commits (active) must have aria-selected="true"',
      ).toBe('true');
      expect(
        queryByTestId('chat-shell-tab-buildmd')!.getAttribute('aria-selected'),
        'buildmd (inactive) must have aria-selected="false"',
      ).toBe('false');
    });
  });

  describe('Condition (3): onTabClick handler fires with tab.id on click', () => {
    it('clicking each tab fires the handler with the matching id', () => {
      const onTabClick = vi.fn();
      const { queryByTestId } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="chat" onTabClick={onTabClick} />,
      );
      fireEvent.click(queryByTestId('chat-shell-tab-commits')!);
      expect(onTabClick).toHaveBeenCalledWith('commits');
      fireEvent.click(queryByTestId('chat-shell-tab-buildmd')!);
      expect(onTabClick).toHaveBeenCalledWith('buildmd');
    });
  });

  describe('Condition (4): chat-shell-tab-content renders active tab body via render() callback', () => {
    it('shows the active tab body and hides inactive bodies', () => {
      const { queryByTestId, rerender } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="chat" onTabClick={vi.fn()} />,
      );
      const content = queryByTestId('chat-shell-tab-content');
      expect(content, 'chat-shell-tab-content must exist').not.toBeNull();
      expect(
        content!.getAttribute('role'),
        'chat-shell-tab-content must have role="tabpanel"',
      ).toBe('tabpanel');
      expect(
        queryByTestId('fixture-chat-body'),
        'chat body must render when chat is active',
      ).not.toBeNull();
      expect(
        queryByTestId('fixture-commits-body'),
        'commits body must NOT render when chat is active',
      ).toBeNull();
      // Switch to commits via rerender
      rerender(<TabSwitcher tabs={FIXTURE_TABS} activeId="commits" onTabClick={vi.fn()} />);
      expect(
        queryByTestId('fixture-commits-body'),
        'commits body must render after rerender to active=commits',
      ).not.toBeNull();
      expect(
        queryByTestId('fixture-chat-body'),
        'chat body must NOT render when commits is active',
      ).toBeNull();
    });
  });

  describe('Condition (5): structural styling — display:flex on tab-strip + border-bottom + differential fontWeight', () => {
    it('tab-strip has display:flex (horizontal layout per wireframe §1 row of tabs)', () => {
      const { queryByTestId } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="chat" onTabClick={vi.fn()} />,
      );
      const strip = queryByTestId('chat-shell-tab-strip');
      expect(strip).not.toBeNull();
      // Inline style must include display: flex (the structural-style
      // contract; not asserting specific gap/padding hexes which are
      // operator-visual-diff subjective).
      const display = (strip as HTMLElement).style.display;
      expect(display, 'tab-strip must have display:flex (NOT default block)').toBe('flex');
    });

    it('tab-strip has a border-bottom (visual divider beneath tabs)', () => {
      const { queryByTestId } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="chat" onTabClick={vi.fn()} />,
      );
      const strip = queryByTestId('chat-shell-tab-strip');
      // borderBottom inline-style is the structural assertion.
      const borderBottom = (strip as HTMLElement).style.borderBottom;
      expect(
        borderBottom,
        'tab-strip must have an inline border-bottom (structural divider)',
      ).not.toBe('');
    });

    it('active tab fontWeight differs from inactive tab fontWeight', () => {
      const { queryByTestId } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="chat" onTabClick={vi.fn()} />,
      );
      const activeWeight = (queryByTestId('chat-shell-tab-chat') as HTMLElement).style.fontWeight;
      const inactiveWeight = (queryByTestId('chat-shell-tab-commits') as HTMLElement).style.fontWeight;
      expect(activeWeight, 'active tab must have an explicit fontWeight').not.toBe('');
      expect(inactiveWeight, 'inactive tab must have an explicit fontWeight').not.toBe('');
      expect(
        activeWeight,
        'active vs inactive tabs must have differential fontWeight (wireframe semantic "Chat (dark/active)" — assert differential, not specific weights)',
      ).not.toBe(inactiveWeight);
    });
  });
});
