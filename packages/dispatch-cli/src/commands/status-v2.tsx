/**
 * fd status WS-enabled TUI variant per CLI-T02.
 *
 * Per Shape A sequencing arbitration: this file ships
 * alongside v1 status.tsx (preserved intact). Reuses v1's
 * StatusView component + sortRows helper for the table
 * render; adds WS subscription via startWsClient + reducer
 * via applyEventToState; falls back to HTTP polling of
 * GET /v2/sessions every 2s when WS disconnects (X2 line
 * 326 verbatim).
 *
 * Notifications-available hint per X2 line 323 verbatim:
 * "[native notifs disabled — in-UI events only]" rendered
 * when /v2/health flag is false (S03 graceful-degradation).
 *
 * Integration smoke-tested at CLI-T05 via the existing v1
 * regression suite running with daemon live. Logic-layer
 * helpers (buildWsUrl, applyEventToState, parseHealthResponse,
 * shouldShowFallbackIndicator) covered by T02 unit probes.
 */

import { useEffect, useState } from 'react';
import { Box, Text, render } from 'ink';
import {
  startWsClient,
  shouldShowFallbackIndicator,
  type WireEvent,
  type WsConnectionState,
} from '../lib/ws-client.js';
import {
  applyEventToState,
  type TuiSession,
  type TuiSessionState,
} from '../lib/tui-state.js';
import {
  fetchHealth,
  runListV2,
  DEFAULT_BASE_URL,
} from '../lib/daemon-client.js';
import { StatusView, sortRows, type StatusRow } from './status.js';

const POLL_FALLBACK_MS = 2_000;

function formatAge(ms: number): string {
  if (ms < 60_000) return '<1m';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function latestObservedMs(s: TuiSessionState, now: Date): number | null {
  const cands: number[] = [];
  if (s.observed_handoff_at)
    cands.push(Date.parse(s.observed_handoff_at));
  if (s.observed_commit) cands.push(Date.parse(s.observed_commit.at));
  if (s.observed_prompt_sent_at)
    cands.push(Date.parse(s.observed_prompt_sent_at));
  if (s.observed_status) cands.push(Date.parse(s.observed_status.at));
  if (s.session.last_prompt_sent_at)
    cands.push(Date.parse(s.session.last_prompt_sent_at));
  if (s.session.last_handoff_pulled_at)
    cands.push(Date.parse(s.session.last_handoff_pulled_at));
  void now;
  return cands.length === 0 ? null : Math.max(...cands);
}

function tuiToRows(
  state: Map<string, TuiSessionState>,
): StatusRow[] {
  const now = new Date();
  const rows: StatusRow[] = [];
  for (const [name, s] of state) {
    const latest = latestObservedMs(s, now);
    const ageText = latest === null ? '—' : formatAge(now.getTime() - latest);
    rows.push({
      name,
      // computed_status arrives from the list endpoint per
      // sessions.ts:80-85; default to 'idle' if absent (e.g.,
      // session received via WS event before initial seed
      // completed).
      state: s.session.computed_status ?? 'idle',
      target: s.session.tmux_target,
      ageText,
    });
  }
  return rows;
}

function sessionsResponseToTuiMap(
  sessions: ReadonlyArray<TuiSession & { name: string }>,
): Map<string, TuiSessionState> {
  const m = new Map<string, TuiSessionState>();
  for (const s of sessions) {
    const { name, ...rest } = s;
    m.set(name, { session: rest });
  }
  return m;
}

export interface StatusAppV2Props {
  baseUrl: string;
  token: string;
}

export function StatusAppV2({ baseUrl, token }: StatusAppV2Props) {
  const [tuiState, setTuiState] = useState<
    Map<string, TuiSessionState>
  >(new Map());
  const [wsState, setWsState] = useState<WsConnectionState>('connecting');
  const [notificationsAvailable, setNotificationsAvailable] =
    useState<boolean>(false);

  // Initial seed: GET /v2/health (notifications flag) + list (sessions).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const health = await fetchHealth({ baseUrl });
        if (!cancelled)
          setNotificationsAvailable(health.notifications_available);
      } catch {
        /* leave default false on health probe failure */
      }
      try {
        // Re-fetch sessions list as raw JSON (runListV2 returns formatted
        // text; we need the underlying objects for state seeding).
        const r = await fetch(`${baseUrl}/v2/sessions`, {
          headers: { 'x-conductor-token': token },
        });
        if (r.ok) {
          const body = (await r.json()) as {
            sessions?: Array<TuiSession & { name: string }>;
          };
          if (!cancelled && body.sessions) {
            setTuiState(sessionsResponseToTuiMap(body.sessions));
          }
        }
        void runListV2;
      } catch {
        /* polling fallback below covers initial load failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, token]);

  // WS subscription: dispatch events through the reducer.
  useEffect(() => {
    const handle = startWsClient({
      baseUrl,
      token,
      onMessage: (event: WireEvent) => {
        setTuiState((prev) => applyEventToState(prev, event));
      },
      onStateChange: (s) => setWsState(s),
    });
    return () => handle.close();
  }, [baseUrl, token]);

  // Polling fallback when WS is disconnected (X2 line 326 verbatim).
  useEffect(() => {
    if (wsState !== 'disconnected') return;
    const interval = setInterval(() => {
      void (async () => {
        try {
          const r = await fetch(`${baseUrl}/v2/sessions`, {
            headers: { 'x-conductor-token': token },
          });
          if (r.ok) {
            const body = (await r.json()) as {
              sessions?: Array<TuiSession & { name: string }>;
            };
            if (body.sessions) {
              setTuiState(sessionsResponseToTuiMap(body.sessions));
            }
          }
        } catch {
          /* swallow — next tick retries */
        }
      })();
    }, POLL_FALLBACK_MS);
    return () => clearInterval(interval);
  }, [wsState, baseUrl, token]);

  const rows = sortRows(tuiToRows(tuiState));
  return (
    <Box flexDirection="column">
      <StatusView rows={rows} />
      {shouldShowFallbackIndicator(wsState) && (
        <Box marginTop={1}>
          <Text dimColor>[ws disconnected — polling fallback active]</Text>
        </Box>
      )}
      {!notificationsAvailable && (
        <Box>
          <Text dimColor>
            [native notifs disabled — in-UI events only]
          </Text>
        </Box>
      )}
    </Box>
  );
}

export interface RunStatusV2Opts {
  baseUrl?: string;
  token: string;
}

export async function runStatusV2(opts: RunStatusV2Opts): Promise<void> {
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  const { waitUntilExit } = render(
    <StatusAppV2 baseUrl={baseUrl} token={opts.token} />,
  );
  await waitUntilExit();
}
