import { useEffect, useRef } from 'react';
import { clearToken } from '../auth/token-storage.js';
import { runPreflight } from '../auth/preflight.js';
import { useUIStore } from '../store/ui.js';
import {
  computeBackoff,
  DEFAULT_BACKOFF,
  type BackoffConfig,
} from './backoff.js';
import { dedupeKey } from './dedupe.js';
import type { EventShape } from './event-shape.js';

export type ClientStatus =
  | 'connecting'
  | 'connected'
  | 'daemon_down'
  | 'auth_failed';

export interface UseDaemonEventsOptions {
  token: string;
  backoff?: BackoffConfig;
  onEvent?: (event: EventShape) => void;
  onStatusChange?: (status: ClientStatus) => void;
  onInvalidate?: (keys: readonly unknown[]) => void;
  /** Test seam. Production leaves undefined; buildWsUrl() uses window.location. */
  wsUrlOverride?: string;
  /** Test seam. Production leaves undefined; preflight hits same-origin. */
  httpBaseOverride?: string;
}

function buildWsUrl(token: string): string {
  const loc =
    typeof window !== 'undefined'
      ? window.location
      : ({ protocol: 'http:', host: 'localhost' } as Location);
  const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${loc.host}/v2/events/stream?token=${encodeURIComponent(
    token,
  )}`;
}

// Post-connected WS lifecycle. Runs preflight before every WS open
// (initial + reconnect) per UI-S01 ADR. Dispatch is callback-based
// so WEB-T04/T05 can wire TanStack Query + Zustand without T03
// having to know their shapes.
export function useDaemonEvents(options: UseDaemonEventsOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const setConnectionStatus = useUIStore((s) => s.setConnectionStatus);
  const bumpAuthRetry = useUIStore((s) => s.bumpAuthRetry);

  const token = options.token;
  const backoff = options.backoff ?? DEFAULT_BACKOFF;
  const wsUrlOverride = options.wsUrlOverride;
  const httpBaseOverride = options.httpBaseOverride;

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let preflightController: AbortController | null = null;
    let attempt = 0;
    let lastTs = new Date(0).toISOString();
    const seen = new Set<string>();

    function emitStatus(s: ClientStatus): void {
      optionsRef.current.onStatusChange?.(s);
      setConnectionStatus(s);
    }

    function applyEvent(e: EventShape): void {
      const key = dedupeKey(e);
      if (seen.has(key)) return;
      seen.add(key);
      if (Date.parse(e.timestamp) > Date.parse(lastTs)) {
        lastTs = e.timestamp;
      }
      optionsRef.current.onEvent?.(e);
    }

    function scheduleReconnect(): void {
      if (cancelled) return;
      const delay = computeBackoff(attempt, backoff);
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void cycle();
      }, delay);
    }

    async function cycle(): Promise<void> {
      if (cancelled) return;
      emitStatus('connecting');

      preflightController = new AbortController();
      let result;
      try {
        result = await runPreflight(
          token,
          lastTs,
          preflightController.signal,
          httpBaseOverride,
        );
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') return;
        scheduleReconnect();
        return;
      } finally {
        preflightController = null;
      }
      if (cancelled) return;

      if (result.kind === 'daemon_down') {
        emitStatus('daemon_down');
        scheduleReconnect();
        return;
      }
      if (result.kind === 'auth_failed') {
        clearToken();
        emitStatus('auth_failed');
        // Re-trigger AuthBootstrap; this hook's parent unmounts us
        bumpAuthRetry();
        return; // terminal; no reconnect
      }

      // ok: apply gap-fill events and advance cursor
      for (const e of result.events) applyEvent(e);

      // Open WebSocket
      let socket: WebSocket;
      try {
        const url = wsUrlOverride
          ? `${wsUrlOverride}?token=${encodeURIComponent(token)}`
          : buildWsUrl(token);
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      ws = socket;

      socket.addEventListener('open', () => {
        if (cancelled || ws !== socket) return;
        attempt = 0;
        emitStatus('connected');
      });

      socket.addEventListener('message', (msg) => {
        if (cancelled || ws !== socket) return;
        try {
          const parsed = JSON.parse(String(msg.data)) as EventShape;
          applyEvent(parsed);
        } catch {
          // malformed payload — skip per UI-S01 ADR; operator logs
        }
      });

      socket.addEventListener('close', () => {
        if (cancelled || ws !== socket) return;
        ws = null;
        scheduleReconnect();
      });

      socket.addEventListener('error', () => {
        // close handler follows; no-op here per UI-S01 ADR
      });
    }

    void cycle();

    // Exhaustive cleanup per operator's T03 clarification:
    //   - close WebSocket instance (if any)
    //   - cancel in-flight preflight (AbortController)
    //   - clear reconnection timer (setTimeout ref)
    //   - flag cancelled so pending microtasks bail
    return () => {
      cancelled = true;
      if (preflightController) {
        preflightController.abort();
        preflightController = null;
      }
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        try {
          ws.close();
        } catch {
          // ws.close() on CONNECTING state throws in some browsers;
          // ignore — the cancelled flag prevents further action.
        }
        ws = null;
      }
    };
  }, [
    token,
    backoff,
    wsUrlOverride,
    httpBaseOverride,
    setConnectionStatus,
    bumpAuthRetry,
  ]);
}
