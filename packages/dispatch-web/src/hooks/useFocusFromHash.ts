import { useEffect } from 'react';
import { useUIStore } from '../store/ui.js';

// Bidirectional sync between window.location.hash and Zustand
// focusedSessionName.
//
// Outbound (card click → hash + store): handled by T05's setFocus
// action via history.replaceState + Zustand set.
//
// Inbound (this hook): reads hash on mount and on hashchange events;
// updates Zustand directly via setState (NOT setFocus) to avoid
// writing back to hash. Two-way binding stays clean.
//
// Greedy regex /^#session=(.+)$/ — MODELED assumption: session names
// don't contain '&' or '=' chars (TICKETS.md convention). If the
// daemon ever allows special chars in session names, tighten to
// /^#session=([^&]+)$/.
export function useFocusFromHash(): void {
  useEffect(() => {
    function syncFromHash(): void {
      const match = window.location.hash.match(/^#session=(.+)$/);
      const name = match ? decodeURIComponent(match[1]) : null;
      if (name !== useUIStore.getState().focusedSessionName) {
        useUIStore.setState({ focusedSessionName: name });
      }
    }
    syncFromHash(); // initial mount
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);
}
