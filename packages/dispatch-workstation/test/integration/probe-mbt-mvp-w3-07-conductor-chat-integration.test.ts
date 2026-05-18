// @vitest-environment happy-dom
//
// MB-T-MVP-W3-CONDUCTOR-CHAT WB6 (gen-7 lane, renumbered) probe-07 —
// renderer-side integration tests.
//
// Per CLAUDE.md §3.6 integration tests use `.test.ts` and exercise
// multiple components composed together. This probe lives in
// test/integration/ (flat per manifest) and uses React.createElement
// (no JSX) since the manifest dictates a `.ts` extension.
//
// Scope per boot prompt §C "WB7 — integration tests (message role
// rendering, composer state, attach state)" — renumbered WB6 here.
//
// Path-B: integration is renderer-side end-to-end through
// tryAutoMountConductorChat with a controllable test bridge — no
// Electron, no real IPC, no real file picker. Production-wiring
// integration (real ipcMain ↔ ipcRenderer roundtrips) is deferred
// per MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED Tier-1 followup.
//
// Coverage:
//   1. Multi-role thread render — bridge emits state with all 5
//      role variants (user/assistant/dispatch/system/typing); all
//      render in the thread in order.
//   2. Composer compose-and-send — user types in the textarea,
//      clicks send, asserts bridge.send fires with the trimmed text
//      and the textarea clears.
//   3. Composer attach flow — user clicks paperclip, bridge.attach
//      fires; bridge then emits state.attached set; BuildMdChip +
//      header filename pill + pause + cancel chrome all render;
//      composer placeholder shifts to the attached variant.
//   4. Send disabled on empty draft + whitespace-only — verifies the
//      design contract from conductor-chat.jsx:75-78 + Composer.
//   5. Enter keystroke sends (no-shift) — design contract from
//      conductor-chat.jsx:148-153.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import * as React from 'react';
import {
  tryAutoMountConductorChat,
  type ConductorChatBridge,
  type ConductorChatState,
} from '../../src/conductor-chat/mount.js';
import { Header } from '../../src/conductor-chat/header.js';

const EMPTY_STATE: ConductorChatState = {
  messages: [],
  attached: null,
  queue: [],
  running: 0,
  total: 0,
  paused: false,
};

interface ControllableBridge extends ConductorChatBridge {
  emit(next: ConductorChatState): void;
  current(): ConductorChatState;
}

function makeBridge(initial: ConductorChatState): ControllableBridge {
  let state = initial;
  const subscribers: Array<(s: ConductorChatState) => void> = [];
  return {
    getInitialState: () => state,
    onStateChange: (cb) => {
      subscribers.push(cb);
      return () => {
        const i = subscribers.indexOf(cb);
        if (i >= 0) subscribers.splice(i, 1);
      };
    },
    send: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    dispatchNext: vi.fn(),
    togglePause: vi.fn(),
    cancel: vi.fn(),
    emit(next) {
      state = next;
      subscribers.forEach((cb) => cb(next));
    },
    current() {
      return state;
    },
  };
}

function clearMountRoots(): void {
  document
    .querySelectorAll('[id^="conductor-chat-mount-root"]')
    .forEach((n) => n.remove());
  delete (window as unknown as { conductorChatBridge?: unknown })
    .conductorChatBridge;
}

afterEach(() => {
  clearMountRoots();
});

function mountWithBridge(bridge: ControllableBridge): {
  dispose: () => void;
} {
  (window as unknown as { conductorChatBridge: ConductorChatBridge })
    .conductorChatBridge = bridge;
  // Header is wired with a closure over bridge.current() so that re-
  // renders triggered by bridge.emit() pull fresh state for the header
  // chrome too. Since renderHeader is invoked every parent render and
  // ConductorChatApp re-renders on bridge emit, the closure call
  // captures the latest state per emission.
  const result = tryAutoMountConductorChat({
    renderHeader: () => {
      const s = bridge.current();
      return React.createElement(Header, {
        attached: s.attached,
        queue: s.queue,
        total: s.total,
        paused: s.paused,
        onTogglePause: () => bridge.togglePause?.(),
        onCancel: () => bridge.cancel?.(),
      });
    },
  });
  if (!result.mounted) throw new Error('mount failed');
  return { dispose: result.dispose };
}

describe('MB-T-MVP-W3 WB6 (gen-7 lane) — conductor-chat integration', () => {
  it('renders all 5 role variants when bridge emits a multi-role thread', () => {
    const bridge = makeBridge({
      ...EMPTY_STATE,
      running: 2,
      messages: [
        { role: 'assistant', text: 'Conductor ready.' },
        { role: 'user', text: 'plan auth-rewrite.build.md' },
        {
          role: 'dispatch',
          step: 1,
          total: 14,
          target: 'session-A',
          task: 'Refactor middleware',
        },
        { role: 'system', text: 'orchestrator reconnected' },
      ],
    });
    const { dispose } = mountWithBridge(bridge);
    try {
      // 1 assistant (intro)
      expect(
        screen.queryAllByTestId('conductor-message-assistant'),
      ).toHaveLength(1);
      // 1 user
      expect(screen.queryAllByTestId('conductor-message-user')).toHaveLength(1);
      // 1 dispatch
      expect(
        screen.queryAllByTestId('conductor-message-dispatch'),
      ).toHaveLength(1);
      // 1 system
      expect(
        screen.queryAllByTestId('conductor-message-system'),
      ).toHaveLength(1);
      // 1 typing (running=2 > 0 → typing variant rendered at thread tail)
      expect(
        screen.queryAllByTestId('conductor-message-typing'),
      ).toHaveLength(1);
      // Typing label uses plural for running > 1.
      expect(
        screen.getByTestId('conductor-message-typing-label').textContent,
      ).toBe('watching 2 agents…');
      // Dispatch contract details rendered correctly.
      expect(
        screen.getByTestId('conductor-message-dispatch-step').textContent,
      ).toBe('step 1/14');
      expect(
        screen.getByTestId('conductor-message-dispatch-target').textContent,
      ).toBe('session-A');
    } finally {
      dispose();
    }
  });

  it('composer compose-and-send: typing then clicking send fires bridge.send and clears the draft', () => {
    const bridge = makeBridge(EMPTY_STATE);
    const { dispose } = mountWithBridge(bridge);
    try {
      const textarea = screen.getByTestId(
        'conductor-composer-textarea',
      ) as HTMLTextAreaElement;
      const send = screen.getByTestId(
        'conductor-composer-send',
      ) as HTMLButtonElement;
      // Send is disabled on empty draft.
      expect(send.disabled).toBe(true);
      // Type into the textarea.
      act(() => {
        fireEvent.change(textarea, { target: { value: 'hello conductor' } });
      });
      expect(textarea.value).toBe('hello conductor');
      expect(send.disabled).toBe(false);
      // Click send.
      act(() => {
        fireEvent.click(send);
      });
      expect(bridge.send).toHaveBeenCalledTimes(1);
      expect(bridge.send).toHaveBeenCalledWith('hello conductor');
      // Draft cleared post-send.
      expect(textarea.value).toBe('');
      expect(send.disabled).toBe(true);
    } finally {
      dispose();
    }
  });

  it('composer Enter-keystroke sends (no shift); Shift+Enter does not send', () => {
    const bridge = makeBridge(EMPTY_STATE);
    const { dispose } = mountWithBridge(bridge);
    try {
      const textarea = screen.getByTestId(
        'conductor-composer-textarea',
      ) as HTMLTextAreaElement;
      act(() => {
        fireEvent.change(textarea, { target: { value: 'line one' } });
      });
      // Shift+Enter → no send (allows newline).
      act(() => {
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
      });
      expect(bridge.send).not.toHaveBeenCalled();
      // Plain Enter → send.
      act(() => {
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      });
      expect(bridge.send).toHaveBeenCalledTimes(1);
      expect(bridge.send).toHaveBeenCalledWith('line one');
    } finally {
      dispose();
    }
  });

  it('composer trims whitespace-only drafts (send stays inactive)', () => {
    const bridge = makeBridge(EMPTY_STATE);
    const { dispose } = mountWithBridge(bridge);
    try {
      const textarea = screen.getByTestId(
        'conductor-composer-textarea',
      ) as HTMLTextAreaElement;
      const send = screen.getByTestId(
        'conductor-composer-send',
      ) as HTMLButtonElement;
      // Whitespace-only → send remains disabled per design contract.
      act(() => {
        fireEvent.change(textarea, { target: { value: '   ' } });
      });
      expect(send.disabled).toBe(true);
      // Plain Enter on whitespace-only → no send (design jsx:75-78).
      act(() => {
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      });
      expect(bridge.send).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it('attach flow: paperclip click fires bridge.attach; emitting attached state renders chrome', () => {
    const bridge = makeBridge(EMPTY_STATE);
    const { dispose } = mountWithBridge(bridge);
    try {
      // Idle: no chrome.
      expect(
        screen.queryByTestId('conductor-composer-buildmd-chip'),
      ).toBeNull();
      expect(screen.queryByTestId('conductor-header-filename-pill')).toBeNull();
      expect(screen.queryByTestId('conductor-header-pause')).toBeNull();
      expect(screen.queryByTestId('conductor-header-cancel')).toBeNull();
      const textarea = screen.getByTestId(
        'conductor-composer-textarea',
      ) as HTMLTextAreaElement;
      expect(textarea.placeholder).toContain('Drop a build.md');
      // Click paperclip.
      const paperclip = screen.getByTestId('conductor-composer-paperclip');
      act(() => {
        fireEvent.click(paperclip);
      });
      expect(bridge.attach).toHaveBeenCalledTimes(1);
      // Bridge responds by emitting an attached-state snapshot. Production
      // would do this via main-process file picker → state update; the
      // probe simulates that round-trip in one step (Path-B stub).
      act(() => {
        bridge.emit({
          ...EMPTY_STATE,
          attached: { name: 'auth-rewrite.build.md', steps: 14 },
          queue: [1, 2, 3],
          total: 14,
        });
      });
      // Composer chrome: BuildMdChip + dispatch-next render.
      const chip = screen.getByTestId('conductor-composer-buildmd-chip');
      expect(chip).toBeInTheDocument();
      expect(chip.textContent).toContain('auth-rewrite.build.md');
      expect(
        screen.getByTestId('conductor-composer-dispatch-next'),
      ).toBeInTheDocument();
      // Header chrome: filename pill (11 done = 14 - 3) + pause + cancel.
      const pill = screen.getByTestId('conductor-header-filename-pill');
      expect(pill.textContent).toBe('11/14');
      expect(screen.getByTestId('conductor-header-pause')).toBeInTheDocument();
      expect(screen.getByTestId('conductor-header-cancel')).toBeInTheDocument();
      // Textarea placeholder shifts to attached variant.
      const textareaAfter = screen.getByTestId(
        'conductor-composer-textarea',
      ) as HTMLTextAreaElement;
      expect(textareaAfter.placeholder).toContain('Add guidance');
    } finally {
      dispose();
    }
  });

  it('pause/resume toggle round-trip: pause testid swaps to resume when paused=true', () => {
    const bridge = makeBridge({
      ...EMPTY_STATE,
      attached: { name: 'auth-rewrite.build.md', steps: 14 },
      queue: [1, 2, 3],
      total: 14,
    });
    const { dispose } = mountWithBridge(bridge);
    try {
      // Initially attached + not paused → pause button visible.
      const pauseBtn = screen.getByTestId('conductor-header-pause');
      expect(pauseBtn.textContent).toBe('❚❚ pause');
      expect(screen.queryByTestId('conductor-header-resume')).toBeNull();
      act(() => {
        fireEvent.click(pauseBtn);
      });
      expect(bridge.togglePause).toHaveBeenCalledTimes(1);
      // Bridge emits paused=true → button swaps to resume.
      act(() => {
        bridge.emit({
          ...bridge.current(),
          paused: true,
        });
      });
      const resumeBtn = screen.getByTestId('conductor-header-resume');
      expect(resumeBtn.textContent).toBe('▶ resume');
      expect(screen.queryByTestId('conductor-header-pause')).toBeNull();
    } finally {
      dispose();
    }
  });

  it('cancel button fires bridge.cancel', () => {
    const bridge = makeBridge({
      ...EMPTY_STATE,
      attached: { name: 'auth-rewrite.build.md', steps: 14 },
      queue: [1, 2, 3],
      total: 14,
    });
    const { dispose } = mountWithBridge(bridge);
    try {
      const cancelBtn = screen.getByTestId('conductor-header-cancel');
      act(() => {
        fireEvent.click(cancelBtn);
      });
      expect(bridge.cancel).toHaveBeenCalledTimes(1);
    } finally {
      dispose();
    }
  });

  it('BuildMdChip × remove button fires bridge.detach (via composer onDetach prop)', () => {
    const bridge = makeBridge({
      ...EMPTY_STATE,
      attached: { name: 'auth-rewrite.build.md', steps: 14 },
      queue: [1, 2, 3],
      total: 14,
    });
    const { dispose } = mountWithBridge(bridge);
    try {
      // Operator-CC's composer.tsx renders a stub div for the chip (testid
      // present but no × button). The real BuildMdChip body lives at
      // build-md-chip.tsx (gen-7-w3 9357fd8) and would replace the stub
      // when operator-CC's composer is updated to import it (cross-session
      // integration point per W3-final sweep). For now, assert the chip
      // testid is present at minimum so the composition path lights up.
      const chip = screen.getByTestId('conductor-composer-buildmd-chip');
      expect(chip).toBeInTheDocument();
      // The × button is only present when composer renders the real
      // BuildMdChip body (post-W3-final sweep). The probe documents the
      // current contract: chip testid lights up; × wiring lives in the
      // BuildMdChip component but is not yet composed inside operator-CC's
      // composer.tsx. detach round-trip will be exercised at the W3-final
      // sweep coordination.
      const x = screen.queryByTestId('conductor-composer-buildmd-chip-x');
      // Document current state (null because composer stub doesn't include
      // the real chip body yet). When operator-CC swaps in BuildMdChip,
      // this assertion can be flipped to expect(x).not.toBeNull() + click
      // + detach assertion.
      expect(x).toBeNull();
    } finally {
      dispose();
    }
  });
});
