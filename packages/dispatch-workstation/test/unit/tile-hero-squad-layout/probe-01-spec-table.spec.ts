// MB-T19 WB2 probe-01 — computeHeroSquadLayout spec-table.
//
// Replaces WB1's probe-00-module-loads.spec.ts (deleted at WB2; the
// stub-throw test fails after WB2 lands real impl). probe-01 covers
// all WB2 acceptance:
//   - Q-MBT19-1 canonical scope: hero on top + horizontal squad strip
//     below (N=1 degenerate, N=2 single squad, N≥3 multi-squad)
//   - Squad order preservation (source sessions[] order with hero
//     removed)
//   - heroIndex bounds (<0, >=n) throws; n<1 throws
//   - defaultRowSizes 75/25 split for N≥2; ["100%"] for N=1
//   - overflow=true when n > 8 (operator-stated "N≥9: scroll"
//     threshold)
//   - gridTemplateAreas: hero spans all cols in row 0; squad tiles
//     take one col each in row 1
//
// Pattern mirrors test/unit/autopilot-ipc/probe-01-spec-table.spec.ts
// (MB-T17 WB2): pure-fn assertions, no React, no mocks.

import { describe, it, expect } from 'vitest';
import {
  computeHeroSquadLayout,
  type HeroSquadLayout,
} from '../../../src/tile-grid/tile-hero-squad-layout.js';

// ─────────────────────────────────────────────────────────────────────────────
// N=1 — degenerate (hero only)
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB2 — computeHeroSquadLayout N=1 degenerate', () => {
  it('n=1, heroIndex=0: hero fullscreen, no squad strip', () => {
    const layout = computeHeroSquadLayout(1, 0);
    expect(layout.rows).toBe(1);
    expect(layout.cols).toBe(1);
    expect(layout.overflow).toBe(false);
    expect(layout.gridTemplateAreas).toEqual(['t0']);
    expect(layout.defaultRowSizes).toEqual(['100%']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N=2 — single squad
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB2 — computeHeroSquadLayout N=2', () => {
  it('n=2, heroIndex=0: hero=t0 row 0, squad=t1 row 1', () => {
    const layout = computeHeroSquadLayout(2, 0);
    expect(layout.rows).toBe(2);
    expect(layout.cols).toBe(1);
    expect(layout.overflow).toBe(false);
    expect(layout.gridTemplateAreas).toEqual(['t0', 't1']);
    expect(layout.defaultRowSizes).toEqual(['75%', '25%']);
  });

  it('n=2, heroIndex=1: hero=t1 row 0, squad=t0 row 1', () => {
    const layout = computeHeroSquadLayout(2, 1);
    expect(layout.gridTemplateAreas).toEqual(['t1', 't0']);
    expect(layout.defaultRowSizes).toEqual(['75%', '25%']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N=3 — 2 squad tiles
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB2 — computeHeroSquadLayout N=3', () => {
  it('n=3, heroIndex=0: hero spans 2 cols, squad=t1 t2', () => {
    const layout = computeHeroSquadLayout(3, 0);
    expect(layout.rows).toBe(2);
    expect(layout.cols).toBe(2);
    expect(layout.gridTemplateAreas).toEqual(['t0 t0', 't1 t2']);
  });

  it('n=3, heroIndex=1: hero spans 2 cols, squad order=t0 t2', () => {
    const layout = computeHeroSquadLayout(3, 1);
    expect(layout.gridTemplateAreas).toEqual(['t1 t1', 't0 t2']);
  });

  it('n=3, heroIndex=2: hero spans 2 cols, squad order=t0 t1', () => {
    const layout = computeHeroSquadLayout(3, 2);
    expect(layout.gridTemplateAreas).toEqual(['t2 t2', 't0 t1']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N=4 — 3 squad tiles
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB2 — computeHeroSquadLayout N=4', () => {
  it('n=4, heroIndex=0: hero spans 3 cols, squad=t1 t2 t3', () => {
    const layout = computeHeroSquadLayout(4, 0);
    expect(layout.cols).toBe(3);
    expect(layout.gridTemplateAreas).toEqual(['t0 t0 t0', 't1 t2 t3']);
  });

  it('n=4, heroIndex=2: squad order preserved, hero removed', () => {
    const layout = computeHeroSquadLayout(4, 2);
    expect(layout.gridTemplateAreas).toEqual(['t2 t2 t2', 't0 t1 t3']);
  });

  it('n=4, heroIndex=3: squad=t0 t1 t2', () => {
    const layout = computeHeroSquadLayout(4, 3);
    expect(layout.gridTemplateAreas).toEqual(['t3 t3 t3', 't0 t1 t2']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N=5 — 4 squad tiles (squad order preservation)
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB2 — computeHeroSquadLayout N=5 squad order', () => {
  it('n=5, heroIndex=2: squad=t0 t1 t3 t4 (source order minus hero)', () => {
    const layout = computeHeroSquadLayout(5, 2);
    expect(layout.cols).toBe(4);
    expect(layout.gridTemplateAreas).toEqual([
      't2 t2 t2 t2',
      't0 t1 t3 t4',
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N=8 — 7 squad tiles (just under overflow threshold)
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB2 — computeHeroSquadLayout N=8 (just under overflow)', () => {
  it('n=8, heroIndex=0: cols=7, overflow=false (n=8 NOT > threshold)', () => {
    const layout = computeHeroSquadLayout(8, 0);
    expect(layout.cols).toBe(7);
    expect(layout.overflow).toBe(false);
    expect(layout.gridTemplateAreas).toEqual([
      't0 t0 t0 t0 t0 t0 t0',
      't1 t2 t3 t4 t5 t6 t7',
    ]);
  });

  it('n=8, heroIndex=4: squad=t0 t1 t2 t3 t5 t6 t7', () => {
    const layout = computeHeroSquadLayout(8, 4);
    expect(layout.gridTemplateAreas).toEqual([
      't4 t4 t4 t4 t4 t4 t4',
      't0 t1 t2 t3 t5 t6 t7',
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N=9 — overflow threshold (operator-stated "N≥9: scroll")
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB2 — computeHeroSquadLayout N=9 overflow threshold', () => {
  it('n=9, heroIndex=0: cols=8, overflow=TRUE (n=9 > threshold=8)', () => {
    const layout = computeHeroSquadLayout(9, 0);
    expect(layout.cols).toBe(8);
    expect(layout.overflow).toBe(true);
  });

  it('n=9, heroIndex=8: squad t0..t7 in source order', () => {
    const layout = computeHeroSquadLayout(9, 8);
    expect(layout.gridTemplateAreas[1]).toBe('t0 t1 t2 t3 t4 t5 t6 t7');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N=12 — further overflow
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB2 — computeHeroSquadLayout N=12', () => {
  it('n=12, heroIndex=0: cols=11, overflow=true', () => {
    const layout = computeHeroSquadLayout(12, 0);
    expect(layout.cols).toBe(11);
    expect(layout.overflow).toBe(true);
    expect(layout.defaultRowSizes).toEqual(['75%', '25%']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bounds errors
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB2 — computeHeroSquadLayout bounds errors', () => {
  it('n=0 throws (n must be >= 1)', () => {
    expect(() => computeHeroSquadLayout(0, 0)).toThrow(/n must be/);
  });

  it('n=-1 throws', () => {
    expect(() => computeHeroSquadLayout(-1, 0)).toThrow(/n must be/);
  });

  it('heroIndex=-1 throws (out of bounds)', () => {
    expect(() => computeHeroSquadLayout(3, -1)).toThrow(
      /heroIndex out of bounds/,
    );
  });

  it('heroIndex=n throws (must be < n)', () => {
    expect(() => computeHeroSquadLayout(3, 3)).toThrow(
      /heroIndex out of bounds/,
    );
  });

  it('heroIndex=n+1 throws', () => {
    expect(() => computeHeroSquadLayout(3, 4)).toThrow(
      /heroIndex out of bounds/,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Invariants across all N≥2
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T19 WB2 — computeHeroSquadLayout invariants', () => {
  it('rows=1 ⇔ n=1 (degenerate hero-only)', () => {
    expect(computeHeroSquadLayout(1, 0).rows).toBe(1);
    expect(computeHeroSquadLayout(2, 0).rows).toBe(2);
    expect(computeHeroSquadLayout(8, 0).rows).toBe(2);
  });

  it('defaultRowSizes is ["100%"] for n=1, ["75%","25%"] for n≥2', () => {
    expect(computeHeroSquadLayout(1, 0).defaultRowSizes).toEqual(['100%']);
    expect(computeHeroSquadLayout(2, 0).defaultRowSizes).toEqual(['75%', '25%']);
    expect(computeHeroSquadLayout(7, 3).defaultRowSizes).toEqual(['75%', '25%']);
  });

  it('cols = n - 1 for n≥2; cols = 1 for n=1', () => {
    expect(computeHeroSquadLayout(1, 0).cols).toBe(1);
    expect(computeHeroSquadLayout(2, 0).cols).toBe(1);
    expect(computeHeroSquadLayout(5, 2).cols).toBe(4);
    expect(computeHeroSquadLayout(10, 0).cols).toBe(9);
  });

  it('squad row contains every index except heroIndex (parsed order)', () => {
    // For each n in 2..8 and each heroIndex, parse squad row tokens
    // and verify membership.
    for (let n = 2; n <= 8; n++) {
      for (let h = 0; h < n; h++) {
        const layout: HeroSquadLayout = computeHeroSquadLayout(n, h);
        const squadRow = layout.gridTemplateAreas[1] ?? '';
        const tokens = squadRow.split(' ');
        const expectedIndices: number[] = [];
        for (let i = 0; i < n; i++) {
          if (i !== h) expectedIndices.push(i);
        }
        const expectedTokens = expectedIndices.map((i) => `t${i}`);
        expect(tokens).toEqual(expectedTokens);
      }
    }
  });

  it('hero row repeats hero token (n-1) times for n≥2', () => {
    for (let n = 2; n <= 8; n++) {
      for (let h = 0; h < n; h++) {
        const layout = computeHeroSquadLayout(n, h);
        const heroRow = layout.gridTemplateAreas[0] ?? '';
        const expected = Array(n - 1).fill(`t${h}`).join(' ');
        expect(heroRow).toBe(expected);
      }
    }
  });
});
