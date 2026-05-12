// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB3 (red) —
// max-parallel counter component + chat-shell slot contract probe.
//
// Per ticket body f8fc24d §4 WB3 + Sub-Q-T4-E=(i) operator-pre-
// arbitrated 2026-05-12 ("accept all defaults"):
//   - Sub-Q-T4-E=(i): renderer-internal source — N from sessions
//     stream (post-T1 `4414ef9`); M from renderer-internal const 16.
//   - Component lives at `src/chat-shell/max-parallel-counter.tsx`
//     (NEW at WB4 GREEN).
//   - ChatShell accepts a `renderMaxParallelCounter?: () => ReactNode`
//     slot prop (mirrors existing renderCostMeter / renderPlanUsage
//     Ring / renderDispatchModeToggle / renderModelMix pattern) at
//     `chat-shell.tsx`.
//   - Bottom-rail mount.ts wires sessions stream → slot function at
//     auto-mount time (WB12 final layout consolidation OR WB4 GREEN
//     mount-side wiring).
//
// Encoded contract (5 conditions per ticket body §4 WB3 + §1.1 item 6):
//   (1) MaxParallelCounter component is exported from
//       `src/chat-shell/max-parallel-counter.tsx` (dynamic-import
//       pattern with @vite-ignore for RED-robust probe).
//   (2) MaxParallelCounter with sessions=[] + maxParallel=16 renders
//       `<span data-testid="max-parallel-counter">` with text matching
//       `/max-parallel · 0\/16/`.
//   (3) MaxParallelCounter with 3 sessions of `status='open'` renders
//       text matching `/max-parallel · 3\/16/`.
//   (4) MaxParallelCounter filters by `status === 'open'` for N count:
//       sessions=[open, open, collapsed, detached, killed] → N=2,
//       text matches `/max-parallel · 2\/16/`.
//   (5) ChatShell with `renderMaxParallelCounter` slot prop slots the
//       returned content inside `chat-shell-header-bar` (slot
//       integration verified via testid containment).
//
// RED state at HEAD `57dc77a` (post-WB2 GREEN):
//   - `src/chat-shell/max-parallel-counter.tsx` does NOT exist —
//     dynamic-import fails at runtime; Condition 1 catches via
//     `MaxParallelCounter` being undefined.
//   - 5/5 conditions fail at import-resolve OR component-absent guards.
//
// WB4 GREEN target:
//   1. NEW `src/chat-shell/max-parallel-counter.tsx` exports
//      `MaxParallelCounter({ sessions, maxParallel }: Props): JSX.Element`
//      rendering `<span data-testid="max-parallel-counter">max-parallel
//      · N/M</span>` where N = sessions.filter(s.status === 'open').
//      length and M = maxParallel.
//   2. MOD `src/chat-shell/chat-shell.tsx`:
//      - Add `renderMaxParallelCounter?: () => ReactNode` to
//        ChatShellProps.
//      - Slot inside chat-shell-header-bar between Conductor brand
//        and MB-T24 dispatch-mode-toggle (operator-arbitrated slot
//        ordering subject to wireframe interpretation).
//   3. M=16 as renderer-internal const default (Sub-Q-T4-E=i); Tier 3
//      `MB-F-MAX-PARALLEL-CONFIG-SOURCE` recommendation in WB4 commit
//      body for operator-arbitrated config source follow-on.

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatShell, type TabConfig } from '../../../src/chat-shell/chat-shell.js';

interface TestSessionEntry {
  readonly name: string;
  readonly status?: 'open' | 'collapsed' | 'detached' | 'killed' | 'idle';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MaxParallelCounterCmp = (props: any) => JSX.Element;

let MaxParallelCounter: MaxParallelCounterCmp | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/chat-shell/max-parallel-counter.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    MaxParallelCounter = (mod as { MaxParallelCounter?: MaxParallelCounterCmp })
      .MaxParallelCounter;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

const chatTab: TabConfig = {
  id: 'chat',
  label: 'Chat',
  render: () => null,
};

describe('MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB3 — max-parallel counter component', () => {
  describe('Condition (1): MaxParallelCounter component is exported', () => {
    it('module `src/chat-shell/max-parallel-counter.tsx` exports MaxParallelCounter', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(
        MaxParallelCounter,
        'MaxParallelCounter export must exist (WB4 GREEN authors the module)',
      ).toBeDefined();
    });
  });

  describe('Condition (2): N=0 / M=16 baseline', () => {
    it('sessions=[] + maxParallel=16 renders text matching /max-parallel · 0\\/16/', () => {
      expect(MaxParallelCounter).toBeDefined();
      const container = document.createElement('div');
      document.body.appendChild(container);
      try {
        render(<MaxParallelCounter sessions={[]} maxParallel={16} />, {
          container,
        });
        const counter = screen.getByTestId('max-parallel-counter');
        expect(counter.textContent).toMatch(/max-parallel · 0\/16/);
      } finally {
        container.remove();
      }
    });
  });

  describe('Condition (3): N counts open-status sessions', () => {
    it('sessions=[3 open] + maxParallel=16 renders text matching /max-parallel · 3\\/16/', () => {
      expect(MaxParallelCounter).toBeDefined();
      const sessions: TestSessionEntry[] = [
        { name: 's1', status: 'open' },
        { name: 's2', status: 'open' },
        { name: 's3', status: 'open' },
      ];
      render(<MaxParallelCounter sessions={sessions} maxParallel={16} />);
      const counter = screen.getByTestId('max-parallel-counter');
      expect(counter.textContent).toMatch(/max-parallel · 3\/16/);
    });
  });

  describe('Condition (4): N filter excludes non-open statuses', () => {
    it('sessions=[open, open, collapsed, detached, killed] + maxParallel=16 renders /max-parallel · 2\\/16/', () => {
      expect(MaxParallelCounter).toBeDefined();
      const sessions: TestSessionEntry[] = [
        { name: 'o1', status: 'open' },
        { name: 'o2', status: 'open' },
        { name: 'c1', status: 'collapsed' },
        { name: 'd1', status: 'detached' },
        { name: 'k1', status: 'killed' },
      ];
      render(<MaxParallelCounter sessions={sessions} maxParallel={16} />);
      const counter = screen.getByTestId('max-parallel-counter');
      expect(
        counter.textContent,
        'N must filter by status==="open" only (Sub-Q-T4-E=i semantic per ticket body §4 WB4)',
      ).toMatch(/max-parallel · 2\/16/);
    });
  });

  describe('Condition (5): ChatShell slots renderMaxParallelCounter inside chat-shell-header-bar', () => {
    it('renderMaxParallelCounter return value appears as descendant of chat-shell-header-bar', () => {
      expect(MaxParallelCounter).toBeDefined();
      const sessions: TestSessionEntry[] = [{ name: 's1', status: 'open' }];
      const renderMaxParallelCounter = (): JSX.Element => (
        <MaxParallelCounter sessions={sessions} maxParallel={16} />
      );
      render(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <ChatShell
          tabs={[chatTab]}
          {...({ renderMaxParallelCounter } as unknown as Record<
            string,
            unknown
          >)}
        />,
      );
      const counter = screen.queryByTestId('max-parallel-counter');
      const headerBar = screen.queryByTestId('chat-shell-header-bar');
      expect(
        counter,
        'precondition: max-parallel-counter element must render via slot prop',
      ).not.toBeNull();
      expect(
        headerBar,
        'precondition: chat-shell-header-bar must be present',
      ).not.toBeNull();
      expect(
        headerBar!.contains(counter!),
        'max-parallel-counter must be descendant of chat-shell-header-bar per Sub-Q-T4-A=α host-extension',
      ).toBe(true);
    });
  });
});
