/**
 * Native notifications consumer per DAEMON-T16.
 *
 * Subscribes to the bus emit fan-out via existing
 * bus.subscribe() (T12 symmetric — notifications consumer
 * reads same queue as WS clients). Filters event types per
 * S03 §Event-to-notification mapping + arbitration 1A
 * (gate_trip → sticky native, parallel to
 * cairn_violation_detected). Calls notify with type-
 * specific shape per arbitration 2.
 *
 * Architecture (arbitration 3A): consumer is a sibling to
 * the WS consumer. Both subscribe to the same emit
 * fan-out. No bus internal change; no emit-site touch.
 *
 * Failure handling (arbitration 6A): notify throw → warn-
 * log + continue. Symmetric with T08/T10/T14 tolerate-
 * failures pattern. Notifications are best-effort per
 * S03 §Tradeoffs.
 *
 * Graceful degradation (S03 §Graceful degradation): when
 * available === false, the consumer no-ops at startup
 * (returns a stub stop() handle). Daemon emits all events
 * to WS regardless; UI consumes notifications_available
 * from /v2/health to render in-banner fallback.
 */

import notifier from 'node-notifier';
import type { EventBus } from '../events/bus.js';
import type { EventRecord } from '../events/history.js';

export interface NotifyInput {
  title: string;
  message: string;
  wait?: boolean;
  sound?: boolean;
}

export type NotifyFn = (input: NotifyInput) => Promise<void>;

const ELIGIBLE_TYPES: ReadonlySet<string> = new Set([
  'handoff_written',
  'cairn_violation_detected',
  'gate_trip',
]);

/**
 * Default production notify — wraps node-notifier's
 * callback API in a Promise. S03 §Library integration
 * verified the call shape; end-to-end delivery is
 * MODELED (best-effort per S03 §Tradeoffs).
 */
export const defaultNotify: NotifyFn = (input) =>
  new Promise((resolve, reject) => {
    notifier.notify(
      {
        title: input.title,
        message: input.message,
        wait: input.wait,
        sound: input.sound,
      },
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });

function toNotifyInput(rec: EventRecord): NotifyInput | null {
  const title = `Foxworks Dispatch — ${rec.session}`;
  switch (rec.type) {
    case 'handoff_written': {
      const data = rec.data as { path: string; size_bytes: number };
      return {
        title,
        message: `Handoff updated (${data.size_bytes} bytes)`,
        wait: false,
        sound: false,
      };
    }
    case 'cairn_violation_detected': {
      const data = rec.data as {
        violation_type: string;
        details: string;
      };
      return {
        title,
        message: `Cairn violation: ${data.violation_type}`,
        wait: true,
      };
    }
    case 'gate_trip': {
      const data = rec.data as {
        gate_name: string;
        context: string;
        expected_action: string;
      };
      return {
        title,
        message: `Gate triggered: ${data.gate_name}`,
        wait: true,
      };
    }
    default:
      return null;
  }
}

export interface NotificationsConsumerHandle {
  stop: () => void;
}

export interface StartNotificationsOpts {
  bus: EventBus;
  notify: NotifyFn;
  available: boolean;
  logger?: { warn: (...args: unknown[]) => void };
}

export function startNotifications(
  opts: StartNotificationsOpts,
): NotificationsConsumerHandle {
  if (!opts.available) {
    return { stop: () => {} };
  }
  const { queue, unsubscribe } = opts.bus.subscribe();

  void (async () => {
    try {
      for await (const rec of queue) {
        if (!ELIGIBLE_TYPES.has(rec.type)) continue;
        const input = toNotifyInput(rec);
        if (!input) continue;
        try {
          await opts.notify(input);
        } catch (err) {
          opts.logger?.warn?.(
            { err: (err as Error).message, type: rec.type },
            'notify failed; continuing per T16 arb 6A',
          );
        }
      }
    } catch (err) {
      opts.logger?.warn?.(
        { err: (err as Error).message },
        'notifications pump loop error',
      );
    }
  })();

  return { stop: unsubscribe };
}

const PROBE_TIMEOUT_MS = 2000;

/**
 * Production startup probe per S03 §Startup notification-
 * availability check. Sends a brief silent notification; if
 * callback fires cleanly within 2s with response !==
 * undefined, treat as available. Otherwise unavailable.
 *
 * False-negative risk acceptable per S03: UI fallback path
 * is always correct when we say unavailable.
 *
 * Tests bypass via StartupOpts.notificationsAvailable; this
 * function is production-only and uses node-notifier's
 * callback API directly (not the injected NotifyFn — which
 * has a Promise shape that doesn't expose the response
 * field needed for delivery detection).
 */
export async function probeNotificationsAvailable(
  timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    notifier.notify(
      {
        title: 'Foxworks Dispatch',
        message: 'Daemon starting — probing notification delivery.',
        sound: false,
        wait: false,
      },
      (err, response) => {
        clearTimeout(timer);
        resolve(err === null && response !== undefined);
      },
    );
  });
}
