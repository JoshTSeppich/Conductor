// MB-F-MB-T07-CARD-BRIDGE-PRELOAD-WIRING — factory for the cardBridge
// surface exposed to the kanban webview's renderer (dispatch-web React app).
//
// WORKSTATION_CONTRACT.md §6.2 + §7.1: when the operator clicks
// Approve / Decline / multi-choice on a card, the renderer fires an IPC
// message that the shell's card-ipc.ts consumes and translates into an
// OrchestratorAuditWriteRequest POST. When orchestrator output produces a
// card / supersedes prior cards / patches a card, the shell broadcasts
// `orchestrator-card-rendered` / `orchestrator-card-superseded` /
// `orchestrator-card-update` to the webview, which the dispatch-web
// useOrchestratorCards hook subscribes to via this bridge.
//
// Channel namespace per coord file §4.3 + card-ipc.ts:193,209,220
// (frozen MB-T07 GREEN at b45b93b — channel names DO NOT change in Phase 2):
//   webview→shell: card:approved, card:declined, card:multi-choice-selected
//   shell→webview: orchestrator-card-rendered, orchestrator-card-superseded,
//                  orchestrator-card-update
//
// Method-name canonical at MB-T07 Phase 2 GREEN (per operator A7): the
// bridge exposes approve/decline/multiChoiceSelect on the emit side and
// onCardRendered/onCardSuperseded/onCardUpdate on the subscribe side —
// matching the web-side CardBridge type at packages/dispatch-web/src/
// orchestrator-cards/card-ipc-bridge.ts:63-70 verbatim. Phase 1 §G1
// documented the prior name-mismatch (emit*-prefixed shell vs unprefixed
// web), which broke every operator click in production builds because
// `cardBridge.approve` was undefined when the bridge object came from
// the shell factory.
//
// This factory is pure (no Electron import) so the bridge shape is
// unit-testable without booting Electron. The contextBridge.exposeInMainWorld
// call lives in card-bridge-preload.mts (the esbuild entry).

export interface CardBridgeIpc {
  send(channel: string, ...args: unknown[]): void;
  on(
    channel: string,
    listener: (event: unknown, payload: unknown) => void,
  ): void;
  removeListener(
    channel: string,
    listener: (event: unknown, payload: unknown) => void,
  ): void;
}

// === Webview→Shell envelope shapes — matches web emit helpers in
// packages/dispatch-web/src/orchestrator-cards/card-ipc-bridge.ts:41-59.
// The shell's card-ipc.ts handlers (lines 193-241) read card_id and
// free_form_text/reason from the payload and ignore the surrounding
// envelope fields, but the bridge passes the full envelope through
// verbatim so the wire shape stays self-describing. ===
export interface ApprovedEnvelope {
  type: 'card-approved';
  card_id: string;
  free_form_text: string | null;
  timestamp: string;
}

export interface DeclinedEnvelope {
  type: 'card-declined';
  card_id: string;
  reason: string;
  timestamp: string;
}

export interface MultiChoiceSelectedEnvelope {
  type: 'multi-choice-selected';
  card_id: string;
  selected_index: number;
  free_form_text: string | null;
  timestamp: string;
}

// === Shell→Webview envelope shapes — matches the web-side declarations
// at card-ipc-bridge.ts:20-39. The card field is `unknown` here (not
// CardOutput | MultiChoiceCardOutput) so the shell-side bridge stays
// schema-decoupled; the web-side reducer narrows on receipt. ===
export interface CardRenderedPayload {
  type: 'orchestrator-card-rendered';
  card_id: string;
  card: unknown;
}

export interface CardSupersededPayload {
  type: 'orchestrator-card-superseded';
  superseding_card_id: string;
  superseded_card_ids: ReadonlyArray<string>;
}

export interface CardUpdatePayload {
  type: 'orchestrator-card-update';
  card_id: string;
  patch: Record<string, unknown>;
}

export type Cleanup = () => void;

export interface CardBridge {
  approve(envelope: ApprovedEnvelope): void;
  decline(envelope: DeclinedEnvelope): void;
  multiChoiceSelect(envelope: MultiChoiceSelectedEnvelope): void;
  onCardRendered(handler: (payload: CardRenderedPayload) => void): Cleanup;
  onCardSuperseded(handler: (payload: CardSupersededPayload) => void): Cleanup;
  onCardUpdate(handler: (payload: CardUpdatePayload) => void): Cleanup;
}

function subscribe<P>(
  ipc: CardBridgeIpc,
  channel: string,
  handler: (payload: P) => void,
): Cleanup {
  // ipcRenderer.on listeners receive (event, ...args). The operator handler
  // only cares about the payload — unwrap before forwarding so the web-side
  // reducer's action shapes (card-state.ts:34-49) get exactly what they
  // expect. The same listener reference is passed to removeListener so
  // ipcRenderer actually unregisters it.
  const listener = (_event: unknown, payload: unknown): void => {
    handler(payload as P);
  };
  ipc.on(channel, listener);
  return () => ipc.removeListener(channel, listener);
}

export function makeCardBridge(ipc: CardBridgeIpc): CardBridge {
  return {
    approve: (envelope) => ipc.send('card:approved', envelope),
    decline: (envelope) => ipc.send('card:declined', envelope),
    multiChoiceSelect: (envelope) =>
      ipc.send('card:multi-choice-selected', envelope),
    onCardRendered: (handler) =>
      subscribe<CardRenderedPayload>(
        ipc,
        'orchestrator-card-rendered',
        handler,
      ),
    onCardSuperseded: (handler) =>
      subscribe<CardSupersededPayload>(
        ipc,
        'orchestrator-card-superseded',
        handler,
      ),
    onCardUpdate: (handler) =>
      subscribe<CardUpdatePayload>(ipc, 'orchestrator-card-update', handler),
  };
}
