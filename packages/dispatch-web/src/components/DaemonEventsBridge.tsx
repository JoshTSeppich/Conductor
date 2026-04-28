import { useEffect, type ReactNode } from 'react';
import {
  EventV2,
  HealthResponse,
} from 'dispatch-core/src/v2/schema.js';
import {
  useDaemonEvents,
  type ClientStatus,
} from '../daemon-client/useDaemonEvents.js';
import type { BackoffConfig } from '../daemon-client/backoff.js';
import { useUIStore } from '../store/ui.js';
import { defaultClient } from '../query/internal.js';
import { readToken } from '../auth/token-storage.js';
import { evaluateBannerRule } from '../banner-rules/evaluate.js';

export interface DaemonEventsBridgeProps {
  children: ReactNode;
  /** Test seam — production reads token via readToken(). */
  tokenOverride?: string;
  /** Test seam — passed through to useDaemonEvents. */
  wsUrlOverride?: string;
  /** Test seam — passed through to useDaemonEvents preflight. */
  httpBaseOverride?: string;
  /** Test seam — fast-scaled backoff for test runtime. */
  backoff?: BackoffConfig;
  /** Test seam — onStatusChange forwarded for assertion. */
  onStatusChange?: (s: ClientStatus) => void;
}

// T18: first production mount of useDaemonEvents. Mounts inside
// AuthBootstrap's connected branch (children pass-through). Two
// effects:
//   1. Subscribe to WS event stream + initial backfill via UI-S01
//      preflight (preflight step 2 IS the backfill — no separate
//      query per Decision 4).
//   2. One-shot GET /v2/health to read DAEMON-S03's
//      `notifications_available` flag → setNotificationsAvailable.
//
// Forward note: T21 will read UIState.notificationsAvailable in
// the §2.6 banner rules table to decide between native-supported
// vs in-banner-fallback delivery for handoff_written +
// cairn_violation_detected.
//
// EventV2.safeParse() at the onEvent boundary defends against
// contract drift. Failed parse → console.warn + drop; valid
// events in the same batch flow through (pipeline-continues-
// after-drop semantics).
export function DaemonEventsBridge({
  children,
  tokenOverride,
  wsUrlOverride,
  httpBaseOverride,
  backoff,
  onStatusChange,
}: DaemonEventsBridgeProps): ReactNode {
  const applyEvent = useUIStore((s) => s.applyEvent);
  const setNotificationsAvailable = useUIStore(
    (s) => s.setNotificationsAvailable,
  );

  const token = tokenOverride ?? readToken() ?? '';

  useDaemonEvents({
    token,
    backoff,
    wsUrlOverride,
    httpBaseOverride,
    onStatusChange,
    onEvent: (raw) => {
      const result = EventV2.safeParse(raw);
      if (!result.success) {
        console.warn(
          'DaemonEventsBridge: dropping malformed event',
          result.error,
        );
        return;
      }
      applyEvent(result.data);
      // T21 Decision 2: evaluate §2.6 rule + pushBanner if non-null.
      // useUIStore.getState() reads notificationsAvailable LIVE so
      // flag changes (daemon restart → /v2/health re-fetch) are
      // reflected on next event without remounting Bridge.
      const flag = useUIStore.getState().notificationsAvailable;
      const banner = evaluateBannerRule(result.data, flag);
      if (banner) {
        useUIStore.getState().pushBanner(banner);
      }
    },
  });

  // One-shot health fetch on mount per Decision 7. Re-mount on
  // auth lifecycle handles daemon restart → notifications_available
  // changes. Failure mode (Decision 7): log + leave default-false.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await defaultClient().fetch('/v2/health');
        if (!r.ok) {
          console.warn(
            `DaemonEventsBridge: /v2/health → ${r.status}; defaulting notifications_available=false`,
          );
          return;
        }
        const json = await r.json();
        const parsed = HealthResponse.safeParse(json);
        if (!parsed.success) {
          console.warn(
            'DaemonEventsBridge: /v2/health malformed response; defaulting notifications_available=false',
            parsed.error,
          );
          return;
        }
        if (cancelled) return;
        // ?? false per DAEMON-S03 §"Cross-session impacts" default-
        // false rule when field omitted by legacy/pre-S03 daemons.
        setNotificationsAvailable(parsed.data.notifications_available ?? false);
      } catch (err) {
        if (!cancelled) {
          console.warn(
            'DaemonEventsBridge: /v2/health fetch failed; defaulting notifications_available=false',
            err,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setNotificationsAvailable, httpBaseOverride]);

  return <>{children}</>;
}
