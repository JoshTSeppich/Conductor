import { createHttpClient } from '../http-client.js';
import type { EventShape } from '../daemon-client/event-shape.js';

// Shared between useAuthBootstrap (WEB-T02 initial auth gate) and
// useDaemonEvents (WEB-T03 reconnect preflight). Same preflight
// algorithm from UI-S01 ADR:
//   1. GET /v2/health (unauth) — daemon-alive probe
//   2. GET /v2/events?since=<ts> (auth) — 401 = auth_failed,
//      2xx = gap-fill payload + next cursor, else daemon_down.

export type PreflightResult =
  | { kind: 'ok'; nextSince: string; events: EventShape[] }
  | { kind: 'daemon_down' }
  | { kind: 'auth_failed' };

export async function runPreflight(
  token: string,
  sinceTs: string,
  signal?: AbortSignal,
  httpBase?: string,
): Promise<PreflightResult> {
  const client = createHttpClient(() => token);
  const prefix = httpBase ?? '';

  // Step 1
  try {
    const r = await client.fetch(prefix + '/v2/health', { signal });
    if (!r.ok) return { kind: 'daemon_down' };
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') throw e;
    return { kind: 'daemon_down' };
  }

  // Step 2 (fused auth check + gap-fill per UI-S01 ADR)
  try {
    const r = await client.fetch(
      prefix + '/v2/events?since=' + encodeURIComponent(sinceTs),
      { signal },
    );
    if (r.status === 401) return { kind: 'auth_failed' };
    if (!r.ok) return { kind: 'daemon_down' };
    const body = (await r.json()) as {
      events: EventShape[];
      next_since: string;
    };
    return { kind: 'ok', nextSince: body.next_since, events: body.events };
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') throw e;
    return { kind: 'daemon_down' };
  }
}
