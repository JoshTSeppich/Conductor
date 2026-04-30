import type { BrowserWindow } from 'electron';

/**
 * Dev-server URL for dispatch-web per UI-S03 ADR §1 click-handler pattern.
 * Value: 'http://localhost:7878'
 * Production-mode loading is NOT in scope for MB-T02 — deferred to MB-T08
 * per IMPORTANT-5 operator resolution 2026-04-30.
 */
export const WEB_UI_URL = 'http://localhost:7878';

/**
 * Loads the dispatch-web SPA dev-server into an existing BrowserWindow.
 * Resolves when BrowserWindow.loadURL() resolves (mirrors its Promise contract).
 * Dev-mode only. No production-mode fallback in this module.
 */
export function loadDispatchWeb(win: BrowserWindow): Promise<void> {
  return win.loadURL(WEB_UI_URL);
}
