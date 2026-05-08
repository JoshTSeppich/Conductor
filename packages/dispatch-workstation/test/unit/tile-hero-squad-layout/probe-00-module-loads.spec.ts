// MB-T19 WB1 probe-00 — tile-hero-squad-layout module loads + exports stub fn.
//
// WB1 RED state: implementation throws 'MB-T19 WB1 stub: ... lands at WB2'.
// This probe verifies the module imports correctly + the export is
// present, without invoking the throw path beyond the explicit
// "stub throws" guard. WB2 REPLACES this probe-00 with probe-01
// spec-table tests covering N=1..9 hero placements.

import { describe, it, expect } from 'vitest';
import { computeHeroSquadLayout } from '../../../src/tile-grid/tile-hero-squad-layout.js';

describe('MB-T19 WB1 — tile-hero-squad-layout module loads', () => {
  it('exports computeHeroSquadLayout as a function', () => {
    expect(typeof computeHeroSquadLayout).toBe('function');
  });

  it('WB1 stub throws with WB2 deferral message (RED state guard)', () => {
    expect(() => computeHeroSquadLayout(2, 0)).toThrow(/WB2/);
  });

  it('WB1 stub throws regardless of input shape (RED state guard)', () => {
    expect(() => computeHeroSquadLayout(1, 0)).toThrow(/WB2/);
    expect(() => computeHeroSquadLayout(5, 3)).toThrow(/WB2/);
    expect(() => computeHeroSquadLayout(8, 7)).toThrow(/WB2/);
  });
});
