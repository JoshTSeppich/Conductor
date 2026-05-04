// MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT — renderer entry for the
// onboarding modal.
//
// Bundled to dist/onboarding/renderer.js by scripts/build-onboarding.mjs.
// Loaded by dist/onboarding/onboarding.html in the BrowserWindow created
// by main.ts via electronOnboardingDeps (see onboarding-mount.ts).
//
// Wires the OnboardingModal component (unit-tested in cluster 2 — 19
// specs in test/unit/mb-t08/) to the production IPC surface via
// window.onboardingBridge (exposed by preload-onboarding.cjs).
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { OnboardingModal } from './onboarding-modal.js';

interface OnboardingBridge {
  saveApiKey(plaintextKey: string): Promise<void>;
  complete(): Promise<void>;
}

declare global {
  interface Window {
    onboardingBridge?: OnboardingBridge;
  }
}

const ROOT_ID = 'onboarding-root';

function mount(): void {
  const rootEl = document.getElementById(ROOT_ID);
  if (!rootEl) {
    // Stand-alone dev-preview path: surface a clear message rather than
    // crashing if the HTML structure is wrong.
    document.body.textContent = `#${ROOT_ID} not found in onboarding.html`;
    return;
  }

  const bridge = window.onboardingBridge;
  if (!bridge) {
    rootEl.textContent =
      'window.onboardingBridge not available — open via Workstation app, not standalone.';
    return;
  }

  const root = createRoot(rootEl);
  root.render(
    createElement(OnboardingModal, {
      onSaveApiKey: (plaintextKey: string) => bridge.saveApiKey(plaintextKey),
      onComplete: () => {
        // Fire-and-forget: completion IPC also triggers the main-process
        // adapter (electronOnboardingDeps) to close the window. No need
        // to await before render exits because the window itself is
        // about to be torn down.
        void bridge.complete();
      },
    }),
  );
}

mount();
