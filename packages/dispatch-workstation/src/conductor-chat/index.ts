// MB-T-MVP-W3-CONDUCTOR-CHAT — public surface re-exports.
//
// Mirrors orchestrator-focus-pane/index.ts pattern: components + their
// prop types only. mount.ts is re-exported here so the renderer entry
// (deferred to MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED followup at
// WB-final) can import a single barrel.
//
// Cross-session note: Composer (operator-CC, f46649d) and Header
// (operator-CC, WB4 in flight at gen-7-w3 WB4 author time) live in the
// same directory but are not re-exported here yet to keep the barrel
// minimal — once the cross-session lanes converge at W3-final the
// barrel can grow. Each component's import path stays direct
// (./composer.js / ./header.js) for now.

export { ConductorChat } from './conductor-chat.js';
export type { ConductorChatProps } from './conductor-chat.js';

export { ConductorMessage } from './conductor-message.js';
export type {
  ConductorMessageProps,
  ConductorMessageVariant,
} from './conductor-message.js';

export { BuildMdChip } from './build-md-chip.js';
export type { BuildMdChipProps } from './build-md-chip.js';

export {
  tryAutoMountConductorChat,
} from './mount.js';
export type {
  ConductorChatBridge,
  ConductorChatState,
  ConductorChatMountOptions,
  ConductorChatMountResult,
} from './mount.js';
