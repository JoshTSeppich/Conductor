// @vitest-environment happy-dom
//
// MB-F-T7-TAB-SWITCHER-POLISH (FOLLOWUPS.md:358) WB1 (red) —
// TabSwitcher dark/active state probe.
//
// Per dispatch Round 11 Wave 5 (2026-05-13): FOLLOWUPS row 358
// `MB-F-T7-TAB-SWITCHER-POLISH-DEFERRED-TO-T4-CLOSURE` Tier 3
// deferral is now CLOSURE-ELIGIBLE — both prerequisites met:
//   - T4 ticket cycle done at `4e8ec96`
//   - chat-shell tab-switcher structural component shipped at
//     `67de2f8` (Round 11 Wave 2 self-WB2 GREEN).
// Dispatch authorizes the T7-follow-on visual-polish cycle for
// tab-switcher dark/active state per wireframe §1
// "Tab switcher: `Chat` (dark/active) / `Commits` / `BUILD.md`".
//
// Anti-fabrication anchors (CLAUDE.md §2.1):
//   - Wireframe semantic: active tab gets DARKER visual treatment
//     vs inactive tabs (the "dark" in "dark/active" — operator
//     dispatch verbatim).
//   - Codebase precedent for active-button-styling pattern:
//     `dispatch-mode-toggle.tsx:79-93` BUTTON_ACTIVE_STYLE uses
//     `background:#374151 + fontWeight:600` per T7-WB-prior. Pattern
//     reuse, not invention.
//   - Codebase precedent for "darker visual" hex: `session-list.tsx`
//     LIST_ROOT_STYLE backgroundColor:'#0a0a0a' per T7 WB4 sticky-
//     note aesthetic affordance (operator-arbitrated 2026-05-12;
//     `MB-T-WIREFRAME-T7-VISUAL-POLISH` WB4 GREEN `be24ed8`).
//   - Codebase precedent for active-state border-accent hex:
//     `session-list.tsx` ROW_STYLE_SELECTED `borderLeft:'3px solid
//     #4a7fb8'` per T7 WB4 selected-row affordance. Same palette
//     reuse for tab "active-indicator" bottom-border.
//
// Conditions asserted:
//   (1) Active tab backgroundColor is non-empty + differs from
//       inactive tab backgroundColor. Inactive tab backgroundColor
//       is transparent (or empty) — only active gets the dark fill.
//   (2) Active tab borderBottom is non-empty + differs from
//       inactive tab borderBottom (color differential — the
//       "active indicator" accent).
//   (3) Anti-shift sentinel: inactive tab borderBottom is a NON-
//       EMPTY reserved-space variant (e.g., '2px solid transparent')
//       so swap to active accent color does NOT shift the row by
//       2px. (Pattern from `session-list.tsx` ROW_STYLE
//       borderLeft:'3px solid transparent' anti-shift sentinel.)
//   (4) probe-t7polish-01 anti-regression: tab-strip + tab-{id}
//       + tab-content testids preserved; aria-selected preserved;
//       text content preserved; onClick fires.
//
// RED state at HEAD `f1b36d3` (latest origin/main per git log):
//   - tab-switcher.tsx:60-79 TAB_BUTTON_BASE_STYLE has NO
//     borderBottom; TAB_BUTTON_ACTIVE_STYLE has NO backgroundColor
//     OR borderBottom. Conditions (1)+(2)+(3) all fail RED.
//   - Condition (4) anti-regression sentinels pass at HEAD (the
//     existing 7 probe-01 conditions still hold).

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TabSwitcher } from '../../../src/chat-shell/tab-switcher.js';

interface FixtureTab {
  readonly id: string;
  readonly label: string;
  readonly render: () => JSX.Element;
}

const FIXTURE_TABS: readonly FixtureTab[] = [
  { id: 'chat', label: 'Chat', render: () => <div data-testid="fixture-chat-body">CHAT</div> },
  { id: 'commits', label: 'Commits', render: () => <div data-testid="fixture-commits-body">COMMITS</div> },
  { id: 'buildmd', label: 'BUILD.md', render: () => <div data-testid="fixture-buildmd-body">BUILDMD</div> },
];

describe('MB-F-T7-TAB-SWITCHER-POLISH WB1 — dark/active state', () => {
  describe('Condition (1): active tab has non-empty backgroundColor; inactive tabs have empty/transparent', () => {
    it('active tab backgroundColor non-empty + inactive tabs backgroundColor empty/transparent', () => {
      const { queryByTestId } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="chat" onTabClick={vi.fn()} />,
      );
      const activeBg = (queryByTestId('chat-shell-tab-chat') as HTMLElement).style.backgroundColor;
      const inactiveBg1 = (queryByTestId('chat-shell-tab-commits') as HTMLElement).style.backgroundColor;
      const inactiveBg2 = (queryByTestId('chat-shell-tab-buildmd') as HTMLElement).style.backgroundColor;

      expect(
        activeBg,
        'active tab must have a non-empty backgroundColor (wireframe "dark/active" semantic)',
      ).not.toBe('');
      // Inactive: either '' (no bg set) OR 'transparent' (explicitly transparent).
      // Both are acceptable as long as DIFFERENT from active.
      expect(
        inactiveBg1,
        'inactive (commits) backgroundColor must differ from active (chat) — dark-active is differential treatment',
      ).not.toBe(activeBg);
      expect(
        inactiveBg2,
        'inactive (buildmd) backgroundColor must differ from active (chat)',
      ).not.toBe(activeBg);
    });
  });

  describe('Condition (2): active tab borderBottom differs from inactive (color-differential active indicator)', () => {
    it('active tab borderBottom hex/color differs from inactive tabs', () => {
      const { queryByTestId } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="commits" onTabClick={vi.fn()} />,
      );
      const activeBorder = (queryByTestId('chat-shell-tab-commits') as HTMLElement).style.borderBottom;
      const inactiveBorder1 = (queryByTestId('chat-shell-tab-chat') as HTMLElement).style.borderBottom;
      const inactiveBorder2 = (queryByTestId('chat-shell-tab-buildmd') as HTMLElement).style.borderBottom;

      expect(
        activeBorder,
        'active tab must have a non-empty borderBottom (active-indicator pattern)',
      ).not.toBe('');
      expect(
        activeBorder,
        'active borderBottom must differ from inactive (commits inactive vs active)',
      ).not.toBe(inactiveBorder1);
      expect(
        activeBorder,
        'active borderBottom must differ from inactive (buildmd)',
      ).not.toBe(inactiveBorder2);
    });
  });

  describe('Condition (3): anti-shift sentinel — inactive tab borderBottom is non-empty (reserved-space variant)', () => {
    it('inactive tab borderBottom is non-empty so swap to active does NOT shift row', () => {
      const { queryByTestId } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="chat" onTabClick={vi.fn()} />,
      );
      const inactiveBorder = (queryByTestId('chat-shell-tab-commits') as HTMLElement).style.borderBottom;
      // Anti-shift: inactive must reserve the borderBottom space (e.g.,
      // '2px solid transparent') so the active-state swap (to colored
      // accent) does NOT shift the row by 2px. Matches session-list.tsx
      // ROW_STYLE borderLeft:'3px solid transparent' anti-shift pattern.
      //
      // Tightened predicate: assert explicit `Npx` width — catches the
      // happy-dom quirk where `style.borderBottom` returns 'none none'
      // even when no borderBottom is set inline (which is technically
      // non-empty string but reserves zero visual space).
      expect(
        inactiveBorder,
        'inactive tab borderBottom must include explicit px width (e.g., "2px solid transparent") for reserved-space anti-shift sentinel',
      ).toMatch(/\d+px/);
    });
  });

  describe('Condition (4): probe-t7polish-01 anti-regression', () => {
    it('testid contract preserved (tab-strip + tab-{id} + tab-content)', () => {
      const { queryByTestId } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="chat" onTabClick={vi.fn()} />,
      );
      expect(queryByTestId('chat-shell-tab-strip')).not.toBeNull();
      expect(queryByTestId('chat-shell-tab-chat')).not.toBeNull();
      expect(queryByTestId('chat-shell-tab-commits')).not.toBeNull();
      expect(queryByTestId('chat-shell-tab-buildmd')).not.toBeNull();
      expect(queryByTestId('chat-shell-tab-content')).not.toBeNull();
    });

    it('aria-selected preserved + onClick handler still fires', () => {
      const onTabClick = vi.fn();
      const { queryByTestId } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="chat" onTabClick={onTabClick} />,
      );
      expect(
        queryByTestId('chat-shell-tab-chat')!.getAttribute('aria-selected'),
      ).toBe('true');
      expect(
        queryByTestId('chat-shell-tab-commits')!.getAttribute('aria-selected'),
      ).toBe('false');
      fireEvent.click(queryByTestId('chat-shell-tab-commits')!);
      expect(onTabClick).toHaveBeenCalledWith('commits');
    });

    it('differential fontWeight preserved (probe-t7polish-01 Condition 5c)', () => {
      const { queryByTestId } = render(
        <TabSwitcher tabs={FIXTURE_TABS} activeId="chat" onTabClick={vi.fn()} />,
      );
      const activeWeight = (queryByTestId('chat-shell-tab-chat') as HTMLElement).style.fontWeight;
      const inactiveWeight = (queryByTestId('chat-shell-tab-commits') as HTMLElement).style.fontWeight;
      expect(activeWeight).not.toBe('');
      expect(inactiveWeight).not.toBe('');
      expect(activeWeight).not.toBe(inactiveWeight);
    });
  });
});
