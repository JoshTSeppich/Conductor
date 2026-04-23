import { useEffect, useState } from 'react';
import { readToken, clearToken } from './token-storage.js';
import { createHttpClient } from '../http-client.js';
import { useUIStore } from '../store/ui.js';

// Implements UI-S01 preflight (HTTP half) per
// docs/adr/UI-S01-websocket-client.md. WebSocket open happens in
// WEB-T03 once preflight reaches 'connected'.
export type BootstrapPhase =
  | 'prompt'         // no token in storage
  | 'bootstrapping'  // preflight in flight
  | 'connected'      // preflight succeeded; children render
  | 'daemon_down'    // /v2/health errored
  | 'auth_failed';   // /v2/events returned 401

export function useAuthBootstrap(): BootstrapPhase {
  const [phase, setPhase] = useState<BootstrapPhase>('bootstrapping');
  const authRetryNonce = useUIStore((s) => s.authRetryNonce);
  const setConnectionStatus = useUIStore((s) => s.setConnectionStatus);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      const token = readToken();
      if (!token) {
        if (!cancelled) setPhase('prompt');
        return;
      }

      setPhase('bootstrapping');
      const client = createHttpClient(() => token);

      // Preflight 1: /v2/health (unauth; daemon-alive signal)
      let healthOk = false;
      try {
        const r = await client.fetch('/v2/health');
        healthOk = r.ok;
      } catch {
        healthOk = false;
      }
      if (cancelled) return;
      if (!healthOk) {
        setPhase('daemon_down');
        setConnectionStatus('daemon_down');
        return;
      }

      // Preflight 2: /v2/events?since= (auth check; doubles as gap-fill
      // per UI-S01 ADR decision)
      let status: 'ok' | 'auth_failed' | 'error' = 'error';
      try {
        const r = await client.fetch(
          '/v2/events?since=' + encodeURIComponent(new Date(0).toISOString()),
        );
        if (r.status === 401) status = 'auth_failed';
        else if (r.ok) status = 'ok';
        else status = 'error';
      } catch {
        status = 'error';
      }
      if (cancelled) return;

      if (status === 'error') {
        setPhase('daemon_down');
        setConnectionStatus('daemon_down');
        return;
      }
      if (status === 'auth_failed') {
        clearToken();
        setPhase('auth_failed');
        setConnectionStatus('auth_failed');
        return;
      }

      setPhase('connected');
      setConnectionStatus('connected');
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [authRetryNonce, setConnectionStatus]);

  return phase;
}
