// @vitest-environment happy-dom
//
// MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING closure (a) — WB3 RED.
//
// Contract spec: FrameCRoot's `onSpawnResult` subscription
// (frame-c-root.tsx :209-231) must capture `spawnMode` from the
// SpawnSuccessReply envelope (WB2 GREEN landed `result.spawnMode` at
// spawn-handler.ts) and write it into the new TileGridSessionEntry
// (WB1 GREEN at 228a2da landed `spawnMode?: 'auto' | 'ask'` on the
// entry). FrameCRoot must also pass `spawnMode={selectedEntry?.spawnMode}`
// to DetailPane (frame-c-root.tsx :287-296) so the bypass-perms
// indicator gate at action-bar.tsx :128-132 fires end-to-end.
//
// Observable target: `[data-testid="action-bar-bypass-perms-indicator"]`
// renders in the DOM iff the selected session's spawnMode === 'auto'
// (T3 WB8 contract at commit e713cbd; verified at action-bar.tsx :128).
//
// 3 conditions:
//   (1) spawn-result with spawnMode='auto' + pinned selection → indicator
//       EXISTS in DOM. RED at HEAD: FrameCRoot does not extract spawnMode
//       from the reply parser; DetailPane render does not forward
//       spawnMode; indicator hidden ⇒ FAIL.
//   (2) spawn-result with spawnMode='ask' + pinned selection → indicator
//       ABSENT. RED at HEAD: same plumbing gap, so indicator-absent
//       coincidentally holds — passes RED as a regression guard for
//       the GREEN transition (must remain absent at GREEN; verifies the
//       conditional gate is faithful to mode, not always-on).
//   (3) spawn-result without spawnMode + pinned selection → indicator
//       ABSENT (ship-shy fallback). RED + GREEN both passing — verifies
//       the absent-data semantics survive the closure (a) GREEN flip.
//
// JSX is avoided in this probe so the .spec.ts extension matches the
// manifest glob `probe-spawnmode-*.spec.ts` verbatim; FrameCRoot is
// constructed via React.createElement. Equivalent to JSX render under
// @testing-library/react.

import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { render, act } from '@testing-library/react';
import { FrameCRoot } from '../../../src/frame-c/frame-c-root.js';

interface MockBridge {
  onSpawnResult(cb: (reply: unknown) => void): () => void;
  emit(reply: unknown): void;
}

function createMockBridge(): MockBridge {
  let captured: ((reply: unknown) => void) | null = null;
  return {
    onSpawnResult(cb) {
      captured = cb;
      return () => {
        captured = null;
      };
    },
    emit(reply) {
      if (captured) captured(reply);
    },
  };
}

function emitSpawn(
  bridge: MockBridge,
  sessionName: string,
  spawnMode?: 'auto' | 'ask',
): void {
  act(() => {
    bridge.emit({
      type: 'success',
      result: {
        sessionName,
        ...(spawnMode !== undefined ? { spawnMode } : {}),
      },
    });
  });
}

function mountFrameC(
  selectedSessionName: string | null,
): { bridge: MockBridge; container: HTMLElement; unmount: () => void } {
  const bridge = createMockBridge();
  const { container, unmount } = render(
    createElement(FrameCRoot, {
      workstationBridge: bridge,
      selectedSessionName,
    }),
  );
  return { bridge, container, unmount };
}

describe('MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING (a) — WB3 FrameCRoot consumer pass-through', () => {
  it('(1) spawnMode "auto" in reply + pinned selection → bypass-perms indicator renders', () => {
    const { bridge, container, unmount } = mountFrameC('sess-auto');
    try {
      emitSpawn(bridge, 'sess-auto', 'auto');
      const indicator = container.querySelector(
        '[data-testid="action-bar-bypass-perms-indicator"]',
      );
      expect(
        indicator,
        'WB3 GREEN: indicator must render when reply.result.spawnMode === "auto" threads through FrameCRoot → entry.spawnMode → DetailPane → ActionBar',
      ).not.toBeNull();
    } finally {
      unmount();
    }
  });

  it('(2) spawnMode "ask" in reply + pinned selection → bypass-perms indicator absent', () => {
    const { bridge, container, unmount } = mountFrameC('sess-ask');
    try {
      emitSpawn(bridge, 'sess-ask', 'ask');
      const indicator = container.querySelector(
        '[data-testid="action-bar-bypass-perms-indicator"]',
      );
      expect(
        indicator,
        'indicator must NOT render when spawnMode === "ask" (ActionBar gate at action-bar.tsx:128)',
      ).toBeNull();
    } finally {
      unmount();
    }
  });

  it('(3) spawn-result without spawnMode field + pinned selection → indicator absent (ship-shy fallback preserved)', () => {
    const { bridge, container, unmount } = mountFrameC('sess-undef');
    try {
      emitSpawn(bridge, 'sess-undef' /* no spawnMode */);
      const indicator = container.querySelector(
        '[data-testid="action-bar-bypass-perms-indicator"]',
      );
      expect(
        indicator,
        'indicator must NOT render when spawnMode is absent — ship-shy default per T3 WB8 + FOLLOWUPS.md:332 fallback (b)',
      ).toBeNull();
    } finally {
      unmount();
    }
  });
});
