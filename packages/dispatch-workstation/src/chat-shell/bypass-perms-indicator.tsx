// MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB12 (green) —
// BypassPermsIndicator: warning indicator visible when dispatchMode=
// 'auto' per Sub-Q-T4-F=(i) operator-acked default 2026-05-12.
//
// Per ticket body f8fc24d §4 WB12 + Sub-Q-T4-F=(i):
//   - Pure prop-driven; receives `dispatchMode: 'auto' | 'ask'`.
//   - auto → renders red-triangle warning indicator with "bypass perms"
//     label (operator bypassed per-action review gate).
//   - ask → renders null (indicator absent).
//
// The caller (chat-shell mount.ts at production runtime) subscribes
// to `dispatchModeBridge.getDispatchMode()` + applies updates; this
// component is the pure-render leaf.

import type { CSSProperties } from 'react';

export interface BypassPermsIndicatorProps {
  readonly dispatchMode: 'auto' | 'ask';
}

const STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
  color: '#c54a4a',
  fontWeight: 600,
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

const ICON_STYLE: CSSProperties = {
  fontSize: '12px',
  lineHeight: 1,
};

export function BypassPermsIndicator(
  props: BypassPermsIndicatorProps,
): JSX.Element | null {
  if (props.dispatchMode !== 'auto') return null;
  return (
    <span
      data-testid="bypass-perms-indicator"
      style={STYLE}
      role="status"
      aria-label="Bypass perms enabled — operator-action review gate disabled"
    >
      <span style={ICON_STYLE} aria-hidden="true">
        ⚠
      </span>
      bypass perms
    </span>
  );
}
