// MB-T12 WB7 probe-02 — pure-fn computeNewSizesAfterDrag.
//
// Asserts the drag-math semantics (delta direction, min-clamp behavior,
// edge-case borderIdx validation) for the function used by tile-grid.tsx
// during drag-resize.

import { describe, it, expect } from 'vitest';
import { computeNewSizesAfterDrag } from '../../../src/tile-grid/tile-layout.js';

describe('computeNewSizesAfterDrag — basic delta semantics', () => {
  it('positive delta grows band[borderIdx] and shrinks band[borderIdx+1]', () => {
    expect(computeNewSizesAfterDrag([200, 200], 0, 50)).toEqual([250, 150]);
  });

  it('negative delta shrinks band[borderIdx] and grows band[borderIdx+1]', () => {
    expect(computeNewSizesAfterDrag([200, 200], 0, -50)).toEqual([150, 250]);
  });

  it('zero delta returns identical sizes', () => {
    expect(computeNewSizesAfterDrag([200, 200, 300], 1, 0)).toEqual([200, 200, 300]);
  });

  it('only the two adjacent bands move; other bands unchanged', () => {
    expect(computeNewSizesAfterDrag([100, 200, 300, 400], 1, 50)).toEqual([
      100, 250, 250, 400,
    ]);
  });
});

describe('computeNewSizesAfterDrag — min-pixel clamp', () => {
  it('clamps positive delta when band[borderIdx+1] would shrink below minPx', () => {
    // initial right=100, minPx=80, max grow = 100-80 = 20
    expect(computeNewSizesAfterDrag([200, 100], 0, 50, 80)).toEqual([220, 80]);
  });

  it('clamps negative delta when band[borderIdx] would shrink below minPx', () => {
    // initial left=100, minPx=80, max shrink = -(100-80) = -20
    expect(computeNewSizesAfterDrag([100, 300], 0, -50, 80)).toEqual([80, 320]);
  });

  it('default minPx = 80', () => {
    expect(computeNewSizesAfterDrag([100, 100], 0, -50)).toEqual([80, 120]);
  });

  it('custom minPx applied', () => {
    expect(computeNewSizesAfterDrag([200, 200], 0, -200, 50)).toEqual([50, 350]);
  });

  it('exact-clamp produces unchanged delta when delta + min satisfies both bands', () => {
    expect(computeNewSizesAfterDrag([300, 300], 0, 220, 80)).toEqual([520, 80]);
  });
});

describe('computeNewSizesAfterDrag — borderIdx validation', () => {
  it('throws on borderIdx = -1', () => {
    expect(() => computeNewSizesAfterDrag([200, 200], -1, 50)).toThrow(
      /out of range/,
    );
  });

  it('throws on borderIdx = sizes.length - 1 (last band, no neighbor to right)', () => {
    expect(() => computeNewSizesAfterDrag([200, 200], 1, 50)).toThrow(
      /out of range/,
    );
  });

  it('throws on borderIdx = sizes.length', () => {
    expect(() => computeNewSizesAfterDrag([200, 200, 200], 3, 50)).toThrow(
      /out of range/,
    );
  });

  it('throws on non-integer borderIdx', () => {
    expect(() => computeNewSizesAfterDrag([200, 200, 200], 0.5, 50)).toThrow(
      /out of range/,
    );
  });

  it('borderIdx = 0 valid for 2-band arrays', () => {
    expect(() => computeNewSizesAfterDrag([200, 200], 0, 0)).not.toThrow();
  });

  it('borderIdx = sizes.length - 2 valid', () => {
    expect(() => computeNewSizesAfterDrag([200, 200, 200, 200], 2, 0)).not.toThrow();
  });
});

describe('computeNewSizesAfterDrag — immutability', () => {
  it('does not mutate the input array', () => {
    const initial = [200, 200, 300];
    const initialCopy = [...initial];
    computeNewSizesAfterDrag(initial, 0, 50);
    expect(initial).toEqual(initialCopy);
  });

  it('returns a new array (not the same reference)', () => {
    const initial = [200, 200];
    const result = computeNewSizesAfterDrag(initial, 0, 50);
    expect(result).not.toBe(initial);
  });
});
