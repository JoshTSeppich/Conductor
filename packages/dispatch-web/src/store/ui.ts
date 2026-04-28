import { create } from 'zustand';
import type { EventV2Type } from 'dispatch-core/src/v2/schema.js';
import { dedupeKey } from '../daemon-client/dedupe.js';

// Full shape per packages/dispatch-web/TICKETS.md §2.3. T02 shipped
// connectionStatus + authRetryNonce; T05 expands to focus, modals,
// archive toggle, GAP-2 commit-subject reduce, and banner queue.

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'daemon_down'
  | 'auth_failed';

export interface CommitEntry {
  sha: string;
  subject: string;
  branch: string;
  at: string;
}

/**
 * Narrow payload passed to applyCommitEvent. Decoupled from EventV2's
 * discriminated union so the reducer stays simple — T18+ call site
 * destructures a CommitLandedEvent and passes this shape.
 */
export interface CommitEventPayload {
  session: string;
  timestamp: string;
  sha: string;
  subject: string;
  branch: string;
}

export type BannerKind = 'toast' | 'sticky';
export type BannerSeverity = 'info' | 'warn' | 'error';

export interface Banner {
  id: string;
  kind: BannerKind;
  severity: BannerSeverity;
  title: string;
  body?: string;
  createdAt: number;
}

interface UIState {
  // ── data ──────────────────────────────────────────────────────
  focusedSessionName: string | null;
  sendModalOpen: boolean;
  killConfirmOpen: boolean;
  killConfirmTarget: string | null;
  showArchived: boolean;
  connectionStatus: ConnectionStatus;
  commitBySession: Record<string, CommitEntry>;
  banners: Banner[];
  authRetryNonce: number;

  // T17: global event ring buffer. T17 added the slot with []
  // default so TickerPanel can read safely. T18 added the writer
  // (DaemonEventsBridge → useDaemonEvents callback) + bounded-100
  // ring policy + UI-S01 dedupeKey deduplication. Distinct from
  // SessionResponseV2.recent_events, which is per-session embedded.
  events: EventV2Type[];

  // T18: notifications_available flag from /v2/health. Default
  // false per DAEMON-S03 §"Cross-session impacts" graceful-
  // degradation rule. T21 reads for banner rules.
  notificationsAvailable: boolean;

  // ── actions ───────────────────────────────────────────────────
  setFocus: (name: string | null) => void;
  openSendModal: () => void;
  closeSendModal: () => void;
  openKillConfirm: (target: string) => void;
  closeKillConfirm: () => void;
  toggleArchive: () => void;
  setConnectionStatus: (s: ConnectionStatus) => void;
  bumpAuthRetry: () => void;
  applyCommitEvent: (e: CommitEventPayload) => void;
  applyEvent: (e: EventV2Type) => void;
  setNotificationsAvailable: (b: boolean) => void;
  pushBanner: (b: Omit<Banner, 'id' | 'createdAt'>) => string;
  dismissBanner: (id: string) => void;
}

function generateBannerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (rare)
  return `banner-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useUIStore = create<UIState>((set, get) => ({
  // data defaults
  focusedSessionName: null,
  sendModalOpen: false,
  killConfirmOpen: false,
  killConfirmTarget: null,
  showArchived: false,
  connectionStatus: 'connecting',
  commitBySession: {},
  banners: [],
  authRetryNonce: 0,
  events: [],
  notificationsAvailable: false,

  // INTENTIONAL: setFocus uses history.replaceState, not pushState
  // or window.location.hash assignment. Focus is transient UI
  // state, not navigation state. replaceState avoids scroll jumps
  // (vs .hash= which triggers native anchor behavior) AND avoids
  // back/forward history entries for what is effectively a view
  // filter. Do not change to pushState "to support back-button
  // navigation of focus" — that's a different product decision.
  setFocus: (name) => {
    if (typeof window !== 'undefined' && window.history) {
      const hash = name === null ? '' : `#session=${name}`;
      const url = `${window.location.pathname}${window.location.search}${hash}`;
      window.history.replaceState(null, '', url);
    }
    set({ focusedSessionName: name });
  },

  openSendModal: () => set({ sendModalOpen: true }),
  closeSendModal: () => set({ sendModalOpen: false }),

  openKillConfirm: (target) =>
    set({ killConfirmOpen: true, killConfirmTarget: target }),
  closeKillConfirm: () =>
    set({ killConfirmOpen: false, killConfirmTarget: null }),

  toggleArchive: () => set((s) => ({ showArchived: !s.showArchived })),

  setConnectionStatus: (s) => set({ connectionStatus: s }),

  bumpAuthRetry: () => set((s) => ({ authRetryNonce: s.authRetryNonce + 1 })),

  // GAP-2 reduce: latest-per-session invariant. Second event for a
  // session replaces first (no accumulation). Multi-session
  // isolation: different sessions kept in independent keys.
  applyCommitEvent: (e) =>
    set((state) => ({
      commitBySession: {
        ...state.commitBySession,
        [e.session]: {
          sha: e.sha,
          subject: e.subject,
          branch: e.branch,
          at: e.timestamp,
        },
      },
    })),

  // T18: bounded-100 ring buffer + UI-S01 dedupeKey. Cross-cycle
  // WS-replay guard at store layer beyond useDaemonEvents internal
  // per-cycle `seen` Set. O(n) dedupe per insert at n≤100 — fine
  // for current scope; UI-F03 batching followup may need indexing
  // if sustained throughput exceeds.
  applyEvent: (e) =>
    set((state) => {
      const key = dedupeKey(e);
      if (state.events.some((x) => dedupeKey(x) === key)) return {};
      return { events: [...state.events, e].slice(-100) };
    }),

  setNotificationsAvailable: (b) => set({ notificationsAvailable: b }),

  // T21 Decision 4: pushBanner schedules auto-dismiss for kind='toast'
  // after 5000ms per TICKETS.md §2.6 verbatim "auto-dismiss, 5s".
  // Sticky banners stay until explicit dismissBanner(id). The
  // SendModal.tsx:16 forward note ("T21 enriches auto-dismiss timing")
  // is discharged here — callers (T13/T15/T16/T21) auto-benefit
  // without per-call setTimeout boilerplate.
  pushBanner: (b) => {
    const id = generateBannerId();
    const banner: Banner = {
      id,
      kind: b.kind,
      severity: b.severity,
      title: b.title,
      body: b.body,
      createdAt: Date.now(),
    };
    set((s) => ({ banners: [...s.banners, banner] }));
    if (b.kind === 'toast') {
      setTimeout(() => get().dismissBanner(id), 5000);
    }
    return id;
  },

  dismissBanner: (id) =>
    set((s) => ({ banners: s.banners.filter((b) => b.id !== id) })),
}));
