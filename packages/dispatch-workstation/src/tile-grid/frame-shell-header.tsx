// §C.1′ WB4 — FrameShellHeader: tab strip (A/C) + MixIndicator + PlanRing-36px.
//
// Mounted into #header-indicators-root inside workstation-shell.html's
// #header-bar by tile-grid/mount.ts (extended at WB4). The tab strip
// persists shell-mode via onModeChange callback (wired to frame-mode IPC
// at WB5). MixIndicatorContainer and PlanRing consume optional bridges;
// render zero-state / placeholder when bridges are null.
//
// data-testid contract:
//   frame-shell-header-root     outer wrapper
//   frame-shell-tab-A           Frame A tab button (aria-pressed)
//   frame-shell-tab-C           Frame C tab button (aria-pressed)
//   frame-shell-plan-ring       PlanRing-36px wrapper
//   mix-indicator-root          from MixIndicatorContainer (delegated)

import { useState, type CSSProperties } from 'react';
import {
  MixIndicatorContainer,
  type ModelMixBridge,
} from '../chat-shell/mix-indicator.js';
import {
  PlanUsageRing,
  type PlanUsageRingBridge,
} from '../chat-shell/plan-usage-ring.js';
import type { FrameMode } from '../main/frame-mode-state.js';

export type { FrameMode };

export interface FrameShellHeaderProps {
  readonly initialMode: FrameMode;
  /** null → MixIndicator renders zero-state chips */
  readonly workstationBridge: ModelMixBridge | null;
  /** null → PlanRing renders placeholder */
  readonly coarchitectBridge: PlanUsageRingBridge | null;
  /** Called on every tab switch. WB5 wires to frame-mode IPC write. */
  readonly onModeChange?: (mode: FrameMode) => void;
}

const HEADER_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '8px',
  height: '100%',
};

const TAB_BASE: CSSProperties = {
  padding: '3px 10px',
  borderRadius: '4px',
  border: '1px solid #555',
  background: 'transparent',
  color: '#e0e0e0',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'monospace',
};

const TAB_ACTIVE: CSSProperties = {
  ...TAB_BASE,
  background: '#3a3a3a',
  border: '1px solid #888',
  color: '#fff',
  fontWeight: 700,
};

const RING_WRAPPER: CSSProperties = {
  marginLeft: 'auto',
  display: 'inline-flex',
  alignItems: 'center',
};

export function FrameShellHeader({
  initialMode,
  workstationBridge,
  coarchitectBridge,
  onModeChange,
}: FrameShellHeaderProps): JSX.Element {
  const [mode, setMode] = useState<FrameMode>(initialMode);

  function handleTabClick(next: FrameMode): void {
    setMode(next);
    if (onModeChange) onModeChange(next);
  }

  return (
    <div data-testid="frame-shell-header-root" style={HEADER_STYLE}>
      <button
        data-testid="frame-shell-tab-A"
        aria-pressed={mode === 'A'}
        style={mode === 'A' ? TAB_ACTIVE : TAB_BASE}
        onClick={() => handleTabClick('A')}
        type="button"
      >
        A
      </button>
      <button
        data-testid="frame-shell-tab-C"
        aria-pressed={mode === 'C'}
        style={mode === 'C' ? TAB_ACTIVE : TAB_BASE}
        onClick={() => handleTabClick('C')}
        type="button"
      >
        C
      </button>
      <MixIndicatorContainer bridge={workstationBridge} />
      <div data-testid="frame-shell-plan-ring" style={RING_WRAPPER}>
        <PlanUsageRing bridge={coarchitectBridge} />
      </div>
    </div>
  );
}
