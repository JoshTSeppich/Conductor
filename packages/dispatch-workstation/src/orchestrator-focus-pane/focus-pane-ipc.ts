// MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE WB2 — Renderer-side IPC consumer.
//
// Arbitration Q-MVP-W1-1=(a) (operator ack 17:55 MDT): reuse the existing
// `coarchitect:ptyChunk` broadcast emitted by src/main/pty-stream-relay.ts:52.
// pty-stream-relay already filters for `__orchestrator_active` on the
// main-process side (line 48), so this renderer-side consumer receives only
// orchestrator chunks; no additional filter is required.
//
// No new IPC channel is introduced by this WB. No WORKSTATION_CONTRACT.md §6
// amendment is needed. (See findings doc for the channel-documentation gap
// followup row MB-F-COARCHITECT-PTYCHUNK-CHANNEL-DOCUMENTATION.)

/**
 * Structural seam over the renderer-side PTY chunk broadcast. Production
 * wires this to `window.coarchitectBridge.onStreamChunk` via
 * `getDefaultPtyChunkBridge()`; tests inject a fake bridge.
 */
export interface PtyChunkBridge {
  onPtyChunk(cb: (chunk: string) => void): () => void;
}

/**
 * Subscribe a target (e.g. TerminalAdapter) to receive each emitted chunk via
 * `target.write(chunk)`. Returns a cleanup-fn that unsubscribes the listener
 * from the bridge. Pure-fn surface — no DOM, no React.
 */
export function consumePtyChunkStream(
  bridge: PtyChunkBridge,
  target: { write(chunk: string): void },
): () => void {
  return bridge.onPtyChunk((chunk) => {
    target.write(chunk);
  });
}

interface CoarchitectBridgeLike {
  onStreamChunk(cb: (chunk: string) => void): () => void;
}

/**
 * Production factory: wraps `window.coarchitectBridge.onStreamChunk`
 * (exposed by src/main/preload.mts:25-30) into a PtyChunkBridge. Returns
 * null when the bridge is unavailable (non-renderer context OR preload not
 * yet exposed). The renderer-side mount path should treat null as a no-op
 * (the focus-pane simply does not stream).
 */
export function getDefaultPtyChunkBridge(): PtyChunkBridge | null {
  const candidate = (globalThis as { coarchitectBridge?: unknown }).coarchitectBridge;
  if (
    candidate === null ||
    candidate === undefined ||
    typeof (candidate as Partial<CoarchitectBridgeLike>).onStreamChunk !== 'function'
  ) {
    return null;
  }
  const bridge = candidate as CoarchitectBridgeLike;
  return {
    onPtyChunk: (cb) => bridge.onStreamChunk(cb),
  };
}
