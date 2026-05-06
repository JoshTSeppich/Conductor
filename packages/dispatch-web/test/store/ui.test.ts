import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../src/store/ui.js';

// beforeEach resets the data fields (action functions come from
// closure in the store definition and stay stable across tests).
// `as unknown as ...` cast is acceptable for test-reset infra; the
// runtime merge behavior is what tests depend on.
beforeEach(() => {
  useUIStore.setState(
    {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  );
  // setFocus writes to window.location.hash; reset between tests
  window.location.hash = '';
});

describe('WEB-T05 Zustand store', () => {
  it('initial state: all fields at documented defaults', () => {
    const s = useUIStore.getState();
    expect(s.focusedSessionName).toBe(null);
    expect(s.sendModalOpen).toBe(false);
    expect(s.killConfirmOpen).toBe(false);
    expect(s.killConfirmTarget).toBe(null);
    expect(s.showArchived).toBe(false);
    expect(s.connectionStatus).toBe('connecting');
    expect(s.commitBySession).toEqual({});
    expect(s.banners).toEqual([]);
    expect(s.authRetryNonce).toBe(0);
    // T17: global event ring buffer. T18 will write; T17 only adds
    // the slot with [] default so TickerPanel can read safely.
    expect(s.events).toEqual([]);
    // T18: notifications_available flag plumbed from /v2/health.
    // Default false per DAEMON-S03 §"Cross-session impacts" +
    // TICKETS.md cross-session line 750 ("defaults false until
    // Session A proves otherwise"). T21 reads for banner rules.
    expect(s.notificationsAvailable).toBe(false);
  });

  it('setFocus(name) updates focusedSessionName and syncs window.location.hash', () => {
    useUIStore.getState().setFocus('sherpa');
    expect(useUIStore.getState().focusedSessionName).toBe('sherpa');
    expect(window.location.hash).toBe('#session=sherpa');
  });

  it('setFocus(null) clears focusedSessionName and clears hash', () => {
    useUIStore.getState().setFocus('sherpa');
    useUIStore.getState().setFocus(null);
    expect(useUIStore.getState().focusedSessionName).toBe(null);
    expect(window.location.hash).toBe('');
  });

  it('send modal: openSendModal sets true; closeSendModal sets false', () => {
    useUIStore.getState().openSendModal();
    expect(useUIStore.getState().sendModalOpen).toBe(true);
    useUIStore.getState().closeSendModal();
    expect(useUIStore.getState().sendModalOpen).toBe(false);
  });

  it('kill confirm: openKillConfirm(target) sets flag+target; closeKillConfirm clears both', () => {
    useUIStore.getState().openKillConfirm('sherpa');
    expect(useUIStore.getState().killConfirmOpen).toBe(true);
    expect(useUIStore.getState().killConfirmTarget).toBe('sherpa');
    useUIStore.getState().closeKillConfirm();
    expect(useUIStore.getState().killConfirmOpen).toBe(false);
    expect(useUIStore.getState().killConfirmTarget).toBe(null);
  });

  it('toggleArchive flips showArchived', () => {
    useUIStore.getState().toggleArchive();
    expect(useUIStore.getState().showArchived).toBe(true);
    useUIStore.getState().toggleArchive();
    expect(useUIStore.getState().showArchived).toBe(false);
  });

  it('setConnectionStatus accepts all 4 enum values', () => {
    const values = ['connecting', 'connected', 'daemon_down', 'auth_failed'] as const;
    for (const v of values) {
      useUIStore.getState().setConnectionStatus(v);
      expect(useUIStore.getState().connectionStatus).toBe(v);
    }
  });

  it('bumpAuthRetry increments authRetryNonce monotonically', () => {
    const before = useUIStore.getState().authRetryNonce;
    useUIStore.getState().bumpAuthRetry();
    useUIStore.getState().bumpAuthRetry();
    useUIStore.getState().bumpAuthRetry();
    expect(useUIStore.getState().authRetryNonce).toBe(before + 3);
  });

  it('applyCommitEvent: initial add creates commitBySession entry', () => {
    useUIStore.getState().applyCommitEvent({
      session: 'sherpa',
      timestamp: '2026-04-23T12:00:00.000Z',
      sha: 'abc123',
      subject: 'initial commit',
      branch: 'main',
    });
    expect(useUIStore.getState().commitBySession.sherpa).toEqual({
      sha: 'abc123',
      subject: 'initial commit',
      branch: 'main',
      at: '2026-04-23T12:00:00.000Z',
    });
  });

  it('applyCommitEvent: latest-per-session invariant (second replaces first)', () => {
    useUIStore.getState().applyCommitEvent({
      session: 'sherpa',
      timestamp: '2026-04-23T12:00:00.000Z',
      sha: 'abc123',
      subject: 'first',
      branch: 'main',
    });
    useUIStore.getState().applyCommitEvent({
      session: 'sherpa',
      timestamp: '2026-04-23T13:00:00.000Z',
      sha: 'def456',
      subject: 'second',
      branch: 'main',
    });
    const stored = useUIStore.getState().commitBySession;
    expect(Object.keys(stored)).toEqual(['sherpa']);
    expect(stored.sherpa.sha).toBe('def456');
    expect(stored.sherpa.subject).toBe('second');
  });

  it('applyCommitEvent: multi-session isolation (different sessions kept independently)', () => {
    useUIStore.getState().applyCommitEvent({
      session: 'sherpa',
      timestamp: '2026-04-23T12:00:00.000Z',
      sha: 'a1',
      subject: 'S1',
      branch: 'main',
    });
    useUIStore.getState().applyCommitEvent({
      session: 'scribe',
      timestamp: '2026-04-23T12:01:00.000Z',
      sha: 'b1',
      subject: 'C1',
      branch: 'main',
    });
    const stored = useUIStore.getState().commitBySession;
    expect(stored.sherpa.sha).toBe('a1');
    expect(stored.scribe.sha).toBe('b1');
  });

  it('banner queue: pushBanner returns id; dismissBanner removes by id; order preserved', () => {
    const id1 = useUIStore
      .getState()
      .pushBanner({ kind: 'toast', severity: 'info', title: 'A' });
    const id2 = useUIStore
      .getState()
      .pushBanner({ kind: 'sticky', severity: 'warn', title: 'B' });
    const id3 = useUIStore
      .getState()
      .pushBanner({ kind: 'toast', severity: 'info', title: 'C' });

    expect(useUIStore.getState().banners.map((b) => b.title)).toEqual([
      'A',
      'B',
      'C',
    ]);

    useUIStore.getState().dismissBanner(id2);
    expect(useUIStore.getState().banners.map((b) => b.title)).toEqual([
      'A',
      'C',
    ]);

    useUIStore.getState().dismissBanner(id1);
    useUIStore.getState().dismissBanner(id3);
    expect(useUIStore.getState().banners).toEqual([]);
  });

  // T18 applyEvent: ring-buffer write action. UI-S01 ADR mandates
  // dedupe semantics (S5: "exactly one copy each"); useDaemonEvents
  // internal `seen` Set is per-cycle, so cross-cycle WS-replay needs
  // store-layer dedupe via UI-S01 dedupeKey.
  it('applyEvent: appends event to events array', () => {
    const event = {
      type: 'state_changed' as const,
      timestamp: '2026-04-27T12:00:00.000Z',
      session: 'sherpa',
      data: {
        from: 'paused' as const,
        to: 'armed' as const,
        triggered_by: 'operator' as const,
      },
    };
    useUIStore.getState().applyEvent(event);
    expect(useUIStore.getState().events).toHaveLength(1);
    expect(useUIStore.getState().events[0]).toEqual(event);
  });

  it('applyEvent: dedupes by UI-S01 dedupeKey (timestamp|session|type|data)', () => {
    const event = {
      type: 'commit_landed' as const,
      timestamp: '2026-04-27T12:00:00.000Z',
      session: 'sherpa',
      data: { sha: 'abc1234', subject: 'fix bug', branch: 'main' },
    };
    useUIStore.getState().applyEvent(event);
    useUIStore.getState().applyEvent(event);
    expect(useUIStore.getState().events).toHaveLength(1);
  });

  it('applyEvent: bounded ring keeps newest 100 (oldest dropped past 100)', () => {
    const apply = useUIStore.getState().applyEvent;
    for (let i = 0; i < 105; i += 1) {
      apply({
        type: 'commit_landed' as const,
        timestamp: new Date(Date.UTC(2026, 3, 27, 12, 0, i)).toISOString(),
        session: 'sherpa',
        data: { sha: `sha${i}`, subject: `s${i}`, branch: 'main' },
      });
    }
    const events = useUIStore.getState().events;
    expect(events).toHaveLength(100);
    // Oldest 5 (indices 0-4) dropped; first remaining is index 5
    expect((events[0].data as { sha: string }).sha).toBe('sha5');
    expect((events[99].data as { sha: string }).sha).toBe('sha104');
  });

  // Phase 2 Step 1 (parallel-batch-2 / sess-1/dispatch-web-ui).
  // sessionListFilter slot for FilterChips component (Category A
  // wireframe: "All / Running / Trouble" chips above session list).
  // 'trouble' = computed_status === 'stale' per operator-default
  // arbitration §7.3 (cairn-violation history not yet queryable
  // per-session in a useful way; SessionResponseV2.recent_events
  // is bounded 50 — keep filter simple for v0).
  describe('sessionListFilter (Phase 2 Step 1)', () => {
    it('defaults to "all"', () => {
      expect(useUIStore.getState().sessionListFilter).toBe('all');
    });

    it('setSessionListFilter updates slot for each enum value', () => {
      useUIStore.getState().setSessionListFilter('running');
      expect(useUIStore.getState().sessionListFilter).toBe('running');
      useUIStore.getState().setSessionListFilter('trouble');
      expect(useUIStore.getState().sessionListFilter).toBe('trouble');
      useUIStore.getState().setSessionListFilter('all');
      expect(useUIStore.getState().sessionListFilter).toBe('all');
    });
  });
});
