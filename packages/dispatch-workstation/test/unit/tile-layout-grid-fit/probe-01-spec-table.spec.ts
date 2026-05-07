import { describe, it, expect } from 'vitest';
import {
  computeGridLayout,
  type GridLayout,
} from '../../../src/tile-grid/tile-layout.js';
import { TILE_LAYOUT_CASES } from '../../../src/tile-grid/__fixtures__/tile-layout-cases.js';

// MB-T12 WB2 — probe-01 — pure-fn tile-layout-grid-fit spec table.
//
// Asserts computeGridLayout matches the operator-arbitrated spec freeze
// (CONDUCTOR_V3_RESCOPE.md §3.1 line 45 + §3.3 line 78) for N=1..12 plus
// edge cases (invalid n, gridTemplateAreas span semantics, overflow flag).

describe('computeGridLayout — spec table N=1..12', () => {
  for (const fixtureCase of TILE_LAYOUT_CASES) {
    it(`N=${fixtureCase.n} → ${fixtureCase.rows}×${fixtureCase.cols}, overflow=${fixtureCase.overflow}`, () => {
      const layout: GridLayout = computeGridLayout(fixtureCase.n);
      expect(layout.rows).toBe(fixtureCase.rows);
      expect(layout.cols).toBe(fixtureCase.cols);
      expect(layout.overflow).toBe(fixtureCase.overflow);
    });
  }
});

describe('computeGridLayout — gridTemplateAreas span semantics', () => {
  it('N=1 → single cell ["t0"]', () => {
    expect(computeGridLayout(1).gridTemplateAreas).toEqual(['t0']);
  });

  it('N=2 → single row ["t0 t1"]', () => {
    expect(computeGridLayout(2).gridTemplateAreas).toEqual(['t0 t1']);
  });

  it('N=3 → 2×2 with last tile spanning bottom row ["t0 t1", "t2 t2"]', () => {
    expect(computeGridLayout(3).gridTemplateAreas).toEqual(['t0 t1', 't2 t2']);
  });

  it('N=4 → 2×2 even fit ["t0 t1", "t2 t3"]', () => {
    expect(computeGridLayout(4).gridTemplateAreas).toEqual(['t0 t1', 't2 t3']);
  });

  it('N=5 → 2×3 with last tile spanning leftover cell ["t0 t1 t2", "t3 t4 t4"]', () => {
    expect(computeGridLayout(5).gridTemplateAreas).toEqual([
      't0 t1 t2',
      't3 t4 t4',
    ]);
  });

  it('N=6 → 2×3 even fit ["t0 t1 t2", "t3 t4 t5"]', () => {
    expect(computeGridLayout(6).gridTemplateAreas).toEqual([
      't0 t1 t2',
      't3 t4 t5',
    ]);
  });

  it('N=7 → 2×4 with last tile spanning leftover cell ["t0 t1 t2 t3", "t4 t5 t6 t6"]', () => {
    expect(computeGridLayout(7).gridTemplateAreas).toEqual([
      't0 t1 t2 t3',
      't4 t5 t6 t6',
    ]);
  });

  it('N=8 → 2×4 even fit ["t0 t1 t2 t3", "t4 t5 t6 t7"]', () => {
    expect(computeGridLayout(8).gridTemplateAreas).toEqual([
      't0 t1 t2 t3',
      't4 t5 t6 t7',
    ]);
  });
});

describe('computeGridLayout — overflow case (N≥9)', () => {
  it('N=9 → explicit grid still 2×4; gridTemplateAreas matches N=8; tiles 8+ auto-flow', () => {
    const layout = computeGridLayout(9);
    expect(layout.rows).toBe(2);
    expect(layout.cols).toBe(4);
    expect(layout.overflow).toBe(true);
    expect(layout.gridTemplateAreas).toEqual([
      't0 t1 t2 t3',
      't4 t5 t6 t7',
    ]);
  });

  it('N=12 → identical explicit grid; overflow flag is true', () => {
    const layout = computeGridLayout(12);
    expect(layout.rows).toBe(2);
    expect(layout.cols).toBe(4);
    expect(layout.overflow).toBe(true);
    expect(layout.gridTemplateAreas).toEqual([
      't0 t1 t2 t3',
      't4 t5 t6 t7',
    ]);
  });

  it('N=20 → no further area-name growth; overflow handles all extras', () => {
    const layout = computeGridLayout(20);
    expect(layout.rows).toBe(2);
    expect(layout.cols).toBe(4);
    expect(layout.overflow).toBe(true);
    expect(layout.gridTemplateAreas).toEqual([
      't0 t1 t2 t3',
      't4 t5 t6 t7',
    ]);
  });
});

describe('computeGridLayout — invalid n guard', () => {
  it('throws on n=0', () => {
    expect(() => computeGridLayout(0)).toThrow(/positive integer/);
  });

  it('throws on n=-1', () => {
    expect(() => computeGridLayout(-1)).toThrow(/positive integer/);
  });

  it('throws on non-integer n=1.5', () => {
    expect(() => computeGridLayout(1.5)).toThrow(/positive integer/);
  });

  it('throws on NaN', () => {
    expect(() => computeGridLayout(Number.NaN)).toThrow(/positive integer/);
  });
});

describe('computeGridLayout — return shape immutability', () => {
  it('gridTemplateAreas is a readonly array (TS contract; runtime copy permitted)', () => {
    const layout = computeGridLayout(4);
    expect(Array.isArray(layout.gridTemplateAreas)).toBe(true);
    expect(layout.gridTemplateAreas.length).toBe(2);
  });
});
