// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB3 (red) — DetailPane mounts
// ActionBar + plumbs 4 bridge callbacks probe.
//
// Asserts (per ticket body §4 WB3 + operator-arbitrated Sub-Q resolutions
// 2026-05-12 at all defaults: A=α / B=i / C=i / D=ii / E=ii / F=ii):
//   probe-03a: `[data-testid="frame-c-action-bar"]` element renders INSIDE
//              DetailPane (Sub-Q-B=(i) "inside DetailPane bottom-right").
//   probe-03b: Clicking `[data-testid="action-bar-diff-btn"]` invokes
//              `window.frameCBridge.diff` with `'session-foo'` (bare
//              sessionName arg per Wave C #3 §6.6 Channel #2 signature).
//   probe-03c: Clicking `[data-testid="action-bar-merge-btn"]` invokes
//              `window.frameCBridge.merge` with `'session-foo'`.
//   probe-03d: Clicking `[data-testid="action-bar-focus-btn"]` invokes
//              `window.frameCBridge.focus` with `'session-foo'`.
//   probe-03e: Clicking `[data-testid="action-bar-kill-btn"]` invokes
//              `window.workstationBridge.killSession` with
//              `{sessionName: 'session-foo'}` (NOTE PAYLOAD-OBJECT shape
//              per `preload.mts:137` bridge signature +
//              `WorkstationSessionKillRequestSchema` at
//              `dispatch-core/src/v3/schema.ts:1030` — distinct from
//              frameCBridge bare-sessionName callsite).
//
// Per audit §4.1 three-tier discipline (binding per ticket body §2.2):
// ActionBar remains RENDERER-INTEGRATED + bridge-free at the component
// layer. DetailPane is the integration host that holds `window.*Bridge`
// references via `globalThis.window` lookup (existing pattern at
// detail-pane.tsx:106-108 `WindowWithBridge`). WB4 GREEN extends the
// lookup pattern with a second bridge accessor (frameCBridge) +
// adds useCallback handlers that route ActionBar callbacks to the
// appropriate bridge method.
//
// RED state at HEAD (post-WB2 GREEN `7009b72`):
//   - DetailPane (detail-pane.tsx) renders ONLY the swarm-state `<pre>`
//     section + meta-row header + ctx-text. Does NOT import ActionBar;
//     does NOT mount it; does NOT call frameCBridge.* or
//     workstationBridge.killSession from any handler.
//   - probe-03a fails: `frame-c-action-bar` testid not in DetailPane
//     DOM subtree.
//   - probes 03b-03e fail: button query returns null → click target
//     null → bridge stubs not invoked.
//
// WB4 GREEN deliverables:
//   1. Import `ActionBar` + `ActionBarFailureState` from `./action-bar.js`.
//   2. Add `useState<ActionBarFailureState | null>` for failureState
//      (separate WB5/WB6 probes assert plumbing).
//   3. Add useCallback handlers for onDiff/onMerge/onFocus/onKill that
//      resolve bridge via `globalThis.window` lookup (mirror existing
//      `WindowWithBridge` pattern) and invoke method with correct shape:
//        onDiff(sessionName)  → frameCBridge.diff(sessionName)
//        onMerge(sessionName) → frameCBridge.merge(sessionName)
//        onFocus(sessionName) → frameCBridge.focus(sessionName)
//        onKill(sessionName)  → workstationBridge.killSession({sessionName})
//   4. Render `<ActionBar>` at the bottom of DetailPane's returned JSX
//      (Sub-Q-B=(i) "inside DetailPane bottom-right" layout).
//   5. Result-handling (failureState plumb) is WB5/WB6 scope; WB4 ships
//      bare bridge calls only (this probe asserts call-shape only;
//      result-plumb probes are WB5).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { DetailPane } from '../../../src/frame-c/detail-pane.js';

interface StubFrameCBridge {
  readonly diff: ReturnType<typeof vi.fn>;
  readonly merge: ReturnType<typeof vi.fn>;
  readonly focus: ReturnType<typeof vi.fn>;
}

interface StubWorkstationBridge {
  readonly readSwarmState: ReturnType<typeof vi.fn>;
  readonly killSession: ReturnType<typeof vi.fn>;
}

let frameCBridge: StubFrameCBridge;
let workstationBridge: StubWorkstationBridge;
let activeRoot: Root | null = null;
let activeContainer: HTMLDivElement | null = null;

beforeEach(() => {
  frameCBridge = {
    // Each method returns a never-resolving sentinel — WB3 probe scope is
    // CALL-SHAPE assertion only (probe-03b/c/d/e); the result-handling
    // plumb-through is WB5 probe scope. A never-resolving Promise avoids
    // accidental WB5 surface dependencies (failureState transitions on
    // result-reject paths) leaking into WB3 assertions.
    diff: vi.fn(() => new Promise(() => {})),
    merge: vi.fn(() => new Promise(() => {})),
    focus: vi.fn(() => new Promise(() => {})),
  };
  workstationBridge = {
    // readSwarmState satisfies DetailPane's existing WB8 useEffect (Wave
    // B) which fires on `selectedSessionName` change; return empty string
    // so the swarm-state pre renders the "no section found" placeholder
    // (honest empty surface).
    readSwarmState: vi.fn(async () => ''),
    killSession: vi.fn(() => new Promise(() => {})),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = (globalThis as any).window ?? globalThis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window.frameCBridge = frameCBridge;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window.workstationBridge = workstationBridge;
});

afterEach(() => {
  if (activeRoot) {
    act(() => {
      activeRoot!.unmount();
    });
    activeRoot = null;
  }
  if (activeContainer) {
    activeContainer.remove();
    activeContainer = null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).window.frameCBridge;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).window.workstationBridge;
});

function renderDetailPane(selectedSessionName: string): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(DetailPane, { selectedSessionName }));
  });
  activeRoot = root;
  activeContainer = container;
  return container;
}

describe('MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB3 — DetailPane mounts ActionBar + plumbs 4 bridge callbacks', () => {
  it('probe-03a: frame-c-action-bar testid renders inside DetailPane', () => {
    const container = renderDetailPane('session-foo');
    const detailPane = container.querySelector('[data-testid="frame-c-detail-pane"]');
    expect(detailPane, 'DetailPane must render with stable testid').not.toBeNull();
    const actionBar = detailPane!.querySelector('[data-testid="frame-c-action-bar"]');
    expect(
      actionBar,
      'ActionBar must mount INSIDE DetailPane per Sub-Q-MBTWFT3-B=(i) inside-DetailPane-bottom-right (WB4 GREEN)',
    ).not.toBeNull();
  });

  it('probe-03b: clicking diff button invokes frameCBridge.diff("session-foo")', () => {
    const container = renderDetailPane('session-foo');
    const diffBtn = container.querySelector(
      '[data-testid="action-bar-diff-btn"]',
    ) as HTMLButtonElement | null;
    expect(diffBtn, 'diff button must render inside DetailPane (mount in WB4)').not.toBeNull();
    act(() => {
      fireEvent.click(diffBtn!);
    });
    expect(frameCBridge.diff).toHaveBeenCalledTimes(1);
    expect(
      frameCBridge.diff,
      'frameCBridge.diff must be invoked with bare sessionName (Wave C #3 §6.6 Channel #2 signature)',
    ).toHaveBeenCalledWith('session-foo');
  });

  it('probe-03c: clicking merge button invokes frameCBridge.merge("session-foo")', () => {
    const container = renderDetailPane('session-foo');
    const mergeBtn = container.querySelector(
      '[data-testid="action-bar-merge-btn"]',
    ) as HTMLButtonElement | null;
    expect(mergeBtn).not.toBeNull();
    act(() => {
      fireEvent.click(mergeBtn!);
    });
    expect(frameCBridge.merge).toHaveBeenCalledTimes(1);
    expect(frameCBridge.merge).toHaveBeenCalledWith('session-foo');
  });

  it('probe-03d: clicking focus button invokes frameCBridge.focus("session-foo")', () => {
    const container = renderDetailPane('session-foo');
    const focusBtn = container.querySelector(
      '[data-testid="action-bar-focus-btn"]',
    ) as HTMLButtonElement | null;
    expect(focusBtn).not.toBeNull();
    act(() => {
      fireEvent.click(focusBtn!);
    });
    expect(frameCBridge.focus).toHaveBeenCalledTimes(1);
    expect(frameCBridge.focus).toHaveBeenCalledWith('session-foo');
  });

  it('probe-03e: clicking kill button invokes workstationBridge.killSession({sessionName: "session-foo"})', () => {
    const container = renderDetailPane('session-foo');
    const killBtn = container.querySelector(
      '[data-testid="action-bar-kill-btn"]',
    ) as HTMLButtonElement | null;
    expect(killBtn).not.toBeNull();
    act(() => {
      fireEvent.click(killBtn!);
    });
    expect(workstationBridge.killSession).toHaveBeenCalledTimes(1);
    expect(
      workstationBridge.killSession,
      'workstationBridge.killSession takes PAYLOAD OBJECT {sessionName} per preload.mts:137 + WorkstationSessionKillRequestSchema (distinct from frameCBridge bare-sessionName signature)',
    ).toHaveBeenCalledWith({ sessionName: 'session-foo' });
  });
});
