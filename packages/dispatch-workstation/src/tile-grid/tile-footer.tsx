// MB-T18 WB1 — TileFooter skeleton.
//
// React footer component for the per-tile chrome footer (MB-T18 ticket).
// WB1 ships a skeleton component that renders a placeholder div; WB2
// fills in the real chrome (cwd line + uptime line per Q-MBT18-1=e,
// renderer-side mount-time snapshot for uptime per Q-MBT18-3=a, 5s
// setInterval tick per Q-MBT18-9=b, auto-switching unit format per
// Q-MBT18-8=a, CSS text-overflow:ellipsis + title= tooltip for cwd per
// Q-MBT18-7=d).
//
// Per Q-MBT18-4=a operator-confirmed slot-population mechanism:
// TileFooter is rendered by TileGridApp via a `renderFooterSlot`
// render-prop closure passed down through Tile. It lives inside the
// `<div data-slot="footer">` wrapper that survives in tile.tsx
// (currently a self-closing placeholder; WB3 converts it to a
// render-prop wrapper preserving the testid + data-slot attribute).
//
// Per Q-MBT18-5=a: separate file (mirrors tile-header.tsx,
// tile-approval-picker.tsx, tile-autopilot-toggle.tsx).
// Per Q-MBT18-6=a: NO bridge — footer is purely renderer-side data.
// `cwd` arrives via TileGridSessionEntry (WB2 plumbs through
// SpawnSessionResult extension); `uptime` is computed renderer-side
// from a useEffect mount-time snapshot. NO IPC, NO preload extension,
// NO main.ts wiring. Significant deviation from MB-T16 / MB-T17.

/** WB2 fills these in:
 *  - `cwd?: string` — full session working directory (from extended
 *    SpawnSessionResult; absent until WB2 lands the spawn-handler.ts
 *    field add).
 *  - `mountedAt?: number` — Date.now() snapshot at first mount, used
 *    as the uptime baseline (Q-MBT18-3=a). Optional so test fixtures
 *    can inject a deterministic value; production uses an internal
 *    useEffect snapshot.
 */
export interface TileFooterProps {
  readonly sessionName: string;
  /** WB2: full cwd path; renders truncated via CSS with title= tooltip
   *  for the full string. Absent → footer omits the cwd line. */
  readonly cwd?: string;
  /** WB2: optional mount-time injection seam for tests. Production
   *  default snapshots Date.now() inside a useEffect. */
  readonly mountedAt?: number;
}

export function TileFooter(_props: TileFooterProps): JSX.Element {
  // WB1 placeholder render — WB2 replaces with real cwd line +
  // uptime line. The data-mb-t18-stub attribute is the WB1 RED-state
  // guard asserted by probe-00; WB2 removes it.
  return (
    <div data-testid="tile-footer-content" data-mb-t18-stub="true" />
  );
}
