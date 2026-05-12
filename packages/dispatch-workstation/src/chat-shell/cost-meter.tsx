// MB-T26 WB3 — CostMeter slot component (green-integration).
//
// Operator-confirmed Q-MBT26-1=a (header-bar slot model) + Q-MBT26-5=d
// (push-based via onCostUpdate bridge method) 2026-05-07.
//
// Subscribes to coarchitectBridge.onCostUpdate at mount: the bridge
// implementation (preload.mts MB-T26 zone) immediately invokes
// 'coarchitect:getDailyCost' to fetch the initial value and subscribes
// to 'coarchitect:cost-update' webContents.send broadcasts emitted by
// coarchitect-ipc.ts captureUsageToLedger after each Conductor API call.
//
// Display:
//   - while no cost data observed: '—' (em-dash placeholder)
//   - when cost observed: '$X.XXXX' (4 decimal places — granularity for
//     Conductor's typical per-call sub-cent costs at Sonnet 4.6 rates)
//
// data-testid contract (probe-01-cost-meter-render):
//   - chat-shell-cost-meter-slot — wrapper element
//   - chat-shell-cost-meter-value — value span (text content asserts)

import { useEffect, useState } from 'react';

export interface CostMeterBridge {
  /**
   * Subscribe to cost updates. Implementation immediately fetches today's
   * running total then subscribes to live updates. Returns cleanup-fn.
   */
  readonly onCostUpdate: (cb: (totalUsd: number) => void) => () => void;
}

export interface CostMeterProps {
  /** Optional bridge — null/undefined → static '—' placeholder. */
  readonly bridge?: CostMeterBridge | null;
}

function formatCost(totalUsd: number | null): string {
  if (totalUsd === null) return '—';
  return `$${totalUsd.toFixed(4)}`;
}

const SLOT_STYLE: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.85em',
  padding: '2px 6px',
  display: 'inline-block',
};

// MB-T-WIREFRAME-T7-VISUAL-POLISH WB10 GREEN — wireframe-target format
// "conductor api · $0.42 today" wraps the value with muted prefix +
// suffix spans. Prefix/suffix color tints below the slot's default
// emphasize the value as the primary content.
const PREFIX_STYLE: React.CSSProperties = {
  color: '#888888',
  marginRight: '4px',
};

const SUFFIX_STYLE: React.CSSProperties = {
  color: '#888888',
  marginLeft: '4px',
};

export function CostMeter({ bridge }: CostMeterProps = {}): JSX.Element {
  const [totalUsd, setTotalUsd] = useState<number | null>(null);

  useEffect(() => {
    if (!bridge) return undefined;
    const cleanup = bridge.onCostUpdate((total) => {
      setTotalUsd(total);
    });
    return cleanup;
  }, [bridge]);

  return (
    <div
      data-testid="chat-shell-cost-meter-slot"
      style={SLOT_STYLE}
      title="Conductor API cost today (USD) — resets at local midnight"
    >
      <span
        data-testid="chat-shell-cost-meter-prefix"
        style={PREFIX_STYLE}
      >
        conductor api ·
      </span>
      <span data-testid="chat-shell-cost-meter-value">
        {formatCost(totalUsd)}
      </span>
      <span
        data-testid="chat-shell-cost-meter-suffix"
        style={SUFFIX_STYLE}
      >
        today
      </span>
    </div>
  );
}
