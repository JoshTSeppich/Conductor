// MB-T40 WB2 GREEN — PTY stream relay (main-process side).
//
// registerPtyRelay subscribes to the PTY broadcaster (ConsoleIpcController
// addStdoutObserver tap, MB-T37 WB2), filters for '__orchestrator_active',
// forwards per-chunk via 'coarchitect:ptyChunk', and fires
// 'coarchitect:ptyTurnDone' after outer quiescence (default 3000ms) or
// immediately when a complete [ACTION:type]...[/ACTION] block is detected.
//
// A4 re-arbitration (operator 2026-05-09): separate file, NOT inline in
// coarchitect-ipc.ts, to enable unit testing without importing the full
// IPC surface with 15+ transitive Electron deps.
//
// Q-MBT40-4(c): plain text format for action markers (no OrchestratorCard
// cross-package import); ptyTurnDone payload carries reconstructed block text.

import { parseActionMarker } from '../coarchitect/chat-content-markers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Dependency interfaces (structural, testable without Electron imports)
// ─────────────────────────────────────────────────────────────────────────────

export interface IConsoleBroadcaster {
  addStdoutObserver(fn: (sessionName: string, chunk: string) => void): () => void;
}

export interface IWebContents {
  send(channel: string, payload?: unknown): void;
}

export interface PtyRelayDeps {
  broadcaster: IConsoleBroadcaster;
  getWebContents: () => IWebContents[];
  outerQuiescenceMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// registerPtyRelay
// ─────────────────────────────────────────────────────────────────────────────

export function registerPtyRelay(deps: PtyRelayDeps): () => void {
  const { broadcaster, getWebContents, outerQuiescenceMs = 3000 } = deps;

  let ptyBuffer = '';
  let ptyOuterQuiescenceTimer: ReturnType<typeof setTimeout> | null = null;

  const disposeObserver = broadcaster.addStdoutObserver((sessionName, chunk) => {
    // Q-MBT40-2(a): hardcoded __orchestrator_active filter
    if (sessionName !== '__orchestrator_active') return;

    // Forward raw chunk per-chunk to all renderer webContents (Q-MBT40-5(a))
    for (const wc of getWebContents()) {
      wc.send('coarchitect:ptyChunk', chunk);
    }

    ptyBuffer += chunk;

    // parseActionMarker fast-path: complete [ACTION:type]...[/ACTION] →
    // fire ptyTurnDone immediately (before outer quiescence)
    const marker = parseActionMarker(ptyBuffer);
    if (marker !== null) {
      // Q-MBT40-4(c): plain text reconstruction; no cross-package OrchestratorCard import
      const formatted =
        `[ACTION:${marker.actionType}]\n` +
        Object.entries(marker.fields)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n') +
        '\n[/ACTION]';
      for (const wc of getWebContents()) {
        wc.send('coarchitect:ptyTurnDone', formatted);
      }
      ptyBuffer = '';
      if (ptyOuterQuiescenceTimer !== null) {
        clearTimeout(ptyOuterQuiescenceTimer);
        ptyOuterQuiescenceTimer = null;
      }
      return;
    }

    // Outer quiescence debounce: each chunk resets the timer
    if (ptyOuterQuiescenceTimer !== null) {
      clearTimeout(ptyOuterQuiescenceTimer);
    }
    ptyOuterQuiescenceTimer = setTimeout(() => {
      ptyOuterQuiescenceTimer = null;
      const text = ptyBuffer;
      ptyBuffer = '';
      for (const wc of getWebContents()) {
        wc.send('coarchitect:ptyTurnDone', text);
      }
    }, outerQuiescenceMs);
  });

  return () => {
    disposeObserver();
    if (ptyOuterQuiescenceTimer !== null) {
      clearTimeout(ptyOuterQuiescenceTimer);
      ptyOuterQuiescenceTimer = null;
    }
  };
}
