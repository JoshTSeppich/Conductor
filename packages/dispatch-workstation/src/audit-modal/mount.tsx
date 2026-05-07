// MB-T13 WB8: AuditModal renderer mount entry.
//
// Bundled to dist/audit-modal/renderer.js by scripts/build-audit-modal.mjs.
// Loaded by dist/audit-modal/audit-modal.html in the BrowserWindow that
// main.ts opens when the operator clicks View → Show recent orchestrator
// actions.
//
// Wires AuditModal to the production IPC surface via
// window.workstationBridge.fetchAuditModal (exposed by preload.mts —
// reused unchanged for the audit-modal window per WB8 minimum-scope
// design; least-privilege preload deferred as followup if needed).

import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { AuditModal, type AuditModalBridge } from './audit-modal.js';

interface WorkstationBridge extends AuditModalBridge {
  // Other workstationBridge methods are available but unused here.
}

declare global {
  interface Window {
    workstationBridge?: WorkstationBridge;
  }
}

const ROOT_ID = 'audit-modal-root';

function mount(): void {
  const rootEl = document.getElementById(ROOT_ID);
  if (!rootEl) {
    document.body.textContent = `#${ROOT_ID} not found in audit-modal.html`;
    return;
  }

  const bridge = window.workstationBridge;
  if (!bridge) {
    rootEl.textContent =
      'window.workstationBridge not available — open via Workstation app, not standalone.';
    return;
  }

  createRoot(rootEl).render(createElement(AuditModal, { bridge }));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
