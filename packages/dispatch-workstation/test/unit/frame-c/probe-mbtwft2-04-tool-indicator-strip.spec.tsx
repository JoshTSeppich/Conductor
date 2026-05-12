// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB7 (red) — probe-mbtwft2-04
// ToolIndicatorStrip component render contract per ticket body 30ab109
// §4 WB7.
//
// Asserts (per ticket §4 WB7):
//   (a) `<ToolIndicatorStrip state={{ cooking: { elapsedMs: 724000,
//        queued: 4 }, recent: [], nextTool: null }} />` renders
//       `data-testid="frame-c-tool-indicator-strip"` containing the
//       literal text `Cooking 12m 04s · 4 tools queued`.
//   (b) Cooking timer advances at 1Hz: when state.cooking is set and
//       1.5 seconds elapse with state unchanged, rendered elapsed
//       advances from `12m 04s` to `12m 05s` (client-side
//       setInterval cursor advancing local elapsedMs; resets on
//       state.cooking.elapsedMs change).
//   (c) recent containing bash event renders literal `Bash: pnpm tsc
//       --noEmit`.
//   (d) nextTool string renders a "next: …" preview line.
//   (e) Empty state renders the strip container with NO indicator
//       items (no crash, honest empty).
//
// RED state at HEAD `0914bc6` (post-WB6 GREEN commit):
//   - `frame-c/tool-indicator-strip.tsx` does NOT exist. Verified
//     via `ls packages/dispatch-workstation/src/frame-c/` at WB7
//     authoring time: {action-bar, detail-pane, frame-c-root,
//     index, mount, session-list, terminal-header-bar, terminal-
//     stream, tool-indicator-parser} (9 files; no tool-indicator-
//     strip).
//   - Dynamic import in beforeAll captures the resolve-failure;
//     all 5 condition blocks fail at the import-guard.
//
// WB8 GREEN target: create `frame-c/tool-indicator-strip.tsx`
// exporting `ToolIndicatorStrip({ state }): JSX.Element`. Cooking
// 1Hz tick via useEffect + setInterval advancing local tick cursor;
// renders `Cooking ${MM}m ${SS}s · ${queued} tools queued` line.
// Recent events render compact horizontal strip (latest N events).
// nextTool preview as italic dim text below cooking row.

import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';

interface ToolEventShape {
  readonly kind: 'bash' | 'read' | 'edit' | 'write';
  readonly cmd?: string;
  readonly path?: string;
  readonly added?: number;
  readonly deleted?: number;
}

interface ToolIndicatorStateShape {
  readonly cooking: { readonly elapsedMs: number; readonly queued: number } | null;
  readonly recent: readonly ToolEventShape[];
  readonly nextTool: string | null;
}

interface ToolIndicatorStripProps {
  readonly state: ToolIndicatorStateShape;
}

type ToolIndicatorStripComponent = (
  props: ToolIndicatorStripProps,
) => JSX.Element;

let ToolIndicatorStrip: ToolIndicatorStripComponent | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/frame-c/tool-indicator-strip.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    ToolIndicatorStrip = (
      mod as { ToolIndicatorStrip?: ToolIndicatorStripComponent }
    ).ToolIndicatorStrip;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

afterEach(() => {
  vi.useRealTimers();
});

function renderStrip(props: ToolIndicatorStripProps): {
  container: HTMLElement;
  root: Root;
  rerender: (newProps: ToolIndicatorStripProps) => void;
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(ToolIndicatorStrip!, props));
  });
  return {
    container,
    root,
    rerender: (newProps) => {
      act(() => {
        root.render(createElement(ToolIndicatorStrip!, newProps));
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function stripOf(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    '[data-testid="frame-c-tool-indicator-strip"]',
  );
}

describe('MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB7 — ToolIndicatorStrip render contract', () => {
  describe('Condition (a): renders cooking line from initial state', () => {
    it('with cooking={elapsedMs:724000, queued:4}, renders "Cooking 12m 04s · 4 tools queued"', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(ToolIndicatorStrip).toBeDefined();
      const { container, unmount } = renderStrip({
        state: {
          cooking: { elapsedMs: 724000, queued: 4 },
          recent: [],
          nextTool: null,
        },
      });
      try {
        const strip = stripOf(container);
        expect(strip, 'strip must render').not.toBeNull();
        expect(
          strip!.textContent,
          'strip must include literal "Cooking 12m 04s · 4 tools queued"',
        ).toContain('Cooking 12m 04s · 4 tools queued');
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (b): cooking timer advances at 1Hz via local interval', () => {
    it('with cooking={elapsedMs:724000}, advance 1500ms → text shows "12m 05s"', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      vi.useFakeTimers();
      const { container, unmount } = renderStrip({
        state: {
          cooking: { elapsedMs: 724000, queued: 4 },
          recent: [],
          nextTool: null,
        },
      });
      try {
        const strip = stripOf(container);
        expect(strip, 'strip must render').not.toBeNull();
        // Initial: 12m 04s
        expect(strip!.textContent).toContain('12m 04s');
        // Advance 1.5 seconds — local tick must advance to 12m 05s
        act(() => {
          vi.advanceTimersByTime(1500);
        });
        expect(
          strip!.textContent,
          'after 1.5s, cooking elapsed must advance to "12m 05s" (1Hz local tick)',
        ).toContain('12m 05s');
      } finally {
        unmount();
      }
    });

    it('cooking=null → no timer-driven text (and no crash)', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      vi.useFakeTimers();
      const { container, unmount } = renderStrip({
        state: { cooking: null, recent: [], nextTool: null },
      });
      try {
        const strip = stripOf(container);
        expect(strip, 'strip must render even with cooking=null').not.toBeNull();
        expect(
          strip!.textContent,
          'with cooking=null, no Cooking line in strip text',
        ).not.toContain('Cooking');
        // Advancing timers must not throw
        act(() => {
          vi.advanceTimersByTime(5000);
        });
        const stripAfter = stripOf(container);
        expect(stripAfter, 'strip must still be present after tick').not.toBeNull();
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (c): recent bash event renders literal "Bash: <cmd>"', () => {
    it('with recent=[{kind:bash, cmd:"pnpm tsc --noEmit"}], renders the literal cmd line', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const { container, unmount } = renderStrip({
        state: {
          cooking: null,
          recent: [{ kind: 'bash', cmd: 'pnpm tsc --noEmit' }],
          nextTool: null,
        },
      });
      try {
        const strip = stripOf(container);
        expect(strip, 'strip must render').not.toBeNull();
        expect(
          strip!.textContent,
          'strip must include "Bash: pnpm tsc --noEmit"',
        ).toContain('Bash: pnpm tsc --noEmit');
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (d): nextTool preview renders "next: …" line', () => {
    it('with nextTool="Read: foo.ts", strip text includes "Read: foo.ts" in a next-preview slot', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const { container, unmount } = renderStrip({
        state: {
          cooking: null,
          recent: [],
          nextTool: 'Read: foo.ts',
        },
      });
      try {
        const strip = stripOf(container);
        expect(strip, 'strip must render').not.toBeNull();
        // Render contains the nextTool text + a "next" preview marker
        expect(strip!.textContent).toContain('Read: foo.ts');
        expect(
          strip!.textContent,
          'nextTool slot must include the literal "next" preview label so operator can distinguish from completed events',
        ).toMatch(/next/i);
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (e): empty state renders strip without items', () => {
    it('empty state → strip testid renders; no Cooking/Bash/Read/Edit text; no crash', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const { container, unmount } = renderStrip({
        state: { cooking: null, recent: [], nextTool: null },
      });
      try {
        const strip = stripOf(container);
        expect(
          strip,
          'strip must render even in empty state (honest no-data)',
        ).not.toBeNull();
        expect(strip!.textContent ?? '').not.toContain('Cooking');
        expect(strip!.textContent ?? '').not.toContain('Bash:');
        expect(strip!.textContent ?? '').not.toContain('Read:');
        expect(strip!.textContent ?? '').not.toContain('Edit ');
      } finally {
        unmount();
      }
    });
  });
});
