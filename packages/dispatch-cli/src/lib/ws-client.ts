/**
 * WebSocket client for fd status (CLI-T02).
 *
 * Pure helpers (buildWsUrl, shouldShowFallbackIndicator)
 * unit-tested at P1/P4. Connection management
 * (startWsClient) is a thin OS-boundary wrapper around the
 * `ws` package per finding #36 framework — smoke-tested at
 * CLI-T05 via the existing v1 regression suite running with
 * a live daemon.
 *
 * Native global `WebSocket` is not stable in Node 20.x
 * (became stable in Node 22.4.0; verified empirically at
 * T02 pre-red Check 1). Per Arbitration 2 → B, we use the
 * `ws` package (`^8.0.0`, version-matched to dispatch-
 * daemon's existing entry for shared lockfile).
 *
 * Wire shape per contract §5.1 + §5.2 verbatim:
 *   §5.1: "auth: token in query string ?token=<token>"
 *   §5.2: 4-field message {type, timestamp, session, data}
 *         — daemon's T12 toWireEvent strips event_id
 */

import WebSocket from 'ws';

export type WsConnectionState = 'open' | 'connecting' | 'disconnected';

/**
 * §5.2 verbatim wire-event shape (4 fields). event_id is
 * NOT on the wire — daemon's T12 toWireEvent strips it
 * before socket.send. Use HTTP /v2/events for event_id-
 * bearing payloads.
 */
export interface WireEvent {
  type: string;
  timestamp: string;
  session: string;
  data: unknown;
}

/**
 * Build the WS endpoint URL with token in query string per
 * §5.1 verbatim. http→ws and https→wss scheme upgrade.
 * Token URL-encoded so special characters (e.g., base64
 * `+`/`/`/`=` per §3.2 token format) survive transit.
 */
export function buildWsUrl(baseUrl: string, token: string): string {
  const wsBase = baseUrl.replace(/^http(s?):/, 'ws$1:');
  return `${wsBase}/v2/events/stream?token=${encodeURIComponent(token)}`;
}

/**
 * X2 line 326-327 verbatim: "WS disconnect is handled —
 * CLI reverts to polling, displays a subtle indicator."
 * Indicator visible only in 'disconnected' state.
 * 'connecting' is transient; surfacing it would flicker.
 */
export function shouldShowFallbackIndicator(
  state: WsConnectionState,
): boolean {
  return state === 'disconnected';
}

export interface WsClientOpts {
  baseUrl: string;
  token: string;
  onMessage: (event: WireEvent) => void;
  onStateChange: (state: WsConnectionState) => void;
}

export interface WsClientHandle {
  close: () => void;
}

/**
 * OS boundary — smoke-tested at CLI-T05 (finding #36).
 * Logic is mechanical: connect, wire ws callbacks, expose
 * close. T02's WS-disconnect-fallback (poll /v2/sessions
 * every 2s) is the TUI's responsibility, not this client's
 * — this client just surfaces connection-state transitions.
 */
export function startWsClient(opts: WsClientOpts): WsClientHandle {
  let socket: WebSocket | null = null;
  opts.onStateChange('connecting');
  socket = new WebSocket(buildWsUrl(opts.baseUrl, opts.token));

  socket.on('open', () => opts.onStateChange('open'));
  socket.on('message', (data: WebSocket.RawData) => {
    try {
      const evt = JSON.parse(data.toString()) as WireEvent;
      opts.onMessage(evt);
    } catch {
      /* ignore malformed wire payloads */
    }
  });
  socket.on('close', () => opts.onStateChange('disconnected'));
  socket.on('error', () => {
    /* 'close' will follow; state transition lives there */
  });

  return {
    close: () => socket?.close(),
  };
}
