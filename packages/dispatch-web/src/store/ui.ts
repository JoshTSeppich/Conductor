import { create } from 'zustand';

// WEB-T01 skeleton. Full shape lands in WEB-T05 per
// packages/dispatch-web/TICKETS.md §2.3. Only `connectionStatus` is
// needed before WEB-T03 wires in the WebSocket client and drives
// transitions.
export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'daemon_down'
  | 'auth_failed';

interface UIState {
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (s: ConnectionStatus) => void;
}

export const useUIStore = create<UIState>((set) => ({
  connectionStatus: 'connecting',
  setConnectionStatus: (s) => set({ connectionStatus: s }),
}));
