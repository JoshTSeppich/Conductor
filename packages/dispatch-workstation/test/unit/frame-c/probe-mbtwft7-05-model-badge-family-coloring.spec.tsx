// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T7-VISUAL-POLISH WB5 (red) — model-badge per-family
// color coding probe (Sub-Q-MBTWFT7-C=(i) operator-arbitrated 2026-05-12
// per-family colors default: Sonnet=teal/blue family, Opus=purple/violet
// family, Haiku=amber/gold family).
//
// Asserts (per ticket body §4 WB5):
//   probe-05a [pure-fn]: modelToFamily('claude-sonnet-4-6') === 'sonnet'
//   probe-05b [pure-fn]: modelToFamily('claude-opus-4-6') === 'opus' AND
//                        modelToFamily('claude-opus-4-7') === 'opus'
//   probe-05c [pure-fn]: modelToFamily('claude-haiku-4-5') === 'haiku'
//   probe-05d [pure-fn]: modelToFamily(undefined) === 'unknown' AND
//                        modelToFamily('claude-fake-9-9') === 'unknown'
//   probe-05e [happy-dom]: SessionList row renders
//                          `data-model-family="<family>"` attribute on
//                          the model-badge span element.
//   probe-05f [happy-dom]: Per-family color is applied via inline style;
//                          style.color differs between sonnet/opus/haiku
//                          rows (proves per-family coloring is wired,
//                          not just a uniform fallback).
//
// RED state at HEAD `be24ed8` (post-WB4 GREEN selected-highlight):
//   - `frame-c/model-badge.ts` exports `modelToLabel` only — no
//     `modelToFamily` export. probes 05a-05d fail at import (function
//     undefined).
//   - SessionList row model-badge span has style MODEL_BADGE_STYLE
//     with uniform `color: '#7a8290'` (session-list.tsx:82-89). No
//     `data-model-family` attribute. probes 05e-05f fail.
//
// WB6 GREEN deliverables:
//   1. Extend `frame-c/model-badge.ts` with `modelToFamily(model?:
//      string): 'sonnet' | 'opus' | 'haiku' | 'unknown'` pure function.
//      Maps model identifiers via switch (mirrors modelToLabel structure):
//        'claude-sonnet-4-6' → 'sonnet'
//        'claude-opus-4-6'   → 'opus'
//        'claude-opus-4-7'   → 'opus'
//        'claude-haiku-4-5'  → 'haiku'
//        undefined / other   → 'unknown'
//   2. Extend `frame-c/session-list.tsx` with `MODEL_BADGE_STYLE_BY_FAMILY`
//      Record<family, CSSProperties> keyed by family. Per-family color
//      hex per Sub-Q-MBTWFT7-C=(i) operator default representative:
//        sonnet:  '#5eb3c4' (teal/blue)
//        opus:    '#9b6dd7' (purple/violet)
//        haiku:   '#d4a04a' (amber/gold)
//        unknown: '#7a8290' (current MODEL_BADGE_STYLE color; neutral)
//   3. Apply via composition: `{...MODEL_BADGE_STYLE,
//      ...MODEL_BADGE_STYLE_BY_FAMILY[family]}` on the badge span
//      style; add `data-model-family={family}` attribute.
//   4. 6 probes flip RED → GREEN.

import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { SessionList } from '../../../src/frame-c/session-list.js';
import { modelToFamily } from '../../../src/frame-c/model-badge.js';
import type { TileGridSessionEntry } from '../../../src/tile-grid/tile-grid.js';

const SESSIONS_PER_FAMILY: readonly TileGridSessionEntry[] = [
  { name: 'sess-sonnet', status: 'open', model: 'claude-sonnet-4-6' },
  { name: 'sess-opus', status: 'open', model: 'claude-opus-4-7' },
  { name: 'sess-haiku', status: 'open', model: 'claude-haiku-4-5' },
];

function renderSessionList(): { container: HTMLDivElement; cleanup: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(SessionList, {
        sessions: SESSIONS_PER_FAMILY,
        onSelect: vi.fn(),
        selectedSessionName: null,
      }),
    );
  });
  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('MB-T-WIREFRAME-T7-VISUAL-POLISH WB5 — model-badge per-family color coding (Sub-Q-C=i)', () => {
  it('probe-05a: modelToFamily("claude-sonnet-4-6") returns "sonnet"', () => {
    expect(modelToFamily).toBeDefined();
    expect(modelToFamily('claude-sonnet-4-6')).toBe('sonnet');
  });

  it('probe-05b: modelToFamily("claude-opus-4-6") and "claude-opus-4-7" return "opus"', () => {
    expect(modelToFamily('claude-opus-4-6')).toBe('opus');
    expect(modelToFamily('claude-opus-4-7')).toBe('opus');
  });

  it('probe-05c: modelToFamily("claude-haiku-4-5") returns "haiku"', () => {
    expect(modelToFamily('claude-haiku-4-5')).toBe('haiku');
  });

  it('probe-05d: modelToFamily(undefined) and unknown identifiers return "unknown"', () => {
    expect(modelToFamily(undefined)).toBe('unknown');
    expect(modelToFamily('claude-fake-9-9')).toBe('unknown');
    expect(modelToFamily('')).toBe('unknown');
  });

  it('probe-05e: SessionList row renders data-model-family attribute on model-badge span', () => {
    const { container, cleanup } = renderSessionList();
    try {
      const sonnetBadge = container.querySelector(
        '[data-testid="frame-c-session-row-model-sess-sonnet"]',
      );
      expect(sonnetBadge).not.toBeNull();
      expect(
        sonnetBadge!.getAttribute('data-model-family'),
        'sonnet row badge must have data-model-family="sonnet" attribute (WB6 GREEN adds)',
      ).toBe('sonnet');

      const opusBadge = container.querySelector(
        '[data-testid="frame-c-session-row-model-sess-opus"]',
      );
      expect(opusBadge!.getAttribute('data-model-family')).toBe('opus');

      const haikuBadge = container.querySelector(
        '[data-testid="frame-c-session-row-model-sess-haiku"]',
      );
      expect(haikuBadge!.getAttribute('data-model-family')).toBe('haiku');
    } finally {
      cleanup();
    }
  });

  it('probe-05f: per-family color applied via inline style; style.color differs between sonnet/opus/haiku', () => {
    const { container, cleanup } = renderSessionList();
    try {
      const sonnetBadge = container.querySelector(
        '[data-testid="frame-c-session-row-model-sess-sonnet"]',
      ) as HTMLElement;
      const opusBadge = container.querySelector(
        '[data-testid="frame-c-session-row-model-sess-opus"]',
      ) as HTMLElement;
      const haikuBadge = container.querySelector(
        '[data-testid="frame-c-session-row-model-sess-haiku"]',
      ) as HTMLElement;
      expect(sonnetBadge).not.toBeNull();
      expect(opusBadge).not.toBeNull();
      expect(haikuBadge).not.toBeNull();

      const sonnetColor = sonnetBadge.style.color;
      const opusColor = opusBadge.style.color;
      const haikuColor = haikuBadge.style.color;

      expect(sonnetColor, 'sonnet color must be set').toBeTruthy();
      expect(opusColor, 'opus color must be set').toBeTruthy();
      expect(haikuColor, 'haiku color must be set').toBeTruthy();
      expect(
        sonnetColor !== opusColor,
        'sonnet and opus must have different colors per Sub-Q-C=(i) per-family scheme',
      ).toBe(true);
      expect(
        opusColor !== haikuColor,
        'opus and haiku must have different colors',
      ).toBe(true);
      expect(
        sonnetColor !== haikuColor,
        'sonnet and haiku must have different colors',
      ).toBe(true);
    } finally {
      cleanup();
    }
  });
});
