// @vitest-environment happy-dom
//
// MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB4 (red) —
// probe-mbtphase5-status-indicator-01-render.
//
// Contract spec per ticket body §4 WB4 (commit 832c03b). Component
// `src/tile-grid/status-indicator.tsx` exports:
//
//   export interface StatusIndicatorProps {
//     readonly status: TileStatus;
//     readonly sessionName: string;  // for data-testid only
//   }
//   export function StatusIndicator(props: StatusIndicatorProps): JSX.Element | null;
//
// 5 conditions (one per visible status + null branch):
//   (1) status='open' → renders dot with backgroundColor '#5b9d6e' (green)
//   (2) status='idle' → backgroundColor '#888888' (grey)
//   (3) status='warning' → backgroundColor '#c97a3a' (amber)
//   (4) status='error' → backgroundColor '#c54a4a' (red)
//   (5) status='killed' → returns null (statusToColor returns null;
//                                      defensive call-site contract)
//
// Hex values verified [KNOWN per READ-ONLY of
// frame-c/status-color.ts:38-41]: GREEN '#5b9d6e', GREY '#888888',
// AMBER '#c97a3a', RED '#c54a4a'.
//
// All non-null conditions also assert:
//   - data-testid="tile-status-indicator-{sessionName}"
//   - data-status="{status}"
//
// RED state: status-indicator.tsx does NOT exist at HEAD
// post-WB3-GREEN (fb6a474); dynamic import fails; all 5 assertions
// fail.

import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import type { TileStatus } from '../../../src/tile-grid/types.js';

interface StatusIndicatorProps {
  readonly status: TileStatus;
  readonly sessionName: string;
}
type StatusIndicatorComponent = (props: StatusIndicatorProps) => JSX.Element | null;

let StatusIndicator: StatusIndicatorComponent | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/tile-grid/status-indicator.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    StatusIndicator = (mod as { StatusIndicator?: StatusIndicatorComponent })
      .StatusIndicator;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

function renderIndicator(
  props: StatusIndicatorProps,
): { container: HTMLElement; unmount: () => void } {
  if (importError) throw new Error(`module import failed: ${importError.message}`);
  if (!StatusIndicator) throw new Error('StatusIndicator is undefined (module not yet implemented)');
  return render(createElement(StatusIndicator, props));
}

describe('MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB4 — StatusIndicator render', () => {
  it('(1) status="open" renders green dot (#5b9d6e)', () => {
    const { container, unmount } = renderIndicator({ status: 'open', sessionName: 's' });
    try {
      const el = container.querySelector('[data-testid="tile-status-indicator-s"]');
      expect(el, 'data-testid wrapper must render').not.toBeNull();
      expect(el?.getAttribute('data-status')).toBe('open');
      // backgroundColor inline style — read via getAttribute('style')
      // for happy-dom compat (CSSOM color-parse can normalize).
      const style = el?.getAttribute('style') ?? '';
      expect(style.toLowerCase()).toContain('#5b9d6e');
    } finally {
      unmount();
    }
  });

  it('(2) status="idle" renders grey dot (#888888)', () => {
    const { container, unmount } = renderIndicator({ status: 'idle', sessionName: 's' });
    try {
      const el = container.querySelector('[data-testid="tile-status-indicator-s"]');
      expect(el?.getAttribute('data-status')).toBe('idle');
      expect((el?.getAttribute('style') ?? '').toLowerCase()).toContain('#888888');
    } finally {
      unmount();
    }
  });

  it('(3) status="warning" renders amber dot (#c97a3a)', () => {
    const { container, unmount } = renderIndicator({ status: 'warning', sessionName: 's' });
    try {
      const el = container.querySelector('[data-testid="tile-status-indicator-s"]');
      expect(el?.getAttribute('data-status')).toBe('warning');
      expect((el?.getAttribute('style') ?? '').toLowerCase()).toContain('#c97a3a');
    } finally {
      unmount();
    }
  });

  it('(4) status="error" renders red dot (#c54a4a)', () => {
    const { container, unmount } = renderIndicator({ status: 'error', sessionName: 's' });
    try {
      const el = container.querySelector('[data-testid="tile-status-indicator-s"]');
      expect(el?.getAttribute('data-status')).toBe('error');
      expect((el?.getAttribute('style') ?? '').toLowerCase()).toContain('#c54a4a');
    } finally {
      unmount();
    }
  });

  it('(5) status="killed" renders null (defensive — production filters before invoking)', () => {
    const { container, unmount } = renderIndicator({ status: 'killed', sessionName: 's' });
    try {
      const el = container.querySelector('[data-testid="tile-status-indicator-s"]');
      expect(
        el,
        'killed status must render null per statusToColor null-return at status-color.ts:67',
      ).toBeNull();
    } finally {
      unmount();
    }
  });
});
