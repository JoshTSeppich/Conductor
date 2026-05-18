// @vitest-environment happy-dom
//
// MB-T-MVP-CONDUCTOR-CHAT-MOUNT-WIRING WB1 (RED) — probe-01: mount-entry
// auto-mount on DOMContentLoaded.
//
// Closes MB-F-W3-FINAL-PRODUCTION-CHAT-REGION-BLANK-UNTIL-EXPANSION-2
// (FOLLOWUPS row 401) via Q1(d) render-only mount-wiring path per
// operator arbitration: a separate `src/conductor-chat/mount-entry.ts`
// module imports tryAutoMountConductorChat from mount.ts (WB4 left
// auto-mount out per its comment at lines 247-254 to avoid double-mount
// under test imports of mount.ts itself) and fires the auto-mount on
// DOMContentLoaded. The bundle script `build-conductor-chat.mjs` uses
// THIS file as its entry; `workstation-shell.html` loads the resulting
// `dist/conductor-chat/renderer.js` defer-script.
//
// Contract (3 assertions per dispatch §WB ladder WB1):
//   (1) Importing mount-entry.ts triggers tryAutoMountConductorChat
//       targeting rootElementId='root' (the shell.html anchor div at
//       lines 297-299: <div id="chat-region"> <div id="root"></div> </div>).
//   (2) When the #root element exists, the conductor-chat scaffold
//       mounts INTO that root with bridge=null (Path-B / Q1=(d) render-
//       only — production wiring deferred to Ticket B).
//   (3) DEFAULT_IDLE_STATE seeds the idle render — exactly one
//       assistant intro bubble visible with the canonical text from
//       mount.ts:110-112 (`Conductor ready. Attach a build.md…`).
//
// Strategy:
//   happy-dom's default `document.readyState` is 'complete' at module
//   import time, so mount-entry's `if (readyState !== 'loading')` branch
//   fires tryAutoMountConductorChat synchronously on import. We set up
//   the shell.html-equivalent #root element BEFORE the dynamic import,
//   then assert the DOM is now populated.
//
// RED state at HEAD aef0ac8 — src/conductor-chat/mount-entry.ts does
// not exist; the dynamic import fails to resolve. WB2 GREEN authors
// mount-entry.ts and flips this probe to PASS.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CANONICAL_INTRO_TEXT =
  "Conductor ready. Attach a build.md and I'll plan it into ordered steps, " +
  'hand them to the Orchestrator one at a time, and watch the agent panes for failures.';

function setupShellRoot(): HTMLDivElement {
  const chatRegion = document.createElement('div');
  chatRegion.id = 'chat-region';
  const root = document.createElement('div');
  root.id = 'root';
  chatRegion.appendChild(root);
  document.body.appendChild(chatRegion);
  return root;
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  delete (window as unknown as { conductorChatBridge?: unknown })
    .conductorChatBridge;
});

afterEach(() => {
  document.body.innerHTML = '';
  delete (window as unknown as { conductorChatBridge?: unknown })
    .conductorChatBridge;
});

describe('MB-T-MVP-CONDUCTOR-CHAT-MOUNT-WIRING WB1 — mount-entry auto-mount', () => {
  it('imports cleanly (mount-entry.ts resolves)', async () => {
    await expect(
      import('../../../src/conductor-chat/mount-entry.js'),
    ).resolves.toBeDefined();
  });

  it('(1) auto-mounts into the shell.html #root anchor on module import', async () => {
    const root = setupShellRoot();
    // happy-dom default readyState is 'complete' at this point — auto-mount
    // fires synchronously.
    expect(document.readyState).not.toBe('loading');

    await import('../../../src/conductor-chat/mount-entry.js');

    // The conductor-chat scaffold is now mounted inside #root.
    expect(root.querySelector('[data-testid="conductor-chat-root"]')).not.toBeNull();
    // The DEFAULT_AUTO_MOUNT_ROOT_ID fallback ('conductor-chat-mount-root')
    // must NOT have been created — mount-entry targets the real shell anchor.
    expect(document.getElementById('conductor-chat-mount-root')).toBeNull();
  });

  it('(2) mounts with bridge=null (Path-B / Q1=(d) render-only)', async () => {
    const root = setupShellRoot();
    // Bridge intentionally absent — production wiring deferred to Ticket B.
    expect(
      (window as unknown as { conductorChatBridge?: unknown })
        .conductorChatBridge,
    ).toBeUndefined();

    await import('../../../src/conductor-chat/mount-entry.js');

    // Mount succeeded — scaffold present.
    expect(root.querySelector('[data-testid="conductor-chat-root"]')).not.toBeNull();
    // No user / dispatch / system / typing variants at idle (bridge absent
    // ⇒ DEFAULT_IDLE_STATE per mount.ts:114-121).
    expect(root.querySelector('[data-testid="conductor-message-user"]')).toBeNull();
    expect(root.querySelector('[data-testid="conductor-message-dispatch"]')).toBeNull();
    expect(root.querySelector('[data-testid="conductor-message-system"]')).toBeNull();
    expect(root.querySelector('[data-testid="conductor-message-typing"]')).toBeNull();
  });

  it('(3) renders DEFAULT_IDLE_STATE — exactly one assistant intro bubble with CANONICAL_INTRO_TEXT', async () => {
    const root = setupShellRoot();

    await import('../../../src/conductor-chat/mount-entry.js');

    const assistantBubbles = root.querySelectorAll(
      '[data-testid="conductor-message-assistant"]',
    );
    expect(assistantBubbles.length).toBe(1);
    expect(root.textContent ?? '').toContain(CANONICAL_INTRO_TEXT);
  });
});
