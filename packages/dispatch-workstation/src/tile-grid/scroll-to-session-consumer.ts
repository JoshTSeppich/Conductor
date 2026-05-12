// MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING (FOLLOWUPS.md row 333,
// Tier 3) renderer-side integration anchor — c5 ticket.
//
// Pure-fn module: subscribe TileGridApp to `frame-c:scroll-to-session`
// payloads via the workstation bridge. The bridge method
// `onScrollToSession` is optional — when undefined (production at HEAD;
// preload.mts has not yet shipped a subscribe-style API), this module
// returns a no-op cleanup so TileGridApp's useEffect stays stable
// across the bridge-extension lifecycle.
//
// Payload shape mirrors the main-process emit at main.ts:594:
//   mainWindow?.webContents.send('frame-c:scroll-to-session',
//     { sessionName });
// and the ScrollEmitter dep contract in frame-c-ipc.ts:43-46.
//
// Out-of-c5-territory downstream wiring:
//   - preload.mts extension exposing `onScrollToSession` (subscribe-
//     style API; current frameCBridge exposes only invoke-style methods).
//   - tile-grid.tsx visual scroll/highlight implementation when payload
//     arrives (e.g., scroll the matching tile into view + briefly
//     highlight via CSS class).
//
// Until those downstream pieces ship, TileGridApp's
// `_lastScrollTargetSessionName` state holds the most-recent
// session name but does not yet trigger visual scroll/highlight.
// The anchor closure is the contract handoff — see
// docs/coordination/coord-c5-tilegrid-wiring-2026-05-12.md for the
// end-to-end picture across c5 + downstream tickets.

export interface ScrollToSessionPayload {
  readonly sessionName: string;
}

export interface ScrollToSessionBridge {
  /** Subscribe to `frame-c:scroll-to-session` payloads emitted from
   *  the main process (Frame-C `focus` action handler at
   *  frame-c-ipc.ts:335 emits, main.ts:594 fan-out via webContents.send).
   *  Returns a cleanup function. */
  onScrollToSession?: (
    cb: (payload: ScrollToSessionPayload) => void,
  ) => () => void;
}

export function subscribeToScrollToSession(
  bridge: ScrollToSessionBridge,
  callback: (payload: ScrollToSessionPayload) => void,
): () => void {
  if (!bridge.onScrollToSession) return () => {};
  return bridge.onScrollToSession(callback);
}
