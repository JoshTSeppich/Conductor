// MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE WB3 — Header chrome surface.
//
// Per arbitration Q-MVP-W1-3=(a) (operator ack 17:55 MDT):
//   - uptime: LIVE from spawnedAtMs (mirrors tile-grid/tile-header.tsx:77-91
//     formatUptimeLabel: <m>m below 1h; <h>h<m>m above; em-dash below 1m floor)
//   - pid / cpu / budget: PLACEHOLDER em-dash pending Tier-2 followup
//     MB-F-MVP-W1-HEADER-PID-CPU-BUDGET-WIRING (filed at WB-final).
//
// Stable testid anchors keep the contract surface stable while the followup
// swaps placeholder rendering for real IPC-sourced metrics.

import * as React from 'react';

const EM_DASH = '—';

export interface FocusPaneHeaderProps {
  /**
   * Wall-clock millis at which the __orchestrator_active session was
   * spawned. Drives the live uptime label. Optional — until WB4 wires the
   * orchestrator-process lifecycle observer, this is undefined and the
   * uptime renders em-dash.
   */
  spawnedAtMs?: number;
  /**
   * Current wall-clock millis. Optional injection for tests; production
   * passes Date.now() at render time (caller's job).
   */
  nowMs?: number;
}

function formatUptimeLabel(spawnedAtMs: number | undefined, nowMs: number): string | null {
  if (typeof spawnedAtMs !== 'number' || !Number.isFinite(spawnedAtMs)) return null;
  const elapsedMs = nowMs - spawnedAtMs;
  if (elapsedMs < 60_000) return null;
  const totalMinutes = Math.floor(elapsedMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h${minutes}m`;
}

export function FocusPaneHeader({
  spawnedAtMs,
  nowMs,
}: FocusPaneHeaderProps): React.ReactElement {
  const resolvedNow = typeof nowMs === 'number' ? nowMs : Date.now();
  const uptimeLabel = formatUptimeLabel(spawnedAtMs, resolvedNow);
  return (
    <div data-testid="orchestrator-focus-pane-header-bar">
      <span data-testid="orchestrator-focus-pane-header-pid">{EM_DASH}</span>
      <span data-testid="orchestrator-focus-pane-header-uptime">{uptimeLabel ?? EM_DASH}</span>
      <span data-testid="orchestrator-focus-pane-header-cpu">{EM_DASH}</span>
      <span data-testid="orchestrator-focus-pane-header-budget">{EM_DASH}</span>
    </div>
  );
}
