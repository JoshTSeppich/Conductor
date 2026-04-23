import { create } from 'zustand';

// WEB-T02 shape: connectionStatus + authRetryNonce. Full shape per
// packages/dispatch-web/TICKETS.md §2.3 lands in WEB-T05 (adds
// focused session, modals, archive toggle, commit-subject reduce,
// banner queue).
export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'daemon_down'
  | 'auth_failed';

interface UIState {
  connectionStatus: ConnectionStatus;
  // Monotonic counter; bumped by TokenPrompt on submit to force
  // useAuthBootstrap's effect to re-run after a token change.
  authRetryNonce: number;
  setConnectionStatus: (s: ConnectionStatus) => void;
  bumpAuthRetry: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  connectionStatus: 'connecting',
  authRetryNonce: 0,
  setConnectionStatus: (s) => set({ connectionStatus: s }),
  bumpAuthRetry: () =>
    set((state) => ({ authRetryNonce: state.authRetryNonce + 1 })),
}));
