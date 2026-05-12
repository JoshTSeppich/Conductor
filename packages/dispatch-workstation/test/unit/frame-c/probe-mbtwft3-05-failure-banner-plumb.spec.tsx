// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB5 (red) — failure-banner plumb-
// through probe for all 4 actions (diff/merge/focus FrameCActionError
// flat shape + kill SessionKillError nested shape via WB6 adapter).
//
// Asserts (per ticket body §4 WB5 + Sub-Q-C=(i) inline-expansion + 4
// action coverage):
//   probe-05a: Diff bridge stub resolves with
//              `{ok:false, error_type:'NotARepository',
//                message:'not a git repository (or any of the parent directories)'}`
//              → after click + await, failure banner renders with
//              "diff" + "NotARepository" + message text.
//   probe-05b: Merge stub resolves with
//              `{ok:false, error_type:'MergeConflict', message:'auto merge failed',
//                conflictFiles:['a.ts','b.ts']}`
//              → banner renders with "merge" + "MergeConflict" + message
//              + `<ul>` listing both conflict files (re-uses Wave C #3
//              WB6 `cdf05db` rendering of conflictFiles).
//   probe-05c: Focus stub resolves with
//              `{ok:false, error_type:'FrameModeWriteFailed', message:'disk full'}`
//              → banner with "focus" + "FrameModeWriteFailed" + message.
//   probe-05d: Kill stub resolves with
//              `{ok:false, error: {error_type:'TmuxKillError',
//                sessionName:'session-foo', reason:'tmux not running'}}`
//              → WB6 adapter `adaptSessionKillFailure` maps to
//              `{action:'kill', result:{ok:false, error_type:'TmuxKillError',
//                message:'tmux not running'}}` → banner with "kill" +
//              "TmuxKillError" + "tmux not running".
//   probe-05e: Click Dismiss button after a failure → failureState
//              clears → banner unmounts.
//
// SHAPE DIFFERENCE [KNOWN-OPERATOR-ARBITRATED] from ticket body §3.1:
//   FrameCActionError: `{ok:false, error_type, message}` (FLAT)
//   SessionKillError:  `{ok:false, error: {error_type, sessionName?,
//                       reason?, field_path?, tmuxKillSucceeded?}}` (NESTED)
//
// WB6 GREEN adapter (top-level pure function at detail-pane.tsx):
//   function adaptSessionKillFailure(reply: SessionKillReply):
//       ActionBarFailureState | null {
//     if (reply.ok) return null;
//     const e = reply.error;
//     let message: string;
//     switch (e.error_type) {
//       case 'SchemaValidationError': message = `${e.field_path}: ${e.reason}`; break;
//       case 'SessionNotFoundError': message = `session "${e.sessionName}" not found`; break;
//       case 'TmuxKillError': message = e.reason; break;
//       case 'DaemonUnreachable': message = `daemon unreachable (tmux kill ${
//         e.tmuxKillSucceeded ? 'succeeded' : 'failed'}): ${e.reason}`; break;
//     }
//     return {action: 'kill', result: {ok: false, error_type: e.error_type, message}};
//   }
//
// RED state at HEAD (post-WB4 GREEN `e05add2`):
//   - DetailPane fires bridge calls (handleDiff/handleMerge/handleFocus/
//     handleKill) but FIRE-AND-FORGETS via `void`. Result is never
//     awaited; failureState never updates from null.
//   - No SessionKillError → ActionBarFailureState adapter exists in
//     detail-pane.tsx.
//   - probes 05a-05d fail: `[data-testid="action-bar-failure-banner"]`
//     null after click + waitFor.
//   - probe-05e fails: cannot click Dismiss because banner never
//     renders (cascades from 05a).
//
// WB6 GREEN deliverables:
//   1. Convert handleDiff/handleMerge/handleFocus from fire-and-forget
//      to `await` + on `{ok:false}` → setFailureState({action, result}).
//   2. handleKill: `await` + adapt via `adaptSessionKillFailure` + set.
//   3. Author top-level `adaptSessionKillFailure` pure function.
//   4. Convert `failureState` from read-only (WB4 placeholder) to
//      stateful — add setter consumed by useCallbacks.
//   5. Add `onDismissFailure` callback that clears failureState.
//   6. Pass `onDismissFailure` to ActionBar.
//   7. All 5 probes flip RED → GREEN.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, waitFor } from '@testing-library/react';
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
    diff: vi.fn(),
    merge: vi.fn(),
    focus: vi.fn(),
  };
  workstationBridge = {
    readSwarmState: vi.fn(async () => ''),
    killSession: vi.fn(),
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

function clickByTestId(container: HTMLDivElement, testId: string): void {
  const btn = container.querySelector(`[data-testid="${testId}"]`) as
    | HTMLButtonElement
    | null;
  if (!btn) throw new Error(`button "${testId}" not found`);
  act(() => {
    fireEvent.click(btn);
  });
}

describe('MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB5 — failure-banner plumb-through for all 4 actions', () => {
  it('probe-05a: diff failure {ok:false, NotARepository} → banner with action="diff" + error_type + message', async () => {
    frameCBridge.diff.mockResolvedValue({
      ok: false,
      error_type: 'NotARepository',
      message: 'fatal: not a git repository (or any of the parent directories)',
    });
    const container = renderDetailPane('session-foo');
    clickByTestId(container, 'action-bar-diff-btn');
    await waitFor(() => {
      const banner = container.querySelector(
        '[data-testid="action-bar-failure-banner"]',
      );
      expect(banner, 'banner must render after diff failure resolves').not.toBeNull();
    });
    const banner = container.querySelector(
      '[data-testid="action-bar-failure-banner"]',
    )!;
    const text = banner.textContent ?? '';
    expect(text).toContain('diff');
    expect(text).toContain('NotARepository');
    expect(text).toContain('not a git repository');
  });

  it('probe-05b: merge MergeConflict → banner with conflictFiles ul list', async () => {
    frameCBridge.merge.mockResolvedValue({
      ok: false,
      error_type: 'MergeConflict',
      message:
        'Automatic merge failed. Resolve conflicts manually or run `git merge --abort`.',
      conflictFiles: ['packages/dispatch-workstation/src/foo.ts', 'docs/bar.md'],
    });
    const container = renderDetailPane('session-foo');
    clickByTestId(container, 'action-bar-merge-btn');
    await waitFor(() => {
      const banner = container.querySelector(
        '[data-testid="action-bar-failure-banner"]',
      );
      expect(banner).not.toBeNull();
    });
    const banner = container.querySelector(
      '[data-testid="action-bar-failure-banner"]',
    )!;
    const text = banner.textContent ?? '';
    expect(text).toContain('merge');
    expect(text).toContain('MergeConflict');
    // conflictFiles rendered as `<ul><li>` per Wave C #3 WB6 `cdf05db`
    // existing renderFailureBanner extractConflictFiles helper.
    const conflictItems = banner.querySelectorAll('ul li');
    expect(
      conflictItems.length,
      'conflictFiles must render as <ul><li> list (re-uses Wave C #3 WB6 banner UX)',
    ).toBe(2);
    const itemTexts = Array.from(conflictItems).map((li) => li.textContent ?? '');
    expect(itemTexts).toContain('packages/dispatch-workstation/src/foo.ts');
    expect(itemTexts).toContain('docs/bar.md');
  });

  it('probe-05c: focus FrameModeWriteFailed → banner with action="focus" + error_type + message', async () => {
    frameCBridge.focus.mockResolvedValue({
      ok: false,
      error_type: 'FrameModeWriteFailed',
      message: 'ENOSPC: no space left on device',
    });
    const container = renderDetailPane('session-foo');
    clickByTestId(container, 'action-bar-focus-btn');
    await waitFor(() => {
      const banner = container.querySelector(
        '[data-testid="action-bar-failure-banner"]',
      );
      expect(banner).not.toBeNull();
    });
    const banner = container.querySelector(
      '[data-testid="action-bar-failure-banner"]',
    )!;
    const text = banner.textContent ?? '';
    expect(text).toContain('focus');
    expect(text).toContain('FrameModeWriteFailed');
    expect(text).toContain('ENOSPC');
  });

  it('probe-05d: kill TmuxKillError (SessionKillError nested shape) → adapter maps → banner with action="kill" + error_type + reason', async () => {
    workstationBridge.killSession.mockResolvedValue({
      ok: false,
      error: {
        error_type: 'TmuxKillError',
        sessionName: 'session-foo',
        reason: 'no server running on /tmp/tmux-501/default',
      },
    });
    const container = renderDetailPane('session-foo');
    clickByTestId(container, 'action-bar-kill-btn');
    await waitFor(() => {
      const banner = container.querySelector(
        '[data-testid="action-bar-failure-banner"]',
      );
      expect(
        banner,
        'banner must render after kill failure resolves via WB6 adapter (SessionKillError → ActionBarFailureState)',
      ).not.toBeNull();
    });
    const banner = container.querySelector(
      '[data-testid="action-bar-failure-banner"]',
    )!;
    const text = banner.textContent ?? '';
    expect(text, 'action "kill" must appear in banner header').toContain('kill');
    expect(text, 'TmuxKillError type from nested error.error_type').toContain(
      'TmuxKillError',
    );
    expect(text, 'reason field from nested error.reason mapped to message').toContain(
      'no server running',
    );
  });

  it('probe-05e: clicking Dismiss button clears failureState → banner unmounts', async () => {
    frameCBridge.diff.mockResolvedValue({
      ok: false,
      error_type: 'NotARepository',
      message: 'fatal: not a git repository',
    });
    const container = renderDetailPane('session-foo');
    clickByTestId(container, 'action-bar-diff-btn');
    await waitFor(() => {
      const banner = container.querySelector(
        '[data-testid="action-bar-failure-banner"]',
      );
      expect(banner).not.toBeNull();
    });
    clickByTestId(container, 'action-bar-failure-dismiss');
    await waitFor(() => {
      const banner = container.querySelector(
        '[data-testid="action-bar-failure-banner"]',
      );
      expect(
        banner,
        'banner must unmount after Dismiss click (onDismissFailure clears failureState to null)',
      ).toBeNull();
    });
  });
});
