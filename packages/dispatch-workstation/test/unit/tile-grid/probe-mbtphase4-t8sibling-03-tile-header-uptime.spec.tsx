// @vitest-environment happy-dom
//
// MB-T-PHASE-4-T8-SIBLING-EXEC WB5 RED — TileHeader uptime label render.
//
// Build-doc §4 WB5 (414ed80): TileHeader gains a `spawnedAtMs?: number`
// prop. When the prop is provided (and is in the past), the header
// renders an uptime label adjacent to the model chip. When absent OR in
// the future, the label is omitted.
//
// Conditions (per build-doc §4):
//   03a: prop absent → no uptime element in DOM
//   03b: prop set 5 minutes ago → label renders "5m" (or "5m0s" exact;
//        probe asserts the data-testid presence + text matches /^\d+m/).
//   03c: prop set 1 hour 5 minutes ago → label renders "1h5m"
//        (asserts /^\d+h\d+m$/).
//
// Per build-doc §3 Sub-Q-F: label format = `<m>m` for <1h; `<h>h<m>m`
// for >=1h; omit when prop absent / future / NaN.
//
// Sub-Q-D resolution (deferred): the prop wire is shipped, but Tile →
// TileHeader prop pass-through requires editing tile.tsx (out of t8-
// sibling-exec territory). This probe exercises TileHeader directly
// (render-and-assert), bypassing the prop chain. A followup at WB-final
// (`MB-F-T8-SIBLING-EXEC-TILE-HEADER-SPAWNEDATMS-PASS-THROUGH-DEFERRED`)
// tracks the end-to-end wire.
//
// RED state at HEAD `8d94ab0`:
//   - TileHeaderProps does not declare `spawnedAtMs?: number`. Passing
//     the prop at the test site is silently dropped by React/TS (test
//     uses cast for TS-cleanliness).
//   - No element with `data-testid="tile-header-uptime"` is rendered;
//     3 conditions fail at the existence / format assertions.

import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { TileHeader } from '../../../src/tile-grid/tile-header.js';

// Probe-extension prop shape — declared locally for TS-clean cast at
// both RED (prop absent on TileHeaderProps) and GREEN (prop declared).
type ExtraProps = {
  spawnedAtMs?: number;
  /** Test seam — caller can override Date.now() for label determinism. */
  nowMs?: number;
};

function renderHeader(extra: ExtraProps = {}): HTMLElement {
  const { container } = render(
    <TileHeader
      sessionName="session-uptime-test"
      status="open"
      branchName="main"
      model="claude-opus-4-7"
      {...(extra as Record<string, unknown>)}
    />,
  );
  return container;
}

describe('MB-T-PHASE-4-T8-SIBLING-EXEC WB5 — TileHeader uptime label', () => {
  it('03a: omits uptime element when spawnedAtMs prop is absent', () => {
    const container = renderHeader({});
    expect(
      container.querySelector('[data-testid="tile-header-uptime"]'),
    ).toBeNull();
    cleanup();
  });

  it('03b: renders "5m" when spawn was 5 minutes ago', () => {
    const NOW = 1_700_000_000_000;
    const FIVE_MIN_AGO = NOW - 5 * 60 * 1000;
    const container = renderHeader({
      spawnedAtMs: FIVE_MIN_AGO,
      nowMs: NOW,
    });
    const el = container.querySelector('[data-testid="tile-header-uptime"]');
    expect(el).not.toBeNull();
    // Label format per build-doc Sub-Q-F: `<m>m` for <1h.
    expect(el!.textContent).toMatch(/^5m$/);
    cleanup();
  });

  it('03c: renders "1h5m" when spawn was 1h 5m ago', () => {
    const NOW = 1_700_000_000_000;
    const ONE_H_FIVE_M_AGO = NOW - (60 + 5) * 60 * 1000;
    const container = renderHeader({
      spawnedAtMs: ONE_H_FIVE_M_AGO,
      nowMs: NOW,
    });
    const el = container.querySelector('[data-testid="tile-header-uptime"]');
    expect(el).not.toBeNull();
    // Label format per build-doc Sub-Q-F: `<h>h<m>m` for >=1h.
    expect(el!.textContent).toMatch(/^1h5m$/);
    cleanup();
  });
});
