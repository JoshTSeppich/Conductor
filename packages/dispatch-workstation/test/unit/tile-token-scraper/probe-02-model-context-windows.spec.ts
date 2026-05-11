// §C.5 WB3 red — model-context-windows.ts
//   - getContextWindow returns 200_000 for all active v3.5 substrates
//   - unknown model falls back to 200_000
//   - return type is number

import { describe, it, expect } from 'vitest';
import { getContextWindow } from '../../../src/tile-grid/model-context-windows.js';

describe('§C.5 model-context-windows — active substrates', () => {
  it('claude-sonnet-4-6 → 200_000', () => {
    expect(getContextWindow('claude-sonnet-4-6')).toBe(200_000);
  });

  it('claude-opus-4-7 → 200_000', () => {
    expect(getContextWindow('claude-opus-4-7')).toBe(200_000);
  });

  it('claude-haiku-4-5-20251001 → 200_000', () => {
    expect(getContextWindow('claude-haiku-4-5-20251001')).toBe(200_000);
  });
});

describe('§C.5 model-context-windows — fallback', () => {
  it('unknown model string → fallback 200_000', () => {
    expect(getContextWindow('claude-future-model-unknown')).toBe(200_000);
  });

  it('empty string → fallback 200_000', () => {
    expect(getContextWindow('')).toBe(200_000);
  });

  it('return value is a number', () => {
    expect(typeof getContextWindow('claude-sonnet-4-6')).toBe('number');
  });
});
