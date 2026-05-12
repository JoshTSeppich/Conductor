// MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11 (Tier 2)
// renderer-side integration anchor — c5 ticket.
//
// Pure-fn module: subscribe TileGridApp to frame-mode changes via the
// workstation bridge. The bridge method `onFrameModeChange` is optional
// — when undefined (production at HEAD; preload.mts has not yet shipped
// an `onFrameModeChange` subscribe-style API), this module returns a
// no-op cleanup so TileGridApp's useEffect stays stable regardless of
// the bridge-extension lifecycle.
//
// Out-of-c5-territory downstream wiring:
//   - `preload.mts` extension exposing `onFrameModeChange` (subscribe-
//     style API; current frameModeBridge has only invoke-style methods).
//   - `main.ts` emit on every `writeFrameMode` (e.g., via
//     mainWindow.webContents.send('frame-mode:changed', { mode })) so
//     the renderer receives change notifications.
//   - `tile-grid.tsx` + `tile.tsx` frameMode prop pass-through so the
//     compact-tile-mode visual contract activates end-to-end.
//
// Until those downstream pieces ship, TileGridApp's `frameMode` state
// is a renderer-side anchor: it holds the subscribed mode + flips on
// future emit, but does not yet propagate visually to inner <Tile>
// children. The anchor closure is the contract handoff — see
// docs/coordination/coord-c5-tilegrid-wiring-2026-05-12.md for the
// end-to-end picture across c5 + downstream tickets.

import type { FrameMode } from '../main/frame-mode-state.js';

export interface FrameModeBridge {
  /** Subscribe to frame-mode change notifications. Production wiring
   *  (out of c5 territory) emits on every `writeFrameMode` call from
   *  the main process (e.g., from the `frame-c:focus` handler that
   *  toggles FrameMode to 'A'). Returns a cleanup function. */
  onFrameModeChange?: (cb: (mode: FrameMode) => void) => () => void;
}

export function subscribeToFrameMode(
  bridge: FrameModeBridge,
  callback: (mode: FrameMode) => void,
): () => void {
  if (!bridge.onFrameModeChange) return () => {};
  return bridge.onFrameModeChange(callback);
}
