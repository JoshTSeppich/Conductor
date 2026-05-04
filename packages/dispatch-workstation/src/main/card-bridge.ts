// MB-F-MB-T07-CARD-BRIDGE-PRELOAD-WIRING — factory for the cardBridge
// surface exposed to the kanban webview's renderer (dispatch-web React app).
//
// WORKSTATION_CONTRACT.md §6.2 + §7.1: when the operator clicks
// Approve / Decline / multi-choice on a card, the renderer fires an IPC
// message that the shell's card-ipc.ts consumes and translates into an
// OrchestratorAuditWriteRequest POST.
//
// Channel namespace per coord file §4.3 + card-ipc.ts:193,209,220
// (frozen MB-T07 GREEN at b45b93b):
//   webview→shell: card:approved, card:declined, card:multi-choice-selected
//
// This factory is pure (no Electron import) so the bridge shape is
// unit-testable without booting Electron. The contextBridge.exposeInMainWorld
// call lives in card-bridge-preload.mts (the esbuild entry).

export interface CardBridgeIpc {
  send(channel: string, ...args: unknown[]): void;
}

export interface ApprovedPayload {
  card_id: string;
  free_form_text?: string | null;
}

export interface DeclinedPayload {
  card_id: string;
  reason: string;
}

export interface MultiChoiceSelectedPayload {
  card_id: string;
  selected_index: number;
  free_form_text?: string | null;
}

export interface CardBridge {
  emitCardApproved(payload: ApprovedPayload): void;
  emitCardDeclined(payload: DeclinedPayload): void;
  emitMultiChoiceSelected(payload: MultiChoiceSelectedPayload): void;
}

export function makeCardBridge(ipc: CardBridgeIpc): CardBridge {
  return {
    emitCardApproved: (payload) => ipc.send('card:approved', payload),
    emitCardDeclined: (payload) => ipc.send('card:declined', payload),
    emitMultiChoiceSelected: (payload) =>
      ipc.send('card:multi-choice-selected', payload),
  };
}
