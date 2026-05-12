// MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB8 (green) —
// BottomRailCostMeter: wireframe-formatted cost meter consuming the
// existing MB-T26 coarchitectBridge.onCostUpdate channel.
//
// Per ticket body f8fc24d §4 WB8 + Sub-Q-T4-C=(i) operator-acked
// default 2026-05-12 ("accept all defaults"):
//   - Reuses existing onCostUpdate channel; renders wireframe text
//     "conductor api · $X.XX today" (2 decimal places + prefix +
//     suffix per full-build-mode-dispatch.md §1 Bottom rail bullet 6).
//   - Original MB-T26 `cost-meter.tsx` component UNCHANGED (Q-MBT26
//     territory preserved).
//
// Aggregation backend gap [KNOWN]: coarchitect-ipc.ts:89
// `getDailyCost` handler is a stub returning 0; no captureUsageToLedger
// implementation. This component will render "$0.00 today" at runtime
// today. Filed as Tier 3 followup `MB-F-COST-METER-AGGREGATION-
// BACKEND-STUBBED` at WB14 docs.

import { useEffect, useState, type CSSProperties } from 'react';

export interface BottomRailCostMeterBridge {
  readonly onCostUpdate: (cb: (totalUsd: number) => void) => () => void;
}

export interface BottomRailCostMeterProps {
  readonly bridge?: BottomRailCostMeterBridge | null;
}

const SLOT_STYLE: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '11px',
  color: '#9ca3af',
  fontVariantNumeric: 'tabular-nums',
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

function formatCost(totalUsd: number | null): string {
  if (totalUsd === null) return '—';
  return `$${totalUsd.toFixed(2)}`;
}

export function BottomRailCostMeter(
  props: BottomRailCostMeterProps = {},
): JSX.Element {
  const { bridge } = props;
  const [totalUsd, setTotalUsd] = useState<number | null>(null);

  useEffect(() => {
    if (!bridge) return undefined;
    const cleanup = bridge.onCostUpdate((total) => {
      setTotalUsd(total);
    });
    return cleanup;
  }, [bridge]);

  return (
    <span
      data-testid="bottom-rail-cost-meter"
      style={SLOT_STYLE}
      title="Conductor API cost today (USD) — resets at local midnight"
    >
      conductor api · {formatCost(totalUsd)} today
    </span>
  );
}
