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
  /**
   * Build.md filename (operator vision §Component 1 "build.md filename").
   * Production sources this from the workstation:read-build-md IPC
   * BuildMdLoadSuccess.path (last path component); empty string treated as
   * "no data" and renders em-dash. Per Q-MVP-W1-4=(a) ack.
   */
  buildMdFilename?: string;
  /**
   * Build.md total task count (operator vision "total"). Sourced from
   * BuildMdStatus.taskCount (src/build-md/types.ts:26-35). 0 is a meaningful
   * "all-tasks-completed" value rendered verbatim; undefined renders em-dash.
   */
  buildMdTotal?: number;
  /**
   * Build.md queued task count (operator vision "queued"). Mapped from
   * BuildMdStatus.readyCount per Q-MVP-W1-4=(a) ack mapping. 0 renders
   * verbatim; undefined renders em-dash.
   */
  buildMdQueued?: number;
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

function renderNumericOrDash(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return EM_DASH;
  return String(value);
}

function renderFilenameOrDash(value: string | undefined): string {
  if (typeof value !== 'string' || value.length === 0) return EM_DASH;
  return value;
}

export function FocusPaneHeader({
  spawnedAtMs,
  nowMs,
  buildMdFilename,
  buildMdTotal,
  buildMdQueued,
}: FocusPaneHeaderProps): React.ReactElement {
  const resolvedNow = typeof nowMs === 'number' ? nowMs : Date.now();
  const uptimeLabel = formatUptimeLabel(spawnedAtMs, resolvedNow);
  return (
    <div data-testid="orchestrator-focus-pane-header">
      <span data-testid="orchestrator-focus-pane-header-pid">{EM_DASH}</span>
      <span data-testid="orchestrator-focus-pane-header-uptime">{uptimeLabel ?? EM_DASH}</span>
      <span data-testid="orchestrator-focus-pane-header-cpu">{EM_DASH}</span>
      <span data-testid="orchestrator-focus-pane-header-budget">{EM_DASH}</span>
      <span data-testid="orchestrator-focus-pane-header-filename">
        {renderFilenameOrDash(buildMdFilename)}
      </span>
      <span data-testid="orchestrator-focus-pane-header-total">
        {renderNumericOrDash(buildMdTotal)}
      </span>
      <span data-testid="orchestrator-focus-pane-header-queued">
        {renderNumericOrDash(buildMdQueued)}
      </span>
      <span data-testid="orchestrator-focus-pane-header-running">{EM_DASH}</span>
      <span data-testid="orchestrator-focus-pane-header-done">{EM_DASH}</span>
    </div>
  );
}
