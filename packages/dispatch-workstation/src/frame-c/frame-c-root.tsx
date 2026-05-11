// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB2 (green) — Frame C top-level
// two-column layout component.
//
// Per ticket body a1f7a03 §1.1 item 3-4 + §4 WB2 acceptance:
//   - Top-level component renders `data-testid="frame-c-root"`.
//   - Two-column layout: session-list (left) + detail-pane (right).
//   - WB2 ships placeholder slot divs only:
//       <div data-testid="frame-c-session-list-col" /> — WB4 SessionList
//         component lands here.
//       <div data-testid="frame-c-detail-col" /> — WB8 DetailPane
//         component lands here.
//   - Selection state (Sub-Q-MBTWBFCS-A = α renderer-only) lives in
//     this component via `useState`; wired at WB6 GREEN.
//
// Frame Router CSS hook (per §C.1′ ticket #1 at 44764fd):
//   - `#shell[data-frame-mode='C']` selector scopes Frame C visibility.
//   - Frame C root mounts inside an element whose visibility is gated
//     by that attribute (workstation-shell.html DOM region; WB10
//     adds the region per HALT-WB10-PRE-COMMIT operator review).

import type { CSSProperties } from 'react';

const ROOT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  height: '100%',
  width: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
};

const SESSION_LIST_COL_STYLE: CSSProperties = {
  // Wireframe-recommended primary mode (per audit §3 Dim 1) puts the
  // session list as a narrower left column. 280px is a placeholder
  // matching the existing splitter default (chat-region pattern);
  // refine when WB4 SessionList renders real rows + operator gives
  // visual feedback at WB11 smoke.
  width: '280px',
  flexShrink: 0,
  borderRight: '1px solid #303030',
  overflowY: 'auto',
  boxSizing: 'border-box',
};

const DETAIL_COL_STYLE: CSSProperties = {
  flex: '1 1 auto',
  overflowY: 'auto',
  boxSizing: 'border-box',
};

export interface FrameCRootProps {
  // initialSessions + selection-related props deferred to WB4/WB6 per
  // §C.1′ #2 ladder. WB2 ships placeholder shell; WB4 + WB8 wire content.
}

/**
 * Frame C top-level two-column shell. WB2 renders empty slot divs;
 * WB4 (SessionList) + WB8 (DetailPane) populate them.
 */
export function FrameCRoot(_props: FrameCRootProps): JSX.Element {
  return (
    <div data-testid="frame-c-root" style={ROOT_STYLE}>
      <div
        data-testid="frame-c-session-list-col"
        style={SESSION_LIST_COL_STYLE}
      >
        {/* WB4 SessionList renders here */}
      </div>
      <div data-testid="frame-c-detail-col" style={DETAIL_COL_STYLE}>
        {/* WB8 DetailPane renders here */}
      </div>
    </div>
  );
}
