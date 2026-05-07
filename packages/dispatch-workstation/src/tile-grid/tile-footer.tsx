// MB-T18 WB2 — TileFooter real chrome implementation.
//
// Renders compact session-meta footer chrome inside the per-tile
// `<div data-slot="footer">` wrapper:
//   - cwd line: full path with CSS text-overflow:ellipsis + title=
//     tooltip (Q-MBT18-7=d). Omitted when cwd prop is absent.
//   - uptime line: time-since-mount, auto-switching units (Q-MBT18-8=a).
//     Renderer-side mount-time snapshot per Q-MBT18-3=a; 5s tick per
//     Q-MBT18-9=b.
//
// Per Q-MBT18-1=e operator-confirmed: cwd + uptime compound.
// Per Q-MBT18-6=a: NO bridge — pure renderer-side data. cwd arrives
// via TileGridSessionEntry.cwd (WB3 plumb-through from extended
// SpawnSessionResult); mountedAt is renderer-internal (lazy-init via
// useState; test-injection seam via optional prop).
// Per Q-MBT18-4=a: rendered by TileGridApp via `renderFooterSlot`
// render-prop closure (WB3 integration). Stays inside the slot
// wrapper that preserves `data-slot="footer"` + `data-testid="tile-
// footer-slot-{name}"` (MB-T12 WB5 contract).

import { useEffect, useState } from 'react';

const UPTIME_TICK_MS = 5000;

/**
 * Convert an elapsed-time delta in milliseconds into a compact chrome-
 * formatted string with auto-switching units per Q-MBT18-8=a:
 *   < 60s   → "Ns"
 *   < 60m   → "Nm"
 *   < 24h   → "Nh"
 *   else    → "Nd"
 *
 * Negative or NaN inputs are clamped to 0s for defensive rendering
 * (tests inject various edge values; production should never see
 * negative since mountedAt is always ≤ Date.now()).
 */
export function formatUptime(elapsedMs: number): string {
  const safeMs = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  const seconds = Math.floor(safeMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export interface TileFooterProps {
  readonly sessionName: string;
  /** Full session working-directory path (from extended
   *  SpawnSessionResult plumbed through TileGridSessionEntry at WB3).
   *  Renders truncated via CSS with title= tooltip showing the full
   *  string. Absent → cwd line is omitted entirely (TileFooter still
   *  renders the uptime line). */
  readonly cwd?: string;
  /** Test-injection seam for the mount-time baseline. Production omits
   *  this prop and the lazy-init useState snapshots Date.now() at
   *  first render. Tests inject a fixed value for deterministic uptime
   *  assertions (avoids flakiness around first-render timing). */
  readonly mountedAt?: number;
}

export function TileFooter({
  sessionName,
  cwd,
  mountedAt,
}: TileFooterProps): JSX.Element {
  // Lazy-init: mountedAt prop wins (test seam); otherwise Date.now()
  // at first render. The snapshot is captured once + held stable
  // across re-renders (semantics: "time since this tile was last
  // mounted in this window" per Q-MBT18-3=a / R-MBT18-5).
  const [mountTimestamp] = useState<number>(() => mountedAt ?? Date.now());
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, UPTIME_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const uptime = formatUptime(now - mountTimestamp);

  return (
    <div
      data-testid="tile-footer-content"
      data-mb-t18-content="true"
      data-session-name={sessionName}
    >
      {cwd !== undefined && cwd.length > 0 ? (
        <span
          data-testid="tile-footer-cwd"
          title={cwd}
          style={{
            display: 'inline-block',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {cwd}
        </span>
      ) : null}
      <span data-testid="tile-footer-uptime">{uptime}</span>
    </div>
  );
}
