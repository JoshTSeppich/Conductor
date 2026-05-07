// MB-T18 probe-01 — formatUptime pure-fn unit tests.
//
// Per Q-MBT18-8=a auto-switching unit format:
//   < 60s   → "Ns"
//   < 60m   → "Nm"
//   < 24h   → "Nh"
//   else    → "Nd"
//
// Boundary cases: 0, 59s, 60s, 59m, 60m, 23h, 24h, multi-day.
// Defensive: negative / NaN / non-finite inputs → "0s".

import { describe, it, expect } from 'vitest';
import { formatUptime } from '../../../src/tile-grid/tile-footer.js';

describe('MB-T18 probe-01 — formatUptime auto-switching unit format', () => {
  it('0ms → "0s"', () => {
    expect(formatUptime(0)).toBe('0s');
  });

  it('30000ms (30s) → "30s"', () => {
    expect(formatUptime(30_000)).toBe('30s');
  });

  it('59999ms (just under 1m) → "59s"', () => {
    expect(formatUptime(59_999)).toBe('59s');
  });

  it('60000ms (1m) → "1m" (60s threshold flips to minutes)', () => {
    expect(formatUptime(60_000)).toBe('1m');
  });

  it('90000ms (1.5m) → "1m" (floor)', () => {
    expect(formatUptime(90_000)).toBe('1m');
  });

  it('3599999ms (just under 1h) → "59m"', () => {
    expect(formatUptime(3_599_999)).toBe('59m');
  });

  it('3600000ms (1h) → "1h" (60m threshold flips to hours)', () => {
    expect(formatUptime(3_600_000)).toBe('1h');
  });

  it('86399999ms (just under 1d) → "23h"', () => {
    expect(formatUptime(86_399_999)).toBe('23h');
  });

  it('86400000ms (1d) → "1d" (24h threshold flips to days)', () => {
    expect(formatUptime(86_400_000)).toBe('1d');
  });

  it('multi-day (3 × 86400000ms) → "3d"', () => {
    expect(formatUptime(3 * 86_400_000)).toBe('3d');
  });

  it('negative input clamps to "0s" (defensive)', () => {
    expect(formatUptime(-1000)).toBe('0s');
  });

  it('NaN input clamps to "0s" (defensive)', () => {
    expect(formatUptime(NaN)).toBe('0s');
  });

  it('+Infinity input clamps to "0s" (defensive — non-finite filter)', () => {
    expect(formatUptime(Infinity)).toBe('0s');
  });
});
