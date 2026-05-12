// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB10 (green) — uptime format
// helper per Sub-Q-T1-D=(i) operator-acked binding "renderer infer
// spawnedAt/uptime" (2026-05-12, ec60622) interpreted as renderer-
// internal mount-time per MB-T18 TileFooter Q-MBT18-3=a pattern.
//
// Renders a millisecond delta as the wireframe HH:MM uptime label.
// Hours are 1-or-more digits (no upper bound; long-running sessions
// render '142:07' style); minutes always 2 digits.
//
// Negative / non-finite / NaN inputs fall back to '00:00' (honest
// "no data yet" surface; matches MB-T18 TileFooter pre-mount-time
// behavior).
//
// Mount-time semantics caveat (filed at WB-final docs as Tier 3
// followup MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE): uptime here is
// `now - renderer-mount-time`, NOT `now - session-spawn-time`. Resets
// on Frame A↔C toggle and workstation re-launch. Operator-acked
// trade-off per Sub-Q-D=(i) ship-velocity vs (iii) workstation-spawn-
// timestamp full closure.

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

/**
 * Format a millisecond delta as 'HH:MM' uptime label.
 *
 * Returns '00:00' for non-positive or non-finite inputs.
 */
export function formatUptime(deltaMs: number): string {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return '00:00';
  const hours = Math.floor(deltaMs / MS_PER_HOUR);
  const minutes = Math.floor((deltaMs % MS_PER_HOUR) / MS_PER_MINUTE);
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}
