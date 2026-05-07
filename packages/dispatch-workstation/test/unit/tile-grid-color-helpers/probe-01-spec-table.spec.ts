// MB-T15 WB2 probe-01 — color-helpers spec table.
//
// Replaces WB1's probe-00-module-loads.spec.ts (deleted at WB2; the
// throw-guard test was a RED-state marker that fails after WB2 lands
// real implementations). probe-01 is the full assertion suite for all
// 4 helpers per Q-MBT15-1=a + Q-MBT15-5=b + Q-MBT15-6=a dispositions.

import { describe, it, expect } from 'vitest';
import {
  statusDotColor,
  modelChipShortcode,
  modelChipColor,
  tokenMeterTint,
  type ModelChip,
} from '../../../src/tile-grid/color-helpers.js';
import type { TileStatus } from '../../../src/tile-grid/types.js';

describe('MB-T15 WB2 — statusDotColor (Q-MBT15-5=b)', () => {
  it('idle → gray', () => {
    expect(statusDotColor('idle')).toBe('gray');
  });
  it('open → green', () => {
    expect(statusDotColor('open')).toBe('green');
  });
  it('killed → red', () => {
    expect(statusDotColor('killed')).toBe('red');
  });
  it('detached → gray (Q-MBT15-5=b: UI in dimmed/placeholder state)', () => {
    expect(statusDotColor('detached')).toBe('gray');
  });
  it('yellow is unused in v3.0 — no TileStatus value maps to yellow', () => {
    const allStatuses: TileStatus[] = ['idle', 'open', 'killed', 'detached'];
    for (const s of allStatuses) {
      expect(statusDotColor(s)).not.toBe('yellow');
    }
  });
});

describe('MB-T15 WB2 — modelChipShortcode (Q-MBT15-1=a)', () => {
  it('claude-sonnet-4-6 → S4.6', () => {
    expect(modelChipShortcode('claude-sonnet-4-6')).toBe('S4.6');
  });
  it('claude-opus-4-6 → O4.6', () => {
    expect(modelChipShortcode('claude-opus-4-6')).toBe('O4.6');
  });
  it('claude-opus-4-7 → O4.7·1M', () => {
    expect(modelChipShortcode('claude-opus-4-7')).toBe('O4.7·1M');
  });
  it('claude-opus-4-7-[1m] suffix → O4.7·1M (1M context variant)', () => {
    expect(modelChipShortcode('claude-opus-4-7-[1m]')).toBe('O4.7·1M');
  });
  it('claude-haiku-4-5-20251001 → H', () => {
    expect(modelChipShortcode('claude-haiku-4-5-20251001')).toBe('H');
  });
  it('claude-haiku-4-5 (any haiku-prefix suffix) → H', () => {
    expect(modelChipShortcode('claude-haiku-4-5')).toBe('H');
    expect(modelChipShortcode('claude-haiku-3')).toBe('H');
  });
  it('unknown SDK name → null', () => {
    expect(modelChipShortcode('gpt-4')).toBeNull();
    expect(modelChipShortcode('mistral-large')).toBeNull();
    expect(modelChipShortcode('claude-experimental-9-9')).toBeNull();
  });
  it('empty string → null', () => {
    expect(modelChipShortcode('')).toBeNull();
  });
});

describe('MB-T15 WB2 — modelChipColor (Q-MBT15-1=a)', () => {
  it('returns a 6-digit hex color string for each chip', () => {
    expect(modelChipColor('S4.6')).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(modelChipColor('O4.6')).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(modelChipColor('O4.7·1M')).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(modelChipColor('H')).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
  it('each chip has a distinct color (no duplicate hex values)', () => {
    const chips: ModelChip[] = ['S4.6', 'O4.6', 'O4.7·1M', 'H'];
    const colors = chips.map(modelChipColor);
    expect(new Set(colors).size).toBe(4);
  });
});

describe('MB-T15 WB2 — tokenMeterTint (Q-MBT15-6=a)', () => {
  it('ratio = 0 → normal', () => {
    expect(tokenMeterTint(0)).toBe('normal');
  });
  it('ratio = 0.5 → normal', () => {
    expect(tokenMeterTint(0.5)).toBe('normal');
  });
  it('ratio = 0.7 → normal (boundary: not strictly > 0.7)', () => {
    expect(tokenMeterTint(0.7)).toBe('normal');
  });
  it('ratio = 0.71 → warn', () => {
    expect(tokenMeterTint(0.71)).toBe('warn');
  });
  it('ratio = 0.8 → warn', () => {
    expect(tokenMeterTint(0.8)).toBe('warn');
  });
  it('ratio = 0.85 → warn (boundary: not strictly > 0.85)', () => {
    expect(tokenMeterTint(0.85)).toBe('warn');
  });
  it('ratio = 0.86 → danger', () => {
    expect(tokenMeterTint(0.86)).toBe('danger');
  });
  it('ratio = 1.0 → danger', () => {
    expect(tokenMeterTint(1.0)).toBe('danger');
  });
  it('ratio = 1.5 (overshoot) → danger', () => {
    expect(tokenMeterTint(1.5)).toBe('danger');
  });
  it('NaN → normal (defensive)', () => {
    expect(tokenMeterTint(Number.NaN)).toBe('normal');
  });
  it('negative ratio → normal (defensive — should never occur but guarded)', () => {
    expect(tokenMeterTint(-0.5)).toBe('normal');
  });
});
