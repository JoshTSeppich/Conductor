// MB-T15 WB1 — TileHeader skeleton.
//
// Read-only header chrome for the tile (MB-T15 ticket). WB1 ships a
// skeleton component that renders a placeholder div; WB3 fills in the
// real chrome (status dot, session name truncated, branch, repo, model
// chip, token meter bar) using color-helpers.ts.
//
// Composition (per Q-MBT15-3=a operator-confirmed): TileHeader is
// rendered as a CHILD of the existing tile-header div in tile.tsx,
// ABOVE the existing kill/collapse/detach buttons + picker/autopilot
// slots. Existing testids (tile-header, tile-status-indicator,
// tile-session-name) are preserved so probe-01..04 (54 tests) don't
// regress at WB4 integration.
//
// At WB1 this component is intentionally thin — it ships the prop
// signature + a minimal placeholder render so tile.tsx can slot it in
// at WB4 without churn. The actual visual chrome lands at WB3.

import type { TileStatus } from './types.js';

export interface TileHeaderProps {
  readonly sessionName: string;
  readonly status: TileStatus;
  /** Branch name; defaults to 'main' per Q-MBT15-2 stub for v3.0. */
  readonly branchName?: string;
  /** Repo name; default basename(cwd) at the parent. */
  readonly repoName?: string;
  /** SDK model name (e.g., 'claude-sonnet-4-6'); modelChipShortcode
   *  maps to the chip. Default per Q-MBT15-2 stub. */
  readonly model?: string;
  /** Tokens consumed in the current session window. v3.0 ships stubbed
   *  per Q-MBT15-2; real data lands with autopilot integration. */
  readonly tokensUsed?: number;
  /** Token budget (model context window). v3.0 ships stubbed per
   *  Q-MBT15-2. */
  readonly tokenBudget?: number;
}

export function TileHeader(_props: TileHeaderProps): JSX.Element {
  // WB1 placeholder render — WB3 replaces with real chrome.
  return (
    <div data-testid="tile-header-content" data-mb-t15-stub="true" />
  );
}
