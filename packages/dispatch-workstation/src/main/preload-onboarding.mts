// MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT — preload for the onboarding modal
// BrowserWindow.
//
// Onboarding runs in its own BrowserWindow (no parent — main shell is
// created AFTER onboarding completes, see onboarding-mount.ts). That
// window does NOT need the kanban / spawn / coarchitect / console
// bridges that the main shell's preload exposes; it only needs to
// invoke the two onboarding IPC channels already registered by
// main.ts:registerOnboardingIpc (d39f35d):
//   - workstation:onboarding-save-api-key  (encrypts + persists key)
//   - workstation:onboarding-complete      (markOnboardingComplete)
//
// Keeping the onboarding preload separate from preload.mts (least-
// privilege) means a compromised onboarding renderer cannot reach the
// daemon-touching invoke paths exposed to the main shell. This file
// is bundled to dist/main/preload-onboarding.cjs by build-onboarding.mjs
// (same CJS pattern as build-preload.mjs — Electron sandboxed preloads
// must be CJS, see MB-F-ZIPPER-2-ESM-PRELOAD).
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('onboardingBridge', {
  saveApiKey: (plaintextKey: string) =>
    ipcRenderer.invoke('workstation:onboarding-save-api-key', plaintextKey),
  complete: () => ipcRenderer.invoke('workstation:onboarding-complete'),
});
