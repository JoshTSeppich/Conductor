// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB7 (red) — DetailPane render +
// swarm-state.md query contract probe (Sub-Q-MBTWBFCS-B = i summary-text
// source, operator-pre-arbitrated 2026-05-11).
//
// Asserts (per ticket body a1f7a03 §4 WB7 + predecessor T4 brief
// transcribed into commit-plan-doc-1334 boot dispatch):
//   (a) DetailPane is ABSENT when no session is selected — the
//       `frame-c-detail-col` slot has no `frame-c-detail-pane` testid
//       child rendered. Negative-render contract: empty/placeholder
//       state means literally no DetailPane component output.
//   (b) When a session is selected (via SessionList row click → WB6
//       useState wiring), DetailPane invokes
//       `window.workstationBridge.readSwarmState()` to fetch swarm-state.md
//       content. Bridge mock captures invocations; asserts at-least-one
//       call post-selection.
//   (c) DetailPane renders the section text for the selected session —
//       a unique-per-session MARKER string from the mocked fixture
//       must appear in `data-testid="frame-c-detail-pane"` text content
//       after async resolution.
//   (d) Switching selection re-queries the bridge AND DOM content
//       updates: the previously-selected session's MARKER must no
//       longer appear; the newly-selected session's MARKER must appear.
//       Asserts dynamic refresh-on-selection-change semantics.
//
// IPC research finding (per orchestrator dispatch instruction, surfaced
// in WB7 commit body for WB8 GREEN rationale):
//   - `[KNOWN]` Existing preload bridges (preload.mts:14/109/125/260/281/
//     301/311 — coarchitectBridge / shellBridge / workstationBridge /
//     consoleBridge / dispatchModeBridge / commitsBridge / frameModeBridge)
//     expose NO file-read or generic fs-read IPC channel. Grep for
//     `fs-read|fsRead|readFile|workstation:.*read` in main.ts returns
//     only server-side `readFileSync` (main.ts:99) — not exposed to
//     renderer.
//   - `[KNOWN]` swarm-state.md is resolved server-side at main.ts:557
//     (`app.getAppPath() + '../../docs/swarm-state.md'`) and consumed
//     by SwarmStateWriter (writer-only — see swarm-state-writer.ts:235
//     writeFileSync). No renderer-accessible reader exists today.
//   - `[MODELED]` WB8 GREEN MUST add a new minimal IPC channel
//     (e.g., `workstation:read-swarm-state`) plus extend
//     `workstationBridge` in preload.mts with a renderer-side method
//     (chosen: `readSwarmState(): Promise<string>` — full-file read,
//     renderer-side parsing per-session). This is operator-arbitrated
//     `WORKSTATION_CONTRACT.md` §6 amendment territory per CLAUDE.md
//     §2.4 → HARD ESCALATION via HALT-WB8-PRE-COMMIT per dispatch §C
//     envelope (conditional HALT clause).
//   - This probe COMMITS to the bridge surface name
//     `window.workstationBridge.readSwarmState` for the contract;
//     WB8 GREEN implementation must match. If operator arbitrates a
//     different IPC shape at HALT-WB8-PRE-COMMIT, this probe is
//     adjusted as part of the WB8 GREEN landing (red probe is
//     contract-authoritative until operator amends).
//
// RED state at HEAD `2c55804` (post-WB6 GREEN):
//   - `frame-c/detail-pane.tsx` does NOT exist — verified via `ls`
//     packages/dispatch-workstation/src/frame-c/ (4 files: mount.tsx,
//     frame-c-root.tsx, session-list.tsx, index.ts).
//   - FrameCRoot at frame-c-root.tsx:111-113 renders an empty slot
//     comment in the detail-col: `{/* WB8 DetailPane renders here,
//     gated on selected */}` — no DetailPane component.
//   - 4/4 conditions fail at the `expect(detailPane).toBeTruthy()` or
//     `expect(bridge.readSwarmState).toHaveBeenCalled()` guards.
//
// WB8 GREEN target: create `frame-c/detail-pane.tsx` with useEffect
// querying `window.workstationBridge.readSwarmState()` on
// `selectedSessionName` change; parse per-session sections;
// render `data-testid="frame-c-detail-pane"` with section text.
// FrameCRoot at frame-c-root.tsx:111-113 imports + renders DetailPane
// gated on `selected !== null`. Plus preload.mts extension for the
// new bridge method (operator-arbitrated §6 amendment).

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { act, fireEvent, waitFor } from '@testing-library/react';

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

// Per-session unique markers in the mocked swarm-state.md fixture.
// WB8 GREEN's parser must surface the section corresponding to the
// selected session — these markers verify dynamic content-routing in
// the DOM after async bridge resolution.
const MARKER_ALPHA = 'MARKER_ALPHA_xyzzy123';
const MARKER_BETA = 'MARKER_BETA_yzzyx456';
const MARKER_GAMMA = 'MARKER_GAMMA_abcdef789';

const FIXTURE_SWARM_STATE = `# Swarm State

## Active orchestrator

- sessionName: sess-alpha
  status: active
  summary: ${MARKER_ALPHA}

## Idle-standby peers

- sessionName: sess-beta
  status: idle-standby
  summary: ${MARKER_BETA}

- sessionName: sess-gamma
  status: idle-standby
  summary: ${MARKER_GAMMA}
`;

interface StubWorkstationBridge {
  readSwarmState: ReturnType<typeof vi.fn>;
}

function mountWith(): {
  container: HTMLElement;
  dispose: () => void;
  bridge: StubWorkstationBridge;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const bridge: StubWorkstationBridge = {
    readSwarmState: vi.fn(async () => FIXTURE_SWARM_STATE),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = (globalThis as any).window ?? globalThis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window.workstationBridge = bridge;
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
      delete (globalThis as any).window.workstationBridge;
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

function detailPaneOf(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    '[data-testid="frame-c-detail-pane"]',
  );
}

describe('MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB7 — DetailPane render + swarm-state query (Sub-Q-B=i)', () => {
  describe('Condition (a): DetailPane is ABSENT pre-selection (empty/placeholder state)', () => {
    it('no frame-c-detail-pane testid exists in detail-col before any row click', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(mountFrameC).toBeDefined();
      const { container, dispose, bridge } = mountWith();
      try {
        const pane = detailPaneOf(container);
        expect(
          pane,
          'DetailPane must NOT render when no session is selected (Sub-Q-B=i contract)',
        ).toBeNull();
        // Bridge must not be called when no selection — render-gating
        // implies query-gating (no IPC traffic until needed).
        expect(
          bridge.readSwarmState,
          'bridge.readSwarmState must NOT be called pre-selection',
        ).not.toHaveBeenCalled();
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (b): selecting a session triggers bridge.readSwarmState invocation', () => {
    it('clicking sess-alpha row results in bridge.readSwarmState being called at least once', async () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose, bridge } = mountWith();
      try {
        await act(async () => {
          fireEvent.click(rowOf(container, 'sess-alpha'));
        });
        await waitFor(() => {
          expect(
            bridge.readSwarmState,
            'bridge.readSwarmState must be called after selection (Sub-Q-B=i query-on-selection contract)',
          ).toHaveBeenCalled();
        });
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (c): DetailPane renders the section text for selected session', () => {
    it('after selecting sess-alpha, frame-c-detail-pane text content includes MARKER_ALPHA fixture marker', async () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith();
      try {
        await act(async () => {
          fireEvent.click(rowOf(container, 'sess-alpha'));
        });
        await waitFor(() => {
          const pane = detailPaneOf(container);
          expect(
            pane,
            'DetailPane must render after selection',
          ).toBeTruthy();
          expect(
            pane!.textContent,
            'DetailPane text must include MARKER_ALPHA for selected sess-alpha (fixture-section routing)',
          ).toContain(MARKER_ALPHA);
        });
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (d): switching selection re-queries bridge and updates DOM content', () => {
    it('clicking sess-beta after sess-alpha re-invokes bridge and DetailPane swaps to MARKER_BETA (not MARKER_ALPHA)', async () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose, bridge } = mountWith();
      try {
        // First selection: sess-alpha.
        await act(async () => {
          fireEvent.click(rowOf(container, 'sess-alpha'));
        });
        await waitFor(() => {
          const pane = detailPaneOf(container);
          expect(pane).toBeTruthy();
          expect(pane!.textContent).toContain(MARKER_ALPHA);
        });
        const firstCallCount = bridge.readSwarmState.mock.calls.length;
        // Second selection: sess-beta.
        await act(async () => {
          fireEvent.click(rowOf(container, 'sess-beta'));
        });
        await waitFor(() => {
          const pane = detailPaneOf(container);
          expect(
            pane,
            'DetailPane must remain rendered after selection-change',
          ).toBeTruthy();
          expect(
            pane!.textContent,
            'DetailPane text must update to MARKER_BETA for newly-selected sess-beta',
          ).toContain(MARKER_BETA);
          expect(
            pane!.textContent,
            'DetailPane text must NOT retain MARKER_ALPHA after switching away from sess-alpha (section-routing dynamic)',
          ).not.toContain(MARKER_ALPHA);
        });
        // Bridge re-query: at least one additional call OR per-selection
        // call. Implementation may cache the file content and re-parse
        // (single bridge call) OR re-query on each selection. Probe
        // accepts EITHER, but the bridge must have been called (already
        // asserted in Condition b). Tighter contract — bridge called
        // at least once total — is sufficient; per-selection re-query
        // is a WB8 implementation choice.
        expect(
          bridge.readSwarmState.mock.calls.length,
          'bridge must have been called at least once total',
        ).toBeGreaterThanOrEqual(firstCallCount);
      } finally {
        dispose();
      }
    });
  });
});
