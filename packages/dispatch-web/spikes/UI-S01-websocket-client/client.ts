/**
 * Spike-candidate WebSocket client with preflight + gap-fill + reconnect.
 *
 * This is NOT the production client. WEB-T03 will TDD the production
 * version red-then-green, potentially reusing the algorithm documented
 * in docs/adr/UI-S01-websocket-client.md. The spike client exists to
 * exercise the algorithm against the fixture and observe behavior.
 *
 * Node-side only — uses `ws` library. Browser version (WEB-T03) will
 * use the browser WebSocket global; algorithm is identical.
 */
import WebSocket from 'ws';

export interface EventShape {
  type: string;
  timestamp: string;
  session: string;
  data: Record<string, unknown>;
}

export interface BackoffConfig {
  baseMs: number;
  multiplier: number;
  capMs: number;
  jitter: number;
}

export const DEFAULT_BACKOFF: BackoffConfig = {
  baseMs: 1000,
  multiplier: 2,
  capMs: 30_000,
  jitter: 0.25,
};

export function computeBackoff(
  attempt: number,
  cfg: BackoffConfig,
  random: () => number = Math.random,
): number {
  const raw = Math.min(cfg.baseMs * Math.pow(cfg.multiplier, attempt), cfg.capMs);
  const jitterAmt = raw * cfg.jitter;
  return raw - jitterAmt + random() * 2 * jitterAmt;
}

export type ClientStatus = 'idle' | 'connecting' | 'connected' | 'daemon_down' | 'auth_failed';

export interface ClientOptions {
  httpBase: string;
  wsUrl: string;
  token: string;
  onEvent: (event: EventShape) => void;
  onStatus?: (status: ClientStatus) => void;
  backoff?: BackoffConfig;
  randomFn?: () => number;
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + stableStringify((v as Record<string, unknown>)[k]))
      .join(',') +
    '}'
  );
}

export function dedupeKey(e: EventShape): string {
  return `${e.timestamp}|${e.session}|${e.type}|${stableStringify(e.data)}`;
}

export interface AttemptRecord {
  attempt: number;
  delayMs: number;
  scheduledAt: number;
  outcome?: 'health_fail' | 'auth_fail' | 'events_fail' | 'ws_opened' | 'ws_closed';
}

export class SpikeClient {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private lastTs = new Date(0).toISOString();
  private seen = new Set<string>();
  private stopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private status: ClientStatus = 'idle';
  public readonly attemptLog: AttemptRecord[] = [];

  constructor(private opts: ClientOptions) {}

  getStatus(): ClientStatus {
    return this.status;
  }

  getLastTs(): string {
    return this.lastTs;
  }

  getSeenCount(): number {
    return this.seen.size;
  }

  private setStatus(next: ClientStatus) {
    if (this.status === next) return;
    this.status = next;
    this.opts.onStatus?.(next);
  }

  async connect(): Promise<void> {
    this.stopped = false;
    this.setStatus('connecting');
    await this.attemptCycle();
  }

  disconnect(): void {
    // Intentionally leave event listeners attached. The `stopped` flag is
    // the authority for suppressing reconnect; removing listeners risks
    // leaving the async 'error' event unhandled (ws lib emits
    // "closed before connection established" when close() is called in
    // CONNECTING state, and an unhandled 'error' crashes Node).
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }
    this.setStatus('idle');
  }

  private scheduleBackoff(outcome: AttemptRecord['outcome']): void {
    const cfg = this.opts.backoff ?? DEFAULT_BACKOFF;
    const delay = computeBackoff(this.attempt, cfg, this.opts.randomFn);
    this.attemptLog.push({
      attempt: this.attempt,
      delayMs: delay,
      scheduledAt: Date.now(),
      outcome,
    });
    this.attempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.attemptCycle();
    }, delay);
  }

  private async attemptCycle(): Promise<void> {
    if (this.stopped) return;
    this.setStatus('connecting');

    // Preflight step 1: GET /v2/health (unauth).
    const healthOk = await this.probeHealth();
    if (this.stopped) return;
    if (!healthOk) {
      this.setStatus('daemon_down');
      this.scheduleBackoff('health_fail');
      return;
    }

    // Preflight step 2 + gap-fill: GET /v2/events?since= with token.
    // Folded per ADR UI-S01: 401 vs 2xx distinguishes auth state; 2xx
    // body is the gap-fill payload.
    const eventsRes = await this.probeEventsAndGapFill();
    if (this.stopped) return;
    if (eventsRes === 'auth_failed') {
      // STOP retrying per ADR UI-S01 KNOWN #2. Operator must reauth.
      this.setStatus('auth_failed');
      this.stopped = true;
      return;
    }
    if (eventsRes === 'error') {
      this.setStatus('daemon_down');
      this.scheduleBackoff('events_fail');
      return;
    }

    // Both preflight checks passed. Open WebSocket.
    await this.openWs();
  }

  private async probeHealth(): Promise<boolean> {
    try {
      const r = await fetch(`${this.opts.httpBase}/v2/health`);
      return r.ok;
    } catch {
      return false;
    }
  }

  private async probeEventsAndGapFill(): Promise<'ok' | 'auth_failed' | 'error'> {
    try {
      const r = await fetch(
        `${this.opts.httpBase}/v2/events?since=${encodeURIComponent(this.lastTs)}`,
        { headers: { 'X-Conductor-Token': this.opts.token } },
      );
      if (r.status === 401) return 'auth_failed';
      if (!r.ok) return 'error';
      const body = (await r.json()) as { events: EventShape[]; next_since: string };
      for (const e of body.events) this.apply(e);
      return 'ok';
    } catch {
      return 'error';
    }
  }

  private openWs(): Promise<void> {
    return new Promise((resolve) => {
      const url = `${this.opts.wsUrl}?token=${encodeURIComponent(this.opts.token)}`;
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.on('open', () => {
        this.attempt = 0;
        this.attemptLog.push({
          attempt: this.attempt,
          delayMs: 0,
          scheduledAt: Date.now(),
          outcome: 'ws_opened',
        });
        this.setStatus('connected');
        resolve();
      });
      ws.on('message', (raw) => {
        try {
          const e = JSON.parse(raw.toString()) as EventShape;
          this.apply(e);
        } catch {
          /* malformed — skip */
        }
      });
      ws.on('close', () => {
        if (this.ws !== ws) return;
        this.ws = null;
        if (this.stopped) return;
        this.setStatus('connecting');
        this.scheduleBackoff('ws_closed');
        resolve();
      });
      ws.on('error', () => {
        // Close handler will follow; route all reconnect logic there.
      });
    });
  }

  private apply(e: EventShape): void {
    const key = dedupeKey(e);
    if (this.seen.has(key)) return;
    this.seen.add(key);
    if (Date.parse(e.timestamp) > Date.parse(this.lastTs)) {
      this.lastTs = e.timestamp;
    }
    this.opts.onEvent(e);
  }
}
