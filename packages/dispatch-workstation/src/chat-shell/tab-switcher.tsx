// MB-F-CHATSHELL-POLISH-REMAINING WB2 (green) — TabSwitcher component.
//
// Self-contained drop-in replacement for the inline tab-strip block at
// chat-shell.tsx:306-322 (Round 11 §3.9 Wave 2 SPECULATIVE; chat-shell.tsx
// is outside this session's write territory — t1 sub-session owns the
// wiring step per dispatch coordination note).
//
// Contract mirrors chat-shell.tsx:306-322 VERBATIM for drop-in:
//   - <div data-testid="chat-shell-tab-strip" role="tablist">
//     containing one <button data-testid="chat-shell-tab-{id}"
//     role="tab" aria-selected> per `tabs` prop.
//   - <div data-testid="chat-shell-tab-content" role="tabpanel">
//     rendering the active tab's render() callback output.
//
// Polish layer (structural + dark/active state):
//   - Tab-strip: display:flex (horizontal row per wireframe §1
//     "Tab switcher: Chat / Commits / BUILD.md") + borderBottom
//     divider (standard tablist affordance).
//   - Active tab: fontWeight 600 (differential vs inactive 400) +
//     backgroundColor:#0a0a0a (DARK fill — wireframe "Chat
//     (dark/active)" semantic; reuses session-list.tsx sticky-note
//     hex `be24ed8`) + borderBottom:'2px solid #4a7fb8' (active-
//     indicator accent; reuses session-list.tsx selected-row accent
//     hex `be24ed8`).
//   - Inactive tabs: borderBottom:'2px solid transparent' (anti-shift
//     sentinel — reserves the 2px space so swap to active accent
//     does NOT shift content vertically; mirrors session-list.tsx
//     ROW_STYLE borderLeft:'3px solid transparent' anti-shift
//     pattern).
//   - Tab buttons: padding + cursor:pointer + background:transparent
//     (button reset so wireframe-target rendering is uniform across
//     OS button-default styles).
//
// MB-F-T7-TAB-SWITCHER-POLISH (FOLLOWUPS.md:358) WB2 (green) closure
// per dispatch Round 11 Wave 5 (2026-05-13): T4 + tab-switcher both
// shipped (4e8ec96 + 67de2f8); deferral row prerequisites met.
//
// Wiring deferred to t1 (chat-shell.tsx territory):
//   chat-shell.tsx:306-322 block replaced with:
//     <TabSwitcher tabs={tabs} activeId={effectiveActiveId}
//       onTabClick={handleTabClick} />
//   No DOM-contract regression — tab-strip + tab-{id} + tab-content
//   testids + ARIA preserved verbatim.

import type { CSSProperties, ReactNode } from 'react';

export interface TabSwitcherTab {
  readonly id: string;
  readonly label: string;
  readonly render: () => ReactNode;
}

export interface TabSwitcherProps {
  readonly tabs: readonly TabSwitcherTab[];
  readonly activeId: string;
  readonly onTabClick: (id: string) => void;
}

const TAB_STRIP_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  borderBottom: '1px solid #2a2a2a',
  flexShrink: 0,
};

const TAB_BUTTON_BASE_STYLE: CSSProperties = {
  padding: '6px 12px',
  // backgroundColor (longhand) — avoids React shorthand/longhand mixing
  // warning when ACTIVE_STYLE overrides via backgroundColor: '#0a0a0a'.
  backgroundColor: 'transparent',
  border: 'none',
  // borderBottom reserved here as transparent so the active-state swap
  // to the accent color does NOT shift content vertically (anti-shift
  // sentinel; mirrors session-list.tsx ROW_STYLE borderLeft:'3px solid
  // transparent' pattern from T7 WB4).
  borderBottom: '2px solid transparent',
  color: '#cccccc',
  cursor: 'pointer',
  fontSize: '12px',
  fontFamily: 'inherit',
};

const TAB_BUTTON_ACTIVE_STYLE: CSSProperties = {
  ...TAB_BUTTON_BASE_STYLE,
  color: '#eaeaea',
  fontWeight: 600,
  // Dark/active semantic (wireframe §1) — darker bg than surrounding
  // chrome. Hex reuses session-list.tsx LIST_ROOT_STYLE backgroundColor
  // from T7 WB4 sticky-note affordance `be24ed8`.
  backgroundColor: '#0a0a0a',
  // Active-indicator accent — reuses session-list.tsx ROW_STYLE_SELECTED
  // borderLeft accent hex (#4a7fb8) from T7 WB4. Same 3-channel palette
  // for "selected" affordance across the chat-shell / session-list
  // surfaces.
  borderBottom: '2px solid #4a7fb8',
};

const TAB_BUTTON_INACTIVE_STYLE: CSSProperties = {
  ...TAB_BUTTON_BASE_STYLE,
  fontWeight: 400,
};

const TAB_CONTENT_STYLE: CSSProperties = {
  flex: '1 1 auto',
  overflow: 'auto',
};

export function TabSwitcher(props: TabSwitcherProps): JSX.Element {
  const { tabs, activeId, onTabClick } = props;
  const activeTab = tabs.find((t) => t.id === activeId);

  return (
    <>
      <div
        data-testid="chat-shell-tab-strip"
        role="tablist"
        style={TAB_STRIP_STYLE}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              data-testid={`chat-shell-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive ? 'true' : 'false'}
              type="button"
              onClick={() => onTabClick(tab.id)}
              style={isActive ? TAB_BUTTON_ACTIVE_STYLE : TAB_BUTTON_INACTIVE_STYLE}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        data-testid="chat-shell-tab-content"
        role="tabpanel"
        style={TAB_CONTENT_STYLE}
      >
        {activeTab ? activeTab.render() : null}
      </div>
    </>
  );
}
