// MB-T15 WB1 probe-00 — color-helpers module loads + exports stub fns.
//
// WB1 RED state: implementations throw 'MB-T15 WB1 stub: ... lands at WB2'.
// This probe verifies the module imports correctly + exports are
// present, without invoking the throw paths. WB2 ADDS probe-01..N
// with real assertions when the implementations land.

import { describe, it, expect } from 'vitest';
import {
  statusDotColor,
  modelChipShortcode,
  modelChipColor,
  tokenMeterTint,
  type StatusDotColor,
  type ModelChip,
  type TokenMeterTint,
} from '../../../src/tile-grid/color-helpers.js';

describe('MB-T15 WB1 — color-helpers module loads', () => {
  it('exports statusDotColor as a function', () => {
    expect(typeof statusDotColor).toBe('function');
  });

  it('exports modelChipShortcode as a function', () => {
    expect(typeof modelChipShortcode).toBe('function');
  });

  it('exports modelChipColor as a function', () => {
    expect(typeof modelChipColor).toBe('function');
  });

  it('exports tokenMeterTint as a function', () => {
    expect(typeof tokenMeterTint).toBe('function');
  });

  it('WB1 stubs throw with WB2 deferral message (RED state guard)', () => {
    expect(() => statusDotColor('idle')).toThrow(/WB2/);
    expect(() => modelChipShortcode('claude-sonnet-4-6')).toThrow(/WB2/);
    expect(() => modelChipColor('S4.6')).toThrow(/WB2/);
    expect(() => tokenMeterTint(0.5)).toThrow(/WB2/);
  });

  it('exported types are distinct unions (compile-time only; smoke check via assignability)', () => {
    // These assignments validate the type literals at compile time;
    // tsc rejects if the literals don't match the type declarations.
    const s: StatusDotColor = 'gray';
    const m: ModelChip = 'S4.6';
    const t: TokenMeterTint = 'normal';
    expect([s, m, t]).toEqual(['gray', 'S4.6', 'normal']);
  });
});
