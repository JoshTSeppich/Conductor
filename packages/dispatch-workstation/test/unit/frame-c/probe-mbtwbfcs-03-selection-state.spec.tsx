// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB5 (red) — selection-state
// renderer-side wiring contract probe (Sub-Q-MBTWBFCS-A = α
// renderer-only, operator-pre-arbitrated 2026-05-11).
//
// Asserts (per ticket body a1f7a03 §4 WB5 + Sub-Q-A=α resolution):
//   (1) Clicking a SessionList row updates row visual state — the
//       clicked row now has `aria-selected="true"`.
//   (2) Previously-selected row (if any) is deselected — aria-selected
//       transitions back to "false" (or attribute absent).
//   (3) Clicking the same row twice keeps it selected (idempotent
//       click — no toggle behavior at WB5; toggle would be a future
//       UX enhancement).
//   (4) Selection state is React state inside FrameCRoot (NO IPC
//       roundtrip — Sub-Q-A=α renderer-only). Asserted by absence of
//       any `frameModeBridge.setFrameMode` or `frame-mode:set-selection`
//       IPC channel invocation during the click. This is a NEGATIVE
//       assertion: a stub bridge captures invocations; the click must
//       not invoke it.
//   (5) Selection initially `null` (no row selected at first mount);
//       no row has `aria-selected="true"` pre-click.
//
// RED state at HEAD `92eb23c` (post-WB4 GREEN):
//   - WB4 ships SessionList with `onSelect` prop wired through to
//     row click handler, BUT FrameCRoot does NOT yet hold useState
//     for `selectedSessionName`; click currently invokes onSelect
//     callback that is undefined when no parent wires it. The
//     `aria-selected` attribute is NOT yet emitted on rows.
//   - 5 it-blocks fail at aria-selected presence / negative-selection
//     toggle / IPC-absence (some pass vacuously).
//
// WB6 GREEN target: FrameCRoot adds `useState<string | null>(null)`
// for selectedSessionName; passes setter to SessionList.onSelect;
// SessionList renders `aria-selected="true"` on the matching row.
// Sub-Q-A=α (renderer-only) means NO frame-mode-state.ts modification
// and NO new IPC.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';

interface TestSessionEntry {
  readonly name: string;
  readonly status?: 'open' | 'collapsed' | 'detached';
  readonly branchName?: string;
  readonly repoName?: string;
}

type MountFrameCAny = (
  container: HTMLElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any,
) => { dispose(): void };

let mountFrameC: MountFrameCAny | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/frame-c/mount.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    mountFrameC = (mod as { mountFrameC?: MountFrameCAny }).mountFrameC;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

const FIXTURE_SESSIONS: readonly TestSessionEntry[] = [
  { name: 'sess-alpha', status: 'open', branchName: 'main', repoName: 'foxworks' },
  { name: 'sess-beta', status: 'open', branchName: 'feature/x', repoName: 'foxworks' },
  { name: 'sess-gamma', status: 'collapsed', branchName: 'main', repoName: 'other' },
];

interface StubFrameModeBridge {
  setFrameMode: ReturnType<typeof vi.fn>;
  getFrameMode: ReturnType<typeof vi.fn>;
}

function mountWith(): {
  container: HTMLElement;
  dispose: () => void;
  bridge: StubFrameModeBridge;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  // Stub bridge captures any IPC calls — negative assertion for Sub-Q-A=α.
  const bridge: StubFrameModeBridge = {
    setFrameMode: vi.fn(async () => 'C'),
    getFrameMode: vi.fn(async () => 'C'),
  };
  // Expose bridge globally so any frame-c code that probes for it
  // would observe and use it (negative-assertion pattern).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = (globalThis as any).window ?? globalThis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window.frameModeBridge = bridge;
  let handle: { dispose(): void } | null = null;
  act(() => {
    handle = mountFrameC!(container, { sessions: FIXTURE_SESSIONS });
  });
  return {
    container,
    dispose: () => {
      handle?.dispose();
      container.remove();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).window.frameModeBridge;
    },
    bridge,
  };
}

function rowOf(container: HTMLElement, name: string): HTMLElement {
  const row = container.querySelector<HTMLElement>(
    `[data-testid="frame-c-session-row-${name}"]`,
  );
  if (!row) throw new Error(`row "${name}" not found`);
  return row;
}

describe('MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB5 — selection-state renderer wiring (Sub-Q-A=α)', () => {
  describe('Condition (5): initial state — no row selected pre-click', () => {
    it('no row has aria-selected="true" at first mount', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith();
      try {
        for (const sess of FIXTURE_SESSIONS) {
          const row = rowOf(container, sess.name);
          expect(
            row.getAttribute('aria-selected'),
            `row "${sess.name}" must not be selected pre-click (aria-selected != "true")`,
          ).not.toBe('true');
        }
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (1): click → aria-selected="true" on clicked row', () => {
    it('clicking sess-alpha row sets aria-selected="true" on that row', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith();
      try {
        const row = rowOf(container, 'sess-alpha');
        act(() => {
          fireEvent.click(row);
        });
        const rowAfter = rowOf(container, 'sess-alpha');
        expect(
          rowAfter.getAttribute('aria-selected'),
          'sess-alpha row must have aria-selected="true" after click',
        ).toBe('true');
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (2): previously-selected row deselected on next click', () => {
    it('clicking sess-beta after sess-alpha deselects sess-alpha and selects sess-beta', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith();
      try {
        act(() => {
          fireEvent.click(rowOf(container, 'sess-alpha'));
        });
        act(() => {
          fireEvent.click(rowOf(container, 'sess-beta'));
        });
        const alpha = rowOf(container, 'sess-alpha');
        const beta = rowOf(container, 'sess-beta');
        expect(
          alpha.getAttribute('aria-selected'),
          'sess-alpha must be deselected after sess-beta is clicked',
        ).not.toBe('true');
        expect(
          beta.getAttribute('aria-selected'),
          'sess-beta must be selected after click',
        ).toBe('true');
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (3): clicking the same row twice keeps it selected (idempotent)', () => {
    it('two clicks on sess-gamma both result in aria-selected="true"', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith();
      try {
        act(() => {
          fireEvent.click(rowOf(container, 'sess-gamma'));
        });
        const afterFirst = rowOf(container, 'sess-gamma');
        expect(afterFirst.getAttribute('aria-selected')).toBe('true');
        act(() => {
          fireEvent.click(rowOf(container, 'sess-gamma'));
        });
        const afterSecond = rowOf(container, 'sess-gamma');
        expect(
          afterSecond.getAttribute('aria-selected'),
          'sess-gamma must remain selected after second click (idempotent; no toggle behavior at WB5)',
        ).toBe('true');
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (4): selection is renderer-only (Sub-Q-A=α; no IPC roundtrip)', () => {
    it('clicking a row does NOT invoke frameModeBridge.setFrameMode (renderer-state-only contract)', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose, bridge } = mountWith();
      try {
        act(() => {
          fireEvent.click(rowOf(container, 'sess-alpha'));
        });
        act(() => {
          fireEvent.click(rowOf(container, 'sess-beta'));
        });
        expect(
          bridge.setFrameMode,
          'Sub-Q-A=α renderer-only: selection state must NOT invoke frame-mode-state IPC',
        ).not.toHaveBeenCalled();
      } finally {
        dispose();
      }
    });
  });
});
