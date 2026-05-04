// MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT — main-process side of the
// onboarding renderer mount.
//
// The OnboardingModal React component (src/onboarding/onboarding-modal.tsx,
// 19 specs in test/unit/mb-t08/) and the IPC channels
// `workstation:onboarding-save-api-key` + `workstation:onboarding-complete`
// (registered by main.ts:registerOnboardingIpc at d39f35d) ship MB-T08.
// What was missing for vision §8.1 ship-gate is the production
// renderer bundle + a main-process orchestrator that opens a BrowserWindow
// for it on first launch and tears it down on operator completion.
//
// This module ships two thin orchestration surfaces:
//
//   checkFirstLaunch({ configDir }) — async wrapper on first-launch-
//     detector.isFirstLaunch so main.ts's app.whenReady().then(async ...)
//     chain awaits uniformly. Defers to the existing detector (no logic
//     duplication; cluster-1 unit specs already exhaust the predicate).
//
//   mountOnboarding(deps) — opens the onboarding window via the injected
//     factory, loads onboarding.html, awaits the completion signal, then
//     closes the window. Dependencies are injected so orchestration is
//     unit-testable without booting Electron.
//
//   runOnboardingIfNeeded({ configDir, ...deps }) — gating helper so
//     main.ts's sentinel-marked region collapses to a single call:
//       await runOnboardingIfNeeded({ configDir: configDir(), ...deps });
//     This keeps Session-C's main.ts ownership window narrow per
//     scaffold §2.2 rebase-contention discipline.
//
// Production wires this against Electron's BrowserWindow + ipcMain in
// the Electron-only adapter exported below (`electronOnboardingDeps`).
// The adapter is the only Electron-touching code path in the module so
// the unit tests stay node-environment compatible.
import type { BrowserWindow as ElectronBrowserWindow } from 'electron';
import { BrowserWindow, ipcMain } from 'electron';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isFirstLaunch } from '../onboarding/first-launch-detector.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Filename of the onboarding HTML page (bundled into dist/onboarding/). */
export const ONBOARDING_HTML_FILENAME = 'onboarding.html';

/** Absolute path to the bundled onboarding HTML, relative to dist/main. */
export const ONBOARDING_HTML_PATH = resolve(
  __dirname,
  '..',
  'onboarding',
  ONBOARDING_HTML_FILENAME,
);

/**
 * Window-handle abstraction over Electron's BrowserWindow. mountOnboarding
 * accepts this shape so unit tests inject a fake without bringing up
 * Electron. Production wiring (electronOnboardingDeps) returns the real
 * BrowserWindow wrapped in this shape.
 */
export interface OnboardingWindowHandle {
  loadFile(path: string): Promise<void>;
  close(): void;
}

/**
 * Injected dependencies for the mount orchestration. Tests provide fakes
 * that record call-counts; production wires Electron's BrowserWindow +
 * ipcMain.handleOnce for the completion signal.
 */
export interface OnboardingMountDeps {
  /** Creates the onboarding modal window (no parent — main window is
   *  created AFTER onboarding completes per existing main.ts ordering). */
  createOnboardingWindow(): OnboardingWindowHandle;
  /** Resolves when the renderer has fired
   *  workstation:onboarding-complete (or the window otherwise signals
   *  completion). */
  awaitOnComplete(handle: OnboardingWindowHandle): Promise<void>;
}

/**
 * True when the operator has not completed onboarding (config missing,
 * malformed, or onboardingCompleted !== true). Defers to first-launch-
 * detector.isFirstLaunch; wrapped in async so the main.ts gate can
 * `await` uniformly with the rest of the app.whenReady chain.
 */
export async function checkFirstLaunch(opts: { configDir: string }): Promise<boolean> {
  return isFirstLaunch(opts);
}

/**
 * Opens the onboarding window via the injected factory, loads
 * onboarding.html, awaits the completion signal, then closes the window.
 * Resolves when onboarding is done; rejects if loadFile fails (so a
 * malformed bundle surfaces immediately rather than hanging the app
 * launch).
 */
export async function mountOnboarding(deps: OnboardingMountDeps): Promise<void> {
  const handle = deps.createOnboardingWindow();
  await handle.loadFile(ONBOARDING_HTML_PATH);
  await deps.awaitOnComplete(handle);
  handle.close();
}

/**
 * Composite gate + mount. Returns true if the modal was shown, false if
 * the operator has already completed onboarding (no-op).
 */
export async function runOnboardingIfNeeded(
  opts: { configDir: string } & OnboardingMountDeps,
): Promise<boolean> {
  const needed = await checkFirstLaunch({ configDir: opts.configDir });
  if (!needed) return false;
  await mountOnboarding({
    createOnboardingWindow: opts.createOnboardingWindow,
    awaitOnComplete: opts.awaitOnComplete,
  });
  return true;
}

// ── Electron-only adapter ───────────────────────────────────────────────
//
// Production wires runOnboardingIfNeeded against this adapter:
//   await runOnboardingIfNeeded({
//     configDir: configDir(),
//     ...electronOnboardingDeps(),
//   });
//
// The adapter creates a real Electron BrowserWindow, loads the bundled
// onboarding.html, and listens once for the workstation:onboarding-
// complete IPC. The IPC channel itself is registered by
// registerOnboardingIpc in main.ts (which invokes saveApiKey +
// markOnboardingComplete on the main thread); this adapter simply waits
// for the channel to fire and resolves so the orchestrator can close the
// window.

const ONBOARDING_WINDOW_DEFAULTS = {
  width: 560,
  height: 520,
  resizable: false,
  minimizable: false,
  maximizable: false,
  fullscreenable: false,
  show: true,
  title: 'Foxworks Workstation — Setup',
} as const;

export interface ElectronOnboardingAdapterOpts {
  /** Absolute path to the compiled preload.cjs script. */
  preloadPath: string;
}

/**
 * Production Electron-touching adapter. Returns a {createOnboardingWindow,
 * awaitOnComplete} pair that wires real BrowserWindow + ipcMain. Called
 * from main.ts inside the sentinel-marked Onboarding mount region.
 */
export function electronOnboardingDeps(
  opts: ElectronOnboardingAdapterOpts,
): OnboardingMountDeps {
  let realWindow: ElectronBrowserWindow | null = null;

  return {
    createOnboardingWindow(): OnboardingWindowHandle {
      const win = new BrowserWindow({
        ...ONBOARDING_WINDOW_DEFAULTS,
        webPreferences: {
          preload: opts.preloadPath,
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });
      realWindow = win;
      return {
        loadFile: (p: string) => win.loadFile(p),
        close: () => {
          if (!win.isDestroyed()) win.close();
          realWindow = null;
        },
      };
    },
    awaitOnComplete(): Promise<void> {
      return new Promise<void>((resolveP) => {
        const channel = 'workstation:onboarding-complete';
        // Listen for the completion fire. The IPC channel is also
        // handled by registerOnboardingIpc which performs the
        // markOnboardingComplete persistence; this listener is
        // additive and only resolves the orchestrator promise. Using
        // ipcMain.once so multiple onboarding sessions in one app
        // lifetime (rare — onboarding is a once-per-install flow)
        // don't double-fire.
        const listener = (): void => {
          resolveP();
        };
        ipcMain.once(channel, listener);

        // Also resolve if the operator closes the onboarding window
        // (Cmd+Q / window-close) so the main launch chain does not
        // hang. The detector still returns isFirstLaunch=true on next
        // launch because markOnboardingComplete was not called; the
        // operator gets the modal again on the next start, which is
        // the correct UX (close-without-finishing should not silently
        // mark onboarding done).
        if (realWindow) {
          realWindow.once('closed', () => {
            ipcMain.removeListener(channel, listener);
            resolveP();
          });
        }
      });
    },
  };
}
