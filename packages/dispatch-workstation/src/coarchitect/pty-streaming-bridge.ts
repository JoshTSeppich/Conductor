// MB-T40 WB2 GREEN — PtyStreamingBridgeImpl: renderer-side StreamingBridge.
//
// Implements StreamingBridge interface (chat-panel.tsx) backed by the PTY
// broadcaster (ConsoleIpcController addStdoutObserver tap). Accumulates
// per-chunk output from __orchestrator_active; fires onStreamChunk callbacks
// per chunk and onStreamDone callbacks on outer quiescence or action-marker
// fast-path (mirrors pty-stream-relay.ts logic for renderer-side / test use).
//
// sendAndStream routes via ipcRenderer.invoke('workstation:session-send-prompt')
// per Q-MBT40-3(a): hardcoded __orchestrator_active sessionName.
//
// onStreamError is a no-op stub per A3 ratification (PTY model has no stream
// error semantics distinct from PTY session lifecycle).
//
// A4 re-arbitration (operator 2026-05-09): separate file from coarchitect-ipc.ts
// to enable unit testing in happy-dom without 15+ transitive Electron deps.
// start()/dispose() lifecycle mirrors PeerSummaryHarvester placement pattern.

import { ipcRenderer } from 'electron';
import { parseActionMarker } from './chat-content-markers.js';
import type { StreamingBridge } from './chat-panel.js';

export interface IConsoleBroadcaster {
  addStdoutObserver(fn: (sessionName: string, chunk: string) => void): () => void;
}

export class PtyStreamingBridgeImpl implements StreamingBridge {
  private readonly broadcaster: IConsoleBroadcaster;
  private readonly outerQuiescenceMs: number;
  private disposeObserver: (() => void) | null = null;
  private ptyBuffer = '';
  private outerQuiescenceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly chunkCbs: Array<(chunk: string) => void> = [];
  private readonly doneCbs: Array<(text: string) => void> = [];

  constructor(deps: { broadcaster: IConsoleBroadcaster; outerQuiescenceMs?: number }) {
    this.broadcaster = deps.broadcaster;
    this.outerQuiescenceMs = deps.outerQuiescenceMs ?? 3000;
  }

  start(): void {
    this.disposeObserver = this.broadcaster.addStdoutObserver((sessionName, chunk) => {
      if (sessionName !== '__orchestrator_active') return;

      for (const cb of this.chunkCbs) cb(chunk);
      this.ptyBuffer += chunk;

      const marker = parseActionMarker(this.ptyBuffer);
      if (marker !== null) {
        const formatted =
          `[ACTION:${marker.actionType}]\n` +
          Object.entries(marker.fields)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n') +
          '\n[/ACTION]';
        for (const cb of this.doneCbs) cb(formatted);
        this.ptyBuffer = '';
        if (this.outerQuiescenceTimer !== null) {
          clearTimeout(this.outerQuiescenceTimer);
          this.outerQuiescenceTimer = null;
        }
        return;
      }

      if (this.outerQuiescenceTimer !== null) clearTimeout(this.outerQuiescenceTimer);
      this.outerQuiescenceTimer = setTimeout(() => {
        this.outerQuiescenceTimer = null;
        const text = this.ptyBuffer;
        this.ptyBuffer = '';
        for (const cb of this.doneCbs) cb(text);
      }, this.outerQuiescenceMs);
    });
  }

  dispose(): void {
    if (this.disposeObserver !== null) {
      this.disposeObserver();
      this.disposeObserver = null;
    }
    if (this.outerQuiescenceTimer !== null) {
      clearTimeout(this.outerQuiescenceTimer);
      this.outerQuiescenceTimer = null;
    }
  }

  sendAndStream(content: string): void {
    // Q-MBT40-3(a): hardcoded __orchestrator_active; invoke (not send) for
    // request-response semantics consistent with workstation:session-send-prompt
    void ipcRenderer.invoke('workstation:session-send-prompt', {
      sessionName: '__orchestrator_active',
      prompt: content,
    });
  }

  onStreamChunk(cb: (chunk: string) => void): () => void {
    this.chunkCbs.push(cb);
    return () => {
      const i = this.chunkCbs.indexOf(cb);
      if (i !== -1) this.chunkCbs.splice(i, 1);
    };
  }

  onStreamDone(cb: (text: string) => void): () => void {
    this.doneCbs.push(cb);
    return () => {
      const i = this.doneCbs.indexOf(cb);
      if (i !== -1) this.doneCbs.splice(i, 1);
    };
  }

  onStreamError(_cb: (err: { code: string; message: string }) => void): () => void {
    // A3 ratification: PTY model has no stream error semantics; no-op stub
    return () => {};
  }
}
