// MB-T-MVP-CONDUCTOR-CHAT-MOUNT-WIRING WB2 (GREEN) — production
// mount-entry. Imports tryAutoMountConductorChat from mount.ts and
// auto-mounts on DOMContentLoaded targeting the shell.html anchor
// `#chat-region #root` (workstation-shell.html lines 297-299).
//
// This file exists separately from mount.ts because mount.ts intentionally
// omits the module-load auto-mount block (mount.ts:247-254): probe-05
// (test/unit/conductor-chat/probe-mbt-mvp-w3-05-mount-integration-ipc-
// wiring.spec.tsx) imports mount.ts and calls tryAutoMountConductorChat()
// explicitly; an auto-mount in mount.ts would double-mount under that
// import. mount-entry.ts is the production-only entry; build-conductor-
// chat.mjs bundles THIS file (not mount.ts) into dist/conductor-chat/
// renderer.js, which workstation-shell.html loads via a <script> tag.
//
// Q1=(d) per operator arbitration: render-only mount-wiring. bridge=null
// is intentional — DEFAULT_IDLE_STATE seeds the idle render (CANONICAL_
// INTRO_TEXT visible). Action buttons (composer send, header pause/cancel,
// paperclip attach) are clickable-but-inert in production until Ticket B
// (unified orchestrator-state prod wiring) lands per FOLLOWUPS row 390
// MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED.
//
// DOMContentLoaded pattern mirrors orchestrator-focus-pane/mount.ts:128-137.

import { tryAutoMountConductorChat } from './mount.js';

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tryAutoMountConductorChat({ rootElementId: 'root' });
    });
  } else {
    tryAutoMountConductorChat({ rootElementId: 'root' });
  }
}
